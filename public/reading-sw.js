/* eslint-disable */
/**
 * Service Worker for the reading feature's offline mode.
 *
 * Strategy:
 *  - Install: pre-create caches.
 *  - Fetch:
 *      * Same-origin requests for /reading and its assets → cache-first
 *        with network fallback (so the page renders offline).
 *      * Cross-origin image requests for hosts in image_cache → check
 *        IndexedDB blob first, then network, store the response.
 *  - Activate: clean up stale cache versions.
 *
 * The IDB store name and DB name MUST match what offlineDb.ts uses.
 */

const CACHE_VERSION = 'reading-v1';
const RUNTIME_CACHE = 'reading-runtime-v1';
const DB_NAME = 'smarthub-reading';
const DB_VERSION = 1;
const IMAGE_STORE = 'images';

self.addEventListener('install', (event) => {
  // Skip waiting so a deployed update takes effect on next page load.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // We don't define onupgradeneeded — the page-side already created
    // the schema. If the SW runs before the page, we'll just miss this
    // request and re-try the next time.
  });
}

async function getCachedImageBlob(url) {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(IMAGE_STORE, 'readonly');
      const store = tx.objectStore(IMAGE_STORE);
      const req = store.get(url);
      req.onsuccess = () => resolve(req.result?.blob ?? null);
      req.onerror = () => resolve(null);
      tx.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Image requests: try IDB first, then network. We don't store
  // network responses back into IDB here because the page-side has
  // its own logic to decide which images deserve persistence.
  if (request.destination === 'image' && /^https?:$/.test(url.protocol)) {
    event.respondWith(
      (async () => {
        const blob = await getCachedImageBlob(url.toString());
        if (blob) {
          return new Response(blob, {
            headers: { 'Content-Type': blob.type || 'image/jpeg' },
          });
        }
        try {
          return await fetch(request);
        } catch {
          // 1×1 transparent PNG so layouts don't collapse offline.
          const fallback = new Uint8Array([
            0x89,
            0x50,
            0x4e,
            0x47,
            0x0d,
            0x0a,
            0x1a,
            0x0a,
            0x00,
            0x00,
            0x00,
            0x0d,
            0x49,
            0x48,
            0x44,
            0x52,
            0x00,
            0x00,
            0x00,
            0x01,
            0x00,
            0x00,
            0x00,
            0x01,
            0x08,
            0x06,
            0x00,
            0x00,
            0x00,
            0x1f,
            0x15,
            0xc4,
            0x89,
            0x00,
            0x00,
            0x00,
            0x0a,
            0x49,
            0x44,
            0x41,
            0x54,
            0x78,
            0x9c,
            0x63,
            0x00,
            0x01,
            0x00,
            0x00,
            0x05,
            0x00,
            0x01,
            0x0d,
            0x0a,
            0x2d,
            0xb4,
            0x00,
            0x00,
            0x00,
            0x00,
            0x49,
            0x45,
            0x4e,
            0x44,
            0xae,
            0x42,
            0x60,
            0x82,
          ]);
          return new Response(fallback, {
            headers: { 'Content-Type': 'image/png' },
          });
        }
      })(),
    );
    return;
  }

  // Same-origin GETs (HTML, JS, CSS, fonts) → stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            // Only cache successful, basic responses
            if (res.ok && res.type === 'basic') {
              cache.put(request, res.clone()).catch(() => {});
            }
            return res;
          })
          .catch(() => null);

        if (cached) {
          // Return cache immediately, refresh in the background.
          network.catch(() => {});
          return cached;
        }
        const fresh = await network;
        if (fresh) return fresh;
        // Final fallback for navigations: any cached HTML we have.
        if (request.mode === 'navigate') {
          const fallback = await cache.match('/reading');
          if (fallback) return fallback;
        }
        return new Response('Offline', { status: 503 });
      })(),
    );
  }
  // Everything else (third-party scripts etc.) → default network behavior
});

self.addEventListener('message', (event) => {
  if (event.data === 'reading:skipWaiting') self.skipWaiting();
});
