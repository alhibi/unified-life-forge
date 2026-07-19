import { supabase } from '@/integrations/supabase/client';

export interface StoredAudioFile {
  name: string;
  blob: Blob;
  type: string;
}

export interface AudioMeta {
  currentIndex: number;
  fileNames: string[];
}

// In-memory cache for current session signed URLs to keep playback instant
let sessionAudioCache: { files: { name: string; url: string }[]; currentIndex: number } | null = null;

export async function saveAudioFiles(files: File[]): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  // Clear existing audio files for this user from database
  await supabase.from('audio_files').delete().eq('user_id', userId);

  // Upload each file and insert metadata
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const storagePath = `${userId}/${Date.now()}-${file.name}`;

    // Upload to private 'audio' bucket
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading audio file:', uploadError);
      continue;
    }

    // Insert metadata into public.audio_files table
    const { error: dbError } = await supabase
      .from('audio_files')
      .insert({
        user_id: userId,
        name: file.name,
        storage_path: storagePath,
        size_bytes: file.size,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Error saving audio file metadata:', dbError);
    }
  }

  // Save index 0 locally
  localStorage.setItem('audio-player-index', '0');
}

export async function saveCurrentIndex(index: number): Promise<void> {
  localStorage.setItem('audio-player-index', String(index));
}

export async function loadAudioFiles(): Promise<{ files: { name: string; url: string }[]; currentIndex: number } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  if (sessionAudioCache) {
    return sessionAudioCache;
  }

  try {
    const { data: dbFiles, error } = await supabase
      .from('audio_files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error || !dbFiles || dbFiles.length === 0) {
      return null;
    }

    const files: { name: string; url: string }[] = [];

    // Create signed URLs for all files
    for (const file of dbFiles) {
      const { data, error: urlError } = await supabase.storage
        .from('audio')
        .createSignedUrl(file.storage_path, 3600); // 1 hour expiration

      if (urlError || !data?.signedUrl) {
        console.error('Error generating signed URL:', urlError);
        continue;
      }

      files.push({
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: data.signedUrl,
      });
    }

    const currentIndexRaw = localStorage.getItem('audio-player-index');
    const currentIndex = currentIndexRaw ? parseInt(currentIndexRaw, 10) : 0;

    const result = { files, currentIndex };
    // Cache in session
    sessionAudioCache = result;

    return result;
  } catch (e) {
    console.error('Error loading audio files:', e);
    return null;
  }
}

export async function clearAudioFiles(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  try {
    // List user files from DB to delete from storage
    const { data: dbFiles } = await supabase
      .from('audio_files')
      .select('storage_path')
      .eq('user_id', userId);

    if (dbFiles && dbFiles.length > 0) {
      const paths = dbFiles.map(f => f.storage_path);
      await supabase.storage.from('audio').remove(paths);
    }

    // Delete from DB
    await supabase.from('audio_files').delete().eq('user_id', userId);
    localStorage.removeItem('audio-player-index');
    sessionAudioCache = null;
  } catch (e) {
    console.error('Error clearing audio files:', e);
  }
}
