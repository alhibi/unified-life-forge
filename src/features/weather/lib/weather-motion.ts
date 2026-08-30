// ============================================================================
// weather-motion — single source of truth for transitions across the weather
// feature. Every component that animates anything pulls its config from here,
// so timings and easings stay coherent — no two tabs feel different.
//
// NAMING CONVENTIONS
//   • easing.*         — curves used by every motion prop
//   • duration.*       — ms durations for the four standard speeds
//   • presets.{tab,listItem,fadeIn,scaleIn}
//                     — ready-made transition objects for the common shapes
//
// WHY CUSTOM EASINGS
//   The defaults (linear / ease-in-out) feel mechanical. The four curves
//   below were tuned by hand against the Zen Elite aesthetic:
//     • standard:  brisk, decisive entry — for tabs and primary reveals
//     • gentle:    soft settle — for chips and metrics
//     • decelerate:  fast in, slow out — for content that arrives from cache
//     • spring:    physical settle — for the hero and headline numbers
// ============================================================================

import type { Transition, Variants } from 'framer-motion';

export const easing = {
  /** Quint-style cubic-bezier for the standard transitions. */
  standard:    [0.22, 1, 0.36, 1] as const,
  /** Slightly softer, slower entry. */
  gentle:      [0.4, 0, 0.2, 1] as const,
  /** Decelerate — fast in, long settle. */
  decelerate:  [0.16, 1, 0.3, 1] as const,
  /** Spring config — physical settle. */
  spring:      [0.34, 1.56, 0.64, 1] as const,
};

export const duration = {
  /** 150ms — micro-interactions: hover, press, toggle. */
  fast:    0.15,
  /** 220ms — small reveals: chips, badges, single tile. */
  base:    0.22,
  /** 320ms — section reveals: tabs, hero content, primary numbers. */
  reveal:  0.32,
  /** 520ms — page-level: full tab transition, layout shift. */
  layout:  0.52,
} as const;

/** Tab content switch — fade + slide. */
export const tabTransition: Transition = {
  duration: duration.reveal,
  ease: easing.standard,
};

/** Single child entering a list — subtle fade + small lift. */
export const listItemTransition: Transition = {
  duration: duration.base,
  ease: easing.gentle,
};

/** Quick fade — for chips and badges. */
export const fadeInTransition: Transition = {
  duration: duration.fast,
  ease: easing.gentle,
};

/** Spring-physics settle for the hero's primary number. */
export const heroSpringTransition: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 28,
  mass: 0.9,
};

/* ── Variants for stagger containers ─────────────────────────────────── */

/** Parent variants — children animate in sequence when the parent mounts. */
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },  // parent stays opaque so the page doesn't flicker
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

/** Children of staggerContainer — small fade + lift, settles fast. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easing.standard },
  },
};

/* ── Ready-made transition bundles ───────────────────────────────────── */

export const motionPresets = {
  tab: tabTransition,
  listItem: listItemTransition,
  fadeIn: fadeInTransition,
  heroSpring: heroSpringTransition,
  staggerContainer,
  staggerItem,
} as const;