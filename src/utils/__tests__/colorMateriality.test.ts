import { describe, expect, it } from 'vitest';

import { contrastRatio, generateThemeTokens, type Hsl, themePresets } from '../themeEngine';

const parse = (token: string): Hsl => {
  const [h, s, l] = token.split(' ').map(parseFloat);
  return [h, s, l];
};

describe('solid material roles across the complete catalogue', () => {
  for (const preset of themePresets) {
    for (const dark of [false, true]) {
      for (const oled of dark ? [false, true] : [false]) {
        it(`${preset.id}/${dark}/${oled}: separated planes and readable material inks at every strength`, () => {
          const selections: string[] = [];
          for (const strength of ['neutral', 'tonal', 'vibrant', 'expressive'] as const) {
            for (const lift of ['flat', 'subtle', 'lifted'] as const) {
              const t = generateThemeTokens(preset, strength, dark, oled, lift);
              expect(contrastRatio(parse(t['--card']), parse(t['--background']))).toBeGreaterThan(1.1);
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
                expect(contrastRatio(parse(t[`--on-data-${index}-surface`]), parse(t[`--data-${index}-surface`]))).toBeGreaterThanOrEqual(7);
                expect(contrastRatio(parse(t[`--on-data-${index}-container`]), parse(t[`--data-${index}-container`]))).toBeGreaterThanOrEqual(4.5);
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