import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ReactNode, createContext, forwardRef, memo, useContext, useLayoutEffect, useMemo } from 'react';
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

function buildVariants(_rtl: boolean): Variants {
  // Khushu / Material 3 Expressive spec (MainActivity.kt:968–1040).
  // Every nav transition is a TWO-leg animation:
  //   • opacity — short (150–350 ms) on decelerate/accelerate easing
  //   • scale   — long  (500 ms) on M3 emphasized easing
  // Scale ratios per mode:
  //   push:   enter from 0.85, exit to 0.95
  //   pop:    enter from 0.95, exit to 0.85
  //   tab:    enter from 0.92, exit to 0.92  (delay 150ms on enter fade)
  return {
    initial: (m: NavMode) => {
      if (m === 'initial') return { opacity: 1, scale: 1 };
      if (m === 'replace') return { opacity: 0, scale: 1 };
      if (m === 'tab')     return { opacity: 0, scale: MOTION.scaleTab };
      if (m === 'pop')     return { opacity: 0, scale: MOTION.scalePopFrom };
      /* push */           return { opacity: 0, scale: MOTION.scalePushFrom };
    },

    animate: (m: NavMode) => {
      if (m === 'initial')  return { opacity: 1, scale: 1, transition: { duration: 0 } };
      if (m === 'replace')  return { opacity: 1, scale: 1, transition: MOTION.fade };
      const opacityT =
        m === 'tab' ? MOTION.navFadeTabEnter : MOTION.navFadeEnter;
      return {
        opacity: 1,
        scale: 1,
        transition: {
          opacity: opacityT,
          scale:   MOTION.navScale,
        },
      };
    },

    exit: (m: NavMode) => {
      // Pull the exiting screen out of flow so the incoming one can
      // occupy the same coordinate space. Required because our
      // motion.div is nested inside <Routes>/<ErrorBoundary> and
      // popLayout only does this for direct motion children.
      const positional = {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
      };

      if (m === 'tab') {
        // Tab→tab swap: drop the old top-level screen instantly so
        // there's no double-render in the scroll flow. The incoming
        // tab still plays the full Khushu tab-enter animation.
        return {
          ...positional,
          display: 'none',
          visibility: 'hidden',
          opacity: 0,
          scale: 1,
          pointerEvents: 'none',
          transition: { duration: 0 },
        };
      }

      if (m === 'replace' || m === 'initial') {
        return {
          ...positional,
          opacity: 0,
          scale: 1,
          transition: MOTION.fade,
        };
      }

      // push → exit at 0.95, pop → exit at 0.85.
      const target = m === 'push' ? MOTION.scalePushTo : MOTION.scalePopTo;
      return {
        ...positional,
        opacity: 0,
        scale: target,
        transition: {
          opacity: MOTION.navFadeExit,
          scale:   MOTION.navScale,
        },
      };
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

const PageTransition = memo(forwardRef<HTMLDivElement, { children: ReactNode }>(function PageTransition(
  { children },
  ref,
) {
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
      ref={ref}
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
 // the GPU compositor in charge end-.
 contain: 'layout paint',
      }}
    >
      {children}
    </motion.div>
  );
}));

PageTransition.displayName = 'PageTransition';

export default PageTransition;
