import type { Database } from './client';
import { supabase } from './client';

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
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      username: profileData.username.toLowerCase().trim(),
      display_name: profileData.display_name?.trim() || null,
      avatar_url: profileData.avatar_url,
      bio: profileData.bio?.trim() || null,
    } as any)
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
