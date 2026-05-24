// Apple Podcasts (iTunes) public discovery API client.
//
// This thin client mirrors the three endpoints that the open-source
// `podium` Android app uses for its Discover tab. All three are public,
// authentication-free, and return permissive `access-control-allow-origin`
// headers so we can call them straight from the browser. No Apple ID, no
// developer key, no proxy needed.
//
// Endpoints:
//   - Top podcasts (per country, optional genre):
//       GET https://itunes.apple.com/{cc}/rss/toppodcasts/limit={N}/genre={id}/explicit=true/json
//   - Search (per country, free-text):
//       GET https://itunes.apple.com/search?media=podcast&country={cc}&term={q}&limit={N}
//   - Lookup (RSS feed url for a collection id — used by the episode page):
//       GET https://itunes.apple.com/lookup?id={id}
//
// We only model the fields the UI actually renders. The raw responses are
// huge (one entry has ~30 fields, most of them iTunes metadata). Mapping
// to a single normalized `PodcastPreview` shape keeps the page code tiny
// and isolates us from the two endpoints disagreeing on naming
// (top-charts uses `im:name`/`im:artist`/`im:image`, search uses
// `collectionName`/`artistName`/`artworkUrlXXX`).
//
// Two limits to be aware of:
//   - Apple silently caps `limit` at 200 on every endpoint above. We
//     default to it.
//   - The aggregated fan-out helpers cap concurrency at 4 to be polite
//     to Apple's CDN and to avoid bursting browser connection pools.

export interface PodcastPreview {
  /** Stable id — `collectionId` from search, or `im:id` from RSS feed. */
  id: string;
  title: string;
  author: string;
  /** 600px artwork when available, otherwise the largest the feed gave us. */
  artworkUrl: string;
  /** Optional iTunes web URL (used to open in Apple Podcasts). */
  link?: string;
  /** Optional one-line summary; only the top-charts feed sends it. */
  summary?: string;
  /** Optional RSS feed URL; only the search endpoint exposes it directly. */
  feedUrl?: string;
}

/** Apple's documented and silently-enforced ceiling on `limit` for the
 *  RSS top-charts and Search endpoints. Requesting 500 just gets you
 *  200; we make that the default. */
export const ITUNES_MAX_LIMIT = 200;

/* -------------------------------------------------------------------------- */
/*  Artwork URL rewriter                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Replace the `170x170bb.png` thumbnail Apple ships in the RSS feed with a
 * different-sized variant. The path is templated — the size is just a folder
 * segment, so we can hot-swap it client-side without another round trip.
 *
 * Exported so callers can pick a size appropriate to where they're
 * rendering (e.g. 200px for a 3-column grid card, 600px for a hero
 * cover). Calling this on an already-upgraded URL works too — it just
 * rewrites the size segment.
 */
export function upgradeArtwork(url: string, size = 600): string {
  return url.replace(/\/\d+x\d+(bb)?(-?\d+)?\.(jpg|png|webp)$/i, `/${size}x${size}bb.$3`);
}

/* -------------------------------------------------------------------------- */
/*  Top podcasts                                                              */
/* -------------------------------------------------------------------------- */

interface RssEntry {
  'im:name': { label: string };
  'im:image': Array<{ label: string; attributes?: { height?: string } }>;
  'im:artist': { label: string };
  summary?: { label: string };
  link: { attributes?: { href?: string } };
  id: { label: string; attributes?: { 'im:id'?: string } };
}

interface RssResponse {
  feed?: { entry?: RssEntry[] };
}

export async function fetchTopPodcasts(opts: {
  countryCode: string;
  genreId?: number | null;
  limit?: number;
  signal?: AbortSignal;
}): Promise<PodcastPreview[]> {
  const { countryCode, genreId, limit = ITUNES_MAX_LIMIT, signal } = opts;
  const cc = countryCode.toLowerCase();
  const genrePart = genreId ? `genre=${genreId}/` : '';
  // Clamp the user-requested limit. Anything above 200 is silently
  // truncated by Apple anyway, but being explicit keeps the URL
  // honest in network-tab inspections.
  const cappedLimit = Math.max(1, Math.min(limit, ITUNES_MAX_LIMIT));
  const url = `https://itunes.apple.com/${cc}/rss/toppodcasts/limit=${cappedLimit}/${genrePart}explicit=true/json`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`iTunes top podcasts failed: ${res.status}`);
  const data = (await res.json()) as RssResponse;

  const entries = data.feed?.entry ?? [];
  return entries.map((e): PodcastPreview => {
    const images = e['im:image'] ?? [];
    const largest = images[images.length - 1]?.label ?? '';
    return {
      id: e.id.attributes?.['im:id'] ?? e.id.label,
      title: e['im:name']?.label ?? '',
      author: e['im:artist']?.label ?? '',
      artworkUrl: upgradeArtwork(largest),
      link: e.link?.attributes?.href,
      summary: e.summary?.label,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  Search                                                                    */
/* -------------------------------------------------------------------------- */

interface SearchResultItem {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  collectionViewUrl?: string;
  feedUrl?: string;
}

interface SearchResponse {
  resultCount?: number;
  results?: SearchResultItem[];
}

export async function searchPodcasts(opts: {
  term: string;
  countryCode: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<PodcastPreview[]> {
  const { term, countryCode, limit = ITUNES_MAX_LIMIT, signal } = opts;
  const cappedLimit = Math.max(1, Math.min(limit, ITUNES_MAX_LIMIT));
  const params = new URLSearchParams({
    media: 'podcast',
    country: countryCode.toLowerCase(),
    term,
    limit: String(cappedLimit),
  });
  const res = await fetch(`https://itunes.apple.com/search?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`);
  const data = (await res.json()) as SearchResponse;

  return (data.results ?? []).map((r): PodcastPreview => ({
    id: String(r.collectionId),
    title: r.collectionName,
    author: r.artistName,
    artworkUrl: r.artworkUrl600 ?? r.artworkUrl100 ?? '',
    link: r.collectionViewUrl,
    feedUrl: r.feedUrl,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Aggregated (multi-country) helpers                                        */
/* -------------------------------------------------------------------------- */

/**
 * Run a list of async tasks with a fixed concurrency window. Used by
 * the multi-country fan-out helpers to be polite to Apple's CDN — we
 * cap to 4 in-flight requests at a time, which still lights up a 12-
 * country region in ~3 sequential rounds.
 *
 * `Promise.allSettled`-shaped because a single failed locale shouldn't
 * blow up an entire region's chart — the merged result just lacks
 * that contribution.
 */
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
  signal?: AbortSignal,
): Promise<Array<PromiseSettledResult<T>>> {
  const results: Array<PromiseSettledResult<T>> = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      if (signal?.aborted) {
        results[i] = { status: 'rejected', reason: new DOMException('Aborted', 'AbortError') };
        continue;
      }
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (err) {
        results[i] = { status: 'rejected', reason: err };
      }
    }
  }

  const workerCount = Math.min(concurrency, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

/**
 * Merge several podcast lists, dropping duplicates by `id`. Earlier
 * lists win — that lets callers prioritize a region's "anchor" country
 * (e.g. SA for Arabic, US for English) so the merged chart looks like
 * the anchor's top followed by extras pulled in from siblings.
 */
function dedupeById(lists: PodcastPreview[][]): PodcastPreview[] {
  const seen = new Set<string>();
  const out: PodcastPreview[] = [];
  for (const list of lists) {
    for (const p of list) {
      if (!p.id || seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

/**
 * Aggregated top chart across multiple countries. Fans out one
 * top-charts request per country (capped at concurrency=4) and merges
 * the results, deduplicated by `collectionId`. Failed locales are
 * skipped silently — Apple occasionally returns 503 on a single
 * country's chart and we'd rather show 11 charts' worth of podcasts
 * than fail the whole render.
 *
 * The merge is order-preserving by country, so the first country's
 * top-N stays at the top of the result.
 */
export async function fetchTopPodcastsAggregated(opts: {
  countryCodes: string[];
  genreId?: number | null;
  /** Limit per country — total returned is up to N × countries.length
   *  before dedup. Caller can further slice the result. */
  limitPerCountry?: number;
  signal?: AbortSignal;
}): Promise<PodcastPreview[]> {
  const { countryCodes, genreId, limitPerCountry = ITUNES_MAX_LIMIT, signal } = opts;
  if (countryCodes.length === 0) return [];

  const tasks = countryCodes.map(cc => () => fetchTopPodcasts({
    countryCode: cc,
    genreId,
    limit: limitPerCountry,
    signal,
  }));
  const settled = await runWithConcurrency(tasks, 4, signal);
  const lists = settled
    .filter((r): r is PromiseFulfilledResult<PodcastPreview[]> => r.status === 'fulfilled')
    .map(r => r.value);
  return dedupeById(lists);
}

/**
 * Aggregated free-text search across multiple countries. Same shape as
 * `fetchTopPodcastsAggregated` but for the search endpoint — useful
 * for "find me anything matching X across the entire Arabic-speaking
 * world" without forcing the user to flip through each country.
 */
export async function searchPodcastsAggregated(opts: {
  term: string;
  countryCodes: string[];
  limitPerCountry?: number;
  signal?: AbortSignal;
}): Promise<PodcastPreview[]> {
  const { term, countryCodes, limitPerCountry = ITUNES_MAX_LIMIT, signal } = opts;
  if (countryCodes.length === 0 || !term.trim()) return [];

  const tasks = countryCodes.map(cc => () => searchPodcasts({
    term,
    countryCode: cc,
    limit: limitPerCountry,
    signal,
  }));
  const settled = await runWithConcurrency(tasks, 4, signal);
  const lists = settled
    .filter((r): r is PromiseFulfilledResult<PodcastPreview[]> => r.status === 'fulfilled')
    .map(r => r.value);
  return dedupeById(lists);
}

/* -------------------------------------------------------------------------- */
/*  Lookup                                                                    */
/* -------------------------------------------------------------------------- */

interface LookupItem {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  feedUrl?: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  collectionViewUrl?: string;
  primaryGenreName?: string;
  trackCount?: number;
  releaseDate?: string;
}

interface LookupResponse {
  resultCount?: number;
  results?: LookupItem[];
}

/**
 * Resolve an Apple Podcasts collection id (`im:id` from the top-charts
 * RSS feed) to the publisher's RSS feed URL plus the rich metadata Apple
 * has on it. The discovery page only stores the id (not the feed URL)
 * because top-charts JSON omits it; this is the bridge to the actual
 * podcast.
 */
export async function lookupPodcast(opts: {
  id: string;
  signal?: AbortSignal;
}): Promise<PodcastPreview & { feedUrl: string }> {
  const { id, signal } = opts;
  const res = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`, { signal });
  if (!res.ok) throw new Error(`iTunes lookup failed: ${res.status}`);
  const data = (await res.json()) as LookupResponse;
  const r = data.results?.[0];
  if (!r || !r.feedUrl) {
    throw new Error('Podcast not found or has no public RSS feed');
  }
  return {
    id: String(r.collectionId ?? id),
    title: r.collectionName ?? '',
    author: r.artistName ?? '',
    artworkUrl: r.artworkUrl600 ?? r.artworkUrl100 ?? '',
    link: r.collectionViewUrl,
    feedUrl: r.feedUrl,
  };
}
