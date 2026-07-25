/**
 * React binding for the progression store.
 *
 * `useSyncExternalStore` again: the profile card, the challenge sheet, the
 * mastery rows and the post-match report all read one snapshot in one commit, so
 * a level-up cannot be shown by one component and missed by another.
 */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { challengesForDay } from './challenges';
import {
  getProgression,
  hydrateFromCloud,
  refreshProgression,
  reportMatch,
  subscribeProgression,
} from './store';
import type { GameId, MatchReport, MatchResult, ProgressionState } from './types';
import { levelProgress, masteryProgress, rankForLevel } from './xp';

export interface UseProgressionResult {
  state: ProgressionState;
  level: ReturnType<typeof levelProgress>;
  rank: ReturnType<typeof rankForLevel>;
  /** Today's challenges joined with their stored progress. */
  challenges: {
    definition: ReturnType<typeof challengesForDay>[number];
    progress: number;
    completed: boolean;
  }[];
  mastery: (game: GameId) => ReturnType<typeof masteryProgress>;
  report: (result: MatchResult) => MatchReport;
}

export function useProgression(): UseProgressionResult {
  const state = useSyncExternalStore(subscribeProgression, getProgression, getProgression);

  // One cloud reconciliation per session, and housekeeping whenever the tab
  // comes back — a device left open overnight must roll into the new day.
  useEffect(() => {
    void hydrateFromCloud();
    const onWake = () => refreshProgression();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, []);

  const level = useMemo(() => levelProgress(state.xp), [state.xp]);
  const rank = useMemo(() => rankForLevel(level.level), [level.level]);

  const challenges = useMemo(() => {
    const sheet = state.challenges;
    if (!sheet) return [];
    const definitions = challengesForDay(sheet.day);
    return definitions.map((definition) => {
      const item = sheet.items.find((i) => i.id === definition.id);
      return {
        definition,
        progress: item?.progress ?? 0,
        completed: item?.completed ?? false,
      };
    });
  }, [state.challenges]);

  const mastery = useCallback(
    (game: GameId) => masteryProgress(state.mastery[game]?.xp ?? 0),
    [state.mastery],
  );

  return { state, level, rank, challenges, mastery, report: reportMatch };
}
