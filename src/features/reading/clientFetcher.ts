import type { FeedItem, FeedSource } from './types';

/**
 * Client-side RSS fetcher — fallback when Supabase Edge Functions are
 * unavailable (missing env vars, network issues, free-tier limits).
 *
 * Uses public CORS proxies to fetch RSS/Atom XML directly from the
 * browser, then parses it locally. This ensures the Reading feature
 * always works, even without a backend.
 */

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

const FETCH_TIMEOUT = 12_000;

/** Attempt fetch through CORS proxies, falling back to the next one on failure. */
async function fetchViaProxy(url: string, signal?: AbortSignal): Promise<string | null> {
  for (const proxy of CORS_PROXIES) {
    // Each proxy attempt gets its own AbortController so a timeout on
    // proxy A doesn't prevent us from trying proxy B. We forward the
    // outer `signal`'s abort signal to the inner controller so
    // user-initiated cancellation still tears down the in-flight
    // request immediately.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const onOuterAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        return null;
      }
      signal.addEventListener('abort', onOuterAbort, { once: true });
    }
    try {
      const res = await fetch(`${proxy}${encodeURIComponent(url)}`, {
        signal: controller.signal,
      });
      if (!res.ok) continue;
      const text = await res.text();
      // Basic check: does it look like XML?
      if (text.includes('<rss') || text.includes('<feed') || text.includes('<?xml')) {
        return text;
      }
    } catch {
      // Either timeout, network error, or CORS fail — try the next proxy.
      continue;
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onOuterAbort);
    }
  }
  return null;
}

// ─── Simple RSS/Atom parser (browser-side) ─────────────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function cdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}

function getTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? cdata(m[1]) : '';
}

function getAttr(block: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["']`, 'i');
  const m = block.match(re);
  return m ? m[1] : '';
}

/**
 * For Atom entries: pick the most appropriate <link> element.
 *
 * An entry can have multiple links with different `rel` attributes.
 * We want `rel="alternate"` (the human-readable article URL) and not
 * `rel="self"` (the feed URL itself) or `rel="enclosure"` (media).
 *
 * Order of preference:
 *   1. <link rel="alternate" href="…"/>   ← canonical article link
 *   2. <link href="…"/>                   ← rel attribute omitted ⇒ alternate by spec
 *   3. <link href="…"/> as a last resort
 */
function getAtomEntryLink(entryBlock: string): string {
  const linkTags = entryBlock.match(/<link\s[^>]*\/?>/gi) || [];
  let alternate = '';
  let fallback = '';
  for (const tag of linkTags) {
    const hrefMatch = tag.match(/\shref=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    const relMatch = tag.match(/\srel=["']([^"']+)["']/i);
    const rel = (relMatch?.[1] || '').toLowerCase();
    if (!rel || rel === 'alternate') {
      // Empty rel → spec says "alternate". Prefer text/html types.
      const typeMatch = tag.match(/\stype=["']([^"']+)["']/i);
      const isHtml = !typeMatch || /html/i.test(typeMatch[1]);
      if (isHtml && !alternate) alternate = href;
      else if (!fallback) fallback = href;
    } else if (rel !== 'self' && rel !== 'enclosure' && rel !== 'edit' && !fallback) {
      fallback = href;
    }
  }
  return alternate || fallback;
}

function extractImages(html: string): string[] {
  const imgs: string[] = [];
  const re = /<img[^>]*?(?:src|data-src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const u = m[1];
    if (!u) continue;
    // Accept absolute http(s) URLs and protocol-relative URLs
    // (which we promote to https). Skip data: URIs, blob:, etc.
    let abs = u;
    if (u.startsWith('//')) abs = `https:${u}`;
    else if (!/^https?:\/\//i.test(u)) continue;
    if (!imgs.includes(abs)) imgs.push(abs);
  }
  return imgs;
}

/** Validate a date string and return its ISO form, or '' if invalid. */
function safeDate(s: string): string {
  if (!s) return '';
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return '';
  return new Date(t).toISOString();
}

function parseXML(xml: string, sourceName: string, maxItems = 50): FeedItem[] {
  const items: FeedItem[] = [];
  const isAtom = xml.includes('<feed') && !xml.includes('<rss');

  if (isAtom) {
    const entryRe = /<entry[\s\S]*?<\/entry>/g;
    let m;
    while ((m = entryRe.exec(xml)) !== null && items.length < maxItems) {
      const e = m[0];
      const title = decodeEntities(stripTags(getTag(e, 'title')));
      const link = getAtomEntryLink(e);
      const content = getTag(e, 'content') || getTag(e, 'summary');
      const pubDate = safeDate(getTag(e, 'published') || getTag(e, 'updated'));
      const author = decodeEntities(stripTags(getTag(e, 'name'))) || undefined;
      const images = extractImages(content);
      if (!title && !link) continue; // skip empty entries
      items.push({
        title,
        link,
        description: decodeEntities(stripTags(content)).slice(0, 400),
        fullContent: content || undefined,
        pubDate,
        image: images[0] || null,
        images,
        author,
        source: sourceName,
      });
    }
  } else {
    const itemRe = /<item[\s\S]*?<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) !== null && items.length < maxItems) {
      const it = m[0];
      const title = decodeEntities(stripTags(getTag(it, 'title')));
      let link = cdata(getTag(it, 'link'));
      if (!link) {
        const lm = it.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        if (lm) link = cdata(lm[1]).trim();
      }
      const contentEncoded = getTag(it, 'content:encoded');
      const desc = getTag(it, 'description');
      const fullContent = contentEncoded || desc;
      const pubDate = safeDate(getTag(it, 'pubDate') || getTag(it, 'dc:date'));
      const enclosure = getAttr(it, 'enclosure', 'url');
      const mediaContent = getAttr(it, 'media:content', 'url');
      const mediaThumb = getAttr(it, 'media:thumbnail', 'url');
      const inlineImgs = extractImages(fullContent);
      const author = decodeEntities(stripTags(getTag(it, 'author') || getTag(it, 'dc:creator'))) || undefined;

      const images: string[] = [];
      if (enclosure && /\.(jpg|jpeg|png|webp|gif|avif)/i.test(enclosure)) images.push(enclosure);
      if (mediaContent && !images.includes(mediaContent)) images.push(mediaContent);
      if (mediaThumb && !images.includes(mediaThumb)) images.push(mediaThumb);
      for (const img of inlineImgs) { if (!images.includes(img)) images.push(img); }

      if (!title && !link) continue; // skip empty items

      items.push({
        title,
        link,
        description: decodeEntities(stripTags(fullContent)).slice(0, 400),
        fullContent,
        pubDate,
        image: images[0] || null,
        images,
        author,
        source: sourceName,
      });
    }
  }

  return items;
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface ClientFetchResult {
  source: string;
  url: string;
  items: FeedItem[];
  error?: string;
}

/**
 * Fetch multiple RSS feeds client-side via CORS proxy.
 * Returns results for each feed (items or error).
 *
 * A "fetched but empty parse" outcome is reported as an error so the
 * caller can surface it (instead of treating an unparseable feed as
 * a feed that just happens to have nothing new).
 */
export async function fetchFeedsClientSide(
  feeds: FeedSource[],
  signal?: AbortSignal,
): Promise<ClientFetchResult[]> {
  const results: ClientFetchResult[] = [];

  // Fetch in batches of 4 to avoid overwhelming proxies
  const BATCH_SIZE = 4;
  for (let i = 0; i < feeds.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;
    const batch = feeds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (feed): Promise<ClientFetchResult> => {
        const xml = await fetchViaProxy(feed.url, signal);
        if (!xml) {
          return { source: feed.name, url: feed.url, items: [], error: 'Failed to fetch' };
        }
        const items = parseXML(xml, feed.name);
        if (items.length === 0) {
          return {
            source: feed.name,
            url: feed.url,
            items: [],
            error: 'No parseable items',
          };
        }
        return { source: feed.name, url: feed.url, items };
      }),
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      } else {
        results.push({
          source: '',
          url: '',
          items: [],
          error: (r.reason as { message?: string })?.message || 'Unknown error',
        });
      }
    }
  }

  return results;
}

/**
 * Check if Supabase is properly configured and reachable.
 */
export function isSupabaseAvailable(): boolean {
  const env = (import.meta as ImportMeta).env as Record<string, string | undefined>;
  const url = env?.VITE_SUPABASE_URL || '';
  const key = env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  // If using placeholder values from our fix, treat as unavailable
  if (!url || url.includes('placeholder') || !key || key.includes('placeholder')) {
    return false;
  }
  return true;
}
