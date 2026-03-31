import { motion } from 'framer-motion';
import { ReactNode, memo } from 'react';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.12, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  },
};

export default memo(function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
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
