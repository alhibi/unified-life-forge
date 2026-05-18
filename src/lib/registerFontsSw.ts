/**
 * Register the root-scoped fonts service worker.
 *
 * Best-effort: failures (private mode, embedded iframes, dev preview)
 * are swallowed because fonts already work fine over the network — the
 * SW is a latency optimisation, not a correctness requirement.
 */

let registered = false;

export function registerFontsServiceWorker(): void {
  if (registered) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Skip inside the Lovable preview iframe so we don't pollute the
  // outer host's SW registry.
  if (window.top !== window.self) return;

  registered = true;
  // Defer to idle so we never block first paint.
  const run = () => {
    navigator.serviceWorker
      .register('/fonts-sw.js', { scope: '/' })
      .catch(() => { /* best-effort */ });
  };
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void })
      .requestIdleCallback(run);
  } else {
    setTimeout(run, 1500);
  }
}