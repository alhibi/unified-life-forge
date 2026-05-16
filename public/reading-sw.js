/* eslint-disable */
/**
 * Service Worker for the reading feature's offline mode.
 *
 * Caching layers:
 *  - `reading-runtime-v2` (Cache Storage): same-origin app shell —
 *    HTML, JS, CSS, fonts. We cache /reading itself plus its hashed
 *    /assets/* bundles so the app boots offline.
 *  - `reading-images-v2` (Cache Storage): cross-origin article images.
 *    These are fetched with `mode: 'no-cors'` (which yields *opaque*
 *    responses) — Cache Storage can store and replay opaque responses
 *    byte-for-byte, while IndexedDB cannot (its body can't be read).
 *
 * We deliberately drop the old IndexedDB-backed image cache: every
 *   feed except the rare CORS-friendly one would have failed there.
 *
 * Lifecycle:
 *  - install: skipWaiting so a deployed update takes effect immediately.
 *  - activate: claim clients + delete obsolete cache versions.
 *  - fetch:
 *      - `image` destination: cache-first, network fallback, then a
 *        1×1 transparent PNG so layouts don't collapse.
 *      - same-origin GETs (HTML/JS/CSS/fonts): stale-while-revalidate.
 *  - message: `reading:precache` adds a list of image URLs to the
 *    image cache eagerly so they're available before the user goes
 *    offline. `reading:skipWaiting` is kept for manual update flows.
 */

const RUNTIME_CACHE = 'reading-runtime-v2';
const IMAGE_CACHE = 'reading-images-v2';
const KEEP_CACHES = new Set([RUNTIME_CACHE, IMAGE_CACHE]);

self.addEventListener('install', () => {
  // Activate this SW the first time it's seen, instead of waiting for
  // every other tab to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop any caches from previous SW versions — including the v1
      // runtime cache and the old IDB-backed image store key.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !KEEP_CACHES.has(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// 1×1 transparent PNG (67 bytes). Used as the absolute last fallback
// when an image fetch fails offline AND we have nothing cached.
const TRANSPARENT_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

function transparentPngResponse() {
  return new Response(TRANSPARENT_PNG, {
    headers: { 'Content-Type': 'image/png' },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // ─── Image requests ───────────────────────────────────────────────
  // Use the destination heuristic plus an extension fallback so an
  // <img> with a missing destination still hits the right path.
  const isImage = request.destination === 'image' ||
    /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url.pathname);
  if (isImage && /^https?:$/.test(url.protocol)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cached = await cache.match(request, { ignoreVary: true });
        if (cached) return cached;
        try {
          // no-cors so cross-origin images (which rarely send CORS
          // headers) can still produce a cacheable opaque response.
          const fresh = await fetch(request, { mode: 'no-cors' });
          // Don't cache obvious failures.
          if (fresh && (fresh.ok || fresh.type === 'opaque')) {
            cache.put(request, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch {
          return transparentPngResponse();
        }
      })(),
    );
    return;
  }

  // ─── Same-origin app shell ────────────────────────────────────────
  // Cache the entry HTML + the hashed Vite bundle assets so the page
  // boots cold even when offline.
  if (
    url.origin === self.location.origin &&
    (url.pathname === '/reading' ||
      url.pathname.startsWith('/reading/') ||
      url.pathname.startsWith('/assets/') ||
      /\.(js|css|woff2?|ttf|otf)$/i.test(url.pathname))
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok && res.type === 'basic') {
              cache.put(request, res.clone()).catch(() => {});
            }
            return res;
          })
          .catch(() => null);

        if (cached) {
          // stale-while-revalidate: serve the cache, refresh in bg.
          network.catch(() => {});
          return cached;
        }
        const fresh = await network;
        if (fresh) return fresh;

        // Final navigation fallback: any cached HTML for /reading.
        if (request.mode === 'navigate') {
          const fallback = (await cache.match('/reading')) ||
            (await cache.match('/'));
          if (fallback) return fallback;
        }
        return new Response('Offline', { status: 503 });
      })(),
    );
  }
  // Everything else falls through to default network behavior.
});

self.addEventListener('message', async (event) => {
  const data = event.data;
  if (data === 'reading:skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (data && data.type === 'reading:precache' && Array.isArray(data.urls)) {
    // Pre-warm the image cache for a list of URLs (called by the page
    // when an article is bookmarked, so the images are available
    // before the user actually goes offline).
    const cache = await caches.open(IMAGE_CACHE);
    await Promise.all(
      data.urls
        .filter((u) => typeof u === 'string' && /^https?:\/\//.test(u))
        .map(async (u) => {
          try {
            const existing = await cache.match(u, { ignoreVary: true });
            if (existing) return;
            const res = await fetch(u, { mode: 'no-cors' });
            if (res && (res.ok || res.type === 'opaque')) {
              await cache.put(u, res.clone());
            }
          } catch {
            // Skip — best effort.
          }
        }),
    );
  }
});
