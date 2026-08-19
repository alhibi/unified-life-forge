/**
 * Blank-screen guard for stale asset caches.
 *
 * A shipped update rotates fingerprinted chunk filenames. If a client is still
 * holding an old `index.html` (service-worker shell cache, browser cache, or a
 * long-lived preview tab), the running bundle asks for chunk URLs that no
 * longer exist. React never mounts the route, nothing paints, and the user sees
 * an empty dark screen with no error surface.
 *
 * This installs a one-shot recovery: on a dynamic-import/preload failure we
 * purge the caches and the service worker, then reload once. The session guard
 * makes sure a genuinely broken deploy cannot turn into a reload loop.
 */

const GUARD_KEY = 'smarthub:chunk-recovery';

const CHUNK_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'failed to load module script',
  'dynamically imported module',
  'ChunkLoadError',
  'css chunk',
];

function looksLikeChunkFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
}

async function purgeAndReload(): Promise<void> {
  try {
    sessionStorage.setItem(GUARD_KEY, String(Date.now()));
  } catch {
    /* private mode: fall through, the reload still helps once */
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* cache purge is best effort */
  }
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    /* unregister is best effort */
  }
  window.location.reload();
}

export function installChunkRecovery(): void {
  if (typeof window === 'undefined') return;

  let attempted = false;
  try {
    attempted = sessionStorage.getItem(GUARD_KEY) !== null;
  } catch {
    attempted = false;
  }

  const handle = (message: string) => {
    if (attempted) return;
    if (!looksLikeChunkFailure(message)) return;
    attempted = true;
    void purgeAndReload();
  };

  window.addEventListener('error', (event) => {
    handle(event.message || String((event.error as Error | undefined)?.message ?? ''));
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as { message?: string } | string | undefined;
    handle(typeof reason === 'string' ? reason : (reason?.message ?? ''));
  });

  // A successful boot means the caches are coherent again: drop the guard so a
  // future stale-deploy really does get its one recovery reload.
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(GUARD_KEY);
    } catch {
      /* ignore */
    }
  }, 10_000);
}
