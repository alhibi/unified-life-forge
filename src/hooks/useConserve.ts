import { useEffect, useState } from 'react';

import {
  type ConserveLevel,
  conserveLevel,
  pollInterval,
  subscribeConserve,
} from '@/lib/conserve';

/**
 * Read the live conservation level in a component (for copy like "التحديث
 * التلقائي متوقف لتوفير البطارية"). Re-renders only when the level actually
 * changes, not on every battery percent tick.
 */
export function useConserveLevel(): ConserveLevel {
  const [level, setLevel] = useState<ConserveLevel>(() => conserveLevel());
  useEffect(() => subscribeConserve(() => setLevel(conserveLevel())), []);
  return level;
}

/**
 * A background poller that obeys the device.
 *
 * Replaces `setInterval(fn, ms)` for every non-essential refresh in the app and
 * adds the three behaviours a hand-rolled interval always forgets:
 *
 *   • it stretches (soft) or stops (hard, when `optional`) under battery/data
 *     conservation, and re-arms itself the moment conditions change,
 *   • it does not tick while the tab/app is hidden — background ticks were the
 *     single biggest source of pointless work and wakeups,
 *   • it fires once immediately on coming back to the foreground when
 *     `refreshOnResume` is set, so the user sees fresh data instead of the
 *     stale frame plus a delay.
 *
 * @returns nothing; cleanup is automatic.
 */
export function useConservingInterval(
  fn: () => void,
  baseMs: number,
  {
    optional = false,
    enabled = true,
    refreshOnResume = false,
  }: { optional?: boolean; enabled?: boolean; refreshOnResume?: boolean } = {},
): void {
  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const clear = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const arm = () => {
      clear();
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const ms = pollInterval(baseMs, optional);
      if (ms === null) return; // suspended by policy
      timer = setInterval(fn, ms);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (refreshOnResume) fn();
        arm();
      } else {
        clear();
      }
    };

    arm();
    const unsubscribe = subscribeConserve(arm);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clear();
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // `fn` is intentionally a dependency: callers pass a stable useCallback, and
    // a changed identity means a changed closure that must be re-armed.
  }, [fn, baseMs, optional, enabled, refreshOnResume]);
}
