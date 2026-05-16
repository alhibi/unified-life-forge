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

  /** Persist an article's metadata (full body + first image url) for
   *  offline reading. The actual image bytes live in the Service
   *  Worker's Cache Storage, which can fetch cross-origin images
   *  without CORS (no-cors mode produces opaque responses that the
   *  Cache API can store and replay byte-for-byte). */
  async saveArticle(item: FeedItem): Promise<void> {
    if (!this.available()) return;
    const archived: ArchivedArticle = {
      ...item,
      archivedAt: Date.now(),
    };
    await tx(STORE_ARTICLES, 'readwrite', (s) => s.put(archived));
    // Ask the Service Worker to pre-cache the article's images so
    // they're available when we go offline. We pass a list (hero +
    // inline images parsed from the body) and let the SW handle the
    // network details — that side runs in a context where opaque
    // responses are fully storable.
    const urls: string[] = [];
    if (item.image) urls.push(item.image);
    for (const i of item.images || []) {
      if (typeof i === 'string' && !urls.includes(i)) urls.push(i);
    }
    if (urls.length > 0 && typeof navigator !== 'undefined') {
      try {
        const reg = await navigator.serviceWorker?.ready;
        reg?.active?.postMessage({ type: 'reading:precache', urls });
      } catch { /* no SW = no offline images, fine */ }
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

  /** Ask the Service Worker to add this image URL to the runtime cache.
   *  We hand off to the SW because it can do `fetch(..., { mode: 'no-cors' })`
   *  and store the resulting *opaque* response in Cache Storage — which
   *  IndexedDB can't, since reading the response body of an opaque
   *  Response throws. The SW then intercepts subsequent image fetches
   *  for this URL and returns the cached copy when offline. */
  async cacheImage(url: string): Promise<void> {
    if (!url || !/^https?:\/\//i.test(url)) return;
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: 'reading:precache', urls: [url] });
    } catch {
      // SW not active (e.g. iframe) — silently skip.
    }
  },

  async getCachedImage(url: string): Promise<Blob | null> {
    // Kept for backward compatibility but no longer authoritative.
    // The SW serves images from Cache Storage on the fly during fetch
    // events, so callers shouldn't need to read this directly.
    if (!this.available()) return null;
    try {
      const row = await tx<{ url: string; blob: Blob } | undefined>(
        STORE_IMAGES,
        'readonly',
        (s) => s.get(url) as IDBRequest<{ url: string; blob: Blob } | undefined>,
      );
      return row?.blob ?? null;
    } catch {
      return null;
    }
  },

  /** Clear stale data (older than `maxAgeMs`). Default: 60 days.
   *  Articles whose `link` is in `keepLinks` are preserved regardless
   *  of age — the caller passes the user's bookmarks here so explicit
   *  saves are never silently garbage-collected. */
  async pruneOlderThan(
    maxAgeMs = 60 * 24 * 60 * 60 * 1000,
    keepLinks: ReadonlyArray<string> = [],
  ): Promise<number> {
    if (!this.available()) return 0;
    const cutoff = Date.now() - maxAgeMs;
    const all = await this.listArticles();
    const keep = new Set(keepLinks);
    const toDelete = all
      .filter((a) => a.archivedAt < cutoff && !keep.has(a.link))
      .map((a) => a.link);
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
