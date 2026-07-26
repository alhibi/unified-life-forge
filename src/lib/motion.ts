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
 * ║ Four navigation characters ship, selectable in                    ║
 * ║ /settings/motion → "نمط انتقال الشاشات":                          ║
 * ║                                                                   ║
 * ║   silk    cross-fade only. No transform, NO delay. The default.   ║
 * ║   depth   Material-3-expressive scale + fade.                     ║
 * ║   slide   iOS push/pop with a parallax tail.                      ║
 * ║   instant no animation.                                           ║
 * ║                                                                   ║
 * ║ Three easing families ship, selectable in the same screen:        ║
 * ║   silk (zero overshoot anywhere) · standard (M3) · expressive.     ║
 * ║                                                                   ║
 * ║ All animated values must be GPU-composited: transform + opacity.  ║
 * ║ Never animate width / height / top / left / margin / padding.     ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * Web-platform notes:
 *   • framer-motion drives every animation through requestAnimationFrame,
 *     so motion is automatically synced to the browser's vsync — there
 *     is no setInterval/setTimeout-driven animation anywhere in the app.
 *   • transform + opacity are the only properties we touch, so the
 *     compositor runs them off the main thread.
 *   • prefers-reduced-motion AND the in-app "تقليل الحركة" switch are
 *     both honored — every transition collapses to a near-instant
 *     cross-fade when either is on.
 *   • Every duration in this file is mutated in place by
 *     `src/lib/motionRuntime.ts` when the user changes the speed
 *     multiplier, so the objects here are the live values, not a copy.
 */

import type { Transition, Variants } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────────
 * 1. PRIMITIVE TOKENS — durations & cubic-bezier easings
 * ───────────────────────────────────────────────────────────────────── */

/** Numeric durations in **seconds** (framer-motion units). */
export const DURATION = {
  instant: 0.08,
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
} as const;

/** Tuple type used by framer-motion's `ease` field. */
export type EaseTuple = readonly [number, number, number, number];

// ── Spec easings ────────────────────────────────────────────────────
// `cubic-bezier(0.25, 0.46, 0.45, 0.94)` = ease-out-quad — the
// signature curve for native iOS / Material navigation transitions.
export const EASE_OUT_QUAD: EaseTuple = [0.25, 0.46, 0.45, 0.94];
export const EASE_OUT_CUBIC: EaseTuple = [0.215, 0.61, 0.355, 1];
export const EASE_IN_CUBIC: EaseTuple = [0.55, 0.055, 0.675, 0.19];
export const EASE_LINEAR_APP: EaseTuple = [0.25, 0.1, 0.25, 1];
export const EASE_OUT_EXPO: EaseTuple = [0.16, 1, 0.3, 1];
export const EASE_IN: EaseTuple = [0.4, 0, 1, 1];
export const EASE_IN_OUT: EaseTuple = [0.65, 0, 0.35, 1];
export const EASE_SPRING: EaseTuple = [0.34, 1.56, 0.64, 1];

/* ── Khushu / Material 3 Expressive easings ─────────────────────────
 *   EmphasizedEasing         = cubic-bezier(0.2, 0.0, 0.0, 1.0)
 *   EnterEasing (decelerate) = cubic-bezier(0.0, 0.0, 0.2, 1.0)
 *   ExitEasing  (accelerate) = cubic-bezier(0.4, 0.0, 1.0, 1.0) */
export const EASE_M3_EMPHASIZED: EaseTuple = [0.2, 0.0, 0.0, 1.0];
export const EASE_M3_DECELERATE: EaseTuple = [0.0, 0.0, 0.2, 1.0];
export const EASE_M3_ACCELERATE: EaseTuple = [0.4, 0.0, 1.0, 1.0];

/* ── Silk easings ───────────────────────────────────────────────────
 * The brief asked for motion that never overshoots and never appears to
 * hesitate. These are out-quint / in-quad style curves: they leave rest
 * immediately, decelerate hard, and land exactly on target with no
 * rebound. `SILK_OUT` is the one curve used by every enter in the silk
 * profile, which is why the whole app reads as a single gesture. */
export const EASE_SILK_OUT: EaseTuple = [0.22, 1, 0.36, 1];
export const EASE_SILK_IN: EaseTuple = [0.4, 0, 0.9, 1];
export const EASE_SILK_IN_OUT: EaseTuple = [0.5, 0, 0.2, 1];

// Aliases — kept for backward compatibility across the codebase.
export const SPRING_SNAPPY = EASE_SPRING;
export const EASE_OUT = EASE_OUT_EXPO;
export const SPRING_ENTER = EASE_OUT_EXPO;
export const SPRING_EXIT = EASE_IN;
export const SPRING_IOS = EASE_SPRING;
export const BOUNCE_OPEN = EASE_OUT_EXPO;
export const BOUNCE_CLOSE = EASE_IN;

/* ─────────────────────────────────────────────────────────────────────
 * 2. EASING PROFILES
 *
 * A profile is the complete curve family the app speaks. `motionRuntime`
 * writes the chosen profile's curves into `ACTIVE_EASE` (for framer) and
 * onto `<html>` as `--motion-ease-*` (for CSS), so switching profile is
 * felt by framer-motion, Radix/tailwindcss-animate, vaul and sonner at
 * the same moment.
 * ───────────────────────────────────────────────────────────────────── */

export type EasingProfileId = 'silk' | 'standard' | 'expressive';

export interface EasingFamily {
  /** Screen transitions and long emphasised moves. */
  nav: EaseTuple;
  /** Anything appearing: overlays, list items, enter legs. */
  enter: EaseTuple;
  /** Anything leaving. */
  exit: EaseTuple;
  /** Symmetric moves (cross-fades, colour changes). */
  inOut: EaseTuple;
  /** Tap feedback. The only place a profile is allowed to overshoot. */
  press: EaseTuple;
  /** Whether this family's springs are permitted to overshoot at all. */
  allowsOvershoot: boolean;
}

export const EASING_FAMILIES: Record<EasingProfileId, EasingFamily> = {
  silk: {
    nav: EASE_SILK_OUT,
    enter: EASE_SILK_OUT,
    exit: EASE_SILK_IN,
    inOut: EASE_SILK_IN_OUT,
    press: EASE_SILK_OUT,
    allowsOvershoot: false,
  },
  standard: {
    nav: EASE_M3_EMPHASIZED,
    enter: EASE_M3_DECELERATE,
    exit: EASE_M3_ACCELERATE,
    inOut: EASE_IN_OUT,
    press: EASE_OUT_CUBIC,
    allowsOvershoot: false,
  },
  expressive: {
    nav: EASE_OUT_EXPO,
    enter: EASE_OUT_EXPO,
    exit: EASE_IN_CUBIC,
    inOut: EASE_IN_OUT,
    press: EASE_SPRING,
    allowsOvershoot: true,
  },
};

/**
 * The live easing family. Mutated in place by `applyEasingProfile` so every
 * variant factory below picks the new curves up on its next call without any
 * component needing to re-render.
 */
export const ACTIVE_EASE: EasingFamily = { ...EASING_FAMILIES.silk };

/** The profile id currently installed — read by the settings screen. */
export const ACTIVE_EASE_STATE = { profile: 'silk' as EasingProfileId };

/* ─────────────────────────────────────────────────────────────────────
 * 3. MOTION — the strict spec config object
 *
 * Every screen transition / modal / micro-interaction in the app MUST
 * read from this object. Do not hardcode durations or easings at the
 * call site. If you need a new motion archetype, add it here.
 *
 * `ease` fields are intentionally NOT `as const`: `applyEasingProfile`
 * rewrites them when the user changes profile.
 * ───────────────────────────────────────────────────────────────────── */
export const MOTION = {
  /** Forward push — incoming sub-screen (depth / slide styles). */
  push: {
    duration: 0.35,
    ease: EASE_M3_EMPHASIZED,
  } as Transition,

  /** Backward pop — outgoing sub-screen. */
  pop: {
    duration: 0.35,
    ease: EASE_M3_EMPHASIZED,
  } as Transition,

  /** Tab swap — between top-level destinations. */
  tab: {
    duration: 0.35,
    ease: EASE_M3_EMPHASIZED,
  } as Transition,

  /** Tab exit — paired with `tab`. */
  tabExit: {
    duration: 0.35,
    ease: EASE_M3_EMPHASIZED,
  } as Transition,

  /** Modal / bottom-sheet enter. */
  modalIn: {
    duration: 0.32,
    ease: EASE_OUT_CUBIC,
  } as Transition,

  /** Modal / bottom-sheet exit. */
  modalOut: {
    duration: 0.26,
    ease: EASE_IN_CUBIC,
  } as Transition,

  /** Generic fade / cross-fade. */
  fade: {
    duration: 0.2,
    ease: EASE_IN_OUT,
  } as Transition,

  /**
   * Toast / snackbar enter (fade + 8px translateY upward).
   * The 8px offset is consumed by the toast component as `y: -8 → 0`.
   */
  toast: {
    duration: 0.2,
    ease: EASE_OUT_CUBIC,
  } as Transition,

  /** Tap feedback — press-in. */
  pressIn: {
    duration: 0.08,
    ease: EASE_OUT_CUBIC,
  } as Transition,

  /** Tap feedback — press-out. Settle back to rest. */
  pressOut: {
    type: 'spring',
    stiffness: 300,
    damping: 28,
    mass: 1,
  } as Transition,

  /**
   * Generic micro-interaction spring (cards, switches, buttons).
   * Same numbers as pressOut — kept separate so they can diverge.
   */
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 28,
    mass: 1,
  } as Transition,

  /** Swipe-back gesture release spring. */
  swipeBack: {
    type: 'spring',
    stiffness: 300,
    damping: 28,
    mass: 1,
  } as Transition,

  /**
   * Outgoing-screen parallax ratio, used by the `slide` navigation style
   * and scaled by the amplitude preference.
   */
  parallax: 0.35,

  /* ── Silk navigation primitives ──────────────────────────────────
   * The default character. Two curves, zero transform, zero delay:
   * the incoming screen starts fading the instant the route commits,
   * and the outgoing one is already on its way out. Because nothing
   * is interpolating geometry there is no layout work per frame,
   * which is what makes it hold 120 Hz on a mid-range phone. */
  /** Screen ENTER — silk style. */
  navSilkEnter: {
    duration: 0.22,
    ease: EASE_SILK_OUT,
  } as Transition,
  /** Screen EXIT — silk style. Shorter than the enter so the two overlap. */
  navSilkExit: {
    duration: 0.14,
    ease: EASE_SILK_IN,
  } as Transition,

  /* ── Depth navigation primitives (per-property) ─────────────────── */
  /** Subscreen ENTER — fade leg. */
  navFadeEnter: {
    duration: 0.24,
    delay: 0.05,
    ease: EASE_M3_DECELERATE,
  } as Transition,
  /** Subscreen EXIT — fade leg. */
  navFadeExit: {
    duration: 0.1,
    ease: EASE_M3_ACCELERATE,
  } as Transition,
  /** Tab ENTER — fade leg. */
  navFadeTabEnter: {
    duration: 0.24,
    delay: 0.07,
    ease: EASE_M3_DECELERATE,
  } as Transition,
  /** Scale leg shared by the depth navigation style. */
  navScale: {
    duration: 0.35,
    ease: EASE_M3_EMPHASIZED,
  } as Transition,

  /* ── Khushu scale ratios ────────────────────────────────────────── */
  scalePushFrom: 0.85,
  scalePushTo: 0.95,
  scalePopFrom: 0.95,
  scalePopTo: 0.85,
  scaleTab: 0.92,

  /**
   * Transient-surface (menu / popover / select / dialog) enter and exit.
   * Kept separate from `modalIn/Out` so a menu can be quicker than a
   * full-screen sheet without either one drifting from the system.
   */
  overlayIn: {
    duration: 0.16,
    ease: EASE_SILK_OUT,
  } as Transition,
  overlayOut: {
    duration: 0.12,
    ease: EASE_SILK_IN,
  } as Transition,

  /**
   * Expand / collapse of an accordion, disclosure row or inline card.
   * Deliberately a tween and never a spring: a spring on a height makes
   * the content below it oscillate, which is exactly the "ارتداد" the
   * brief rules out.
   */
  collapseOpen: {
    duration: 0.26,
    ease: EASE_SILK_OUT,
  } as Transition,
  collapseClose: {
    duration: 0.2,
    ease: EASE_SILK_IN,
  } as Transition,

  /**
   * Tap-feedback target scale (1.0 → 0.96 on press-in).
   * The live per-element value comes from `--ui-interaction-scale`, which
   * the interface platform owns; this is the framer-side fallback.
   */
  pressScale: 0.96,

  /**
   * Threshold for a swipe-back gesture: progress past this point on
   * release commits the navigation, otherwise it snaps back.
   */
  swipeBackCommit: 0.5,
};

/* ─────────────────────────────────────────────────────────────────────
 * 4. WEIGHT SCALE — element size → duration
 * ───────────────────────────────────────────────────────────────────── */
export const motionWeight = {
  micro: { duration: DURATION.instant, ease: EASE_SILK_OUT } as Transition,
  small: { duration: DURATION.fast, ease: EASE_SILK_OUT } as Transition,
  medium: { duration: DURATION.normal, ease: EASE_SILK_OUT } as Transition,
  large: { duration: DURATION.slow, ease: EASE_SILK_OUT } as Transition,
  hero: { duration: 0.5, ease: EASE_SILK_OUT } as Transition,
};

/* ─────────────────────────────────────────────────────────────────────
 * 5. STAGGER HELPERS
 * ───────────────────────────────────────────────────────────────────── */
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
    animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
    animationFillMode: 'both' as const,
  };
}

/* ─────────────────────────────────────────────────────────────────────
 * 6. REUSABLE VARIANTS
 * ───────────────────────────────────────────────────────────────────── */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: motionWeight.medium },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: motionWeight.small },
};

/**
 * Canonical page-level stagger primitives. `pageStagger.show.transition`
 * is mutated in place by `applyListStagger`, so the cadence preference
 * reaches every page that uses these two variants — which is all of them.
 */
export const pageStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, when: 'beforeChildren' } },
};

export const pageItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: motionWeight.medium },
};

/** The unscaled baseline cadence, in seconds per child. */
export const BASE_STAGGER_CHILDREN = 0.05;

// Container that staggers children with a tight cadence.
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
 * 7. SPATIAL CONSISTENCY (popovers / dropdowns)
 * ───────────────────────────────────────────────────────────────────── */
export type Direction = 'down' | 'up' | 'left' | 'right';

const offsetFor = (dir: Direction, px = 8) => {
  switch (dir) {
    case 'down':
      return { y: -px };
    case 'up':
      return { y: px };
    case 'left':
      return { x: px };
    case 'right':
      return { x: -px };
  }
};

export const spatialPopover = (dir: Direction = 'down'): Variants => {
  const off = offsetFor(dir);
  return {
    hidden: { opacity: 0, ...off },
    show: { opacity: 1, x: 0, y: 0, transition: MOTION.overlayIn },
    exit: { opacity: 0, ...off, transition: MOTION.overlayOut },
  };
};

/* ─────────────────────────────────────────────────────────────────────
 * 8. NAVIGATION VARIANTS
 * ───────────────────────────────────────────────────────────────────── */
export type NavMode = 'push' | 'pop' | 'replace' | 'tab' | 'initial';
export type NavStyleId = 'silk' | 'depth' | 'slide' | 'instant';

/** Human-readable metadata for the settings screen. */
export const NAV_STYLE_META: readonly {
  id: NavStyleId;
  label: string;
  note: string;
}[] = [
  { id: 'silk', label: 'حريري', note: 'تلاشٍ نقي بلا إزاحة وبلا تأخير — الأنعم والأسرع' },
  { id: 'depth', label: 'عمق', note: 'تكبير وتلاشٍ متوازيان بطابع ماتيريال ٣' },
  { id: 'slide', label: 'انزلاق', note: 'دفع أفقي مع ذيل parallax بطابع iOS' },
  { id: 'instant', label: 'فوري', note: 'بلا حركة — تبديل مباشر للشاشة' },
];

/**
 * Pull the exiting screen out of flow so the incoming one can occupy the
 * same coordinate space. Required because our motion.div is nested inside
 * <Routes>/<ErrorBoundary> and popLayout only does this for direct motion
 * children.
 */
const EXIT_POSITIONAL = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
};

/** A leave that takes no time at all but still vacates the layout. */
const INSTANT_EXIT = {
  ...EXIT_POSITIONAL,
  opacity: 0,
  transition: { duration: 0 },
};

/**
 * Build the framer-motion variants for a page wrapper.
 *
 * Function-style variants take `custom` (the NavMode) and resolve to the
 * right offset + transition for that mode. AnimatePresence forwards
 * `custom` to both initial+animate (from the motion.div's own prop) and
 * exit (from the AnimatePresence's `custom` prop) — which is how the
 * OUTGOING page learns the direction the user just chose.
 */
export function buildNavVariants(style: NavStyleId, rtl: boolean): Variants {
  if (style === 'instant') {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1, transition: { duration: 0 } },
      exit: () => ({ ...INSTANT_EXIT }),
    };
  }

  if (style === 'silk') {
    // Pure cross-fade. Nothing to mirror for RTL, nothing to delay.
    return {
      initial: (m: NavMode) => (m === 'initial' ? { opacity: 1 } : { opacity: 0 }),
      animate: (m: NavMode) => ({
        opacity: 1,
        transition: m === 'initial' ? { duration: 0 } : MOTION.navSilkEnter,
      }),
      exit: (m: NavMode) => {
        // A tab→tab swap must not leave a second full screen in the flow.
        if (m === 'tab' || m === 'initial') {
          return { ...INSTANT_EXIT, display: 'none', pointerEvents: 'none' };
        }
        return { ...EXIT_POSITIONAL, opacity: 0, transition: MOTION.navSilkExit };
      },
    };
  }

  if (style === 'slide') {
    // iOS push/pop. Forward comes from the reading edge, so RTL mirrors.
    const enterSign = (m: NavMode) => (m === 'pop' ? (rtl ? 1 : -1) : rtl ? -1 : 1);
    return {
      initial: (m: NavMode) => {
        if (m === 'initial') return { opacity: 1, x: '0%' };
        if (m === 'replace' || m === 'tab') return { opacity: 0, x: '0%' };
        return { opacity: 0, x: `${enterSign(m) * 100}%` };
      },
      animate: (m: NavMode) => ({
        opacity: 1,
        x: '0%',
        transition: m === 'initial' ? { duration: 0 } : m === 'pop' ? MOTION.pop : MOTION.push,
      }),
      exit: (m: NavMode) => {
        if (m === 'tab' || m === 'initial') {
          return { ...INSTANT_EXIT, display: 'none', pointerEvents: 'none' };
        }
        if (m === 'replace') {
          return { ...EXIT_POSITIONAL, opacity: 0, x: '0%', transition: MOTION.fade };
        }
        const ratio = MOTION.parallax * 100;
        return {
          ...EXIT_POSITIONAL,
          opacity: 0,
          x: `${-enterSign(m) * ratio}%`,
          transition: m === 'pop' ? MOTION.pop : MOTION.push,
        };
      },
    };
  }

  /* depth — Material 3 Expressive scale + fade. */
  return {
    initial: (m: NavMode) => {
      if (m === 'initial') return { opacity: 1, scale: 1 };
      if (m === 'replace') return { opacity: 0, scale: 1 };
      if (m === 'tab') return { opacity: 0, scale: MOTION.scaleTab };
      if (m === 'pop') return { opacity: 0, scale: MOTION.scalePopFrom };
      /* push */ return { opacity: 0, scale: MOTION.scalePushFrom };
    },
    animate: (m: NavMode) => {
      if (m === 'initial') return { opacity: 1, scale: 1, transition: { duration: 0 } };
      if (m === 'replace') return { opacity: 1, scale: 1, transition: MOTION.fade };
      return {
        opacity: 1,
        scale: 1,
        transition: {
          opacity: m === 'tab' ? MOTION.navFadeTabEnter : MOTION.navFadeEnter,
          scale: MOTION.navScale,
        },
      };
    },
    exit: (m: NavMode) => {
      if (m === 'tab' || m === 'initial') {
        return {
          ...INSTANT_EXIT,
          display: 'none',
          visibility: 'hidden',
          scale: 1,
          pointerEvents: 'none',
        };
      }
      if (m === 'replace') {
        return { ...EXIT_POSITIONAL, opacity: 0, scale: 1, transition: MOTION.fade };
      }
      const target = m === 'push' ? MOTION.scalePushTo : MOTION.scalePopTo;
      return {
        ...EXIT_POSITIONAL,
        opacity: 0,
        scale: target,
        transition: {
          opacity: MOTION.navFadeExit,
          scale: MOTION.navScale,
        },
      };
    },
  };
}

/**
 * Legacy factories kept so any caller that still imports them keeps
 * compiling. `buildNavVariants` is the one to use.
 */
export function buildPageEnterVariants(rtl: boolean, mode: 'push' | 'pop'): Variants {
  const sign = mode === 'push' ? (rtl ? -1 : 1) : rtl ? 1 : -1;
  const transition = mode === 'push' ? MOTION.push : MOTION.pop;
  return {
    initial: { x: `${sign * 100}%`, opacity: 0 },
    animate: { x: '0%', opacity: 1, transition },
    exit: { x: `${-sign * MOTION.parallax * 100}%`, opacity: 0, transition },
  };
}

export function buildPageExitVariants(rtl: boolean, mode: 'push' | 'pop'): Variants {
  const sign = mode === 'push' ? (rtl ? -1 : 1) : rtl ? 1 : -1;
  const transition = mode === 'push' ? MOTION.push : MOTION.pop;
  const ratio = MOTION.parallax * 100;
  return {
    initial: { x: '0%', opacity: 1 },
    animate: { x: '0%', opacity: 1, transition },
    exit: { x: `${-sign * ratio}%`, opacity: 0, transition },
  };
}

/** Vertical fade-up used for tab switches and replace navigations. */
export const tabFadeUpVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: MOTION.overlayIn },
  exit: { opacity: 0, y: 0, transition: MOTION.overlayOut },
};

/** Reduced-motion fallback — instant cross-fade, no transform. */
export const reducedMotionVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.09, ease: 'linear' as const } },
  exit: { opacity: 0, transition: { duration: 0.06, ease: 'linear' as const } },
};

/** The reduced-motion page wrapper: cross-fade only, but still vacates flow. */
export const REDUCED_MOTION_NAV_VARIANTS: Variants = {
  initial: { opacity: 0, x: 0, y: 0, scale: 1 },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: { duration: 0.09, ease: 'linear' as const },
  },
  exit: () => ({
    ...EXIT_POSITIONAL,
    opacity: 0,
    x: 0,
    y: 0,
    scale: 1,
    transition: { duration: 0.06, ease: 'linear' as const },
  }),
};

/* ─────────────────────────────────────────────────────────────────────
 * 9. PERSISTENT TAB LAYER VARIANTS
 *
 * The three hot tabs (Home / Games / Chat) stay mounted via display:none
 * for instant switching. When the user navigates AWAY from a tab to a
 * deep sub-page, this whole layer has to leave the viewport — and it
 * must follow the SAME navigation character as every other page,
 * otherwise the user sees two different transitions overlap.
 * ───────────────────────────────────────────────────────────────────── */
export function buildTabLayerVariants(rtl: boolean, style: NavStyleId = 'silk'): Variants {
  if (style === 'instant') {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1, transition: { duration: 0 } },
      exit: () => ({
        opacity: 0,
        display: 'none',
        pointerEvents: 'none',
        transition: { duration: 0 },
      }),
    };
  }

  if (style === 'silk') {
    return {
      initial: (m: NavMode) =>
        m === 'initial' || m === 'tab' || m === 'replace' ? { opacity: 1 } : { opacity: 0 },
      animate: () => ({ opacity: 1, transition: MOTION.navSilkEnter }),
      exit: (m: NavMode) => {
        if (m === 'tab' || m === 'replace' || m === 'initial') {
          return {
            opacity: 0,
            display: 'none',
            pointerEvents: 'none',
            transition: { duration: 0 },
          };
        }
        return { opacity: 0, transition: MOTION.navSilkExit };
      },
    };
  }

  if (style === 'slide') {
    const sign = (m: NavMode) => (m === 'pop' ? (rtl ? 1 : -1) : rtl ? -1 : 1);
    return {
      initial: (m: NavMode) => {
        if (m === 'initial' || m === 'tab' || m === 'replace') return { opacity: 1, x: '0%' };
        return { opacity: 0, x: `${sign(m) * 100}%` };
      },
      animate: (m: NavMode) => ({
        opacity: 1,
        x: '0%',
        transition: m === 'pop' ? MOTION.pop : MOTION.push,
      }),
      exit: (m: NavMode) => {
        if (m === 'tab' || m === 'replace' || m === 'initial') {
          return {
            opacity: 0,
            x: '0%',
            display: 'none',
            pointerEvents: 'none',
            transition: { duration: 0 },
          };
        }
        return {
          opacity: 0,
          x: `${-sign(m) * MOTION.parallax * 100}%`,
          transition: m === 'pop' ? MOTION.pop : MOTION.push,
        };
      },
    };
  }

  /* depth */
  return {
    initial: (m: NavMode) => {
      if (m === 'initial' || m === 'tab' || m === 'replace') return { opacity: 1, scale: 1 };
      if (m === 'pop') return { opacity: 0, scale: MOTION.scalePopFrom };
      return { opacity: 0, scale: MOTION.scalePushFrom };
    },
    animate: () => ({
      opacity: 1,
      scale: 1,
      transition: {
        opacity: MOTION.navFadeEnter,
        scale: MOTION.navScale,
      },
    }),
    exit: (m: NavMode) => {
      if (m === 'tab' || m === 'replace' || m === 'initial') {
        return {
          opacity: 0,
          scale: 1,
          display: 'none',
          pointerEvents: 'none',
          transition: { duration: 0 },
        };
      }
      const target = m === 'push' ? MOTION.scalePushTo : MOTION.scalePopTo;
      return {
        opacity: 0,
        scale: target,
        transition: {
          opacity: MOTION.navFadeExit,
          scale: MOTION.navScale,
        },
      };
    },
  };
}

/** The reduced-motion tab layer: cross-fade only. */
export const REDUCED_MOTION_TAB_LAYER_VARIANTS: Variants = {
  initial: { opacity: 0, x: 0, scale: 1 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.09, ease: 'linear' as const } },
  exit: { opacity: 0, x: 0, scale: 1, transition: { duration: 0.06, ease: 'linear' as const } },
};
