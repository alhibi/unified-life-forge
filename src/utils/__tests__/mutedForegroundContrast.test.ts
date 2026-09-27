import { describe, expect, it } from 'vitest';

import { contrastRatio, generateThemeTokens, themePresets } from '@/utils/themeEngine';
import { hexToHsl } from '@/utils/themeEngine';

/** HSL triple (as published in a token) -> hex, using the engine's own space. */
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

const MODES = [false, true] as const; // isDark

describe('--muted-foreground-subtle clears AA everywhere', () => {
  for (const preset of themePresets) {
    for (const isDark of MODES) {
      for (const lift of ['flat', 'subtle', 'lifted'] as const) {
        it(`${preset.id}/${isDark ? 'dark' : 'light'}/${lift}`, () => {
          const t = generateThemeTokens(preset, 'tonal', isDark, isBlack(isDark), lift);
          const subtle = hexToHsl(toHex(t['--muted-foreground-subtle']));
          const bg = hexToHsl(toHex(t['--background']));
          const card = hexToHsl(toHex(t['--card']));

          // The whole point of the token: safe on the page AND on a card,
          // because secondary text is drawn on both.
          expect(contrastRatio(subtle, bg)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(subtle, card)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }
});

describe('--muted-foreground clears AA on the page (pre-existing guarantee)', () => {
  for (const preset of themePresets) {
    for (const isDark of MODES) {
      it(`${preset.id}/${isDark ? 'dark' : 'light'}`, () => {
        const t = generateThemeTokens(preset, 'tonal', isDark, isBlack(isDark), 'subtle');
        const fg = hexToHsl(toHex(t['--muted-foreground']));
        expect(contrastRatio(fg, hexToHsl(toHex(t['--background'])))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

function isBlack(isDark: boolean): boolean {
  return isDark;
}
