import type { Variants } from 'framer-motion';

import { SURGE_TOKENS, GERMAN_CLUB_TOKENS } from '../types';

/**
 * Animation Craft Standards for Surge & Momentum System:
 * 1. Anticipation before payoff: 100–150ms compress/pull-back before main motion.
 * 2. Custom easing: Overshoot cubic-bezier for celebratory moments (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
 * 3. Settle, don't stop: Return visibly to calm baseline (`paper`/`ink`/`prussian`).
 * 4. Dignified `prefers-reduced-motion` fallback: Brief solid color state change (no travel/sweep).
 */

export const SURGE_EASING = {
  overshoot: [0.34, 1.56, 0.64, 1] as const,
  anticipation: [0.4, 0, 0.2, 1] as const,
  smoothSettle: [0.25, 1, 0.5, 1] as const,
};

export const SURGE_GRADIENTS = {
  active: `linear-gradient(90deg, ${GERMAN_CLUB_TOKENS.prussian} 0%, ${SURGE_TOKENS.surgeCobalt} 50%, ${SURGE_TOKENS.surgeEmberHot} 100%)`,
  shimmer: `linear-gradient(90deg, ${SURGE_TOKENS.surgeCobalt} 0%, ${SURGE_TOKENS.surgeEmberHot} 50%, ${SURGE_TOKENS.surgeCobalt} 100%)`,
};

/**
 * Framer-motion variants for the Bewährungsprobe Stamp surge moment
 */
export const STAMP_SURGE_VARIANTS: Variants = {
  initial: {
    scale: 0.85,
    opacity: 0,
    rotate: -12,
  },
  anticipate: {
    scale: 0.8,
    opacity: 0.6,
    rotate: -15,
    transition: {
      duration: 0.12,
      ease: SURGE_EASING.anticipation,
    },
  },
  payoff: {
    scale: 1.08,
    opacity: 1,
    rotate: -4,
    transition: {
      duration: 0.35,
      ease: SURGE_EASING.overshoot,
    },
  },
  settle: {
    scale: 1,
    opacity: 1,
    rotate: -6,
    transition: {
      duration: 0.45,
      ease: SURGE_EASING.smoothSettle,
    },
  },
};

/**
 * Framer-motion variants for the Background Surge Wash in Bewährungsprobe
 */
export const WASH_SURGE_VARIANTS: Variants = {
  initial: {
    opacity: 0,
    scaleX: 0,
  },
  sweep: {
    opacity: [0, 0.85, 0.9, 0],
    scaleX: [0, 1.05, 1, 0],
    transition: {
      duration: 1.1,
      times: [0, 0.15, 0.5, 1],
      ease: 'easeInOut' as const,
    },
  },
};

/**
 * Reduced-motion variant helper
 */
export const REDUCED_SURGE_VARIANTS: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: [0, 1, 1, 0],
    transition: { duration: 0.6, times: [0, 0.2, 0.8, 1] },
  },
};
