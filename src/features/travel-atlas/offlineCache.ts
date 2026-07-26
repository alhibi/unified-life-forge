import Dexie, { type Table } from 'dexie';

import type { CountryStamp, TravelCountry, TravelPlace, TripWithStops } from './types';

/**
 * Offline mirror of the atlas.
 *
 * Travel is exactly when the network is worst: a foreign SIM, a plane, a valley
 * with no signal. The atlas therefore reads from Dexie first and revalidates
 * against Supabase in the background, so opening a saved place on a mountain
 * road shows the notes and photos that were there yesterday.
 *
 * v2 replaces the per-country place store with a single mirror of the user's
 * whole atlas, matching the one-query read in `api.ts`.
 */

interface CachedCountry extends TravelCountry {
  cachedAt: number;
}

interface CachedPlace extends TravelPlace {
  cachedAt: number;
}

interface CachedTrip extends TripWithStops {
  cachedAt: number;
}

interface CacheMetadata {
  key: string;
  updatedAt: number;
}

interface CachedStamp extends CountryStamp {
  cachedAt: number;
}

class TravelAtlasCache extends Dexie {
  countries!: Table<CachedCountry, string>;
  places!: Table<CachedPlace, string>;
  trips!: Table<CachedTrip, string>;
  stamps!: Table<CachedStamp, string>;
  metadata!: Table<CacheMetadata, string>;

  constructor() {
    super('TravelAtlasCache');
    this.version(1).stores({
      countries: 'id, isoCode, cachedAt',
      places: 'id, countryId, cachedAt',
      metadata: 'key',
    });
    // v2 adds trips and drops the per-country places metadata keys, which no
    // longer have a writer. Dexie replays this upgrade on existing clients.
    this.version(2)
      .stores({
        countries: 'id, isoCode, cachedAt',
        places: 'id, countryId, visitStatus, cachedAt',
        trips: 'id, cachedAt',
        metadata: 'key',
      })
      .upgrade(async (tx) => {
        await tx
          .table<CacheMetadata, string>('metadata')
          .filter((entry) => entry.key.startsWith('places:'))
          .delete();
      });
    // v3 adds country stamps — the one part of the record that exists even when
    // no individual place has been saved, so it has to survive offline too.
    this.version(3).stores({
      countries: 'id, isoCode, cachedAt',
      places: 'id, countryId, visitStatus, cachedAt',
      trips: 'id, cachedAt',
      stamps: 'isoCode, status, cachedAt',
      metadata: 'key',
    });
  }
}

const db = new TravelAtlasCache();

/** Long enough to survive a flight, short enough to not feel stale on land. */
const CACHE_TTL = 24 * 60 * 60 * 1000;

type CacheKey = 'countries' | 'places' | 'trips' | 'stamps';

function stripCacheField<T extends { cachedAt?: number }>(entry: T): T {
  const copy = { ...entry };
  delete copy.cachedAt;
  return copy;
}

async function markFresh(key: CacheKey): Promise<void> {
  await db.metadata.put({ key, updatedAt: Date.now() });
}

export async function isCacheStale(key: CacheKey): Promise<boolean> {
  try {
    const meta = await db.metadata.get(key);
    if (!meta) return true;
    return Date.now() - meta.updatedAt > CACHE_TTL;
  } catch {
    return true;
  }
}

export async function invalidateCache(key: CacheKey): Promise<void> {
  try {
    await db.metadata.delete(key);
  } catch (error) {
    console.warn('[TravelAtlasCache] invalidate failed', error);
  }
}

// ── Countries ───────────────────────────────────────────────────────────────

export async function getCachedCountries(): Promise<TravelCountry[] | null> {
  try {
    const cached = await db.countries.toArray();
    if (cached.length === 0) return null;
    return cached.map(stripCacheField);
  } catch (error) {
    console.warn('[TravelAtlasCache] read countries failed', error);
    return null;
  }
}

export async function cacheCountries(countries: TravelCountry[]): Promise<void> {
  try {
    const now = Date.now();
    await db.transaction('rw', db.countries, db.metadata, async () => {
      await db.countries.clear();
      await db.countries.bulkPut(countries.map((country) => ({ ...country, cachedAt: now })));
      await markFresh('countries');
    });
  } catch (error) {
    console.warn('[TravelAtlasCache] write countries failed', error);
  }
}

// ── Places ──────────────────────────────────────────────────────────────────

export async function getCachedPlaces(): Promise<TravelPlace[] | null> {
  try {
    const cached = await db.places.toArray();
    if (cached.length === 0) return null;
    return cached.map(stripCacheField);
  } catch (error) {
    console.warn('[TravelAtlasCache] read places failed', error);
    return null;
  }
}

export async function cachePlaces(places: TravelPlace[]): Promise<void> {
  try {
    const now = Date.now();
    await db.transaction('rw', db.places, db.metadata, async () => {
      await db.places.clear();
      await db.places.bulkPut(places.map((place) => ({ ...place, cachedAt: now })));
      await markFresh('places');
    });
  } catch (error) {
    console.warn('[TravelAtlasCache] write places failed', error);
  }
}

// ── Trips ───────────────────────────────────────────────────────────────────

export async function getCachedTrips(): Promise<TripWithStops[] | null> {
  try {
    const cached = await db.trips.toArray();
    if (cached.length === 0) return null;
    return cached.map(stripCacheField);
  } catch (error) {
    console.warn('[TravelAtlasCache] read trips failed', error);
    return null;
  }
}

export async function cacheTrips(trips: TripWithStops[]): Promise<void> {
  try {
    const now = Date.now();
    await db.transaction('rw', db.trips, db.metadata, async () => {
      await db.trips.clear();
      await db.trips.bulkPut(trips.map((trip) => ({ ...trip, cachedAt: now })));
      await markFresh('trips');
    });
  } catch (error) {
    console.warn('[TravelAtlasCache] write trips failed', error);
  }
}

// ── Country stamps ──────────────────────────────────────────────────────────

export async function getCachedStamps(): Promise<CountryStamp[] | null> {
  try {
    const cached = await db.stamps.toArray();
    if (cached.length === 0) return null;
    return cached.map(stripCacheField);
  } catch (error) {
    console.warn('[TravelAtlasCache] read stamps failed', error);
    return null;
  }
}

export async function cacheStamps(stamps: CountryStamp[]): Promise<void> {
  try {
    const now = Date.now();
    await db.transaction('rw', db.stamps, db.metadata, async () => {
      await db.stamps.clear();
      await db.stamps.bulkPut(stamps.map((stamp) => ({ ...stamp, cachedAt: now })));
      await markFresh('stamps');
    });
  } catch (error) {
    console.warn('[TravelAtlasCache] write stamps failed', error);
  }
}

/** Called on sign-out — one account's atlas must not leak into the next. */
export async function clearAtlasCache(): Promise<void> {
  try {
    await db.transaction(
      'rw',
      db.countries,
      db.places,
      db.trips,
      db.stamps,
      db.metadata,
      async () => {
        await db.countries.clear();
        await db.places.clear();
        await db.trips.clear();
        await db.stamps.clear();
        await db.metadata.clear();
      },
    );
  } catch (error) {
    console.warn('[TravelAtlasCache] clear failed', error);
  }
}
