import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode, memo, useLayoutEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { navLoaded } from '@/lib/navPerf';

/**
 * PageTransition — native-feel page enter/exit
 * ─────────────────────────────────────────────────────────────────────
 * Tuned to match the feel of iOS UIKit / Android Fragment transitions:
 *
 *   ENTER  — content fades in + slides up a tiny amount (8px → 0).
 *            Fast ease-out-expo: snappy start, smooth landing.
 *            Duration: 280ms (iOS default page push is ~300ms).
 *
 *   EXIT   — quick fade-out + very subtle scale-down (1 → 0.98).
 *            Short duration (160ms) so the outgoing page clears fast
 *            and doesn't compete visually with the incoming one.
 *
 * Tab switches (bottom nav) feel different from push navigations:
 * a horizontal parallax is distracting on repeated taps, so we keep
 * vertical-only micro-motion — consistent with how iOS tab bars work.
 *
 * Reduced-motion: drops all transform, near-instant cross-fade only.
 */

/* ── Easing curves ─────────────────────────────────────────────────── */
// Matches --ease-out-expo in index.css
const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
// Matches --ease-in in index.css
const EASE_IN:  [number, number, number, number] = [0.4,  0, 1,   1];

/* ── Framer Motion variants ────────────────────────────────────────── */
const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.985,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: EXPO_OUT,
      // Stagger opacity slightly behind transform so content appears
      // to "settle in" rather than pop — matches native iOS feel.
      opacity: { duration: 0.22, ease: EXPO_OUT },
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.99,
    transition: {
      duration: 0.16,
      ease: EASE_IN,
    },
  },
};

/* ── Reduced-motion variants ───────────────────────────────────────── */
const reducedVariants = {
  initial: { opacity: 0,  y: 0, scale: 1 },
  animate: { opacity: 1,  y: 0, scale: 1, transition: { duration: 0.1, ease: 'linear' as const } },
  exit:    { opacity: 0,  y: 0, scale: 1, transition: { duration: 0.07, ease: 'linear' as const } },
};

export default memo(function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const variants = useMemo(
    () => (prefersReducedMotion ? reducedVariants : pageVariants),
    [prefersReducedMotion],
  );

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
        transformOrigin: 'center top',
        backfaceVisibility: 'hidden',
      }}
    >
      {children}
    </motion.div>
  );
});
