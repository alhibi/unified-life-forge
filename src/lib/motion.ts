/**
 * Shared motion language for SmartHub.
 *
 * Applies the project's "Obsidian Depth" rules:
 *  - No bounce / overshoot on press feedback (opacity only — handled in CSS).
 *  - Dropdowns & collapsibles use smooth ease-out tweens, never springs.
 *  - UI weight scales duration with element size (small = fast, large = slow).
 *  - Stagger uses an ease-out curve on the delay itself so list reveals feel
 *    organic instead of metronomic.
 *  - Exits mirror enters (spatial consistency) — provided as helpers.
 */

import type { Transition, Variants } from 'framer-motion';

// ── Easing curves ─────────────────────────────────────────
// Smooth (no overshoot). Use these everywhere collapsibles / dropdowns appear.
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

// ── Weight scale ──────────────────────────────────────────
// Pair element size with motion duration. Heavier surfaces move slower so the
// UI feels physical without being slow overall.
export const motionWeight = {
  micro: { duration: 0.1, ease: EASE_OUT },   // ripple, badge, tooltip
  small: { duration: 0.18, ease: EASE_OUT },  // dropdown, snackbar, menu item
  medium: { duration: 0.28, ease: EASE_OUT }, // card, accordion, tab content
  large: { duration: 0.4, ease: EASE_OUT },   // sheet, modal, full-screen panel
  hero:  { duration: 0.55, ease: EASE_OUT },  // page transition, lightbox
} as const satisfies Record<string, Transition>;

// ── Stagger ───────────────────────────────────────────────
// Ease-out on the delay itself — first items appear quickly, later items
// breathe a little. Feels more like a group of people entering a room than a
// metronome.
export function easeOutStagger(index: number, total: number, max = 220): number {
  if (total <= 1) return 0;
  const t = index / (total - 1);
  return t * t * max; // quadratic ease-out on the delay
}

// ── Variants ──────────────────────────────────────────────
// Use these instead of redeclaring identical stagger objects across pages.
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: motionWeight.medium },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: motionWeight.small },
};

// Container that staggers children with an organic (non-linear) cadence.
export const organicStagger = (total: number): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
      when: 'beforeChildren',
      // total is informational — framer-motion handles the cascade. For
      // hand-tuned per-item delay use `easeOutStagger(i, total)` directly.
    },
  },
});

// ── Spatial consistency ───────────────────────────────────
// Dropdowns / popovers exit in the same direction they entered.
export type Direction = 'down' | 'up' | 'left' | 'right';

const offsetFor = (dir: Direction, px = 8) => {
  switch (dir) {
    case 'down': return { y: -px };
    case 'up': return { y: px };
    case 'left': return { x: px };
    case 'right': return { x: -px };
  }
};

export const spatialPopover = (dir: Direction = 'down'): Variants => {
  const off = offsetFor(dir);
  return {
    hidden: { opacity: 0, ...off },
    show: { opacity: 1, x: 0, y: 0, transition: motionWeight.small },
    exit: { opacity: 0, ...off, transition: motionWeight.micro },
  };
};
