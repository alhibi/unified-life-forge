import { supabase } from '@/integrations/supabase/client';

import { fitnessActivitySchema } from './schemas';
import type { DailyMetric } from './stats';
import type { FitnessActivity } from './types';

// Use type assertion to bypass strict table name checking in generated types
const client = supabase as any;

/**
 * Lists all fitness activities for the currently authenticated user,
 * ordered by start_time descending.
 */
export async function listFitnessActivities(): Promise<FitnessActivity[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    return [];
  }

  const { data, error } = await client
    .from('fitness_activities')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Failed to list fitness activities:', error);
    throw error;
  }

  return (data || []) as FitnessActivity[];
}

/**
 * Inserts a new fitness activity record into Supabase after validating with Zod schema.
 */
export async function insertFitnessActivity(
  activity: Omit<FitnessActivity, 'id' | 'user_id' | 'created_at'> & {
    id?: string;
    user_id?: string;
    created_at?: string;
  }
): Promise<FitnessActivity> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    throw new Error('fitness:unauthorized');
  }

  const payload = {
    ...activity,
    user_id: userId,
  };

  // Validate utilizing our schema before DB insertion
  const validatedPayload = fitnessActivitySchema.parse(payload);

  const { data, error } = await client
    .from('fitness_activities')
    .insert([validatedPayload])
    .select()
    .single();

  if (error) {
    console.error('Failed to insert fitness activity:', error);
    throw error;
  }

  return data as FitnessActivity;
}

/**
 * Deletes a fitness activity record from Supabase.
 */
export async function deleteFitnessActivity(id: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    throw new Error('fitness:unauthorized');
  }

  const { error } = await client
    .from('fitness_activities')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete fitness activity:', error);
    throw error;
  }
}

/**
 * Lists daily health metrics (steps, distance, calories, heart rate, sleep)
 * for the last `days` days, oldest first. Used by the analytics dashboard.
 */
export async function listDailyMetrics(days = 90): Promise<DailyMetric[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return [];

  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, days));
  const month = String(since.getMonth() + 1).padStart(2, '0');
  const day = String(since.getDate()).padStart(2, '0');
  const sinceKey = `${since.getFullYear()}-${month}-${day}`;

  const { data, error } = await client
    .from('fitness_daily_metrics')
    .select('date, steps, distance_meters, calories, avg_heart_rate, sleep_minutes')
    .eq('user_id', userId)
    .gte('date', sinceKey)
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to list daily fitness metrics:', error);
    return [];
  }

  return (data || []) as DailyMetric[];
}
