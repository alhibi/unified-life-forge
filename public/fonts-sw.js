/* eslint-disable */
/**
 * Root-scoped Service Worker dedicated to Google Fonts assets.
 *
 * Everything served from `fonts.googleapis.com` (the stylesheet) and
 * `fonts.gstatic.com` (the actual woff2 files) is fetched cache-first
 * with stale-while-revalidate: the first visit pays the network cost,
 * every subsequent navigation (or PWA cold-boot) reads from disk in
 * a few milliseconds and a network refresh happens in the background.
 *
 * Scoped to '/' so it applies on every page, but the fetch handler is
 * a strict allow-list — non-font requests fall through to the browser
 * default and never touch this SW's caches. This avoids interfering
 * with the existing `reading-sw.js`, which is scoped to `/reading`.
 */

const FONTS_CACHE = 'app-fonts-v1';
const ALLOWED_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('app-fonts-') && k !== FONTS_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (!ALLOWED_HOSTS.has(url.hostname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(FONTS_CACHE);
    const cached = await cache.match(req, { ignoreVary: true });

    const network = fetch(req)
      .then((res) => {
        // Both basic (same-origin, never the case here) and opaque
        // (no-cors / no-CORS-header) responses are cacheable; reject
        // only clear failures.
        if (res && (res.ok || res.type === 'opaque')) {
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      })
      .catch(() => null);

    if (cached) {
      // stale-while-revalidate.
      network.catch(() => {});
      return cached;
    }
    const fresh = await network;
    if (fresh) return fresh;
    // Last resort — let the browser show its own font fallback.
    return new Response('', { status: 504, statusText: 'Font offline' });
  })());
});