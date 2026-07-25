/**
 * Register the app-shell service worker and surface updates honestly.
 *
 * Replaces `registerFontsSw.ts`, whose worker only cached Google Fonts. The
 * new worker (build/swTemplate.js) precaches the shell, so the app genuinely
 * survives a reload with no connection — which is what the manifest and the
 * "working offline" toast already claimed.
 *
 * On update we deliberately do NOT let the new worker take over silently.
 * Swapping fingerprinted assets under a running page makes the already-loaded
 * bundle request chunk filenames that no longer exist, which the user sees as
 * a blank screen. The new worker waits, the user is told, and the takeover
 * happens on an explicit reload.
 */

const SW_URL = '/sw.js';

let registered = false;

type UpdatePrompt = (applyUpdate: () => void) => void;

/** Ask the waiting worker to activate, then reload once it has. */
function activate(worker: ServiceWorker) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
  worker.postMessage({ type: 'SKIP_WAITING' });
}

export function registerServiceWorker(onUpdateReady?: UpdatePrompt): void {
  if (registered) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // The dev server does not emit /sw.js, and registering a 404 would log a
  // confusing error on every reload.
  if (import.meta.env.DEV) return;
  // Skip inside a preview / split-pane iframe so we never pollute the host's
  // service worker registry with a scope it did not ask for.
  if (window.top !== window.self) return;

  registered = true;

  const run = async () => {
    try {
      const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/' });

      const notify = (worker: ServiceWorker | null) => {
        // `controller` is null on the very first visit: the worker installing
        // now is the initial one, not an update, so there is nothing to
        // announce and nothing to reload for.
        if (!worker || !navigator.serviceWorker.controller) return;
        onUpdateReady?.(() => activate(worker));
      };

      notify(registration.waiting);

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') notify(registration.waiting ?? installing);
        });
      });
    } catch {
      // Best-effort: private mode, unsupported scope, blocked by policy. The
      // app works over the network regardless.
    }
  };

  // Never compete with first paint.
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
      () => void run(),
    );
  } else {
    setTimeout(() => void run(), 1500);
  }
}
