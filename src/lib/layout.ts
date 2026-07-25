/**
 * Shared layout constants for the app's floating bottom surfaces.
 *
 * The app has no bottom navigation bar — it was retired in favour of the
 * Portal launcher. Floating surfaces used to offset themselves by the old
 * `BOTTOM_NAV_HEIGHT`, which left a phantom 64px gap. They now stack
 * against the floating "back to portal" dock instead.
 */

/** Height of the floating dock button (PortalBackButton). */
export const FLOATING_DOCK_SIZE = 44;

/** Canonical gap between stacked floating surfaces. */
export const FLOATING_GAP = 8;

/**
 * Bottom offset (in px, excluding safe-area) for a floating surface that
 * must sit above the dock — e.g. the podcast mini-player.
 */
export const FLOATING_STACK_OFFSET = FLOATING_DOCK_SIZE + FLOATING_GAP * 2;

/** Bottom offset (in px, excluding safe-area) for the dock itself. */
export const FLOATING_DOCK_OFFSET = FLOATING_GAP * 2;
