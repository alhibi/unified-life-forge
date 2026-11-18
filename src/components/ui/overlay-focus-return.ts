import * as React from 'react';

import { getLastExternalFocus, isInsideOverlayLayer } from '@/lib/lastExternalFocus';

/**
 * Focus return for overlay layers (Dialog / Drawer / Sheet / AlertDialog).
 *
 * Radix restores focus through the *trigger*: `DialogContentImpl` prevents the
 * focus-scope restore and focuses `triggerRef.current`. When the layer is
 * controlled by state and has no `DialogTrigger` (the pattern every
 * "new trip", "word details", "match report" surface uses), that ref is null —
 * the prevention still runs, so focus falls to `<body>` and keyboard users
 * lose their place (DESIGN.md §10 C).
 *
 * The opener itself is tracked eagerly by `lib/lastExternalFocus`, because a
 * layer's content chunk may load after the click that opens it (and vaul's
 * Drawer never forwards onOpenAutoFocus at all). This hook only decides when
 * to restore: on close, and only when the primitive left focus loose.
 */
export function useOverlayFocusReturn(onClose?: () => void) {
  const openerRef = React.useRef<HTMLElement | null>(null);

  // Capture at mount as a fallback for primitives that do not forward
  // onOpenAutoFocus; the tracker already saw the click that opened this layer.
  React.useEffect(() => {
    if (openerRef.current === null) {
      const tracked = getLastExternalFocus();
      if (tracked) openerRef.current = tracked;
    }
  }, []);

  /** Remember the opener before (or after) the layer steals focus. */
  const captureOpener = React.useCallback(() => {
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    const usable =
      active instanceof HTMLElement &&
      active !== document.body &&
      active !== document.documentElement &&
      !isInsideOverlayLayer(active);
    openerRef.current = usable ? active : getLastExternalFocus();
  }, []);

  const handleCloseAutoFocus = React.useCallback(() => {
    onClose?.();

    // Our handler runs before Radix's default handler, so check afterwards:
    // with a trigger, Radix focuses it (not loose) and we do nothing.
    const restore = () => {
      const active = document.activeElement;
      const loose =
        active === null || active === document.body || active === document.documentElement;
      const opener = openerRef.current;
      openerRef.current = null;
      if (loose && opener?.isConnected) opener.focus({ preventScroll: true });
    };

    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(restore);
    else setTimeout(restore, 0);
  }, [onClose]);

  return { captureOpener, handleCloseAutoFocus };
}
