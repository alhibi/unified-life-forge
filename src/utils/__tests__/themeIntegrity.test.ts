import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  generateThemeTokens,
  getThemeScale,
  hexToHsl,
  type Hsl,
  themePresets,
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

        it(`${label}: elevation planes are visibly distinct`, () => {
          const t = generateThemeTokens(preset, 'neutral', isDark, isBlack);
          const planes = [
            parse(t['--surface-0']),
            parse(t['--surface-1']),
            parse(t['--surface-2']),
            parse(t['--surface-3']),
          ];
          expect(planes[0]).toEqual(parse(t['--background']));
          expect(planes[1]).toEqual(parse(t['--card']));
          for (let i = 1; i < planes.length; i += 1) {
            expect(Math.abs(planes[i][2] - planes[i - 1][2])).toBeGreaterThanOrEqual(1.4);
          }
          // Ink stays readable on the highest plane too.
          expect(contrastRatio(parse(t['--foreground']), planes[3])).toBeGreaterThanOrEqual(4.5);
        });

        it(`${label}: every plane carries its own shadow`, () => {
          const t = generateThemeTokens(preset, 'neutral', isDark, isBlack);
          const shadows = [t['--shadow-1'], t['--shadow-2'], t['--shadow-3'], t['--shadow-4']];
          expect(new Set(shadows).size).toBe(4);
          expect(t['--card-shadow']).toBe(t['--shadow-1']);
        });

        it(`${label}: interactive states form a coherent perceptual ladder`, () => {
          const t = generateThemeTokens(preset, 'neutral', isDark, isBlack);
          const bg = parse(t['--background']);
          const hover = parse(t['--interactive-hover']);
          const pressed = parse(t['--interactive-pressed']);
          const selected = parse(t['--interactive-selected']);

          expect(contrastRatio(hover, bg)).toBeGreaterThan(1.01);
          expect(contrastRatio(pressed, bg)).toBeGreaterThan(contrastRatio(hover, bg));
          expect(contrastRatio(selected, bg)).toBeGreaterThan(contrastRatio(hover, bg));
          expect(contrastRatio(parse(t['--focus-ring']), bg)).toBeGreaterThanOrEqual(3.15);
        });

        it(`${label}: overlay and navigation surfaces retain readable text`, () => {
          const t = generateThemeTokens(preset, 'neutral', isDark, isBlack);
          const nav = parse(t['--navigation']);
          const overlay = parse(t['--overlay-surface']);
          expect(contrastRatio(parse(t['--navigation-foreground']), nav)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(parse(t['--overlay-foreground']), overlay)).toBeGreaterThanOrEqual(4.5);
        });

        it(`${label}: the ink zone climbs in contrast`, () => {
          const t = generateThemeTokens(preset, 'neutral', isDark, isBlack);
          const bg = parse(t['--background']);
          const inkZone = [600, 700, 800, 900].map((step) =>
            contrastRatio(parse(t[`--theme-${step}`]), bg),
          );
          for (let i = 1; i < inkZone.length; i += 1) {
            expect(inkZone[i]).toBeGreaterThanOrEqual(inkZone[i - 1] - 0.01);
          }
          expect(inkZone[0]).toBeGreaterThanOrEqual(4.4);
        });
      }
    }

    it(`${preset.id}: swatch preview matches the runtime ladder`, () => {
      for (const style of STYLES) {
        for (const isDark of [false, true]) {
          const t = generateThemeTokens(preset, style, isDark, false);
          const scale = getThemeScale(preset, style, isDark);
          expect(scale).toHaveLength(11);
          expect(scale[5]).toEqual(parse(t['--primary']));
          expect(scale[1]).toEqual(parse(t['--background']));
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