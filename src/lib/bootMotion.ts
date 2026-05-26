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
 *   3. Promote the body to a GPU layer.
 *      `transform: translateZ(0)` on body forces the root to live on
 *      its own compositor layer. With `backface-visibility: hidden`
 *      this also avoids sub-pixel jitter on transforms.
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
 *     including 120Hz ProMotion on iOS. As long as the app uses
 *     framer-motion (RAF-driven) and animates only transform + opacity,
 *     transitions will run at the highest supported rate automatically.
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

  // ── 2. Promote body to its own GPU layer ──
  // Done via inline style (not CSS) so it's resilient to stylesheet
  // ordering / theme overrides that touch the body element.
  const body = document.body;
  if (body) {
    body.style.transform = body.style.transform || 'translateZ(0)';
    body.style.backfaceVisibility = 'hidden';
  }

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
