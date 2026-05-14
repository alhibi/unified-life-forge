/* SmartHub Service Worker — Web Native 2026.
 *
 * Strategies (in order of specificity):
 *   1. Navigations (HTML)            → network-first, fall back to cache, fall back to /index.html.
 *   2. Versioned build assets (/assets/*) → cache-first (immutable, hashed names).
 *   3. Same-origin static (icons, manifest, fonts) → stale-while-revalidate.
 *   4. Supabase Storage signed URLs → bypass cache (signed, time-bound).
 *   5. Realtime/WebSocket           → never intercept.
 *   6. Cross-origin                 → bypass (let the browser handle CORS).
 *
 * The SW is intentionally small. We don't ship Workbox: extra ~20 KB doesn't
 * pay off for the routes we serve. Vite's `precacheManifest` is also skipped
 * because asset URLs are hashed and cache-first on `/assets/*` is enough.
 */

/* global self, caches, clients */

const VERSION = 'v1';
const RUNTIME = `smarthub-runtime-${VERSION}`;
const ASSETS = `smarthub-assets-${VERSION}`;
const NAVIGATIONS = `smarthub-pages-${VERSION}`;

const OFFLINE_FALLBACK = '/index.html';

// On install, prime the page-shell cache so the app loads offline.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(NAVIGATIONS)
      .then((cache) =>
        cache.addAll([
          '/',
          '/index.html',
          '/manifest.json',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png',
          '/icons/apple-touch-icon.png',
        ]).catch(() => {
          /* tolerate missing icons in dev */
        }),
      ),
  );
  self.skipWaiting();
});

// Clean up old caches on activate.
self.addEventListener('activate', (event) => {
  const valid = new Set([RUNTIME, ASSETS, NAVIGATIONS]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !valid.has(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isAsset(url) {
  return url.origin === self.location.origin && /\/assets\//.test(url.pathname);
}

function isNavigation(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' &&
      request.headers.get('accept')?.includes('text/html'));
}

function isStaticSameOrigin(url) {
  if (url.origin !== self.location.origin) return false;
  return /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|gif|ico|json)$/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin (Supabase, jsDelivr emoji CDN, fonts.googleapis...).
  // Letting the browser handle these avoids CORS/credential mode footguns.
  if (url.origin !== self.location.origin) return;

  // Skip Supabase realtime / signed-URL endpoints if ever hosted same-origin.
  if (/\/realtime\//.test(url.pathname) || /\/object\/sign\//.test(url.pathname)) return;

  // 1. Navigations → network-first w/ offline fallback.
  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(NAVIGATIONS).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached || caches.match(OFFLINE_FALLBACK),
          ),
        ),
    );
    return;
  }

  // 2. Hashed build assets → cache-first.
  if (isAsset(url)) {
    event.respondWith(
      caches.open(ASSETS).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone()).catch(() => {});
            return response;
          });
        }),
      ),
    );
    return;
  }

  // 3. Same-origin static (icons, fonts, json) → stale-while-revalidate.
  if (isStaticSameOrigin(url)) {
    event.respondWith(
      caches.open(RUNTIME).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone()).catch(() => {});
              return response;
            })
            .catch(() => cached);
          return cached || network;
        }),
      ),
    );
  }
});

// Allow the page to ask the SW to take over immediately (used after an update).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
