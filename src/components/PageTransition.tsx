import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode, memo, useLayoutEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { navLoaded } from '@/lib/navPerf';

// Unified app-wide transition: every page, tab, and sub-page enters and
// leaves with the same soft zoom-fade. Single source of truth — do not
// add per-route variants.
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_IN:  [number, number, number, number] = [0.4, 0, 1, 1];

const motionVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    transition: { duration: 0.14, ease: EASE_IN },
  },
};

// When the user prefers reduced motion (OS-level setting), drop the
// scale entirely and use a near-instant cross-fade. We don't go to 0
// duration because an abrupt cut between pages still reads as jarring;
// 80 ms / 60 ms is just enough to feel like a deliberate wipe without
// any vestibular trigger.
const reducedVariants = {
  initial: { opacity: 0, scale: 1 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.08, ease: 'linear' as const } },
  exit:    { opacity: 0, scale: 1, transition: { duration: 0.06, ease: 'linear' as const } },
};

export default memo(function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  // Choose the right variant set once per render. The hook returns
  // null on the first render in some environments — treat that as
  // "no preference" (i.e. play the full motion).
  const variants = useMemo(
    () => (prefersReducedMotion ? reducedVariants : motionVariants),
    [prefersReducedMotion],
  );

  // Measure how long this route took to mount + paint.
  useLayoutEffect(() => {
    const { finish } = navLoaded(location.pathname);
    finish();
  }, [location.pathname]);

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        willChange: 'opacity, transform',
        transformOrigin: 'center center',
        contain: 'layout style paint',
        backfaceVisibility: 'hidden',
      }}
    >
      {children}
    </motion.div>
  );
});
