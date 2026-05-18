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
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      const mergedSignal = signal
        ? new AbortController() // we'll listen to both
        : controller;

      if (signal) {
        signal.addEventListener('abort', () => controller.abort());
      }

      const res = await fetch(`${proxy}${encodeURIComponent(url)}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const text = await res.text();
      // Basic check: does it look like XML?
      if (text.includes('<rss') || text.includes('<feed') || text.includes('<?xml')) {
        return text;
      }
    } catch {
      continue;
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

function extractImages(html: string): string[] {
  const imgs: string[] = [];
  const re = /<img[^>]*?(?:src|data-src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1].startsWith('http') && !imgs.includes(m[1])) imgs.push(m[1]);
  }
  return imgs;
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
      const link = getAttr(e, 'link', 'href');
      const content = getTag(e, 'content') || getTag(e, 'summary');
      const pubDate = getTag(e, 'published') || getTag(e, 'updated');
      const images = extractImages(content);
      items.push({
        title,
        link,
        description: decodeEntities(stripTags(content)).slice(0, 400),
        pubDate,
        image: images[0] || null,
        images,
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
      const pubDate = getTag(it, 'pubDate') || getTag(it, 'dc:date');
      const enclosure = getAttr(it, 'enclosure', 'url');
      const mediaContent = getAttr(it, 'media:content', 'url');
      const mediaThumb = getAttr(it, 'media:thumbnail', 'url');
      const inlineImgs = extractImages(fullContent);

      const images: string[] = [];
      if (enclosure && /\.(jpg|jpeg|png|webp|gif)/i.test(enclosure)) images.push(enclosure);
      if (mediaContent && !images.includes(mediaContent)) images.push(mediaContent);
      if (mediaThumb && !images.includes(mediaThumb)) images.push(mediaThumb);
      for (const img of inlineImgs) { if (!images.includes(img)) images.push(img); }

      items.push({
        title,
        link,
        description: decodeEntities(stripTags(fullContent)).slice(0, 400),
        fullContent,
        pubDate,
        image: images[0] || null,
        images,
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
        return { source: feed.name, url: feed.url, items };
      }),
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      } else {
        results.push({ source: '', url: '', items: [], error: r.reason?.message || 'Unknown error' });
      }
    }
  }

  return results;
}

/**
 * Check if Supabase is properly configured and reachable.
 */
export function isSupabaseAvailable(): boolean {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const key = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  // If using placeholder values from our fix, treat as unavailable
  if (!url || url.includes('placeholder') || !key || key.includes('placeholder')) {
    return false;
  }
  return true;
}
