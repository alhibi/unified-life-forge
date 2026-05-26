/**
 * Motion language for SmartHub — single source of truth.
 *
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║ STRICT MOTION SYSTEM                                              ║
 * ║                                                                   ║
 * ║ This file is the ONE central animation config. Import MOTION      ║
 * ║ from here for every duration / easing / spring / parallax value.  ║
 * ║ Never hardcode timings or curves at the call site.                ║
 * ║                                                                   ║
 * ║   FORWARD (push):  300ms ease-out-quad, slide R→L + fade,        ║
 * ║                    outgoing screen parallax 35%                  ║
 * ║   BACKWARD (pop):  260ms ease-out-quad, slide L→R + fade,        ║
 * ║                    outgoing screen parallax 35%                  ║
 * ║   MODAL/SHEET:     320ms ease-out-cubic enter,                   ║
 * ║                    260ms ease-in-cubic  exit                     ║
 * ║   FADE:            200ms ease-in-out                              ║
 * ║   SPRING (micro):  stiffness 400, damping 20, mass 1             ║
 * ║                                                                   ║
 * ║ All animated values must be GPU-composited: transform + opacity. ║
 * ║ Never animate width / height / top / left / margin / padding.    ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * Web-platform notes:
 *   • framer-motion drives every animation through requestAnimationFrame,
 *     so motion is automatically synced to the browser's vsync — there
 *     is no setInterval/setTimeout-driven animation anywhere in the app.
 *   • transform + opacity are the only properties we touch, so the
 *     compositor runs them off the main thread (the web equivalent of
 *     the spec's "UI thread only" rule).
 *   • will-change: transform, opacity is applied per-layer in PageTransition.
 *   • prefers-reduced-motion is honored — every transition collapses
 *     to a near-instant cross-fade when the user opts in.
 */

import type { Transition, Variants } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVE TOKENS — durations & cubic-bezier easings
 * ───────────────────────────────────────────────────────────────────── */

/** Numeric durations in **seconds** (framer-motion units). */
export const DURATION = {
  instant: 0.08,
  fast:    0.15,
  normal:  0.25,
  slow:    0.35,
} as const;

/** Tuple type used by framer-motion's `ease` field. */
export type EaseTuple = readonly [number, number, number, number];

// ── Spec easings ────────────────────────────────────────────────────
// `cubic-bezier(0.25, 0.46, 0.45, 0.94)` = ease-out-quad — the
// signature curve for native iOS / Material navigation transitions.
export const EASE_OUT_QUAD:  EaseTuple = [0.25, 0.46, 0.45, 0.94];
export const EASE_OUT_CUBIC: EaseTuple = [0.215, 0.61, 0.355, 1];
export const EASE_IN_CUBIC:  EaseTuple = [0.55, 0.055, 0.675, 0.19];
export const EASE_LINEAR_APP: EaseTuple = [0.25, 0.1, 0.25, 1];
export const EASE_OUT_EXPO:   EaseTuple = [0.16, 1, 0.3, 1];
export const EASE_IN:         EaseTuple = [0.4, 0, 1, 1];
export const EASE_IN_OUT:     EaseTuple = [0.65, 0, 0.35, 1];
export const EASE_SPRING:     EaseTuple = [0.34, 1.56, 0.64, 1];

// Aliases — kept for backward compatibility across the codebase.
export const SPRING_SNAPPY = EASE_SPRING;
export const EASE_OUT      = EASE_OUT_EXPO;
export const SPRING_ENTER  = EASE_OUT_EXPO;
export const SPRING_EXIT   = EASE_IN;
export const SPRING_IOS    = EASE_SPRING;
export const BOUNCE_OPEN   = EASE_OUT_EXPO;
export const BOUNCE_CLOSE  = EASE_IN;

/* ─────────────────────────────────────────────────────────────────────
 * 2. MOTION — the strict spec config object
 *
 * Every screen transition / modal / micro-interaction in the app MUST
 * read from this object. Do not hardcode durations or easings at the
 * call site. If you need a new motion archetype, add it here.
 * ───────────────────────────────────────────────────────────────────── */
export const MOTION = {
  /** Forward (push / enter new screen). */
  push: {
    duration: 0.30,        // 300ms — within the 280–320ms spec band
    ease: EASE_OUT_QUAD,
  } as Transition,

  /** Backward (pop / go back). Slightly faster than push. */
  pop: {
    duration: 0.26,        // 260ms — within the 240–280ms spec band
    ease: EASE_OUT_QUAD,
  } as Transition,

  /**
   * Tab cross-fade. Used when switching between top-level
   * destinations (Home/Games/Chat/...). Vertical micro-motion only —
   * a horizontal slide on every bottom-nav tap is exhausting.
   * 200ms keeps the change instant-feeling without competing with
   * page content.
   */
  tab: {
    duration: 0.20,
    ease: EASE_OUT_EXPO,
  } as Transition,

  /**
   * Tab exit — slightly faster than enter so the outgoing tab gets
   * out of the way while the incoming one settles.
   */
  tabExit: {
    duration: 0.14,
    ease: EASE_IN,
  } as Transition,

  /** Modal / bottom-sheet enter (320ms, ease-out-cubic). */
  modalIn: {
    duration: 0.32,
    ease: EASE_OUT_CUBIC,
  } as Transition,

  /** Modal / bottom-sheet exit (260ms, ease-in-cubic). */
  modalOut: {
    duration: 0.26,
    ease: EASE_IN_CUBIC,
  } as Transition,

  /** Generic fade / cross-fade (200ms, ease-in-out). */
  fade: {
    duration: 0.20,
    ease: EASE_IN_OUT,
  } as Transition,

  /**
   * Toast / snackbar enter (200ms, fade + 8px translateY upward).
   * The 8px offset is consumed by the toast component as `y: -8 → 0`.
   */
  toast: {
    duration: 0.20,
    ease: EASE_OUT_CUBIC,
  } as Transition,

  /** Tap feedback — press-in. */
  pressIn: {
    duration: 0.08,
    ease: EASE_OUT_CUBIC,
  } as Transition,

  /**
   * Tap feedback — press-out. Spring back to rest with iOS bounce.
   * Spec: stiffness 400, damping 20, mass 1.
   */
  pressOut: {
    type: 'spring',
    stiffness: 400,
    damping: 20,
    mass: 1,
  } as Transition,

  /**
   * Generic micro-interaction spring (cards, switches, buttons).
   * Same numbers as pressOut — kept separate so they can diverge.
   */
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 20,
    mass: 1,
  } as Transition,

  /**
   * Swipe-back gesture release spring. Spec calls for stiffness 300,
   * damping 30 — softer than press feedback so the page settles, not snaps.
   */
  swipeBack: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 1,
  } as Transition,

  /**
   * Outgoing-screen travel ratio for parallax depth on push/pop.
   * The screen leaving the viewport moves at 35% of the incoming
   * screen's distance — that is what makes a layered iOS push feel
   * physical instead of flat.
   */
  parallax: 0.35,

  /**
   * Tap-feedback target scale (1.0 → 0.96 on press-in).
   */
  pressScale: 0.96,

  /**
   * Threshold for a swipe-back gesture: progress past this point on
   * release commits the navigation, otherwise it snaps back.
   */
  swipeBackCommit: 0.5,
} as const;

/* ─────────────────────────────────────────────────────────────────────
 * 3. WEIGHT SCALE — element size → duration
 * ───────────────────────────────────────────────────────────────────── */
// Pair element size with motion duration. Heavier surfaces move slower
// so the UI feels physical without being slow overall.
export const motionWeight = {
  micro:  { duration: DURATION.instant, ease: EASE_OUT_EXPO } as Transition,
  small:  { duration: DURATION.fast,    ease: EASE_OUT_EXPO } as Transition,
  medium: { duration: DURATION.normal,  ease: EASE_OUT_EXPO } as Transition,
  large:  { duration: DURATION.slow,    ease: EASE_OUT_EXPO } as Transition,
  hero:   { duration: 0.5,              ease: EASE_OUT_EXPO } as Transition,
} as const;

/* ─────────────────────────────────────────────────────────────────────
 * 4. STAGGER HELPERS
 * ───────────────────────────────────────────────────────────────────── */
// Ease-out on the delay itself — first items appear quickly, later
// items breathe a little. Feels organic, not metronomic.
export function easeOutStagger(index: number, total: number, max = 220): number {
  if (total <= 1) return 0;
  const t = index / (total - 1);
  return t * t * max;
}

/**
 * Tight list stagger — 20ms per item, capped at the 5th item.
 * Long lists are NOT punished: items beyond `cap` use the cap delay.
 */
export function tightStagger(index: number, step = 20, cap = 4): number {
  return Math.min(index, cap) * step;
}

export function tightStaggerStyle(index: number) {
  return {
    animationDelay: `${tightStagger(index)}ms`,
    animationDuration: '250ms',
    animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    animationFillMode: 'both' as const,
  };
}

/* ─────────────────────────────────────────────────────────────────────
 * 5. REUSABLE VARIANTS
 * ───────────────────────────────────────────────────────────────────── */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: motionWeight.medium },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: motionWeight.small },
};

// Container that staggers children with a tight cadence — 20ms per item.
export const organicStagger = (_total?: number): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0,
      when: 'beforeChildren',
    },
  },
});

/* ─────────────────────────────────────────────────────────────────────
 * 6. SPATIAL CONSISTENCY (popovers / dropdowns)
 * ───────────────────────────────────────────────────────────────────── */
export type Direction = 'down' | 'up' | 'left' | 'right';

const offsetFor = (dir: Direction, px = 8) => {
  switch (dir) {
    case 'down':  return { y: -px };
    case 'up':    return { y:  px };
    case 'left':  return { x:  px };
    case 'right': return { x: -px };
  }
};

export const spatialPopover = (dir: Direction = 'down'): Variants => {
  const off = offsetFor(dir);
  return {
    hidden: { opacity: 0, ...off },
    show:   { opacity: 1, x: 0, y: 0, transition: { duration: 0.22, ease: EASE_OUT_EXPO } },
    exit:   { opacity: 0, ...off,    transition: { duration: 0.18, ease: EASE_IN } },
  };
};

/* ─────────────────────────────────────────────────────────────────────
 * 7. PUSH / POP VARIANT FACTORIES
 *
 * Used by <PageTransition/>. Direction-aware (LTR/RTL) and parallax-
 * compliant. The `kind` arg picks between full slide (incoming, x=±100%)
 * and parallax slide (outgoing, x=±MOTION.parallax * 100%).
 * ───────────────────────────────────────────────────────────────────── */
export type NavMode = 'push' | 'pop' | 'replace' | 'tab' | 'initial';

/**
 * Build framer-motion variants for the incoming page in a push/pop.
 *
 *   rtl   — true if the document direction is right-to-left. iOS mirrors
 *           navigation in RTL locales: "forward" comes from the LEFT,
 *           "back" comes from the RIGHT. We mirror that here.
 *   mode  — 'push' or 'pop'.
 */
export function buildPageEnterVariants(rtl: boolean, mode: 'push' | 'pop'): Variants {
  // Forward push: incoming slides in from RIGHT in LTR, from LEFT in RTL.
  // Backward pop: incoming slides in from LEFT in LTR, from RIGHT in RTL.
  const sign = mode === 'push' ? (rtl ? -1 : 1) : (rtl ? 1 : -1);
  const transition = mode === 'push' ? MOTION.push : MOTION.pop;
  return {
    initial: { x: `${sign * 100}%`, opacity: 0 },
    animate: { x: '0%',             opacity: 1, transition },
    // Exit isn't used by the incoming page — AnimatePresence runs exit
    // on the OUTgoing page only. Defined for completeness.
    exit:    { x: `${-sign * MOTION.parallax * 100}%`, opacity: 0, transition },
  };
}

/**
 * Build framer-motion variants for the OUTGOING page in a push/pop.
 * Outgoing travels at `MOTION.parallax` of the incoming distance to
 * create the layered-depth iOS feel.
 */
export function buildPageExitVariants(rtl: boolean, mode: 'push' | 'pop'): Variants {
  const sign = mode === 'push' ? (rtl ? -1 : 1) : (rtl ? 1 : -1);
  const transition = mode === 'push' ? MOTION.push : MOTION.pop;
  const ratio = MOTION.parallax * 100;
  return {
    // Outgoing starts at rest...
    initial: { x: '0%',                            opacity: 1 },
    // ...stays at rest on its own animate cycle...
    animate: { x: '0%',                            opacity: 1, transition },
    // ...and exits in the opposite direction at parallax ratio.
    exit:    { x: `${-sign * ratio}%`,             opacity: 0, transition },
  };
}

/**
 * Vertical fade-up used for tab switches and replace navigations.
 * Horizontal slide on tab switches feels distracting on repeated taps,
 * so we keep tabs to a fast vertical micro-motion that still reads as
 * a navigation event without competing with the page content.
 */
export const tabFadeUpVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT_EXPO } },
  exit:    { opacity: 0, y: 0, transition: { duration: 0.14, ease: EASE_IN } },
};

/**
 * Reduced-motion fallback — instant cross-fade.
 */
export const reducedMotionVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.10, ease: 'linear' as const } },
  exit:    { opacity: 0, transition: { duration: 0.07, ease: 'linear' as const } },
};

/* ─────────────────────────────────────────────────────────────────────
 * 8. PERSISTENT TAB LAYER VARIANTS
 *
 * The bottom-nav exposes three small, hot tabs (Home / Games / Chat)
 * that stay mounted via display:none for instant switching. When the
 * user navigates AWAY from a tab to a deep sub-page, this whole layer
 * has to leave the viewport — and it MUST follow the same strict push
 * / pop slide rule as every other page, otherwise the user sees an
 * inconsistent fade-while-slide overlap.
 *
 * These variants are applied via AnimatePresence in <PersistentTabs>
 * in App.tsx. They mirror buildVariants() in PageTransition.tsx so the
 * outgoing layer slides out at the parallax ratio (35%) — the same
 * physical depth cue iOS uses on UINavigationController push.
 * ───────────────────────────────────────────────────────────────────── */
export function buildTabLayerVariants(rtl: boolean): Variants {
  // Same sign convention as the page transition: positive x = "from
  // right". For RTL we mirror so push enters from the LEFT.
  const exitSign = (m: NavMode): number => {
    if (m === 'push') return rtl ?  1 : -1;
    if (m === 'pop')  return rtl ? -1 :  1;
    return 0;
  };
  const enterSign = (m: NavMode): number => {
    if (m === 'push') return rtl ? -1 :  1;
    if (m === 'pop')  return rtl ?  1 : -1;
    return 0;
  };

  return {
    initial: (m: NavMode) => {
      // First mount of the layer — render at rest. Tab→tab swaps stay
      // here too because we keep the AnimatePresence key stable.
      if (m === 'initial' || m === 'tab' || m === 'replace') {
        return { opacity: 1, x: 0 };
      }
      // Re-entering the tab layer from a sub-page (pop). Slide back in
      // from the appropriate edge at parallax ratio so the entrance
      // mirrors the way we left.
      return { opacity: 0, x: `${enterSign(m) * MOTION.parallax * 100}%` };
    },
    animate: (m: NavMode) => ({
      opacity: 1,
      x: '0%',
      transition: m === 'pop' ? MOTION.pop : MOTION.push,
    }),
    exit: (m: NavMode) => {
      // Tab/replace/initial don't slide — instant.
      if (m === 'tab' || m === 'replace' || m === 'initial') {
        return { opacity: 0, x: 0, transition: MOTION.fade };
      }
      // Push/pop — the tab layer leaves at parallax ratio in the
      // direction OPPOSITE the incoming page. This is what gives the
      // layered iOS depth feel without any opacity-fade overlap.
      return {
        opacity: 0,
        x: `${exitSign(m) * MOTION.parallax * 100}%`,
        transition: m === 'push' ? MOTION.push : MOTION.pop,
      };
    },
  };
}
