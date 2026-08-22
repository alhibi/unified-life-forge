/**
 * Streak Store — the single source of truth for streak state app-wide.
 *
 * Every surface (Portal flame badge, profile hero chip, streak panel,
 * identity pass, midnight guardian) reads from this one store. Any component
 * that records fresh activity calls `invalidateStreakStore()`, and all live
 * subscribers recompute on the next tick — so the UI can never show a stale
 * number after a new activity lands.
 *
 * Backed by useSyncExternalStore; safe for SSR (returns null pre-hydration).
 */
import { calculate365DayContributions } from './activityAggregator';
import {
  buildStreakSnapshot,
  type StreakSnapshot,
} from './streakEngine';

/* ------------------------------------------------------------------ */
/* Store internals                                                     */
/* ------------------------------------------------------------------ */

let cached: StreakSnapshot | null = null;
let computed = false;
const listeners = new Set<() => void>();

const INVALIDATE_EVENT = 'amv:streak-invalidate';

function computeSnapshot(): StreakSnapshot | null {
  try {
    const cells = calculate365DayContributions().dailyContributions;
    return buildStreakSnapshot(cells);
  } catch {
    return null;
  }
}

export const streakStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    // Cross-instance invalidation (e.g. another tab fired a custom event).
    window.addEventListener(INVALIDATE_EVENT, listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener(INVALIDATE_EVENT, listener);
    };
  },

  getSnapshot(): StreakSnapshot | null {
    if (!computed) {
      cached = computeSnapshot();
      computed = true;
    }
    return cached;
  },

  getServerSnapshot(): StreakSnapshot | null {
    return null;
  },
};

/**
 * Drops the cache and notifies every subscriber. Call after recording any
 * new activity (visit, mastered word, workout, dhikr, poem save…).
 * Recomputation happens lazily on next read, batched by React.
 */
export function invalidateStreakStore(): void {
  computed = false;
  cached = null;
  listeners.forEach((l) => l());
  window.dispatchEvent(new Event(INVALIDATE_EVENT));
}

/* ------------------------------------------------------------------ */
/* Convenience hooks (plain functions over useSyncExternalStore)       */
/* ------------------------------------------------------------------ */

import { useSyncExternalStore } from 'react';

/** Full snapshot — panels that need modules/rhythm/risk. */
export function useStreakSnapshot(): StreakSnapshot | null {
  return useSyncExternalStore(
    streakStore.subscribe,
    streakStore.getSnapshot,
    streakStore.getServerSnapshot
  );
}

/** Just the unified current-streak number — chips and badges. */
export function useUnifiedStreakDays(): number | null {
  const snap = useStreakSnapshot();
  return snap?.unified.currentStreakDays ?? null;
}
