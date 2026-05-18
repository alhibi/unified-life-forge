import { motion } from 'framer-motion';
import { ReactNode, memo, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { navLoaded } from '@/lib/navPerf';

// Unified app-wide transition: every page, tab, and sub-page enters and
// leaves with the same soft zoom-fade. Single source of truth — do not
// add per-route variants.
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_IN:  [number, number, number, number] = [0.4, 0, 1, 1];

const pageVariants = {
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

export default memo(function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();

  // Measure how long this route took to mount + paint.
  useLayoutEffect(() => {
    const { finish } = navLoaded(location.pathname);
    finish();
  }, [location.pathname]);

  return (
    <motion.div
      variants={pageVariants}
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
