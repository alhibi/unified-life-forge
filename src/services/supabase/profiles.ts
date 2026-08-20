// Imported straight from the generated client. `src/services/supabase/client.ts`
// used to sit in between as a file that only re-exported these two symbols,
// which made it look like the app had two Supabase clients.
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Fetches a user profile by user ID.
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

/**
 * Checks if a username is available.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase().trim())
    .maybeSingle();

  if (error) {
    console.error('Error checking username availability:', error);
    throw error;
  }

  return !data;
}

/**
 * Updates a user's profile information and auth metadata.
 */
export async function updateProfileAndAuth(
  userId: string,
  profileData: {
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    title?: string | null;
    location?: string | null;
    website_url?: string | null;
    social_links?: Record<string, string | null>;
    status_text?: string | null;
    status_emoji?: string | null;
    featured_badges?: string[];
    profile_theme?: string;
    is_public?: boolean;
    privacy_settings?: Record<string, boolean>;
  }
): Promise<void> {
  const payload: Record<string, any> = {
    username: profileData.username.toLowerCase().trim(),
  };

  if (profileData.display_name !== undefined) payload.display_name = profileData.display_name?.trim() || null;
  if (profileData.avatar_url !== undefined) payload.avatar_url = profileData.avatar_url;
  if (profileData.bio !== undefined) payload.bio = profileData.bio?.trim() || null;
  if (profileData.title !== undefined) payload.title = profileData.title?.trim() || null;
  if (profileData.location !== undefined) payload.location = profileData.location?.trim() || null;
  if (profileData.website_url !== undefined) payload.website_url = profileData.website_url?.trim() || null;
  if (profileData.social_links !== undefined) payload.social_links = profileData.social_links;
  if (profileData.status_text !== undefined) payload.status_text = profileData.status_text?.trim() || null;
  if (profileData.status_emoji !== undefined) payload.status_emoji = profileData.status_emoji || '✨';
  if (profileData.featured_badges !== undefined) payload.featured_badges = profileData.featured_badges;
  if (profileData.profile_theme !== undefined) payload.profile_theme = profileData.profile_theme;
  if (profileData.is_public !== undefined) payload.is_public = profileData.is_public;
  if (profileData.privacy_settings !== undefined) payload.privacy_settings = profileData.privacy_settings;

  const { error } = await supabase
    .from('profiles')
    .update(payload as any)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  // Also update the auth user metadata with the username
  const { error: authError } = await supabase.auth.updateUser({
    data: { username: profileData.username.toLowerCase().trim() },
  });

  if (authError) {
    console.error('Error updating auth metadata:', authError);
    throw authError;
  }
}

/**
 * Uploads a file to the 'avatars' storage bucket and returns its public URL.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error('Error uploading avatar storage:', uploadError);
    throw uploadError;
  }

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Add cache-busting parameter
  return `${urlData.publicUrl}?t=${Date.now()}`;
}
