/** Register the reading image-cache worker for the `/reading` route. */

let registrationPromise: Promise<
  { ok: true } | { ok: false; reason: string }
> | null = null;

export function registerReadingServiceWorker(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  if (registrationPromise) return registrationPromise;
  registrationPromise = register();
  return registrationPromise;
}

async function register(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' };
  }
  if (typeof window !== 'undefined' && window.top !== window.self) {
    return { ok: false, reason: 'iframe' };
  }

  try {
    try { localStorage.removeItem('rss-reader-sw-cleanup-done'); } catch { /* unavailable */ }
    const registration = await navigator.serviceWorker.register('/reading-sw.js', {
      scope: '/reading',
      updateViaCache: 'none',
    });
    await registration.update().catch(() => undefined);
    return { ok: true };
  } catch (error) {
    registrationPromise = null;
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'registration-failed',
    };
  }
}