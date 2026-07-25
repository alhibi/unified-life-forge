import { type ReactNode,useCallback, useEffect, useRef, useState } from 'react';

import { RefreshCw, WifiOff } from '@/lib/icons';

/**
 * Touch-only pull- wrapper with improved reliability.
 *
 * Improvements over the previous implementation:
 *  - Uses non-passive touchmove when actively pulling (so we can
 *    preventDefault to avoid browser scroll-bounce interference).
 *  - Haptic feedback (navigator.vibrate) when the threshold is crossed.
 *  - Three visual states: idle → pulling → triggered → refreshing.
 *  - Handles edge cases: rapid pull-release, scroll container not at
 *    top, multi-touch gestures, horizontal swipes.
 *  - Offline-aware: shows a different icon when device is offline.
 *  - Properly cleans up all event listeners on unmount.
 *  - No memory leaks from stale closures (uses refs for mutable state).
 */

// ─── Tunables ──────────────────────────────────────────────────────────────
const THRESHOLD = 65;
const MAX_PULL = 120;
const RESISTANCE = 0.5;
/** Minimum horizontal distance that aborts the pull (prevents hijacking swipes). */
const HORIZONTAL_ABORT = 30;

type PullState = 'idle' | 'pulling' | 'threshold-crossed' | 'refreshing';

export function PullToRefresh({
  onRefresh,
  refreshing,
  children,
}: {
  onRefresh: () => void | Promise<void>;
  refreshing: boolean;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullState, setPullState] = useState<PullState>('idle');

  // Mutable refs for gesture tracking (avoids stale closure issues)
  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);
  const currentPull = useRef(0);
  const aborted = useRef(false);
  const hapticFired = useRef(false);

  // Sync refreshing prop → pull state
  useEffect(() => {
    if (refreshing) {
      setPullState('refreshing');
    } else if (pullState === 'refreshing') {
      // Refresh complete — animate back to idle
      setPullState('idle');
      setPullDistance(0);
      currentPull.current = 0;
    }
  }, [refreshing, pullState]);

  // ─── Haptic feedback ──────────────────────────────────────────────────
  const triggerHaptic = useCallback(() => {
    if (hapticFired.current) return;
    hapticFired.current = true;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15); // Short subtle buzz
      } catch { /* vibrate not supported on this device */ }
    }
  }, []);

  // ─── Touch handlers ───────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only start pull gesture if scrolled to the very top
      if (el.scrollTop > 4) return;
      // Ignore multi-touch
      if (e.touches.length > 1) return;
      // Don't start if already refreshing
      if (refreshing) return;

      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      aborted.current = false;
      hapticFired.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || startX.current === null) return;
      if (aborted.current) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const dy = currentY - startY.current;
      const dx = Math.abs(currentX - startX.current);

      // Abort if this looks like a horizontal swipe
      if (dx > HORIZONTAL_ABORT && dy < dx) {
        aborted.current = true;
        setPullDistance(0);
        setPullState('idle');
        currentPull.current = 0;
        return;
      }

      // Only pull downward
      if (dy <= 0) {
        setPullDistance(0);
        setPullState('idle');
        currentPull.current = 0;
        return;
      }

      // Apply resistance curve for rubbery feel
      const resisted = Math.min(MAX_PULL, dy * RESISTANCE);
      currentPull.current = resisted;
      setPullDistance(resisted);

      // Determine state
      if (resisted >= THRESHOLD) {
        setPullState('threshold-crossed');
        triggerHaptic();
      } else {
        setPullState('pulling');
      }

      // Prevent native scroll bounce while actively pulling
      if (el.scrollTop <= 0 && dy > 0) {
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;

      const pull = currentPull.current;

      if (pull >= THRESHOLD && !refreshing && !aborted.current) {
        // Trigger refresh
        setPullState('refreshing');
        setPullDistance(THRESHOLD * 0.6); // Snap to a "refreshing" position
        try {
          Promise.resolve(onRefresh());
        } catch { /* onRefresh errors handled by caller */ }
      } else {
        // Snap back
        setPullState('idle');
        setPullDistance(0);
      }

      // Reset tracking
      startY.current = null;
      startX.current = null;
      currentPull.current = 0;
      aborted.current = false;
    };

    const onTouchCancel = () => {
      startY.current = null;
      startX.current = null;
      currentPull.current = 0;
      aborted.current = false;
      setPullDistance(0);
      setPullState('idle');
    };

    // touchstart and touchend are passive (we don't call preventDefault on them)
    // touchmove is NOT passive so we can preventDefault to stop scroll-bounce
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [onRefresh, refreshing, triggerHaptic]);

  // ─── Visual state ─────────────────────────────────────────────────────
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const visible = pullDistance > 4 || pullState === 'refreshing';
  const ratio = pullState === 'refreshing'
    ? 1
    : Math.min(1, pullDistance / THRESHOLD);
  const crossed = pullState === 'threshold-crossed' || pullState === 'refreshing';

  return (
    <div ref={containerRef} className="relative flex-1 overflow-y-auto">
      {/* Pull indicator */}
      <div
        aria-hidden={!visible}
        className="absolute inset-x-0 top-0 flex items-center justify-center pointer-events-none z-raised"
        style={{
          height: 56,
          opacity: visible ? 1 : 0,
          transform: `translateY(${
            pullState === 'refreshing'
              ? 8
              : Math.max(-28, pullDistance * 0.4 - 28)
          }px)`,
          transition: pullState === 'idle'
            ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s'
            : pullState === 'refreshing'
              ? 'transform 0.2s ease'
              : undefined,
        }}
      >
        <div
          className={`rounded-full border p-2.5 transition-all duration-200 ${
 crossed
 ? 'bg-primary/10 border-primary/30 scale-110'
 : 'bg-card border-border/50'
 }`}
          style={{
            transform: `rotate(${ratio * 360}deg) scale(${0.75 + ratio * 0.35})`,
          }}
        >
          {!isOnline ? (
            <WifiOff className="h-4 w-4 text-amber-500" />
          ) : (
            <RefreshCw
              className={`h-4 w-4 transition-colors ${
                crossed ? 'text-primary' : 'text-muted-foreground'
              } ${pullState === 'refreshing' ? 'animate-spin' : ''}`}
            />
          )}
        </div>
      </div>

      {/* Release hint text */}
      {pullState === 'threshold-crossed' && (
        <div
          className="absolute inset-x-0 top-12 flex justify-center pointer-events-none z-raised"
          style={{
            opacity: Math.min(1, (pullDistance - THRESHOLD) / 20),
            transition: 'opacity 0.15s',
          }}
        >
          <span className="text-[0.625rem] font-medium text-primary/80">
            {isOnline
              ? (typeof document !== 'undefined' && document.documentElement.lang === 'ar'
                  ? 'اترك للتحديث'
                  : 'Release to refresh')
              : (typeof document !== 'undefined' && document.documentElement.lang === 'ar'
                  ? 'بدون اتصال'
                  : 'Offline')}
          </span>
        </div>
      )}

      {children}
    </div>
  );
}
