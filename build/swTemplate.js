 
/**
 * App-shell service worker.
 *
 * Generated at build time by build/appShellServiceWorker.ts, which substitutes
 * the version and precache placeholders below with the real values for this
 * bundle. Do not register this file directly — register the emitted /sw.js.
 *
 * Strategy, per request class:
 *
 *   navigations      network-first, falling back to the precached shell.
 *                    An SPA has exactly one HTML document, so a cached shell
 *                    plus cached chunks is genuine offline capability.
 *   /assets/*        cache-first. Vite fingerprints these filenames, so a
 *                    given URL can never change content — the safest possible
 *                    cache-first target. Lazy route chunks land here as the
 *                    user visits routes, so previously-seen screens keep
 *                    working offline.
 *   icons, manifest  stale-while-revalidate.
 *   Google Fonts     cache-first with background refresh (this replaces the
 *                    old dedicated fonts-sw.js).
 *   everything else  untouched — Supabase, weather APIs and RSS proxies must
 *                    never be served from a stale cache.
 *
 * The worker does NOT call skipWaiting() on its own. Swapping assets under a
 * running page makes already-loaded code request chunks that the new build
 * renamed, which surfaces as a blank screen. Instead it waits, the page shows
 * an update prompt, and only then does it take over.
 */

const VERSION = '__SW_VERSION__';
const SHELL_CACHE = `app-shell-${VERSION}`;
const ASSET_CACHE = `app-assets-${VERSION}`;
const FONT_CACHE = 'app-fonts-v2';

/** Entry HTML + the JS/CSS needed for first paint. */
const PRECACHE = __SW_PRECACHE__;

const FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
const SHELL_URL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // `reload` bypasses the HTTP cache so a deploy cannot precache the
      // previous build's index.html.
      await Promise.allSettled(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' }))),
      );
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE, FONT_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => (n.startsWith('app-shell-') || n.startsWith('app-assets-')) && !keep.has(n))
          .map((n) => caches.delete(n)),
      );
      // Retire the worker this one replaces.
      await Promise.all(
        names.filter((n) => n.startsWith('app-fonts-') && n !== FONT_CACHE).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

/** Cache-first: serve the cached copy, only hit the network on a miss. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

/** Serve from cache immediately, refresh in the background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true });
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const response = await network;
  if (response) return response;
  throw new Error('offline and not cached');
}

/** Navigations: fresh HTML when online, the precached shell when not. */
async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(SHELL_URL, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const shell = await cache.match(SHELL_URL);
    if (shell) return shell;
    return new Response(
      '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">' +
        '<title>بدون اتصال</title>' +
        '<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#f1f0f4;color:#1c1827">' +
        '<div style="text-align:center;padding:24px"><p style="font-size:17px;font-weight:600">لا يوجد اتصال بالإنترنت</p>' +
        '<p style="font-size:14px;opacity:.7">افتح التطبيق مرة واحدة أثناء الاتصال ليعمل بدون شبكة بعدها.</p></div>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (FONT_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // Only same-origin traffic beyond this point. Everything cross-origin that
  // is not a font (Supabase, weather providers, RSS proxies, tile servers) is
  // deliberately left to the browser.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // `/data/` holds large static datasets that are fetched at runtime instead
  // of bundled — currently the Diwan seed corpus. They are not fingerprinted,
  // so cache-first would pin a stale copy forever; stale-while-revalidate
  // serves instantly and refreshes in the background. Without this rule the
  // Diwan demo/offline fallback would fail offline, which is precisely the
  // situation it exists to cover.
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/data/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});
