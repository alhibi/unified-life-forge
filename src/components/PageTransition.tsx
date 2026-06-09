import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ReactNode, createContext, memo, useContext, useLayoutEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { navLoaded } from '@/lib/navPerf';
import { useApp } from '@/contexts/AppContext';
import { MOTION, type NavMode } from '@/lib/motion';

/**
 * PageTransition — strict iOS push / pop with parallax.
 * ─────────────────────────────────────────────────────────────────────
 * Reads every duration / easing / parallax ratio from `MOTION` in
 * `@/lib/motion` — the single source of truth. Never hardcode timings
 * or curves here.
 *
 *   FORWARD  (push):
 *     • Incoming slides in from RIGHT in LTR (LEFT in RTL — iOS mirrors
 *       navigation in RTL locales so "forward" comes from where the
 *       user reads from).
 *     • Outgoing slides off the OPPOSITE edge at MOTION.parallax (35%)
 *       of the incoming distance — gives the layered depth effect that
 *       makes a native push feel physical.
 *     • 300ms ease-out-quad. No bounce.
 *     • Slide + fade run in parallel, never sequentially.
 *
 *   BACKWARD (pop): mirror image, 260ms (slightly faster than push).
 *
 *   TAB     : 220ms vertical fade-up, no horizontal motion. A
 *             horizontal slide on every bottom-nav tap is exhausting.
 *
 *   REPLACE : 200ms ease-in-out cross-fade.
 *
 *   INITIAL : no animation — the very first paint of the app must not
 *             slide in from anywhere.
 *
 *   REDUCED MOTION: collapses to a near-instant cross-fade only (no
 *             transform), regardless of mode.
 *
 * Implementation notes
 * ────────────────────
 * The current nav direction is delivered via <NavModeContext> from
 * <AnimatedRoutes> in App.tsx. The motion.div forwards it as `custom`
 * to framer-motion. This is critical: when AnimatePresence runs the
 * EXIT variant on the outgoing page, it reads `custom` from the
 * <AnimatePresence custom={mode}> wrapper — which has the LATEST
 * direction (the one the user just initiated). So if the user just
 * pushed forward, the OLD page receives mode='push' for its exit and
 * leaves to the LEFT with parallax. Pop reverses this. This is the
 * mechanism that makes the outgoing page move "in the right direction"
 * without prop drilling and without the page knowing its own future.
 *
 * Performance:
 *   • Only `transform` and `opacity` are animated — both GPU-composited.
 *   • `will-change: transform, opacity` is set per-layer.
 *   • backface-visibility hidden suppresses sub-pixel jitter.
 *   • The wrapper does not animate width / height / top / left / margin /
 *     padding, ever.
 */

/* ── Context: lets the parent flow nav direction down ─────────────── */
export const NavModeContext = createContext<NavMode>('initial');

/* ── Variants ─────────────────────────────────────────────────────── *
 * Function-style variants take `custom` (the NavMode) and resolve to
 * the right offset + transition for that mode. AnimatePresence forwards
 * `custom` to both initial+animate (from the motion.div's own prop)
 * and exit (from the AnimatePresence's `custom` prop).
 * ──────────────────────────────────────────────────────────────────── */

function buildVariants(rtl: boolean): Variants {
  // Sign convention: positive x = "from right". In LTR a forward push
  // brings the new page from the right (sign = +1). In RTL we mirror.
  const enterSign = (m: NavMode): number => {
    if (m === 'push') return rtl ? -1 :  1;
    if (m === 'pop')  return rtl ?  1 : -1;
    return 0;
  };
  // The outgoing page goes the opposite way at parallax ratio.
  const exitSign = (m: NavMode): number => {
    if (m === 'push') return rtl ?  1 : -1;
    if (m === 'pop')  return rtl ? -1 :  1;
    return 0;
  };

  return {
    initial: (m: NavMode) => {
      // First paint — no animation, render at rest.
      if (m === 'initial') return { opacity: 1, x: 0, y: 0 };
      // Tab switch — quick vertical micro-motion only.
      if (m === 'tab')     return { opacity: 0, x: 0, y: 6 };
      // Replace — pure cross-fade.
      if (m === 'replace') return { opacity: 0, x: 0, y: 0 };
      // Push / pop — full slide from the appropriate edge.
      return { opacity: 0, x: `${enterSign(m) * 100}%`, y: 0 };
    },

    animate: (m: NavMode) => {
      const transition =
        m === 'push'    ? MOTION.push :
        m === 'pop'     ? MOTION.pop  :
        m === 'tab'     ? MOTION.tab  :
        m === 'replace' ? MOTION.fade :
        /* initial */     { duration: 0 };
      return { opacity: 1, x: '0%', y: 0, transition };
    },

    exit: (m: NavMode) => {
      const transition =
        m === 'push' ? MOTION.push :
        m === 'pop'  ? MOTION.pop  :
        m === 'tab'  ? MOTION.tabExit :
        /* replace / initial */ MOTION.fade;

      // While exiting, take the page out of normal flow so the incoming
      // page can occupy the same coordinate space instead of stacking
      // below it. AnimatePresence's `mode="popLayout"` only does this
      // automatically for direct motion children, and our motion.div is
      // nested inside <Routes>/<ErrorBoundary>, so we apply the position
      // ourselves via the exit variant.
      const positional = {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
      };

      // Tab / replace / initial — no horizontal slide on exit.
      if (m === 'tab' || m === 'replace' || m === 'initial') {
        return { ...positional, opacity: 0, x: 0, y: 0, transition };
      }
      // Push / pop — outgoing screen exits at parallax ratio of viewport width.
      const offsetPct = exitSign(m) * MOTION.parallax * 100;
      return { ...positional, opacity: 0, x: `${offsetPct}%`, y: 0, transition };
    },
  };
}

/* ── Reduced-motion variants (instant cross-fade, no transform) ──── */
const REDUCED_MOTION_VARIANTS: Variants = {
  initial: { opacity: 0, x: 0, y: 0 },
  animate: { opacity: 1, x: 0, y: 0, transition: { duration: 0.10, ease: 'linear' as const } },
  exit:    { opacity: 0, x: 0, y: 0, transition: { duration: 0.07, ease: 'linear' as const } },
};

/* ── Component ────────────────────────────────────────────────────── */

export default memo(function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const { dir } = useApp();
  const rtl = dir === 'rtl';
  const mode = useContext(NavModeContext);

  const variants = useMemo<Variants>(
    () => (prefersReducedMotion ? REDUCED_MOTION_VARIANTS : buildVariants(rtl)),
    [rtl, prefersReducedMotion],
  );

  // Close the navigation perf measurement once the page has mounted &
  // painted. Kept identical to the previous behavior so dashboards keep
  // working.
  useLayoutEffect(() => {
    const { finish } = navLoaded(location.pathname);
    finish();
  }, [location.pathname]);

  return (
    <motion.div
      data-page-surface
      // `custom` is read by the variant resolvers above for the
      // initial+animate cycle of THIS instance. For the EXIT cycle,
      // framer-motion reads `custom` from <AnimatePresence custom={mode}>
      // (set in AnimatedRoutes) — which has the latest direction.
      custom={mode}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        // ── GPU compositing (ProMotion / 120 Hz friendly) ──
        // We touch ONLY transform + opacity — both compositor-thread
        // properties — so animations run on the GPU at the display's
        // native vsync (60 Hz on standard panels, 120 Hz on iPhone Pro
        // ProMotion / iPad Pro / Pixel 7+ etc.). The hints below give
        // the browser everything it needs to keep this layer on its
        // own GPU surface for the entire animation:
        //
        //   • will-change: transform, opacity — promotes to a
        //     compositor layer eagerly, before the first frame.
        //   • transformStyle: preserve-3d + a translateZ(0) baseline
        //     on translate (via framer's percent-x converted to a 3d
        //     transform under the hood) — forces the layer onto its
        //     own GPU surface even on engines that don't honor
        //     will-change alone (older Safari).
        //   • backfaceVisibility: hidden — eliminates sub-pixel
        //     re-rasterization jitter during the slide.
        //   • perspective: 1px — opens a 3d rendering context so the
        //     compositor doesn't fall back to CPU painting on iOS.
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden',
        perspective: 1,
        transformOrigin: 'center top',
        // popLayout (set on AnimatePresence) takes the exiting element
        // out of flow; this width/min-height ensures both pages occupy
        // the same coordinate space during the overlap so the slide
        // looks correct rather than reflowing.
        width: '100%',
        minHeight: '100%',
        // The page slide carries the layer past the viewport edge.
        // Without contain, off-screen pixels can repaint when the
        // outgoing page reflows during exit; pinning paint here keeps
        // the GPU compositor in charge end-to-end.
        contain: 'layout paint',
      }}
    >
      {children}
    </motion.div>
  );
});
