 
/**
 * Kill-switch service worker for the reading feature.
 *
 * Reading is now fully cloud-backed — no more offline article cache
 * or image cache. Returning browsers that still have the old
 * `/reading`-scoped worker registered need this same-path
 * replacement to evict its caches and unregister itself.
 */

self.addEventListener('install', () => self.skipWaiting());

function isReadingCache(name) {
  return (
    name === 'reading-runtime-v2' ||
    name === 'reading-images-v2' ||
    name === 'reading-runtime' ||
    name === 'reading-images'
  );
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(
          names.filter(isReadingCache).map((n) => caches.delete(n)),
        );
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});

// Reply to any lingering StorageView estimate ping so the UI does
// not hang waiting for a response.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'reading:estimate' && event.source) {
    try {
      event.source.postMessage({
        type: 'reading:estimate-result',
        imageCount: 0,
        runtimeCount: 0,
        quotaBytes: 0,
        usageBytes: 0,
      });
    } catch {
      /* ignore */
    }
  }
});