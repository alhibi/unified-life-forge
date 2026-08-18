/**
 * Keyboard surface palettes.
 *
 * Themes used to be a handful of `bg-*` overrides on the panel root, which left
 * every key painted with the app's global surface tokens — a light keyboard kept
 * dark keys and unreadable glyphs. Each theme now publishes one complete set of
 * HSL triples that the panel and every key read from, so contrast stays intact
 * whichever palette is picked.
 */

import type { KeyboardTheme } from './preference';

export interface KeyboardPalette {
  /** Panel background. */
  bg: string;
  /** Letter key face. */
  key: string;
  /** Modifier key face (shift, backspace, layout switchers). */
  keyMod: string;
  /** Primary glyph colour. */
  fg: string;
  /** Secondary glyph colour, used by modifiers and hints. */
  fgMuted: string;
  /** Action key face. */
  accent: string;
  /** Glyph colour on the action key. */
  accentFg: string;
  /** Hairline separating keys and panel edges. */
  edge: string;
}

/**
 * `gboard-dark` intentionally inherits the app's live tokens so the default
 * keyboard always tracks the active app theme.
 */
const APP_TOKENS: KeyboardPalette = {
  bg: 'var(--surface-0)',
  key: 'var(--surface-2)',
  keyMod: 'var(--surface-1)',
  fg: 'var(--foreground)',
  fgMuted: 'var(--muted-foreground)',
  accent: 'var(--live)',
  accentFg: '0 0% 100%',
  edge: 'var(--border)',
};

export const KEYBOARD_PALETTES: Record<KeyboardTheme, KeyboardPalette> = {
  'gboard-dark': APP_TOKENS,
  'gboard-light': {
    bg: '220 14% 96%',
    key: '0 0% 100%',
    keyMod: '220 12% 90%',
    fg: '220 18% 14%',
    fgMuted: '220 10% 38%',
    accent: '217 89% 52%',
    accentFg: '0 0% 100%',
    edge: '220 12% 84%',
  },
  oled: {
    bg: '0 0% 0%',
    key: '0 0% 8%',
    keyMod: '0 0% 4%',
    fg: '0 0% 96%',
    fgMuted: '0 0% 64%',
    accent: '0 0% 92%',
    accentFg: '0 0% 6%',
    edge: '0 0% 16%',
  },
  'luxury-gold': {
    bg: '33 12% 8%',
    key: '33 12% 15%',
    keyMod: '33 12% 11%',
    fg: '38 44% 88%',
    fgMuted: '38 20% 66%',
    accent: '32 58% 62%',
    accentFg: '33 30% 10%',
    edge: '33 18% 22%',
  },
  sand: {
    bg: '28 24% 86%',
    key: '30 30% 94%',
    keyMod: '28 20% 80%',
    fg: '22 22% 16%',
    fgMuted: '22 14% 38%',
    accent: '24 42% 42%',
    accentFg: '30 30% 96%',
    edge: '28 18% 74%',
  },
  emerald: {
    bg: '166 42% 8%',
    key: '166 32% 14%',
    keyMod: '166 36% 11%',
    fg: '160 44% 90%',
    fgMuted: '160 22% 66%',
    accent: '160 60% 42%',
    accentFg: '166 42% 8%',
    edge: '166 26% 22%',
  },
  sapphire: {
    bg: '222 44% 11%',
    key: '222 34% 18%',
    keyMod: '222 38% 14%',
    fg: '216 40% 92%',
    fgMuted: '216 20% 68%',
    accent: '214 80% 58%',
    accentFg: '222 44% 11%',
    edge: '222 28% 26%',
  },
};

/** CSS custom properties for the requested palette, applied on the panel root. */
export function keyboardPaletteVars(theme: KeyboardTheme): React.CSSProperties {
  const palette = KEYBOARD_PALETTES[theme] ?? APP_TOKENS;
  return {
    '--kb-bg': palette.bg,
    '--kb-key': palette.key,
    '--kb-key-mod': palette.keyMod,
    '--kb-fg': palette.fg,
    '--kb-fg-muted': palette.fgMuted,
    '--kb-accent': palette.accent,
    '--kb-accent-fg': palette.accentFg,
    '--kb-edge': palette.edge,
  } as React.CSSProperties;
}
