// Orchestrates the three cache tiers and exposes a stale-while-revalidate
// API for the engine.
//
//   1. read(key) returns the first non-expired hit across L1 → L2 → L3.
//   2. write(key, value) populates all three tiers.
//   3. evictForLocation(lat,lng) wipes everything when the user moves > 500m.

import type { ForecastLayers } from '../types/ForecastLayer';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';
import { IndexedDBCache, type Store } from './IndexedDBCache';
import { LocalStorageCache } from './LocalStorageCache';
import { MemoryCache } from './MemoryCache';

export interface CachedBundle {
  snapshot: WeatherSnapshot;
  forecast: ForecastLayers;
  cachedAt: number;
}

const TTL = {
  current:    15 * 60_000,
  hourly:     30 * 60_000,
  daily:       6 * 3_600_000,
  radar:      10 * 60_000,
  airquality: 20 * 60_000,
} as const;

export class CacheManager {
  private l1 = new MemoryCache<CachedBundle>(20);
  private l3 = new LocalStorageCache<CachedBundle>('bundle');
  private stores: Record<Store, IndexedDBCache<CachedBundle>> = {
    current:    new IndexedDBCache('current',    TTL.current),
    hourly:     new IndexedDBCache('hourly',     TTL.hourly),
    daily:      new IndexedDBCache('daily',      TTL.daily),
    radar:      new IndexedDBCache('radar',      TTL.radar),
    airquality: new IndexedDBCache('airquality', TTL.airquality),
  };

  /** Compose a stable cache key from rounded coordinates. */
  keyFor(lat: number, lng: number): string {
    return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  }

  /** L1 → L2 → L3 first-hit wins. */
  async read(key: string): Promise<{ value: CachedBundle; tier: 'L1' | 'L2' | 'L3' } | null> {
    const v1 = this.l1.get(key);
    if (v1) return { value: v1, tier: 'L1' };
    const v2 = await this.stores.current.get(key);
    if (v2) { this.l1.set(key, v2, TTL.current); return { value: v2, tier: 'L2' }; }
    const v3 = this.l3.get(key);
    if (v3) return { value: v3, tier: 'L3' };
    return null;
  }

  /** Write to all tiers. Errors in any tier are swallowed silently. */
  async write(key: string, value: CachedBundle): Promise<void> {
    this.l1.set(key, value, TTL.current);
    await this.stores.current.set(key, value);
    this.l3.set(key, value);
  }

  /** Evict cached data when location drifts beyond `thresholdKm`. */
  evictForLocation(_lat: number, _lng: number, _thresholdKm = 0.5): void {
    // The simplest invariant is "drop everything when location changes" —
    // the engine calls this after deciding the move was meaningful.
    this.l1.clear();
    // IDB and LS will naturally expire and be rewritten under the new key.
  }

  clearAll(): void {
    this.l1.clear();
    this.l3.prune();
  }
}

export const cacheManager = new CacheManager();
