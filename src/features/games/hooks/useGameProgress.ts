/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGameProgress, saveGameProgress } from '../api';
import { gameKeys } from './queryKeys';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

function getLegacyKey(game: string): string {
  switch (game) {
    case 'chess-career': return 'chess-career';
    case 'sudoku': return 'sudoku-stats';
    case 'memory': return 'memory-stats';
    case 'focus': return 'focus-stats';
    case 'focus-decathlon': return 'focus-decathlon-save';
    case 'dice': return 'dice-stats';
    case 'chess-puzzle': return 'chess-puzzle-stats';
    case 'chess': return 'chess-stats';
    case 'dice-tournament': return 'dice-tournament-state';
    case 'memory-adventure': return 'memory-adventure-save';
    default: return `game-stats-${game}`;
  }
}

export function useGameProgress<T>(game: string, defaultState: T) {
  const queryClient = useQueryClient();

  // Load first-paint cache from localStorage (mirroring user_settings)
  const getLocalCache = (): T => {
    try {
      const cached = localStorage.getItem(`cloud-game-progress-${game}`);
      if (cached) return JSON.parse(cached) as T;
    } catch (e) {
      console.error(e);
    }
    // Fallback to legacy key if it exists
    try {
      const legacyKey = getLegacyKey(game);
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) return { ...defaultState, ...JSON.parse(legacy) } as T;
    } catch (e) {
      console.error(e);
    }
    return defaultState;
  };

  const { data: state = getLocalCache(), isLoading } = useQuery({
    queryKey: gameKeys.progress(game),
    queryFn: async () => {
      if (!isSupabaseConfigured) return getLocalCache();
      const cloudData = await getGameProgress(game);
      if (cloudData) {
        const merged = { ...defaultState, ...cloudData } as T;
        // Sync to local cache
        localStorage.setItem(`cloud-game-progress-${game}`, JSON.stringify(merged));
        // Also sync back to legacy localStorage keys for backward compatibility
        const legacyKey = getLegacyKey(game);
        localStorage.setItem(legacyKey, JSON.stringify(merged));
        return merged;
      }
      return getLocalCache();
    },
    staleTime: 30000,
  });

  const { mutateAsync: updateProgress } = useMutation({
    mutationFn: async (newState: T) => {
      // Optimistically update local cache & legacy key
      localStorage.setItem(`cloud-game-progress-${game}`, JSON.stringify(newState));
      const legacyKey = getLegacyKey(game);
      localStorage.setItem(legacyKey, JSON.stringify(newState));

      // Synchronously dispatch storage event for multi-tab sync
      window.dispatchEvent(new Event('storage'));

      if (isSupabaseConfigured) {
        await saveGameProgress(game, newState as Record<string, any>);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(gameKeys.progress(game), variables);
    },
  });

  return { state, updateProgress, isLoading };
}
