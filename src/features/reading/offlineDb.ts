import type { FeedItem } from './types';

/**
 * IndexedDB-backed offline cache for the reading feature.
 *
 * Two object stores:
 *   - `articles`: keyed by `link`. Holds the full FeedItem plus an
 *                 `archivedAt` timestamp. Used for "saved for later".
 *   - `images`:   keyed by source URL. Holds Blobs of fetched images.
 *                 The Service Worker can later answer fetch events
 *                 from this store when the network is offline.
 *
 * The wrapper API is a tiny Promise façade over the IDB request
 * pattern so callers don't have to manage transactions themselves.
 */

const DB_NAME = 'smarthub-reading';
const DB_VERSION = 1;
const STORE_ARTICLES = 'articles';
const STORE_IMAGES = 'images';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ARTICLES)) {
        const store = db.createObjectStore(STORE_ARTICLES, { keyPath: 'link' });
        store.createIndex('archivedAt', 'archivedAt');
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: 'url' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
  });
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        Promise.resolve(fn(s)).then(
          (req) => {
            if (req && typeof (req as IDBRequest).onsuccess !== 'undefined') {
              const r = req as IDBRequest<T>;
              r.onsuccess = () => resolve(r.result);
              r.onerror = () => reject(r.error);
            } else {
              resolve(req as T);
            }
          },
          reject,
        );
        t.onerror = () => reject(t.error);
      }),
  );
}

export interface ArchivedArticle extends FeedItem {
  archivedAt: number;
}

export const offlineDb = {
  available(): boolean {
    return typeof indexedDB !== 'undefined';
  },

  /** Persist an article (and best-effort prefetch its primary image). */
  async saveArticle(item: FeedItem): Promise<void> {
    if (!this.available()) return;
    const archived: ArchivedArticle = {
      ...item,
      archivedAt: Date.now(),
    };
    await tx(STORE_ARTICLES, 'readwrite', (s) => s.put(archived));
    // Best-effort image cache: don't fail the save if it errors.
    if (item.image) {
      void this.cacheImage(item.image).catch(() => undefined);
    }
  },

  /** Remove an article (e.g. when user un-bookmarks it). */
  async removeArticle(link: string): Promise<void> {
    if (!this.available()) return;
    await tx(STORE_ARTICLES, 'readwrite', (s) => s.delete(link));
  },

  /** Retrieve a single archived article by link. */
  async getArticle(link: string): Promise<ArchivedArticle | null> {
    if (!this.available()) return null;
    return (await tx<ArchivedArticle | undefined>(
      STORE_ARTICLES,
      'readonly',
      (s) => s.get(link) as IDBRequest<ArchivedArticle | undefined>,
    )) ?? null;
  },

  /** List all archived articles, newest first. */
  async listArticles(): Promise<ArchivedArticle[]> {
    if (!this.available()) return [];
    const all = await tx<ArchivedArticle[]>(
      STORE_ARTICLES,
      'readonly',
      (s) => s.getAll() as IDBRequest<ArchivedArticle[]>,
    );
    return all.sort((a, b) => b.archivedAt - a.archivedAt);
  },

  /** Cache a remote image as a Blob so the SW can serve it offline. */
  async cacheImage(url: string): Promise<void> {
    if (!this.available()) return;
    if (!url || !/^https?:\/\//i.test(url)) return;
    // Skip if we already have it
    const existing = await tx<{ url: string } | undefined>(
      STORE_IMAGES,
      'readonly',
      (s) => s.get(url) as IDBRequest<{ url: string } | undefined>,
    );
    if (existing) return;
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) return;
      const blob = await res.blob();
      // Don't cache anything bigger than 4 MB
      if (blob.size > 4 * 1024 * 1024) return;
      await tx(STORE_IMAGES, 'readwrite', (s) => s.put({ url, blob }));
    } catch {
      // Network or CORS failure — silently skip.
    }
  },

  async getCachedImage(url: string): Promise<Blob | null> {
    if (!this.available()) return null;
    const row = await tx<{ url: string; blob: Blob } | undefined>(
      STORE_IMAGES,
      'readonly',
      (s) => s.get(url) as IDBRequest<{ url: string; blob: Blob } | undefined>,
    );
    return row?.blob ?? null;
  },

  /** Clear stale data (older than `maxAgeMs`). Default: 60 days. */
  async pruneOlderThan(maxAgeMs = 60 * 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.available()) return 0;
    const cutoff = Date.now() - maxAgeMs;
    const all = await this.listArticles();
    const toDelete = all.filter((a) => a.archivedAt < cutoff).map((a) => a.link);
    for (const link of toDelete) {
      await tx(STORE_ARTICLES, 'readwrite', (s) => s.delete(link));
    }
    return toDelete.length;
  },

  /** Approximate bytes used by archived articles + cached images. */
  async storageEstimate(): Promise<{
    articles: number;
    quotaBytes: number;
    usageBytes: number;
  }> {
    const articles = (await this.listArticles()).length;
    let quotaBytes = 0;
    let usageBytes = 0;
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      try {
        const est = await navigator.storage.estimate();
        quotaBytes = est.quota ?? 0;
        usageBytes = est.usage ?? 0;
      } catch { /* ignore */ }
    }
    return { articles, quotaBytes, usageBytes };
  },
};
