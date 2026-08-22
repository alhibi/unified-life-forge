/**
 * Real photos for scouted places — Wikimedia Commons lookup.
 *
 * The scout's dossiers carry `photo_query_en` precisely so this module can
 * turn them into visuals. Commons hosts freely-licensed photography with a
 * CORS-friendly API (`origin=*`) and no key required; we take the first
 * bitmap hit for the query, keep artist credit + license (attribution is
 * both polite and required by most free licenses), and cache results in
 * localStorage — including misses, so a place with no Commons photo doesn't
 * re-query on every mount.
 */

export interface PlacePhotoResult {
  url: string | null;
  credit: string | null;
}

const CACHE_KEY = 'atlas_scout_photo_cache_v1';
const POSITIVE_TTL_MS = 14 * 24 * 60 * 60_000;
const NEGATIVE_TTL_MS = 3 * 24 * 60 * 60_000;
const FETCH_TIMEOUT_MS = 8000;

/* ── Pure extraction ────────────────────────────────────────────────────── */

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

interface CommonsImageInfo {
  thumburl?: string;
  url?: string;
  extmetadata?: Record<string, { value?: string }>;
}

/**
 * Pulls the first usable photo out of a Commons generator-search response.
 * Returns null when the payload has no image (caller treats as a miss).
 */
export function extractPhoto(payload: unknown): PlacePhotoResult | null {
  if (payload === null || typeof payload !== 'object') return null;
  const pages = (payload as { query?: { pages?: Record<string, unknown> } }).query?.pages;
  if (!pages || typeof pages !== 'object') return null;

  for (const page of Object.values(pages)) {
    const infos = (page as { imageinfo?: CommonsImageInfo[] }).imageinfo;
    const info = Array.isArray(infos) ? infos[0] : undefined;
    if (!info) continue;

    const url = typeof info.thumburl === 'string' ? info.thumburl : typeof info.url === 'string' ? info.url : null;
    if (!url || !/^https:\/\/upload\.wikimedia\.org\//.test(url)) continue;

    const meta = info.extmetadata ?? {};
    const artistRaw = meta.Artist?.value;
    const license = meta.LicenseShortName?.value;
    const creditParts = [artistRaw ? stripHtml(artistRaw) : '', license ? stripHtml(license) : ''].filter(Boolean);

    return {
      url,
      credit: creditParts.length > 0 ? creditParts.join(' · ') : null,
    };
  }
  return null;
}

/* ── Cache (localStorage, best-effort) ──────────────────────────────────── */

interface CacheEntry {
  at: number;
  url: string | null;
  credit: string | null;
}

function readCache(): Record<string, CacheEntry> {
  try {
    const raw = globalThis.localStorage?.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, CacheEntry>) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>): void {
  try {
    globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota/private mode — caching is an optimisation, not a requirement */
  }
}

export function readCachedPhoto(
  query: string,
  now: number = Date.now(),
): PlacePhotoResult | null {
  const entry = readCache()[query.trim().toLowerCase()];
  if (!entry) return null;
  const ttl = entry.url !== null ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS;
  if (now - entry.at > ttl) return null;
  return { url: entry.url, credit: entry.credit };
}

export function writeCachedPhoto(query: string, result: PlacePhotoResult, now: number = Date.now()): void {
  const cache = readCache();
  // Keep the cache bounded — drop expired entries before appending.
  const fresh: Record<string, CacheEntry> = {};
  for (const [key, entry] of Object.entries(cache)) {
    const ttl = entry.url !== null ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS;
    if (now - entry.at <= ttl) fresh[key] = entry;
  }
  fresh[query.trim().toLowerCase()] = { at: now, url: result.url, credit: result.credit };
  writeCache(fresh);
}

/* ── Network ────────────────────────────────────────────────────────────── */

/** Search Commons for one bitmap matching the phrase. */
export async function fetchPlacePhoto(
  query: string,
  signal?: AbortSignal,
): Promise<PlacePhotoResult> {
  const trimmed = query.trim();
  if (!trimmed) return { url: null, credit: null };

  const cached = readCachedPhoto(trimmed);
  if (cached) return cached;

  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${trimmed}`,
    gsrlimit: '3',
    gsrnamespace: '6', // File: namespace
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '800',
    format: 'json',
    origin: '*', // anonymous CORS
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true });

  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Commons HTTP ${res.status}`);
    const payload: unknown = await res.json();
    const result = extractPhoto(payload);
    const final = result ?? { url: null, credit: null };
    writeCachedPhoto(trimmed, final);
    return final;
  } catch {
    // Network trouble must not break card rendering — render without a photo.
    return { url: null, credit: null };
  } finally {
    clearTimeout(timer);
  }
}
