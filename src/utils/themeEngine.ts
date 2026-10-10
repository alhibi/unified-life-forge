import { applyRootTokens } from '@/lib/rootTokens';

import { type ThemeArtDirection, themeArtDirection } from './themeArtDirections';

// ─── Token Architecture ─────────────────────────────────────
// Four seed roles per mode generate coordinated surfaces, interaction roles
// and contrast-checked category containers. Typography is owned by fonts.ts.

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
  bg: string; // hex string e.g. '#E4DFDB'
  surface: string; // hex string e.g. '#E3D7CD'
  ink: string; // hex string e.g. '#3F3F3F'
  accent: string; // hex string e.g. '#E45B60'
}

export interface ThemePreset {
  id: string;
  name: string;
  nameEn: string;
  font: 'Inter Display';
  artDirection: ThemeArtDirection;
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

  return [Math.round(h * 360), Math.round(s * 100 * 10) / 10, Math.round(l * 100 * 10) / 10];
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
  return [lr, lg, lb].map((c) => Math.min(1, Math.max(0, linearToSrgb(c)))) as Rgb;
}

function rgbToHsl([r, g, b]: Rgb): Hsl {
  const hex = `#${[r, g, b]
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, c)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
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
  // Saturated middle-tone containers can exhaust the hue-preserving path
  // before it reaches white/black (especially on OLED with strong accents).
  // Readability takes priority: use the higher-contrast neutral endpoint,
  // rather than returning a candidate that never met the requested ratio.
  const darkInk: Hsl = [fg[0], 0, 0];
  const lightInk: Hsl = [fg[0], 0, 100];
  const endpoint = contrastRatio(darkInk, bg) >= contrastRatio(lightInk, bg) ? darkInk : lightInk;
  return contrastRatio(best, bg) >= target ? best : endpoint;
}

/**
 * Raise a plane above (light mode: toward white / dark mode: toward light) its
 * own background by a perceptual amount. This is what makes the elevation
 * ladder read as depth instead of as four almost-identical greys.
 */
function elevate(base: Hsl, isDark: boolean, amount: number): Hsl {
  const current = perceptualL(base);
  const delta = isDark ? amount : amount * 0.62;
  let L = current + delta;
  // A near-white card in light mode has no headroom left toward white, and a
  // near-black canvas in OLED mode has none toward black. When the intended
  // direction is exhausted we step the other way by the same visual amount, so
  // the plane is still distinguishable instead of collapsing into its parent.
  if (L > 0.99 || L < 0.015) L = current - delta;
  return withPerceptualL(base, Math.min(0.995, Math.max(0.008, L)));
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
  const sat = Math.min(96, Math.max(0, accent[1] * spec.sat));
  const lift = isDark ? spec.lift : -spec.lift * 0.6;
  const lightness = Math.min(82, Math.max(18, accent[2] + lift));
  return [accent[0], Math.round(sat * 10) / 10, Math.round(lightness * 10) / 10];
}

/**
 * Guarantee cards read as a distinct plane from the page behind them, measured
 * perceptually: a 3% HSL gap is invisible on a dark canvas and glaring on a
 * pale one, so the gap is expressed in OKLab lightness instead.
 */
function ensureSurfaceSeparation(surface: Hsl, bg: Hsl, minimum: number): Hsl {
  const ls = perceptualL(surface);
  const lb = perceptualL(bg);
  if (Math.abs(ls - lb) >= minimum) return surface;
  // Preserve the palette's own intent: if it wanted a card lighter than the
  // page, the correction stays lighter — it only becomes big enough to see.
  const direction = ls >= lb ? 1 : -1;
  let L = lb + direction * minimum;
  if (L > 0.995 || L < 0.008) L = lb - direction * minimum;
  return withPerceptualL(surface, L);
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
function buildToneLadder(bg: Hsl, surface: Hsl, ink: Hsl, accent: Hsl, isDark: boolean): Hsl[] {
  return [
    isDark && bg[2] === 0 ? bg : elevate(bg, isDark, -0.03), // 25  — recessed plane (wells, tracks)
    bg, // 50  — page
    surface, // 100 — card
    elevate(surface, isDark, 0.035), // 200 — raised plane (popovers, sheets)
    mixHsl(accent, bg, 0.2), // 300 — accent wash
    accent, // 400 — accent
    mixHsl(ink, accent, 0.4), // 500 — accent deep
    ensureContrast(mixHsl(ink, bg, 0.7), bg, 4.5), // 600 — secondary ink (AA)
    ensureContrast(mixHsl(ink, bg, 0.85), bg, 7), // 700 — body ink
    ink, // 800 — ink
    ensureContrast(ink, bg, 12), // 900 — maximum ink
  ];
}

/**
 * Status colours: the hue is semantic and fixed (red = destructive), but the
 * tone is resolved against the live background so it always clears AA, and the
 * label on top is whichever of white/near-black is actually readable.
 */
/** `r,g,b` of an HSL colour, for the shadow rgba() strings. */
function hslToRgbTriplet(hsl: Hsl): string {
  const hex = hslToHex(hsl);
  return [0, 1, 2].map((i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)).join(',');
}

/**
 * The signal accent: one fixed orange hue that means "this is data, this is
 * live, this changed". Tone is corrected per canvas so it holds 4.5:1 as text
 * in light mode and stops glaring in dark mode; `soft` is the surface version
 * (an 8–14% solid mix into the page, never a translucent overlay).
 */
function signalTokens(bg: Hsl, ink: Hsl, isDark: boolean): Record<string, string> {
  const SIGNAL: Hsl = isDark ? [24, 80, 60] : [22, 72, 52];
  const tone = ensureContrast(SIGNAL, bg, 4.5);
  const fg = contrastRatio([0, 0, 100], tone) >= contrastRatio(ink, tone) ? [0, 0, 100] : ink;
  return {
    '--signal': hslToString(tone),
    '--signal-soft': solid(tone, bg, isDark ? 0.14 : 0.1),
    '--signal-foreground': hslToString(fg as Hsl),
  };
}

/**
 * Status colours (success / warning / destructive / error).
 *
 * The app's standard idiom for a status badge is a tinted pill:
 *
 *   <span class="bg-success/10 text-success">…</span>
 *
 * i.e. the TEXT carries the status hue and sits on a wash of that same hue
 * over the page. Verifying the tone against the bare page — which is what this
 * used to do — is not enough: the wash pulls the surface toward the hue, which
 * is exactly the direction that eats contrast. A green that clears 4.5:1 on the
 * page measured 4.31:1 on its own `bg-success/10` wash, so every green badge
 * shipped under AA while its red siblings passed.
 *
 * `resolve` therefore verifies against the WORST wash the idiom can produce
 * (a 20% mix of the tone into the page), which is the surface the label is
 * actually drawn on. `tone` itself is still verified on the page, so a bare
 * `text-success` on a card keeps its guarantee too.
 */
function statusTokens(bg: Hsl, card: Hsl): Record<string, string> {
  const WHITE: Hsl = [0, 0, 100];
  const resolve = (hue: Hsl) => {
    // Three surfaces have to clear AA, and the token generator is only handed
    // the two solid ones — the third, the wash, is produced by the caller's
    // `bg-<status>/N` class:
    //
    //   1. the page  (`text-success` on the page background)
    //   2. a card    (the same label inside any app-card)
    //   3. the wash   (`<span class="bg-success/10 text-success">`)
    //
    // The wash moves the surface TOWARD the tone, so it is the binding
    // constraint: on a light page a darker wash needs a darker green. The fix
    // is always to walk AWAY from the page.
    const goDarker = relativeLuminance(bg) > 0.18;

    // The wash is measured the way the BROWSER composites `bg-X/N`: a straight
    // sRGB mix. `mixHsl` reasons in OKLab, and the two disagree just enough
    // that a tone verified against the OKLab wash measured 4.20 against the
    // sRGB wash the user actually sees. Same alpha, same percentages,
    // different space.
    //
    // Both sides stay in RGB and are compared as RGB luminance. Converting the
    // wash back to HSL and re-deriving hex rounds each channel twice, which is
    // enough to land a hair under a 4.5 target and skip the correction.
    // Direct HSL -> linear-light sRGB, with NO round trip through hex.
    //
    // `hslToRgb` goes via `hslToHex` and `parseInt`, so each channel is
    // rounded to an integer 0-255 and back. That rounding is enough to report
    // a wash at 4.5 when the real value is 4.15 — the correction then stopped
    // early and shipped a tone that measured under AA. The walk must be judged
    // against the unrounded colour, which is also closer to what the browser
    // composites before its own (single) rounding.
    const toLinearRgb = (t: Hsl): Rgb => {
      const H = t[0] / 360;
      const S = t[1] / 100;
      const L = t[2] / 100;
      const hue = (p: number, q: number, x: number) => {
        let t2 = x;
        if (t2 < 0) t2 += 1;
        if (t2 > 1) t2 -= 1;
        if (t2 < 1 / 6) return p + (q - p) * 6 * t2;
        if (t2 < 1 / 2) return q;
        if (t2 < 2 / 3) return p + (q - p) * (2 / 3 - t2) * 6;
        return p;
      };
      let r: number;
      let g: number;
      let b: number;
      if (S === 0) {
        r = L;
        g = L;
        b = L;
      } else {
        const q2 = L < 0.5 ? L * (1 + S) : L + S - L * S;
        const p2 = 2 * L - q2;
        r = hue(p2, q2, H + 1 / 3);
        g = hue(p2, q2, H);
        b = hue(p2, q2, H - 1 / 3);
      }
      return [r, g, b];
    };

    const pageRgb = toLinearRgb(bg);
    const cardRgb = toLinearRgb(card);
    const lumOfRgb = (rgb: Rgb) => {
      const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const rgbRatio = (a: Rgb, b: Rgb) => {
      const la = lumOfRgb(a);
      const lb = lumOfRgb(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    const washOfRgb = (fg: Rgb): Rgb => [0, 1, 2].map((i) => fg[i] * 0.2 + pageRgb[i] * 0.8) as Rgb;
    // The margin absorbs the single rounding the browser applies when it
    // quantises the mix to 8 bits per channel.
    const TARGET = 4.55;
    const clears = (t: Hsl) => {
      const fg = toLinearRgb(t);
      return (
        rgbRatio(fg, pageRgb) >= TARGET &&
        rgbRatio(fg, cardRgb) >= TARGET &&
        rgbRatio(fg, washOfRgb(fg)) >= TARGET
      );
    };

    let tone: Hsl = [hue[0], hue[1], hue[2]];

    if (!clears(tone)) {
      // Walk lightness away from the page until all three surfaces clear AA.
      //
      // The walk is expressed in HSL lightness — the same axis the token is
      // published on and the browser paints it on. `withPerceptualL` (OKLab)
      // looks more principled, but its steps do not map 1:1 onto the sRGB wash
      // measured above: the walk stalled at 38.6% (wash 4.18) when the same
      // hue at 40% measures 4.59.
      //
      // It starts from the raw hue rather than from `ensureContrast`'s output:
      // that call picks its own direction from the reference luminance, and on
      // a near-black page it walked the tone AWAY from the value that clears
      // the wash. The direction here is explicit — away from the page.
      const L0 = tone[2];
      for (let step = 1; step <= 200; step++) {
        const next = goDarker ? L0 - step * 0.5 : L0 + step * 0.5;
        if (next < 0 || next > 100) break;
        const cand: Hsl = [tone[0], tone[1], next];
        if (clears(cand)) {
          tone = cand;
          break;
        }
        // keep the best-so-far in the direction that helps
        if (goDarker ? cand[2] < tone[2] : cand[2] > tone[2]) tone = cand;
        else break;
      }
    }

    // Never trade away the solid-surface guarantees to win the wash.
    tone = ensureContrast(ensureContrast(tone, bg, 4.5), card, 4.5);
    const dark: Hsl = [tone[0], Math.min(90, tone[1] + 10), 12];
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

/**
 * The data palette (sage / peach / amber / blue / rose / violet).
 *
 * These six are the app's only colours allowed to carry meaning inside charts,
 * badges and category dots. They were previously hard-coded in `index.css` as
 * two fixed HSL triples — one for light, one for dark — which meant they never
 * responded to the active palette: switching from `editorial` to `mono` left a
 * rose that belonged to a different theme, and nothing verified contrast.
 *
 * Two constraints pull against each other and both have to hold:
 *
 *   1. The six must stay DISTinguishable from each other. A chart that draws
 *      two series in the same tone is worse than a chart with low-contrast
 *      labels, so the correction may not collapse two entries together.
 *   2. Each must be legible as TEXT. `text-data-3` appears 42 times and
 *      `text-data-1` 99 times across the codebase, always against a page or a
 *      card — never against a wash of itself the way a status badge is.
 *
 * So each tone is walked away from the page until it clears AA on BOTH the page
 * and a card, hue and chroma preserved. Because the walk only ever moves tone,
 * and the six hues are far apart to begin with, the series stay separable.
 */
function dataTokens(
  bg: Hsl,
  card: Hsl,
  isDark: boolean,
  art: ThemeArtDirection,
): Record<string, string> {
  // Hue and saturation are the palette's identity — fixed, and deliberately
  // muted. Only lightness is resolved, and only against the active surfaces.
  const SEEDS: Array<[index: number, h: number, s: number, light: number, dark: number]> = [
    [1, 158, 55, 32, 72],
    [2, 24, 80, 40, 76],
    [3, 12, 76, 40, 76],
    [4, 214, 75, 42, 76],
    [5, 348, 70, 40, 76],
    [6, 268, 50, 42, 80],
  ];

  // Direct HSL → linear-light sRGB with NO hex round trip. The browser
  // composites `bg-data-5/5` in sRGB, and `hslToRgb` goes via `hslToHex` +
  // `parseInt`, rounding every channel to 8 bits and back — enough to certify
  // a wash at 4.5 that really measures 4.15, which is how the memory game's
  // rose XP bar shipped unreadable. Judge the wash unrounded, then keep a
  // small margin for the browser's own single quantisation.
  const toLinearRgb = (t: Hsl): Rgb => {
    const H = t[0] / 360;
    const S = t[1] / 100;
    const L = t[2] / 100;
    const hue = (p: number, q: number, x: number) => {
      let t2 = x;
      if (t2 < 0) t2 += 1;
      if (t2 > 1) t2 -= 1;
      if (t2 < 1 / 6) return p + (q - p) * 6 * t2;
      if (t2 < 1 / 2) return q;
      if (t2 < 2 / 3) return p + (q - p) * (2 / 3 - t2) * 6;
      return p;
    };
    let r: number;
    let g: number;
    let b: number;
    if (S === 0) {
      r = L;
      g = L;
      b = L;
    } else {
      const q2 = L < 0.5 ? L * (1 + S) : L + S - L * S;
      const p2 = 2 * L - q2;
      r = hue(p2, q2, H + 1 / 3);
      g = hue(p2, q2, H);
      b = hue(p2, q2, H - 1 / 3);
    }
    return [r, g, b];
  };

  const pageRgb = toLinearRgb(bg);
  const cardRgb = toLinearRgb(card);
  const lumOfRgb = (rgb: Rgb) => {
    const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const rgbRatio = (a: Rgb, b: Rgb) => {
    const la = lumOfRgb(a);
    const lb = lumOfRgb(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  // The weakest wash any caller produces is `bg-data-5/5` — a 5% mix of the
  // tone into the page. That is the surface a memory-game card, a chart chip
  // or a category tile is actually drawn on.
  const washOf = (fg: Rgb): Rgb => [0, 1, 2].map((i) => fg[i] * 0.05 + pageRgb[i] * 0.95) as Rgb;
  const TARGET = 4.55;

  const out: Record<string, string> = {};
  for (const [i, h, s, light, darkLight] of SEEDS) {
    const seed: Hsl = [
      art.dataHues[i - 1] ?? h,
      Math.min(s, art.dataChroma),
      art.dataChroma === 0 ? (isDark ? 94 - i * 3 : 9 + i * 3) : isDark ? darkLight : light,
    ];
    const goDarker = relativeLuminance(bg) > 0.18;

    const clears = (t: Hsl) => {
      const fg = toLinearRgb(t);
      return (
        rgbRatio(fg, pageRgb) >= TARGET &&
        rgbRatio(fg, cardRgb) >= TARGET &&
        rgbRatio(fg, washOf(fg)) >= TARGET
      );
    };

    let tone: Hsl = [seed[0], seed[1], seed[2]];
    if (!clears(tone)) {
      // Walk HSL lightness away from the page in half-point steps. The axis is
      // HSL rather than OKLab because that is the axis the token is published
      // on, so a step here is a step the user actually sees.
      for (let step = 1; step <= 200; step += 1) {
        const next = goDarker ? tone[2] - 0.5 : tone[2] + 0.5;
        if (next < 0 || next > 100) break;
        const cand: Hsl = [tone[0], tone[1], next];
        if (clears(cand)) {
          tone = cand;
          break;
        }
        if (goDarker ? cand[2] < tone[2] : cand[2] > tone[2]) tone = cand;
        else break;
      }
    }
    // Never trade away the solid-surface guarantees to win the wash.
    out[`--data-${i}`] = hslToString(ensureContrast(ensureContrast(tone, bg, 4.5), card, 4.5));
  }
  return out;
}

// Convert Hsl array to hex string
function hslToHex([h, s, l]: Hsl): string {
  const sFrac = s / 100;
  const lFrac = l / 100;
  const c = (1 - Math.abs(2 * lFrac - 1)) * sFrac;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lFrac - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const rHex = Math.round((r + m) * 255)
    .toString(16)
    .padStart(2, '0');
  const gHex = Math.round((g + m) * 255)
    .toString(16)
    .padStart(2, '0');
  const bHex = Math.round((b + m) * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

function definePreset(
  id: string,
  name: string,
  nameEn: string,
  light: ThemeColorSet,
  dark: ThemeColorSet,
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
    artDirection: themeArtDirection(id),
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
// Twelve curated families, one per visual territory. Anything retired maps
// through LEGACY_THEME_ALIASES so a saved preference never breaks.
export const themePresets: ThemePreset[] = [
  definePreset(
    'expressive',
    'نبض',
    'Expressive Pulse',
    { bg: '#E0ECE9', surface: '#F6FBF8', ink: '#20272A', accent: '#146B65' },
    { bg: '#111416', surface: '#252B2D', ink: '#F1F5F4', accent: '#86D9CC' },
  ),
  // The shipped system. Neutral foundation, graphite controls, one orange
  // signal reserved for data and change — see `--signal` in index.css.
  // Light is a warm off-white page with a near-white card; dark is warm
  // graphite with an off-white ink, recalculated rather than inverted.
  definePreset(
    'editorial',
    'تحريري',
    'Editorial',
    { bg: '#E5E3DF', surface: '#FAF9F6', ink: '#232220', accent: '#2D2D2D' },
    { bg: '#121110', surface: '#1C1B1A', ink: '#F2EFEA', accent: '#EDE9E3' },
  ),
  definePreset(
    'copper',
    'نُحاس معماري',
    'Architectural Copper',
    { bg: '#DEDCD6', surface: '#F5F2EB', ink: '#17171A', accent: '#9A6B37' },
    { bg: '#0D0D0F', surface: '#1A1A1E', ink: '#EDEBE7', accent: '#C9A06A' },
  ),
  definePreset(
    'paper',
    'ورق وحبر',
    'Paper & Ink',
    { bg: '#DFD5C4', surface: '#F7F0E2', ink: '#272725', accent: '#874B3E' },
    { bg: '#151411', surface: '#302B23', ink: '#F1EDE3', accent: '#D5A08D' },
  ),
  definePreset(
    'mono',
    'مونوكروم',
    'Mono',
    { bg: '#E5E5E5', surface: '#FAFAFA', ink: '#1A1A1A', accent: '#1A1A1A' },
    { bg: '#121212', surface: '#1E1E1E', ink: '#F5F5F5', accent: '#FFFFFF' },
  ),
  definePreset(
    'obsidian',
    'سبج',
    'Obsidian',
    { bg: '#E5E7E8', surface: '#F8F9F9', ink: '#202426', accent: '#535F69' },
    { bg: '#0D1012', surface: '#24292D', ink: '#EEF1F2', accent: '#B8CBCF' },
  ),
  definePreset(
    'clay',
    'طين',
    'Clay',
    { bg: '#F3E4D9', surface: '#DFC3AF', ink: '#33251D', accent: '#A9603F' },
    { bg: '#130E0B', surface: '#211814', ink: '#F1E7DE', accent: '#CE8A62' },
  ),
  definePreset(
    'gold',
    'ذهب',
    'Gold',
    { bg: '#F5EDDA', surface: '#E5D3A9', ink: '#2C2415', accent: '#96731C' },
    { bg: '#12100A', surface: '#211C10', ink: '#F7F0DC', accent: '#D9B441' },
  ),
  definePreset(
    'moss',
    'طحلب',
    'Moss',
    { bg: '#E8EFE2', surface: '#C8D9BF', ink: '#1F2A22', accent: '#4A6B52' },
    { bg: '#0D160F', surface: '#223529', ink: '#E6EDE6', accent: '#7FA98A' },
  ),
  definePreset(
    'ocean',
    'محيط',
    'Ocean',
    { bg: '#CFE3E4', surface: '#EDF8F7', ink: '#1C3438', accent: '#146A73' },
    { bg: '#0D191C', surface: '#203338', ink: '#E8F1F2', accent: '#8FCBCD' },
  ),
  definePreset(
    'arctic',
    'قطبي',
    'Arctic',
    { bg: '#EDF5FA', surface: '#C5DEEB', ink: '#152430', accent: '#1F6C99' },
    { bg: '#0A141B', surface: '#203746', ink: '#E9F2F9', accent: '#63B3E0' },
  ),
  definePreset(
    'midnight',
    'منتصف الليل',
    'Midnight',
    { bg: '#E8ECF5', surface: '#C4CFE5', ink: '#121E31', accent: '#2A52BE' },
    { bg: '#080E1A', surface: '#162235', ink: '#E6E9F0', accent: '#5381E6' },
  ),
  definePreset(
    'nebula',
    'سديم',
    'Nebula',
    { bg: '#EEEAF7', surface: '#D2C6E9', ink: '#1E1733', accent: '#5B3FD1' },
    { bg: '#120D1C', surface: '#30243E', ink: '#EDE9F8', accent: '#9E86F5' },
  ),
  definePreset(
    'rose',
    'روز جولد',
    'Rose Gold',
    { bg: '#F7ECEE', surface: '#E8C7CE', ink: '#4A2A2E', accent: '#C87D88' },
    { bg: '#1A0E10', surface: '#2E181C', ink: '#F9F1F2', accent: '#E2A9B1' },
  ),
];

/**
 * Retired presets fold into the family that carried them best, so a stored
 * `colorTheme` from an older build still resolves to a real palette.
 */
export const LEGACY_THEME_ALIASES: Readonly<Record<string, string>> = {
  default: 'expressive',
  neutral: 'expressive',
  silk: 'paper',
  coffee: 'clay',
  sunset: 'clay',
  terracotta: 'clay',
  volcano: 'clay',
  sandstone: 'gold',
  amber: 'gold',
  emerald: 'moss',
  matcha: 'moss',
  mint: 'ocean',
  aurora: 'ocean',
  fog: 'arctic',
  storm: 'arctic',
  neon: 'midnight',
  lavender: 'nebula',
  dusk: 'nebula',
  cherry: 'rose',
  sakura: 'rose',
};

/** Resolves any stored theme id — current, retired, or unknown — to a live one. */
export function resolveThemeId(id?: string | null): string {
  if (!id) return themePresets[0].id;
  if (id === 'dynamic') return id;
  if (themePresets.some((preset) => preset.id === id)) return id;
  return LEGACY_THEME_ALIASES[id] ?? themePresets[0].id;
}

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
  const rN = r / 255,
    gN = g / 255,
    bN = b / 255;
  const max = Math.max(rN, gN, bN),
    min = Math.min(rN, gN, bN);
  let h = 0,
    s = 0;
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
    { bg: darkBgHex, surface: darkSurfHex, ink: darkInkHex, accent: darkAccHex },
  );
}

// ─── Token Generation ───────────────────────────────────────
export function generateThemeTokens(
  preset: ThemePreset,
  style: ThemeStyle,
  isDark: boolean,
  isBlack: boolean,
  lift: SurfaceLift = 'subtle',
): Record<string, string> {
  const art = themeArtDirection(preset.id);
  const presence = { neutral: 0.14, tonal: 0.24, vibrant: 0.34, expressive: 0.44 }[style] ?? 0.24;
  const modeColors = isDark ? preset.dark : preset.light;
  const rawBg = hexToHsl(modeColors.bg);
  const rawSurface = hexToHsl(modeColors.surface);

  // OLED black mode keeps the palette's hue instead of collapsing to a
  // neutral #080808 whose card colour no longer belongs to the theme.
  const bgHsl: Hsl = isDark && isBlack ? [rawBg[0], 0, 0] : rawBg;
  const surfaceBase: Hsl =
    isDark && isBlack
      ? withPerceptualL(rawSurface, Math.max(0.24, perceptualL(rawSurface) - 0.025))
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
    art.surfaceGap[isDark ? 1 : 0],
  );

  // Ink must clear WCAG AA against both the page and the cards on it.
  const inkHsl = ensureContrast(ensureContrast(hexToHsl(modeColors.ink), bgHsl, 7), surfHsl, 5.5);
  // Primary also labels small text, so it must clear body-text AA on both
  // the page and cards, not merely the icon/large-text threshold.
  const accHsl = ensureContrast(
    ensureContrast(applyAccentStrength(hexToHsl(modeColors.accent), style, isDark), bgHsl, 4.55),
    surfHsl,
    4.55,
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
  // Editorial system: separation is carried by tone and shadow, so the hairline
  // sits only just above `--track` (0.09 / 0.13). It is still a real line — a
  // fully borderless card loses its edge on a busy photo — but it no longer
  // draws the eye before the content does. Inputs stay a step stronger because
  // a field must announce that it is editable.
  const lineBase = art.edge + (isDark ? 0.04 : 0);
  const borderStr = solid(inkHsl, bgHsl, lineBase); // hairline
  // Secondary navigation is a cooler companion, not a weaker copy of primary.
  // Other saved families retain their established accent relationship.
  const companion = hexToHsl(art.companion[isDark ? 1 : 0]);
  const secondarySurface = mixHsl(companion, surfHsl, art.companionPresence[isDark ? 1 : 0]);
  const secondaryStr = hslToString(secondarySurface);
  const secondaryFgStr = hslToString(ensureContrast(inkHsl, secondarySurface, 4.55));
  const mutedStr = solid(inkHsl, bgHsl, isDark ? 0.11 : 0.08);
  // Secondary text: mixed, then contrast-verified to AA (4.5:1) on the page.
  const mutedFgStr = hslToString(
    ensureContrast(ensureContrast(mixHsl(inkHsl, bgHsl, 0.74), bgHsl, 4.55), surfHsl, 4.55),
  );
  // De-emphasised text that is SAFE TO USE.
  //
  // The app reached for `text-muted-foreground/70` to mean "less important"
  // in ~160 places. That modifier is direction-dependent and therefore unsafe:
  // on a light page it drags 11-13px text to 3.47:1, and on a dark page the
  // same class sits comfortably at 4.71:1. Same class, opposite failure.
  //
  // This token replaces the modifier. It is contrast-verified against BOTH the
  // page and the card surface (secondary text is drawn on each), so a caller
  // can use it on any of the two without re-checking.
  const mutedSubtle = ensureContrast(
    ensureContrast(mixHsl(inkHsl, bgHsl, isDark ? 0.62 : 0.6), bgHsl, 4.5),
    surfHsl,
    4.5,
  );
  const mutedSubtleStr = hslToString(mutedSubtle);
  const disabledStr = solid(inkHsl, bgHsl, 0.46); // disabled state

  const accentHighlightStr = solid(accHsl, bgHsl, 0.14); // subtle accent wash

  // Interaction roles are published centrally so hover/pressed/selected states
  // carry the same visual weight across every feature instead of each screen
  // inventing an arbitrary opacity. The ordering is intentionally monotonic.
  const interactiveHover = mixHsl(inkHsl, bgHsl, isDark ? 0.11 : 0.075);
  const interactivePressed = mixHsl(inkHsl, bgHsl, isDark ? 0.2 : 0.14);
  const interactiveSelected = mixHsl(accHsl, bgHsl, 0.18 + presence * 0.5 + (isDark ? 0.08 : 0));

  // Navigation is slightly more grounded than the page; overlays use the
  // highest elevation plane. Both receive their own contrast-corrected ink.
  const navigation = secondarySurface;
  const navigationInk = ensureContrast(inkHsl, navigation, 4.5);

  // Text on the accent is whichever of ink/bg is actually readable on it —
  // pale accents in dark mode used to place a near-black label on gold.
  const primaryFgStr = hslToString(
    ensureContrast(
      contrastRatio(bgHsl, accHsl) >= contrastRatio(inkHsl, accHsl) ? bgHsl : inkHsl,
      accHsl,
      4.5,
    ),
  );
  const container = mixHsl(accHsl, surfHsl, presence + (isDark ? 0.06 : 0));
  const containerInk = ensureContrast(inkHsl, container, 4.55);
  const tertiary = hexToHsl(art.tertiary[isDark ? 1 : 0]);
  const tertiaryColor = ensureContrast(ensureContrast(tertiary, bgHsl, 4.5), surfHsl, 4.5);
  const tertiaryContainer = mixHsl(
    tertiaryColor,
    surfHsl,
    art.containerPresence + (isDark ? 0.1 : 0.04),
  );

  // Category identity has two weights: a quiet content surface and a richer
  // icon container. Solid mixes avoid unpredictable alpha over nested surfaces.
  const categories = dataTokens(bgHsl, surfHsl, isDark, art);
  const categoryContainers: Record<string, string> = {};
  for (let index = 1; index <= 6; index += 1) {
    const [h, s, l] = categories[`--data-${index}`].split(' ').map(parseFloat);
    const tone: Hsl = [h, s, l];
    const categorySurface = mixHsl(tone, surfHsl, art.categoryPresence * (0.12 + presence * 0.3));
    const categoryContainer = mixHsl(
      tone,
      surfHsl,
      art.containerPresence + art.categoryPresence * presence + (isDark ? 0.06 : 0),
    );
    categoryContainers[`--data-${index}-surface`] = hslToString(categorySurface);
    categoryContainers[`--on-data-${index}-surface`] = hslToString(
      ensureContrast(inkHsl, categorySurface, 7),
    );
    categoryContainers[`--data-${index}-container`] = hslToString(categoryContainer);
    categoryContainers[`--on-data-${index}-container`] = hslToString(
      ensureContrast(tone, categoryContainer, 4.55),
    );
  }

  // ── Elevation ladder ───────────────────────────────────────
  // Four planes, each one a perceptual step above the last, plus the shadow
  // that belongs to it. Depth is expressed twice — as tone AND as shadow —
  // because a dark theme reads elevation from tone and a light theme reads it
  // from the shadow.
  const surface2 = elevate(surfHsl, isDark, art.elevation);
  const surface3 = elevate(surfHsl, isDark, art.elevation * 2);
  const overlayInk = ensureContrast(inkHsl, surface3, 4.5);

  const shadowRgb = isDark ? '0,0,0' : hslToRgbTriplet([inkHsl[0], Math.min(inkHsl[1], 22), 18]);
  const contact = isDark ? [0.3, 0.32, 0.34, 0.38] : [0.07, 0.09, 0.1, 0.12];
  const ambient = isDark ? [0.22, 0.32, 0.42, 0.5] : [0.05, 0.08, 0.1, 0.14];

  // Rim light. A black shadow on a near-black card is invisible, so in dark
  // mode the shadow token carries a hairline of the theme's own ink at its top
  // edge. That highlight — not the shadow — is what makes a surface read as
  // raised once the page and the card sit four lightness points apart. Light
  // modes already read depth from the shadow and must not get a rim, or every
  // card looks outlined rather than lit.
  const rimRgb = hslToRgbTriplet([inkHsl[0], Math.min(inkHsl[1], 26), 96]);
  // One value per plane: the higher the surface sits, the more light its top
  // edge catches. e1 is a card resting on the page, e4 a modal over a scrim.
  const rimAlpha = [0.05, 0.07, 0.09, 0.11];
  const rim = (i: number) =>
    isDark ? `inset 0 1px 0 rgba(${rimRgb},${rimAlpha[i] * art.rim})` : 'none';

  const plane = (i: number, blurContact: string, blurAmbient: string) =>
    `${isDark ? `${rim(i)}, ` : ''}${blurContact} rgba(${shadowRgb},${contact[i] * art.shadow}), ${blurAmbient} rgba(${shadowRgb},${ambient[i] * art.shadow})`;
  const shadow1 = plane(0, '0 1px 1.5px', '0 1px 4px');
  const shadow2 = plane(1, '0 1px 2px', '0 4px 12px');
  const shadow3 = plane(2, '0 2px 4px', '0 12px 28px');
  const shadow4 = plane(3, '0 4px 8px', '0 28px 56px');
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
    '--art-corner': String(art.corner),
    '--art-icon-corner': String(art.iconCorner),
    '--art-edge': String(art.edge),
    '--selected-indicator': accStr,
    '--sun': hslToString(
      preset.id === 'mono' ? accHsl : ensureContrast([42, 72, isDark ? 72 : 38], surfHsl, 3.05),
    ),
    '--moon': hslToString(
      preset.id === 'mono' ? companion : ensureContrast([240, 32, isDark ? 80 : 45], surfHsl, 3.05),
    ),
    '--information': hslToString(
      ensureContrast(ensureContrast(companion, bgHsl, 4.55), surfHsl, 4.55),
    ),
    '--background': bgStr,
    '--foreground': inkStr,
    '--card': surfStr,
    '--card-foreground': inkStr,
    '--popover': hslToString(surface3),
    '--popover-foreground': hslToString(overlayInk),
    '--secondary': secondaryStr,
    '--secondary-foreground': secondaryFgStr,
    '--muted': mutedStr,
    '--muted-foreground': mutedFgStr,
    // Drop-in replacement for the old `text-muted-foreground/70` idiom: same
    // visual intent ("de-emphasised"), but contrast-correct in both modes.
    '--muted-foreground-subtle': mutedSubtleStr,
    // shadcn contract: `accent` is a subtle interactive surface and
    // `accent-foreground` is the TEXT drawn on it — so it must be ink, not the
    // brand colour (copper-on-grey used to fail AA in hovered menu rows).
    '--accent': hslToString(container),
    '--accent-foreground': hslToString(containerInk),
    // Kept for call sites that genuinely want the brand tone on that surface.
    '--accent-brand': accStr,
    '--primary': accStr,
    '--primary-foreground': primaryFgStr,
    '--primary-container': hslToString(container),
    '--on-primary-container': hslToString(containerInk),
    '--tertiary': hslToString(tertiaryColor),
    '--tertiary-container': hslToString(tertiaryContainer),
    '--on-tertiary-container': hslToString(ensureContrast(inkHsl, tertiaryContainer, 4.5)),
    '--disabled': disabledStr,
    // Coherent state ladder consumed app-wide by controls, rows and selections.
    '--interactive-hover': hslToString(interactiveHover),
    '--interactive-pressed': hslToString(interactivePressed),
    '--interactive-selected': hslToString(interactiveSelected),
    '--interactive-selected-foreground': hslToString(
      ensureContrast(inkHsl, interactiveSelected, 4.5),
    ),
    '--focus-ring': accStr,
    // Status colours keep their fixed semantic hue but their TONE is resolved
    // against the active background, so they never sink into a very light or
    // very dark palette.
    ...statusTokens(bgHsl, surfHsl),
    // The data palette is resolved against the same two surfaces, so a chart
    // label or a category dot stays readable in every preset instead of only
    // in the one whose CSS happened to be checked in.
    ...categories,
    ...categoryContainers,
    // The single chromatic accent. Its hue is fixed so "changed / active /
    // measured" reads identically in every palette; only its tone is resolved
    // against the active canvas so it never glares or sinks.
    ...(preset.id === 'mono'
      ? {
          '--signal': accStr,
          '--signal-soft': hslToString(container),
          '--signal-foreground': primaryFgStr,
        }
      : signalTokens(bgHsl, inkHsl, isDark)),
    // The lowest-contrast surface: dividers, rails, chart grids.
    '--track': solid(inkHsl, bgHsl, isDark ? 0.13 : 0.09),
    // Lines
    '--border': borderStr,
    '--input': hslToString(ensureContrast(mixHsl(inkHsl, surfHsl, 0.38), surfHsl, 3.05)),
    '--ring': accStr,
    // Sidebar mirrors
    '--sidebar-background': bgStr,
    '--sidebar-foreground': inkStr,
    '--sidebar-primary': accStr,
    '--sidebar-primary-foreground': primaryFgStr,
    '--sidebar-accent': secondaryStr,
    '--sidebar-accent-foreground': secondaryFgStr,
    '--sidebar-border': borderStr,
    '--sidebar-ring': accStr,
    // Live active states
    '--live': accStr,
    '--live-soft': solid(accHsl, bgHsl, 0.16),
    '--live-glow': accStr,
    // Extra elements
    '--card-shadow': cardShadow,
    '--shadow-color': hslToString([inkHsl[0], Math.min(inkHsl[1], 22), 18]),
    '--shadow-control': shadow1,
    '--shadow-control-pressed': `inset 0 1px 2px rgba(${shadowRgb},${0.1 * art.shadow})`,
    '--accent-highlight': accentHighlightStr,
    // Planes: 0 is the page, 1 the card, 2 popovers/sheets, 3 anything that
    // floats above them (dialogs, menus, the command palette).
    '--surface-0': bgStr,
    '--surface-1': surfStr,
    '--surface-2': hslToString(surface2),
    '--surface-3': hslToString(surface3),
    // Dedicated structural surfaces keep navigation and modal layers coherent
    // even when individual features use translucent backgrounds.
    '--navigation': hslToString(navigation),
    '--navigation-foreground': hslToString(navigationInk),
    '--overlay-surface': hslToString(surface3),
    '--overlay-foreground': hslToString(overlayInk),
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
  const tokens = generateThemeTokens(preset, style, isDark, false);
  return SCALE_STEPS.map((step) => {
    const [h, s, l] = tokens[`--theme-${step}`].split(' ').map(parseFloat);
    return [h, s, l] as Hsl;
  });
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
