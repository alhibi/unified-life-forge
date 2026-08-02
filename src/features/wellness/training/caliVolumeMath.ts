/**
 * Bodyweight-specific math.
 *
 * Calisthenics doesn't use kg-based volume meaningfully — a "set of 10
 * push-ups" is not 10 kg. Instead the right unit is *intensity-weighted
 * rep equivalents*. This module converts a step into kg-equivalent based
 * on its difficulty multiplier so the analytics charts can show the user's
 * calisthenics progress alongside their barbell progress.
 *
 * The multipliers are anchored: a standard push-up is "1.0x bodyweight at
 * 65% effective load" (the average chest- share). One-arm push-up
 * is ~6× harder. Numbers come from EMG studies and the Steven Low /
 * Eric Tronell intensity tables.
 */

import { SKILLS_BY_KEY } from './caliSkillTree';
import type { SkillDef, SkillProgressionStep } from './types';

/* ─────────────────────── Difficulty multipliers ─────────────────────── */

/**
 * Multiplier on bodyweight for a step. 1.0 = standard push-up baseline.
 * Holds use a different unit (sec) but get a multiplier as well so they
 * convert cleanly to kg-equivalents per second.
 */
const STEP_INTENSITY: Record<string, Record<string, number>> = {
  pushUp: {
    wall: 0.20, incline: 0.45, knee: 0.55, standard: 1.0,
    diamond: 1.25, decline: 1.30, archer: 2.50, one_arm: 6.0,
  },
  pullUp: {
    dead_hang: 0.50, scapular: 0.70, negative: 1.10, band_assisted: 0.90,
    standard: 1.40, wide: 1.50, lsit_pullup: 1.85, archer: 2.20, typewriter: 2.50,
  },
  dip: {
    bench_dip: 0.45, negative_dip: 1.10, parallel: 1.50, ring_dip: 1.75,
    weighted: 2.20, korean: 2.40,
  },
  squat: {
    assisted: 0.50, air: 0.80, split: 1.00, bulgarian: 1.30,
    cossack: 1.50, pistol_neg: 1.80, pistol: 2.00, shrimp: 2.30,
  },
  lSit: {
    foot_supp: 0.40, one_leg: 0.70, tuck: 1.00, full_floor: 1.30,
    parallettes: 1.50, v_sit: 2.00, manna: 3.50,
  },
  handstand: {
    wall_plank: 0.60, chest_wall: 0.90, back_wall: 1.10, toe_pull: 1.30,
    free_30: 1.50, hs_walk: 1.80, pike_hspu: 1.70, wall_hspu: 2.00, free_hspu: 2.80,
  },
  frontLever: {
    tuck_hold: 1.20, tuck_raise: 1.40, adv_tuck: 1.60, one_leg: 1.90,
    straddle: 2.30, full: 3.00, fl_pull: 3.50,
  },
  backLever: {
    german_hang: 0.80, tuck_bl: 1.10, adv_tuck_bl: 1.40, one_leg_bl: 1.70,
    straddle_bl: 2.10, full_bl: 2.80,
  },
  planche: {
    lean: 0.80, pseudo_pu: 1.50, frog: 1.20, tuck_pl: 1.60,
    adv_tuck_pl: 2.20, straddle_pl: 3.00, full_pl: 4.00, planche_pu: 5.00,
  },
  muscleUp: {
    high_pull: 1.50, explosive_pull: 1.70, negative: 1.80, kipping: 1.90,
    strict_bar: 2.20, slow_mu: 2.50, ring_mu: 2.40, strict_ring: 2.80,
  },
  humanFlag: {
    side_plank: 0.70, vertical_flag: 1.00, tuck_flag: 1.40, one_leg_flag: 1.80,
    straddle_flag: 2.30, full_flag_5s: 3.00, full_flag_15s: 3.20,
  },
  dragonFlag: {
    hollow_hold: 0.70, tuck_df: 1.10, one_leg_df: 1.40, straddle_df: 1.80,
    full_neg: 2.20, full_3: 2.60, full_8: 2.80,
  },
  nordicCurl: {
    slide: 0.50, top_30: 1.00, top_60: 1.40, full_neg: 2.00,
    partial_concentric: 2.60, full_curl: 3.20,
  },
  press2HS: {
    lsit_30: 1.00, straddle_neg: 1.80, wall_straddle: 2.00,
    straddle_press: 2.40, pike_neg: 2.80, full_pike: 3.50,
  },
};

/* ─────────────────────── Public converters ─────────────────────── */

export function intensityFor(skillKey: string, stepKey: string): number {
  return STEP_INTENSITY[skillKey]?.[stepKey] ?? 1.0;
}

/** Kg-equivalent of a single rep at this step, given user bodyweight. */
export function kgEquivalentRep(
  skillKey: string,
  stepKey: string,
  bodyweightKg: number,
  /** Effective load of a standard push-up vs full BW. */
  baseFraction = 0.65,
): number {
  const mult = intensityFor(skillKey, stepKey);
  return Math.round(bodyweightKg * baseFraction * mult * 10) / 10;
}

/** Total tonnage from a calisthenics workout (sets × reps × kgEquivalent). */
export function caliTonnageKg(
  exercises: { skillKey: string; stepKey: string; sets: number; reps?: number; holdSec?: number }[],
  bodyweightKg: number,
): number {
  let total = 0;
  for (const e of exercises) {
    const kg = kgEquivalentRep(e.skillKey, e.stepKey, bodyweightKg);
    if (e.reps) total += e.sets * e.reps * kg;
    else if (e.holdSec) {
      // Holds: 1 second ≈ 0.5 reps of equivalent intensity (rough).
      total += e.sets * e.holdSec * 0.5 * kg;
    }
  }
  return Math.round(total * 10) / 10;
}

/* ─────────────────────── Bodyweight 1RM equivalent ─────────────────────── */

/**
 * Estimate the kg-equivalent 1RM for a given step. Used when the user wants
 * to compare their calisthenics progress to barbell standards. A "1RM" of
 * a calisthenics movement is the highest-step they can do for one quality
 * rep; we scale by the step intensity.
 */
export function caliOneRmEquivalent(
  skillKey: string,
  stepKey: string,
  bodyweightKg: number,
): number {
  const mult = intensityFor(skillKey, stepKey);
  return Math.round(bodyweightKg * mult * 1.0 * 10) / 10;
}

/* ─────────────────────── Skill ladder helpers ─────────────────────── */

/** Returns the highest step index at which the user has *cleared* the unlock criterion. */
export function highestClearedStep(
  _skillKey: string,
  /** ISO date → cleared step idx for this skill. */
  log: Record<string, number>,
): number {
  let best = -1;
  for (const v of Object.values(log)) {
    if (typeof v === 'number' && v > best) best = v;
  }
  return best;
}

/** Total calisthenics XP — sum of all cleared step intensities. */
export function totalCaliXP(progress: Record<string, number>): number {
  let xp = 0;
  for (const skillKey of Object.keys(progress)) {
    const skill = SKILLS_BY_KEY[skillKey];
    if (!skill) continue;
    const upTo = progress[skillKey] ?? -1;
    for (let i = 0; i <= upTo && i < skill.steps.length; i++) {
      xp += intensityFor(skillKey, skill.steps[i].key) * 10;
    }
  }
  return Math.round(xp);
}

/** Estimated weeks to next step from an average pace baseline. */
export function weeksToNextStep(skill: SkillDef, currentStep: number): number {
  const next = skill.steps[currentStep + 1];
  return next?.weeksAverage ?? 0;
}

/** Skills the user has fully cleared (last step achieved). */
export function masteredSkills(progress: Record<string, number>): SkillDef[] {
  return Object.keys(progress)
    .map((k) => SKILLS_BY_KEY[k])
    .filter((s): s is SkillDef => Boolean(s) && progress[s.key] >= s.steps.length - 1);
}

/** Per-step rep target as kg×reps for the ledger. */
export function repTarget(step: SkillProgressionStep): number {
  if (step.target.holdSec) return step.target.holdSec * (step.target.sets ?? 1);
  return (step.target.reps ?? 0) * (step.target.sets ?? 1);
}
