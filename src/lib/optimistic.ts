/**
 * Optimistic action contract (design system §Stage 5).
 *
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║ For any reversible, low-risk action — a toggle, a "mark done", a    ║
 * ║ like, a pin — the UI must change on the same frame as the tap and   ║
 * ║ reconcile with the server afterwards. If the server refuses, the    ║
 * ║ change is rolled back AND the user is told; a silent rollback is    ║
 * ║ worse than no optimism at all, because the user believes the state  ║
 * ║ they saw.                                                          ║
 * ║                                                                    ║
 * ║ Never use this for destructive or non-reversible work (payments,    ║
 * ║ account deletion, message *edits* that other people read).         ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
import { useCallback, useRef, useState } from 'react';

import { notify } from '@/lib/notify';

export interface OptimisticOptions<T> {
  /** Paint the intended state immediately. Runs synchronously, before commit. */
  apply: () => void;
  /** Undo `apply`. Runs when commit rejects. Must be idempotent. */
  rollback: () => void;
  /** The real work. Reject (or throw) to trigger the rollback. */
  commit: () => Promise<T>;
  /** Bilingual message shown when the commit fails. */
  failure?: { ar: string; en: string };
  /** Called with the commit result on success (e.g. to store a server id). */
  onSettled?: (value: T) => void;
}

const DEFAULT_FAILURE = {
  ar: 'لم يُحفظ التغيير — أُعيد كما كان',
  en: "Change wasn't saved — reverted",
} as const;

/**
 * Run an optimistic action. Resolves `true` when the server accepted,
 * `false` when it refused and the UI was rolled back. Never rejects, so
 * call sites don't need their own try/catch to stay consistent.
 */
export async function runOptimistic<T>({
  apply,
  rollback,
  commit,
  failure = DEFAULT_FAILURE,
  onSettled,
}: OptimisticOptions<T>): Promise<boolean> {
  apply();
  try {
    const value = await commit();
    onSettled?.(value);
    return true;
  } catch (error) {
    rollback();
    notify.error(failure);
    if (import.meta.env.DEV) console.warn('[optimistic] rolled back', error);
    return false;
  }
}

/**
 * Boolean flag whose value flips instantly and reverts visibly if the
 * server refuses. `pending` is exposed so a row can show a hairline
 * "syncing" affordance without blocking the interaction.
 *
 *   const [starred, toggle, pending] = useOptimisticFlag(
 *     item.starred,
 *     (next) => api.setStarred(item.id, next),
 *   );
 */
export function useOptimisticFlag(
  initial: boolean,
  commit: (next: boolean) => Promise<unknown>,
  failure?: { ar: string; en: string },
): [boolean, () => void, boolean] {
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);
  // Guards against a double-tap racing its own rollback.
  const inflight = useRef(false);

  const toggle = useCallback(() => {
    if (inflight.current) return;
    const next = !value;
    inflight.current = true;
    setPending(true);
    void runOptimistic({
      apply: () => setValue(next),
      rollback: () => setValue(!next),
      commit: () => commit(next),
      failure,
    }).finally(() => {
      inflight.current = false;
      setPending(false);
    });
  }, [commit, failure, value]);

  return [value, toggle, pending];
}
