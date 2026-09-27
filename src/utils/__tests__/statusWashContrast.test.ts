import { describe, expect, it } from 'vitest';

import { contrastRatio, generateThemeTokens, themePresets } from '@/utils/themeEngine';

/** HSL triple as published in a token -> hex. */
function toHex(triple: string): string {
  const [h, s, l] = triple.split(/[\s%]+/).map(Number);
  const H = h / 360;
  const S = s / 100;
  const L = l / 100;
  const hue = (p: number, q: number, t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
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
    const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
    const p = 2 * L - q;
    r = hue(p, q, H + 1 / 3);
    g = hue(p, q, H);
    b = hue(p, q, H - 1 / 3);
  }
  const hex = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** sRGB mix, matching how the browser composites `bg-X/N`. */
function over(fg: string, alpha: number, bg: string): string {
  const f = [1, 3, 5].map((i) => parseInt(fg.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
  const mixed = f.map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

const STATUS = ['success', 'warning', 'destructive'] as const;
/** Every wash strength the codebase actually uses for status pills. */
const WASHES = [0.08, 0.1, 0.12, 0.15, 0.2];

/**
 * Regression guard for the tinted-badge contrast defect.
 *
 * The app draws status labels as `<span class="bg-success/10 text-success">`.
 * The engine used to verify the status tone against the bare page only, so a
 * green that measured 4.31:1 on its own wash shipped under AA — in 81 call
 * sites across 55 files — while the red and amber siblings passed. The wash
 * moves the surface TOWARD the hue, which is the direction that eats contrast.
 */
describe('status colours survive their own tinted wash', () => {
  for (const preset of themePresets) {
    for (const isDark of [false, true]) {
      it(`${preset.id}/${isDark ? 'dark' : 'light'}`, () => {
        const t = generateThemeTokens(preset, 'tonal', isDark, isDark, 'subtle');
        const page = toHex(t['--background']);

        for (const name of STATUS) {
          const tone = toHex(t[`--${name}`]);

          // still fine on the bare page
          expect(contrastRatio(hsl(tone), hsl(page))).toBeGreaterThanOrEqual(4.5);

          // and on a card
          const card = toHex(t['--card']);
          expect(contrastRatio(hsl(tone), hsl(card))).toBeGreaterThanOrEqual(4.5);

          // and on every wash strength used in the codebase
          for (const w of WASHES) {
            const washed = over(tone, w, page);
            expect({
              status: name,
              wash: w,
              ratio: contrastRatio(hsl(tone), hsl(washed)),
            }).toEqual({ status: name, wash: w, ratio: expect.any(Number) });
            expect(contrastRatio(hsl(tone), hsl(washed))).toBeGreaterThanOrEqual(4.5);
          }
        }
      });
    }
  }
});

/** The engine speaks HSL triples; contrastRatio speaks HSL. */
function hsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}
