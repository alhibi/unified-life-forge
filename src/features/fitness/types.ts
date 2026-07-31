/**
 * TypeScript definitions and Type Guards for the Fitness Activity feature.
 */

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
  /** Altitude in meters, when the device reports it. */
  alt?: number;
  /** Horizontal accuracy in meters, when reported. */
  acc?: number;
}

/**
 * Where an activity came from.
 *
 * Must stay in step with the `fitness_activities_source_check` CHECK constraint
 * (supabase/migrations/20260729041628_*.sql). `health_connect` was added to the
 * constraint and written by `healthConnect.ts`, but was missing from this union,
 * from `fitnessActivitySchema` and from `isFitnessActivity` — so every workout
 * imported from Health Connect / HealthKit failed the type guard and could not be
 * round-tripped through the API layer at all.
 */
export const ACTIVITY_SOURCES = ['auto', 'manual', 'health_connect'] as const;

/**
 * Derived from the tuple above rather than written out again, so the runtime list
 * and the compile-time union cannot drift — which is the drift that let
 * `health_connect` exist in the database and in `healthConnect.ts` but not in the
 * type, the Zod schema, or the guard.
 */
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

export function isActivitySource(value: unknown): value is ActivitySource {
  return typeof value === 'string' && (ACTIVITY_SOURCES as readonly string[]).includes(value);
}
export type MotionState = 'resting' | 'walking' | 'running';

/** One fixed-distance segment of a recorded route. */
export interface TrackSplit {
  index: number;
  distanceMeters: number;
  seconds: number;
  paceSecPerKm: number;
  partial: boolean;
}

export interface FitnessActivity {
  id: string;
  user_id: string;
  activity_type: string;
  source: ActivitySource;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  calories: number | null;
  avg_heart_rate: number | null;
  route: RoutePoint[] | null;
  created_at: string;
}

/**
 * Narrows `unknown` to an index-readable object.
 *
 * The guards below took `any`, which made them look like they were checking
 * something while actually disabling every check inside their own body: with
 * `obj: any`, `typeof obj.lat === 'number'` type-checks even if `lat` is not a
 * declared field, and callers could pass anything at all. `unknown` forces the
 * narrowing to be real.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Accepts `null` (the column is nullable) or the given primitive. */
function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/**
 * Type guard for RoutePoint.
 */
export function isRoutePoint(value: unknown): value is RoutePoint {
  if (!isRecord(value)) return false;
  return (
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    typeof value.timestamp === 'number'
  );
}

/**
 * Type guard for FitnessActivity.
 */
export function isFitnessActivity(value: unknown): value is FitnessActivity {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.user_id === 'string' &&
    typeof value.activity_type === 'string' &&
    isActivitySource(value.source) &&
    typeof value.start_time === 'string' &&
    isNullableString(value.end_time) &&
    isNullableNumber(value.duration_seconds) &&
    isNullableNumber(value.distance_meters) &&
    isNullableNumber(value.calories) &&
    isNullableNumber(value.avg_heart_rate) &&
    (value.route === null || Array.isArray(value.route))
  );
}

/**
 * Parses the `route` JSONB column into typed points, dropping malformed entries.
 *
 * The column is `Json` at rest, so casting a row straight to `FitnessActivity`
 * asserts a shape nothing verified — a single corrupt point would then crash the
 * map renderer at draw time, far from the cause. Filtering here keeps a partially
 * bad track usable instead of losing the whole activity.
 */
export function parseRoute(value: unknown): RoutePoint[] | null {
  if (!Array.isArray(value)) return null;
  const points = value.filter(isRoutePoint);
  return points.length > 0 ? points : null;
}
