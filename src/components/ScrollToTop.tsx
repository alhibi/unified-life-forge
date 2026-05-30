import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

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
  const { pathname } = useLocation();

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

  useEffect(() => {
    const onScroll = () => {
      const owner = ownerRef.current;
      if (owner !== null) positions.current.set(owner, window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    const isTab = PERSISTENT_TAB_PATHS.has(pathname);
    // Re-point the scroll owner BEFORE restoring so any reflow caused by
    // toggling tab visibility attributes its scroll to the new route,
    // never the tab we just left.
    ownerRef.current = isTab ? pathname : null;
    const target = isTab ? positions.current.get(pathname) ?? 0 : 0;
    window.scrollTo({ top: target, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}
