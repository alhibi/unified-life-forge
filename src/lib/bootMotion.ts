/**
 * bootMotion — one-shot, idempotent setup performed at app launch.
 *
 * Goals (web equivalent of the spec's "request highest refresh rate"
 * rule from the native motion guidelines):
 *
 *   1. Honor prefers-reduced-motion globally.
 *      Mirror the OS setting onto <html data-reduced-motion="..."> so
 *      CSS that lives in scoped stylesheets (or inline styles built
 *      from data-attributes) can react without re-parsing the media
 *      query. Listens for changes so users can toggle the setting at
 *      runtime and have the UI respond without reload.
 *
 *   2. Promote <main> to a GPU layer via will-change.
 *      The route container gets promoted so page transitions
 *      composite against a stable surface. We use `will-change`
 *      instead of `transform: translateZ(0)` to avoid creating a
 *      containing block that would break position:fixed elements
 *      (like the BottomNav) in the document tree.
 *
 *   3. Pre-warm the compositor.
 *      Mobile Safari/Chromium establish the compositor thread lazily,
 *      so the very first transition can pay a one-frame cost while the
 *      GPU layer is being created. A nested rAF on boot pushes the
 *      compositor to initialize before any user interaction.
 *
 * What this function does NOT do:
 *   - Apply transforms to <html> or <body>. Any transform on these
 *     elements breaks position:fixed for ALL descendants, making the
 *     BottomNav scroll with content instead of staying pinned.
 *   - Request a specific refresh rate. The browser already drives
 *     transform/opacity animations at the display's native vsync.
 *   - Start any animation loops or timers.
 *
 * Idempotent: safe to call more than once (HMR, route mounting), but
 * the listener is only attached on the first call.
 */

let booted = false;

export function bootMotion(): void {
  if (typeof window === 'undefined') return;
  if (booted) return;
  booted = true;

  // ── 1. Mirror prefers-reduced-motion onto <html> ──
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = (matches: boolean) => {
    document.documentElement.dataset.reducedMotion = String(matches);
  };
  apply(mq.matches);
  // `addEventListener` on MediaQueryList is supported on every
  // browser our viewport hits (Safari ≥ 14, Chrome ≥ 39). The
  // legacy `addListener` API is intentionally not polyfilled.
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', (e) => apply(e.matches));
  }

  // ── 2. Promote <main> to a GPU layer ──
  // We promote the route container so page transitions always composite
  // against a stable surface even if a slow sub-page paints late.
  //
  // IMPORTANT: We intentionally do NOT apply transform to <html> or <body>.
  // Any transform on an ancestor of a position:fixed element causes it to
  // lose viewport-relative positioning — the element becomes relative to
  // the transformed ancestor instead. This broke the BottomNav which uses
  // position:fixed to stay at the viewport bottom.
  //
  // The <main> element can safely have a transform because the BottomNav
  // is rendered as a sibling of <main>, not inside it.
  let attempts = 0;
  const promoteMain = () => {
    const main = document.getElementById('main-content');
    if (main) {
      main.style.willChange = 'transform';
      main.style.backfaceVisibility = 'hidden';
      return;
    }
    if (++attempts < 10) requestAnimationFrame(promoteMain);
  };
  requestAnimationFrame(promoteMain);

  // ── 3. Pre-warm the compositor with a nested rAF ──
  // The first rAF ticks at the next vsync boundary; the second runs
  // after the browser has produced one frame, by which point the
  // compositor thread is fully initialized.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // No work — the side effect IS the warm-up.
    });
  });
}
