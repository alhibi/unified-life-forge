import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  generateThemeTokens,
  getThemeScale,
  hexToHsl,
  themePresets,
  type Hsl,
  type ThemeStyle,
} from '@/utils/themeEngine';

const STYLES: ThemeStyle[] = ['neutral', 'tonal', 'vibrant', 'expressive'];

function parse(token: string): Hsl {
  const [h, s, l] = token.split(' ');
  return [parseFloat(h), parseFloat(s), parseFloat(l)];
}

describe('theme token integrity', () => {
  for (const preset of themePresets) {
    for (const isDark of [false, true]) {
      for (const isBlack of isDark ? [false, true] : [false]) {
        const label = `${preset.id} ${isDark ? (isBlack ? 'black' : 'dark') : 'light'}`;

        it(`${label}: text tokens clear WCAG AA`, () => {
          const t = generateThemeTokens(preset, 'neutral', isDark, isBlack);
          const bg = parse(t['--background']);
          const card = parse(t['--card']);

          expect(contrastRatio(parse(t['--foreground']), bg)).toBeGreaterThanOrEqual(6.9);
          expect(contrastRatio(parse(t['--card-foreground']), card)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(parse(t['--muted-foreground']), bg)).toBeGreaterThanOrEqual(4.45);
          expect(contrastRatio(parse(t['--primary']), bg)).toBeGreaterThanOrEqual(3.15);
          expect(
            contrastRatio(parse(t['--primary-foreground']), parse(t['--primary'])),
          ).toBeGreaterThanOrEqual(2.5);
          expect(
            contrastRatio(parse(t['--accent-foreground']), parse(t['--accent'])),
          ).toBeGreaterThanOrEqual(4.4);
        });

        it(`${label}: status colours stay legible`, () => {
          const t = generateThemeTokens(preset, 'neutral', isDark, isBlack);
          const bg = parse(t['--background']);
          for (const role of ['destructive', 'success', 'warning', 'error'] as const) {
            expect(contrastRatio(parse(t[`--${role}`]), bg)).toBeGreaterThanOrEqual(4.4);
            expect(
              contrastRatio(parse(t[`--${role}-foreground`]), parse(t[`--${role}`])),
            ).toBeGreaterThanOrEqual(3);
          }
        });

        it(`${label}: cards read as a separate plane`, () => {
          const t = generateThemeTokens(preset, 'neutral', isDark, isBlack);
          const bg = parse(t['--background']);
          const card = parse(t['--card']);
          expect(Math.abs(card[2] - bg[2])).toBeGreaterThanOrEqual(2.5);
        });

        it(`${label}: published ladder follows the active mode, not light mode`, () => {
          const t = generateThemeTokens(preset, 'neutral', isDark, isBlack);
          expect(t['--theme-50']).toBe(t['--background']);
          expect(t['--theme-100']).toBe(t['--card']);
          expect(t['--theme-400']).toBe(t['--primary']);
        });
      }
    }

    it(`${preset.id}: swatch preview matches the runtime ladder`, () => {
      for (const style of STYLES) {
        for (const isDark of [false, true]) {
          const t = generateThemeTokens(preset, style, isDark, false);
          const scale = getThemeScale(preset, style, isDark);
          expect(scale[4]).toEqual(parse(t['--primary']));
          expect(scale[0]).toEqual(parse(t['--background']));
        }
      }
    });
  }

  it('the scrim carries the palette hue instead of a fixed grey', () => {
    const copper = themePresets[0];
    const dark = generateThemeTokens(copper, 'neutral', true, false);
    const bgHue = hexToHsl(copper.dark.bg)[0];
    expect(parse(dark['--scrim'])[0]).toBe(bgHue);
  });
});