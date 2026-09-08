/**
 * Keyboard surface palettes.
 *
 * Themes used to be a handful of `bg-*` overrides on the panel root, which left
 * every key painted with the app's global surface tokens — a light keyboard kept
 * dark keys and unreadable glyphs. Each theme now publishes one complete set of
 * HSL triples that the panel and every key read from, so contrast stays intact
 * whichever palette is picked.
 *
 * Each palette also carries its own elevation recipe (`shadow`, `highlight`,
 * `press`). A flat 0/0/0 drop shadow reads as grime on light palettes and as
 * nothing at all on OLED black, so key relief is tuned per theme instead of
 * being one hardcoded rgba value shared by all of them.
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
  /** Drop shadow under a resting key. */
  shadow: string;
  /** Top inner highlight that gives the key its raised edge. */
  highlight: string;
  /** Face colour while a key is held. */
  press: string;
  /** Two-colour swatch used by the theme picker. */
  swatch: [string, string];
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
  shadow: '0 1px 2px rgba(0,0,0,0.45)',
  highlight: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  press: 'var(--surface-3)',
  swatch: ['hsl(240 6% 12%)', 'hsl(32 58% 62%)'],
};

export const KEYBOARD_PALETTES: Record<KeyboardTheme, KeyboardPalette> = {
  'gboard-dark': APP_TOKENS,
  'gboard-light': {
    bg: '220 14% 93%',
    key: '0 0% 100%',
    keyMod: '220 13% 86%',
    fg: '220 20% 13%',
    fgMuted: '220 10% 34%',
    accent: '217 89% 52%',
    accentFg: '0 0% 100%',
    edge: '220 14% 82%',
    shadow: '0 1px 1.5px rgba(30,41,59,0.20)',
    highlight: 'inset 0 1px 0 rgba(255,255,255,0.9)',
    press: '220 16% 88%',
    swatch: ['hsl(220 14% 93%)', 'hsl(217 89% 52%)'],
  },
  oled: {
    bg: '0 0% 0%',
    key: '0 0% 9%',
    keyMod: '0 0% 5%',
    fg: '0 0% 97%',
    fgMuted: '0 0% 62%',
    accent: '0 0% 92%',
    accentFg: '0 0% 6%',
    edge: '0 0% 17%',
    shadow: '0 0 0 1px rgba(255,255,255,0.05)',
    highlight: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    press: '0 0% 17%',
    swatch: ['hsl(0 0% 0%)', 'hsl(0 0% 92%)'],
  },
  'luxury-gold': {
    bg: '33 14% 7%',
    key: '33 13% 15%',
    keyMod: '33 13% 11%',
    fg: '38 46% 90%',
    fgMuted: '38 20% 68%',
    accent: '32 58% 62%',
    accentFg: '33 30% 9%',
    edge: '33 20% 23%',
    shadow: '0 1px 2px rgba(0,0,0,0.55)',
    highlight: 'inset 0 1px 0 hsl(38 40% 70% / 0.14)',
    press: '33 16% 22%',
    swatch: ['hsl(33 14% 7%)', 'hsl(32 58% 62%)'],
  },
  sand: {
    bg: '28 26% 84%',
    key: '30 34% 95%',
    keyMod: '28 22% 78%',
    fg: '22 24% 15%',
    fgMuted: '22 14% 36%',
    accent: '24 44% 40%',
    accentFg: '30 34% 96%',
    edge: '28 20% 72%',
    shadow: '0 1px 1.5px rgba(80,58,38,0.22)',
    highlight: 'inset 0 1px 0 rgba(255,255,255,0.75)',
    press: '28 26% 88%',
    swatch: ['hsl(28 26% 84%)', 'hsl(24 44% 40%)'],
  },
  emerald: {
    bg: '166 44% 7%',
    key: '166 30% 14%',
    keyMod: '166 36% 10%',
    fg: '160 46% 92%',
    fgMuted: '160 22% 68%',
    accent: '160 60% 42%',
    accentFg: '166 44% 7%',
    edge: '166 26% 22%',
    shadow: '0 1px 2px rgba(0,0,0,0.5)',
    highlight: 'inset 0 1px 0 hsl(160 50% 70% / 0.12)',
    press: '166 28% 21%',
    swatch: ['hsl(166 44% 7%)', 'hsl(160 60% 42%)'],
  },
  sapphire: {
    bg: '222 46% 10%',
    key: '222 32% 18%',
    keyMod: '222 38% 13%',
    fg: '216 42% 93%',
    fgMuted: '216 20% 70%',
    accent: '214 80% 58%',
    accentFg: '222 46% 10%',
    edge: '222 28% 26%',
    shadow: '0 1px 2px rgba(0,0,0,0.5)',
    highlight: 'inset 0 1px 0 hsl(214 60% 74% / 0.14)',
    press: '222 30% 25%',
    swatch: ['hsl(222 46% 10%)', 'hsl(214 80% 58%)'],
  },
};

/** CSS custom properties for the requested palette, applied on the panel root. */
export function keyboardPaletteVars(theme: KeyboardTheme): React.CSSProperties {
  const palette = KEYBOARD_PALETTES[theme] ?? APP_TOKENS;
  return {
    '--kb-bg': palette.bg,
    '--kb-key': palette.key,
    '--kb-key-mod': palette.keyMod,
    '--kb-key-press': palette.press,
    '--kb-fg': palette.fg,
    '--kb-fg-muted': palette.fgMuted,
    '--kb-accent': palette.accent,
    '--kb-accent-fg': palette.accentFg,
    '--kb-edge': palette.edge,
    '--kb-key-shadow': `${palette.highlight}, ${palette.shadow}`,
    '--kb-key-shadow-mod': palette.shadow,
  } as React.CSSProperties;
}

/** Preview colours for the settings theme picker. */
export function keyboardSwatch(theme: KeyboardTheme): [string, string] {
  return (KEYBOARD_PALETTES[theme] ?? APP_TOKENS).swatch;
}
