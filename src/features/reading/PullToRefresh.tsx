import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Touch-only pull-to-refresh wrapper. Only fires when the inner
 * container is scrolled all the way to the top. The visual indicator
 * fades in based on pull progress; once the threshold is crossed and
 * the user releases, `onRefresh` runs.
 *
 * The wrapper does NOT replace native browser refresh on desktop —
 * it's a thin overlay above whatever children pass through.
 */
export function PullToRefresh({
  onRefresh,
  refreshing,
  children,
}: {
  onRefresh: () => void | Promise<void>;
  refreshing: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  const triggered = useRef(false);

  // Tunables
  const THRESHOLD = 70;
  const MAX = 110;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 4) return; // only pull from the top
      startY.current = e.touches[0].clientY;
      triggered.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // Resistance curve so the pull feels rubbery
      const resisted = Math.min(MAX, dy * 0.55);
      setPull(resisted);
    };

    const onTouchEnd = () => {
      if (pull >= THRESHOLD && !triggered.current && !refreshing) {
        triggered.current = true;
        Promise.resolve(onRefresh()).finally(() => {
          // The refreshing prop will drop back to false; reset visual pull
          setPull(0);
        });
      } else {
        setPull(0);
      }
      startY.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, pull, refreshing]);

  // Reset pull state when refreshing flips back to false
  useEffect(() => {
    if (!refreshing) setPull(0);
  }, [refreshing]);

  const visible = pull > 4 || refreshing;
  const ratio = refreshing ? 1 : Math.min(1, pull / THRESHOLD);

  return (
    <div ref={ref} className="relative h-full overflow-y-auto">
      <div
        aria-hidden={!visible}
        className="absolute inset-x-0 top-0 flex items-center justify-center pointer-events-none transition-opacity"
        style={{
          height: 56,
          opacity: visible ? 1 : 0,
          transform: `translateY(${refreshing ? 0 : pull * 0.35 - 28}px)`,
          transition: refreshing ? 'transform 0.2s ease' : undefined,
          zIndex: 10,
        }}
      >
        <div
          className="rounded-full bg-card shadow-md border border-border/50 p-2"
          style={{
            transform: `rotate(${ratio * 360}deg) scale(${0.8 + ratio * 0.3})`,
          }}
        >
          <RefreshCw
            className={`h-4 w-4 text-primary ${refreshing ? 'animate-spin' : ''}`}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
