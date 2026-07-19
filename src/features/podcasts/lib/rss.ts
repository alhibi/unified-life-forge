// Minimal podcast RSS feed parser.
//
// Mirrors what `app/src/main/java/.../api/rss/FetchPodcastClient.kt` and
// `utils/rss/RssUtils.kt` do in the upstream Podium app, but as a pure
// browser implementation: native `fetch` + `DOMParser` + a tiny iTunes-
// namespace shim. No third-party RSS library — podcast feeds use ~10
// fields and we only need to read them.
//
// Network strategy (in order; first to succeed wins):
//   1. Direct fetch — a surprising number of major podcast hosts
//      (simplecast, megaphone, libsyn, rss.com, BBC) send
//      `Access-Control-Allow-Origin: *`. Skipping the proxy keeps
//      latency low and avoids rate limits on subscribed-feed refresh.
//   2. `api.codetabs.com/v1/proxy` — free, no key, fast (~150ms),
//      returns raw XML with `Access-Control-Allow-Origin: *`. This
//      handles the long tail of hosts without CORS (anchor.fm,
//      podbean, feedburner, NPR's strict variant).
//   3. `api.rss2json.com/v1/api.json` — final fallback. Returns a
//      pre-parsed JSON envelope rather than raw XML, so the success
//      path branches into `parseRss2Json` instead of the XML parser.
//      Used only when codetabs is rate-limited or 5xxs.

const CODETABS_PROXY = 'https://api.codetabs.com/v1/proxy/?quest=';
const ALLORIGINS_PROXY = 'https://api.allorigins.win/raw?url=';
const RSS2JSON_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';

/**
 * Per-fetch timeout. Picked empirically: feed responses that haven't
 * started streaming bytes within 15 s are almost always truly stuck
 * (slow origin, broken proxy, network blackhole). Without this the UI
 * could sit on its loading spinner indefinitely while React Query held
 * the request open.
 */
const FETCH_TIMEOUT_MS = 15_000;

export interface PodcastFeed {
  /** RSS feed URL — used as the stable id for subscriptions. */
  origin: string;
  title: string;
  link: string;
  description: string;
  author: string;
  imageUrl: string;
  /** Two-letter ISO language code if the feed declared one, otherwise ''. */
  languageCode: string;
  episodes: PodcastEpisode[];
}

export interface PodcastEpisode {
  /** `<origin>:<guid>` — globally unique across feeds. */
  id: string;
  guid: string;
  title: string;
  description: string;
  /** Episode-specific artwork if provided, otherwise inherits podcast cover. */
  imageUrl: string;
  pubDate: number; // ms since epoch; 0 when unparseable
  duration: number; // seconds; -1 when unknown
  audioUrl: string;
  audioMime: string;
  audioBytes: number; // bytes if the enclosure declared `length`
  link: string;
}

/* -------------------------------------------------------------------------- */
/*  Network                                                                   */
/* -------------------------------------------------------------------------- */

/** Result of `fetchText`: either raw XML, or a pre-parsed object that
 *  rss2json gave us. The caller branches on `kind`. */
type FetchResult = { kind: 'xml'; xml: string } | { kind: 'json'; json: Rss2JsonEnvelope };

async function tryFetch(url: string, signal?: AbortSignal): Promise<string> {
  // Compose the caller's optional signal with our own timeout. If
  // either trips first, the request aborts. `AbortSignal.any` is
  // available in all evergreen browsers (Chrome 116+, Firefox 124+,
  // Safari 17.4+); for older runtimes we fall back to manual linkage.
  const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const composed: AbortSignal = signal
    ? typeof AbortSignal.any === 'function'
      ? AbortSignal.any([signal, timeoutSignal])
      : linkSignals(signal, timeoutSignal)
    : timeoutSignal;
  const res = await fetch(url, { signal: composed, redirect: 'follow' });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return await res.text();
}

/**
 * Manual fallback for environments without `AbortSignal.any`. Returns
 * a fresh controller's signal that aborts whenever ANY of the inputs
 * abort. Listeners are removed once the controller fires so we don't
 * accumulate references to long-lived parent signals.
 */
function linkSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = (e: Event) => {
    controller.abort((e.target as AbortSignal | null)?.reason);
    signals.forEach((s) => s.removeEventListener('abort', onAbort));
  };
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    s.addEventListener('abort', onAbort);
  }
  return controller.signal;
}

import { supabase } from '@/integrations/supabase/client';

async function fetchFeedAny(feedUrl: string, signal?: AbortSignal): Promise<FetchResult> {
  // 1. Direct.
  try {
    const xml = await tryFetch(feedUrl, signal);
    if (xml.length > 50) return { kind: 'xml', xml };
  } catch {
    // CORS / network / non-2xx — fall through.
    if (signal?.aborted) throw new Error('aborted');
  }

  // 2. Supabase secure Edge Function fetch-rss raw proxying.
  // Bypasses CORS on the server-side, safe, fast, and does not leak user details.
  try {
    const { data, error } = await supabase.functions.invoke('fetch-rss', {
      body: { urls: [feedUrl], raw: true },
    });
    if (!error && data?.xml && data.xml.length > 50) {
      return { kind: 'xml', xml: data.xml };
    }
  } catch {
    if (signal?.aborted) throw new Error('aborted');
  }

  // 3. codetabs.
  try {
    const xml = await tryFetch(`${CODETABS_PROXY}${encodeURIComponent(feedUrl)}`, signal);
    if (xml.length > 50) return { kind: 'xml', xml };
  } catch {
    if (signal?.aborted) throw new Error('aborted');
  }

  // 4. allorigins.
  try {
    const xml = await tryFetch(`${ALLORIGINS_PROXY}${encodeURIComponent(feedUrl)}`, signal);
    if (xml.length > 50) return { kind: 'xml', xml };
  } catch {
    if (signal?.aborted) throw new Error('aborted');
  }

  // 5. rss2json — different shape, parsed downstream.
  const text = await tryFetch(`${RSS2JSON_PROXY}${encodeURIComponent(feedUrl)}`, signal);
  let env: Rss2JsonEnvelope;
  try {
    env = JSON.parse(text) as Rss2JsonEnvelope;
  } catch {
    throw new Error('Podcast feed is unreachable');
  }
  if (env.status !== 'ok') {
    throw new Error(env.message || 'Podcast feed is unreachable');
  }
  return { kind: 'json', json: env };
}

/* -------------------------------------------------------------------------- */
/*  rss2json fallback                                                         */
/* -------------------------------------------------------------------------- */

/** Minimal slice of api.rss2json.com's response we actually read.
 *  Their docs claim more fields but only these are reliable in
 *  practice across the feeds we've tested. */
interface Rss2JsonEnvelope {
  status: string;
  message?: string;
  feed?: {
    url?: string;
    title?: string;
    link?: string;
    author?: string;
    description?: string;
    image?: string;
  };
  items?: Array<{
    guid?: string;
    title?: string;
    link?: string;
    pubDate?: string;
    description?: string;
    content?: string;
    thumbnail?: string;
    enclosure?: {
      link?: string;
      type?: string;
      thumbnail?: string;
      duration?: number | string;
      length?: number | string;
    };
  }>;
}

function parseRss2Json(env: Rss2JsonEnvelope, origin: string): PodcastFeed {
  const feed = env.feed ?? {};
  const items = env.items ?? [];

  const episodes: PodcastEpisode[] = items
    .map((it): PodcastEpisode => {
      const guid = it.guid || it.link || '';
      const audioUrl = it.enclosure?.link ?? '';
      // rss2json sometimes returns duration as a number of seconds and
      // sometimes as a HH:MM:SS string; reuse the same parser as the
      // XML path so both branches stay consistent.
      const durationRaw = it.enclosure?.duration;
      const duration =
        typeof durationRaw === 'number' ? durationRaw : parseDuration(String(durationRaw ?? ''));
      const lengthRaw = it.enclosure?.length;
      const audioBytes =
        typeof lengthRaw === 'number' ? lengthRaw : parseInt(String(lengthRaw ?? '0'), 10) || 0;

      return {
        id: `${origin}:${guid}`,
        guid,
        title: it.title ?? '',
        // Prefer `content` (HTML) over `description` (often plain).
        description: it.content || it.description || '',
        imageUrl: it.thumbnail || it.enclosure?.thumbnail || feed.image || '',
        pubDate: parsePubDate(it.pubDate ?? ''),
        duration,
        audioUrl,
        audioMime: it.enclosure?.type ?? '',
        audioBytes,
        link: it.link ?? '',
      };
    })
    .filter((e) => e.audioUrl);

  return {
    origin,
    title: feed.title ?? '',
    link: feed.link ?? '',
    description: feed.description ?? '',
    author: feed.author ?? '',
    imageUrl: feed.image ?? '',
    languageCode: '', // rss2json doesn't return language in its public schema
    episodes,
  };
}

/* -------------------------------------------------------------------------- */
/*  Parsing                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * `DOMParser` ignores XML namespaces by default in HTML mode but in
 * `application/xml` mode it preserves them. We use `getElementsByTagName`
 * (which does namespace-agnostic local-name matching in XML mode after
 * a colon, e.g. `itunes:image`) for the iTunes-extension fields, and
 * walk children directly for the standard RSS fields. This avoids
 * pulling in a real namespace-aware lib for ~6 tags.
 */
function text(el: Element | null | undefined, tag: string): string {
  if (!el) return '';
  const child = el.getElementsByTagName(tag)[0];
  return child?.textContent?.trim() ?? '';
}

/**
 * Parse iTunes' `HH:MM:SS`, `MM:SS`, or plain-seconds duration string
 * into a count of seconds. Returns -1 if we can't make sense of it.
 */
function parseDuration(raw: string): number {
  if (!raw) return -1;
  const trimmed = raw.trim();
  if (!trimmed) return -1;
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  const parts = trimmed.split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return -1;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return -1;
}

function parsePubDate(raw: string): number {
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Some feeds wrap the description in CDATA, some return HTML, some
 * plain text. We pass through whatever's there and let the consumer
 * sanitize at render time (we render with `dangerouslySetInnerHTML`
 * inside a sandboxed-style container, see `EpisodeListItem.tsx`).
 */
function parseFeed(xml: string, origin: string): PodcastFeed {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  // Browsers emit a `<parsererror>` element directly in the doc when
  // the XML is malformed. Some podcast feeds ship invalid XML (badly
  // escaped ampersands, mostly) — surface that as a clean error.
  const parseError = doc.getElementsByTagName('parsererror')[0];
  if (parseError) throw new Error('Podcast feed is not valid XML');

  const channel = doc.getElementsByTagName('channel')[0];
  if (!channel) throw new Error('Podcast feed has no <channel>');

  // Channel-level image. The iTunes podcast spec uses
  // `<itunes:image href="...">`, standard RSS uses
  // `<image><url>...</url></image>`. A handful of feeds also include
  // `<media:thumbnail url="..."/>` from the Yahoo Media RSS spec.
  // Each value gets `.trim()` because some feeds include line
  // breaks/whitespace inside the attribute (the XML parser keeps
  // them verbatim).
  const itunesImg = (
    channel.getElementsByTagName('itunes:image')[0]?.getAttribute('href') ?? ''
  ).trim();
  const stdImg = (
    channel.getElementsByTagName('image')[0]?.getElementsByTagName('url')[0]?.textContent ?? ''
  ).trim();
  const mediaThumb = (
    channel.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url') ?? ''
  ).trim();
  const imageUrl = itunesImg || stdImg || mediaThumb;

  const author = text(channel, 'itunes:author') || text(channel, 'managingEditor');
  const description = text(channel, 'itunes:summary') || text(channel, 'description');

  // Walk only DIRECT child <item>s (some feeds nest channel-info
  // descriptions that contain spurious `<item>` text); querying off
  // `channel` already scopes us correctly.
  const items = Array.from(channel.getElementsByTagName('item'));

  const episodes: PodcastEpisode[] = items
    .map((item): PodcastEpisode => {
      const guid = text(item, 'guid') || text(item, 'link');
      const enclosure = item.getElementsByTagName('enclosure')[0];
      const audioUrl = enclosure?.getAttribute('url') ?? '';
      const audioMime = enclosure?.getAttribute('type') ?? '';
      const audioBytes = parseInt(enclosure?.getAttribute('length') ?? '0', 10) || 0;

      // Episode-level artwork. Try the iTunes attribute first, then
      // Media-RSS thumbnail, then the rare `<image><url>...</url></image>`
      // some publishers nest inside an `<item>`. Whichever wins gets
      // trimmed for the same whitespace reasons as the channel image.
      const itemImage =
        (item.getElementsByTagName('itunes:image')[0]?.getAttribute('href') ?? '').trim() ||
        (item.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url') ?? '').trim() ||
        (item.getElementsByTagName('media:content')[0]?.getAttribute('url') ?? '').trim() ||
        (
          item.getElementsByTagName('image')[0]?.getElementsByTagName('url')[0]?.textContent ?? ''
        ).trim();
      // `<content:encoded>` carries the full HTML description on most
      // modern feeds; standard `<description>` is the short summary.
      const fullDescription =
        text(item, 'content:encoded') || text(item, 'itunes:summary') || text(item, 'description');

      return {
        id: `${origin}:${guid}`,
        guid,
        title: text(item, 'title'),
        description: fullDescription,
        imageUrl: itemImage || imageUrl,
        pubDate: parsePubDate(text(item, 'pubDate')),
        duration: parseDuration(text(item, 'itunes:duration')),
        audioUrl,
        audioMime,
        audioBytes,
        link: text(item, 'link'),
      };
      // Keep only items that actually have audio. Trailers, "promo" items
      // without an enclosure, or video-only items aren't playable here.
    })
    .filter((e) => e.audioUrl);

  return {
    origin,
    title: text(channel, 'title'),
    link: text(channel, 'link'),
    description,
    author,
    imageUrl,
    languageCode: text(channel, 'language').slice(0, 2).toLowerCase(),
    episodes,
  };
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export async function fetchPodcastFeed(opts: {
  feedUrl: string;
  signal?: AbortSignal;
}): Promise<PodcastFeed> {
  const result = await fetchFeedAny(opts.feedUrl, opts.signal);
  if (result.kind === 'json') return parseRss2Json(result.json, opts.feedUrl);
  return parseFeed(result.xml, opts.feedUrl);
}
