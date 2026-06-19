// L2 cache — IndexedDB. Tolerant of environments where IDB is unavailable
// (SSR, private mode, locked-down browsers): all operations resolve to
// null / no-op silently so the rest of the pipeline keeps working.

interface Wrapper<T> { key: string; value: T; expiresAt: number; }

const DB_NAME = 'weather-engine';
const DB_VERSION = 1;
const STORES = ['current', 'hourly', 'daily', 'radar', 'airquality'] as const;
export type Store = typeof STORES[number];

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }
  dbPromise = new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

export class IndexedDBCache<T> {
  constructor(private store: Store, private defaultTTLMs: number) {}

  async get(key: string): Promise<T | null> {
    const db = await openDB();
    if (!db) return null;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(this.store, 'readonly');
        const req = tx.objectStore(this.store).get(key);
        req.onsuccess = () => {
          const w = req.result as Wrapper<T> | undefined;
          if (!w) return resolve(null);
          if (w.expiresAt < Date.now()) return resolve(null);
          resolve(w.value);
        };
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }

  async set(key: string, value: T, ttlMs = this.defaultTTLMs): Promise<void> {
    const db = await openDB();
    if (!db) return;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(this.store, 'readwrite');
        const w: Wrapper<T> = { key, value, expiresAt: Date.now() + ttlMs };
        tx.objectStore(this.store).put(w);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch { resolve(); }
    });
  }

  async delete(key: string): Promise<void> {
    const db = await openDB();
    if (!db) return;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(this.store, 'readwrite');
        tx.objectStore(this.store).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch { resolve(); }
    });
  }
}
