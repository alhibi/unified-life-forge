import { Health, type HealthDataType, type Workout } from '@capgo/capacitor-health';

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ActivityInsert = Database['public']['Tables']['fitness_activities']['Insert'];
type DailyMetricInsert = Database['public']['Tables']['fitness_daily_metrics']['Insert'];

/**
 * Health Connect (Android) / HealthKit (iOS) integration.
 *
 * This is now the app's primary health-data source. It replaces the previous
 * OAuth-based Google Fit REST integration (Google Fit REST was shut down in mid-2025).
 */

const READ_TYPES: HealthDataType[] = [
  'steps',
  'distance',
  'calories',
  'heartRate',
  'sleep',
  'workouts',
];

export type HealthAvailability =
  | { available: true; platform: 'ios' | 'android' | 'web' }
  | { available: false; reason: string; platform?: 'ios' | 'android' | 'web' };

/** Check whether Health Connect (or HealthKit on iOS) is installed and reachable. */
export async function checkHealthAvailability(): Promise<HealthAvailability> {
  try {
    const res = await Health.isAvailable();
    if (res.available) {
      return { available: true, platform: res.platform || 'android' };
    }
    return {
      available: false,
      platform: res.platform,
      reason: res.reason || 'health_connect_unavailable',
    };
  } catch (e: unknown) {
    return { available: false, reason: errorMessage(e, 'health_connect_error') };
  }
}

/**
 * Pulls a message off an unknown thrown value.
 *
 * `catch (e: any)` let `e?.message` compile while quietly permitting anything —
 * including a rejected value that is a string or a DOMException, where `.message`
 * is `undefined` and the caller ends up showing "undefined" to the user.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

/**
 * The Play Store deep-link for installing Health Connect.
 * Use this when `checkHealthAvailability` reports unavailable on Android.
 */
export const HEALTH_CONNECT_INSTALL_URL =
  'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

/** Ask the user to grant read permissions for every metric this feature needs. */
export async function requestHealthPermissions() {
  return Health.requestAuthorization({ read: READ_TYPES });
}

/** Read-only check of previously granted permissions (does not prompt). */
export async function checkHealthPermissions() {
  return Health.checkAuthorization({ read: READ_TYPES });
}

/** Deep-link into the Health Connect settings so users can fix denied permissions. */
export async function openHealthConnectSettings() {
  return Health.openHealthConnectSettings();
}

function toISO(d: Date) {
  return d.toISOString();
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function aggregateDaily(
  dataType: HealthDataType,
  startDate: Date,
  endDate: Date,
  aggregation: 'sum' | 'average' = 'sum',
) {
  try {
    const res = await Health.queryAggregated({
      dataType,
      startDate: toISO(startDate),
      endDate: toISO(endDate),
      bucket: 'day',
      aggregation,
    });
    return res.samples || [];
  } catch (e) {
    console.warn(`[healthConnect] aggregate ${dataType} failed:`, e);
    return [];
  }
}

interface DailyBucket {
  date: string;
  steps: number | null;
  distance_meters: number | null;
  calories: number | null;
  avg_heart_rate: number | null;
  sleep_minutes: number | null;
}

function ensureBucket(map: Map<string, DailyBucket>, date: string): DailyBucket {
  let b = map.get(date);
  if (!b) {
    b = {
      date,
      steps: null,
      distance_meters: null,
      calories: null,
      avg_heart_rate: null,
      sleep_minutes: null,
    };
    map.set(date, b);
  }
  return b;
}

/**
 * Query Health Connect for steps, distance, active calories, heart rate,
 * and sleep across the given date range, then upsert one row per day into
 * `fitness_daily_metrics`.
 *
 * @param fromDate - inclusive start (defaults to 30 days ago)
 * @param toDate - exclusive end (defaults to now)
 */
export async function syncDailyMetrics(
  fromDate?: Date,
  toDate?: Date,
): Promise<{ upserted: number }> {
  const end = toDate ?? new Date();
  const start = fromDate ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('fitness:unauthorized');

  const [stepsBuckets, distanceBuckets, caloriesBuckets, hrBuckets, sleepBuckets] =
    await Promise.all([
      aggregateDaily('steps', start, end, 'sum'),
      aggregateDaily('distance', start, end, 'sum'),
      aggregateDaily('calories', start, end, 'sum'),
      aggregateDaily('heartRate', start, end, 'average'),
      aggregateDaily('sleep', start, end, 'sum'),
    ]);

  const buckets = new Map<string, DailyBucket>();
  for (const s of stepsBuckets) ensureBucket(buckets, ymd(new Date(s.startDate))).steps = Math.round(s.value);
  for (const s of distanceBuckets) ensureBucket(buckets, ymd(new Date(s.startDate))).distance_meters = Math.round(s.value);
  for (const s of caloriesBuckets) ensureBucket(buckets, ymd(new Date(s.startDate))).calories = Math.round(s.value * 10) / 10;
  for (const s of hrBuckets) ensureBucket(buckets, ymd(new Date(s.startDate))).avg_heart_rate = Math.round(s.value);
  for (const s of sleepBuckets) {
    // sleep aggregated as sum of minutes
    const minutes = s.unit === 'minute' ? s.value : s.value / 60;
    ensureBucket(buckets, ymd(new Date(s.startDate))).sleep_minutes = Math.round(minutes);
  }

  const rows: DailyMetricInsert[] = [...buckets.values()].map((b) => ({
    ...b,
    user_id: userId,
    source: 'health_connect',
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) return { upserted: 0 };

  const { error } = await supabase
    .from('fitness_daily_metrics')
    .upsert(rows, { onConflict: 'user_id,date' });

  if (error) {
    console.error('[healthConnect] upsert daily metrics failed:', error);
    throw error;
  }

  return { upserted: rows.length };
}

/**
 * Map Health Connect workout types to the app's internal `activity_type` strings.
 * Anything unknown falls back to `other`.
 */
function normalizeActivityType(type: Workout['workoutType']): string {
  const t = String(type);
  if (t.includes('running') || t === 'runningTreadmill') return 'running';
  if (t.includes('walking') || t === 'hiking') return 'walking';
  if (t.includes('cycling') || t === 'bikingStationary') return 'cycling';
  if (t.includes('swim')) return 'swimming';
  return t || 'other';
}

/**
 * Import Health Connect / HealthKit workout sessions as `fitness_activities`,
 * skipping any session whose time range overlaps an existing activity (so we
 * never duplicate a session that the app's own GPS tracker already recorded).
 */
export async function syncExerciseSessions(
  fromDate?: Date,
  toDate?: Date,
): Promise<{ imported: number; skippedOverlap: number }> {
  const end = toDate ?? new Date();
  const start = fromDate ?? new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('fitness:unauthorized');

  const wr = await Health.queryWorkouts({
    startDate: toISO(start),
    endDate: toISO(end),
    limit: 500,
    ascending: true,
  });
  const workouts = wr.workouts || [];
  if (workouts.length === 0) return { imported: 0, skippedOverlap: 0 };

  // Load the user's existing activities in the window to detect overlaps.
  const { data: existing } = await supabase
    .from('fitness_activities')
    .select('id, start_time, end_time, external_id')
    .eq('user_id', userId)
    .gte('start_time', toISO(new Date(start.getTime() - 24 * 60 * 60 * 1000)))
    .lte('start_time', toISO(new Date(end.getTime() + 24 * 60 * 60 * 1000)));

  const existingRanges = (existing ?? []).map((r) => ({
    s: new Date(r.start_time).getTime(),
    e: r.end_time ? new Date(r.end_time).getTime() : new Date(r.start_time).getTime(),
    ext: r.external_id,
  }));

  let imported = 0;
  let skipped = 0;
  const toInsert: ActivityInsert[] = [];

  for (const w of workouts) {
    const s = new Date(w.startDate).getTime();
    const e = new Date(w.endDate).getTime();
    // `platformId` is the stable per-record id Health Connect / HealthKit assigns.
    // It is not in the plugin's `Workout` type, so it is read defensively rather
    // than by casting the whole workout to `any` and losing every other field's
    // type along with it.
    const platformId =
      'platformId' in w && typeof w.platformId === 'string' ? w.platformId : undefined;

    const overlaps = existingRanges.some(
      (r) => (platformId && r.ext === platformId) || (s < r.e && e > r.s),
    );
    if (overlaps) {
      skipped++;
      continue;
    }

    toInsert.push({
      user_id: userId,
      activity_type: normalizeActivityType(w.workoutType),
      source: 'health_connect',
      start_time: w.startDate,
      end_time: w.endDate,
      duration_seconds: Math.round(w.duration),
      distance_meters: w.totalDistance ?? null,
      calories: w.totalEnergyBurned ?? null,
      avg_heart_rate: null,
      route: null,
      external_id: platformId ?? null,
    });
    imported++;
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('fitness_activities').insert(toInsert);
    if (error) {
      console.error('[healthConnect] insert workouts failed:', error);
      throw error;
    }
  }

  return { imported, skippedOverlap: skipped };
}

/** Full sync convenience: daily metrics + exercise sessions in one call. */
export async function syncHealthData(days = 30) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const daily = await syncDailyMetrics(start, end);
  const sessions = await syncExerciseSessions(start, end);
  return { ...daily, ...sessions };
}