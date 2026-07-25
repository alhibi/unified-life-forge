// L3 cache — localStorage emergency fallback.
// 48-hour TTL. Compressed only by virtue of JSON.stringify (browsers vary
// in compression-stream support; we keep this simple and reliable).

interface Wrapper<T> { value: T; expiresAt: number; }

export class LocalStorageCache<T> {
  constructor(private namespace: string, private ttlMs = 48 * 3_600_000) {}

  private k(key: string): string { return `weather:${this.namespace}:${key}`; }

  get(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.k(key));
      if (!raw) return null;
      const wrapped = JSON.parse(raw) as Wrapper<T>;
      if (wrapped.expiresAt < Date.now()) {
        localStorage.removeItem(this.k(key));
        return null;
      }
      return wrapped.value;
    } catch { return null; }
  }

  set(key: string, value: T, ttlMs = this.ttlMs): void {
    try {
      localStorage.setItem(this.k(key), JSON.stringify({ value, expiresAt: Date.now() + ttlMs }));
    } catch {
      // Quota exceeded — try purging our own namespace and retry once.
      this.prune();
      try { localStorage.setItem(this.k(key), JSON.stringify({ value, expiresAt: Date.now() + ttlMs })); }
      catch { /* give up silently — L1/L2 still work */ }
    }
  }

  delete(key: string): void {
    try { localStorage.removeItem(this.k(key)); } catch { /* noop */ }
  }

  prune(): void {
    try {
      const prefix = `weather:${this.namespace}:`;
      const toDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) toDelete.push(k);
      }
      toDelete.forEach(k => localStorage.removeItem(k));
    } catch { /* noop */ }
  }
}
