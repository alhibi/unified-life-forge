// ─────────────────────────────────────────────────────────────────────────────
// useSwipe — pointer-event based swipe detection (Web Native 2026).
//
// Returns a ref + handlers you can spread on any element. Detects directional
// swipes using a minimum distance, minimum velocity, and dominant-axis check
// so a vertical scroll doesn't accidentally fire a horizontal swipe.
//
// Why Pointer Events over Touch Events:
//   1. Works for mouse + touch + pen with one code path.
//   2. Browser delivers `pointercancel` when the user agent decides to take
//      over (e.g. a system scroll) so we can clean up state cleanly.
//   3. `setPointerCapture` keeps the events flowing to our element even if
//      the finger leaves the bounds — critical for fast swipes.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useRef } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeEvent {
  direction: SwipeDirection;
  /** px/ms — useful to differentiate a fling from a slow drag */
  velocity: number;
  /** signed delta in the swipe's primary axis */
  delta: number;
  /** the originating PointerEvent so callers can call preventDefault etc. */
  source: PointerEvent;
}

export interface UseSwipeOptions {
  /** Minimum distance in pixels before a swipe registers. Default 50. */
  minDistance?: number;
  /** Minimum velocity in px/ms (~ 300 px/s). Default 0.3. */
  minVelocity?: number;
  /** Allow vertical swipes (default true). */
  vertical?: boolean;
  /** Allow horizontal swipes (default true). */
  horizontal?: boolean;
}

export function useSwipe<T extends HTMLElement>(
  onSwipe: (e: SwipeEvent) => void,
  options: UseSwipeOptions = {},
) {
  const {
    minDistance = 50,
    minVelocity = 0.3,
    vertical = true,
    horizontal = true,
  } = options;

  const startRef = useRef<{ x: number; y: number; t: number; id: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<T>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      id: e.pointerId,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  }, []);

  const finish = useCallback((e: React.PointerEvent<T>) => {
    const start = startRef.current;
    if (!start || start.id !== e.pointerId) return;
    startRef.current = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* noop */ }

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = Math.max(performance.now() - start.t, 1);

    const horizDominant = Math.abs(dx) >= Math.abs(dy);

    if (horizDominant && horizontal && Math.abs(dx) >= minDistance) {
      const velocity = Math.abs(dx) / dt;
      if (velocity >= minVelocity) {
        onSwipe({
          direction: dx > 0 ? 'right' : 'left',
          velocity,
          delta: dx,
          source: e.nativeEvent,
        });
        return;
      }
    }
    if (!horizDominant && vertical && Math.abs(dy) >= minDistance) {
      const velocity = Math.abs(dy) / dt;
      if (velocity >= minVelocity) {
        onSwipe({
          direction: dy > 0 ? 'down' : 'up',
          velocity,
          delta: dy,
          source: e.nativeEvent,
        });
      }
    }
  }, [onSwipe, minDistance, minVelocity, vertical, horizontal]);

  const onPointerCancel = useCallback((e: React.PointerEvent<T>) => {
    if (!startRef.current || startRef.current.id !== e.pointerId) return;
    startRef.current = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* noop */ }
  }, []);

  return {
    onPointerDown,
    onPointerUp: finish,
    onPointerCancel,
  };
}
