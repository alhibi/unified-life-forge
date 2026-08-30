// ============================================================================
// CacheResilience — five independent cache layers with stale-while-revalidate
// semantics, replacing the old single-bundle cache that conflated every TTL.
//
// LAYER SHAPE
//   Each of {current, hourly, daily, radar, airquality} owns its own:
//     • L1 in-memory ring (MemoryCache)
//     • L2 IndexedDB store (IndexedDBCache)
//     • L3 localStorage emergency fallback (LocalStorageCache)
//   and exposes a single `read(key)` returning a `LayerHit` that tells the
//   caller exactly how fresh the data is. The engine can then decide
//   whether to revalidate in the background.
//
// STALE-WHILE-REVALIDATE
//   A layer's hit can be one of:
//     • `fresh`      — within TTL, no revalidation needed.
//     • `stale`      — past TTL but inside the grace window (TTL × grace).
//                       Caller should revalidate, but use the value NOW.
//     • `expired`    — outside the grace window. Return null unless the
//                       caller opted into `acceptEmergency`, in which case
//                       the value is returned flagged as emergency data.
//   This is the difference between "the model said thunderstorms" and "we
//   have nothing" — the former is always the better display.
//
// WRITE
//   Writes always populate all three tiers (L1, L2, L3). IDB failures are
//   silently swallowed because resilience is the whole point: we never want
//   a flaky cache write to take down the pipeline.
// ============================================================================

import { IndexedDBCache, type Store } from '../cache/IndexedDBCache';
import { LocalStorageCache } from '../cache/LocalStorageCache';
import { MemoryCache } from '../cache/MemoryCache';

/** Per-layer TTLs. Carefully matched to the natural freshness of each domain. */
const TTLS: Record<LayerName, number> = {
  current:    15 * 60_000,    // 15 minutes
  hourly:     30 * 60_000,    // 30 minutes
  daily:       6 * 60 * 60_000, // 6 hours
  radar:      10 * 60_000,    // 10 minutes
  airquality: 20 * 60_000,    // 20 minutes
};

/** Grace window = TTL × this. Stale data inside the window is still usable. */
const GRACE_MULTIPLIER = 3;

/** Hard cap on distinct L1 entries per layer — bounds memory growth. */
const L1_CAP = 12;

export const LAYER_NAMES = ['current', 'hourly', 'daily', 'radar', 'airquality'] as const;
export type LayerName = typeof LAYER_NAMES[number];

/**
 * Freshness of a cache read. `fresh` is the only state that triggers no
 * background revalidation; `stale` triggers one but is used immediately.
 */
export type Freshness = 'fresh' | 'stale' | 'expired' | 'miss';

/** What `read()` returned. `value` is `null` only on `miss`. */
export interface LayerHit<T> {
  value: T;
  /** When the entry was originally written (epoch ms). */
  writtenAt: number;
  /** When the entry will finally fall out of any grace window (epoch ms). */
  expiresHardAt: number;
  freshness: Freshness;
  /** Which physical tier served the read: 1 = in-memory, 2 = IDB, 3 = LS. */
  tier: 1 | 2 | 3;
}

interface Layer<T> {
  name: LayerName;
  l1: MemoryCache<LayerEntry<T>>;
  l2: IndexedDBCache<LayerEntry<T>>;
  l3: LocalStorageCache<LayerEntry<T>>;
}

interface LayerEntry<T> {
  value: T;
  writtenAt: number;
  expiresSoftAt: number;     // writtenAt + TTL
  expiresHardAt: number;     // writtenAt + TTL × grace
}

class CacheLayer<T> implements Layer<T> {
  readonly l1: MemoryCache<LayerEntry<T>>;
  readonly l2: IndexedDBCache<LayerEntry<T>>;
  readonly l3: LocalStorageCache<LayerEntry<T>>;

  constructor(
    readonly name: LayerName,
    ttlMs: number,
  ) {
    this.l1 = new MemoryCache<LayerEntry<T>>(L1_CAP);
    this.l2 = new IndexedDBCache<LayerEntry<T>>(name as Store, ttlMs);
    this.l3 = new LocalStorageCache<LayerEntry<T>>(name, ttlMs * GRACE_MULTIPLIER);
  }

  private ttlMs(): number {
    return TTLS[this.name];
  }

  /** Read with freshness classification. */
  async read(key: string): Promise<LayerHit<T> | null> {
    const ttl = this.ttlMs();
    const now = Date.now();

    // L1
    const e1 = this.l1.get(key);
    if (e1) return this.classify(e1, now, 1);

    // L2 (IDB)
    try {
      const e2 = await this.l2.get(key);
      if (e2) {
        // Warm L1 for next call.
        this.l1.set(key, e2, ttl);
        return this.classify(e2, now, 2);
      }
    } catch {
      /* IDB unavailable — fall through to L3 */
    }

    // L3 (localStorage)
    const e3 = this.l3.get(key);
    if (e3) return this.classify(e3, now, 3);

    return null;
  }

  private classify(entry: LayerEntry<T>, now: number, tier: 1 | 2 | 3): LayerHit<T> {
    let freshness: Freshness;
    if (now < entry.expiresSoftAt) freshness = 'fresh';
    else if (now < entry.expiresHardAt) freshness = 'stale';
    else freshness = 'expired';
    return {
      value: entry.value,
      writtenAt: entry.writtenAt,
      expiresHardAt: entry.expiresHardAt,
      freshness,
      tier,
    };
  }

  /** Write to all three tiers. Errors are swallowed per-tier. */
  async write(key: string, value: T, ttlOverrideMs?: number): Promise<void> {
    const ttl = ttlOverrideMs ?? this.ttlMs();
    const now = Date.now();
    const entry: LayerEntry<T> = {
      value,
      writtenAt: now,
      expiresSoftAt: now + ttl,
      expiresHardAt: now + ttl * GRACE_MULTIPLIER,
    };
    this.l1.set(key, entry, ttl * GRACE_MULTIPLIER);
    try { await this.l2.set(key, entry); } catch { /* noop */ }
    try { this.l3.set(key, entry); } catch { /* noop */ }
  }

  /** Wipe everything for this layer. Test seam. */
  async clear(): Promise<void> {
    this.l1.clear();
    this.l3.prune();
    try { await this.l2.clear(); } catch { /* noop — IDB may be unavailable */ }
  }

  /** Public accessor for tests that need to inspect or seed L1 directly. */
  rawL1(): MemoryCache<LayerEntry<T>> {
    return this.l1;
  }
}

/** The singleton. One instance per layer, lazily built. */
class CacheResilience {
  private current    = new CacheLayer<unknown>('current',    TTLS.current);
  private hourly     = new CacheLayer<unknown>('hourly',     TTLS.hourly);
  private daily      = new CacheLayer<unknown>('daily',      TTLS.daily);
  private radar      = new CacheLayer<unknown>('radar',      TTLS.radar);
  private airquality = new CacheLayer<unknown>('airquality', TTLS.airquality);

  layer<T>(name: LayerName): CacheLayer<T> {
    switch (name) {
      case 'current':    return this.current as unknown as CacheLayer<T>;
      case 'hourly':     return this.hourly as unknown as CacheLayer<T>;
      case 'daily':      return this.daily as unknown as CacheLayer<T>;
      case 'radar':      return this.radar as unknown as CacheLayer<T>;
      case 'airquality': return this.airquality as unknown as CacheLayer<T>;
    }
  }

  /** Test-only — wipe every layer. */
  async clearAll(): Promise<void> {
    await Promise.all(LAYER_NAMES.map((n) => this.layer(n).clear()));
  }
}

export const cacheResilience = new CacheResilience();

/** Helper: pick the right read option for the caller's needs. */
export interface ReadOptions {
  /** When true, return emergency (past grace window) data with `freshness='expired'`. */
  acceptEmergency?: boolean;
}

/**
 * Convenience reader. Returns the layer hit unchanged so the caller can
 * decide based on freshness — but filters out expired data unless explicitly
 * accepted.
 */
export async function readLayer<T>(
  name: LayerName,
  key: string,
  opts: ReadOptions = {},
): Promise<LayerHit<T> | null> {
  const hit = await cacheResilience.layer<T>(name).read(key);
  if (!hit) return null;
  if (hit.freshness === 'expired' && !opts.acceptEmergency) return null;
  return hit;
}

export const __cacheResilienceInternals = { TTLS, GRACE_MULTIPLIER, L1_CAP };