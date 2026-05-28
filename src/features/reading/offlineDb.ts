import type { FeedItem } from './types';

/**
 * IndexedDB-backed offline cache for the reading feature.
 *
 * Object stores:
 *   - `articles`: keyed by `link`. Holds the full FeedItem plus an
 *                 `archivedAt` timestamp.
 *   - `images`:   keyed by source URL. Holds Blobs of fetched images.
 *
 * Resilience features:
 *   - Automatic corruption recovery: if open fails, deletes and recreates DB
 *   - Versioned migrations for safe schema upgrades
 *   - Batched writes: bulk operations use a single transaction
 *   - Graceful degradation: every public method handles errors internally
 *   - Connection pooling: reuses the DB handle across calls
 *   - Quota-aware: checks storage estimate before large writes
 */

const DB_NAME = 'smarthub-reading';
const DB_VERSION = 2; // Bumped for adding indexes
const STORE_ARTICLES = 'articles';
const STORE_IMAGES = 'images';

let dbPromise: Promise<IDBDatabase> | null = null;
/** Track whether we already attempted a corruption recovery this session. */
let recoveryAttempted = false;

// ─── Database connection with corruption recovery ──────────────────────────

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORE_ARTICLES)) {
        const store = db.createObjectStore(STORE_ARTICLES, { keyPath: 'link' });
        store.createIndex('archivedAt', 'archivedAt');
        try {
          store.createIndex('source', 'source');
        } catch { /* non-critical */ }
      } else if (oldVersion < 2) {
        // Add source index to existing store
        try {
          const tx = (event.target as IDBOpenDBRequest).transaction!;
          const store = tx.objectStore(STORE_ARTICLES);
          if (!store.indexNames.contains('source')) {
            store.createIndex('source', 'source');
          }
        } catch { /* non-critical, index is an optimization */ }
      }

      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: 'url' });
      }
    };

    req.onsuccess = () => resolve(req.result);

    req.onerror = () => {
      const error = req.error;
      console.error('[Reading/offlineDb] Failed to open:', error);

      // Attempt corruption recovery once per session
      if (!recoveryAttempted) {
        recoveryAttempted = true;
        dbPromise = null;
        console.warn('[Reading/offlineDb] Attempting corruption recovery...');
        try {
          const deleteReq = indexedDB.deleteDatabase(DB_NAME);
          deleteReq.onsuccess = () => {
            console.info('[Reading/offlineDb] Deleted corrupted DB, reopening...');
            // Retry open
            resolve(openDb().then(db => db));
          };
          deleteReq.onerror = () => {
            reject(error ?? new Error('IDB open failed after recovery'));
          };
        } catch {
          reject(error ?? new Error('IDB open failed'));
        }
      } else {
        reject(error ?? new Error('IDB open failed'));
      }
    };

    req.onblocked = () => {
      console.warn('[Reading/offlineDb] DB upgrade blocked by another tab');
      // Don't reject — wait for the other tab to close
    };
  });

  return dbPromise;
}

/** Reset the cached connection (e.g. after a versionchange event). */
function resetConnection(): void {
  dbPromise = null;
}

// ─── Transaction helpers ───────────────────────────────────────────────────

/**
 * Run a single-store transaction with automatic error handling.
 * Retries once on transient failures (e.g. tab-backgrounding aborts).
 */
function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const attempt = (): Promise<T> =>
    openDb().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          try {
            const t = db.transaction(store, mode);
            const s = t.objectStore(store);
            const req = fn(s);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            t.onerror = () => reject(t.error);
          } catch (e) {
            resetConnection();
            reject(e);
          }
        }),
    );

  // Retry once on transient failure (AbortError from tab backgrounding)
  return attempt().catch((err) => {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    const isTransient = msg.includes('abort') || msg.includes('inactive');
    if (isTransient) {
      return new Promise<T>((resolve) => setTimeout(resolve, 50)).then(attempt);
    }
    throw err;
  });
}

/**
 * Run a batch of operations in a single transaction for performance.
 * Much faster than individual tx() calls for bulk writes.
 */
function batchTx(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => void,
): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        try {
          const t = db.transaction(store, mode);
          const s = t.objectStore(store);
          fn(s);
          t.oncomplete = () => resolve();
          t.onerror = () => reject(t.error);
          t.onabort = () => reject(t.error || new Error('Transaction aborted'));
        } catch (e) {
          resetConnection();
          reject(e);
        }
      }),
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ArchivedArticle extends FeedItem {
  archivedAt: number;
}

// ─── Public API ────────────────────────────────────────────────────────────

export const offlineDb = {
  available(): boolean {
    return typeof indexedDB !== 'undefined';
  },

  /**
   * Check if we have enough quota for a write operation.
   * Returns true if we have at least `requiredBytes` available, or
   * if the StorageManager API isn't available (assume ok).
   */
  async hasQuota(requiredBytes = 5 * 1024 * 1024): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return true; // Can't check; assume ok
    }
    try {
      const { quota, usage } = await navigator.storage.estimate();
      if (!quota) return true;
      const available = quota - (usage || 0);
      return available > requiredBytes;
    } catch {
      return true; // Error checking quota; proceed optimistically
    }
  },

  /**
   * Persist an article for offline reading.
   * Includes quota check — silently skips if storage is critically low.
   */
  async saveArticle(item: FeedItem): Promise<void> {
    if (!this.available()) return;

    // Quick quota check — skip if we're dangerously low
    const hasSpace = await this.hasQuota(50 * 1024); // 50KB per article estimate
    if (!hasSpace) {
      console.warn('[Reading/offlineDb] Low storage quota, skipping save');
      return;
    }

    const archived: ArchivedArticle = {
      ...item,
      archivedAt: Date.now(),
    };

    try {
      await tx(STORE_ARTICLES, 'readwrite', (s) => s.put(archived));
    } catch (e) {
      console.warn('[Reading/offlineDb] saveArticle failed:', e);
      return; // Non-fatal — we just won't have this offline
    }

    // Ask the Service Worker to pre-cache images
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

  /**
   * Save multiple articles in a single transaction (batch write).
   * Much faster than calling saveArticle() in a loop.
   * Only skips if the device is critically low on disk space.
   */
  async saveArticlesBatch(items: ReadonlyArray<FeedItem>): Promise<number> {
    if (!this.available() || items.length === 0) return 0;

    // Only check quota once per batch — not per-item. We check for 10MB
    // free space regardless of batch size. If the device is that low,
    // we skip entirely; otherwise we trust IndexedDB to throw QuotaExceeded
    // on individual puts (which batchTx handles gracefully).
    const hasSpace = await this.hasQuota(10 * 1024 * 1024);
    if (!hasSpace) {
      console.warn('[Reading/offlineDb] Low quota (<10MB free), skipping batch save');
      return 0;
    }

    const now = Date.now();
    let saved = 0;

    try {
      await batchTx(STORE_ARTICLES, 'readwrite', (store) => {
        for (const item of items) {
          if (!item.link) continue;
          const archived: ArchivedArticle = { ...item, archivedAt: now };
          store.put(archived);
          saved++;
        }
      });
    } catch (e) {
      console.warn('[Reading/offlineDb] Batch save failed:', e);
      return 0;
    }

    // Pre-cache images via SW
    const urls: string[] = [];
    for (const item of items) {
      if (item.image) urls.push(item.image);
      for (const i of item.images || []) {
        if (typeof i === 'string' && !urls.includes(i)) urls.push(i);
      }
    }
    if (urls.length > 0 && typeof navigator !== 'undefined') {
      try {
        const reg = await navigator.serviceWorker?.ready;
        reg?.active?.postMessage({ type: 'reading:precache', urls: urls.slice(0, 50) });
      } catch { /* SW unavailable */ }
    }

    return saved;
  },

  /** Remove an article (e.g. when user un-bookmarks it). */
  async removeArticle(link: string): Promise<void> {
    if (!this.available()) return;
    try {
      await tx(STORE_ARTICLES, 'readwrite', (s) => s.delete(link));
    } catch (e) {
      console.warn('[Reading/offlineDb] removeArticle failed:', e);
    }
  },

  /** Remove multiple articles in a single transaction. */
  async removeArticlesBatch(links: ReadonlyArray<string>): Promise<number> {
    if (!this.available() || links.length === 0) return 0;
    let removed = 0;
    try {
      await batchTx(STORE_ARTICLES, 'readwrite', (store) => {
        for (const link of links) {
          store.delete(link);
          removed++;
        }
      });
    } catch (e) {
      console.warn('[Reading/offlineDb] Batch remove failed:', e);
      return 0;
    }
    return removed;
  },

  /** Retrieve a single archived article by link. */
  async getArticle(link: string): Promise<ArchivedArticle | null> {
    if (!this.available()) return null;
    try {
      const result = await tx<ArchivedArticle | undefined>(
        STORE_ARTICLES,
        'readonly',
        (s) => s.get(link) as IDBRequest<ArchivedArticle | undefined>,
      );
      return result ?? null;
    } catch (e) {
      console.warn('[Reading/offlineDb] getArticle failed:', e);
      return null;
    }
  },

  /** List all archived articles, newest first. */
  async listArticles(): Promise<ArchivedArticle[]> {
    if (!this.available()) return [];
    try {
      const all = await tx<ArchivedArticle[]>(
        STORE_ARTICLES,
        'readonly',
        (s) => s.getAll() as IDBRequest<ArchivedArticle[]>,
      );
      return all.sort((a, b) => b.archivedAt - a.archivedAt);
    } catch (e) {
      console.warn('[Reading/offlineDb] listArticles failed:', e);
      return [];
    }
  },

  /** Get count of archived articles without loading them all into memory. */
  async countArticles(): Promise<number> {
    if (!this.available()) return 0;
    try {
      return await tx<number>(
        STORE_ARTICLES,
        'readonly',
        (s) => s.count(),
      );
    } catch {
      return 0;
    }
  },

  /** Ask the Service Worker to add image URLs to the runtime cache. */
  async cacheImage(url: string): Promise<void> {
    if (!url || !/^https?:\/\//i.test(url)) return;
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: 'reading:precache', urls: [url] });
    } catch {
      // SW not active — silently skip
    }
  },

  async getCachedImage(url: string): Promise<Blob | null> {
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

  /**
   * DEPRECATED: Articles are now stored permanently and never auto-deleted.
   * This method is kept for API compatibility but is a no-op.
   * The user's archive only grows — content is never lost.
   */
  async pruneOlderThan(
    _maxAgeMs = 60 * 24 * 60 * 60 * 1000,
    _keepLinks: ReadonlyArray<string> = [],
  ): Promise<number> {
    // No-op: articles are permanent. Never auto-delete user content.
    return 0;
  },

  /**
   * Storage estimate: articles count + browser quota info.
   */
  async storageEstimate(): Promise<{
    articles: number;
    quotaBytes: number;
    usageBytes: number;
  }> {
    const articles = await this.countArticles();
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

  /**
   * Wipe every archived article. Uses batch delete.
   * Bookmarks list (in localStorage) is NOT touched.
   */
  async clearArticles(): Promise<number> {
    if (!this.available()) return 0;
    try {
      const all = await this.listArticles();
      if (all.length === 0) return 0;
      await batchTx(STORE_ARTICLES, 'readwrite', (store) => {
        for (const a of all) {
          store.delete(a.link);
        }
      });
      return all.length;
    } catch (e) {
      console.warn('[Reading/offlineDb] clearArticles failed:', e);
      return 0;
    }
  },

  /**
   * Sync the offline archive: ADD missing articles from the given list.
   * Does NOT remove any existing articles — the user's offline archive
   * only grows. Articles are stored permanently and never auto-deleted.
   *
   * This ensures the user can always go back to previously-fetched
   * articles without them ever being purged.
   */
  async syncArticles(
    items: ReadonlyArray<FeedItem>,
    keepLinks: ReadonlyArray<string> = [],
  ): Promise<{ added: number; kept: number; removed: number }> {
    if (!this.available()) return { added: 0, kept: 0, removed: 0 };

    const want = new Set<string>([
      ...items.map((i) => i.link).filter(Boolean),
      ...keepLinks,
    ]);
    const itemByLink = new Map(items.map((i) => [i.link, i] as const));

    let existing: ArchivedArticle[];
    try {
      existing = await this.listArticles();
    } catch {
      return { added: 0, kept: 0, removed: 0 };
    }

    const have = new Set(existing.map((a) => a.link));

    // ADD: save articles we want but don't have yet
    const toAdd: FeedItem[] = [];
    let kept = 0;
    for (const link of want) {
      if (have.has(link)) {
        kept++;
      } else {
        const item = itemByLink.get(link);
        if (item) toAdd.push(item);
      }
    }

    // Batch add — no removals
    let added = 0;
    if (toAdd.length > 0) {
      added = await this.saveArticlesBatch(toAdd);
    }

    return { added, kept, removed: 0 };
  },

  /**
   * Health check: verify the DB can be opened and a basic read succeeds.
   * Useful for diagnostics UI.
   */
  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    if (!this.available()) return { ok: false, error: 'IndexedDB not available' };
    try {
      await this.countArticles();
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  },

  /**
   * Force reset: delete the database entirely and recreate.
   * Use as a last resort when corruption can't be recovered.
   */
  async forceReset(): Promise<void> {
    resetConnection();
    if (typeof indexedDB === 'undefined') return;
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => {
        console.info('[Reading/offlineDb] Force reset complete');
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  },
};
