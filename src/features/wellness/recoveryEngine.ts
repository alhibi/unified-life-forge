/**
 * Recovery & readiness scoring engine.
 *
 * Pure, offline. Composite scores out of 100 derived from the user's
 * recent vitals + skin-hair logs + workout load. Mirrors the high-level
 * idea behind WHOOP recovery / Oura readiness scores — adapted to the
 * data this app actually collects.
 *
 *   • recoveryScore     – how well the body has bounced back: HRV vs baseline,
 *                         resting HR vs baseline, sleep duration + quality,
 *                         subjective muscle soreness.
 *   • readinessScore    – can you train hard today: recovery + stress + energy
 *                         + ACWR penalty if load is spiking.
 *   • sleepScore        – isolated sleep quality (hours×quality, weighted).
 *   • strainScore       – yesterday's training strain (0-21 like WHOOP).
 *
 * Every score is null when there isn't enough data — the UI shows "—".
 *
 * SOURCING — these engines now consume `WellnessSources` from
 * `wellnessLink.ts` and read fields through resolvers, so every tab
 * sees the same numbers. Stale data (>2 days old) returns
 * `score = null` with a `staleSince` flag so the UI can prompt the
 * user to log instead of misleading them with last week's value.
 */

import type { VitalLog, SkinHairLog, WorkoutSession } from './wellnessDb';
import { todayIso } from './wellnessDb';
import { acwr } from './athleticEngine';
import {
  resolveSleepHours, resolveEnergy, resolveHydrationToday,
  freshness, type WellnessSources,
} from './wellnessLink';

export type ScoreZone = 'low' | 'moderate' | 'good' | 'optimal';

export function scoreZone(value: number): ScoreZone {
  if (value < 33) return 'low';
  if (value < 67) return 'moderate';
  if (value < 85) return 'good';
  return 'optimal';
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Build a baseline (mean) of a numeric field over the most recent
 * 28 days, excluding the latest log so we measure today against history.
 */
function baseline<T>(
  logs: T[],
  field: (l: T) => number | undefined,
  excludeLatest = true,
  windowDays = 28,
): number | null {
  if (logs.length === 0) return null;
  // logs are newest-first per wellnessDb sort.
  const slice = excludeLatest ? logs.slice(1, windowDays + 1) : logs.slice(0, windowDays);
  const values: number[] = [];
  for (const l of slice) {
    const v = field(l);
    if (isNum(v) && v > 0) values.push(v);
  }
  if (values.length < 3) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/* ────────────────────── Sub-scores ────────────────────── */

/** HRV component — higher than baseline = better. 50 = at baseline. */
function hrvComponent(latest: VitalLog | null, base: number | null): number | null {
  if (!latest || !isNum(latest.hrv) || !base || base <= 0) return null;
  // ±25% range maps to 0..100, baseline = 50.
  const ratio = latest.hrv / base;
  return clamp(50 + (ratio - 1) * 200);
}

/**
 * Resting HR — LOWER than baseline = better.
 *
 * v2: factor reduced 500 → 250. Old value made the score swing by
 * 50 points for a ±10% RHR change which is well within day-to-day
 * noise. New mapping: a sustained 20% drop is needed to saturate
 * to "100" — closer to how WHOOP/Oura grade RHR.
 */
function rhrComponent(latest: VitalLog | null, base: number | null): number | null {
  if (!latest || !isNum(latest.restingHR) || !base || base <= 0) return null;
  const ratio = latest.restingHR / base;
  return clamp(50 - (ratio - 1) * 250);
}

/** Sleep duration component — 8h ≈ 100, 4h ≈ 0. */
function sleepDurationComponent(hours?: number | null): number | null {
  if (!isNum(hours) || hours <= 0) return null;
  // Penalize both ends — sweet spot 7-9 h.
  if (hours >= 7 && hours <= 9.5) return 100;
  if (hours < 7)  return clamp((hours / 7) * 100);
  return clamp(100 - (hours - 9.5) * 12);
}

/** Sleep quality — direct 1-5 → 0-100. */
function sleepQualityComponent(q?: number): number | null {
  if (!isNum(q) || q <= 0) return null;
  return clamp(((q - 1) / 4) * 100);
}

/** Subjective soreness — 1 = fresh, 5 = wrecked → invert to 100..0. */
function sorenessComponent(s?: number): number | null {
  if (!isNum(s) || s <= 0) return null;
  return clamp(100 - ((s - 1) / 4) * 100);
}

/** Stress (1-5) — invert. */
function stressComponent(s?: number): number | null {
  if (!isNum(s) || s <= 0) return null;
  return clamp(100 - ((s - 1) / 4) * 100);
}

/** Subjective energy (1-5). */
function energyComponent(e?: number | null): number | null {
  if (!isNum(e) || e <= 0) return null;
  return clamp(((e - 1) / 4) * 100);
}

/**
 * Hydration component — uses *real* hydration target (35 ml/kg) rather
 * than the legacy `waterGlasses` field which only the SkinHair tab fed.
 * Returns null when we don't even know the user's weight to score
 * against.
 */
function hydrationComponentFromMl(currentMl: number, targetMl: number | null): number | null {
  if (!targetMl || targetMl <= 0) return null;
  if (currentMl <= 0) return 0;
  return clamp((currentMl / targetMl) * 100);
}

/** Average + null-skip helper. */
function avgScores(parts: Array<{ value: number | null; weight: number }>): number | null {
  let sumW = 0;
  let sumV = 0;
  let any = false;
  for (const p of parts) {
    if (p.value == null) continue;
    sumV += p.value * p.weight;
    sumW += p.weight;
    any = true;
  }
  if (!any || sumW <= 0) return null;
  return Math.round(sumV / sumW);
}

/* ─────────────────────── Composite scores ─────────────────────── */

export interface RecoveryReport {
  score: number | null;             // 0..100
  zone: ScoreZone | null;
  components: {
    hrv: number | null;
    restingHR: number | null;
    sleep: number | null;
    soreness: number | null;
  };
  baselines: {
    hrv: number | null;
    restingHR: number | null;
  };
  /** True when we had at least one fresh signal to score from. */
  hasData: boolean;
  /** Set when score is null because all signals are >2 days old. */
  staleSince?: string | null;
}

/**
 * Build a recovery report from the unified wellness sources.
 *
 * Backward-compat: callers that still pass `(vitals, skinHair)` arrays
 * are upgraded by the wrapper below.
 */
export function recoveryScore(s: WellnessSources): RecoveryReport;
export function recoveryScore(vitals: VitalLog[], skinHair: SkinHairLog[]): RecoveryReport;
export function recoveryScore(
  arg1: WellnessSources | VitalLog[],
  arg2?: SkinHairLog[],
): RecoveryReport {
  const sources: WellnessSources = Array.isArray(arg1)
    ? { profile: null, vitals: arg1, skinHair: arg2 ?? [], hydration: [], workouts: [], dietLogs: [] }
    : arg1;

  const fresh = freshness(sources);
  const today = todayIso();
  const empty: RecoveryReport = {
    score: null,
    zone: null,
    components: { hrv: null, restingHR: null, sleep: null, soreness: null },
    baselines: { hrv: null, restingHR: null },
    hasData: false,
    staleSince: fresh.latestDate,
  };
  if (!fresh.fresh) return empty;

  const { vitals, skinHair } = sources;
  const latestV = vitals[0] ?? null;
  const latestSh = skinHair[0] ?? null;

  const hrvBase = baseline(vitals, (v) => v.hrv, true, 28);
  const rhrBase = baseline(vitals, (v) => v.restingHR, true, 28);

  const hrv = hrvComponent(latestV, hrvBase);
  const rhr = rhrComponent(latestV, rhrBase);

  // Sleep — read for the latest known date, not just from raw newest array
  const latestDate = fresh.latestDate ?? today;
  const sleepHours = resolveSleepHours(sources, latestDate);
  const sleepDur = sleepDurationComponent(sleepHours);
  const sleepQual = sleepQualityComponent(latestV?.sleepQuality);
  const sleep = avgScores([
    { value: sleepDur,  weight: 2 },
    { value: sleepQual, weight: 1 },
  ]);

  const sore = sorenessComponent(latestSh?.muscleSoreness);

  const score = avgScores([
    { value: hrv,      weight: 3 },   // best objective signal
    { value: rhr,      weight: 2 },
    { value: sleep,    weight: 3 },
    { value: sore,     weight: 1 },
  ]);

  return {
    score,
    zone: score != null ? scoreZone(score) : null,
    components: { hrv, restingHR: rhr, sleep, soreness: sore },
    baselines: { hrv: hrvBase, restingHR: rhrBase },
    hasData: score != null,
    staleSince: null,
  };
}

export interface ReadinessReport {
  score: number | null;
  zone: ScoreZone | null;
  recommendation:
    | 'go_hard'
    | 'normal'
    | 'easy'
    | 'rest'
    | null;
  components: {
    recovery: number | null;
    energy: number | null;
    stress: number | null;
    hydration: number | null;
    loadPenalty: number;       // 0..100 (subtracted)
  };
  hasData: boolean;
  staleSince?: string | null;
}

/**
 * Compute readiness from the unified wellness sources.
 *
 * Hydration component now uses *real* hydration_events vs the user's
 * weight-based target — same data the Today tab shows in its ring —
 * instead of the SkinHair `waterGlasses` field which most users never
 * touch.
 */
export function readinessScore(s: WellnessSources): ReadinessReport;
export function readinessScore(p: {
  vitals: VitalLog[];
  skinHair: SkinHairLog[];
  workouts: WorkoutSession[];
}): ReadinessReport;
export function readinessScore(
  arg: WellnessSources | { vitals: VitalLog[]; skinHair: SkinHairLog[]; workouts: WorkoutSession[] },
): ReadinessReport {
  const sources: WellnessSources = 'profile' in arg
    ? arg
    : {
        profile: null,
        vitals: arg.vitals,
        skinHair: arg.skinHair,
        hydration: [],
        workouts: arg.workouts,
        dietLogs: [],
      };

  const fresh = freshness(sources);
  const recovery = recoveryScore(sources);
  const latestSh = sources.skinHair[0] ?? null;
  const latestDate = fresh.latestDate ?? todayIso();

  if (!fresh.fresh) {
    return {
      score: null,
      zone: null,
      recommendation: null,
      components: {
        recovery: recovery.score,
        energy: null,
        stress: null,
        hydration: null,
        loadPenalty: 0,
      },
      hasData: false,
      staleSince: fresh.latestDate,
    };
  }

  const energy = energyComponent(resolveEnergy(sources, latestDate));
  const stress = stressComponent(latestSh?.stress);

  // Hydration: prefer real ml from hydration_events for today, vs the
  // user's weight-derived target. If we have weight we score it.
  let hydration: number | null = null;
  const weightKg = sources.profile?.weightKg
    ?? (sources.vitals.find((v) => v.weightKg)?.weightKg ?? null);
  if (weightKg && weightKg > 0) {
    const targetMl = 35 * weightKg;
    const currentMl = resolveHydrationToday(sources);
    hydration = hydrationComponentFromMl(currentMl, targetMl);
  }

  const ar = acwr(sources.workouts);
  let loadPenalty = 0;
  if (ar) {
    if (ar.zone === 'caution') loadPenalty = 8;
    else if (ar.zone === 'danger') loadPenalty = 18;
    else if (ar.zone === 'undertraining') loadPenalty = 0;
  }

  const base = avgScores([
    { value: recovery.score, weight: 4 },
    { value: energy,         weight: 2 },
    { value: stress,         weight: 1.5 },
    { value: hydration,      weight: 1 },
  ]);
  const score = base != null ? clamp(base - loadPenalty) : null;

  let rec: ReadinessReport['recommendation'] = null;
  if (score != null) {
    if (score >= 80) rec = 'go_hard';
    else if (score >= 60) rec = 'normal';
    else if (score >= 40) rec = 'easy';
    else rec = 'rest';
  }

  return {
    score,
    zone: score != null ? scoreZone(score) : null,
    recommendation: rec,
    components: {
      recovery: recovery.score,
      energy,
      stress,
      hydration,
      loadPenalty,
    },
    hasData: score != null,
    staleSince: null,
  };
}

/* ─────────────────────── Sleep score ─────────────────────── */

export function sleepScore(latestVital: VitalLog | null, latestSkinHair: SkinHairLog | null): number | null {
  const hours =
    (latestVital && latestVital.sleepHours) ??
    (latestSkinHair && latestSkinHair.sleepHours);
  const dur = sleepDurationComponent(hours ?? undefined);
  const qual = sleepQualityComponent(latestVital?.sleepQuality);
  const merged = avgScores([
    { value: dur,  weight: 2 },
    { value: qual, weight: 1 },
  ]);
  return merged;
}

/* ─────────────────────── Strain (training load) ─────────────────────── */

/**
 * Strain on a 0-21 scale (WHOOP-style). Computed from yesterday's session
 * load relative to the user's chronic 28-day baseline.
 */
export function strainScore(workouts: WorkoutSession[]): number | null {
  const ar = acwr(workouts);
  if (!ar) return null;
  // Map ratio 0..2 → 0..21, clamped.
  const v = clamp(ar.ratio * 14, 0, 21);
  return Math.round(v * 10) / 10;
}

/* ─────────────────────── Trend helper ─────────────────────── */

export interface TrendPoint {
  date: string;
  recovery: number | null;
  readiness: number | null;
}

/**
 * Build a per-day series of recovery/readiness over the last `days` days.
 * Only the most recent day is "exact" — older days reuse the running
 * baselines and the day's snapshot of vitals/skin/workouts to compute a
 * historical estimate. Good enough for a sparkline.
 *
 * NOTE: this is a sparkline-quality estimate. We disable freshness
 * gating here (since by definition these are historical points) so the
 * line keeps drawing instead of dropping to null.
 */
export function dailyScoreSeries(
  vitals: VitalLog[],
  skinHair: SkinHairLog[],
  workouts: WorkoutSession[],
  days = 14,
): TrendPoint[] {
  const out: TrendPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${dd}`;
    const vitalsCut = vitals.filter((v) => v.date <= iso);
    const skinCut = skinHair.filter((s) => s.date <= iso);
    const workoutsCut = workouts.filter((w) => w.date <= iso);

    // Historical sparkline — uses the internal *Legacy helpers which
    // bypass the freshness gate (we are intentionally rendering past
    // days, so "stale" doesn't apply).
    const r = vitalsCut.length || skinCut.length
      ? recoveryScoreLegacy(vitalsCut, skinCut)
      : null;
    const ready = vitalsCut.length || skinCut.length
      ? readinessScoreLegacy(vitalsCut, skinCut, workoutsCut)
      : null;
    out.push({ date: iso, recovery: r, readiness: ready });
  }
  return out;
}

/**
 * Internal: sparkline-only path that recomputes recovery/readiness
 * directly from the supplied arrays without the freshness gate.
 */
function recoveryScoreLegacy(vitals: VitalLog[], skinHair: SkinHairLog[]): number | null {
  if (vitals.length === 0 && skinHair.length === 0) return null;
  const latestV = vitals[0] ?? null;
  const latestSh = skinHair[0] ?? null;
  const hrvBase = baseline(vitals, (v) => v.hrv, true, 28);
  const rhrBase = baseline(vitals, (v) => v.restingHR, true, 28);
  const hrv = hrvComponent(latestV, hrvBase);
  const rhr = rhrComponent(latestV, rhrBase);
  const sleepHours =
    (latestV && latestV.sleepHours) ?? (latestSh && latestSh.sleepHours);
  const sleepDur = sleepDurationComponent(sleepHours);
  const sleepQual = sleepQualityComponent(latestV?.sleepQuality);
  const sleep = avgScores([
    { value: sleepDur,  weight: 2 },
    { value: sleepQual, weight: 1 },
  ]);
  const sore = sorenessComponent(latestSh?.muscleSoreness);
  return avgScores([
    { value: hrv,    weight: 3 },
    { value: rhr,    weight: 2 },
    { value: sleep,  weight: 3 },
    { value: sore,   weight: 1 },
  ]);
}

function readinessScoreLegacy(
  vitals: VitalLog[],
  skinHair: SkinHairLog[],
  workouts: WorkoutSession[],
): number | null {
  const recovery = recoveryScoreLegacy(vitals, skinHair);
  const latestV = vitals[0] ?? null;
  const latestSh = skinHair[0] ?? null;
  const energy = energyComponent(latestV?.energy ?? latestSh?.muscleEnergy);
  const stress = stressComponent(latestSh?.stress);
  const ar = acwr(workouts);
  let loadPenalty = 0;
  if (ar) {
    if (ar.zone === 'caution') loadPenalty = 8;
    else if (ar.zone === 'danger') loadPenalty = 18;
  }
  const base = avgScores([
    { value: recovery, weight: 4 },
    { value: energy,   weight: 2 },
    { value: stress,   weight: 1.5 },
  ]);
  return base != null ? clamp(base - loadPenalty) : null;
}

/* ─────────────────────── Streaks ─────────────────────── */

/**
 * Count consecutive days from today backwards where `predicate(iso)`
 * returns true. Stops at the first false (with optional tolerance to
 * skip rest days).
 *
 * @param predicate function called with each day's local YYYY-MM-DD
 * @param maxDays   safety cap (default 365)
 * @param gapTolerance how many missed days in a row are allowed
 *        before the streak is considered broken. Default 0 = strict.
 *        Set this to 1 for things like "training days" where rest
 *        days are healthy and shouldn't reset the streak.
 */
export function streakBackwards(
  predicate: (iso: string) => boolean,
  maxDays = 365,
  gapTolerance = 0,
): number {
  const today = new Date();
  let count = 0;
  let consecutiveMisses = 0;
  for (let i = 0; i < maxDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${dd}`;
    if (predicate(iso)) {
      count++;
      consecutiveMisses = 0;
    } else {
      consecutiveMisses++;
      if (consecutiveMisses > gapTolerance) break;
    }
  }
  return count;
}
