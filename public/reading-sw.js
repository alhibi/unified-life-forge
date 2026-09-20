/** Retire legacy `/reading`-scoped workers so the app-wide worker can control the route. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.allSettled(
      names
        .filter((name) => ['reading-runtime-v2', 'reading-images-v2', 'reading-runtime', 'reading-images'].includes(name))
        .map((name) => caches.delete(name)),
    );
    await self.registration.unregister();
  })());
});