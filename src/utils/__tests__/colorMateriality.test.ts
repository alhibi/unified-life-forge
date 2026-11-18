import { describe, expect, it } from 'vitest';

import { contrastRatio, generateThemeTokens, type Hsl, themePresets } from '../themeEngine';

const parse = (token: string): Hsl => {
  const [h, s, l] = token.split(' ').map(parseFloat);
  return [h, s, l];
};

describe('solid material roles across the complete catalogue', () => {
  it('keeps distinct widget families inside the calm material band', () => {
    const preset = themePresets.find((theme) => theme.id === 'expressive');
    expect(preset).toBeDefined();
    if (!preset) throw new Error('Missing expressive theme');
    // November 2026 material decision: widget bodies are tonal planes, not
    // luminous pastel slabs. Families still carry four distinct hues, but the
    // chroma is capped and the plane sits deep on dark canvases / high on light
    // ones, so colour identifies an app without competing for attention.
    for (const dark of [false, true]) {
      const t = generateThemeTokens(preset, 'tonal', dark, false);
      const surfaces = [1, 4, 5, 6].map((i) => parse(t[`--data-${i}-surface`]));
      expect(new Set(surfaces.map(([h]) => Math.round(h))).size).toBe(4);
      for (const [, saturation, lightness] of surfaces) {
        expect(saturation).toBeLessThanOrEqual(50);
        if (dark) expect(lightness).toBeLessThanOrEqual(32);
        else expect(lightness).toBeGreaterThanOrEqual(85);
      }
    }
  });
  for (const preset of themePresets) {
    for (const dark of [false, true]) {
      for (const oled of dark ? [false, true] : [false]) {
        it(`${preset.id}/${dark}/${oled}: separated planes and readable material inks at every strength`, () => {
          const selections: string[] = [];
          for (const strength of ['neutral', 'tonal', 'vibrant', 'expressive'] as const) {
            for (const lift of ['flat', 'subtle', 'lifted'] as const) {
              const t = generateThemeTokens(preset, strength, dark, oled, lift);
              expect(contrastRatio(parse(t['--card']), parse(t['--background']))).toBeGreaterThan(
                1.1,
              );
              for (const [surface, ink] of [
                ['--secondary', '--secondary-foreground'],
                ['--navigation', '--navigation-foreground'],
                ['--primary-container', '--on-primary-container'],
                ['--tertiary-container', '--on-tertiary-container'],
                ['--overlay-surface', '--overlay-foreground'],
                ['--interactive-selected', '--interactive-selected-foreground'],
              ]) {
                expect(contrastRatio(parse(t[ink]), parse(t[surface]))).toBeGreaterThanOrEqual(4.5);
              }
              for (let index = 1; index <= 6; index += 1) {
                expect(contrastRatio(parse(t[`--on-data-${index}-muted`]), parse(t[`--data-${index}-surface`]))).toBeGreaterThanOrEqual(4.5);
                for (const state of ['hover', 'pressed']) {
                  expect(contrastRatio(parse(t[`--on-data-${index}-surface`]), parse(t[`--data-${index}-${state}`]))).toBeGreaterThanOrEqual(7);
                }
                expect(
                  contrastRatio(
                    parse(t[`--on-data-${index}-surface`]),
                    parse(t[`--data-${index}-surface`]),
                  ),
                ).toBeGreaterThanOrEqual(7);
                expect(
                  contrastRatio(
                    parse(t[`--on-data-${index}-container`]),
                    parse(t[`--data-${index}-container`]),
                  ),
                ).toBeGreaterThanOrEqual(4.5);
              }
              if (oled) {
                expect(parse(t['--background'])[2]).toBe(0);
                expect(parse(t['--card'])[2]).toBeGreaterThan(7);
              }
              if (lift === 'subtle') selections.push(t['--primary-container']);
            }
          }
          expect(new Set(selections).size).toBe(4);
        });
      }
    }
  }
});
