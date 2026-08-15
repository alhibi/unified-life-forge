// Shared prayer-times cache + hybrid resolver.
//
// Strategy:
//   1. Pick an authoritative Aladhan calculation method per region
//      (caller may override; otherwise we auto-detect by lat/lng).
//   2. Try Aladhan API for the most accurate timings (country-tuned).
//   3. Cross-check the API answer against the local astronomical
//      computation. A remote answer that disagrees by more than a few
//      minutes on the *sun-anchored* prayers (Dhuhr / Sunrise / Maghrib —
//      pure geometry, no ijtihad involved) means the response was resolved
//      for the wrong place or timezone, so we reject it instead of showing
//      the user a plausible-looking wrong timetable.
//   4. If the API is unreachable or rejected, fall back to the LOCAL
//      adhan.js computation using equivalent parameters — guaranteeing we
//      always return valid timings worldwide, even offline.
//
// The cache is *day-scoped*, not merely time-to-live based: an entry is only
// ever served for the calendar day it was computed for, so the timetable can
// never survive midnight and describe yesterday. Entries for other days are
// kept (not overwritten) so that a device that went offline still has the
// days it already fetched.

import { withBreaker } from '@/lib/circuitBreaker';
import { type AladhanMethod,computeLocalTimings, pickMethodForLocation } from '@/lib/prayerCalculationMethod';

type Timings = Record<string, string>;

interface CacheEntry {
  timings: Timings;
  /** When it was stored (used only to refresh a still-current day). */
  timestamp: number;
  /** Local calendar day the timings describe, `YYYY-MM-DD`. */
  day: string;
  /** 'api' | 'local' — a local entry is refreshed eagerly, an API one is not. */
  source: 'api' | 'local';
}

const CACHE_KEY = 'prayer_times_cache_v2';
/** How long an API answer for *today* stays fresh before we re-verify. */
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h — timings for a given day never change
/** A locally computed entry is retried against the API much sooner. */
const LOCAL_TTL = 10 * 60 * 1000; // 10 min
/** Maximum stored day-entries before the oldest are evicted. */
const MAX_ENTRIES = 24;
/**
 * Tolerance for the sun-anchored cross-check. Agencies apply a few minutes of
 * ihtiyat (safety margin) to Maghrib and round Dhuhr up, so small deviations
 * are legitimate; a wrong timezone or wrong hemisphere is off by far more.
 */
const SANITY_TOLERANCE_MIN = 20;

let inFlightPromise: Promise<Record<string, string> | null> | null = null;
let inFlightKey = '';

/**
 * Coordinates are rounded to 3 decimals (~110 m) in the key. Finer precision
 * only churns the cache on GPS jitter: 110 m changes no prayer time by even a
 * second, so the same timetable should be reused.
 */
function getCacheKey(lat: number, lng: number, school: number, latAdj: number, method: number): string {
  return `${lat.toFixed(3)}_${lng.toFixed(3)}_${school}_${latAdj}_${method}`;
}

function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readStore(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, CacheEntry>;
  } catch { return {}; }
}

function writeStore(store: Record<string, CacheEntry>): void {
  try {
    const entries = Object.entries(store);
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      store = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch { /* quota — the in-memory answer is still correct */ }
}

function saveEntry(key: string, timings: Timings, source: 'api' | 'local'): void {
  const day = localDayKey();
  const store = readStore();
  store[`${key}@${day}`] = { timings, timestamp: Date.now(), day, source };
  // Drop entries for days that have already passed.
  for (const k of Object.keys(store)) {
    if (store[k]?.day < day) delete store[k];
  }
  writeStore(store);
}

function loadCache(key: string): Timings | null {
  const day = localDayKey();
  const entry = readStore()[`${key}@${day}`];
  if (!entry || entry.day !== day) return null;
  const ttl = entry.source === 'local' ? LOCAL_TTL : CACHE_TTL;
  if (Date.now() - entry.timestamp > ttl) return null;
  return isUsable(entry.timings) ? entry.timings : null;
}

const REQUIRED_SLOTS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

/** `HH:MM` (Aladhan may append ` (EET)`) → minutes since local midnight. */
function toMinutes(value: string | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** A timetable is usable only if every prayer the UI renders actually parsed. */
function isUsable(timings: Timings | undefined | null): boolean {
  if (!timings) return false;
  return REQUIRED_SLOTS.every((slot) => toMinutes(timings[slot]) !== null);
}

/**
 * Reject remote timings that contradict the sky. Only the three purely
 * geometric events are compared — the ones no school disagrees about — so a
 * legitimate methodological difference in Fajr/Isha angles never trips this.
 */
function agreesWithSky(remote: Timings, local: Timings | null): boolean {
  if (!local) return true; // nothing to compare against; trust the API
  const circular = (a: number, b: number) => {
    const d = Math.abs(a - b) % 1440;
    return Math.min(d, 1440 - d);
  };
  for (const slot of ['Sunrise', 'Dhuhr', 'Maghrib'] as const) {
    const r = toMinutes(remote[slot]);
    const l = toMinutes(local[slot]);
    if (r === null || l === null) continue;
    if (circular(r, l) > SANITY_TOLERANCE_MIN) return false;
  }
  return true;
}

export async function fetchPrayerTimings(
  lat: number,
  lng: number,
  school: number,
  latAdj: number,
  /** Aladhan method id; if omitted we auto-pick the regionally-accurate one. */
  method?: AladhanMethod,
): Promise<Record<string, string> | null> {
  const resolvedMethod = method ?? pickMethodForLocation(lat, lng).method;
  const key = getCacheKey(lat, lng, school, latAdj, resolvedMethod);

  // Check cache first
  const cached = loadCache(key);
  if (cached) return cached;

  // Deduplicate in-flight requests
  if (inFlightPromise && inFlightKey === key) {
    return inFlightPromise;
  }

  const doFetch = async (): Promise<Record<string, string> | null> => {
    // The local astronomical timetable is computed up-front for two reasons:
    // it is the offline fallback, and it is the reference the remote answer is
    // sanity-checked against.
    const localTimings: Timings | null = (() => {
      try {
        const timings = computeLocalTimings(
          lat, lng,
          resolvedMethod,
          (school === 1 ? 1 : 0) as 0 | 1,
          (latAdj === 1 || latAdj === 2 ? latAdj : 3) as 1 | 2 | 3,
        );
        return isUsable(timings) ? timings : null;
      } catch { return null; }
    })();

    const localFallback = (): Record<string, string> | null => {
      if (!localTimings) return null;
      saveEntry(key, localTimings, 'local');
      return localTimings;
    };

    try {
      const today = new Date();
      const dd = today.getDate();
      const mm = today.getMonth() + 1;
      const yyyy = today.getFullYear();
      // Breaker-guarded: when Aladhan is down we stop dialling it and fall
      // straight to the local astronomical computation, which is exact enough
      // to pray by. Without this, every mounted prayer surface re-dialled a
      // dead endpoint on every render pass.
      const data = await withBreaker(
        'aladhan:timings',
        async () => {
          // A hung request must not leave the prayer card empty: bail out after
          // 8 s and let the local computation answer instead.
          const res = await fetch(
            `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=${resolvedMethod}&school=${school}&latitudeAdjustmentMethod=${latAdj}`,
            { signal: AbortSignal.timeout(8000) },
          );
          if (!res.ok) throw Object.assign(new Error('aladhan http error'), { status: res.status });
          return (await res.json()) as { code?: number; data?: { timings?: Record<string, string> } };
        },
        { fallback: () => ({ code: 0 }) },
      );
      if (data.code === 200) {
        const timings = data.data?.timings as Timings | undefined;
        // Only accept a complete, sky-consistent timetable. Anything else is
        // silently replaced by the local computation rather than displayed.
        if (isUsable(timings) && agreesWithSky(timings as Timings, localTimings)) {
          saveEntry(key, timings as Timings, 'api');
          return timings as Timings;
        }
      }
    } catch { /* silent — fall through to local */ }
    return localFallback();
  };

  inFlightKey = key;
  inFlightPromise = doFetch();
  try {
    return await inFlightPromise;
  } finally {
    inFlightPromise = null;
    inFlightKey = '';
  }
}
