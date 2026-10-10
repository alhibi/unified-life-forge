import { describe, expect, it } from 'vitest';
import { THEME_ART_DIRECTIONS } from '../themeArtDirections';
import { contrastRatio, generateThemeTokens, type Hsl, themePresets } from '../themeEngine';
const parse = (token: string): Hsl => {
  const [h, s, l] = token.split(' ').map(parseFloat);
  return [h, s, l];
};
describe('independent theme contracts', () => {
  it('covers every live theme with distinct material recipes', () => {
    expect(themePresets).toHaveLength(14);
    expect(Object.keys(THEME_ART_DIRECTIONS).sort()).toEqual(
      themePresets.map((preset) => preset.id).sort(),
    );
    expect(new Set(themePresets.map((preset) => JSON.stringify(preset.artDirection))).size).toBe(
      14,
    );
  });
  for (const preset of themePresets) {
    for (const dark of [false, true]) {
      for (const oled of dark ? [false, true] : [false]) {
        it(`${preset.id}/${dark}/${oled}: all strengths preserve text and selection contrast`, () => {
          const containers: string[] = [];
          for (const strength of ['neutral', 'tonal', 'vibrant', 'expressive'] as const) {
            const t = generateThemeTokens(preset, strength, dark, oled);
            containers.push(t['--primary-container']);
            for (const [fg, bg, ratio] of [
              ['--foreground', '--background', 4.5],
              ['--card-foreground', '--card', 4.5],
              ['--primary-foreground', '--primary', 4.5],
              ['--on-primary-container', '--primary-container', 4.5],
              ['--interactive-selected-foreground', '--interactive-selected', 4.5],
              ['--muted-foreground', '--card', 4.5],
              ['--input', '--card', 3],
              ['--selected-indicator', '--card', 3],
            ] as const)
              expect(contrastRatio(parse(t[fg]), parse(t[bg]))).toBeGreaterThanOrEqual(ratio);
            if (oled) expect(parse(t['--background'])[2]).toBe(0);
            if (preset.id === 'mono')
              for (const role of [
                '--primary',
                '--secondary',
                '--tertiary',
                '--signal',
                '--data-1',
                '--data-6',
              ])
                expect(parse(t[role])[1]).toBe(0);
          }
          expect(new Set(containers).size).toBe(4);
        });
      }
    }
  }
});
