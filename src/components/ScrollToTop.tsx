import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollToTop — scroll management on route change.
 * ─────────────────────────────────────────────────────────────────────
 * The three persistent bottom-nav tabs (`/`, `/games`, `/chat`) are
 * mounted once inside <PersistentTabs/> and toggled with `display`, so
 * they all SHARE the single window scroll. A naive `scrollTo(0)` on
 * every navigation meant returning to a tab always snapped it back to
 * the top — the user lost their place every time they peeked at another
 * tab. Native tab bars (iOS / Android) remember each tab's scroll
 * offset instead.
 *
 * So we keep a small per-tab scroll memory:
 *   • While a persistent tab is visible, a single passive scroll
 *     listener records its live offset under that tab's path.
 *   • On navigation we restore the destination tab's remembered offset
 *     (or 0 the first time it's seen).
 *
 * Sub-pages (everything that is NOT a persistent tab) are deliberately
 * never remembered — they always open at the top, which is the expected
 * behaviour for a freshly-pushed screen.
 *
 * Keep PERSISTENT_TAB_PATHS in sync with `TAB_PATHS` in `src/App.tsx`.
 */
const PERSISTENT_TAB_PATHS = new Set<string>(['/', '/games', '/chat']);

export default function ScrollToTop() {
  const location = useLocation();
  const navType  = useNavigationType();
  const { pathname, key } = location;

  // Per-tab scroll offsets. Only persistent-tab paths are ever stored.
  const positions = useRef<Map<string, number>>(new Map());
  // The path that currently "owns" the window scroll. A ref (not state)
  // so the single scroll listener always attributes a scroll to the
  // right tab without re-subscribing on every navigation. It is updated
  // synchronously in the layout effect below — before paint and before
  // any reflow-induced async scroll event — so a scroll can never be
  // mis-attributed to the previous tab during a switch.
  const ownerRef = useRef<string | null>(
    PERSISTENT_TAB_PATHS.has(pathname) ? pathname : null,
  );

  // Sub-page scroll memory: keyed by react-router's per-entry `location.key`
  // so it survives the back stack precisely. On a POP back to the same
  // entry we restore exactly where the user was — even after intermediate
  // pushes. On any PUSH we always land at the top (native behaviour).
  const subPagePositions = useRef<Map<string, number>>(new Map());
  const lastSubKeyRef = useRef<string | null>(
    PERSISTENT_TAB_PATHS.has(pathname) ? null : key,
  );

  useEffect(() => {
    const onScroll = () => {
      const owner = ownerRef.current;
      if (owner !== null) positions.current.set(owner, window.scrollY);
      const subKey = lastSubKeyRef.current;
      if (subKey !== null) subPagePositions.current.set(subKey, window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    const isTab = PERSISTENT_TAB_PATHS.has(pathname);
    ownerRef.current = isTab ? pathname : null;
    lastSubKeyRef.current = isTab ? null : key;

    let target = 0;
    if (isTab) {
      target = positions.current.get(pathname) ?? 0;
    } else if (navType === 'POP') {
      // Returning to a sub-page we've seen before — restore its offset.
      target = subPagePositions.current.get(key) ?? 0;
    }
    window.scrollTo({ top: target, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, key, navType]);

  return null;
}
