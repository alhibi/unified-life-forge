/**
 * The last focusable control the user touched outside an overlay layer.
 *
 * Why a tiny eager module instead of logic inside the overlay hook: a dialog's
 * content module can be code-split/imported after the click that opens it, so
 * capture-on-open is racy (vaul's Drawer never forwards onOpenAutoFocus at
 * all). Tracking focus from app start gives every layer the same truthful
 * opener, regardless of when its code loads or which primitive renders it.
 */
const OVERLAY_SELECTOR =
  '[role="dialog"], [role="alertdialog"], [data-ui-surface="dialog"], [data-ui-surface="drawer"], [data-ui-surface="sheet"]';

function isInsideOverlay(node: EventTarget | null): boolean {
  return node instanceof Element && node.closest(OVERLAY_SELECTOR) !== null;
}

let lastExternal: HTMLElement | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'focusin',
    (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && !isInsideOverlay(target)) lastExternal = target;
    },
    true,
  );
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target;
      const control =
        target instanceof Element
          ? target.closest('button, a, [role="button"], input, select, textarea')
          : null;
      if (control instanceof HTMLElement && !isInsideOverlay(control)) lastExternal = control;
    },
    true,
  );
}

/** The opener candidate, or null when focus was never outside a layer. */
export function getLastExternalFocus(): HTMLElement | null {
  return lastExternal;
}

/** True when the node lives inside a dialog/drawer/sheet layer. */
export function isInsideOverlayLayer(node: EventTarget | null): boolean {
  return isInsideOverlay(node);
}
