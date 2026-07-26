import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  createContext,
  forwardRef,
  memo,
  ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
} from 'react';
import { useLocation } from 'react-router-dom';

import { useApp } from '@/contexts/AppContext';
import { buildNavVariants, type NavMode, REDUCED_MOTION_NAV_VARIANTS } from '@/lib/motion';
import { navLoaded } from '@/lib/navPerf';

/**
 * PageTransition — the one place a screen enters and leaves.
 * ─────────────────────────────────────────────────────────────────────
 * Every duration, curve and offset comes from `MOTION` in `@/lib/motion`,
 * and the CHARACTER of the transition comes from the user's navigation-style
 * preference (`/settings/motion` → "نمط انتقال الشاشات"):
 *
 *   silk    — cross-fade only. No transform is interpolated, so there is no
 *             per-frame layout or geometry work at all, and no enter delay:
 *             the incoming screen starts resolving the instant the route
 *             commits. This is the default and the one that holds a 120 Hz
 *             cadence on modest hardware.
 *   depth   — Material-3-expressive scale + fade.
 *   slide   — iOS push/pop with a parallax tail, mirrored for RTL.
 *   instant — no animation.
 *
 * Reduced motion (either the OS preference or the in-app switch) overrides
 * all four with a short cross-fade.
 *
 * Why the outgoing page moves in the right direction
 * ──────────────────────────────────────────────────
 * The current nav direction is delivered via <NavModeContext> from
 * <AnimatedRoutes> in App.tsx and forwarded to framer as `custom`. When
 * AnimatePresence runs the EXIT variant on the outgoing page it reads
 * `custom` from the <AnimatePresence custom={mode}> wrapper — which holds the
 * LATEST direction, the one the user just initiated. So a forward push gives
 * the OLD page mode='push' for its exit, and it leaves accordingly, without
 * prop drilling and without a page needing to know its own future.
 *
 * Performance contract
 * ────────────────────
 *   • Only `transform` and `opacity` are animated — both GPU-composited.
 *   • Layer promotion is expressed in CSS, gated on
 *     `html[data-compositor-hints]`, so the user's switch genuinely controls
 *     it and we are not permanently pinning a texture behind their back.
 *   • There is NO CSS transition on transform/opacity for this element — see
 *     the note in index.css. Owning a property in two animation systems at
 *     once is what makes a transition look like it hesitates.
 *   • The wrapper never animates width / height / top / left / margin /
 *     padding.
 */

/* ── Context: lets the parent flow nav direction down ─────────────── */
export const NavModeContext = createContext<NavMode>('initial');

/* ── Component ────────────────────────────────────────────────────── */

const PageTransition = memo(
  forwardRef<HTMLDivElement, { children: ReactNode }>(function PageTransition({ children }, ref) {
    const location = useLocation();
    const osPrefersReducedMotion = useReducedMotion();
    const { dir, navStyle, reduceMotion } = useApp();
    const rtl = dir === 'rtl';
    const mode = useContext(NavModeContext);

    // Either source of reduced motion wins. The OS preference can never be
    // overridden by an app setting — only reinforced.
    const reduced = osPrefersReducedMotion || reduceMotion;

    const variants = useMemo<Variants>(
      () => (reduced ? REDUCED_MOTION_NAV_VARIANTS : buildNavVariants(navStyle, rtl)),
      [navStyle, rtl, reduced],
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
        // `custom` is read by the variant resolvers for the initial+animate
        // cycle of THIS instance. For the EXIT cycle, framer-motion reads
        // `custom` from <AnimatePresence custom={mode}> (set in AnimatedRoutes)
        // — which has the latest direction.
        custom={mode}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          // ── GPU compositing (ProMotion / 120 Hz friendly) ──
          // We touch ONLY transform + opacity — both compositor-thread
          // properties — so animations run on the GPU at the display's native
          // vsync (60 Hz on standard panels, 120 Hz on ProMotion / Pixel).
          //
          //   • backfaceVisibility: hidden — eliminates the sub-pixel
          //     re-rasterization jitter that shows up during a slide.
          //   • transformStyle: preserve-3d — keeps the layer on its own GPU
          //     surface on engines that do not honor will-change alone.
          //
          // `will-change` is deliberately NOT set here. It lives in index.css
          // under `html[data-compositor-hints='true']` so the preference
          // actually controls it, and so the hint is not left standing forever
          // on a screen that has finished animating.
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          transformOrigin: 'center top',
          // popLayout (set on AnimatePresence) takes the exiting element out of
          // flow; this width/min-height ensures both pages occupy the same
          // coordinate space during the overlap so the transition looks correct
          // rather than reflowing.
          width: '100%',
          minHeight: '100%',
          // A transition can carry the layer past the viewport edge. Without
          // containment, off-screen pixels repaint when the outgoing page
          // reflows during exit; pinning paint here keeps the compositor in
          // charge from the first frame to the last.
          contain: 'layout paint',
        }}
      >
        {children}
      </motion.div>
    );
  }),
);

PageTransition.displayName = 'PageTransition';

export default PageTransition;
