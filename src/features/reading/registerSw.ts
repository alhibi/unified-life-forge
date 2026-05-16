/**
 * Service Worker registration for the reading feature.
 *
 * We intentionally scope the SW to /reading (not the whole site) so
 * other parts of the app don't accidentally start serving cached
 * responses. The registration is best-effort — if the browser blocks
 * SW (e.g. private mode in some browsers), we silently fall back to
 * online-only behaviour.
 */

let registered = false;

export async function registerReadingServiceWorker(): Promise<
  | { ok: true; registration: ServiceWorkerRegistration }
  | { ok: false; reason: string }
> {
  if (registered) return { ok: false, reason: 'already-registered' };
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' };
  }
  // Don't register in dev iframes / cross-origin previews.
  if (typeof window !== 'undefined' && window.top !== window.self) {
    return { ok: false, reason: 'iframe' };
  }
  try {
    const registration = await navigator.serviceWorker.register(
      '/reading-sw.js',
      { scope: '/reading' },
    );
    registered = true;
    return { ok: true, registration };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'registration-failed',
    };
  }
}
