/**
 * Shared layout constants for the app's floating bottom surfaces.
 *
 * The app has no bottom navigation bar — it was retired in favour of the
 * Portal launcher. The only persistent floating chrome is the "return to
 * portal" dock (PortalBackButton), a 44px icon button parked in the
 * bottom-start corner above the home indicator. It is deliberately absent
 * from immersive surfaces and from the entry view of every other page — see
 * the rule documented in that component.
 *
 * The pill the dock occupies is mirrored as CSS custom properties in
 * src/index.css (`--ui-dock-size`, `--ui-dock-offset`, `--ui-dock-inset`),
 * because scrolling pages reserve the rail with CSS (`.pb-page`,
 * `.page-shell`) while peer floating surfaces stack with these numbers. Keep
 * both sides in sync; FLOATING_STACK_OFFSET is the offset for a surface that
 * must sit above the dock.
 */

/** Height of the floating dock button (PortalBackButton). Mirrors `--ui-dock-size`. */
export const FLOATING_DOCK_SIZE = 44;

/** Canonical gap between stacked floating surfaces. */
export const FLOATING_GAP = 8;

/**
 * Bottom offset (in px, excluding safe-area) for a floating surface that
 * must sit above the dock — e.g. the podcast mini-player.
 */
export const FLOATING_STACK_OFFSET = FLOATING_DOCK_SIZE + FLOATING_GAP * 2;

/** Bottom offset (in px, excluding safe-area) for the dock itself. Mirrors `--ui-dock-offset`. */
export const FLOATING_DOCK_OFFSET = FLOATING_GAP * 2;
