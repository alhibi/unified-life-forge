import { motion } from 'framer-motion';
import { ReactNode, memo, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { navLoaded } from '@/lib/navPerf';

// Main tabs — these get a fast fade (no slide)
const TAB_PATHS = ['/', '/games', '/duas', '/diwan', '/settings'];

// Zoom-fade transition: subtle scale-up on enter, scale-down on exit
// (matches the iOS-style "soft zoom" the user requested).
const slideVariants = {
  initial: { opacity: 0, scale: 0.965 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    scale: 0.985,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  },
};

const fadeVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    transition: { duration: 0.14, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  },
};

export default memo(function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isTab = TAB_PATHS.includes(location.pathname);
  const variants = isTab ? fadeVariants : slideVariants;

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
