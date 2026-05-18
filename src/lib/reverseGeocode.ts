// Cached reverse-geocoding via OpenStreetMap Nominatim.
// Stores results per (lat,lng,lang) for 7 days in localStorage and
// deduplicates concurrent requests so the homepage can't fire two
// identical lookups while components mount in parallel.

export interface ReverseGeo {
  city: string;
  street: string;
  address: string;
  raw?: Record<string, unknown>;
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const KEY_PREFIX = 'revgeo:';
const inFlight = new Map<string, Promise<ReverseGeo | null>>();

function cacheKey(lat: number, lng: number, lang: string): string {
  return `${KEY_PREFIX}${lat.toFixed(3)}_${lng.toFixed(3)}_${lang}`;
}

function readCache(key: string): ReverseGeo | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: ReverseGeo; t: number };
    if (Date.now() - parsed.t > TTL_MS) return null;
    return parsed.v;
  } catch { return null; }
}

function writeCache(key: string, value: ReverseGeo): void {
  try {
    localStorage.setItem(key, JSON.stringify({ v: value, t: Date.now() }));
  } catch { /* quota — ignore */ }
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  lang: string = 'en',
): Promise<ReverseGeo | null> {
  const key = cacheKey(lat, lng, lang);
  const cached = readCache(key);
  if (cached) return cached;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<ReverseGeo | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${lang}`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      const addr = data.address || {};
      const value: ReverseGeo = {
        city: addr.city || addr.town || addr.village || addr.suburb || addr.county || '',
        street: addr.road || addr.pedestrian || addr.neighbourhood || '',
        address: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        raw: addr,
      };
      writeCache(key, value);
      return value;
    } catch {
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}