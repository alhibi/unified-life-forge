/**
 * Remove the legacy `/reading`-scoped worker once. Image caching now belongs
 * to the app-wide worker, avoiding two workers competing for the same route.
 */

const CLEANUP_KEY = 'rss-reader-scoped-worker-retired-v2';
let cleanupPromise: Promise<{ ok: true } | { ok: false; reason: string }> | null = null;

export function registerReadingServiceWorker(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  if (cleanupPromise) return cleanupPromise;
  cleanupPromise = retireLegacyWorker();
  return cleanupPromise;
}

async function retireLegacyWorker(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' };
  }
  if (import.meta.env.DEV) return { ok: false, reason: 'development' };
  if (typeof window !== 'undefined' && window.top !== window.self) {
    return { ok: false, reason: 'iframe' };
  }
  if (window.location.hostname.includes('-preview--')) {
    return { ok: false, reason: 'preview' };
  }

  try {
    if (localStorage.getItem(CLEANUP_KEY) === '1') return { ok: true };
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((registration) => {
          try {
            const scope = new URL(registration.scope);
            return scope.pathname === '/reading' || scope.pathname === '/reading/';
          } catch {
            return false;
          }
        })
        .map((registration) => registration.unregister()),
    );
    localStorage.setItem(CLEANUP_KEY, '1');
    return { ok: true };
  } catch (error) {
    cleanupPromise = null;
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'cleanup-failed',
    };
  }
}