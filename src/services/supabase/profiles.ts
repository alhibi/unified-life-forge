import type { Database } from './client';
import { supabase } from './client';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Fetches a user profile by user ID.
 * This is a working example proving the centralized Supabase service pattern.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data;
}
