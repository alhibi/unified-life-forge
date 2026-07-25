// ─── Theme Engine ───────────────────────────────────────────
// A theme is a 7-step tonal scale: 50 · 100 · 200 · 300 · 400 · 500 · 600.
//
// Every theme shares ONE lightness ladder, so the visual rhythm — how far a
// card sits from its background, how a border separates two surfaces, how much
// contrast body text carries — is identical no matter which theme is active.
// A theme only chooses *where on the colour wheel* that ladder lives and how
// much chroma it carries. That is what makes 31 themes feel like one product
// instead of 31 unrelated skins.
//
// The reference ladder is the application's default palette:
//
//   50  #f1f0f4   100 #bebacd   200 #a49db8   300 #756b92
//   400 #4b4262   500 #373049   600 #1c1827
//
// Read as HSL those seven colours are a single hue (~256°) walked down a
// deliberately uneven lightness curve (95 → 77 → 67 → 50 → 32 → 24 → 12) while
// saturation *rises* toward the dark end (15% → 24%) — dark tones need more
// chroma to avoid reading as dead grey. Both curves are reproduced exactly
// below and reused by every other theme.

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeStyle = 'tonal' | 'vibrant' | 'neutral' | 'expressive';

/** `[hue, saturation%, lightness%]` — fractional values are kept on purpose. */
export type Hsl = [number, number, number];

/** The seven tones of a theme, ordered 50 (lightest) → 600 (darkest). */
export type ThemeScale = [Hsl, Hsl, Hsl, Hsl, Hsl, Hsl, Hsl];

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];

/**
 * INK — the eighth tone, and the only one that is identical in all 31 themes.
 *
 * A palette needs one colour it does not own. Overlays, full-screen media and
 * the OLED canvas have to read as "the app stepped back", and if that tone were
 * themed it would tint every photo and every video behind it. So ink is shared.
 *
 * It is deliberately NOT #000. Pure black against a lit panel produces a hard
 * edge — the eye reads the *screen* rather than the surface. A soft, slightly
 * cool matte black (#111113) keeps a trace of material and lets the theme's own
 * tones stay the brightest thing in the room.
 *
 * Used for: `--theme-ink`, `--scrim` (every theme, both modes), the black-mode
 * surface ladder, and full-bleed media chrome.
 */
export const INK: Hsl = [250, 7, 7];

export interface ThemePreset {
  id: string;
  name: string;
  nameEn: string;
  /** The theme's seven published tones. Everything else is derived from it. */
  scale: ThemeScale;
  // ── Legacy 4-colour API ──────────────────────────────────
  // Derived from `scale` so older generators (MD3 / iOS / Aura experiments)
  // keep compiling. New code must read `scale` instead.
  primary: Hsl;
  secondary: Hsl;
  accent: Hsl;
  neutral: Hsl;
}

// ─── The shared ladder ──────────────────────────────────────
/** Lightness of each step. Taken verbatim from the reference palette. */
const LADDER_L = [94.9, 76.7, 66.9, 49.6, 32.2, 23.7, 12.4] as const;

/**
 * Saturation multiplier per step, relative to a theme's base chroma.
 * Mirrors the reference palette, where saturation climbs from 15.4% at step 50
 * to 23.8% at step 600 (≈1.55×) so the darkest tones stay coloured, not muddy.
 */
const SAT_SHAPE = [1, 1.04, 1.04, 1.0, 1.27, 1.34, 1.55] as const;

/**
 * Per-step chroma ceiling. Pale tints turn candy-coloured very quickly, and a
 * near-black background with 80% saturation stops being a background — so each
 * end of the ladder is capped tighter than the middle.
 */
const SAT_CEIL = [22, 36, 44, 58, 64, 62, 56] as const;

function norm360(h: number) {
  return ((h % 360) + 360) % 360;
}

/** Shortest-path hue interpolation, so a 350° → 10° ramp goes through 0°. */
function lerpHue(a: number, b: number, t: number) {
  let d = norm360(b) - norm360(a);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return norm360(a + d * t);
}

/**
 * Build a theme's 7 tones.
 *
 * @param hue      hue of the lightest tone (step 50)
 * @param satBase  saturation of step 50; the ladder scales it per step
 * @param hueDrift total hue rotation applied linearly from step 50 → 600.
 *                 A few degrees of drift is what separates a flat tint ramp
 *                 from one that feels lit — light tones lean warm, deep tones
 *                 lean cool (or the reverse, for the warm themes).
 */
export function buildScale(hue: number, satBase: number, hueDrift = 0): ThemeScale {
  return LADDER_L.map((l, i) => {
    const t = i / (LADDER_L.length - 1);
    const s = satBase <= 0 ? 0 : Math.min(satBase * SAT_SHAPE[i], SAT_CEIL[i]);
    return [lerpHue(hue, hue + hueDrift, t), s, l] as Hsl;
  }) as ThemeScale;
}

/**
 * The default palette, transcribed from its hex form at full precision so the
 * generated CSS reproduces #f1f0f4 … #1c1827 byte-for-byte.
 */
const DEFAULT_SCALE: ThemeScale = [
  [255.0, 15.4, 94.9], // 50  #f1f0f4
  [252.6, 16.0, 76.7], // 100 #bebacd
  [255.6, 16.0, 66.9], // 200 #a49db8
  [255.4, 15.4, 49.6], // 300 #756b92
  [256.9, 19.5, 32.2], // 400 #4b4262
  [256.8, 20.7, 23.7], // 500 #373049
  [256.0, 23.8, 12.4], // 600 #1c1827
];

function definePreset(
  id: string,
  name: string,
  nameEn: string,
  hue: number,
  satBase: number,
  hueDrift = 0,
  explicitScale?: ThemeScale,
): ThemePreset {
  const scale = explicitScale ?? buildScale(hue, satBase, hueDrift);
  return {
    id,
    name,
    nameEn,
    scale,
    // Legacy mirrors — never authored by hand again.
    primary: scale[4],
    secondary: scale[3],
    accent: scale[2],
    neutral: scale[1],
  };
}

// ─── Presets ────────────────────────────────────────────────
// id · Arabic name · English name · hue · base chroma · hue drift
export const themePresets: ThemePreset[] = [
  definePreset('default', 'كلاسيك', 'Classic', 256, 15.4, 0, DEFAULT_SCALE),
  definePreset('paper', 'ورق وحبر', 'Paper & Ink', 36, 22, -6),
  definePreset('mono', 'مونوكروم', 'Mono', 0, 0),
  definePreset('coffee', 'قهوة', 'Coffee', 30, 22, -4),
  definePreset('fog', 'ضباب', 'Fog', 205, 10, -6),
  definePreset('obsidian', 'سبج', 'Obsidian', 248, 12, 4),
  definePreset('midnight', 'منتصف الليل', 'Midnight', 218, 26, 8),
  definePreset('rose', 'روز جولد', 'Rose Gold', 352, 24, -14),
  definePreset('emerald', 'زمرد', 'Emerald', 156, 26, -8),
  definePreset('lavender', 'لافندر', 'Lavender', 268, 24, 6),
  definePreset('sunset', 'غروب', 'Sunset', 28, 32, -14),
  definePreset('ocean', 'محيط', 'Ocean', 196, 28, 6),
  definePreset('neon', 'نيون', 'Neon', 162, 34, -10),
  definePreset('cherry', 'كرزي', 'Cherry', 4, 30, -10),
  definePreset('gold', 'ذهبي', 'Gold', 44, 30, -12),
  definePreset('aurora', 'شفق', 'Aurora', 292, 28, -28),
  definePreset('sakura', 'ساكورا', 'Sakura', 338, 26, -22),
  definePreset('arctic', 'قطبي', 'Arctic', 200, 24, 10),
  definePreset('volcano', 'بركان', 'Volcano', 14, 32, -14),
  definePreset('matcha', 'ماتشا', 'Matcha', 112, 22, -14),
  definePreset('nebula', 'سديم', 'Nebula', 262, 28, 14),
  definePreset('copper', 'نحاسي', 'Copper', 22, 28, -10),
  definePreset('mint', 'نعناع', 'Mint', 168, 24, 6),
  definePreset('sandstone', 'حجر رملي', 'Sandstone', 34, 20, -8),
  definePreset('dusk', 'شفق بنفسجي', 'Dusk', 274, 20, -12),
  definePreset('moss', 'طحلب', 'Moss', 92, 18, -10),
  definePreset('clay', 'صلصال', 'Clay', 16, 24, -8),
  definePreset('storm', 'عاصفة', 'Storm', 214, 18, 8),
  definePreset('silk', 'حرير', 'Silk', 332, 16, -16),
  definePreset('amber', 'كهرمان', 'Amber', 40, 28, -12),
  definePreset('terracotta', 'فخّار', 'Terracotta', 18, 26, -8),
];

// ─── Style modifiers ────────────────────────────────────────
// Legacy shape, still consumed by the MD3 / iOS / Aura experiments below.
interface StyleModifier {
  satMul: number; // multiply saturation
  surfaceSatMul: number; // surface area saturation
  accentBoost: number; // extra saturation for accent surfaces
}

const styleModifiers: Record<ThemeStyle, StyleModifier> = {
  tonal: { satMul: 0.7, surfaceSatMul: 0.5, accentBoost: 0 },
  vibrant: { satMul: 1.2, surfaceSatMul: 0.6, accentBoost: 8 },
  neutral: { satMul: 0.3, surfaceSatMul: 0.15, accentBoost: 0 },
  expressive: { satMul: 1.0, surfaceSatMul: 0.8, accentBoost: 12 },
};

/**
 * Palette style scales a theme's chroma and nothing else — never lightness.
 * Contrast is therefore a property of the ladder, not of the user's taste, and
 * no style can produce unreadable text.
 *
 * `neutral` is 1.0 because it is the app default: the shipped palette must
 * render exactly as published, not as a desaturated approximation of itself.
 */
const CHROMA_BY_STYLE: Record<ThemeStyle, number> = {
  neutral: 1,
  tonal: 1.15,
  vibrant: 1.4,
  expressive: 1.7,
};

// ─── Helpers ────────────────────────────────────────────────
/** One decimal is kept: rounding HSL to integers shifts hex output by ±1. */
function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function hsl(h: number, s: number, l: number): string {
  return `${fmt(norm360(h))} ${fmt(clamp(s, 0, 100))}% ${fmt(clamp(l, 0, 100))}%`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Tolerate presets persisted by an earlier version of the app (the
 * image-derived `dynamic` theme is stored in localStorage as raw JSON).
 */
function resolveScale(preset: ThemePreset): ThemeScale {
  if (preset?.scale?.length === 7) return preset.scale;
  const [h, s] = preset?.primary ?? [256, 15.4, 32];
  return buildScale(h, clamp(s, 0, 46));
}

/**
 * Sample the theme's curve at an arbitrary lightness.
 *
 * The seven published tones are anchors, not a closed set: the UI needs more
 * surfaces than seven (a card sits between "white" and step 50; a hairline
 * border sits between steps 50 and 100). Interpolating hue and saturation
 * between the two neighbouring anchors keeps every one of those in-between
 * surfaces *on the theme's own curve*, so no colour in the app is foreign to
 * the palette — it is the same ramp, read at a finer resolution.
 */
function toneAt(scale: ThemeScale, lightness: number, chroma = 1): Hsl {
  const l = clamp(lightness, 0, 100);
  const first = scale[0];
  const last = scale[scale.length - 1];
  if (l >= first[2]) return [first[0], first[1] * chroma, l];
  if (l <= last[2]) return [last[0], last[1] * chroma, l];

  for (let i = 0; i < scale.length - 1; i++) {
    const a = scale[i];
    const b = scale[i + 1];
    if (l <= a[2] && l >= b[2]) {
      const span = a[2] - b[2];
      const t = span === 0 ? 0 : (a[2] - l) / span;
      return [lerpHue(a[0], b[0], t), (a[1] + (b[1] - a[1]) * t) * chroma, l];
    }
  }
  return [last[0], last[1] * chroma, l];
}

// ─── Perceptual guard rails ─────────────────────────────────
// HSL lightness is not perceived brightness: `hsl(150 26% 41%)` (a green) is
// visibly brighter than `hsl(256 20% 41%)` (a violet) even though both claim
// 41% lightness. Picking text tones by lightness alone therefore produced
// readable violet themes and unreadable green ones. Text tones are instead
// walked down (or up) the theme's own curve until they *measure* readable.

function srgbLuminance([h, s, l]: Hsl): number {
  const S = clamp(s, 0, 100) / 100;
  const L = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const hp = norm360(h) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = L - c / 2;
  const rgb =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  const [r, g, b] = rgb.map((v) => {
    const ch = v + m;
    return ch <= 0.03928 ? ch / 12.92 : ((ch + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 relative contrast ratio between two tones. */
function contrastRatio(a: Hsl, b: Hsl): number {
  const [hi, lo] = [srgbLuminance(a), srgbLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Find the tone on `scale` closest to `startL` that clears `minRatio` against
 * `bg`. It only ever moves *away* from the background, so the result keeps the
 * theme's hue and the intended light/dark relationship — it just stops being a
 * suggestion and becomes a measured guarantee.
 */
function readableTone(
  scale: ThemeScale,
  startL: number,
  bg: Hsl,
  minRatio: number,
  chroma: number,
): Hsl {
  const away = startL < bg[2] ? -1 : 1;
  let l = clamp(startL, 0, 100);
  for (let i = 0; i <= 100; i++) {
    const candidate = toneAt(scale, l, chroma);
    if (contrastRatio(candidate, bg) >= minRatio) return candidate;
    const next = l + away;
    if (next < 0 || next > 100) break;
    l = next;
  }
  return toneAt(scale, l, chroma);
}

/** The theme's seven tones, after the palette-style chroma multiplier. */
export function getThemeScale(preset: ThemePreset, style: ThemeStyle = 'neutral'): Hsl[] {
  const chroma = CHROMA_BY_STYLE[style] ?? 1;
  return resolveScale(preset).map(([h, s, l]) => [h, clamp(s * chroma, 0, 100), l] as Hsl);
}

/** Same seven tones as ready-to-use CSS colours, for swatches and previews. */
export function getThemeScaleColors(preset: ThemePreset, style: ThemeStyle = 'neutral'): string[] {
  return getThemeScale(preset, style).map(([h, s, l]) => `hsl(${hsl(h, s, l)})`);
}

/** The shared eighth tone as a CSS colour. Identical in every theme. */
export const INK_CSS = `hsl(${hsl(INK[0], INK[1], INK[2])})`;

/**
 * Ink as a hex literal, for the few consumers that cannot read a CSS variable —
 * WebGL materials, canvas fills, `<meta name="theme-color">`.
 */
export const INK_HEX = '#111113';

/**
 * How far surfaces separate from the canvas.
 *
 * The app is flat by contract — no shadows, no blur — so the *only* way a card
 * can read as a distinct plane is the lightness gap between it and the page.
 * That gap is a matter of taste (and of ambient light), so it is a preference:
 *
 *   flat     the card is barely a shade off the page; the hairline does the work
 *   subtle   the shipped default
 *   lifted   a pronounced step, for bright rooms and OLED panels
 */
export type SurfaceLift = 'flat' | 'subtle' | 'lifted';

interface LiftLevels {
  /** Light mode: card lightness, recessed-surface lightness. */
  light: [number, number];
  /** Dark mode: card lightness, raised-surface lightness. */
  dark: [number, number];
  /** Black mode: same, measured up from ink rather than from the theme. */
  black: [number, number];
}

const SURFACE_LIFT: Record<SurfaceLift, LiftLevels> = {
  flat: { light: [95.8, 92.4], dark: [13.9, 18], black: [8.6, 12] },
  subtle: { light: [98.6, 90.6], dark: [16.8, 22.5], black: [11, 15] },
  lifted: { light: [100, 88.6], dark: [19.6, 26], black: [13.6, 18.4] },
};

// ─── Token Generation ───────────────────────────────────────
/**
 * Derive the whole semantic token set from the theme's 7-step scale.
 *
 * Distribution of the ladder (light mode → dark mode):
 *
 *   50   page background      → primary / accent text
 *   100  input borders        → secondary text
 *   200  soft accent surface  → accent text
 *   300  accent / live states → accent / live states
 *   400  primary actions      → muted surfaces
 *   500  strong accent text   → cards, muted, borders
 *   600  body text            → page background
 *
 * Dark mode is the same ladder read from the other end, which is why a theme
 * keeps its identity across modes instead of becoming a different colour.
 *
 * Status colours (destructive / success / warning) stay functional and are
 * deliberately NOT themed: a destructive action must look destructive in every
 * palette. Their lightness still follows the mode so they sit on the surface.
 */
export function generateThemeTokens(
  preset: ThemePreset,
  style: ThemeStyle,
  isDark: boolean,
  isBlack: boolean,
  lift: SurfaceLift = 'subtle',
): Record<string, string> {
  const scale = resolveScale(preset);
  const chroma = CHROMA_BY_STYLE[style] ?? 1;
  const levels = SURFACE_LIFT[lift] ?? SURFACE_LIFT.subtle;

  /** A colour from this theme's curve at the given lightness. */
  const tone = (l: number, chromaMul = 1): Hsl => toneAt(scale, l, chroma * chromaMul);
  /** One of the seven published tones, unmodified except for chroma. */
  const step = (index: number): Hsl => [scale[index][0], scale[index][1] * chroma, scale[index][2]];
  /** A text tone that is measured readable on `bg`, still on the theme curve. */
  const text = (startL: number, bg: Hsl, minRatio: number, chromaMul = 1): Hsl =>
    readableTone(scale, startL, bg, minRatio, chroma * chromaMul);
  const css = (t: Hsl) => hsl(t[0], t[1], t[2]);

  // The published scale is exposed verbatim so features can reach for a
  // specific tone (`bg-theme-100`, `text-theme-600`) without inventing colours.
  const scaleVars: Record<string, string> = {
    // The eighth tone. Shared, never themed — see INK above.
    '--theme-ink': hsl(INK[0], INK[1], INK[2]),
    // One overlay colour for the whole app, in every theme and every mode. A
    // themed scrim tinted the photo, video or map sitting underneath it.
    '--scrim': hsl(INK[0], INK[1], INK[2]),
  };
  SCALE_STEPS.forEach((name, i) => {
    scaleVars[`--theme-${name}`] = css(step(i));
  });

  if (!isDark) {
    // Surfaces: step 50 is the canvas, cards lift *above* it toward white,
    // recessed surfaces sit just below it — the ladder read at fine resolution.
    const canvas = step(0);
    const surface = tone(levels.light[0], 0.85);
    const recessed = tone(levels.light[1]);
    // Step 400 is the action tone. For the few very luminous hues (a vivid
    // green at 32% lightness) it is deepened until its own label is readable,
    // rather than lightening the label past white and giving up.
    const onPrimary = tone(97.5, 0.6);
    const primary = text(scale[4][2], onPrimary, 4.6);

    const bodyText = text(scale[6][2], canvas, 7);
    const bodyOnSurface = text(scale[6][2], surface, 7);
    const strongText = text(27, recessed, 7);
    const mutedText = text(41, recessed, 4.6);
    const accentText = text(scale[5][2], recessed, 4.6);
    const live = text(scale[3][2], canvas, 4.5);

    return {
      ...scaleVars,
      '--background': css(canvas),
      '--foreground': css(bodyText),
      '--card': css(surface),
      '--card-foreground': css(bodyOnSurface),
      '--popover': css(surface),
      '--popover-foreground': css(bodyOnSurface),
      '--secondary': css(recessed),
      '--secondary-foreground': css(strongText),
      '--muted': css(recessed),
      '--muted-foreground': css(mutedText),
      '--accent': css(recessed),
      '--accent-foreground': css(accentText),
      // Actions
      '--primary': css(primary),
      '--primary-foreground': css(onPrimary),
      // Status — functional, not themed.
      '--destructive': '0 58% 42%',
      '--destructive-foreground': '0 0% 100%',
      '--success': '145 42% 34%',
      '--success-foreground': '0 0% 100%',
      '--warning': '35 68% 38%',
      '--warning-foreground': '35 80% 10%',
      '--error': '0 58% 42%',
      '--error-foreground': '0 0% 100%',
      // Lines
      '--border': css(tone(83.5)),
      '--input': css(step(1)),
      '--ring': css(primary),
      // Sidebar mirrors the same tones.
      '--sidebar-background': css(canvas),
      '--sidebar-foreground': css(strongText),
      '--sidebar-primary': css(primary),
      '--sidebar-primary-foreground': css(onPrimary),
      '--sidebar-accent': css(recessed),
      '--sidebar-accent-foreground': css(accentText),
      '--sidebar-border': css(tone(83.5)),
      '--sidebar-ring': css(primary),
      // Live / active states — step 300 is the theme's most legible mid-tone,
      // pulled darker only where a hue needs it to stay readable as text.
      '--live': css(live),
      '--live-soft': css(step(2)),
      '--live-glow': css(tone(44)),
    };
  }

  // ─── Dark mode ────────────────────────────────────────────
  // Two different dark modes, and the difference matters:
  //
  //   dark   the theme's own step 600 is the canvas — a violet theme has a
  //          violet-black page, which is the whole point of a themed dark mode.
  //   black  the shared ink tone is the canvas, and the surface ladder is
  //          measured up from ink rather than from the theme. Chosen for OLED,
  //          where the page should stop emitting; the theme still owns every
  //          accent, border and piece of text on top of it.
  const inkTone = (l: number): Hsl => [INK[0], INK[1], l];
  const surfaceAt = (l: number): Hsl => (isBlack ? inkTone(l) : tone(l));

  const bgL = isBlack ? INK[2] : scale[6][2]; // ink, or the theme's step 600
  const [cardL, raisedL] = isBlack ? levels.black : levels.dark;
  const borderL = isBlack ? 20 : 28.5;
  const inputL = isBlack ? 26 : 35;

  const canvas = surfaceAt(bgL);
  const surface = surfaceAt(cardL);
  const recessed = surfaceAt(raisedL);
  const onPrimary = surfaceAt(isBlack ? INK[2] : 12.4);
  const primary = text(76, onPrimary, 4.6);

  const bodyText = text(93, canvas, 7);
  const bodyOnSurface = text(93, surface, 7);
  const strongText = text(88, recessed, 7);
  const mutedText = text(71.5, recessed, 4.6);
  const accentText = text(81, recessed, 4.6);

  return {
    ...scaleVars,
    '--background': css(canvas),
    '--foreground': css(bodyText),
    '--card': css(surface),
    '--card-foreground': css(bodyOnSurface),
    '--popover': css(surface),
    '--popover-foreground': css(bodyOnSurface),
    '--secondary': css(recessed),
    '--secondary-foreground': css(strongText),
    '--muted': css(recessed),
    '--muted-foreground': css(mutedText),
    '--accent': css(recessed),
    '--accent-foreground': css(accentText),
    '--primary': css(primary),
    '--primary-foreground': css(onPrimary),
    '--destructive': '0 58% 68%',
    '--destructive-foreground': '0 20% 10%',
    '--success': '145 38% 64%',
    '--success-foreground': '145 30% 12%',
    '--warning': '35 65% 68%',
    '--warning-foreground': '35 40% 12%',
    '--error': '0 58% 68%',
    '--error-foreground': '0 20% 10%',
    '--border': css(surfaceAt(borderL)),
    '--input': css(surfaceAt(inputL)),
    '--ring': css(primary),
    '--sidebar-background': css(canvas),
    '--sidebar-foreground': css(strongText),
    '--sidebar-primary': css(primary),
    '--sidebar-primary-foreground': css(onPrimary),
    '--sidebar-accent': css(recessed),
    '--sidebar-accent-foreground': css(accentText),
    '--sidebar-border': css(surfaceAt(borderL)),
    '--sidebar-ring': css(primary),
    '--live': css(text(70, canvas, 4.5)),
    '--live-soft': css(tone(58)),
    '--live-glow': css(tone(76)),
  };
}

/**
 * Legacy token generator kept for import compatibility with experiments and
 * migration tooling. Runtime application chrome uses generateThemeTokens.
 */
export function generateLegacyThemeTokens(
  preset: ThemePreset,
  style: ThemeStyle,
  isDark: boolean,
  isBlack: boolean,
): Record<string, string> {
  // ─── Paper & Ink override (curium aesthetic) ─────────────
  // Hard-coded warm cream + ink tokens. Style modifiers are
  // intentionally ignored to keep the paper-notebook identity
  // pure across every UI control.
  if (preset.id === 'paper') {
    if (!isDark) {
      // Light: paper canvas, ink text
      return {
        '--background': '34 33% 93%', // #f5f0e8 paper
        '--foreground': '240 8% 11%', // #1a1a1f ink
        '--card': '38 50% 97%', // #fbf8f3
        '--card-foreground': '240 8% 11%',
        '--popover': '38 50% 97%',
        '--popover-foreground': '240 8% 11%',
        '--primary': '240 8% 11%', // ink
        '--primary-foreground': '34 33% 93%', // paper
        '--secondary': '36 22% 89%', // #ebe6dd
        '--secondary-foreground': '240 8% 11%',
        '--muted': '36 22% 89%',
        '--muted-foreground': '36 6% 33%', // #5a5650
        '--accent': '36 22% 89%',
        '--accent-foreground': '240 8% 11%',
        '--destructive': '0 54% 50%',
        '--destructive-foreground': '34 33% 96%',
        '--success': '128 49% 36%',
        '--success-foreground': '34 33% 96%',
        '--warning': '36 78% 39%',
        '--warning-foreground': '34 33% 96%',
        '--error': '0 54% 50%',
        '--error-foreground': '34 33% 96%',
        '--border': '36 21% 80%', // #d6cfc1
        '--input': '36 21% 80%',
        '--ring': '240 8% 11%',
        '--sidebar-background': '34 33% 93%',
        '--sidebar-foreground': '240 8% 11%',
        '--sidebar-primary': '240 8% 11%',
        '--sidebar-primary-foreground': '34 33% 93%',
        '--sidebar-accent': '36 22% 89%',
        '--sidebar-accent-foreground': '240 8% 11%',
        '--sidebar-border': '36 21% 80%',
        '--sidebar-ring': '240 8% 11%',
        '--radius': '1rem',
      };
    }
    // Dark: Antique dark manuscript aesthetic (#12110f to #1a1916 range instead of neutral grey/black)
    const bgL = isBlack ? 0 : 5;
    const surfL = isBlack ? 4 : 8;
    const surfOffL = isBlack ? 6 : 11;
    const borderL = isBlack ? 8 : 12;
    return {
      '--background': `34 10% ${bgL}%`, // Warm manuscript black
      '--foreground': '34 25% 91%', // Soft aged paper white
      '--card': `34 8% ${surfL}%`, // Smooth dark parchment
      '--card-foreground': '34 25% 91%',
      '--popover': `34 8% ${surfL}%`,
      '--popover-foreground': '34 25% 91%',
      '--primary': '34 30% 86%', // Soft paper gold/cream accent
      '--primary-foreground': `34 10% ${bgL}%`,
      '--secondary': `34 10% ${surfOffL}%`,
      '--secondary-foreground': '34 25% 91%',
      '--muted': `34 10% ${surfOffL}%`,
      '--muted-foreground': '34 12% 58%', // Perfect readability for notes
      '--accent': `34 10% ${surfOffL}%`,
      '--accent-foreground': '34 30% 86%',
      '--destructive': '0 78% 66%',
      '--destructive-foreground': `34 10% ${bgL}%`,
      '--success': '128 45% 62%',
      '--success-foreground': `34 10% ${bgL}%`,
      '--warning': '38 75% 65%',
      '--warning-foreground': `34 10% ${bgL}%`,
      '--error': '0 78% 66%',
      '--error-foreground': `34 10% ${bgL}%`,
      '--border': `34 10% ${borderL}%`, // Subtle manuscript separators
      '--input': `34 10% ${borderL}%`,
      '--ring': '34 30% 86%',
      '--sidebar-background': `34 10% ${bgL}%`,
      '--sidebar-foreground': '34 25% 91%',
      '--sidebar-primary': '34 30% 86%',
      '--sidebar-primary-foreground': `34 10% ${bgL}%`,
      '--sidebar-accent': `34 10% ${surfOffL}%`,
      '--sidebar-accent-foreground': '34 25% 91%',
      '--sidebar-border': `34 10% ${borderL}%`,
      '--sidebar-ring': '34 30% 86%',
      '--radius': '1rem',
    };
  }

  const mod = styleModifiers[style] ?? styleModifiers.neutral;
  // All selectable themes resolve to one restrained organic system. The
  // content can still remember a user's theme choice, but the chrome no
  // longer changes hue or saturation between screens.
  const [pH, pS, _pL] = [28, 42, 34];
  const [sH, sS, _sL] = [30, 14, 40];
  const [aH, aS, _aL] = [28, 42, 40];
  const [nH, nS, _nL] = [30, 8, 40];

  const ps = clamp(pS * mod.satMul, 0, 100);
  const ss = clamp(sS * mod.satMul, 0, 100);
  const as = clamp(aS * mod.satMul + mod.accentBoost, 0, 100);
  const ns = clamp(nS * mod.surfaceSatMul, 0, 100);

  if (!isDark) {
    // ─── Light Mode ──────────────────────────────
    return {
      '--background': hsl(nH, ns * 0.6, 98),
      '--foreground': hsl(nH, ns * 0.5, 10),
      '--card': hsl(nH, ns * 0.5, 100),
      '--card-foreground': hsl(nH, ns * 0.5, 10),
      '--popover': hsl(nH, ns * 0.5, 100),
      '--popover-foreground': hsl(nH, ns * 0.5, 10),
      '--primary': hsl(pH, ps, 50),
      '--primary-foreground': hsl(0, 0, 100),
      '--secondary': hsl(sH, ss * 0.35, 93),
      '--secondary-foreground': hsl(sH, ss * 0.4, 32),
      '--muted': hsl(nH, ns * 0.4, 91),
      '--muted-foreground': hsl(nH, ns * 0.3, 46),
      '--accent': hsl(aH, as * 0.35, 93),
      '--accent-foreground': hsl(aH, as * 0.9, 48),
      '--destructive': hsl(0, 72, 51),
      '--destructive-foreground': hsl(0, 0, 100),
      '--success': hsl(142, 60, 40),
      '--success-foreground': hsl(0, 0, 100),
      '--warning': hsl(38, 85, 50),
      '--warning-foreground': hsl(38, 90, 10),
      '--error': hsl(0, 72, 51),
      '--error-foreground': hsl(0, 0, 100),
      '--border': hsl(nH, ns * 0.5, 89),
      '--input': hsl(nH, ns * 0.5, 89),
      '--ring': hsl(pH, ps, 50),
      '--sidebar-background': hsl(nH, ns * 0.5, 97),
      '--sidebar-foreground': hsl(pH, ps * 0.6, 26),
      '--sidebar-primary': hsl(pH, ps, 50),
      '--sidebar-primary-foreground': hsl(0, 0, 100),
      '--sidebar-accent': hsl(nH, ns * 0.4, 95),
      '--sidebar-accent-foreground': hsl(pH, ps * 0.6, 26),
      '--sidebar-border': hsl(nH, ns * 0.4, 91),
      '--sidebar-ring': hsl(pH, ps, 50),
      '--radius': '1rem',
    };
  }

  // ─── Dark Mode ──────────────────────────────
  // Improved contrast, deeper dark backdrops and cohesive Obsidian Depth style.
  const bgL = isBlack ? 0 : 6; // Slightly darker base (#0d0d0f vs #141416) for extreme luxury feel
  const cardL = isBlack ? 4 : 11; // Obsidian surface depth
  const secL = isBlack ? 7 : 14; // Harmonized secondary background
  const mutL = isBlack ? 8 : 15; // Smoother muted color transition
  const borderL = isBlack ? 8 : 13; // Softened border to remove harsh outlines (Obsidian Depth principle)
  const bgS = isBlack ? 0 : ns * 0.6;
  const cardS = isBlack ? 0 : ns * 0.55;

  return {
    '--background': hsl(nH, bgS, bgL),
    '--foreground': hsl(nH, ns * 0.25, 94), // Enhanced text contrast (94% vs 92%)
    '--card': hsl(nH, cardS, cardL),
    '--card-foreground': hsl(nH, ns * 0.25, 94),
    '--popover': hsl(nH, cardS, cardL),
    '--popover-foreground': hsl(nH, ns * 0.25, 94),
    '--primary': hsl(pH, clamp(ps * 0.9, 0, 100), 62), // Slightly boosted primary saturation & brightness for premium glow
    '--primary-foreground': hsl(nH, bgS, bgL),
    '--secondary': hsl(sH, clamp(ss * 0.28, 0, 100), secL),
    '--secondary-foreground': hsl(sH, ss * 0.25, 82), // Elevated secondary contrast
    '--muted': hsl(nH, clamp(ns * 0.25, 0, 100), mutL),
    '--muted-foreground': hsl(nH, ns * 0.18, 56), // Muted text contrast adjusted for perfect readability
    '--accent': hsl(aH, clamp(as * 0.28, 0, 100), secL),
    '--accent-foreground': hsl(aH, clamp(as * 0.75, 0, 100), 68),
    '--destructive': hsl(0, 68, 48),
    '--destructive-foreground': hsl(0, 0, 100),
    '--success': hsl(142, 55, 48),
    '--success-foreground': hsl(0, 0, 100),
    '--warning': hsl(38, 80, 58),
    '--warning-foreground': hsl(38, 85, 8),
    '--error': hsl(0, 68, 52),
    '--error-foreground': hsl(0, 0, 100),
    '--border': hsl(nH, clamp(ns * 0.25, 0, 100), borderL),
    '--input': hsl(nH, clamp(ns * 0.25, 0, 100), borderL),
    '--ring': hsl(pH, clamp(ps * 0.9, 0, 100), 62),
    '--sidebar-background': hsl(nH, bgS, isBlack ? 2 : 5),
    '--sidebar-foreground': hsl(nH, ns * 0.2, 92),
    '--sidebar-primary': hsl(pH, clamp(ps * 0.9, 0, 100), 62),
    '--sidebar-primary-foreground': hsl(nH, bgS, bgL),
    '--sidebar-accent': hsl(nH, clamp(ns * 0.25, 0, 100), isBlack ? 6 : 12),
    '--sidebar-accent-foreground': hsl(nH, ns * 0.2, 92),
    '--sidebar-border': hsl(nH, clamp(ns * 0.25, 0, 100), borderL),
    '--sidebar-ring': hsl(pH, clamp(ps * 0.9, 0, 100), 62),
    '--radius': '1rem',
  };
}

// ─── Apply tokens to DOM ────────────────────────────────────
export function applyThemeTokens(tokens: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

// ─── Material Design 3 — "Indigo Night" baseline scheme ──────
// Exact tokens from the M3 baseline (hex → HSL conversions verified).
// Light:
//   Primary               #6750A4 → 256 34% 48%
//   On Primary            #FFFFFF → 0   0%  100%
//   Primary Container     #EADDFF → 263 100% 93%
//   On Primary Container  #21005D → 261 100% 18%
//   Secondary             #625B71 → 259 11% 40%
//   On Secondary          #FFFFFF → 0   0%  100%
//   Secondary Container   #E8DEF8 → 263 65% 92%
//   On Secondary Container#1D192B → 254 26% 13%
//   Tertiary              #7D5260 → 341 21% 41%
//   Tertiary Container    #FFD8E4 → 342 100% 92%
//   On Tertiary Container #31111D → 338 48% 13%
//   Error                 #B3261E → 3   71% 41%
//   Surface               #FFFBFE → 315 100% 99%
//   On Surface            #1C1B1F → 255 7% 11%
//   Surface Variant       #E7E0EC → 275 24% 90%
//   On Surface Variant    #49454F → 264 7% 29%
//   Outline               #79747E → 270 4% 47%
//   Outline Variant       #CAC4D0 → 270 11% 79%
// Dark (M3 baseline):
//   Primary               #D0BCFF → 258 100% 87%
//   On Primary            #381E72 → 259 58% 28%
//   Primary Container     #4F378B → 257 43% 38%
//   On Primary Container  #EADDFF → 263 100% 93%
//   Secondary Container   #4A4458 → 258 13% 31%
//   On Secondary Container#E8DEF8 → 263 65% 92%
//   Tertiary              #EFB8C8 → 343 63% 83%
//   Tertiary Container    #633B48 → 341 25% 31%
//   On Tertiary Container #FFD8E4 → 342 100% 92%
//   Error                 #F2B8B5 → 3   70% 83%
//   Surface               #1C1B1F → 255 7% 11%
//   On Surface            #E6E1E5 → 312 9% 89%
//   Surface Variant       #49454F → 264 7% 29%
//   On Surface Variant    #CAC4D0 → 270 11% 79%
//   Outline               #938F99 → 264 5% 58%
export function generateMD3Tokens(isDark: boolean, isBlack: boolean): Record<string, string> {
  if (!isDark) {
    return {
      // Surface family
      '--background': '315 100% 99%',
      '--foreground': '255 7% 11%',
      '--card': '315 100% 99%',
      '--card-foreground': '255 7% 11%',
      '--popover': '315 100% 99%',
      '--popover-foreground': '255 7% 11%',
      // Primary
      '--primary': '256 34% 48%',
      '--primary-foreground': '0 0% 100%',
      // Secondary → mapped to MD3 secondary-container/on-secondary-container
      '--secondary': '263 65% 92%',
      '--secondary-foreground': '254 26% 13%',
      // Muted → MD3 surface-variant / on-surface-variant
      '--muted': '275 24% 90%',
      '--muted-foreground': '264 7% 29%',
      // Accent → MD3 tertiary-container / on-tertiary-container
      '--accent': '342 100% 92%',
      '--accent-foreground': '338 48% 13%',
      // Status
      '--destructive': '3 71% 41%',
      '--destructive-foreground': '0 0% 100%',
      '--success': '142 60% 40%',
      '--success-foreground': '0 0% 100%',
      '--warning': '38 85% 50%',
      '--warning-foreground': '38 90% 10%',
      '--error': '3 71% 41%',
      '--error-foreground': '0 0% 100%',
      // Outlines
      '--border': '270 11% 79%', // outline-variant — softer for separators
      '--input': '270 4% 47%', // outline — sharper for input borders
      '--ring': '256 34% 48%',
      // Sidebar
      '--sidebar-background': '315 100% 99%',
      '--sidebar-foreground': '254 26% 13%',
      '--sidebar-primary': '256 34% 48%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '263 100% 93%', // primary-container
      '--sidebar-accent-foreground': '261 100% 18%',
      '--sidebar-border': '270 11% 79%',
      '--sidebar-ring': '256 34% 48%',
      // Extra MD3 tokens (consumable by components that want to opt in)
      '--md3-primary': '256 34% 48%',
      '--md3-on-primary': '0 0% 100%',
      '--md3-primary-container': '263 100% 93%',
      '--md3-on-primary-container': '261 100% 18%',
      '--md3-secondary': '259 11% 40%',
      '--md3-secondary-container': '263 65% 92%',
      '--md3-tertiary': '341 21% 41%',
      '--md3-tertiary-container': '342 100% 92%',
      '--md3-surface': '315 100% 99%',
      '--md3-surface-variant': '275 24% 90%',
      '--md3-outline': '270 4% 47%',
      '--md3-outline-variant': '270 11% 79%',
      '--md3-surface-tint': '256 34% 48%',
      // MD3 shape system
      '--radius': '1rem', // 16px – medium component shape
    };
  }

  // ─── Dark Mode (M3 baseline) ──────────────────────────────
  const surfaceL = isBlack ? 0 : 11; // #1C1B1F → 11%
  const cardL = isBlack ? 4 : 14;
  const containerSatScale = isBlack ? 0.9 : 1;
  return {
    '--background': `255 ${isBlack ? 0 : 7}% ${surfaceL}%`,
    '--foreground': '312 9% 89%',
    '--card': `255 ${isBlack ? 0 : 7}% ${cardL}%`,
    '--card-foreground': '312 9% 89%',
    '--popover': `255 ${isBlack ? 0 : 7}% ${cardL}%`,
    '--popover-foreground': '312 9% 89%',
    '--primary': '258 100% 87%', // #D0BCFF
    '--primary-foreground': '259 58% 28%', // #381E72
    '--secondary': `258 ${Math.round(13 * containerSatScale)}% ${isBlack ? 22 : 31}%`, // #4A4458
    '--secondary-foreground': '263 65% 92%', // #E8DEF8
    '--muted': `264 ${Math.round(7 * containerSatScale)}% ${isBlack ? 22 : 29}%`, // #49454F
    '--muted-foreground': '270 11% 79%', // #CAC4D0
    '--accent': `341 ${Math.round(25 * containerSatScale)}% ${isBlack ? 22 : 31}%`, // #633B48
    '--accent-foreground': '342 100% 92%', // #FFD8E4
    '--destructive': '3 70% 83%', // #F2B8B5
    '--destructive-foreground': '359 100% 21%',
    '--success': '142 50% 65%',
    '--success-foreground': '142 60% 12%',
    '--warning': '38 75% 70%',
    '--warning-foreground': '38 80% 8%',
    '--error': '3 70% 83%',
    '--error-foreground': '359 100% 21%',
    '--border': `264 ${isBlack ? 4 : 6}% ${isBlack ? 24 : 32}%`,
    '--input': '264 5% 58%',
    '--ring': '258 100% 87%',
    '--sidebar-background': `255 ${isBlack ? 0 : 7}% ${isBlack ? 4 : 8}%`,
    '--sidebar-foreground': '312 9% 89%',
    '--sidebar-primary': '258 100% 87%',
    '--sidebar-primary-foreground': '259 58% 28%',
    '--sidebar-accent': `257 43% ${isBlack ? 28 : 38}%`, // primary-container dark #4F378B
    '--sidebar-accent-foreground': '263 100% 93%',
    '--sidebar-border': `264 ${isBlack ? 4 : 6}% ${isBlack ? 18 : 25}%`,
    '--sidebar-ring': '258 100% 87%',
    // Extra MD3 tokens
    '--md3-primary': '258 100% 87%',
    '--md3-on-primary': '259 58% 28%',
    '--md3-primary-container': `257 43% ${isBlack ? 28 : 38}%`,
    '--md3-on-primary-container': '263 100% 93%',
    '--md3-secondary': '263 27% 81%',
    '--md3-secondary-container': `258 ${Math.round(13 * containerSatScale)}% ${isBlack ? 22 : 31}%`,
    '--md3-tertiary': '343 63% 83%',
    '--md3-tertiary-container': `341 ${Math.round(25 * containerSatScale)}% ${isBlack ? 22 : 31}%`,
    '--md3-surface': `255 ${isBlack ? 0 : 7}% ${surfaceL}%`,
    '--md3-surface-variant': `264 ${Math.round(7 * containerSatScale)}% ${isBlack ? 22 : 29}%`,
    '--md3-outline': '264 5% 58%',
    '--md3-outline-variant': `264 7% ${isBlack ? 24 : 32}%`,
    '--md3-surface-tint': '258 100% 87%',
    '--radius': '1rem',
  };
}

// ─── Dynamic theme from image ───────────────────────────────
export function extractDominantColor(img: HTMLImageElement): [number, number, number] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [220, 50, 50];

  canvas.width = 64;
  canvas.height = 64;
  ctx.drawImage(img, 0, 0, 64, 64);
  const data = ctx.getImageData(0, 0, 64, 64).data;

  let rTotal = 0,
    gTotal = 0,
    bTotal = 0,
    count = 0;
  for (let i = 0; i < data.length; i += 16) {
    // sample every 4th pixel
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    // Skip very dark/light pixels
    const brightness = (r + g + b) / 3;
    if (brightness > 30 && brightness < 220) {
      rTotal += r;
      gTotal += g;
      bTotal += b;
      count++;
    }
  }

  if (count === 0) return [220, 50, 50];
  const r = rTotal / count,
    g = gTotal / count,
    b = bTotal / count;
  return rgbToHsl(r, g, b);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Build a full 7-step theme from a colour sampled out of an image.
 *
 * Only the hue and a clamped amount of chroma survive the extraction — the
 * lightness ladder is the shared one, so an image can never produce a theme
 * with unreadable text or a washed-out canvas.
 */
export function createDynamicPreset(baseHsl: [number, number, number]): ThemePreset {
  const [h, s] = baseHsl;
  return definePreset('dynamic', 'ديناميكي', 'Dynamic', h, clamp(s * 0.55, 8, 34));
}

// ─── Dynamic Tonal MD3 Tokens (Strict M3 HCT equivalents) ───────────────────────────────
export function generateMD3TonalTokens(
  preset: ThemePreset,
  isDark: boolean,
  isBlack: boolean,
): Record<string, string> {
  const [pH, pS] = preset.primary;
  const [sH, sS] = preset.secondary;
  const [aH, aS] = preset.accent;
  const [nH, nS] = preset.neutral;

  if (!isDark) {
    // M3 Light Tones
    // Surface (Tone 98), Surface Container Low (Tone 96), Surface Container (Tone 94), Surface Container High (Tone 92)
    const surface = hsl(nH, nS * 0.1, 98);
    const surfaceContainerLow = hsl(nH, nS * 0.15, 96);
    const surfaceContainer = hsl(nH, nS * 0.2, 94);
    const surfaceContainerHigh = hsl(nH, nS * 0.25, 92);
    const surfaceContainerHighest = hsl(nH, nS * 0.3, 90);

    return {
      '--background': surface,
      '--foreground': hsl(nH, nS * 0.4, 10), // On Surface (Tone 10)
      '--card': surfaceContainerLow,
      '--card-foreground': hsl(nH, nS * 0.4, 10),
      '--popover': surfaceContainerHigh,
      '--popover-foreground': hsl(nH, nS * 0.4, 10),

      '--primary': hsl(pH, clamp(pS * 0.9, 45, 90), 40), // Primary (Tone 40)
      '--primary-foreground': '0 0% 100%', // On Primary (Tone 100)

      '--secondary': hsl(sH, clamp(sS * 0.6, 20, 50), 90), // Secondary Container (Tone 90)
      '--secondary-foreground': hsl(sH, clamp(sS * 0.7, 30, 60), 10), // On Secondary Container (Tone 10)

      '--muted': surfaceContainerHighest, // Surface Variant (Tone 90)
      '--muted-foreground': hsl(nH, nS * 0.25, 30), // On Surface Variant (Tone 30)

      '--accent': hsl(aH, clamp(aS * 0.7, 30, 60), 90), // Tertiary Container (Tone 90)
      '--accent-foreground': hsl(aH, clamp(aS * 0.8, 40, 70), 10), // On Tertiary Container (Tone 10)

      '--destructive': '3 71% 40%', // Error (Tone 40)
      '--destructive-foreground': '0 0% 100%', // On Error (Tone 100)

      '--success': '142 60% 36%',
      '--success-foreground': '0 0% 100%',
      '--warning': '38 85% 45%',
      '--warning-foreground': '38 90% 10%',
      '--error': '3 71% 40%',
      '--error-foreground': '0 0% 100%',

      '--border': hsl(nH, nS * 0.2, 80), // Outline Variant (Tone 80)
      '--input': hsl(nH, nS * 0.25, 45), // Outline (Tone 50)
      '--ring': hsl(pH, clamp(pS * 0.9, 45, 90), 40),

      '--radius': '1rem',
      '--md3-surface-container-low': surfaceContainerLow,
      '--md3-surface-container': surfaceContainer,
      '--md3-surface-container-high': surfaceContainerHigh,
      '--md3-surface-container-highest': surfaceContainerHighest,
      '--md3-primary-container': hsl(pH, clamp(pS * 0.9, 45, 90), 90), // Tone 90
      '--md3-on-primary-container': hsl(pH, clamp(pS * 0.9, 45, 90), 10), // Tone 10
      '--md3-secondary-container': hsl(sH, clamp(sS * 0.6, 20, 50), 90), // Tone 90
      '--md3-on-secondary-container': hsl(sH, clamp(sS * 0.7, 30, 60), 10), // Tone 10
      '--md3-tertiary-container': hsl(aH, clamp(aS * 0.7, 30, 60), 90), // Tone 90
      '--md3-on-tertiary-container': hsl(aH, clamp(aS * 0.8, 40, 70), 10), // Tone 10
      '--md3-outline': hsl(nH, nS * 0.25, 45), // Tone 50
      '--md3-outline-variant': hsl(nH, nS * 0.2, 80), // Tone 80
      '--md3-surface-tint': hsl(pH, clamp(pS * 0.9, 45, 90), 40), // Tone 40
    };
  } else {
    // M3 Dark Tones
    // Surface (Tone 6), Surface Container Low (Tone 10), Surface Container (Tone 12), Surface Container High (Tone 17)
    const baseL = isBlack ? 0 : 6;
    const surface = hsl(nH, nS * 0.1, baseL);
    const surfaceContainerLow = hsl(nH, nS * 0.15, baseL + 4);
    const surfaceContainer = hsl(nH, nS * 0.2, baseL + 6);
    const surfaceContainerHigh = hsl(nH, nS * 0.25, baseL + 11);
    const surfaceContainerHighest = hsl(nH, nS * 0.3, baseL + 16);

    return {
      '--background': surface,
      '--foreground': hsl(nH, nS * 0.15, 90), // On Surface (Tone 90)
      '--card': surfaceContainerLow,
      '--card-foreground': hsl(nH, nS * 0.15, 90),
      '--popover': surfaceContainerHigh,
      '--popover-foreground': hsl(nH, nS * 0.15, 90),

      '--primary': hsl(pH, clamp(pS * 1.1, 60, 100), 80), // Primary (Tone 80)
      '--primary-foreground': hsl(pH, pS, 20), // On Primary (Tone 20)

      '--secondary': hsl(sH, clamp(sS * 0.5, 15, 40), 30), // Secondary Container (Tone 30)
      '--secondary-foreground': hsl(sH, clamp(sS * 0.6, 25, 50), 90), // On Secondary Container (Tone 90)

      '--muted': surfaceContainerHighest, // Surface Variant (Tone 30/Highest)
      '--muted-foreground': hsl(nH, nS * 0.2, 80), // On Surface Variant (Tone 80)

      '--accent': hsl(aH, clamp(aS * 0.5, 20, 50), 30), // Tertiary Container (Tone 30)
      '--accent-foreground': hsl(aH, clamp(aS * 0.6, 30, 60), 90), // On Tertiary Container (Tone 90)

      '--destructive': '3 70% 80%', // Error (Tone 80)
      '--destructive-foreground': '3 100% 20%', // On Error (Tone 20)

      '--success': '142 50% 65%',
      '--success-foreground': '142 60% 12%',
      '--warning': '38 75% 70%',
      '--warning-foreground': '38 80% 8%',
      '--error': '3 70% 80%',
      '--error-foreground': '3 100% 20%',

      '--border': hsl(nH, nS * 0.2, 30), // Outline Variant (Tone 30)
      '--input': hsl(nH, nS * 0.25, 60), // Outline (Tone 60)
      '--ring': hsl(pH, clamp(pS * 1.1, 60, 100), 80),

      '--radius': '1rem',
      '--md3-surface-container-low': surfaceContainerLow,
      '--md3-surface-container': surfaceContainer,
      '--md3-surface-container-high': surfaceContainerHigh,
      '--md3-surface-container-highest': surfaceContainerHighest,
      '--md3-primary-container': hsl(pH, clamp(pS * 1.1, 60, 100), 30), // Tone 30
      '--md3-on-primary-container': hsl(pH, clamp(pS * 1.1, 60, 100), 90), // Tone 90
      '--md3-secondary-container': hsl(sH, clamp(sS * 0.5, 15, 40), 30), // Tone 30
      '--md3-on-secondary-container': hsl(sH, clamp(sS * 0.6, 25, 50), 90), // Tone 90
      '--md3-tertiary-container': hsl(aH, clamp(aS * 0.5, 20, 50), 30), // Tone 30
      '--md3-on-tertiary-container': hsl(aH, clamp(aS * 0.6, 30, 60), 90), // Tone 90
      '--md3-outline': hsl(nH, nS * 0.25, 60), // Tone 60
      '--md3-outline-variant': hsl(nH, nS * 0.2, 30), // Tone 30
      '--md3-surface-tint': hsl(pH, clamp(pS * 1.1, 60, 100), 80), // Tone 80
    };
  }
}

// ─── Dynamic iOS 2024 Tokens (High Contrast, Glassy) ────────────────────────────────
export function generateiOSTokens(
  preset: ThemePreset,
  isDark: boolean,
  isBlack: boolean,
): Record<string, string> {
  const [pH, pS] = preset.primary;
  // Force a very pure, saturated version of the primary for iOS Apple feel
  const iosPrimaryS = clamp(pS * 1.2, 80, 100);

  if (!isDark) {
    return {
      '--background': '240 10% 95%', // System Grouped Background
      '--foreground': '0 0% 0%', // Absolute black text
      '--card': '0 0% 100%', // Pure white cards
      '--card-foreground': '0 0% 0%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '0 0% 0%',
      '--primary': hsl(pH, iosPrimaryS, 52), // Vibrant
      '--primary-foreground': '0 0% 100%',
      '--secondary': '240 5% 90%', // Light gray for secondary buttons
      '--secondary-foreground': hsl(pH, iosPrimaryS, 52), // iOS often uses primary color for secondary text
      '--muted': '240 5% 92%',
      '--muted-foreground': '240 2% 45%', // iOS secondary label
      '--accent': '240 5% 92%',
      '--accent-foreground': hsl(pH, iosPrimaryS, 52),
      '--destructive': '354 100% 54%', // Apple Red
      '--destructive-foreground': '0 0% 100%',
      '--success': '120 100% 32%', // Apple Green
      '--success-foreground': '0 0% 100%',
      '--warning': '35 100% 50%', // Apple Orange
      '--warning-foreground': '0 0% 100%',
      '--error': '354 100% 54%',
      '--error-foreground': '0 0% 100%',
      '--border': '240 5% 85%', // Separator color
      '--input': '240 5% 85%',
      '--ring': hsl(pH, iosPrimaryS, 52),
      '--radius': '1rem',
    };
  } else {
    const bg = isBlack ? '0 0% 0%' : '240 4% 10%'; // System Background
    const card = isBlack ? '0 0% 5%' : '240 4% 17%'; // Secondary System Background
    return {
      '--background': bg,
      '--foreground': '0 0% 100%', // Pure white text
      '--card': card,
      '--card-foreground': '0 0% 100%',
      '--popover': card,
      '--popover-foreground': '0 0% 100%',
      '--primary': hsl(pH, iosPrimaryS, 58), // Slightly lighter primary for dark mode
      '--primary-foreground': '0 0% 100%',
      '--secondary': '240 4% 25%',
      '--secondary-foreground': hsl(pH, iosPrimaryS, 58),
      '--muted': '240 4% 20%',
      '--muted-foreground': '240 2% 65%', // Secondary label
      '--accent': '240 4% 25%',
      '--accent-foreground': hsl(pH, iosPrimaryS, 58),
      '--destructive': '354 100% 62%',
      '--destructive-foreground': '0 0% 100%',
      '--success': '120 100% 40%',
      '--success-foreground': '0 0% 100%',
      '--warning': '35 100% 55%',
      '--warning-foreground': '0 0% 100%',
      '--error': '354 100% 62%',
      '--error-foreground': '0 0% 100%',
      '--border': '240 4% 25%', // Separator color
      '--input': '240 4% 25%',
      '--ring': hsl(pH, iosPrimaryS, 58),
      '--radius': '1rem',
    };
  }
}

// ─── Pure Aura Tokens (Ethereal, Soft, Luxurious) ───────────────────────────────────────
export function generateAuraTokens(
  preset: ThemePreset,
  isDark: boolean,
  isBlack: boolean,
): Record<string, string> {
  const [pH, pS] = preset.primary;
  // Aura uses highly desaturated, warm/cool neutrals based on primary hue
  const auraHue = pH;

  if (!isDark) {
    return {
      '--background': hsl(auraHue, 15, 97.5), // Very light, tinted off-white
      '--foreground': hsl(auraHue, 10, 20),
      '--card': hsl(auraHue, 10, 99.5), // Almost pure white, very slight tint
      '--card-foreground': hsl(auraHue, 10, 20),
      '--popover': hsl(auraHue, 10, 99.5),
      '--popover-foreground': hsl(auraHue, 10, 20),
      '--primary': hsl(pH, clamp(pS * 0.75, 25, 55), 45), // Subdued, elegant primary
      '--primary-foreground': '0 0% 100%',
      '--secondary': hsl(auraHue, 12, 92), // Very soft secondary
      '--secondary-foreground': hsl(pH, clamp(pS * 0.6, 20, 50), 30),
      '--muted': hsl(auraHue, 10, 94),
      '--muted-foreground': hsl(auraHue, 8, 55),
      '--accent': hsl(auraHue, 15, 90),
      '--accent-foreground': hsl(pH, clamp(pS * 0.75, 25, 55), 45),
      '--destructive': '0 45% 55%',
      '--destructive-foreground': '0 0% 100%',
      '--success': '145 35% 45%',
      '--success-foreground': '0 0% 100%',
      '--warning': '35 50% 50%',
      '--warning-foreground': '0 0% 100%',
      '--error': '0 45% 55%',
      '--error-foreground': '0 0% 100%',
      '--border': hsl(auraHue, 10, 90), // Very faint border
      '--input': hsl(auraHue, 10, 90),
      '--ring': hsl(pH, clamp(pS * 0.75, 25, 55), 45),
      '--radius': '1rem', // Maximum roundness
    };
  } else {
    // Deep, velvety darks for Aura Dark
    const bgL = isBlack ? 0 : 6;
    const cardL = isBlack ? 3 : 9;
    return {
      '--background': hsl(auraHue, 8, bgL),
      '--foreground': hsl(auraHue, 10, 92),
      '--card': hsl(auraHue, 10, cardL),
      '--card-foreground': hsl(auraHue, 10, 92),
      '--popover': hsl(auraHue, 10, cardL),
      '--popover-foreground': hsl(auraHue, 10, 92),
      '--primary': hsl(pH, clamp(pS * 0.6, 20, 50), 70), // Soft, glowing primary in dark
      '--primary-foreground': hsl(auraHue, 10, 10),
      '--secondary': hsl(auraHue, 8, cardL + 4),
      '--secondary-foreground': hsl(pH, clamp(pS * 0.5, 20, 40), 85),
      '--muted': hsl(auraHue, 8, cardL + 2),
      '--muted-foreground': hsl(auraHue, 6, 60),
      '--accent': hsl(auraHue, 8, cardL + 6),
      '--accent-foreground': hsl(pH, clamp(pS * 0.6, 20, 50), 75),
      '--destructive': '0 50% 65%',
      '--destructive-foreground': '0 0% 100%',
      '--success': '145 40% 60%',
      '--success-foreground': '0 0% 10%',
      '--warning': '35 60% 65%',
      '--warning-foreground': '0 0% 10%',
      '--error': '0 50% 65%',
      '--error-foreground': '0 0% 100%',
      '--border': hsl(auraHue, 8, cardL + 5), // Barely visible borders
      '--input': hsl(auraHue, 8, cardL + 5),
      '--ring': hsl(pH, clamp(pS * 0.6, 20, 50), 70),
      '--radius': '1rem',
    };
  }
}
