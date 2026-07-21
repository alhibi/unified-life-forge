/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase as _sb } from '@/integrations/supabase/client';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _sb;

export async function saveCloudSubscription(
  feedUrl: string,
  title: string,
  image: string,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  const { error } = await supabase.from('podcast_subscriptions').upsert({
    user_id: userId,
    feed_url: feedUrl,
    title,
    image,
    added_at: new Date().toISOString(),
  });

  if (error) {
    if (!error.message?.includes('supabase_not_configured')) {
      console.error('Error saving subscription to cloud:', error);
    }
  }
}

export async function deleteCloudSubscription(feedUrl: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from('podcast_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('feed_url', feedUrl);

  if (error) console.error('Error deleting subscription from cloud:', error);
}

// Throttle play state updates to avoid excessive database writes
const stateThrottle: Record<string, { timeout: any; lastSave: number }> = {};

export async function saveCloudEpisodeState(
  guid: string,
  feedUrl: string,
  positionSec: number,
  durationSec: number,
  completed: boolean,
  force = false,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  const now = Date.now();
  const throttle = stateThrottle[guid];

  if (!force && throttle && now - throttle.lastSave < 5000) {
    // Throttle: schedule a save at the end of the 5s window
    clearTimeout(throttle.timeout);
    throttle.timeout = setTimeout(
      () => {
        saveCloudEpisodeState(guid, feedUrl, positionSec, durationSec, completed, true);
      },
      5000 - (now - throttle.lastSave),
    );
    return;
  }

  if (throttle) {
    clearTimeout(throttle.timeout);
  }
  stateThrottle[guid] = { timeout: null, lastSave: now };

  const { error } = await supabase.from('podcast_episode_state').upsert({
    user_id: userId,
    episode_guid: guid,
    feed_url: feedUrl,
    position_sec: Math.round(positionSec),
    duration_sec: Math.round(durationSec),
    completed,
    played_at: new Date().toISOString(),
  });

  if (error) {
    if (!error.message?.includes('supabase_not_configured')) {
      console.error('Error saving episode state to cloud:', error);
    }
  }
}

export async function saveCloudQueue(
  queue: { episode_guid: string; feed_url: string; position: number }[],
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  const { error: deleteError } = await supabase
    .from('podcast_queue')
    .delete()
    .eq('user_id', userId);

  if (deleteError) return;

  if (queue.length === 0) return;

  const rows = queue.map((q) => ({
    user_id: userId,
    episode_guid: q.episode_guid,
    feed_url: q.feed_url,
    position: q.position,
    added_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('podcast_queue').insert(rows);
  if (error) console.error('Error saving queue to cloud:', error);
}

export async function saveCloudPrefs(prefs: Record<string, any>): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  const { error } = await supabase.from('podcast_prefs').upsert({
    user_id: userId,
    prefs,
    updated_at: new Date().toISOString(),
  });

  if (error) console.error('Error saving prefs to cloud:', error);
}
