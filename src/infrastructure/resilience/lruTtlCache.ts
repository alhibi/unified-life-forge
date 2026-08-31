/**
 * LRU + TTL cache. The single source of truth for any cache the app needs
 * to read on a hot path (RSS feeds, Dexscreener responses, GDELT signals).
 *
 * - Hard size cap (entries, not bytes) — protects against pathological floods.
 * - Hard TTL per entry — never returns truly stale data by accident.
 * - Stale-while-revalidate: `get` returns the live value if fresh, the stale
 *   value tagged `stale: true` if expired but still present, or `undefined`
 *   if missing. `set` schedules a background refresh if `swr` is supplied.
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  insertedAt: number;
}

export interface CacheGetResult<T> {
  hit: boolean;
  value: T | undefined;
  stale: boolean;
}

export interface LruTtlOptions<V> {
  capacity: number;
  ttlMs: number;
  staleWhileRevalidate?: (key: string) => Promise<V> | V;
}

export class LruTtlCache<V> {
  private readonly capacity: number;
  private readonly ttlMs: number;
  private readonly swr?: (key: string) => Promise<V> | V;
  private store = new Map<string, CacheEntry<V>>();

  constructor(opts: LruTtlOptions<V>) {
    this.capacity = Math.max(1, opts.capacity);
    this.ttlMs = Math.max(1, opts.ttlMs);
    this.swr = opts.staleWhileRevalidate;
  }

  get(key: string): CacheGetResult<V> {
    const entry = this.store.get(key);
    if (!entry) return { hit: false, value: undefined, stale: false };
    const fresh = entry.expiresAt > Date.now();
    if (!fresh && this.swr) {
      void this.refresh(key);
    }
    return { hit: true, value: entry.value, stale: !fresh };
  }

  set(key: string, value: V): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
      insertedAt: Date.now(),
    });
    while (this.store.size > this.capacity) {
      const first = this.store.keys().next().value;
      if (first === undefined) break;
      this.store.delete(first);
    }
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  private async refresh(key: string): Promise<void> {
    if (!this.swr) return;
    try {
      const value = await this.swr(key);
      this.set(key, value);
    } catch {
      /* swallow — background refresh failures must not crash consumers */
    }
  }
}