/**
 * Cloud persistence for game state.
 *
 * Degradation contract: this layer is OPTIONAL. Games are fully playable with
 * localStorage alone, so every failure path here is a silent no-op rather than an
 * error — the previous version `console.error`d on every read when the
 * `game_progress` table was absent from the project (a legitimate deployment
 * state, since the table ships in a migration that may not have been applied),
 * filling the console on every visit to the games hub.
 *
 * Genuinely unexpected failures are still surfaced, but only once per session per
 * game so a broken connection cannot produce an unbounded log.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase as _sb } from '@/integrations/supabase/client';

const supabase: any = _sb;

/** Errors that mean "there is no cloud storage here", not "something broke". */
function isBenign(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = error.message ?? '';
  return (
    message.includes('supabase_not_configured') ||
    // PGRST205: table missing from the schema cache. 42P01: relation missing.
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    message.includes('schema cache')
  );
}

const warned = new Set<string>();
function warnOnce(key: string, error: unknown) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[games] cloud sync unavailable for "${key}":`, error);
}

export async function getGameProgress(game: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('game_progress')
    .select('state')
    .eq('game', game)
    .maybeSingle();

  if (error) {
    if (!isBenign(error)) warnOnce(`read:${game}`, error);
    return null;
  }
  return data?.state || null;
}

// In-memory debounce store per game slug to batch rapid writes.
const debounceTimers: Record<string, { timeout: any; lastState: Record<string, any> }> = {};

export async function saveGameProgress(game: string, state: Record<string, any>): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  // Coalesce rapid writes: the last state within the window wins.
  if (debounceTimers[game]) {
    clearTimeout(debounceTimers[game].timeout);
  }

  return new Promise<void>((resolve) => {
    const timeout = setTimeout(async () => {
      try {
        const currentState = debounceTimers[game]?.lastState || state;
        const { error } = await supabase.from('game_progress').upsert({
          user_id: userId,
          game,
          state: currentState,
          updated_at: new Date().toISOString(),
        });
        if (error && !isBenign(error)) warnOnce(`write:${game}`, error);
      } catch (e) {
        warnOnce(`write:${game}`, e);
      } finally {
        delete debounceTimers[game];
        // Always resolve: a failed cloud write must never reject into a game's
        // win handler and break the local flow.
        resolve();
      }
    }, 1500);

    debounceTimers[game] = { timeout, lastState: state };
  });
}
