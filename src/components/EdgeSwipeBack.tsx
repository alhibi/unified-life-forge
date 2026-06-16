import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';

/**
 * EdgeSwipeBack — global iOS-style edge-swipe- gesture.
 *
 * Listens for a touch that starts within `EDGE_PX` of the leading edge
 * (left in LTR, right in RTL) and commits the gesture when the finger
 * travels past `COMMIT_PX` horizontally without significant vertical
 * drift. On commit we trigger `history.back()` — PageTransition already
 * renders the slide via its pop variants, so the visual is exactly the
 * same as tapping the in-app back button.
 *
 * The browser already provides this gesture on iOS Safari, but it is
 * disabled inside PWAs (display-mode: standalone) and on Android
 * Chrome. This component fills the gap so the gesture works everywhere
 * the app runs.
 *
 * Implementation notes:
 *   • Passive listeners — we never preventDefault, so vertical scrolls
 *     are never starved. A gesture turning vertical mid-swipe is
 *     dropped silently.
 *   • Single timestamp guard rejects taps that linger too long; a real
 *     swipe-back is short and intentional.
 *   • The actual navigation animation is owned by <PageTransition/> —
 *     this component is a pure trigger.
 */
const EDGE_PX   = 24;    // start zone from the leading edge
const COMMIT_PX = 80;    // horizontal travel before we commit
const MAX_TIME  = 600;   // ms — anything slower is treated as a scroll
const Y_SLOP    = 60;    // px vertical drift kills the gesture

export default function EdgeSwipeBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dir } = useApp();
  const rtl = dir === 'rtl';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let startX = 0, startY = 0, startT = 0, active = false, fired = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { active = false; return; }
      const t = e.touches[0];
      const w = window.innerWidth;
      const fromLeading = rtl ? (w - t.clientX) : t.clientX;
      if (fromLeading > EDGE_PX) { active = false; return; }
      startX = t.clientX; startY = t.clientY; startT = Date.now();
      active = true; fired = false;
    };

    const onMove = (e: TouchEvent) => {
      if (!active || fired || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = (t.clientX - startX) * (rtl ? -1 : 1);
      const dy = Math.abs(t.clientY - startY);
      if (dy > Y_SLOP) { active = false; return; }
      if (Date.now() - startT > MAX_TIME) { active = false; return; }
      if (dx >= COMMIT_PX) {
        fired = true;
        active = false;
        // Refuse to swipe back off the first in-app entry — would eject
        // the user out of the tab entirely. Matches useSmartBack rule.
        if (location.key === 'default') return;
        try { navigator.vibrate?.(8); } catch { /* noop */ }
        // Defer one frame so the touch loop is clean before React Router
        // unmounts the current page.
        requestAnimationFrame(() => navigate(-1));
      }
    };

    const onEnd = () => { active = false; };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove',  onMove,  { passive: true });
    window.addEventListener('touchend',   onEnd,   { passive: true });
    window.addEventListener('touchcancel',onEnd,   { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove',  onMove);
      window.removeEventListener('touchend',   onEnd);
      window.removeEventListener('touchcancel',onEnd);
    };
  }, [navigate, rtl]);

  return null;
}