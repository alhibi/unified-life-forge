import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Smart back navigation.
 *
 * Returns a stable callback that:
 *   1. Goes back in the browser history (`navigate(-1)`) when the user
 *      reached the current page via an *in-app* navigation — the
 *      natural and expected behaviour.
 *   2. Falls back to a safe in-app destination when the current entry
 *      is the first one in this browser tab's session (deep-link /
 *      external link / fresh tab). Without this guard, `navigate(-1)`
 *      ejects the user out of the app entirely (or into a blank tab).
 *
 * Why `location.key === 'default'` and not `window.history.length > 1`?
 *   `history.length` is the count of entries in the browser tab's
 *   *whole* session, including pages on other origins the user visited
 *   before opening our app. So `history.length > 1` is true even when
 *   there is no in-app history, and `navigate(-1)` would jump back to
 *   another origin. React Router's `location.key` is `'default'`
 *   precisely once — on the very first entry of the session — so it
 *   gives us the in-app-history signal we actually need.
 *
 * The fallback is `replace`d so it doesn't pollute history — pressing
 * back again after the fallback behaves intuitively.
 *
 * Usage:
 *   const goBack = useSmartBack('/mihrab');
 *   <button onClick={goBack}>…</button>
 *
 * @param fallback Path to navigate to when there is no in-app history.
 *                 Defaults to the home route `/`.
 */
export function useSmartBack(fallback: string = '/') {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }, [navigate, fallback, location.key]);
}

export default useSmartBack;
