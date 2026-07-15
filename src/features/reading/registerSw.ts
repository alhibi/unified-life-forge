/**
 * Kill-switch registration for the reading feature's legacy service
 * worker. The reading feature is now cloud-only — there is no local
 * article cache or image cache. Returning browsers still holding the
 * old worker need it evicted; we do that by loading the same-path
 * replacement worker (which unregisters itself on activate) and
 * unregistering any other `/reading`-scoped registration we find.
 */

let ran = false;
const CLEANUP_DONE_KEY = 'rss-reader-sw-cleanup-done';

export async function registerReadingServiceWorker(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  if (ran) return { ok: false, reason: 'already-ran' };
  ran = true;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' };
  }
  if (typeof window !== 'undefined' && window.top !== window.self) {
    return { ok: false, reason: 'iframe' };
  }
  // Once we've evicted the legacy worker on this device, never touch
  // service workers again — the reading feature is fully cloud-backed
  // and does not need one. Re-registering every visit would churn
  // install/activate/unregister cycles wastefully.
  try {
    if (localStorage.getItem(CLEANUP_DONE_KEY) === '1') {
      return { ok: false, reason: 'already-cleaned' };
    }
  } catch { /* storage unavailable */ }
  try {
    // 1) Register the kill-switch worker at the same path. On activate
    //    it wipes its caches, claims clients, then unregisters itself.
    const reg = await navigator.serviceWorker
      .register('/reading-sw.js', { scope: '/reading' })
      .catch(() => null);
    if (reg) {
      // Push an activate now so returning users don't have to wait
      // for the browser's own update cycle.
      try { reg.update(); } catch { /* ignore */ }
    }
    // 2) Belt-and-braces: unregister any other /reading-scoped worker
    //    the browser might still hold (older path, etc.).
    const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
    for (const r of regs) {
      if (r.scope && r.scope.includes('/reading')) {
        r.unregister().catch(() => {});
      }
    }
    // 3) Best-effort: also wipe the legacy Cache Storage buckets from
    //    the window side so free browsers that never re-visited the
    //    SW still reclaim the space.
    try {
      const keys = await caches.keys();
      await Promise.allSettled(
        keys
          .filter((k) =>
            k === 'reading-runtime-v2' ||
            k === 'reading-images-v2' ||
            k === 'reading-runtime' ||
            k === 'reading-images')
          .map((k) => caches.delete(k)),
      );
    } catch { /* Cache Storage unavailable */ }
    try { localStorage.setItem(CLEANUP_DONE_KEY, '1'); } catch { /* */ }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'cleanup-failed',
    };
  }
}
