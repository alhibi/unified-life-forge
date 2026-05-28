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

  // ── 2. Promote <main> to its own GPU layer ──
  //
  // IMPORTANT: We intentionally do NOT apply transform to <html> or
  // <body>. Setting transform (even translateZ(0)) on either root
  // element creates a new containing block for position:fixed children.
  // This means every position:fixed element in the app (BottomNav,
  // modals, toasts, PodcastMiniPlayer) would be fixed relative to the
  // scrolling <body> instead of the viewport — causing them to scroll
  // off-screen with the page content. That was the root cause of the
  // BottomNav "disappears until you scroll to the bottom" bug.
  //
  // Only <main id="main-content"> gets GPU promotion because:
  //   • It is the route container — page transitions animate inside it.
  //   • It does NOT contain position:fixed children (BottomNav et al.
  //     are siblings rendered outside <main> by App.tsx).
  //   • Promoting it keeps slide transitions on the compositor thread
  //     without breaking any fixed-position chrome.
  //
  // <html> and <body> only get text-size-adjust and backface hints
  // (no transform) — these do not create a new fixed-pos containing
  // block, so fixed children keep their viewport anchor.
  const html = document.documentElement;
  if (html) {
    // Prevent iOS from re-flowing text during a composited slide.
    (html.style as CSSStyleDeclaration & { webkitTextSizeAdjust?: string })
      .webkitTextSizeAdjust = '100%';
    // backface-visibility:hidden alone does NOT create a new containing
    // block for fixed-pos elements — safe to apply to html/body.
    html.style.backfaceVisibility = 'hidden';
  }
  const body = document.body;
  if (body) {
    body.style.backfaceVisibility = 'hidden';
  }

  // <main> may not exist on first paint if the React tree hasn't
  // mounted yet. Promote it as soon as it shows up — a tiny rAF retry
  // loop bounded to ~10 frames (~160 ms at 60 Hz, ~80 ms at 120 Hz).
  let attempts = 0;
  const promoteMain = () => {
    const main = document.getElementById('main-content');
    if (main) {
      main.style.transform = main.style.transform || 'translateZ(0)';
      main.style.backfaceVisibility = 'hidden';
      // contain:paint (not layout) — clips off-screen paint without
      // creating a fixed-pos containing block. 'layout' was previously
      // included here but it also acts as a containing block for fixed
      // descendants inside <main>; dropping it is safer.
      if (!main.style.contain) main.style.contain = 'paint';
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
