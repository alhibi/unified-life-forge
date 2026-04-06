import { motion } from 'framer-motion';
import { ReactNode, memo } from 'react';
import { useLocation } from 'react-router-dom';

// Main tabs — these get a fast fade (no slide)
const TAB_PATHS = ['/', '/games', '/duas', '/diwan', '/settings'];

const slideVariants = {
  initial: { opacity: 0, x: 60 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: [0.25, 1, 0.5, 1] },
  },
  exit: {
    opacity: 0,
    x: -30,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  },
};

const fadeVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1, ease: 'easeIn' },
  },
};

export default memo(function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isTab = TAB_PATHS.includes(location.pathname);
  const variants = isTab ? fadeVariants : slideVariants;

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        willChange: 'opacity, transform',
        contain: 'layout style paint',
        backfaceVisibility: 'hidden',
      }}
    >
      {children}
    </motion.div>
  );
});
