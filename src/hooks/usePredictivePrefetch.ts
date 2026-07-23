import { useEffect, useRef } from 'react';
import { prefetchRoute } from '@/lib/routePrefetch';

interface PointerState {
  x: number;
  y: number;
  time: number;
}

export function usePredictivePrefetch() {
  const points = useRef<PointerState[]>([]);
  const prefetchedPaths = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Keep tracks of prefetching to avoid duplicate requests in quick succession
    const clearedTimer = setInterval(() => {
      prefetchedPaths.current.clear();
    }, 10000); // clear cache every 10s

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      const currentPoint: PointerState = { x: e.clientX, y: e.clientY, time: now };

      points.current.push(currentPoint);

      // Keep only last 5 points for immediate trajectory calculations
      if (points.current.length > 5) {
        points.current.shift();
      }

      if (points.current.length < 3) return;

      const pStart = points.current[0];
      const pEnd = points.current[points.current.length - 1];

      const dt = pEnd.time - pStart.time;
      if (dt <= 0) return;

      // Calculate velocity vectors (px/ms)
      const vx = (pEnd.x - pStart.x) / dt;
      const vy = (pEnd.y - pStart.y) / dt;
      const velocity = Math.sqrt(vx * vx + vy * vy);

      // Only perform predictive calculation when pointer has deliberate speed (e.g. > 0.15 px/ms)
      if (velocity > 0.15) {
        // Find all interactive links/anchors on screen that represent routes
        const elements = document.querySelectorAll('a[href], button[data-route], [data-prefetch-target]');

        elements.forEach((el) => {
          const rect = el.getBoundingClientRect();

          // Calculate vector from pointer to center of element
          const targetX = rect.left + rect.width / 2;
          const targetY = rect.top + rect.height / 2;

          const toTargetX = targetX - pEnd.x;
          const toTargetY = targetY - pEnd.y;
          const distance = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY);

          if (distance > 300) return; // Ignore elements too far away to predict reliably

          // Cosine similarity to determine if velocity vector aligns with target direction
          const dotProduct = vx * toTargetX + vy * toTargetY;
          const alignment = dotProduct / (velocity * distance);

          // Alignment value > 0.85 indicates cursor is heading directly towards element
          if (alignment > 0.85) {
            // Retrieve path
            let path = '';
            if (el instanceof HTMLAnchorElement) {
              const href = el.getAttribute('href');
              if (href && href.startsWith('/')) {
                path = href;
              }
            } else {
              const routeAttr = el.getAttribute('data-route') || el.getAttribute('data-prefetch-target');
              if (routeAttr && routeAttr.startsWith('/')) {
                path = routeAttr;
              }
            }

            if (path && !prefetchedPaths.current.has(path)) {
              prefetchedPaths.current.add(path);
              prefetchRoute(path);
              console.debug(`[Predictive Prefetch Engine] Warming up intended route: "${path}"`);
            }
          }
        });
      }
    };

    // Lightweight touchscreen fallback: Prefetch instantly on first touch down
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const interactiveEl = target.closest('a[href], [data-route], [data-prefetch-target]');

      if (interactiveEl) {
        let path = '';
        if (interactiveEl instanceof HTMLAnchorElement) {
          const href = interactiveEl.getAttribute('href');
          if (href && href.startsWith('/')) {
            path = href;
          }
        } else {
          const routeAttr = interactiveEl.getAttribute('data-route') || interactiveEl.getAttribute('data-prefetch-target');
          if (routeAttr && routeAttr.startsWith('/')) {
            path = routeAttr;
          }
        }

        if (path && !prefetchedPaths.current.has(path)) {
          prefetchedPaths.current.add(path);
          prefetchRoute(path);
          console.debug(`[Predictive Touch Engine] Mobile warming: "${path}"`);
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      clearInterval(clearedTimer);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);
}
