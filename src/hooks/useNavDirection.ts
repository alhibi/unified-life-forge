/**
 * useNavDirection — track whether the user is going forward, backward,
 * tab-switching, or arriving for the first time.
 *
 * React Router v6 exposes `useNavigationType()` returning 'PUSH' | 'POP'
 * | 'REPLACE'. That alone is enough to distinguish push from pop, but
 * the IA in this app has three persistent bottom-nav tabs (Home, Games,
 * Chat) plus three lazy-loaded top-level destinations (Wellness,
 * Browse, Mihrab). Switching between any two top-level destinations is
 * a "tab switch", not a forward push, and must use the tab fade-up
 * variant — a horizontal slide on every bottom-nav tap is jarring.
 *
 * We classify by combining:
 *   1. router navigation type (POP → backward, PUSH → forward, REPLACE
 *      → fade)
 *   2. whether both the previous and current paths are in TAB_PATHS
 *      (true → tab switch, regardless of router type)
 *   3. first render → 'initial' (no animation)
 *
 * The hook returns the mode for the current location and tracks the
 * previous path internally. It's pure-render-friendly: the mode is
 * derived once per location change via useMemo + a ref so animations
 * don't re-evaluate on unrelated re-renders.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import type { NavMode } from '@/lib/motion';

// Inferred from react-router so we don't depend on whether the named
// `NavigationType` type is re-exported (it has changed shape across
// 6.x minor versions).
type RouterNavType = ReturnType<typeof useNavigationType>;

/**
 * Top-level destinations served by the bottom nav. Movement BETWEEN any
 * two of these is treated as a tab switch (vertical fade-up), not a
 * push/pop slide. Sub-routes off these paths still use push/pop.
 */
const TAB_PATHS: ReadonlyArray<string> = [
  '/',
  '/games',
  '/chat',
  '/wellness',
  '/browse',
  '/mihrab',
];

function isTabPath(pathname: string): boolean {
  return TAB_PATHS.includes(pathname);
}

export interface NavDirection {
  /** The classified motion mode to feed into PageTransition. */
  mode: NavMode;
  /** Raw router navigation type — useful for debugging/perf logs. */
  navType: RouterNavType;
  /** The path being transitioned FROM (null on initial mount). */
  fromPath: string | null;
  /** The path being transitioned TO. */
  toPath: string;
}

export function useNavDirection(): NavDirection {
  const location  = useLocation();
  const navType   = useNavigationType();

  // We need the PREVIOUS path to classify tab switches. A ref keeps it
  // out of the render lifecycle so we don't re-trigger animations.
  const prevPathRef = useRef<string | null>(null);
  const isFirstRef  = useRef<boolean>(true);

  const mode: NavMode = useMemo(() => {
    const fromPath = prevPathRef.current;
    const toPath   = location.pathname;

    // First render — no animation. PageTransition collapses to 'initial'.
    if (isFirstRef.current) return 'initial';

    // Same path (e.g., search-param change) — no directional motion.
    if (fromPath === toPath) return 'replace';

    // Tab-to-tab navigation: both endpoints are top-level destinations.
    if (fromPath && isTabPath(fromPath) && isTabPath(toPath)) return 'tab';

    if (navType === 'POP')     return 'pop';
    if (navType === 'REPLACE') return 'replace';
    return 'push';
    // location.key changes on every navigation (even when pathname is
    // identical), but we want the mode tied to pathname so this memo
    // recomputes once per real route change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navType]);

  // Update the refs AFTER the mode is computed for this render. We use
  // useEffect (not useLayoutEffect) so the current frame still sees the
  // pre-update prev path, then the next navigation will see this one.
  useEffect(() => {
    prevPathRef.current = location.pathname;
    isFirstRef.current  = false;
  }, [location.pathname]);

  return {
    mode,
    navType,
    fromPath: prevPathRef.current,
    toPath:   location.pathname,
  };
}
