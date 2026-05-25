import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Smart back navigation.
 *
 * Returns a stable callback that:
 *   1. Goes back in the browser history (`navigate(-1)`) when there is
 *      history to return to — the natural and expected behaviour.
 *   2. Falls back to a safe in-app destination when the user reached the
 *      current page via deep-link / external link / fresh tab and there
 *      is no in-app history yet. Without this guard, `navigate(-1)`
 *      ejects the user out of the app entirely (or into a blank tab).
 *
 * The fallback is `replace`d so it doesn't pollute history — pressing
 * back again after the fallback behaves intuitively.
 *
 * Usage:
 *   const goBack = useSmartBack('/mihrab');
 *   <button onClick={goBack}>…</button>
 *
 * @param fallback Path to navigate to when there is no usable history.
 *                 Defaults to the home route `/`.
 */
export function useSmartBack(fallback: string = '/') {
  const navigate = useNavigate();
  return useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}

export default useSmartBack;
