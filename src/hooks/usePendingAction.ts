/**
 * Response-time discipline (Stage 5).
 *
 * The rule: no tap may sit for more than ~100ms without the interface
 * acknowledging it. But a spinner that appears for 40ms and vanishes is
 * itself a flicker, so there are two distinct states:
 *
 *   pending  – true on the same frame as the tap. Use it for the cheap,
 *              non-layout acknowledgement (dim, press, disable).
 *   busy     – true only once the work outlives BUSY_AFTER_MS. Use it for
 *              the deliberate affordance (spinner, "جارٍ…", progress).
 *
 * Anything fast enough never shows a spinner; anything genuinely slow
 * always does. The UI is never frozen in either case.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/** Below this, a loading affordance would read as a flicker. */
export const BUSY_AFTER_MS = 120;

export interface PendingAction<A extends unknown[]> {
  run: (...args: A) => Promise<void>;
  /** Instant acknowledgement — set on the tap frame. */
  pending: boolean;
  /** Deliberate loading affordance — only for genuinely slow work. */
  busy: boolean;
}

export function usePendingAction<A extends unknown[]>(
  action: (...args: A) => Promise<unknown>,
  busyAfterMs: number = BUSY_AFTER_MS,
): PendingAction<A> {
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const run = useCallback(
    async (...args: A) => {
      if (pending) return; // one in flight; a second tap is noise
      setPending(true);
      timer.current = window.setTimeout(() => {
        if (alive.current) setBusy(true);
      }, busyAfterMs);

      try {
        await action(...args);
      } finally {
        if (timer.current !== null) {
          window.clearTimeout(timer.current);
          timer.current = null;
        }
        if (alive.current) {
          setPending(false);
          setBusy(false);
        }
      }
    },
    [action, busyAfterMs, pending],
  );

  return { run, pending, busy };
}

export default usePendingAction;
