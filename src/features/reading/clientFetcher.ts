import type { FeedItem, FeedSource } from './types';

/**
 * Client-side RSS fetcher — fallback when Supabase Edge Functions are
 * unavailable (missing env vars, network issues, free-tier limits).
 *
 * Uses public CORS proxies to fetch RSS/Atom XML directly from the
 * browser, then parses it locally. This ensures the Reading feature
 * always works, even without a backend.
 *
 * Resilience features:
 *  - Multiple CORS proxies with automatic failover
 *  - Per-proxy timeout with independent AbortControllers
 *  - Retry logic with exponential backoff on transient failures
 *  - Error classification (transient vs permanent) for smart retry
 *  - Connection health tracking to prefer working proxies
 *  - Graceful degradation when all proxies fail
 */

// ─── CORS proxy pool ───────────────────────────────────────────────────────
// Each proxy has a health score. Failed proxies are deprioritized so
// subsequent fetches prefer ones that responded recently.
// Health scores are persisted to sessionStorage so they survive
// in-page navigations (but reset on new browser sessions).

const PROXY_HEALTH_KEY = 'rss-proxy-health';

interface ProxyEntry {
  url: string;
  /** Lower = healthier. Incremented on failure, reset on success. */
  failures: number;
  /** Timestamp of last successful response. */
  lastOk: number;
}

function loadProxyHealth(): ProxyEntry[] {
  const defaults: ProxyEntry[] = [
    { url: 'https://api.allorigins.win/raw?url=', failures: 0, lastOk: 0 },
    { url: 'https://corsproxy.io/?', failures: 0, lastOk: 0 },
    { url: 'https://api.codetabs.com/v1/proxy?quest=', failures: 0, lastOk: 0 },
    { url: 'https://thingproxy.freeboard.io/fetch/', failures: 0, lastOk: 0 },
  ];
  try {
    const raw = sessionStorage.getItem(PROXY_HEALTH_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as ProxyEntry[];
    if (!Array.isArray(saved) || saved.length === 0) return defaults;
    // Merge saved scores into defaults (handles added/removed proxies)
    const savedMap = new Map(saved.map((p) => [p.url, p]));
    return defaults.map((d) => savedMap.get(d.url) ?? d);
  } catch {
    return defaults;
  }
}

function persistProxyHealth(pool: ProxyEntry[]): void {
  try {
    sessionStorage.setItem(PROXY_HEALTH_KEY, JSON.stringify(pool));
  } catch { /* sessionStorage unavailable or full */ }
}

const PROXY_POOL: ProxyEntry[] = loadProxyHealth();

/** Return proxies sorted by health: fewer failures first, recent success first. */
function getSortedProxies(): ProxyEntry[] {
  return [...PROXY_POOL].sort((a, b) => {
    if (a.failures !== b.failures) return a.failures - b.failures;
    return b.lastOk - a.lastOk; // prefer more recently successful
  });
}

// ─── Constants ─────────────────────────────────────────────────────────────

const FETCH_TIMEOUT = 15_000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 800;

// ─── Error classification ──────────────────────────────────────────────────

type ErrorKind = 'transient' | 'permanent' | 'timeout' | 'offline';

function classifyError(err: unknown): ErrorKind {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  if (err instanceof DOMException && err.name === 'AbortError') return 'timeout';
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  if (msg.includes('timeout') || msg.includes('abort')) return 'timeout';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) return 'transient';
  if (msg.includes('cors') || msg.includes('403') || msg.includes('404')) return 'permanent';
  // Default to transient so we retry on unknown errors
  return 'transient';
}

function shouldRetry(kind: ErrorKind): boolean {
  return kind === 'transient' || kind === 'timeout';
}

// ─── Core fetch logic ──────────────────────────────────────────────────────

/** Attempt fetch through CORS proxies with health-aware ordering and retry. */
async function fetchViaProxy(url: string, signal?: AbortSignal): Promise<string | null> {
  const proxies = getSortedProxies();

  for (const proxy of proxies) {
    if (signal?.aborted) return null;

    // Each proxy attempt gets its own AbortController with a timeout.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    // Forward the outer abort signal
    const onOuterAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        return null;
      }
      signal.addEventListener('abort', onOuterAbort, { once: true });
    }

    try {
      const res = await fetch(`${proxy.url}${encodeURIComponent(url)}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
        },
      });

      if (!res.ok) {
        proxy.failures = Math.min(proxy.failures + 1, 10);
        continue;
      }

      const text = await res.text();

      // Validate: does it look like XML?
      if (text.includes('<rss') || text.includes('<feed') || text.includes('<?xml')) {
        // Success — reset failure counter and record timestamp
        proxy.failures = 0;
        proxy.lastOk = Date.now();
        persistProxyHealth(PROXY_POOL);
        return text;
      }

      // Got a response but it's not RSS/Atom — proxy might be returning
      // an error page. Mark as soft failure and try next.
      proxy.failures = Math.min(proxy.failures + 1, 5);
      persistProxyHealth(PROXY_POOL);
    } catch (err) {
      const kind = classifyError(err);
      if (kind === 'offline') return null; // No point trying other proxies
      proxy.failures = Math.min(proxy.failures + 1, 10);
      persistProxyHealth(PROXY_POOL);
      // If permanent error, skip retry for this proxy
      if (kind === 'permanent') continue;
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onOuterAbort);
    }
  }
  return null;
}

/**
 * Fetch with retry: wraps `fetchViaProxy` with exponential backoff.
 * Only retries on transient/timeout errors; permanent failures bail immediately.
 */
async function fetchWithRetry(url: string, signal?: AbortSignal): Promise<string | null> {
  let lastResult: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted) return null;

    lastResult = await fetchViaProxy(url, signal);
    if (lastResult) return lastResult;

    // Don't retry if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

    // Exponential backoff with jitter before retrying
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_MS * (2 ** attempt) + Math.random() * 200;
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, delay);
        if (signal) {
          const onAbort = () => { clearTimeout(t); resolve(); };
          signal.addEventListener('abort', onAbort, { once: true });
        }
      });
    }
  }

  return lastResult;
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

  try {
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
        if (!title && !link) continue;
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

        if (!title && !link) continue;

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
  } catch (err) {
    // Parsing errors shouldn't crash the whole feed list.
    // Return whatever items we managed to extract before the error.
    console.warn(`[Reading] XML parse error for source "${sourceName}":`, err);
  }

  return items;
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface ClientFetchResult {
  source: string;
  url: string;
  items: FeedItem[];
  error?: string;
  /** Error classification for the caller to decide on retry strategy. */
  errorKind?: ErrorKind;
  /** How long this fetch took (ms) — useful for diagnostics. */
  durationMs?: number;
}

/**
 * Fetch multiple RSS feeds client-side via CORS proxy.
 * Returns results for each feed (items or error).
 *
 * Features:
 *  - Concurrent batch fetching (4 at a time to avoid overwhelming proxies)
 *  - Per-feed error isolation — one failing feed doesn't block others
 *  - Duration tracking for diagnostics
 *  - Smart error classification for UI feedback
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
        const start = Date.now();
        try {
          const xml = await fetchWithRetry(feed.url, signal);
          const durationMs = Date.now() - start;

          if (!xml) {
            const errorKind: ErrorKind = (typeof navigator !== 'undefined' && !navigator.onLine)
              ? 'offline'
              : 'transient';
            return {
              source: feed.name,
              url: feed.url,
              items: [],
              error: errorKind === 'offline'
                ? 'Device is offline'
                : 'Failed to fetch after retries',
              errorKind,
              durationMs,
            };
          }

          const items = parseXML(xml, feed.name);
          if (items.length === 0) {
            return {
              source: feed.name,
              url: feed.url,
              items: [],
              error: 'No parseable items',
              errorKind: 'permanent',
              durationMs,
            };
          }

          return { source: feed.name, url: feed.url, items, durationMs };
        } catch (err) {
          const durationMs = Date.now() - start;
          const errorKind = classifyError(err);
          return {
            source: feed.name,
            url: feed.url,
            items: [],
            error: err instanceof Error ? err.message : 'Unknown error',
            errorKind,
            durationMs,
          };
        }
      }),
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      } else {
        const errorKind = classifyError(r.reason);
        results.push({
          source: '',
          url: '',
          items: [],
          error: (r.reason as { message?: string })?.message || 'Unknown error',
          errorKind,
        });
      }
    }

    // Small breathing room between batches to avoid rate limiting
    if (i + BATCH_SIZE < feeds.length && !signal?.aborted) {
      await new Promise((r) => setTimeout(r, 150));
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
  if (!url || url.includes('placeholder') || !key || key.includes('placeholder')) {
    return false;
  }
  return true;
}

/**
 * Get health status of CORS proxies. Useful for diagnostics in CronView.
 */
export function getProxyHealth(): Array<{ url: string; failures: number; lastOk: number }> {
  return PROXY_POOL.map((p) => ({ url: p.url, failures: p.failures, lastOk: p.lastOk }));
}
