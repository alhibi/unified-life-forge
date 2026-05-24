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
//   - Lookup (RSS feed url for a collection id — kept for completeness;
//     the discovery UI doesn't need it but episode pages would):
//       GET https://itunes.apple.com/lookup?id={id}
//
// We only model the fields the UI actually renders. The raw responses are
// huge (one entry has ~30 fields, most of them iTunes metadata). Mapping
// to a single normalized `PodcastPreview` shape keeps the page code tiny
// and isolates us from the two endpoints disagreeing on naming
// (top-charts uses `im:name`/`im:artist`/`im:image`, search uses
// `collectionName`/`artistName`/`artworkUrlXXX`).

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

export async function fetchTopPodcasts(opts: {
  countryCode: string;
  genreId?: number | null;
  limit?: number;
  signal?: AbortSignal;
}): Promise<PodcastPreview[]> {
  const { countryCode, genreId, limit = 50, signal } = opts;
  const cc = countryCode.toLowerCase();
  const genrePart = genreId ? `genre=${genreId}/` : '';
  const url = `https://itunes.apple.com/${cc}/rss/toppodcasts/limit=${limit}/${genrePart}explicit=true/json`;

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
  const { term, countryCode, limit = 50, signal } = opts;
  const params = new URLSearchParams({
    media: 'podcast',
    country: countryCode.toLowerCase(),
    term,
    limit: String(limit),
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
