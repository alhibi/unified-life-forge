import { z } from 'zod';

/**
 * Zod schema validation for a single RoutePoint coordinate.
 */
export const routePointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timestamp: z.number().positive(),
});

/**
 * Zod schema validation for a FitnessActivity entity payload.
 */
export const fitnessActivitySchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  activity_type: z.string().min(1, 'نوع النشاط مطلوب'),
  source: z.enum(['auto', 'manual']),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().nullable().optional(),
  duration_seconds: z.number().int().nonnegative().nullable().optional(),
  distance_meters: z.number().nonnegative().nullable().optional(),
  calories: z.number().nonnegative().nullable().optional(),
  avg_heart_rate: z.number().nonnegative().nullable().optional(),
  route: z.array(routePointSchema).nullable().optional(),
  created_at: z.string().datetime().optional(),
});

export type ValidatedRoutePoint = z.infer<typeof routePointSchema>;
export type ValidatedFitnessActivity = z.infer<typeof fitnessActivitySchema>;
