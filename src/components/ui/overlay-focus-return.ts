import * as React from 'react';

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
 * This hook captures the element that had focus when the layer opened and
 * restores it on close, but ONLY when the default left focus loose. A layer
 * opened through a trigger still gets Radix's own focus-the-trigger path, so
 * the existing contract is untouched.
 */
export function useOverlayFocusReturn(onClose?: () => void) {
  const openerRef = React.useRef<HTMLElement | null>(null);

  /** Remember the opener before the layer steals focus. */
  const captureOpener = React.useCallback(() => {
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    openerRef.current =
      active instanceof HTMLElement && active !== document.body && active !== document.documentElement
        ? active
        : null;
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
