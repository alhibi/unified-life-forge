/**
 * Progression engine — the brain of the training subsystem.
 *
 * Pure, deterministic, no React, no IO. Given a current snapshot and a rule,
 * it returns the next prescription. Used by the active session (to suggest
 * the next set), by the program player (to advance week-over-week), and by
 * the volume/PR analytics.
 *
 * Sources:
 *   • RPE → %1RM table — Tuchscherer / RTS
 *   • RIR scale         — Helms / Zourdos (2014, 2016)
 *   • 1RM formulas      — Epley, Brzycki, Lombardi, Wathan, O'Conner
 *   • Greyskull, 531    — Wendler / Greyskull LP literature
 *   • Madcow & GZCLP    — Cody Lefever's progression notes
 */

import type { SetEntry, WorkoutSession } from '../wellnessDb';
import type { PrescribedSet, ProgressionRule } from './types';

/* ────────────────── 1RM formulas ────────────────── */

/** Epley: classic, accurate at 2-8 reps. */
export const epley = (w: number, r: number): number => w * (1 + r / 30);

/** Brzycki: best for r ≤ 10, breaks at higher reps. */
export const brzycki = (w: number, r: number): number =>
  r >= 37 ? w : (w * 36) / (37 - r);

/** Lombardi: gentle at high reps. */
export const lombardi = (w: number, r: number): number => w * Math.pow(r, 0.1);

/** Wathan: standard ACE/ACSM curriculum. */
export const wathan = (w: number, r: number): number =>
  (100 * w) / (48.8 + 53.8 * Math.exp(-0.075 * r));

/** O'Conner: very lenient at moderate reps. */
export const oconner = (w: number, r: number): number => w * (1 + 0.025 * r);

/**
 * Robust 1RM estimate — averages four formulas. For r=1 returns the actual
 * weight. For invalid input returns null. Caps reps at 20 to avoid wild
 * extrapolation; the high-rep regime uses Lombardi which is the only one
 * that doesn't blow up.
 */
export function estimate1RM(weightKg: number, reps: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return null;
  if (weightKg <= 0 || reps < 1) return null;
  if (reps === 1) return Math.round(weightKg * 10) / 10;
  const r = Math.min(20, reps);
  let sum = 0;
  let n = 0;
  sum += epley(weightKg, r); n++;
  if (r <= 10) { sum += brzycki(weightKg, r); n++; }
  sum += lombardi(weightKg, r); n++;
  sum += wathan(weightKg, r); n++;
  if (r <= 12) { sum += oconner(weightKg, r); n++; }
  return Math.round((sum / n) * 10) / 10;
}

/** Best 1RM across all sets of an exercise. */
export function bestE1RMFromSets(sets: SetEntry[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    if (s.weightKg && s.reps && s.weightKg > 0 && s.reps > 0) {
      const v = estimate1RM(s.weightKg, s.reps);
      if (v != null && (best == null || v > best)) best = v;
    }
  }
  return best;
}

/** Inverse: given 1RM and target reps, predicts the appropriate weight. */
export function predictWeightFor(oneRm: number, targetReps: number): number | null {
  if (!Number.isFinite(oneRm) || !Number.isFinite(targetReps)) return null;
  if (oneRm <= 0 || targetReps < 1) return null;
  if (targetReps === 1) return Math.round(oneRm * 10) / 10;
  // Invert Epley: w = 1RM / (1 + r/30)
  const w = oneRm / (1 + Math.min(20, targetReps) / 30);
  return Math.round(w * 10) / 10;
}

/* ────────────────── RPE / RIR tables ────────────────── */

/**
 * Tuchscherer/RTS RPE → %1RM table. Rows are reps (1..12), columns are RPE
 * (10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6).
 *
 * Read as: "RPE-N at R reps means lifting that % of your true 1RM".
 */
const RPE_TABLE: number[][] = [
  // RPE: 10    9.5   9     8.5   8     7.5   7     6.5   6
  /* 1 */ [100, 97.7, 95.5, 93.5, 91.5, 89.2, 86.7, 83.7, 80.7],
  /* 2 */ [95.5, 93.5, 91.5, 89.2, 86.7, 83.7, 80.7, 77.4, 74.0],
  /* 3 */ [91.5, 89.2, 86.7, 83.7, 80.7, 77.4, 74.0, 70.7, 67.5],
  /* 4 */ [86.7, 83.7, 80.7, 77.4, 74.0, 70.7, 67.5, 64.2, 61.0],
  /* 5 */ [80.7, 77.4, 74.0, 70.7, 67.5, 64.2, 61.0, 57.8, 54.7],
  /* 6 */ [77.4, 74.0, 70.7, 67.5, 64.2, 61.0, 57.8, 54.7, 51.7],
  /* 7 */ [74.0, 70.7, 67.5, 64.2, 61.0, 57.8, 54.7, 51.7, 48.8],
  /* 8 */ [70.7, 67.5, 64.2, 61.0, 57.8, 54.7, 51.7, 48.8, 46.0],
  /* 9 */ [67.5, 64.2, 61.0, 57.8, 54.7, 51.7, 48.8, 46.0, 43.4],
  /* 10*/ [64.2, 61.0, 57.8, 54.7, 51.7, 48.8, 46.0, 43.4, 40.9],
  /* 11*/ [61.0, 57.8, 54.7, 51.7, 48.8, 46.0, 43.4, 40.9, 38.5],
  /* 12*/ [57.8, 54.7, 51.7, 48.8, 46.0, 43.4, 40.9, 38.5, 36.3],
];

const RPE_COLS = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6];

function nearestRpeCol(rpe: number): number {
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < RPE_COLS.length; i++) {
    const d = Math.abs(RPE_COLS[i] - rpe);
    if (d < bestDiff) { bestDiff = d; bestIdx = i; }
  }
  return bestIdx;
}

/** Returns the percentage of 1RM corresponding to (reps, RPE). */
export function pct1RmForRpe(reps: number, rpe: number): number | null {
  if (!Number.isFinite(reps) || !Number.isFinite(rpe)) return null;
  const r = Math.max(1, Math.min(12, Math.round(reps)));
  const col = nearestRpeCol(rpe);
  return RPE_TABLE[r - 1][col];
}

/** Predict the weight to lift for a target rep count at a given RPE. */
export function weightForRpe(oneRm: number, reps: number, rpe: number): number | null {
  const pct = pct1RmForRpe(reps, rpe);
  if (pct == null || !Number.isFinite(oneRm) || oneRm <= 0) return null;
  return Math.round(oneRm * (pct / 100) * 2) / 2; // round to nearest 0.5 kg
}

/** Convert RIR (reps in reserve) to RPE on the standard 1-10 scale. */
export function rirToRpe(rir: number): number {
  if (!Number.isFinite(rir) || rir < 0) return 10;
  return Math.max(1, 10 - rir);
}

export function rpeToRir(rpe: number): number {
  return Math.max(0, 10 - rpe);
}

/* ────────────────── Velocity & autoregulation ────────────────── */

/**
 * Given a target RPE band [low, high] and the user's last set's actual
 * RPE, return the adjustment in kg for the next set. Useful for "follow
 * the prescribed RPE" auto-pilot.
 */
export function autoregulateNextWeight(p: {
  prescribedRpe: number;
  actualRpe: number;
  currentWeightKg: number;
  /** Step granularity — typically 2.5 kg for compounds, 1 kg for accessories. */
  stepKg?: number;
}): number {
  const step = p.stepKg ?? 2.5;
  const diff = p.actualRpe - p.prescribedRpe;
  // Each RPE-point off → ~3-4% adjustment. Use 1 step per point.
  if (Math.abs(diff) < 0.5) return Math.round(p.currentWeightKg * 2) / 2;
  const sign = diff > 0 ? -1 : 1; // too hard → drop, too easy → add
  const stepsAway = Math.round(Math.abs(diff));
  return Math.round((p.currentWeightKg + sign * step * stepsAway) * 2) / 2;
}

/* ────────────────── Linear progression ────────────────── */

/**
 * Apply a linear-progression rule between sessions. Adds the appropriate
 * weight to "upper" / "lower" / "press" lifts based on which compound the
 * exercise belongs to.
 *
 * Heuristic: if exercise key contains "squat"/"deadlift"/"hinge" → lower;
 * if contains "press"/"ohp" → press; otherwise upper.
 */
export function applyLinearProgression(p: {
  exerciseKey: string;
  currentWeightKg: number;
  rule: { addKgUpper: number; addKgLower: number; addKgPress: number };
  failed?: boolean;
}): number {
  const key = p.exerciseKey.toLowerCase();
  const isLower = /squat|deadlift|hinge|leg|hip/.test(key);
  const isPress = /\bpress\b|ohp|push.?press|incline|overhead/.test(key) && !isLower;
  const add = isLower ? p.rule.addKgLower : isPress ? p.rule.addKgPress : p.rule.addKgUpper;
  if (p.failed) {
    // Deload 10% on failure (Stronglifts rule)
    return Math.round(p.currentWeightKg * 0.9 * 2) / 2;
  }
  return Math.round((p.currentWeightKg + add) * 2) / 2;
}

/* ────────────────── Double progression ────────────────── */

/**
 * Double progression: progress reps within a band first; once the top of
 * the band is hit on every set, add weight and reset to the bottom of the band.
 *
 * Returns the prescription for the next session.
 */
export function applyDoubleProgression(p: {
  currentWeightKg: number;
  lastReps: number[];
  topRepRange: [number, number];
  addKg: number;
}): { weightKg: number; targetReps: number } {
  const [low, high] = p.topRepRange;
  const allTopped = p.lastReps.length > 0 && p.lastReps.every((r) => r >= high);
  if (allTopped) {
    return {
      weightKg: Math.round((p.currentWeightKg + p.addKg) * 2) / 2,
      targetReps: low,
    };
  }
  const minLast = Math.min(...p.lastReps);
  return {
    weightKg: p.currentWeightKg,
    targetReps: Math.min(high, Math.max(low, minLast + 1)),
  };
}

/* ────────────────── 5/3/1 helpers ────────────────── */

/** Wendler 5/3/1: TM = 90% of the user's true 1RM. */
export function trainingMaxFromOneRm(oneRm: number, pct = 0.9): number {
  return Math.round(oneRm * pct * 2) / 2;
}

export interface FiveThreeOneCycle {
  /** Week 1: 65, 75, 85 × 5+ */
  week1: PrescribedSet[];
  /** Week 2: 70, 80, 90 × 3+ */
  week2: PrescribedSet[];
  /** Week 3: 75, 85, 95 × 1+ */
  week3: PrescribedSet[];
  /** Week 4: 40, 50, 60 × 5 (deload) */
  week4: PrescribedSet[];
}

export function build531Cycle(trainingMax: number): FiveThreeOneCycle {
  const r = (pct: number, reps: number, amrap = false): PrescribedSet => ({
    pct1RM: pct,
    weightKg: Math.round(trainingMax * (pct / 100) / 2.5) * 2.5,
    reps,
    amrap,
  });
  return {
    week1: [r(40, 5), r(50, 5), r(60, 5), r(65, 5), r(75, 5), r(85, 5, true)],
    week2: [r(40, 5), r(50, 5), r(60, 3), r(70, 3), r(80, 3), r(90, 3, true)],
    week3: [r(40, 5), r(50, 5), r(60, 3), r(75, 5), r(85, 3), r(95, 1, true)],
    week4: [r(40, 5), r(50, 5), r(60, 5)],
  };
}

/* ────────────────── GreySkull AMRAP ────────────────── */

/**
 * GreySkull rule: last set is AMRAP. Reps above 5 → add 5kg next session
 * for upper, 7.5 for lower. Reps below 5 → deload 10%.
 */
export function applyGreyskull(p: {
  currentWeightKg: number;
  amrapReps: number;
  isLower: boolean;
}): number {
  const minReps = 5;
  if (p.amrapReps < minReps) {
    return Math.round(p.currentWeightKg * 0.9 * 2) / 2;
  }
  if (p.amrapReps >= 10) {
    const add = p.isLower ? 7.5 : 5;
    return Math.round((p.currentWeightKg + add) * 2) / 2;
  }
  const add = p.isLower ? 5 : 2.5;
  return Math.round((p.currentWeightKg + add) * 2) / 2;
}

/* ────────────────── GZCLP wave ────────────────── */

/**
 * GZCLP T1: 5×3+ at TM_high, T2: 3×10 at TM_mid, T3: 3×15 at TM_low.
 * On AMRAP > target, add weight; on miss, regress to next phase.
 */
export interface GzclpPhase {
  tier: 'T1' | 'T2' | 'T3';
  pct: number;
  sets: number;
  reps: number;
  isAmrap: boolean;
}

export const GZCLP_PHASES: GzclpPhase[] = [
  { tier: 'T1', pct: 85, sets: 5, reps: 3, isAmrap: true },
  { tier: 'T1', pct: 80, sets: 6, reps: 2, isAmrap: true },
  { tier: 'T1', pct: 75, sets: 10, reps: 1, isAmrap: true },
  { tier: 'T2', pct: 65, sets: 3, reps: 10, isAmrap: false },
  { tier: 'T2', pct: 60, sets: 3, reps: 8, isAmrap: false },
  { tier: 'T2', pct: 55, sets: 3, reps: 6, isAmrap: false },
];

/* ────────────────── Periodisation rule applier ────────────────── */

/**
 * Single entry point: given a rule and the user's last performance, return
 * the next prescription delta in kg/reps. Components dispatch on the rule
 * `kind` and call the matching helper above.
 */
export function applyProgressionRule(p: {
  rule: ProgressionRule;
  exerciseKey: string;
  currentWeightKg: number;
  lastReps?: number[];
  amrapReps?: number;
  trainingMax?: number;
  failed?: boolean;
  weekIdx?: number;
}): { weightKg: number; reps?: number; deload?: boolean } {
  const { rule } = p;
  switch (rule.kind) {
    case 'linear':
      return {
        weightKg: applyLinearProgression({
          exerciseKey: p.exerciseKey,
          currentWeightKg: p.currentWeightKg,
          rule,
          failed: p.failed,
        }),
      };
    case 'double': {
      const last = p.lastReps ?? [];
      if (last.length === 0) return { weightKg: p.currentWeightKg, reps: rule.topRepRange[0] };
      const dp = applyDoubleProgression({
        currentWeightKg: p.currentWeightKg,
        lastReps: last,
        topRepRange: rule.topRepRange,
        addKg: rule.addKg,
      });
      return { weightKg: dp.weightKg, reps: dp.targetReps };
    }
    case 'amrap': {
      const reps = p.amrapReps ?? 0;
      if (reps < rule.minReps) {
        return { weightKg: Math.round(p.currentWeightKg * 0.9 * 2) / 2, deload: true };
      }
      const add = reps >= 10 ? rule.addKgWhenAbove * 2 : rule.addKgWhenAbove;
      return { weightKg: Math.round((p.currentWeightKg + add) * 2) / 2 };
    }
    case '531': {
      const w = p.weekIdx ?? 1;
      if (!p.trainingMax) return { weightKg: p.currentWeightKg };
      if (w === 4) return { weightKg: Math.round(p.trainingMax * 0.6 * 2) / 2, deload: true };
      const top = w === 1 ? 0.85 : w === 2 ? 0.9 : 0.95;
      return { weightKg: Math.round(p.trainingMax * top * 2) / 2 };
    }
    case 'percent':
      return { weightKg: p.currentWeightKg };
    case 'autoreg':
      return { weightKg: p.currentWeightKg };
    case 'none':
    default:
      return { weightKg: p.currentWeightKg };
  }
}

/* ────────────────── Volume / training-load helpers ────────────────── */

export function setTonnageKg(s: SetEntry): number {
  if (!s.weightKg || !s.reps || s.weightKg <= 0 || s.reps <= 0) return 0;
  return s.weightKg * s.reps;
}

export function sessionVolumeKg(s: WorkoutSession): number {
  let total = 0;
  for (const ex of s.exercises) {
    for (const set of ex.sets) total += setTonnageKg(set);
  }
  return Math.round(total * 10) / 10;
}

/** Foster sRPE: session_RPE × duration_min — gold-standard internal load. */
export function sessionLoadSrpe(s: WorkoutSession): number | null {
  if (!s.sessionRpe) return null;
  const dur = s.endedAt && s.startedAt ? (s.endedAt - s.startedAt) / 60_000 : null;
  if (!dur || dur <= 0) return null;
  return Math.round(s.sessionRpe * dur);
}

/** Density = volume per minute. Useful for HIIT/conditioning comparisons. */
export function sessionDensityKgPerMin(s: WorkoutSession): number | null {
  const dur = s.endedAt && s.startedAt ? (s.endedAt - s.startedAt) / 60_000 : null;
  if (!dur || dur <= 0) return null;
  return Math.round((sessionVolumeKg(s) / dur) * 10) / 10;
}

/** Acute = avg load last N days. */
export function rollingLoad(workouts: WorkoutSession[], days: number): number {
  const cutoff = Date.now() - days * 86_400_000;
  let sum = 0;
  let n = 0;
  for (const w of workouts) {
    if (w.startedAt < cutoff) continue;
    const l = sessionLoadSrpe(w);
    if (l != null) { sum += l; n++; }
  }
  return n === 0 ? 0 : Math.round(sum / days);
}

/* ────────────────── Tempo notation ────────────────── */

export interface TempoSpec {
  eccentric: number; // seconds lowering
  pause: number; // seconds at bottom
  concentric: number; // seconds lifting (X = explosive)
  lockout: number; // seconds at top
}

export function parseTempo(notation: string | undefined): TempoSpec | null {
  if (!notation) return null;
  const parts = notation.split('-').map((p) => p.trim());
  if (parts.length !== 4) return null;
  const conv = (s: string): number =>
    s.toUpperCase() === 'X' ? 0 : Number.parseInt(s, 10);
  const t = {
    eccentric: conv(parts[0]),
    pause: conv(parts[1]),
    concentric: conv(parts[2]),
    lockout: conv(parts[3]),
  };
  if (Object.values(t).some((v) => !Number.isFinite(v))) return null;
  return t;
}

export function formatTempo(t: TempoSpec): string {
  const fmt = (v: number, isConcentric = false): string =>
    isConcentric && v === 0 ? 'X' : String(v);
  return `${fmt(t.eccentric)}-${fmt(t.pause)}-${fmt(t.concentric, true)}-${fmt(t.lockout)}`;
}

/** Estimated time-under-tension per rep, in seconds. */
export function timeUnderTensionSec(t: TempoSpec, reps = 1): number {
  const perRep = t.eccentric + t.pause + Math.max(t.concentric, 1) + t.lockout;
  return perRep * reps;
}

/* ────────────────── Wilks score (relative-strength comparison) ────────────────── */

/**
 * Wilks Coefficient — historical IPF formula. Used to compare lifters of
 * different bodyweights. For modern use, IPF GL is preferred but Wilks is
 * still ubiquitous in calculators.
 *
 *   total = squat1RM + bench1RM + deadlift1RM
 *   score = total × 500 / poly(bodyweight, sex)
 */
const WILKS_M = [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8];
const WILKS_F = [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8];

export function wilks(totalKg: number, bodyweightKg: number, sex: 'male' | 'female'): number | null {
  const c = sex === 'female' ? WILKS_F : WILKS_M;
  if (!Number.isFinite(totalKg) || !Number.isFinite(bodyweightKg)) return null;
  if (totalKg <= 0 || bodyweightKg <= 0) return null;
  const x = bodyweightKg;
  const denom = c[0] + c[1] * x + c[2] * x ** 2 + c[3] * x ** 3 + c[4] * x ** 4 + c[5] * x ** 5;
  if (Math.abs(denom) < 0.0001) return null;
  return Math.round((totalKg * 500) / denom);
}
