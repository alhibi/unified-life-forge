/**
 * bootMotion — one-shot, idempotent setup performed at app launch.
 *
 * Goals:
 *
 *   1. Honor prefers-reduced-motion globally, and keep honoring it.
 *      The OS preference is mirrored onto `<html data-reduced-motion>` so
 *      CSS can react without re-parsing a media query, and so the in-app
 *      "تقليل الحركة" switch can OR itself with the OS one. The listener
 *      routes back through `applyReduceMotion`, which re-reads the app
 *      preference — otherwise toggling the OS setting at runtime would
 *      silently discard the user's in-app choice.
 *
 *   2. Publish the default motion data attributes BEFORE React mounts, so
 *      the first frame already speaks the shipped motion language instead
 *      of briefly rendering with none of it.
 *
 *   3. Install the scroll governor (see `scrollRuntime.ts`).
 *
 *   4. Pre-warm the compositor. Mobile Safari/Chromium establish the
 *      compositor thread lazily, so the very first transition can pay a
 *      one-frame cost while the GPU layer is being created. A nested rAF
 *      on boot pushes the compositor to initialize before any interaction.
 *
 *   5. Measure the display's real refresh rate once, so the frame cap can
 *      skip installing a throttle the hardware already enforces and the
 *      diagnostics panel can tell the user what their panel actually does.
 *
 * What this function does NOT do:
 *   - Apply transforms to <html> or <body>. Any transform on these breaks
 *     position:fixed for ALL descendants.
 *   - Promote layers. GPU promotion is now expressed in CSS, gated on
 *     `html[data-compositor-hints='true']`, so the user's "تلميحات المُركّب"
 *     switch genuinely controls it.
 *   - Start any animation loops or timers.
 *
 * Idempotent: safe to call more than once (HMR, route mounting), but the
 * listeners are only attached on the first call.
 */

import {
  applyCompositorHints,
  applyNavStyle,
  applyOverlayStyle,
  applyReduceMotion,
  getMotionRuntimeState,
  measureDisplayHz,
} from './motionRuntime';
import { applyScrollProfile } from './scrollRuntime';

let booted = false;

export function bootMotion(): void {
  if (typeof window === 'undefined') return;
  if (booted) return;
  booted = true;

  // ── 1. Mirror prefers-reduced-motion onto <html>, OR-ed with the app switch ──
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  applyReduceMotion(getMotionRuntimeState().reduceMotion);
  // `addEventListener` on MediaQueryList is supported on every browser our
  // viewport hits (Safari ≥ 14, Chrome ≥ 39). The legacy `addListener` API is
  // intentionally not polyfilled.
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', () => {
      // Re-read the app preference so the OR stays correct.
      applyReduceMotion(getMotionRuntimeState().reduceMotion);
    });
  }

  // ── 2. Seed the motion data attributes with the shipped defaults ──
  // AppContext overwrites these a tick later with the persisted values; seeding
  // them here means the very first paint is never attribute-less (which would
  // fall through to the CSS defaults, and those must agree — see index.css).
  const initial = getMotionRuntimeState();
  applyNavStyle(initial.navStyle);
  applyOverlayStyle(initial.overlayStyle);
  applyCompositorHints(initial.compositorHints);

  // ── 3. Scroll governor ──
  applyScrollProfile(initial.scrollProfile);

  // ── 4. Pre-warm the compositor with a nested rAF ──
  // The first rAF ticks at the next vsync boundary; the second runs after the
  // browser has produced one frame, by which point the compositor thread is
  // fully initialized.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // No work — the side effect IS the warm-up.
      // ── 5. Measure the panel once the first frames have settled. ──
      void measureDisplayHz();
    });
  });
}
