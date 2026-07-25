/**
 * React binding for the Mihrab practice store.
 *
 * `useSyncExternalStore` is the correct primitive here: the value is read during
 * render (so the header ring is right on first paint), the subscription needs no
 * setState-in-effect, and every consumer sees the same snapshot in the same
 * commit — the counter, the header ring and the checklists cannot disagree.
 *
 * The day key is also re-derived on visibility change: leaving the app open
 * overnight must roll the sheet over to the new day instead of continuing to
 * write into yesterday.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import {
  applyCommitSunnah,
  applyDhikrCount,
  applyDhikrReset,
  applyDhikrTarget,
  applySetWird,
  applySunnahToggle,
  applyToggleDhikrPinned,
  applyWirdToggle,
  dayKey,
  getPracticeState,
  type PracticeState,
  selectDayProgress,
  selectRecentDays,
  selectStreak,
  subscribePractice,
  updatePractice,
} from './practice';

export interface UsePracticeResult {
  state: PracticeState;
  /** Local day key the UI is writing into. */
  today: string;
  progress: ReturnType<typeof selectDayProgress>;
  streak: ReturnType<typeof selectStreak>;
  recentDays: ReturnType<typeof selectRecentDays>;
  countDhikr: (id: string, delta?: number) => void;
  resetDhikr: (id: string) => void;
  setDhikrTarget: (id: string, target: number) => void;
  toggleDhikrPinned: (id: string, defaultTarget: number) => void;
  toggleSunnah: (id: string) => void;
  commitSunnah: (id: string) => void;
  toggleWird: () => void;
  setWird: (pages: number | null) => void;
}

export function usePractice(): UsePracticeResult {
  const state = useSyncExternalStore(subscribePractice, getPracticeState, getPracticeState);
  const [today, setToday] = useState(() => dayKey());

  useEffect(() => {
    const sync = () => {
      const next = dayKey();
      setToday((prev) => (prev === next ? prev : next));
    };
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    // Also arm a timer for the next local midnight so an app left open on a
    // desk rolls over without any user interaction.
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 5, 0);
    const timer = window.setTimeout(sync, Math.max(1000, midnight.getTime() - now.getTime()));
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
      window.clearTimeout(timer);
    };
  }, []);

  const progress = useMemo(() => selectDayProgress(state, today), [state, today]);
  const streak = useMemo(() => selectStreak(state, today), [state, today]);
  const recentDays = useMemo(() => selectRecentDays(state, 28, today), [state, today]);

  const countDhikr = useCallback(
    (id: string, delta = 1) => updatePractice((s) => applyDhikrCount(s, id, delta, dayKey())),
    [],
  );
  const resetDhikr = useCallback((id: string) => updatePractice((s) => applyDhikrReset(s, id, dayKey())), []);
  const setDhikrTarget = useCallback(
    (id: string, target: number) => updatePractice((s) => applyDhikrTarget(s, id, target)),
    [],
  );
  const toggleDhikrPinned = useCallback(
    (id: string, defaultTarget: number) => updatePractice((s) => applyToggleDhikrPinned(s, id, defaultTarget)),
    [],
  );
  const toggleSunnah = useCallback((id: string) => updatePractice((s) => applySunnahToggle(s, id, dayKey())), []);
  const commitSunnah = useCallback((id: string) => updatePractice((s) => applyCommitSunnah(s, id)), []);
  const toggleWird = useCallback(() => updatePractice((s) => applyWirdToggle(s, dayKey())), []);
  const setWird = useCallback((pages: number | null) => updatePractice((s) => applySetWird(s, pages)), []);

  return {
    state,
    today,
    progress,
    streak,
    recentDays,
    countDhikr,
    resetDhikr,
    setDhikrTarget,
    toggleDhikrPinned,
    toggleSunnah,
    commitSunnah,
    toggleWird,
    setWird,
  };
}
