import type { CalculationMethodId } from '@/utils/prayerAstronomy';

/**
 * Aladhan API client — authoritative per-country prayer timetables.
 *
 * We use this purely as a CALIBRATION source: every astronomy-computed
 * city is checked against Aladhan once per day, the per-prayer minute
 * delta is cached in localStorage, and that offset is then applied to
 * the live astronomical calculation. This gives:
 *   • dawn/dusk timings matching every country's official publication
 *   • zero API calls during the day (everything served from cache)
 *   • graceful fallback to pure astronomy if Aladhan is unreachable
 *
 * Aladhan method IDs — keep aligned with /utils/prayerAstronomy methods.
 */
export const ALADHAN_METHOD: Record<CalculationMethodId, number> = {
  MWL:        3,
  ISNA:       2,
  Egyptian:   5,
  Karachi:    1,
  UmmAlQura:  4,
  Dubai:      16,
  Qatar:      10,
  Kuwait:     9,
  Turkey:     13,
  Tehran:     7,
  Jordan:     23,
  JAKIM:      17,
  Kemenag:    20,
  Tunisia:    18,
  Algerian:   19,
  Morocco:    21,
  Russia:     14,
  Singapore:  3,
  UOIF:       12,
};

export interface AladhanTimings {
  fajr: number;     // minutes since local midnight
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

const CACHE_KEY = 'sh.adhan.cache.v1';
const ENDPOINT = 'https://api.aladhan.com/v1/timings';

/** Parse "HH:MM (TZ)" → minutes since local midnight. */
function parseHHMM(s: string): number {
  const m = /(\d{1,2}):(\d{2})/.exec(s);
  if (!m) return NaN;
  return (+m[1]) * 60 + (+m[2]);
}

/** Local date in DD-MM-YYYY for a given IANA timezone. */
function localDateString(tz: string, d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(d);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
  return `${get('day')}-${get('month')}-${get('year')}`;
}

type CacheShape = Record<string, { t: AladhanTimings; date: string; exp: number }>;

function readCache(): CacheShape {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheShape;
  } catch {
    return {};
  }
}

function writeCache(c: CacheShape) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* quota — silently ignore */
  }
}

function cacheKey(name: string, date: string): string {
  return `${name}|${date}`;
}

/** In-memory de-dup so parallel mounts don't fan out duplicate fetches. */
const inflight = new Map<string, Promise<AladhanTimings | null>>();

export interface CityKey {
  name: string;
  lat: number;
  lng: number;
  tz: string;
  method: CalculationMethodId;
  school?: 0 | 1; // 0 = Shafi/Maliki/Hanbali, 1 = Hanafi
}

/**
 * Fetch a city's official timetable for *today* (in its timezone).
 * Returns null on failure — callers fall back to pure astronomy.
 */
export async function fetchCityTimings(
  city: CityKey,
  now: Date = new Date(),
): Promise<AladhanTimings | null> {
  const date = localDateString(city.tz, now);
  const key = cacheKey(city.name, date);

  // 1) memory de-dup
  if (inflight.has(key)) return inflight.get(key)!;

  // 2) localStorage day-cache
  const cache = readCache();
  const hit = cache[key];
  if (hit && hit.exp > Date.now()) return hit.t;

  // 3) live fetch
  const url =
    `${ENDPOINT}/${date}` +
    `?latitude=${city.lat}` +
    `&longitude=${city.lng}` +
    `&method=${ALADHAN_METHOD[city.method] ?? 3}` +
    `&school=${city.school ?? 0}`;

  const promise = (async () => {
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const tm = json?.data?.timings;
      if (!tm) throw new Error('no timings');
      const out: AladhanTimings = {
        fajr:    parseHHMM(tm.Fajr),
        sunrise: parseHHMM(tm.Sunrise),
        dhuhr:   parseHHMM(tm.Dhuhr),
        asr:     parseHHMM(tm.Asr),
        maghrib: parseHHMM(tm.Maghrib),
        isha:    parseHHMM(tm.Isha),
      };
      if (Object.values(out).some((v) => Number.isNaN(v))) throw new Error('parse');
      // Cache until end of day + 6h grace
      const fresh = readCache();
      fresh[key] = { t: out, date, exp: Date.now() + 30 * 3600 * 1000 };
      // Bound cache size at ~200 entries
      const keys = Object.keys(fresh);
      if (keys.length > 240) {
        keys
          .sort((a, b) => (fresh[a].exp - fresh[b].exp))
          .slice(0, keys.length - 200)
          .forEach((k) => delete fresh[k]);
      }
      writeCache(fresh);
      return out;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
