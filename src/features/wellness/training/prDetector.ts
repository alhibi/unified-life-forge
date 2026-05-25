/**
 * Personal Record detector — given the historic workout list and a "newly
 * completed" session, returns every PR that was just set across the five
 * tracked record kinds:
 *
 *   • max_weight  — heaviest single rep
 *   • max_reps    — most reps at any working weight
 *   • max_e1rm    — best estimated 1RM
 *   • max_volume  — highest tonnage on the lift in one session
 *   • max_hold    — longest static hold (durationSec at weight = 0)
 *
 * The function is deterministic and runs in O(N×M) where N = past sessions
 * with that exercise and M = current sets. For typical user histories that's
 * trivial — no caching needed.
 */

import type { SetEntry, WorkoutSession } from '../wellnessDb';
import { bestE1RMFromSets } from './progressionEngine';
import type { PersonalRecord, PrKind } from './types';

/* ────────────────── Per-set extractors ────────────────── */

function maxWeight(sets: SetEntry[]): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null;
  for (const s of sets) {
    if (s.weightKg && s.reps && s.weightKg > 0 && s.reps > 0) {
      if (!best || s.weightKg > best.weight) best = { weight: s.weightKg, reps: s.reps };
    }
  }
  return best;
}

function maxReps(sets: SetEntry[]): { reps: number; weight: number } | null {
  let best: { reps: number; weight: number } | null = null;
  for (const s of sets) {
    if (s.reps && s.reps > 0) {
      const w = s.weightKg ?? 0;
      if (!best || s.reps > best.reps) best = { reps: s.reps, weight: w };
    }
  }
  return best;
}

function totalTonnage(sets: SetEntry[]): number {
  let total = 0;
  for (const s of sets) {
    if (s.weightKg && s.reps && s.weightKg > 0 && s.reps > 0) total += s.weightKg * s.reps;
  }
  return Math.round(total * 10) / 10;
}

function maxHold(sets: SetEntry[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    if (s.durationSec && s.durationSec > 0 && (!s.weightKg || s.weightKg === 0)) {
      if (best == null || s.durationSec > best) best = s.durationSec;
    }
  }
  return best;
}

/* ────────────────── Best-of-history per exercise ────────────────── */

interface HistoryBests {
  maxWeight: number;
  maxReps: number;
  maxE1rm: number;
  maxVolume: number;
  maxHold: number;
}

function emptyBests(): HistoryBests {
  return { maxWeight: 0, maxReps: 0, maxE1rm: 0, maxVolume: 0, maxHold: 0 };
}

/** Aggregate PRs across all past sessions, excluding `excludeId`. */
export function bestsByExercise(
  workouts: WorkoutSession[],
  excludeId?: string,
): Map<string, HistoryBests> {
  const out = new Map<string, HistoryBests>();
  for (const w of workouts) {
    if (w.id === excludeId) continue;
    for (const ex of w.exercises) {
      let b = out.get(ex.exerciseKey);
      if (!b) { b = emptyBests(); out.set(ex.exerciseKey, b); }
      const mw = maxWeight(ex.sets);
      if (mw && mw.weight > b.maxWeight) b.maxWeight = mw.weight;
      const mr = maxReps(ex.sets);
      if (mr && mr.reps > b.maxReps) b.maxReps = mr.reps;
      const me = bestE1RMFromSets(ex.sets);
      if (me != null && me > b.maxE1rm) b.maxE1rm = me;
      const tt = totalTonnage(ex.sets);
      if (tt > b.maxVolume) b.maxVolume = tt;
      const mh = maxHold(ex.sets);
      if (mh != null && mh > b.maxHold) b.maxHold = mh;
    }
  }
  return out;
}

/* ────────────────── Public API ────────────────── */

/**
 * Compute every PR set in the given session, against the rest of the
 * history. The result is a list of records sorted by importance:
 *   max_e1rm > max_weight > max_reps > max_volume > max_hold
 */
export function detectPrs(
  session: WorkoutSession,
  history: WorkoutSession[],
  /** Threshold below which a "tiny" PR is ignored. 0.1 kg or 1 rep. */
  minDelta = { kg: 0.5, reps: 1, sec: 1 },
): PersonalRecord[] {
  const bests = bestsByExercise(history, session.id);
  const records: PersonalRecord[] = [];

  for (const ex of session.exercises) {
    const b = bests.get(ex.exerciseKey) ?? emptyBests();

    // max_weight
    const mw = maxWeight(ex.sets);
    if (mw && mw.weight - b.maxWeight >= minDelta.kg) {
      records.push({
        exerciseKey: ex.exerciseKey,
        kind: 'max_weight',
        value: mw.weight,
        unit: 'kg',
        date: session.date,
        context: `${mw.reps}×${mw.weight}kg`,
        sourceId: session.id,
      });
    }

    // max_reps
    const mr = maxReps(ex.sets);
    if (mr && mr.reps - b.maxReps >= minDelta.reps) {
      records.push({
        exerciseKey: ex.exerciseKey,
        kind: 'max_reps',
        value: mr.reps,
        unit: 'reps',
        date: session.date,
        context: `${mr.reps}×${mr.weight}kg`,
        sourceId: session.id,
      });
    }

    // max_e1rm
    const me = bestE1RMFromSets(ex.sets);
    if (me != null && me - b.maxE1rm >= minDelta.kg) {
      records.push({
        exerciseKey: ex.exerciseKey,
        kind: 'max_e1rm',
        value: me,
        unit: 'kg',
        date: session.date,
        sourceId: session.id,
      });
    }

    // max_volume
    const tt = totalTonnage(ex.sets);
    if (tt - b.maxVolume >= minDelta.kg) {
      records.push({
        exerciseKey: ex.exerciseKey,
        kind: 'max_volume',
        value: tt,
        unit: 'kg_x_reps',
        date: session.date,
        sourceId: session.id,
      });
    }

    // max_hold (only if there's a hold in this entry)
    const mh = maxHold(ex.sets);
    if (mh != null && mh - b.maxHold >= minDelta.sec) {
      records.push({
        exerciseKey: ex.exerciseKey,
        kind: 'max_hold',
        value: mh,
        unit: 'sec',
        date: session.date,
        sourceId: session.id,
      });
    }
  }

  const order: Record<PrKind, number> = {
    max_e1rm: 0,
    max_weight: 1,
    max_reps: 2,
    max_volume: 3,
    max_hold: 4,
  };
  records.sort((a, b) => order[a.kind] - order[b.kind]);
  return records;
}

/* ────────────────── Aggregations ────────────────── */

/**
 * Across the user's whole history, return the all-time best record per
 * (exercise, kind) — useful for the "Records" page.
 */
export function allTimeBests(workouts: WorkoutSession[]): PersonalRecord[] {
  const bests = bestsByExercise(workouts);
  const out: PersonalRecord[] = [];
  bests.forEach((b, key) => {
    const dummyDate = ''; // best-effort — not used by the records UI
    if (b.maxE1rm > 0) out.push({ exerciseKey: key, kind: 'max_e1rm', value: b.maxE1rm, unit: 'kg', date: dummyDate, sourceId: '' });
    if (b.maxWeight > 0) out.push({ exerciseKey: key, kind: 'max_weight', value: b.maxWeight, unit: 'kg', date: dummyDate, sourceId: '' });
    if (b.maxReps > 0) out.push({ exerciseKey: key, kind: 'max_reps', value: b.maxReps, unit: 'reps', date: dummyDate, sourceId: '' });
    if (b.maxVolume > 0) out.push({ exerciseKey: key, kind: 'max_volume', value: b.maxVolume, unit: 'kg_x_reps', date: dummyDate, sourceId: '' });
    if (b.maxHold > 0) out.push({ exerciseKey: key, kind: 'max_hold', value: b.maxHold, unit: 'sec', date: dummyDate, sourceId: '' });
  });
  return out;
}

/**
 * Find the best e1RM for each exercise plus the date it was set — used by
 * the trend chart x-axis ("date of current PR").
 */
export interface E1RmHistoryPoint {
  date: string;
  e1rm: number;
  sourceId: string;
}

export function e1rmHistoryFor(
  workouts: WorkoutSession[],
  exerciseKey: string,
): E1RmHistoryPoint[] {
  const out: E1RmHistoryPoint[] = [];
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.exerciseKey !== exerciseKey) continue;
      const e = bestE1RMFromSets(ex.sets);
      if (e != null) out.push({ date: w.date, e1rm: e, sourceId: w.id });
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/** "Best-ever" running maximum — the visual line that only moves up. */
export function e1rmRunningMax(points: E1RmHistoryPoint[]): E1RmHistoryPoint[] {
  let max = -Infinity;
  return points.map((p) => {
    if (p.e1rm > max) max = p.e1rm;
    return { ...p, e1rm: max };
  });
}
