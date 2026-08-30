// ============================================================================
// CityGeocoder — multi-source city search service.
//
// Sources, in priority order:
//   1. LOCAL index   — built from the user's history + favourites. Fuzzy
//                      match against these runs first (instant).
//   2. Open-Meteo    — primary network. Free, no key, Arabic support.
//   3. Nominatim     — fallback for ambiguous queries. Free, but rate
//                      limited (1 req/sec) — we cache aggressively.
//
// DESIGN POINTS
//   • One single `search()` entry point that fans out to all sources.
//   • Each source is independent; failures in one don't sink the others.
//   • Results are merged, scored, deduped by (lat, lng) rounded pair.
//   • An in-memory cache (TTL 5 min) keeps the UI snappy when the user
//     re-types the same query.
//   • The controller exposes `abort()` so React effects can cancel stale
//     fetches when the query changes.
//
// WHY ARABIC NORMALISATION
//   "بغداد" and "بَغْداد" and "بغداد" all should match the same city.
//   We strip tashkil + unify alef/yaa before any match.
// ============================================================================

import { fuzzyScore,normalizeArabic } from '../engine/FuzzyMatcher';
import type { CityCandidate, CitySource, NearbyRequest } from '../types/CitySearch';

interface OpenMeteoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
  population?: number;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResult {
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: NominatimAddress;
  extratags?: { population?: string };
}

const CACHE_TTL_MS = 5 * 60_000;
const NOMINATIM_LANG = 'ar,en';

interface CacheEntry {
  expires: number;
  candidates: CityCandidate[];
}

class CityGeocoder {
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<CityCandidate[]>>();
  private abortControllers = new Map<string, AbortController>();

  /**
   * Search for cities matching the query. Returns a unified list sorted
   * by match score. Aborts any in-flight search for the same query key.
   */
  async search(
    query: string,
    options: {
      /** Local candidates (history + favourites) used for fuzzy pre-match. */
      local?: CityCandidate[];
      /** User location — used for "nearby" sort and distance chips. */
      userLocation?: { lat: number; lng: number } | null;
      /** Aborts previous fetches when called multiple times in quick succession. */
      signal?: AbortSignal;
    } = {},
  ): Promise<CityCandidate[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const cacheKey = `${trimmed.toLowerCase()}|${options.userLocation?.lat.toFixed(1) ?? ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.candidates;
    }

    // Cancel any earlier fetch for the same query — we want only the
    // most recent typing to settle.
    const previous = this.abortControllers.get(cacheKey);
    previous?.abort();
    const ac = new AbortController();
    this.abortControllers.set(cacheKey, ac);

    const work = (async () => {
      const localMatches = this.matchLocal(trimmed, options.local ?? [], options.userLocation ?? null);
      const networkMatches = await this.searchNetwork(trimmed, ac.signal);
      const merged = this.mergeAndRank(
        trimmed,
        [...localMatches, ...networkMatches],
        options.userLocation ?? null,
      );
      this.cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, candidates: merged });
      return merged;
    })();

    this.inFlight.set(cacheKey, work);
    try {
      const result = await work;
      return result;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return [];
      throw e;
    } finally {
      this.inFlight.delete(cacheKey);
      this.abortControllers.delete(cacheKey);
    }
  }

  /** Fuzzy match against the local index (history + favourites). */
  matchLocal(
    query: string,
    local: CityCandidate[],
    userLocation: { lat: number; lng: number } | null,
  ): CityCandidate[] {
    const normalised = normalizeArabic(query);
    const out: CityCandidate[] = [];
    for (const city of local) {
      const nameAr = normalizeArabic(city.nameAr ?? city.name);
      const score = fuzzyScore(normalised, nameAr);
      if (score === 0) continue;
      out.push({
        ...city,
        matchScore: score,
        source: 'local',
        distanceKm: userLocation
          ? haversine(userLocation.lat, userLocation.lng, city.latitude, city.longitude)
          : city.distanceKm,
      });
    }
    return out;
  }

  /** Fan out to Open-Meteo + Nominatim. */
  private async searchNetwork(query: string, signal: AbortSignal): Promise<CityCandidate[]> {
    const results = await Promise.allSettled([
      this.searchOpenMeteo(query, signal),
      this.searchNominatim(query, signal),
    ]);
    const out: CityCandidate[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') out.push(...r.value);
    }
    return out;
  }

  private async searchOpenMeteo(query: string, signal: AbortSignal): Promise<CityCandidate[]> {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=ar&format=json`;
      const res = await fetch(url, { signal });
      if (!res.ok) return [];
      const data = (await res.json()) as { results?: OpenMeteoResult[] };
      return (data.results ?? []).map((r, i) => ({
        id: String(r.id),
        name: r.name,
        nameAr: r.name,
        country: r.country ?? '',
        countryCode: r.country_code,
        admin1: r.admin1,
        latitude: r.latitude,
        longitude: r.longitude,
        elevation: r.elevation,
        population: r.population,
        timezone: r.timezone,
        source: 'open-meteo' as const,
        // Open-Meteo returns sorted by relevance; convert to a score.
        matchScore: Math.max(0.4, 1 - i * 0.08),
        distanceKm: null,
      }));
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      return [];
    }
  }

  private async searchNominatim(query: string, signal: AbortSignal): Promise<CityCandidate[]> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&extratags=1&limit=8&accept-language=${NOMINATIM_LANG}`;
      const res = await fetch(url, {
        signal,
        headers: { 'User-Agent': 'unified-life-forge/1.0 (citysearch)' },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as NominatimResult[];
      return data.map((r, i) => {
        const name = r.address?.city ?? r.address?.town ?? r.address?.village ?? r.address?.municipality ?? r.name ?? r.display_name.split(',')[0];
        const population = r.extratags?.population ? parseInt(r.extratags.population, 10) : undefined;
        return {
          id: `osm-${r.osm_id}`,
          name,
          nameAr: name,
          country: r.address?.country ?? '',
          countryCode: r.address?.country_code?.toUpperCase(),
          admin1: r.address?.state ?? r.address?.region,
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
          elevation: undefined,
          population,
          timezone: undefined,
          source: 'nominatim' as const,
          matchScore: Math.max(0.3, 0.95 - i * 0.07),
          distanceKm: null,
        };
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      return [];
    }
  }

  /** Merge, dedupe, and rank. Dedupe by rounded (lat, lng). */
  private mergeAndRank(
    query: string,
    candidates: CityCandidate[],
    userLocation: { lat: number; lng: number } | null,
  ): CityCandidate[] {
    const normalised = normalizeArabic(query);
    const seen = new Map<string, CityCandidate>();

    for (const c of candidates) {
      const key = `${c.latitude.toFixed(2)},${c.longitude.toFixed(2)}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, c);
        continue;
      }
      // Keep the higher-scored, then the higher-populated, then the earlier.
      if (
        c.matchScore > existing.matchScore ||
        (c.matchScore === existing.matchScore && (c.population ?? 0) > (existing.population ?? 0))
      ) {
        seen.set(key, c);
      }
    }

    const merged = Array.from(seen.values()).map((c) => {
      const nameScore = fuzzyScore(normalised, normalizeArabic(c.nameAr ?? c.name));
      const combined = Math.min(1, c.matchScore * 0.6 + nameScore * 0.4);
      const distance = userLocation
        ? haversine(userLocation.lat, userLocation.lng, c.latitude, c.longitude)
        : c.distanceKm;
      return { ...c, matchScore: combined, distanceKm: distance };
    });

    merged.sort((a, b) => {
      // Prefer higher match score, then closer (if location known), then more populous.
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      const da = a.distanceKm ?? Infinity;
      const db = b.distanceKm ?? Infinity;
      if (da !== db) return da - db;
      return (b.population ?? 0) - (a.population ?? 0);
    });

    return merged.slice(0, 10);
  }

  /**
   * Build a "nearby" list from the user's favourites + history, ranked
   * by distance. Used as a suggestion when the search input is empty.
   */
  suggestNearby(req: NearbyRequest, local: CityCandidate[]): CityCandidate[] {
    const enriched = local.map((c) => ({
      ...c,
      distanceKm: haversine(req.lat, req.lng, c.latitude, c.longitude),
      matchScore: 0,
      source: c.source as CitySource,
    }));
    return enriched
      .filter((c) => c.distanceKm !== null && c.distanceKm <= req.radiusKm)
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .slice(0, req.limit ?? 5);
  }

  /** Clear all caches — used by tests + on logout. */
  clearCache(): void {
    this.cache.clear();
    this.inFlight.clear();
    this.abortControllers.forEach((ac) => ac.abort());
    this.abortControllers.clear();
  }
}

/** Haversine distance in km — exported for re-use. */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const cityGeocoder = new CityGeocoder();