import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useGermanClubStore } from '../useGermanClubStore';
import { GERMAN_CLUB_TOKENS, SURGE_TOKENS } from '../types';

export const SessionMomentumLine: React.FC = () => {
  const momentum = useGermanClubStore((state) => state.sessionMomentum);
  const coolMomentum = useGermanClubStore((state) => state.coolMomentum);
  const shouldReduceMotion = useReducedMotion();

  // Natural momentum decay: gradually cools down every 8 seconds if inactive and momentum > 0
  useEffect(() => {
    if (momentum <= 0) return;

    const timer = setInterval(() => {
      coolMomentum(10);
    }, 8000);

    return () => clearInterval(timer);
  }, [momentum, coolMomentum]);

  if (momentum <= 0) return null;

  // Compute color interpolations based on momentum intensity (0 to 100)
  const ratio = Math.min(1, Math.max(0, momentum / 100));

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none h-1 overflow-hidden"
      aria-hidden="true"
    >
      {/* Base Background Line */}
      <motion.div
        className="w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          background: `linear-gradient(90deg, ${GERMAN_CLUB_TOKENS.prussian} 0%, ${
            ratio > 0.4 ? SURGE_TOKENS.surgeCobalt : GERMAN_CLUB_TOKENS.prussian
          } 50%, ${SURGE_TOKENS.surgeEmberHot} 100%)`,
          opacity: 0.3 + ratio * 0.7,
        }}
        transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
      />

      {/* Traveling Shimmer Overlay (only when not reduced motion) */}
      {!shouldReduceMotion && ratio > 0.2 && (
        <motion.div
          className="absolute inset-0 w-full h-full"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            repeat: Infinity,
            duration: Math.max(1.2, 3 - ratio * 1.5),
            ease: 'linear',
          }}
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${SURGE_TOKENS.surgeEmberHot} 50%, transparent 100%)`,
            opacity: 0.6 * ratio,
          }}
        />
      )}
    </div>
  );
};
