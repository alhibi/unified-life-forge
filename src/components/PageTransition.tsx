import { motion } from 'framer-motion';
import { ReactNode, memo } from 'react';
import { useLocation } from 'react-router-dom';

// Main tabs — these get a fast fade (no slide)
const TAB_PATHS = ['/', '/games', '/duas', '/diwan', '/settings'];

const slideVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  },
};

const fadeVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
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
