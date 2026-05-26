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
 *   2. Pre-warm the compositor.
 *      Mobile Safari/Chromium establish the compositor thread lazily,
 *      so the very first transition can pay a one-frame cost while the
 *      GPU layer is being created. A nested rAF on boot pushes the
 *      compositor to initialize before any user interaction, eliminating
 *      that cold-start hitch on the first navigation.
 *
 *   3. Promote <html>, <body>, and <main> to their own GPU layers.
 *      `transform: translateZ(0)` on each forces a dedicated compositor
 *      surface so the page transition runs entirely on the GPU thread
 *      — even when a sub-page paints late (no flash of un-composited
 *      background mid-slide). Combined with `backface-visibility:
 *      hidden` this also avoids sub-pixel jitter on transforms.
 *
 *   4. Disable iOS double-tap zoom delay.
 *      `touch-action: manipulation` is already set in index.css `*`
 *      base layer, so this function does NOT redo it — kept here as a
 *      reminder for future maintainers.
 *
 * What this function does NOT do:
 *   - It does not request a specific refresh rate. The Web Platform
 *     does not expose such an API; every modern browser already drives
 *     transform/opacity animations through the display's native vsync,
 *     including 120 Hz ProMotion on iOS. As long as the app uses
 *     framer-motion (RAF-driven) and animates only transform + opacity
 *     on a compositor-promoted layer (which we ensure here and in
 *     PageTransition), transitions will run at the highest supported
 *     rate automatically. The browser cannot run at a higher rate than
 *     the display panel supports, so "force 120 Hz" is really "make
 *     sure we're not accidentally falling back to CPU rasterization
 *     that would cap us at 60 Hz on a ProMotion device".
 *
 *   - It does not start any animation loops or timers. Boot-time work
 *     is bounded to a single rAF tick.
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

  // ── 2. Promote <html> + <body> + <main> to GPU layers ──
  // We push three different elements onto their own compositor surfaces:
  //
  //   • <html>  — root paint container; isolates the rest of the
  //               document so theme transitions / scroll / sticky
  //               headers don't cause whole-tree repaints.
  //   • <body>  — covers any direct-children that aren't promoted
  //               themselves (legacy DOM trees from third-party SDKs).
  //   • <main>  — the route container. Page transitions live inside
  //               <main>, and promoting it ensures the slide always
  //               composites against a stable surface even if a slow
  //               sub-page paints late (no flash of un-composited
  //               background).
  //
  // Done via inline style (not CSS) so it's resilient to stylesheet
  // ordering / theme overrides that touch these elements.
  const html = document.documentElement;
  if (html) {
    html.style.transform = html.style.transform || 'translateZ(0)';
    html.style.backfaceVisibility = 'hidden';
    // -webkit-text-size-adjust prevents iOS from re-laying-out text
    // when the layer is recomposited under a transform — without
    // this, a sub-pixel font reflow can race with the slide and
    // produce a one-frame jitter at the start of the animation.
    (html.style as CSSStyleDeclaration & { webkitTextSizeAdjust?: string })
      .webkitTextSizeAdjust = '100%';
  }
  const body = document.body;
  if (body) {
    body.style.transform = body.style.transform || 'translateZ(0)';
    body.style.backfaceVisibility = 'hidden';
  }
  // <main> may not exist on first paint if the React tree hasn't
  // mounted yet. Promote it as soon as it shows up — IntersectionObserver
  // would be overkill for a one-shot setup, so we use a tiny rAF retry
  // loop bounded to ~10 frames (~160 ms at 60 Hz, ~80 ms at 120 Hz).
  let attempts = 0;
  const promoteMain = () => {
    const main = document.getElementById('main-content');
    if (main) {
      main.style.transform = main.style.transform || 'translateZ(0)';
      main.style.backfaceVisibility = 'hidden';
      // contain:layout-paint pins the surface so off-screen content
      // during a slide doesn't repaint the whole route tree.
      main.style.contain = main.style.contain || 'layout paint';
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
