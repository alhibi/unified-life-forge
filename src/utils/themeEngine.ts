import { applyRootTokens } from '@/lib/rootTokens';

// ─── Token Architecture ─────────────────────────────────────
// Exactly 4 roles per mode, no exceptions.
// Roles: bg, surface, ink, accent.
// Font family: Inter Display (set globally as sole typeface).

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeStyle = 'tonal' | 'vibrant' | 'neutral' | 'expressive';
export type Hsl = [number, number, number];
export type ThemeScale = [Hsl, Hsl, Hsl, Hsl, Hsl, Hsl, Hsl];

/**
 * The published tone ladder. Eleven perceptual steps instead of seven, so a
 * component can pick a plane (25…200), an accent weight (300…500) or an ink
 * weight (600…900) without inventing a one-off colour.
 *
 * Fixed contract, relied upon across the app and by the integrity tests:
 *   50  = page background · 100 = card surface · 400 = primary accent
 */
export const SCALE_STEPS = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];

export interface ThemeColorSet {
  bg: string;      // hex string e.g. '#E4DFDB'
  surface: string; // hex string e.g. '#E3D7CD'
  ink: string;     // hex string e.g. '#3F3F3F'
  accent: string;  // hex string e.g. '#E45B60'
}

export interface ThemePreset {
  id: string;
  name: string;
  nameEn: string;
  font: 'Inter Display';
  light: ThemeColorSet;
  dark: ThemeColorSet;
  // ── Legacy Compatibility ───────────────────────────────
  scale: ThemeScale;
  primary: Hsl;
  secondary: Hsl;
  accent: Hsl;
  neutral: Hsl;
}

export const INK: Hsl = [0, 0, 24.7]; // hex #3F3F3F
export const INK_CSS = 'hsl(0 0% 24.7%)';
export const INK_HEX = '#3F3F3F';

export type SurfaceLift = 'flat' | 'subtle' | 'lifted';

// Convert Hex to Hsl array
export function hexToHsl(hex: string): Hsl {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [
    Math.round(h * 360),
    Math.round(s * 100 * 10) / 10,
    Math.round(l * 100 * 10) / 10,
  ];
}

// Convert Hsl array to css string e.g. "27 14.3% 87.6%"
function hslToString([h, s, l]: Hsl): string {
  return `${h} ${s}% ${l}%`;
}

// Convert Hex directly to space-separated Hsl string
function hexToHslString(hex: string): string {
  return hslToString(hexToHsl(hex));
}

// ─── Perceptual colour space (OKLab / OKLCH) ─────────────────
// HSL lightness is not perceptual: `50%` yellow and `50%` blue are nowhere
// near the same brightness, so an HSL ladder walks unevenly from hue to hue.
// All tone maths below therefore happens in OKLab and only the final result is
// converted back to HSL, because every token in the app is consumed as
// `hsl(var(--token))` and must stay a plain `H S% L%` triple.

type Rgb = [number, number, number]; // 0…1 sRGB
type Oklab = [number, number, number]; // L 0…1, a, b

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function hslToRgb([h, s, l]: Hsl): Rgb {
  const hex = hslToHex([h, s, l]);
  return [0, 1, 2].map((i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255) as Rgb;
}

function rgbToOklab([r, g, b]: Rgb): Oklab {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb([L, A, B]: Oklab): Rgb {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [lr, lg, lb].map((c) =>
    Math.min(1, Math.max(0, linearToSrgb(c))),
  ) as Rgb;
}

function rgbToHsl([r, g, b]: Rgb): Hsl {
  const hex = `#${[r, g, b]
    .map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
  return hexToHsl(hex);
}

function hslToOklab(hsl: Hsl): Oklab {
  return rgbToOklab(hslToRgb(hsl));
}

function oklabToHsl(lab: Oklab): Hsl {
  return rgbToHsl(oklabToRgb(lab));
}

/** Perceptual lightness of a colour, 0 (black) → 1 (white). */
function perceptualL(hsl: Hsl): number {
  return hslToOklab(hsl)[0];
}

/** Move a colour to a target perceptual lightness, keeping its hue and chroma. */
function withPerceptualL(hsl: Hsl, L: number): Hsl {
  const [, a, b] = hslToOklab(hsl);
  return oklabToHsl([Math.min(1, Math.max(0, L)), a, b]);
}

/**
 * Flatten an "ink over background" translucency into a SOLID hsl triple.
 *
 * Tokens like `--border` are consumed downstream as `hsl(var(--border) / 0.72)`,
 * so they must never carry their own alpha — `hsl(h s% l% / 0.1 / 0.72)` is
 * invalid CSS and the whole declaration gets dropped (borders, dividers and
 * modal scrims vanish). We therefore pre-mix the alpha into a solid colour.
 *
 * The mix itself is perceptual (OKLab), so a 20% line over a warm page and the
 * same 20% line over a cool page read as equally strong.
 */
function mixHsl(fg: Hsl, bg: Hsl, amount: number): Hsl {
  const a = hslToOklab(fg);
  const b = hslToOklab(bg);
  return oklabToHsl([
    b[0] + (a[0] - b[0]) * amount,
    b[1] + (a[1] - b[1]) * amount,
    b[2] + (a[2] - b[2]) * amount,
  ]);
}

function solid(fg: Hsl, bg: Hsl, amount: number): string {
  return hslToString(mixHsl(fg, bg, amount));
}

// ─── Contrast maths ─────────────────────────────────────────
// Every derived token is verified against WCAG relative luminance so no
// palette can ship text or lines that disappear into its own surface.

function relativeLuminance(hsl: Hsl): number {
  const hex = hslToHex(hsl);
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

export function contrastRatio(a: Hsl, b: Hsl): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Walk a colour away from its background, in PERCEPTUAL lightness, until it
 * clears `target`. Hue and chroma are preserved so the palette's character
 * survives the correction; only the tone moves — and it moves by the same
 * visual amount whatever the hue, which HSL lightness could not promise.
 */
function ensureContrast(fg: Hsl, bg: Hsl, target: number): Hsl {
  if (contrastRatio(fg, bg) >= target) return fg;
  const goDark = relativeLuminance(bg) > 0.18;
  const startL = perceptualL(fg);
  let best = fg;
  for (let step = 1; step <= 120; step += 1) {
    const L = goDark ? startL - step * 0.01 : startL + step * 0.01;
    if (L < 0 || L > 1) break;
    const candidate = withPerceptualL(fg, L);
    best = candidate;
    if (contrastRatio(candidate, bg) >= target) return candidate;
  }
  return best;
}

/**
 * Raise a plane above (light mode: toward white / dark mode: toward light) its
 * own background by a perceptual amount. This is what makes the elevation
 * ladder read as depth instead of as four almost-identical greys.
 */
function elevate(base: Hsl, isDark: boolean, amount: number): Hsl {
  const L = perceptualL(base) + (isDark ? amount : amount * 0.55);
  return withPerceptualL(base, Math.min(0.985, Math.max(0.015, L)));
}

/** Accent strength is a real transform: saturation and tone, clamped. */
const ACCENT_STRENGTH: Record<ThemeStyle | 'rainbow', { sat: number; lift: number }> = {
  neutral: { sat: 0.72, lift: 0 },
  tonal: { sat: 0.9, lift: 0 },
  vibrant: { sat: 1.12, lift: 3 },
  expressive: { sat: 1.34, lift: 6 },
  rainbow: { sat: 1.18, lift: 2 },
};

function applyAccentStrength(accent: Hsl, style: ThemeStyle, isDark: boolean): Hsl {
  const spec = ACCENT_STRENGTH[style] ?? ACCENT_STRENGTH.tonal;
  const sat = Math.min(96, Math.max(6, accent[1] * spec.sat));
  const lift = isDark ? spec.lift : -spec.lift * 0.6;
  const lightness = Math.min(82, Math.max(18, accent[2] + lift));
  return [accent[0], Math.round(sat * 10) / 10, Math.round(lightness * 10) / 10];
}

/**
 * Guarantee cards read as a distinct plane from the page behind them, measured
 * perceptually: a 3% HSL gap is invisible on a dark canvas and glaring on a
 * pale one, so the gap is expressed in OKLab lightness instead.
 */
function ensureSurfaceSeparation(surface: Hsl, bg: Hsl, isDark: boolean): Hsl {
  const delta = Math.abs(perceptualL(surface) - perceptualL(bg));
  if (delta >= 0.028) return surface;
  return elevate(bg, isDark, isDark ? 0.05 : 0.06);
}

/**
 * The single source of truth for the published 25 → 900 tone ladder.
 * Both the runtime tokens and the settings swatches call this, so a preview is
 * literally the colours the app will paint.
 *
 * Three zones, eleven steps:
 *   planes  25 · 50 · 100 · 200   (recessed → page → card → raised)
 *   accent  300 · 400 · 500       (wash → accent → deep)
 *   ink     600 · 700 · 800 · 900 (secondary text → body → strong → maximum)
 */
function buildToneLadder(
  bg: Hsl,
  surface: Hsl,
  ink: Hsl,
  accent: Hsl,
  isDark: boolean,
): Hsl[] {
  return [
    elevate(bg, isDark, -0.03), // 25  — recessed plane (wells, tracks)
    bg, // 50  — page
    surface, // 100 — card
    elevate(surface, isDark, 0.035), // 200 — raised plane (popovers, sheets)
    mixHsl(accent, bg, 0.2), // 300 — accent wash
    accent, // 400 — accent
    mixHsl(ink, accent, 0.4), // 500 — accent deep
    mixHsl(ink, bg, 0.7), // 600 — secondary ink
    mixHsl(ink, bg, 0.85), // 700 — body ink
    ink, // 800 — ink
    ensureContrast(ink, bg, 12), // 900 — maximum ink
  ];
}

/**
 * Status colours: the hue is semantic and fixed (red = destructive), but the
 * tone is resolved against the live background so it always clears AA, and the
 * label on top is whichever of white/near-black is actually readable.
 */
function statusTokens(bg: Hsl): Record<string, string> {
  const WHITE: Hsl = [0, 0, 100];
  const resolve = (hue: Hsl) => {
    const tone = ensureContrast(hue, bg, 4.5);
    const dark: Hsl = [hue[0], Math.min(90, hue[1] + 10), 12];
    const fg = contrastRatio(WHITE, tone) >= contrastRatio(dark, tone) ? WHITE : dark;
    return { tone: hslToString(tone), fg: hslToString(fg) };
  };

  const danger = resolve([358, 72, 50]);
  const success = resolve([145, 50, 36]);
  const warning = resolve([38, 85, 45]);

  return {
    '--destructive': danger.tone,
    '--destructive-foreground': danger.fg,
    '--success': success.tone,
    '--success-foreground': success.fg,
    '--warning': warning.tone,
    '--warning-foreground': warning.fg,
    '--error': danger.tone,
    '--error-foreground': danger.fg,
  };
}

// Convert Hsl array to hex string
function hslToHex([h, s, l]: Hsl): string {
  const sFrac = s / 100;
  const lFrac = l / 100;
  const c = (1 - Math.abs(2 * lFrac - 1)) * sFrac;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lFrac - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

function definePreset(
  id: string,
  name: string,
  nameEn: string,
  light: ThemeColorSet,
  dark: ThemeColorSet
): ThemePreset {
  const lightBgHsl = hexToHsl(light.bg);
  const lightSurfHsl = hexToHsl(light.surface);
  const lightInkHsl = hexToHsl(light.ink);
  const lightAccHsl = hexToHsl(light.accent);

  // Compute a mock scale of 7 tones walked down lightness ladder for backwards compatibility
  const scale: ThemeScale = [
    lightBgHsl, // 50
    lightSurfHsl, // 100
    [lightAccHsl[0], lightAccHsl[1], Math.min(90, lightAccHsl[2] + 12)], // 200
    lightAccHsl, // 300
    [lightInkHsl[0], lightInkHsl[1], Math.min(80, lightInkHsl[2] + 24)], // 400
    [lightInkHsl[0], lightInkHsl[1], Math.min(80, lightInkHsl[2] + 12)], // 500
    lightInkHsl, // 600
  ];

  return {
    id,
    name,
    nameEn,
    font: 'Inter Display',
    light,
    dark,
    scale,
    primary: lightAccHsl,
    secondary: lightSurfHsl,
    accent: lightAccHsl,
    neutral: lightInkHsl,
  };
}

// ─── Theme Presets ──────────────────────────────────────────
export const themePresets: ThemePreset[] = [
  definePreset(
    'copper',
    'نُحاس معماري',
    'Architectural Copper',
    { bg: '#F4F2EF', surface: '#FBFAF8', ink: '#17171A', accent: '#9A6B37' },
    { bg: '#0D0D0F', surface: '#1A1A1E', ink: '#EDEBE7', accent: '#C9A06A' }
  ),
  definePreset(
    'default',
    'كلاسيك',
    'Classic',
    { bg: '#E4DFDB', surface: '#E3D7CD', ink: '#3F3F3F', accent: '#E45B60' },
    { bg: '#1A1A1A', surface: '#3F3F3F', ink: '#E4DFDB', accent: '#E45B60' }
  ),
  definePreset(
    'paper',
    'ورق وحبر',
    'Paper & Ink',
    { bg: '#F5F0E8', surface: '#FBF8F3', ink: '#1A1A1F', accent: '#8A5B3D' },
    { bg: '#12110F', surface: '#1A1916', ink: '#F2E9D8', accent: '#B8492E' }
  ),
  definePreset(
    'mono',
    'مونوكروم',
    'Mono',
    { bg: '#F5F5F5', surface: '#FFFFFF', ink: '#1A1A1A', accent: '#1A1A1A' },
    { bg: '#121212', surface: '#1E1E1E', ink: '#F5F5F5', accent: '#FFFFFF' }
  ),
  definePreset(
    'coffee',
    'قهوة',
    'Coffee',
    { bg: '#F3EFE9', surface: '#EAE3D8', ink: '#3E2723', accent: '#8D6E63' },
    { bg: '#1E1410', surface: '#2D1E18', ink: '#EFEBE9', accent: '#A1887F' }
  ),
  definePreset(
    'fog',
    'ضباب',
    'Fog',
    { bg: '#EAF0F6', surface: '#DCE5ED', ink: '#2B3842', accent: '#4F708C' },
    { bg: '#151B22', surface: '#242C35', ink: '#EAF0F6', accent: '#7295B3' }
  ),
  definePreset(
    'obsidian',
    'سبج',
    'Obsidian',
    { bg: '#E6E4E2', surface: '#F0EDE9', ink: '#1A1917', accent: '#B8860B' },
    { bg: '#0A0A0B', surface: '#151517', ink: '#F5F2EB', accent: '#D4AF37' }
  ),
  definePreset(
    'midnight',
    'منتصف الليل',
    'Midnight',
    { bg: '#E6E9F0', surface: '#D2D7E5', ink: '#121E31', accent: '#2A52BE' },
    { bg: '#080E1A', surface: '#162235', ink: '#E6E9F0', accent: '#5381E6' }
  ),
  definePreset(
    'rose',
    'روز جولد',
    'Rose Gold',
    { bg: '#F9F1F2', surface: '#F2DFE2', ink: '#4A2A2E', accent: '#C87D88' },
    { bg: '#1A0E10', surface: '#2E181C', ink: '#F9F1F2', accent: '#E2A9B1' }
  ),
  definePreset(
    'emerald',
    'زمرد',
    'Emerald',
    { bg: '#E8F5E9', surface: '#C8E6C9', ink: '#1B5E20', accent: '#2E7D32' },
    { bg: '#0A110C', surface: '#122216', ink: '#E8F5E9', accent: '#4CAF50' }
  ),
  definePreset(
    'lavender',
    'لافندر',
    'Lavender',
    { bg: '#F3EBF5', surface: '#E6D7E8', ink: '#3E2445', accent: '#8E44AD' },
    { bg: '#160E1A', surface: '#271733', ink: '#F3EBF5', accent: '#BB8FCE' }
  ),
  definePreset(
    'sunset',
    'غروب',
    'Sunset',
    { bg: '#FDF5E6', surface: '#FAEBD7', ink: '#5C2E2B', accent: '#FF7F50' },
    { bg: '#140C0A', surface: '#22120F', ink: '#FFF5EE', accent: '#FF7F50' }
  ),
  definePreset(
    'ocean',
    'محيط',
    'Ocean',
    { bg: '#E0F2F1', surface: '#B2DFDB', ink: '#004D40', accent: '#00796B' },
    { bg: '#001211', surface: '#002926', ink: '#E0F2F1', accent: '#26A69A' }
  ),
  definePreset(
    'matcha',
    'ماتشا',
    'Matcha',
    { bg: '#F1F4EA', surface: '#E4EBD6', ink: '#26301C', accent: '#6B8E3E' },
    { bg: '#0E1209', surface: '#1B2213', ink: '#EEF3E4', accent: '#9CBF63' }
  ),
  definePreset(
    'moss',
    'طحلب',
    'Moss',
    { bg: '#EDF1EC', surface: '#DDE6DC', ink: '#1F2A22', accent: '#4A6B52' },
    { bg: '#0B0F0C', surface: '#161E18', ink: '#E6EDE6', accent: '#7FA98A' }
  ),
  definePreset(
    'clay',
    'طين',
    'Clay',
    { bg: '#F5EFEA', surface: '#EBE0D6', ink: '#33251D', accent: '#A9603F' },
    { bg: '#130E0B', surface: '#211814', ink: '#F1E7DE', accent: '#CE8A62' }
  ),
  definePreset(
    'sandstone',
    'حجر رملي',
    'Sandstone',
    { bg: '#F6F1E6', surface: '#ECE3CF', ink: '#2E2A1F', accent: '#9C7C3C' },
    { bg: '#12100A', surface: '#201C12', ink: '#F3EDDD', accent: '#C9A959' }
  ),
  definePreset(
    'mint',
    'نعناع',
    'Mint',
    { bg: '#EAF6F1', surface: '#D6EDE3', ink: '#12312A', accent: '#128069' },
    { bg: '#08130F', surface: '#0F2119', ink: '#E4F4EE', accent: '#4FC3A1' }
  ),
  definePreset(
    'gold',
    'ذهب',
    'Gold',
    { bg: '#F8F3E6', surface: '#F0E6CE', ink: '#2C2415', accent: '#96731C' },
    { bg: '#12100A', surface: '#211C10', ink: '#F7F0DC', accent: '#D9B441' }
  ),
  definePreset(
    'cherry',
    'كرز',
    'Cherry',
    { bg: '#FBF0F1', surface: '#F4DDDF', ink: '#3B1418', accent: '#B0203A' },
    { bg: '#150A0C', surface: '#241014', ink: '#FAE9EB', accent: '#E9566F' }
  ),
  definePreset(
    'volcano',
    'بركان',
    'Volcano',
    { bg: '#F5EEEB', surface: '#EBDCD5', ink: '#2A1712', accent: '#B04A22' },
    { bg: '#110B09', surface: '#1F1310', ink: '#F3E6E0', accent: '#E4713C' }
  ),
  definePreset(
    'amber',
    'عنبر',
    'Amber',
    { bg: '#FBF4E4', surface: '#F6E8C9', ink: '#31240D', accent: '#9A6C0B' },
    { bg: '#130F07', surface: '#221A0C', ink: '#F9EFD9', accent: '#E0A82E' }
  ),
  definePreset(
    'terracotta',
    'فخار',
    'Terracotta',
    { bg: '#F7EFE9', surface: '#EEDDD1', ink: '#331F16', accent: '#A75434' },
    { bg: '#140D09', surface: '#231710', ink: '#F5E7DC', accent: '#D9825C' }
  ),
  definePreset(
    'neon',
    'نيون',
    'Neon',
    { bg: '#EFF1F5', surface: '#E1E5EE', ink: '#14161C', accent: '#0F62FE' },
    { bg: '#08090C', surface: '#121520', ink: '#EDF0F7', accent: '#4D8BFF' }
  ),
  definePreset(
    'aurora',
    'شفق قطبي',
    'Aurora',
    { bg: '#EBF4F3', surface: '#D8EAE9', ink: '#10262B', accent: '#0E7C86' },
    { bg: '#07100F', surface: '#0F1F21', ink: '#E4F2F1', accent: '#3FD3C6' }
  ),
  definePreset(
    'sakura',
    'ساكورا',
    'Sakura',
    { bg: '#FCF1F4', surface: '#F7DEE7', ink: '#3A1B27', accent: '#C24C77' },
    { bg: '#150B0F', surface: '#251319', ink: '#FBEAF0', accent: '#F090B0' }
  ),
  definePreset(
    'arctic',
    'قطبي',
    'Arctic',
    { bg: '#EEF4F9', surface: '#DCE8F2', ink: '#152430', accent: '#1F6C99' },
    { bg: '#080D12', surface: '#111C24', ink: '#E9F2F9', accent: '#63B3E0' }
  ),
  definePreset(
    'nebula',
    'سديم',
    'Nebula',
    { bg: '#F1EEF8', surface: '#E1DBF1', ink: '#1E1733', accent: '#5B3FD1' },
    { bg: '#0A0812', surface: '#161125', ink: '#EDE9F8', accent: '#9E86F5' }
  ),
  definePreset(
    'dusk',
    'شفق',
    'Dusk',
    { bg: '#F2EEF0', surface: '#E2DAE0', ink: '#221C26', accent: '#71527A' },
    { bg: '#0C0A0E', surface: '#191420', ink: '#EEE8F0', accent: '#AE8FBB' }
  ),
  definePreset(
    'storm',
    'عاصفة',
    'Storm',
    { bg: '#EDEFF1', surface: '#DDE1E5', ink: '#181C20', accent: '#41606F' },
    { bg: '#0A0C0D', surface: '#161A1D', ink: '#E9EDEF', accent: '#7C9EAE' }
  ),
  definePreset(
    'silk',
    'حرير',
    'Silk',
    { bg: '#F7F5F1', surface: '#EFEBE3', ink: '#26231D', accent: '#8C7A5B' },
    { bg: '#100F0C', surface: '#1D1B16', ink: '#F4F1EA', accent: '#C3AE86' }
  ),
];

// ─── Dynamic theme from image ───────────────────────────────
export function extractDominantColor(img: HTMLImageElement): [number, number, number] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [358, 72, 62];

  canvas.width = 64;
  canvas.height = 64;
  ctx.drawImage(img, 0, 0, 64, 64);
  const data = ctx.getImageData(0, 0, 64, 64).data;

  let rTotal = 0,
    gTotal = 0,
    bTotal = 0,
    count = 0;
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const brightness = (r + g + b) / 3;
    if (brightness > 30 && brightness < 220) {
      rTotal += r;
      gTotal += g;
      bTotal += b;
      count++;
    }
  }

  if (count === 0) return [358, 72, 62];
  const r = rTotal / count,
    g = gTotal / count,
    b = bTotal / count;

  // Convert RGB to Hsl
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rN) h = ((gN - bN) / d + (gN < bN ? 6 : 0)) / 6;
    else if (max === gN) h = ((bN - rN) / d + 2) / 6;
    else h = ((rN - gN) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function createDynamicPreset(baseHsl: [number, number, number]): ThemePreset {
  const [h, s] = baseHsl;
  const lightBgHex = hslToHex([h, Math.max(5, s * 0.4), 88]);
  const lightSurfHex = hslToHex([h, Math.max(5, s * 0.5), 82]);
  const lightInkHex = hslToHex([h, Math.max(5, s * 0.2), 24]);
  const lightAccHex = hslToHex([h, Math.max(25, s * 1.1), 60]);

  const darkBgHex = hslToHex([h, Math.max(5, s * 0.15), 10]);
  const darkSurfHex = hslToHex([h, Math.max(5, s * 0.25), 24]);
  const darkInkHex = hslToHex([h, Math.max(5, s * 0.4), 88]);
  const darkAccHex = hslToHex([h, Math.max(25, s * 1.1), 60]);

  return definePreset(
    'dynamic',
    'ديناميكي',
    'Dynamic',
    { bg: lightBgHex, surface: lightSurfHex, ink: lightInkHex, accent: lightAccHex },
    { bg: darkBgHex, surface: darkSurfHex, ink: darkInkHex, accent: darkAccHex }
  );
}

// ─── Token Generation ───────────────────────────────────────
export function generateThemeTokens(
  preset: ThemePreset,
  style: ThemeStyle,
  isDark: boolean,
  isBlack: boolean,
  lift: SurfaceLift = 'subtle'
): Record<string, string> {
  const modeColors = isDark ? preset.dark : preset.light;
  const rawBg = hexToHsl(modeColors.bg);
  const rawSurface = hexToHsl(modeColors.surface);

  // OLED black mode keeps the palette's hue instead of collapsing to a
  // neutral #080808 whose card colour no longer belongs to the theme.
  const bgHsl: Hsl =
    isDark && isBlack ? [rawBg[0], Math.min(rawBg[1], 12), 2.5] : rawBg;
  const surfaceBase: Hsl =
    isDark && isBlack
      ? [rawSurface[0], Math.min(rawSurface[1], 14), Math.max(7, rawSurface[2] - 3)]
      : rawSurface;

  // Surface lift is a tone decision: flat sits on the page, lifted floats.
  const liftDelta = lift === 'flat' ? -1.5 : lift === 'lifted' ? 2.5 : 0;
  const surfHsl = ensureSurfaceSeparation(
    [
      surfaceBase[0],
      surfaceBase[1],
      Math.min(99, Math.max(1, surfaceBase[2] + (isDark ? liftDelta : -liftDelta))),
    ],
    bgHsl,
    isDark,
  );

  // Ink must clear WCAG AA against both the page and the cards on it.
  const inkHsl = ensureContrast(
    ensureContrast(hexToHsl(modeColors.ink), bgHsl, 7),
    surfHsl,
    5.5,
  );
  // Accent obeys the chosen strength, then is corrected until it is legible
  // as a large-text / iconography colour on the page.
  const accHsl = ensureContrast(
    applyAccentStrength(hexToHsl(modeColors.accent), style, isDark),
    bgHsl,
    3.2,
  );

  const bgStr = hslToString(bgHsl);
  const surfStr = hslToString(surfHsl);
  const inkStr = hslToString(inkHsl);
  const accStr = hslToString(accHsl);

  // Derive secondary/tertiary/disabled/hover/pressed states from the 4 roles ONLY.
  // Each one is pre-mixed into a SOLID triple so downstream CSS can safely
  // compose its own alpha, e.g. `hsl(var(--border) / 0.72)`.
  // Dark surfaces need a heavier mix to read at the same perceived strength,
  // which is why the two modes carry different ladders.
  const lineBase = isDark ? 0.26 : 0.2;
  const borderStr = solid(inkHsl, bgHsl, lineBase);            // hairline
  const inputStr = solid(inkHsl, bgHsl, lineBase + 0.12);      // field outline
  const secondaryStr = solid(inkHsl, bgHsl, isDark ? 0.14 : 0.11);
  const secondaryFgStr = solid(inkHsl, bgHsl, 0.94);           // near-ink text
  const mutedStr = solid(inkHsl, bgHsl, isDark ? 0.11 : 0.08);
  // Secondary text: mixed, then contrast-verified to AA (4.5:1) on the page.
  const mutedFgStr = hslToString(
    ensureContrast(mixHsl(inkHsl, bgHsl, 0.74), bgHsl, 4.5),
  );
  const disabledStr = solid(inkHsl, bgHsl, 0.46);              // disabled state

  const accentHighlightStr = solid(accHsl, bgHsl, 0.14); // subtle accent wash

  // Text on the accent is whichever of ink/bg is actually readable on it —
  // pale accents in dark mode used to place a near-black label on gold.
  const primaryFgStr =
    contrastRatio(bgHsl, accHsl) >= contrastRatio(inkHsl, accHsl) ? bgStr : inkStr;

  // ── Elevation ladder ───────────────────────────────────────
  // Four planes, each one a perceptual step above the last, plus the shadow
  // that belongs to it. Depth is expressed twice — as tone AND as shadow —
  // because a dark theme reads elevation from tone and a light theme reads it
  // from the shadow.
  const surface2 = elevate(surfHsl, isDark, 0.035);
  const surface3 = elevate(surfHsl, isDark, 0.07);

  const shadowRgb = isDark ? '0,0,0' : '28,24,20';
  const shadow1 = (
    isDark
      ? `0 1px 2px rgba(${shadowRgb},0.36)`
      : `0 1px 2px rgba(${shadowRgb},0.06)`,
  );
  const shadow2 = (
    isDark
      ? `0 2px 6px rgba(${shadowRgb},0.44), 0 1px 2px rgba(${shadowRgb},0.3)`
      : `0 2px 6px rgba(${shadowRgb},0.08), 0 1px 2px rgba(${shadowRgb},0.05)`,
  );
  const shadow3 = (
    isDark
      ? `0 8px 24px rgba(${shadowRgb},0.52), 0 2px 6px rgba(${shadowRgb},0.34)`
      : `0 8px 24px rgba(${shadowRgb},0.1), 0 2px 6px rgba(${shadowRgb},0.06)`,
  );
  const shadow4 = (
    isDark
      ? `0 20px 48px rgba(${shadowRgb},0.6), 0 6px 14px rgba(${shadowRgb},0.4)`
      : `0 20px 48px rgba(${shadowRgb},0.13), 0 6px 14px rgba(${shadowRgb},0.07)`,
  );
  const cardShadow = shadow1;

  // Published tone ladder (--theme-50 … --theme-600).
  // It is derived from the tones we JUST resolved for this mode, not from
  // `preset.scale` (which is a light-mode-only legacy artefact). Otherwise
  // every component reading --theme-* keeps light colours in dark mode.
  const scaleVars: Record<string, string> = {
    '--theme-ink': inkStr,
    // The scrim carries the palette's hue so overlays belong to the theme.
    '--scrim': hslToString([bgHsl[0], Math.min(bgHsl[1], 10), isDark ? 4 : 8]),
  };

  const ladder = buildToneLadder(bgHsl, surfHsl, inkHsl, accHsl, isDark);
  SCALE_STEPS.forEach((name, i) => {
    scaleVars[`--theme-${name}`] = hslToString(ladder[i]);
  });

  return {
    ...scaleVars,
    '--background': bgStr,
    '--foreground': inkStr,
    '--card': surfStr,
    '--card-foreground': inkStr,
    '--popover': surfStr,
    '--popover-foreground': inkStr,
    '--secondary': secondaryStr,
    '--secondary-foreground': secondaryFgStr,
    '--muted': mutedStr,
    '--muted-foreground': mutedFgStr,
    // shadcn contract: `accent` is a subtle interactive surface and
    // `accent-foreground` is the TEXT drawn on it — so it must be ink, not the
    // brand colour (copper-on-grey used to fail AA in hovered menu rows).
    '--accent': secondaryStr,
    '--accent-foreground': hslToString(
      ensureContrast(inkHsl, mixHsl(inkHsl, bgHsl, isDark ? 0.14 : 0.11), 4.5),
    ),
    // Kept for call sites that genuinely want the brand tone on that surface.
    '--accent-brand': accStr,
    '--primary': accStr,
    '--primary-foreground': primaryFgStr,
    '--disabled': disabledStr,
    // Status colours keep their fixed semantic hue but their TONE is resolved
    // against the active background, so they never sink into a very light or
    // very dark palette.
    ...statusTokens(bgHsl),
    // Lines
    '--border': borderStr,
    '--input': inputStr,
    '--ring': accStr,
    // Sidebar mirrors
    '--sidebar-background': bgStr,
    '--sidebar-foreground': inkStr,
    '--sidebar-primary': accStr,
    '--sidebar-primary-foreground': primaryFgStr,
    '--sidebar-accent': secondaryStr,
    '--sidebar-accent-foreground': accStr,
    '--sidebar-border': borderStr,
    '--sidebar-ring': accStr,
    // Live active states
    '--live': accStr,
    '--live-soft': solid(accHsl, bgHsl, 0.16),
    '--live-glow': accStr,
    // Extra elements
    '--card-shadow': cardShadow,
    '--accent-highlight': accentHighlightStr,
    // Planes: 0 is the page, 1 the card, 2 popovers/sheets, 3 anything that
    // floats above them (dialogs, menus, the command palette).
    '--surface-0': bgStr,
    '--surface-1': surfStr,
    '--surface-2': hslToString(surface2),
    '--surface-3': hslToString(surface3),
    // The shadow that belongs to each plane, plus the legacy aliases so old
    // call sites keep resolving to a real value.
    '--shadow-1': shadow1,
    '--shadow-2': shadow2,
    '--shadow-3': shadow3,
    '--shadow-4': shadow4,
    '--shadow-sm': shadow1,
    '--shadow-card': shadow2,
    '--shadow-elevated': shadow3,
    '--shadow-intense': shadow4,
  };
}

// ─── Helpers for Preview / Swatches ──────────────────────────
/**
 * The seven published tones (50 → 600) of a preset, in the mode being shown.
 * These are the same maths the token generator uses, so a swatch is a truthful
 * preview rather than a decorative approximation.
 */
export function getThemeScale(
  preset: ThemePreset,
  style: ThemeStyle = 'neutral',
  isDark = false,
): Hsl[] {
  const mode = isDark ? preset.dark : preset.light;
  const bg = hexToHsl(mode.bg);
  const surface = ensureSurfaceSeparation(hexToHsl(mode.surface), bg, isDark);
  const ink = ensureContrast(hexToHsl(mode.ink), bg, 7);
  const accent = ensureContrast(applyAccentStrength(hexToHsl(mode.accent), style, isDark), bg, 3.2);
  return buildToneLadder(bg, surface, ink, accent, isDark);
}

export function getThemeScaleColors(
  preset: ThemePreset,
  style: ThemeStyle = 'neutral',
  isDark = false,
): string[] {
  return getThemeScale(preset, style, isDark).map((tone) => hslToHex(tone));
}

/** The preset's own ink — the eighth band of a swatch. */
export function getThemeInk(preset: ThemePreset, isDark = false): string {
  const mode = isDark ? preset.dark : preset.light;
  return hslToHex(ensureContrast(hexToHsl(mode.ink), hexToHsl(mode.bg), 7));
}

export function applyThemeTokens(tokens: Record<string, string>) {
  applyRootTokens(tokens);
}
