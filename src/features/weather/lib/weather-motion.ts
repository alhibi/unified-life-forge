// ============================================================================
// weather-motion — premium animation system for the weather feature.
//
// PHILOSOPHY
//   • Easings over springs — every preset uses a tuned cubic-bezier curve
//     so transitions feel "controlled" rather than bouncy.
//   • Easing-by-context — list items use different easings than hero
//     reveals; tab switches use different easings than card hovers.
//   • Every curve was hand-tuned against the Zen Elite aesthetic —
//     smooth in, confident settle, no overshoot.
//
// NAMING
//   • easing.<curve>       — cubic-bezier arrays
//   • duration.<speed>     — ms timings for the 5 standard speeds
//   • presets.<name>       — ready-made Transition objects
//   • variants.<name>      — Variants for parent/child orchestration
//   • utility.<name>(d)    — helper functions for complex animations
// ============================================================================

import type { Transition, Variants } from 'framer-motion';

export const easing = {
  /** Quint-style ease-out: brisk, decisive entry. Default for everything. */
  standard:    [0.22, 1, 0.36, 1] as const,
  /** Slightly softer, slower entry — for chips and tertiary metrics. */
  gentle:      [0.4, 0, 0.2, 1] as const,
  /** Decelerate — fast in, long settle. Hero numbers, gauges. */
  decelerate:  [0.16, 1, 0.3, 1] as const,
  /** Expo-style ease-out: dramatic deceleration. Tab pills, big reveals. */
  expo:        [0.19, 1, 0.22, 1] as const,
  /** Cinematic — slow start, slow end. Tab pane transitions. */
  cinematic:   [0.83, 0, 0.17, 1] as const,
  /** Snap — fast in/out for micro-interactions. */
  snap:        [0.4, 0, 0.6, 1] as const,
} as const;

export const duration = {
  /** 100ms — micro-interactions: hover, press, ripple. */
  instant: 0.10,
  /** 180ms — buttons, toggles, focus states. */
  fast:    0.18,
  /** 280ms — small reveals: chips, single tile, single metric. */
  base:    0.28,
  /** 420ms — section reveals, tab content, primary numbers. */
  reveal:  0.42,
  /** 640ms — page-level: full tab transition, layout shift. */
  layout:  0.64,
  /** 920ms — cinematic: hero entry, count-up, big sweeps. */
  cinematic: 0.92,
} as const;

/* ── Presets: ready-made Transitions ────────────────────────────────── */

/** Hero reveal — slow out with long settle. The headline number deserves
 *  the user's attention. */
export const heroRevealTransition: Transition = {
  duration: duration.cinematic,
  ease: easing.expo,
};

/** Hero secondary text — slightly faster, less dramatic. */
export const heroSecondaryTransition: Transition = {
  duration: duration.reveal,
  ease: easing.decelerate,
};

/** Tab content switch — cinematic, slow both ends. */
export const tabCinematicTransition: Transition = {
  duration: duration.layout,
  ease: easing.cinematic,
};

/** Tab pill slide — snappy expo curve, ~280ms. */
export const pillSlideTransition: Transition = {
  duration: duration.base,
  ease: easing.expo,
};

/** Number count-up — long, dramatic. */
export const countUpTransition: Transition = {
  duration: duration.cinematic * 1.3,
  ease: easing.expo,
};

/** Gauge stroke sweep — medium-fast decelerate. */
export const gaugeSweepTransition: Transition = {
  duration: duration.reveal * 1.5,
  ease: easing.decelerate,
};

/** Card hover tilt — instant snap. */
export const cardHoverTransition: Transition = {
  duration: duration.fast,
  ease: easing.snap,
};

/** Icon pulse — gentle loop. */
export const iconPulseTransition: Transition = {
  duration: 2.6,
  ease: easing.gentle,
  repeat: Infinity,
  repeatType: 'mirror' as const,
};

/** Backward-compatible alias — older components used this name. */
export const heroSpringTransition = heroRevealTransition;

/** Backward-compatible aliases for the old API. */
export const tabTransition = tabCinematicTransition;
export const listItemTransition: Transition = {
  duration: duration.base,
  ease: easing.gentle,
};
export const fadeInTransition: Transition = {
  duration: duration.fast,
  ease: easing.gentle,
};
export const heroSpringTransition2: Transition = heroRevealTransition;

/* ── Variants ─────────────────────────────────────────────────────────── */

/** Parent that orchestrates a staggered cascade when it enters view. */
export const cascadeParent: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

/** Single cascade child — fade + small lift, expo-decelerate. */
export const cascadeChild: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.reveal, ease: easing.expo },
  },
};

/** A more dramatic cascade for the hero — bigger lift, longer duration. */
export const heroCascadeParent: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.11,
      delayChildren: 0.08,
    },
  },
};

export const heroCascadeChild: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.cinematic * 0.9, ease: easing.expo },
  },
};

/** Tab content — fade + slide up. */
export const tabContentVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.layout, ease: easing.cinematic },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: duration.base, ease: easing.cinematic },
  },
};

/* ── Utility functions ────────────────────────────────────────────────── */

/**
 * Format a value for a count-up. Pads with leading zero up to `pad`.
 * E.g. formatCount(7, 2) → "07".
 */
export function formatCount(value: number, pad = 0): string {
  const rounded = Math.round(value);
  const str = rounded.toString();
  return str.padStart(pad, '0');
}

/**
 * Compute a count-up value at time t (ms) from start to end.
 * Uses an expo ease-out: dramatic deceleration toward the target.
 */
export function countUpValue(t: number, start: number, end: number, totalMs: number): number {
  const progress = Math.min(1, Math.max(0, t / totalMs));
  // 1 - (1 - p)^4 → quartic ease-out, dramatic settle.
  const eased = 1 - Math.pow(1 - progress, 4);
  return start + (end - start) * eased;
}

/**
 * Generate a stagger delay for index i in a list of n items.
 * Spreads the total delay over the list so the last item lands at `totalMs`.
 */
export function staggerDelay(i: number, totalMs: number, n: number): number {
  if (n <= 1) return 0;
  return (i / (n - 1)) * totalMs;
}

/**
 * Magnetic tilt — convert pointer position to a small rotation.
 * Returns the rotation in degrees (typically -3..+3).
 */
export function magneticTilt(
  pointerX: number, // 0..1
  pointerY: number, // 0..1
  maxDeg = 3,
): { rotateX: number; rotateY: number } {
  // Inset from centre: -0.5..+0.5.
  const dx = pointerX - 0.5;
  const dy = pointerY - 0.5;
  // Y-tilt: pointer at the top tilts the card forward (negative rotateX).
  return {
    rotateX: -dy * 2 * maxDeg,
    rotateY: dx * 2 * maxDeg,
  };
}

/**
 * `prefers-reduced-motion`: when true, all transitions should snap to
 * their final state. Use this in every component that respects the user.
 */
export const reducedMotionTransition: Transition = { duration: 0 };

/* ── All exports bundled ──────────────────────────────────────────────── */

export const motionPresets = {
  heroReveal: heroRevealTransition,
  heroSecondary: heroSecondaryTransition,
  tabCinematic: tabCinematicTransition,
  pillSlide: pillSlideTransition,
  countUp: countUpTransition,
  gaugeSweep: gaugeSweepTransition,
  cardHover: cardHoverTransition,
  iconPulse: iconPulseTransition,
  cascadeParent,
  cascadeChild,
  heroCascadeParent,
  heroCascadeChild,
  tabContentVariants,
  // Backward-compatible aliases for the old presets object shape.
  tab: tabTransition,
  listItem: listItemTransition,
  fadeIn: fadeInTransition,
  heroSpring: heroRevealTransition,
  staggerContainer: cascadeParent,
  staggerItem: cascadeChild,
} as const;