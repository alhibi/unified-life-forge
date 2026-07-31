import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

import { fitnessActivitySchema } from './schemas';
import type { DailyMetric } from './stats';
import type { FitnessActivity } from './types';
import { isActivitySource, parseRoute } from './types';

// This module previously routed every query through `supabase as any`, with the
// comment "bypass strict table name checking in generated types". Both fitness
// tables are in fact fully present in src/integrations/supabase/types.ts, so the
// cast bought nothing and cost everything: misspelt columns, wrong filter values
// and bad row shapes all compiled. The typed client is used directly below.

/** A row as it actually comes back from Postgres: `route` is still raw JSON. */
type FitnessActivityRow =
  Database['public']['Tables']['fitness_activities']['Row'];

/**
 * Converts a database row into the domain type.
 *
 * `route` is a `jsonb` column, so it arrives as `Json` and has to be parsed
 * rather than asserted; `source` is a bare `text` column in the generated types,
 * so the CHECK constraint's values are re-established here. Anything unexpected
 * degrades to a safe default instead of being trusted downstream.
 */
function toActivity(row: FitnessActivityRow): FitnessActivity {
  return {
    ...row,
    source: isActivitySource(row.source) ? row.source : 'manual',
    route: parseRoute(row.route),
    created_at: row.created_at ?? row.start_time,
  };
}

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

  const { data, error } = await supabase
    .from('fitness_activities')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Failed to list fitness activities:', error);
    throw error;
  }

  return (data ?? []).map(toActivity);
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

  // Validate before touching the network so a bad payload fails locally with a
  // field-level Zod error rather than as an opaque Postgres constraint violation.
  const validated = fitnessActivitySchema.parse({ ...activity, user_id: userId });

  // `user_id` is optional in the schema (callers may omit it — it is filled in
  // from the session above), but the column is NOT NULL. Restating it here is
  // what lets the compiler verify the insert instead of us asserting it.
  const { data, error } = await supabase
    .from('fitness_activities')
    .insert([{ ...validated, user_id: userId }])
    .select()
    .single();

  if (error) {
    console.error('Failed to insert fitness activity:', error);
    throw error;
  }

  return toActivity(data);
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

  const { error } = await supabase
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

  const { data, error } = await supabase
    .from('fitness_daily_metrics')
    .select('date, steps, distance_meters, calories, avg_heart_rate, sleep_minutes')
    .eq('user_id', userId)
    .gte('date', sinceKey)
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to list daily fitness metrics:', error);
    return [];
  }

  // The select list matches DailyMetric field for field, so the compiler checks
  // this rather than a cast asserting it.
  return data ?? [];
}
