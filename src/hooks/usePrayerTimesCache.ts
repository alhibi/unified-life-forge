// Shared prayer-times cache + hybrid resolver.
//
// Strategy:
//   1. Pick an authoritative Aladhan calculation method per region
//      (caller may override; otherwise we auto-detect by lat/lng).
//   2. Try Aladhan API for the most accurate timings (country-tuned).
//   3. If the API is unreachable, fall back to a LOCAL adhan.js
//      computation using equivalent parameters — guaranteeing we
//      always return valid timings worldwide, even offline.

import { withBreaker } from '@/lib/circuitBreaker';
import { type AladhanMethod,computeLocalTimings, pickMethodForLocation } from '@/lib/prayerCalculationMethod';

interface CachedPrayer {
  timings: Record<string, string>;
  timestamp: number;
  lat: number;
  lng: number;
  school: number;
  latAdj: number;
  method: number;
}

const CACHE_KEY = 'prayer_times_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 min

let inFlightPromise: Promise<Record<string, string> | null> | null = null;
let inFlightKey = '';

function getCacheKey(lat: number, lng: number, school: number, latAdj: number, method: number): string {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}_${school}_${latAdj}_${method}`;
}

function loadCache(key: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedPrayer = JSON.parse(raw);
    const cachedKey = getCacheKey(cached.lat, cached.lng, cached.school, cached.latAdj, cached.method ?? 4);
    if (cachedKey === key && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.timings;
    }
  } catch { /* ignore */ }
  return null;
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
    // Always have a local hybrid result ready as fallback so we never return null.
    const localFallback = (): Record<string, string> | null => {
      try {
        const timings = computeLocalTimings(
          lat, lng,
          resolvedMethod,
          (school === 1 ? 1 : 0) as 0 | 1,
          (latAdj === 1 || latAdj === 2 ? latAdj : 3) as 1 | 2 | 3,
        );
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            timings, timestamp: Date.now(), lat, lng, school, latAdj, method: resolvedMethod,
          }));
        } catch { /* ignore */ }
        return timings;
      } catch { return null; }
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
          const res = await fetch(
            `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=${resolvedMethod}&school=${school}&latitudeAdjustmentMethod=${latAdj}`,
          );
          if (!res.ok) throw Object.assign(new Error('aladhan http error'), { status: res.status });
          return (await res.json()) as { code?: number; data?: { timings?: Record<string, string> } };
        },
        { fallback: () => ({ code: 0 }) },
      );
      if (data.code === 200) {
        const timings = data.data?.timings as Record<string, string>;
        // Save to cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            timings, timestamp: Date.now(), lat, lng, school, latAdj, method: resolvedMethod,
          }));
        } catch { /* ignore */ }
        return timings;
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
