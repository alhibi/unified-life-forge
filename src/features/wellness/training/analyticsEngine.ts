/**
 * Analytics aggregator — turns the raw workout list into the data shapes
 * the dashboard charts and lists need. Pure & memoizable.
 */

import { EXERCISES, type MuscleGroup } from '../exerciseCatalog';
import type { WorkoutSession } from '../wellnessDb';
import { bestsByExercise, e1rmHistoryFor, e1rmRunningMax } from './prDetector';
import { sessionLoadSrpe,sessionVolumeKg } from './progressionEngine';
import type { FrequencyCell, OneRmPoint, VolumePoint } from './types';

/* ────────────────── Time helpers ────────────────── */

const dayMs = 86_400_000;
const weekMs = 7 * dayMs;

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / dayMs) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function startOfWeekMs(ts: number): number {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday-based
  d.setHours(0, 0, 0, 0);
  return d.getTime() - diff * dayMs;
}

/* ────────────────── Per-muscle hard sets ────────────────── */

/**
 * Count "hard sets" per muscle in a window. A hard set is RPE ≥ 7 OR weight
 * × reps reaching e1RM ≥ 70% if RPE absent. Half-credit to secondary muscles.
 */
export function hardSetsByMuscle(
  workouts: WorkoutSession[],
  windowDays = 7,
): Map<MuscleGroup, number> {
  const cutoff = Date.now() - windowDays * dayMs;
  const out = new Map<MuscleGroup, number>();
  for (const w of workouts) {
    if (w.startedAt < cutoff) continue;
    for (const ex of w.exercises) {
      const def = EXERCISES[ex.exerciseKey];
      if (!def) continue;
      let hardCount = 0;
      for (const s of ex.sets) {
        if (!s.reps || s.reps <= 0) continue;
        const isHard = s.rpe ? s.rpe >= 7 : (s.reps >= 5);
        if (isHard) hardCount++;
      }
      if (hardCount === 0) continue;
      out.set(def.primary, (out.get(def.primary) ?? 0) + hardCount);
      for (const sec of def.secondary ?? []) {
        out.set(sec, (out.get(sec) ?? 0) + hardCount * 0.5);
      }
    }
  }
  return out;
}

/* ────────────────── Per-muscle tonnage ────────────────── */

export function tonnageByMuscle(
  workouts: WorkoutSession[],
  windowDays = 7,
): Map<MuscleGroup, number> {
  const cutoff = Date.now() - windowDays * dayMs;
  const out = new Map<MuscleGroup, number>();
  for (const w of workouts) {
    if (w.startedAt < cutoff) continue;
    for (const ex of w.exercises) {
      const def = EXERCISES[ex.exerciseKey];
      if (!def) continue;
      let exVol = 0;
      for (const s of ex.sets) {
        if (s.weightKg && s.reps) exVol += s.weightKg * s.reps;
      }
      if (exVol <= 0) continue;
      out.set(def.primary, (out.get(def.primary) ?? 0) + exVol);
      for (const sec of def.secondary ?? []) {
        out.set(sec, (out.get(sec) ?? 0) + exVol * 0.5);
      }
    }
  }
  return out;
}

/* ────────────────── Weekly volume timeline ────────────────── */

export function weeklyVolumeSeries(
  workouts: WorkoutSession[],
  weeksBack = 12,
): VolumePoint[] {
  const map = new Map<string, VolumePoint>();
  const cutoff = Date.now() - weeksBack * weekMs;
  for (const w of workouts) {
    if (w.startedAt < cutoff) continue;
    const wk = isoWeek(new Date(w.startedAt));
    let pt = map.get(wk);
    if (!pt) {
      pt = { weekIso: wk, byMuscle: {} as Record<MuscleGroup, number> };
      map.set(wk, pt);
    }
    for (const ex of w.exercises) {
      const def = EXERCISES[ex.exerciseKey];
      if (!def) continue;
      let exVol = 0;
      for (const s of ex.sets) if (s.weightKg && s.reps) exVol += s.weightKg * s.reps;
      if (exVol <= 0) continue;
      pt.byMuscle[def.primary] = (pt.byMuscle[def.primary] ?? 0) + exVol;
      for (const sec of def.secondary ?? []) {
        pt.byMuscle[sec] = (pt.byMuscle[sec] ?? 0) + exVol * 0.5;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.weekIso.localeCompare(b.weekIso));
}

/* ────────────────── 1RM trends ────────────────── */

export function e1rmSeriesFor(workouts: WorkoutSession[], exerciseKey: string): OneRmPoint[] {
  return e1rmHistoryFor(workouts, exerciseKey).map((p) => ({
    date: p.date,
    e1rm: p.e1rm,
    exerciseKey,
  }));
}

export function e1rmRunningMaxSeriesFor(
  workouts: WorkoutSession[],
  exerciseKey: string,
): OneRmPoint[] {
  return e1rmRunningMax(e1rmHistoryFor(workouts, exerciseKey)).map((p) => ({
    date: p.date,
    e1rm: p.e1rm,
    exerciseKey,
  }));
}

/* ────────────────── Frequency heat-map ────────────────── */

/**
 * Returns a list of FrequencyCell entries, one per ISO date, for the past
 * `days` days. Days without workouts are omitted — the heatmap renderer
 * fills gaps with empty cells.
 */
export function frequencyHeatmap(
  workouts: WorkoutSession[],
  days = 90,
): FrequencyCell[] {
  const cutoff = Date.now() - days * dayMs;
  const map = new Map<string, FrequencyCell>();
  for (const w of workouts) {
    if (w.startedAt < cutoff) continue;
    let cell = map.get(w.date);
    if (!cell) { cell = { date: w.date, count: 0, totalVolumeKg: 0 }; map.set(w.date, cell); }
    cell.count++;
    cell.totalVolumeKg += sessionVolumeKg(w);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/* ────────────────── Session histogram ────────────────── */

export interface SessionStats {
  count: number;
  totalVolumeKg: number;
  totalDurationMin: number;
  avgRpe: number | null;
  avgDensityKgPerMin: number | null;
}

export function sessionStats(workouts: WorkoutSession[], windowDays?: number): SessionStats {
  const cutoff = windowDays ? Date.now() - windowDays * dayMs : 0;
  let count = 0;
  let totalVol = 0;
  let totalDur = 0;
  let rpeSum = 0;
  let rpeCount = 0;
  for (const w of workouts) {
    if (w.startedAt < cutoff) continue;
    count++;
    totalVol += sessionVolumeKg(w);
    if (w.endedAt && w.startedAt) totalDur += (w.endedAt - w.startedAt) / 60_000;
    if (w.sessionRpe) { rpeSum += w.sessionRpe; rpeCount++; }
  }
  return {
    count,
    totalVolumeKg: Math.round(totalVol * 10) / 10,
    totalDurationMin: Math.round(totalDur),
    avgRpe: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
    avgDensityKgPerMin: totalDur > 0 ? Math.round((totalVol / totalDur) * 10) / 10 : null,
  };
}

/* ────────────────── Streak ────────────────── */

export function activityStreak(workouts: WorkoutSession[]): {
  current: number;
  longest: number;
} {
  if (workouts.length === 0) return { current: 0, longest: 0 };
  const days = new Set<string>();
  for (const w of workouts) days.add(w.date);
  const sorted = Array.from(days).sort();
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of sorted) {
    const ts = new Date(day).getTime();
    if (prev != null && (ts - prev) <= dayMs * 1.5) run++;
    else run = 1;
    if (run > longest) longest = run;
    prev = ts;
  }
  // Current streak ending today
  const today = new Date();
  let current = 0;
  for (let i = 0; i < 366; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (days.has(iso)) current++;
    else if (i > 0) break;
  }
  return { current, longest };
}

/* ────────────────── Most-trained exercises ────────────────── */

export function topExercises(workouts: WorkoutSession[], limit = 5): {
  exerciseKey: string;
  sessions: number;
  setsTotal: number;
  volumeTotalKg: number;
}[] {
  const map = new Map<string, { sessions: Set<string>; sets: number; vol: number }>();
  for (const w of workouts) {
    for (const ex of w.exercises) {
      let row = map.get(ex.exerciseKey);
      if (!row) { row = { sessions: new Set(), sets: 0, vol: 0 }; map.set(ex.exerciseKey, row); }
      row.sessions.add(w.id);
      row.sets += ex.sets.length;
      for (const s of ex.sets) {
        if (s.weightKg && s.reps) row.vol += s.weightKg * s.reps;
      }
    }
  }
  return Array.from(map.entries())
    .map(([k, v]) => ({
      exerciseKey: k,
      sessions: v.sessions.size,
      setsTotal: v.sets,
      volumeTotalKg: Math.round(v.vol * 10) / 10,
    }))
    .sort((a, b) => b.volumeTotalKg - a.volumeTotalKg)
    .slice(0, limit);
}

/* ────────────────── Records summary ────────────────── */

export function recordsSummary(workouts: WorkoutSession[]): {
  exerciseKey: string;
  e1rm: number;
  bestWeight: number;
  bestReps: number;
}[] {
  const bests = bestsByExercise(workouts);
  return Array.from(bests.entries()).map(([key, b]) => ({
    exerciseKey: key,
    e1rm: b.maxE1rm,
    bestWeight: b.maxWeight,
    bestReps: b.maxReps,
  })).sort((a, b) => b.e1rm - a.e1rm);
}

/* ────────────────── Load timeline (for ACWR sparkline) ────────────────── */

export function loadByDay(workouts: WorkoutSession[], days = 28): { date: string; load: number }[] {
  const cutoff = Date.now() - days * dayMs;
  const map = new Map<string, number>();
  for (const w of workouts) {
    if (w.startedAt < cutoff) continue;
    const l = sessionLoadSrpe(w) ?? 420;
    map.set(w.date, (map.get(w.date) ?? 0) + l);
  }
  // Fill in missing days with 0
  const out: { date: string; load: number }[] = [];
  const startWeek = startOfWeekMs(Date.now() - days * dayMs);
  for (let i = 0; i <= days; i++) {
    const d = new Date(startWeek + i * dayMs);
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, load: map.get(iso) ?? 0 });
  }
  return out;
}
