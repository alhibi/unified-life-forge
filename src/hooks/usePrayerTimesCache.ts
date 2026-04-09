// Shared prayer times cache to avoid duplicate API calls
// Both PrayerTimes and CurrentTimeSunnah use this

interface CachedPrayer {
  timings: Record<string, string>;
  timestamp: number;
  lat: number;
  lng: number;
  school: number;
  latAdj: number;
}

const CACHE_KEY = 'prayer_times_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 min

let inFlightPromise: Promise<Record<string, string> | null> | null = null;
let inFlightKey = '';

function getCacheKey(lat: number, lng: number, school: number, latAdj: number): string {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}_${school}_${latAdj}`;
}

function loadCache(key: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedPrayer = JSON.parse(raw);
    const cachedKey = getCacheKey(cached.lat, cached.lng, cached.school, cached.latAdj);
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
  latAdj: number
): Promise<Record<string, string> | null> {
  const key = getCacheKey(lat, lng, school, latAdj);

  // Check cache first
  const cached = loadCache(key);
  if (cached) return cached;

  // Deduplicate in-flight requests
  if (inFlightPromise && inFlightKey === key) {
    return inFlightPromise;
  }

  const doFetch = async (): Promise<Record<string, string> | null> => {
    try {
      const today = new Date();
      const dd = today.getDate();
      const mm = today.getMonth() + 1;
      const yyyy = today.getFullYear();
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=4&school=${school}&latitudeAdjustmentMethod=${latAdj}`
      );
      const data = await res.json();
      if (data.code === 200) {
        const timings = data.data.timings as Record<string, string>;
        // Save to cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            timings, timestamp: Date.now(), lat, lng, school, latAdj
          }));
        } catch { /* ignore */ }
        return timings;
      }
    } catch { /* silent */ }
    return null;
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
