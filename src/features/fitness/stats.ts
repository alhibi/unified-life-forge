/**
 * Pure analytics for the fitness feature: range summaries, daily series,
 * streaks and personal records. No React, no I/O.
 */

import type { FitnessActivity } from './types';
import { estimateSteps } from './metrics';

export interface DailyMetric {
  date: string; // YYYY-MM-DD
  steps: number | null;
  distance_meters: number | null;
  calories: number | null;
  avg_heart_rate: number | null;
  sleep_minutes: number | null;
}

export interface DayBucket {
  dateKey: string;
  label: string;
  steps: number;
  distanceKm: number;
  calories: number;
  minutes: number;
  sessions: number;
  fromDevice: boolean;
}

export interface RangeSummary {
  sessions: number;
  distanceMeters: number;
  seconds: number;
  calories: number;
  steps: number;
  activeDays: number;
  avgPaceSecPerKm: number;
  bestDayKey: string | null;
}

export interface PersonalRecords {
  longestDistanceMeters: number;
  longestDurationSeconds: number;
  fastestPaceSecPerKm: number;
  mostCalories: number;
  bestDaySteps: number;
}

/** Local (not UTC) YYYY-MM-DD key so days line up with the user's clock. */
export function dayKey(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Build an ordered array of day buckets covering the last `days` days
 * (oldest first), merging device daily metrics with GPS sessions.
 * Device metrics win for steps/calories; sessions add distance and time.
 */
export function buildDailySeries(
  activities: FitnessActivity[],
  metrics: DailyMetric[] = [],
  days = 7
): DayBucket[] {
  const buckets = new Map<string, DayBucket>();
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d);
    buckets.set(key, {
      dateKey: key,
      label:
        days <= 7
          ? d.toLocaleDateString('ar', { weekday: 'short' })
          : d.toLocaleDateString('ar', { day: 'numeric', month: 'short' }),
      steps: 0,
      distanceKm: 0,
      calories: 0,
      minutes: 0,
      sessions: 0,
      fromDevice: false,
    });
  }

  for (const metric of metrics) {
    const bucket = buckets.get(metric.date);
    if (!bucket) continue;
    bucket.steps = Math.max(0, Math.round(metric.steps || 0));
    bucket.calories = Math.max(0, Math.round(metric.calories || 0));
    bucket.distanceKm = Math.round(((metric.distance_meters || 0) / 1000) * 10) / 10;
    bucket.fromDevice = true;
  }

  for (const activity of activities) {
    const bucket = buckets.get(dayKey(activity.start_time));
    if (!bucket) continue;
    bucket.sessions += 1;
    bucket.minutes += Math.round((activity.duration_seconds || 0) / 60);
    if (!bucket.fromDevice) {
      bucket.steps += estimateSteps(activity.distance_meters || 0, activity.activity_type);
      bucket.calories += Math.round(activity.calories || 0);
      bucket.distanceKm =
        Math.round((bucket.distanceKm + (activity.distance_meters || 0) / 1000) * 10) / 10;
    }
  }

  return Array.from(buckets.values());
}

/** Aggregate summary over the last `days` days. */
export function summarizeRange(
  activities: FitnessActivity[],
  metrics: DailyMetric[] = [],
  days = 7
): RangeSummary {
  const series = buildDailySeries(activities, metrics, days);
  const keys = new Set(series.map((b) => b.dateKey));
  const inRange = activities.filter((a) => keys.has(dayKey(a.start_time)));

  const distanceMeters = inRange.reduce((sum, a) => sum + (a.distance_meters || 0), 0);
  const seconds = inRange.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);
  const steps = series.reduce((sum, b) => sum + b.steps, 0);
  const calories = series.reduce((sum, b) => sum + b.calories, 0);
  const activeDays = series.filter((b) => b.sessions > 0 || b.steps > 500).length;

  let bestDayKey: string | null = null;
  let bestValue = 0;
  for (const bucket of series) {
    const value = bucket.steps || bucket.distanceKm * 1000;
    if (value > bestValue) {
      bestValue = value;
      bestDayKey = bucket.dateKey;
    }
  }

  return {
    sessions: inRange.length,
    distanceMeters: Math.round(distanceMeters),
    seconds,
    calories: Math.round(calories),
    steps,
    activeDays,
    avgPaceSecPerKm: distanceMeters > 200 ? (seconds / distanceMeters) * 1000 : 0,
    bestDayKey,
  };
}

/**
 * Current and longest streak of consecutive active days.
 * A day counts as active when it has a session or >= 3000 device steps.
 */
export function computeStreaks(
  activities: FitnessActivity[],
  metrics: DailyMetric[] = [],
  stepGoal = 3000
): { current: number; longest: number } {
  const active = new Set<string>();
  for (const activity of activities) active.add(dayKey(activity.start_time));
  for (const metric of metrics) {
    if ((metric.steps || 0) >= stepGoal) active.add(metric.date);
  }
  if (active.size === 0) return { current: 0, longest: 0 };

  const sorted = Array.from(active).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    prev.setDate(prev.getDate() + 1);
    run = dayKey(prev) === sorted[i] ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // Current streak counts backwards from today (or yesterday if today is idle).
  let current = 0;
  const cursor = new Date();
  if (!active.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (active.has(dayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest };
}

/** All-time personal records across sessions and device days. */
export function computeRecords(
  activities: FitnessActivity[],
  metrics: DailyMetric[] = []
): PersonalRecords {
  let longestDistanceMeters = 0;
  let longestDurationSeconds = 0;
  let fastestPaceSecPerKm = 0;
  let mostCalories = 0;

  for (const activity of activities) {
    const distance = activity.distance_meters || 0;
    const seconds = activity.duration_seconds || 0;
    if (distance > longestDistanceMeters) longestDistanceMeters = distance;
    if (seconds > longestDurationSeconds) longestDurationSeconds = seconds;
    if ((activity.calories || 0) > mostCalories) mostCalories = activity.calories || 0;
    if (distance >= 1000 && seconds > 0) {
      const pace = (seconds / distance) * 1000;
      if (pace > 0 && (fastestPaceSecPerKm === 0 || pace < fastestPaceSecPerKm)) {
        fastestPaceSecPerKm = pace;
      }
    }
  }

  const bestDaySteps = metrics.reduce((max, m) => Math.max(max, m.steps || 0), 0);

  return {
    longestDistanceMeters: Math.round(longestDistanceMeters),
    longestDurationSeconds,
    fastestPaceSecPerKm,
    mostCalories: Math.round(mostCalories),
    bestDaySteps,
  };
}