import Dexie, { type Table } from 'dexie';

import type { TravelCountry, TravelPlace } from './types';

// ── Dexie Schema ────────────────────────────────────────────────────────────
// Stores countries and places locally for offline access. The cache follows a
// stale-while-revalidate pattern: read from Dexie immediately, then revalidate
// against Supabase in the background.

interface CachedCountry extends TravelCountry {
  cachedAt: number;
}

interface CachedPlace extends TravelPlace {
  cachedAt: number;
}

interface CacheMetadata {
  key: string;
  updatedAt: number;
}

class TravelAtlasCache extends Dexie {
  countries!: Table<CachedCountry, string>;
  places!: Table<CachedPlace, string>;
  metadata!: Table<CacheMetadata, string>;

  constructor() {
    super('TravelAtlasCache');
    this.version(1).stores({
      countries: 'id, isoCode, cachedAt',
      places: 'id, countryId, cachedAt',
      metadata: 'key',
    });
  }
}

const db = new TravelAtlasCache();

// ── Cache TTL (24 hours) ────────────────────────────────────────────────────
const CACHE_TTL = 24 * 60 * 60 * 1000;

function isStale(cachedAt: number): boolean {
  return Date.now() - cachedAt > CACHE_TTL;
}

// ── Countries Cache ─────────────────────────────────────────────────────────

export async function getCachedCountries(): Promise<TravelCountry[] | null> {
  try {
    const cached = await db.countries.toArray();
    if (cached.length === 0) return null;

    // Return data even if stale (stale-while-revalidate)
    return cached.map(stripCacheFields);
  } catch (error) {
    console.warn('[TravelAtlasCache] Failed to read countries:', error);
    return null;
  }
}

export async function cacheCountries(countries: TravelCountry[]): Promise<void> {
  try {
    const now = Date.now();
    const cached: CachedCountry[] = countries.map((c) => ({ ...c, cachedAt: now }));

    await db.transaction('rw', db.countries, db.metadata, async () => {
      // Clear old data and insert fresh
      await db.countries.clear();
      await db.countries.bulkPut(cached);
      await db.metadata.put({ key: 'countries', updatedAt: now });
    });
  } catch (error) {
    console.warn('[TravelAtlasCache] Failed to cache countries:', error);
  }
}

export async function isCountriesCacheStale(): Promise<boolean> {
  try {
    const meta = await db.metadata.get('countries');
    if (!meta) return true;
    return isStale(meta.updatedAt);
  } catch {
    return true;
  }
}

// ── Places Cache (per country) ──────────────────────────────────────────────

export async function getCachedPlaces(countryId: string): Promise<TravelPlace[] | null> {
  try {
    const cached = await db.places.where('countryId').equals(countryId).toArray();
    if (cached.length === 0) return null;

    return cached.map(stripCacheFields);
  } catch (error) {
    console.warn('[TravelAtlasCache] Failed to read places:', error);
    return null;
  }
}

export async function cachePlaces(countryId: string, places: TravelPlace[]): Promise<void> {
  try {
    const now = Date.now();
    const cached: CachedPlace[] = places.map((p) => ({ ...p, cachedAt: now }));

    await db.transaction('rw', db.places, db.metadata, async () => {
      // Remove old places for this country before inserting
      await db.places.where('countryId').equals(countryId).delete();
      await db.places.bulkPut(cached);
      await db.metadata.put({ key: `places:${countryId}`, updatedAt: now });
    });
  } catch (error) {
    console.warn('[TravelAtlasCache] Failed to cache places:', error);
  }
}

export async function isPlacesCacheStale(countryId: string): Promise<boolean> {
  try {
    const meta = await db.metadata.get(`places:${countryId}`);
    if (!meta) return true;
    return isStale(meta.updatedAt);
  } catch {
    return true;
  }
}

// ── Single Country Cache ────────────────────────────────────────────────────

export async function getCachedCountry(countryId: string): Promise<TravelCountry | null> {
  try {
    const cached = await db.countries.get(countryId);
    if (!cached) return null;
    return stripCacheFields(cached);
  } catch (error) {
    console.warn('[TravelAtlasCache] Failed to read country:', error);
    return null;
  }
}

// ── Invalidation ────────────────────────────────────────────────────────────

export async function invalidatePlacesCache(countryId: string): Promise<void> {
  try {
    await db.metadata.delete(`places:${countryId}`);
  } catch (error) {
    console.warn('[TravelAtlasCache] Failed to invalidate places cache:', error);
  }
}

export async function invalidateCountriesCache(): Promise<void> {
  try {
    await db.metadata.delete('countries');
  } catch (error) {
    console.warn('[TravelAtlasCache] Failed to invalidate countries cache:', error);
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    await db.transaction('rw', db.countries, db.places, db.metadata, async () => {
      await db.countries.clear();
      await db.places.clear();
      await db.metadata.clear();
    });
  } catch (error) {
    console.warn('[TravelAtlasCache] Failed to clear cache:', error);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function stripCacheFields<T extends { cachedAt?: number }>(obj: T): Omit<T, 'cachedAt'> {
  const { cachedAt, ...rest } = obj;
  return rest as Omit<T, 'cachedAt'>;
}
