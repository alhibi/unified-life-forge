/**
 * TypeScript definitions and Type Guards for the Fitness Activity feature.
 */

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export type ActivitySource = 'auto' | 'manual';
export type MotionState = 'resting' | 'walking' | 'running';

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
 * Type guard for RoutePoint.
 */
export function isRoutePoint(obj: any): obj is RoutePoint {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.lat === 'number' &&
    typeof obj.lng === 'number' &&
    typeof obj.timestamp === 'number'
  );
}

/**
 * Type guard for FitnessActivity.
 */
export function isFitnessActivity(obj: any): obj is FitnessActivity {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.activity_type === 'string' &&
    (obj.source === 'auto' || obj.source === 'manual') &&
    typeof obj.start_time === 'string' &&
    (obj.end_time === null || typeof obj.end_time === 'string') &&
    (obj.duration_seconds === null || typeof obj.duration_seconds === 'number') &&
    (obj.distance_meters === null || typeof obj.distance_meters === 'number') &&
    (obj.calories === null || typeof obj.calories === 'number') &&
    (obj.avg_heart_rate === null || typeof obj.avg_heart_rate === 'number') &&
    (obj.route === null || Array.isArray(obj.route))
  );
}
