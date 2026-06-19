// L1 cache — in-memory LRU keyed by arbitrary strings.
// Lives in module scope so the same Map is reused across remounts.

interface Entry<T> { value: T; expiresAt: number; lastUsed: number; }

export class MemoryCache<T> {
  private store = new Map<string, Entry<T>>();
  constructor(private maxEntries = 20) {}

  get(key: string): T | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expiresAt < Date.now()) { this.store.delete(key); return null; }
    e.lastUsed = Date.now();
    return e.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) this.evictLRU();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs, lastUsed: Date.now() });
  }

  delete(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }

  private evictLRU() {
    let oldestKey: string | null = null;
    let oldestUsed = Infinity;
    for (const [k, e] of this.store) {
      if (e.lastUsed < oldestUsed) { oldestUsed = e.lastUsed; oldestKey = k; }
    }
    if (oldestKey) this.store.delete(oldestKey);
  }
}
