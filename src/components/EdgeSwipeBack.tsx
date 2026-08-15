import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useApp } from '@/contexts/AppContext';
import { haptics } from '@/lib/native';

/**
 * EdgeSwipeBack — global iOS-style edge-swipe-back gesture, 1:1 with the finger.
 *
 * A touch that begins inside the edge zone (left in LTR, right in RTL) drags
 * the current screen with the finger in real time; a scrim behind it fades out
 * proportionally so the depth reads correctly even though the previous screen
 * is not mounted yet. On release the gesture resolves the way UIKit does — by
 * distance OR velocity (past ~35% of the viewport, or a fast flick) — and
 * otherwise springs back to rest.
 *
 * Why the drag is imperative
 * ──────────────────────────
 * The screen is moved by writing `transform` straight onto the live page
 * surface inside the pointer handler. Routing finger movement through React
 * state would re-render the whole screen on every frame and could never hold
 * 1:1 tracking. The transform is cleared before `navigate(-1)` so
 * <PageTransition/> owns the exit animation from a clean slate, and the two
 * systems never fight over the same property.
 *
 * Directional locking
 * ───────────────────
 * The dominant axis is decided within the first ~10px. A vertical-first move
 * is released back to the scroller untouched, and a horizontal carousel under
 * the finger can opt out with `data-no-swipe-back`.
 *
 * The browser provides this gesture on iOS Safari, but it is disabled inside
 * PWAs (display-mode: standalone) and on Android Chrome. This component fills
 * the gap so the gesture works everywhere the app runs.
 *
 * Both the gesture itself and its sensitivity are preferences
 * (/settings/motion → "إيماءة الرجوع"). Sensitivity scales the edge zone and
 * inversely scales the required travel: at 1.6 a short flick from a wide edge
 * strip is enough, at 0.5 the gesture demands a deliberate, long drag — which
 * is what a user who keeps triggering it by accident actually needs.
 *
 * Implementation notes:
 *   • Passive listeners — we never preventDefault, so vertical scrolls are
 *     never starved. A gesture turning vertical mid-swipe is dropped silently.
 *   • A timestamp guard rejects touches that linger too long; a real
 *     swipe-back is short and intentional.
 *   • The navigation animation is owned by <PageTransition/> — this component
 *     is a pure trigger.
 */
const BASE_EDGE_PX = 24; // start zone from the leading edge
const AXIS_LOCK_PX = 10; // movement needed before we commit to an axis
const BASE_COMMIT_RATIO = 0.35; // fraction of the viewport that completes the pop
const FLICK_VELOCITY = 0.5; // px/ms — a fast flick completes regardless of distance
const RUBBER_BAND = 0.35; // resistance applied when dragging the wrong way
const SPRING_BACK_MS = 260;

export default function EdgeSwipeBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dir, gestureBack, gestureSensitivity } = useApp();
  const rtl = dir === 'rtl';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!gestureBack) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // A more sensitive gesture watches a wider strip and asks for less travel.
    const sensitivity = Number.isFinite(gestureSensitivity) ? gestureSensitivity : 1;
    const edgePx = Math.round(BASE_EDGE_PX * sensitivity);
    const commitRatio = Math.min(0.6, BASE_COMMIT_RATIO / sensitivity);

    let startX = 0,
      startY = 0,
      lastX = 0,
      lastT = 0,
      velocity = 0,
      axis: 'none' | 'x' | 'y' = 'none',
      tracking = false,
      surface: HTMLElement | null = null,
      scrim: HTMLElement | null = null;

    const getSurface = () =>
      document.querySelector<HTMLElement>('main#main-content [data-page-surface]');

    const ensureScrim = () => {
      if (scrim) return scrim;
      const el = document.createElement('div');
      el.setAttribute('data-edge-swipe-scrim', '');
      el.style.cssText =
        'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:0;';
      document.body.appendChild(el);
      scrim = el;
      return el;
    };

    const paint = (dx: number) => {
      if (!surface) return;
      const w = window.innerWidth || 1;
      const signed = rtl ? -dx : dx;
      surface.style.transform = `translate3d(${signed}px,0,0)`;
      if (scrim) scrim.style.opacity = String(Math.max(0, 0.28 * (1 - dx / w)));
    };

    /** Release ownership of `transform` back to <PageTransition/>. */
    const clearSurface = (animate: boolean) => {
      const el = surface;
      const sc = scrim;
      surface = null;
      scrim = null;
      if (!el) {
        sc?.remove();
        return;
      }
      if (!animate) {
        el.style.transition = '';
        el.style.transform = '';
        el.style.willChange = '';
        sc?.remove();
        return;
      }
      // Spring back to rest, then drop every hint we set.
      el.style.transition = `transform ${SPRING_BACK_MS}ms cubic-bezier(0.32,0.72,0,1)`;
      el.style.transform = 'translate3d(0,0,0)';
      if (sc) {
        sc.style.transition = `opacity ${SPRING_BACK_MS}ms linear`;
        sc.style.opacity = '0';
      }
      window.setTimeout(() => {
        el.style.transition = '';
        el.style.transform = '';
        el.style.willChange = '';
        sc?.remove();
      }, SPRING_BACK_MS);
    };

    const onStart = (e: TouchEvent) => {
      tracking = false;
      axis = 'none';
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const w = window.innerWidth;
      const fromLeading = rtl ? w - t.clientX : t.clientX;
      if (fromLeading > edgePx) return;
      // Refuse to swipe back off the first in-app entry — that would eject the
      // user out of the app. Matches the useSmartBack rule.
      if (location.key === 'default') return;
      if ((t.target as HTMLElement | null)?.closest?.('[data-no-swipe-back]')) return;
      startX = lastX = t.clientX;
      startY = t.clientY;
      lastT = e.timeStamp;
      velocity = 0;
      tracking = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking || e.touches.length !== 1) return;
      const t = e.touches[0];
      const raw = (t.clientX - startX) * (rtl ? -1 : 1);
      const dy = Math.abs(t.clientY - startY);

      if (axis === 'none') {
        if (Math.max(Math.abs(raw), dy) < AXIS_LOCK_PX) return;
        // Dominant axis decided once, in the first 10px, and never revisited —
        // so a vertical scroll can't be stolen mid-flight and vice versa.
        axis = Math.abs(raw) > dy ? 'x' : 'y';
        if (axis === 'y') {
          tracking = false;
          return;
        }
        surface = getSurface();
        if (!surface) {
          tracking = false;
          return;
        }
        surface.style.transition = '';
        surface.style.willChange = 'transform';
        if (!reduced) ensureScrim();
      }

      const dt = e.timeStamp - lastT;
      if (dt > 0) velocity = ((t.clientX - lastX) * (rtl ? -1 : 1)) / dt;
      lastX = t.clientX;
      lastT = e.timeStamp;

      // Dragging backwards past the origin meets rubber-band resistance rather
      // than a hard stop, which is what makes the surface feel physical.
      paint(raw >= 0 ? raw : raw * RUBBER_BAND);
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking || axis !== 'x') {
        tracking = false;
        clearSurface(false);
        return;
      }
      tracking = false;
      const endX = e.changedTouches[0]?.clientX ?? lastX;
      const dx = (endX - startX) * (rtl ? -1 : 1);
      const w = window.innerWidth || 1;
      const commit = dx > w * commitRatio || velocity > FLICK_VELOCITY;
      if (!commit) {
        clearSurface(true);
        return;
      }
      haptics('light');
      // Hand `transform` back before the route changes so <PageTransition/>
      // starts its pop from the current position with nothing left over.
      clearSurface(false);
      requestAnimationFrame(() => navigate(-1));
    };

    const onCancel = () => {
      tracking = false;
      clearSurface(true);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onCancel);
      clearSurface(false);
    };
  }, [navigate, rtl, gestureBack, gestureSensitivity, location.key]);

  return null;
}
