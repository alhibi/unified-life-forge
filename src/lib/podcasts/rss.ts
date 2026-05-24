// Minimal podcast RSS feed parser.
//
// Mirrors what `app/src/main/java/.../api/rss/FetchPodcastClient.kt` and
// `utils/rss/RssUtils.kt` do in the upstream Podium app, but as a pure
// browser implementation: native `fetch` + `DOMParser` + a tiny iTunes-
// namespace shim. No third-party RSS library — podcast feeds use ~10
// fields and we only need to read them.
//
// Network strategy:
//   1. First try the feed URL directly. A surprising number of major
//      podcast hosts (simplecast, megaphone, libsyn, rss.com, BBC) send
//      `Access-Control-Allow-Origin: *` and we can avoid the proxy
//      entirely. That keeps latency down and means we don't hit the
//      proxy's rate limit on subscribed-feed refreshes.
//   2. If the direct request fails (CORS, network, opaque error), we
//      retry through `api.codetabs.com/v1/proxy` which is free, has no
//      key, returns the raw body with `Access-Control-Allow-Origin: *`,
//      and was the only public proxy we could find still working as of
//      this writing.
//
// The two responses are byte-equivalent so the rest of the parser
// doesn't care which path won.

const PROXY_ENDPOINT = 'https://api.codetabs.com/v1/proxy/?quest=';

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
  pubDate: number;       // ms since epoch; 0 when unparseable
  duration: number;      // seconds; -1 when unknown
  audioUrl: string;
  audioMime: string;
  audioBytes: number;    // bytes if the enclosure declared `length`
  link: string;
}

/* -------------------------------------------------------------------------- */
/*  Network                                                                   */
/* -------------------------------------------------------------------------- */

async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  // Try direct first. We can't read CORS errors as a distinct error type
  // — they surface as a generic `TypeError: Failed to fetch` — so we
  // just catch any throw and fall through to the proxy.
  try {
    const res = await fetch(url, { signal, redirect: 'follow' });
    if (res.ok) return await res.text();
    // Some hosts answer HEAD with 200 but GET with 301 to a no-CORS host;
    // treat any non-2xx as a reason to try the proxy.
    throw new Error(`direct fetch returned ${res.status}`);
  } catch (e) {
    if (signal?.aborted) throw e;
    const proxied = `${PROXY_ENDPOINT}${encodeURIComponent(url)}`;
    const res = await fetch(proxied, { signal });
    if (!res.ok) throw new Error(`RSS proxy returned ${res.status}`);
    return await res.text();
  }
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
  const parts = trimmed.split(':').map(p => parseInt(p, 10));
  if (parts.some(p => Number.isNaN(p))) return -1;
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

  // Channel-level image. iTunes puts it in `<itunes:image href="...">`,
  // standard RSS uses `<image><url>...</url></image>`.
  const itunesImg = channel.getElementsByTagName('itunes:image')[0]?.getAttribute('href') ?? '';
  const stdImg = channel.getElementsByTagName('image')[0]?.getElementsByTagName('url')[0]?.textContent?.trim() ?? '';
  const imageUrl = itunesImg || stdImg;

  const author = text(channel, 'itunes:author') || text(channel, 'managingEditor');
  const description = text(channel, 'itunes:summary') || text(channel, 'description');

  // Walk only DIRECT child <item>s (some feeds nest channel-info
  // descriptions that contain spurious `<item>` text); querying off
  // `channel` already scopes us correctly.
  const items = Array.from(channel.getElementsByTagName('item'));

  const episodes: PodcastEpisode[] = items.map((item): PodcastEpisode => {
    const guid = text(item, 'guid') || text(item, 'link');
    const enclosure = item.getElementsByTagName('enclosure')[0];
    const audioUrl = enclosure?.getAttribute('url') ?? '';
    const audioMime = enclosure?.getAttribute('type') ?? '';
    const audioBytes = parseInt(enclosure?.getAttribute('length') ?? '0', 10) || 0;

    const itemImage = item.getElementsByTagName('itunes:image')[0]?.getAttribute('href') ?? '';
    // `<content:encoded>` carries the full HTML description on most
    // modern feeds; standard `<description>` is the short summary.
    const fullDescription =
      text(item, 'content:encoded') ||
      text(item, 'itunes:summary') ||
      text(item, 'description');

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
  }).filter(e => e.audioUrl);

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
  const xml = await fetchText(opts.feedUrl, opts.signal);
  return parseFeed(xml, opts.feedUrl);
}
