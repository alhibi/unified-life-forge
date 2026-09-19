/**
 * Narrow service worker for RSS article images.
 *
 * It never intercepts app-shell or article requests. The reading client sends
 * an explicit list of public image URLs to cache, so storage remains bounded
 * and the user's data-saver preference stays authoritative.
 */

const IMAGE_CACHE = 'reading-images-v3';
const LEGACY_CACHES = new Set([
  'reading-runtime-v2',
  'reading-images-v2',
  'reading-runtime',
  'reading-images',
]);
const MAX_IMAGES = 500;
const MAX_MESSAGE_URLS = 300;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.allSettled(
      names.filter((name) => LEGACY_CACHES.has(name)).map((name) => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

function safeImageUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

async function cacheImage(cache, url) {
  if (await cache.match(url)) return;
  const response = await fetch(url, {
    mode: 'no-cors',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  if (response.ok || response.type === 'opaque') await cache.put(url, response);
}

async function trimCache(cache) {
  const requests = await cache.keys();
  const overflow = requests.slice(0, Math.max(0, requests.length - MAX_IMAGES));
  await Promise.allSettled(overflow.map((request) => cache.delete(request)));
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data.type !== 'string') return;

  if (data.type === 'reading:precache') {
    event.waitUntil((async () => {
      const urls = Array.isArray(data.urls)
        ? [...new Set(data.urls.map(safeImageUrl).filter(Boolean))].slice(0, MAX_MESSAGE_URLS)
        : [];
      const cache = await caches.open(IMAGE_CACHE);
      for (const url of urls) {
        try { await cacheImage(cache, url); } catch { /* one image must not stop the queue */ }
      }
      await trimCache(cache);
    })());
    return;
  }

  if (data.type === 'reading:clear-images') {
    event.waitUntil(caches.delete(IMAGE_CACHE));
    return;
  }

  if (data.type === 'reading:estimate') {
    event.waitUntil((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const imageCount = (await cache.keys()).length;
      const estimate = self.navigator?.storage?.estimate
        ? await self.navigator.storage.estimate().catch(() => ({}))
        : {};
      const payload = {
        type: 'reading:estimate-result',
        imageCount,
        runtimeCount: 0,
        quotaBytes: estimate.quota || 0,
        usageBytes: estimate.usage || 0,
      };
      if (event.ports?.[0]) event.ports[0].postMessage(payload);
      else if (event.source) event.source.postMessage(payload);
    })());
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.destination !== 'image' || event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(IMAGE_CACHE);
    return (await cache.match(event.request)) || fetch(event.request);
  })());
});