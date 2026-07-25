/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase as _sb } from '@/integrations/supabase/client';
 
const supabase: any = _sb;

export async function getGameProgress(game: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('game_progress')
    .select('state')
    .eq('game', game)
    .maybeSingle();

  if (error) {
    if (error.message?.includes('supabase_not_configured')) {
      return null;
    }
    console.error(`Error loading progress for game ${game}:`, error);
    return null;
  }
  return data?.state || null;
}

// In-memory debounce store per game slug to batch rapid writes
const debounceTimers: Record<string, { timeout: any; lastState: Record<string, any> }> = {};

export async function saveGameProgress(game: string, state: Record<string, any>): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  // If a save is already pending, just update the state to write and extend timer slightly
  if (debounceTimers[game]) {
    clearTimeout(debounceTimers[game].timeout);
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(async () => {
      try {
        const currentState = debounceTimers[game]?.lastState || state;
        const { error } = await supabase
          .from('game_progress')
          .upsert({
            user_id: userId,
            game,
            state: currentState,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error(`Error saving progress for game ${game}:`, error);
          reject(error);
        } else {
          resolve();
        }
      } catch (e) {
        reject(e);
      } finally {
        delete debounceTimers[game];
      }
    }, 1500); // 1.5s debounce window

    debounceTimers[game] = { timeout, lastState: state };
  });
}
