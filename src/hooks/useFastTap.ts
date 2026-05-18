import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * useFastTap — Linear-style instant tap handler.
 *
 * Fires on `pointerdown` instead of `click`, which is 80–100ms faster on
 * touch devices (no 300ms delay, no wait for pointerup). Safeguards:
 *  - Primary pointer only (ignores right-click, middle-click).
 *  - Modifier keys (cmd/ctrl/shift/alt) pass through to native click so
 *    "open in new tab" still works on links.
 *  - Suppresses the synthetic `click` that follows to prevent double-fire.
 *
 * Usage:
 *   const fast = useFastTap(() => doThing());
 *   <button {...fast}>Go</button>
 */
export function useFastTap<E extends HTMLElement = HTMLElement>(
  handler: (e: ReactPointerEvent<E>) => void,
) {
  const firedRef = useRef(false);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<E>) => {
      if (e.button !== 0) return; // primary only
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      firedRef.current = true;
      handler(e);
    },
    [handler],
  );

  // Swallow the follow-up click that the browser synthesises after pointerdown
  // (avoids double-invocation when the consumer also has an onClick fallback).
  const onClick = useCallback((e: React.MouseEvent<E>) => {
    if (firedRef.current) {
      firedRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return { onPointerDown, onClick };
}

export default useFastTap;
