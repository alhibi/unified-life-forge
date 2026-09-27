import { describe, expect, it } from 'vitest';

import { generateThemeTokens, themePresets } from '@/utils/themeEngine';

const MODES = [false, true] as const;
const PLANES = ['--shadow-1', '--shadow-2', '--shadow-3', '--shadow-4'] as const;

const rimAlphaOf = (token: string): number | null => {
  const match = token.match(/inset 0 1px 0 rgba\([^)]+,\s*([\d.]+)\)/);
  return match ? Number(match[1]) : null;
};

describe('elevation tokens read as depth', () => {
  it('lifts every dark plane with a top-edge catch-light, not only a shadow', () => {
    // In a dark theme the shadow colour is black on a near-black card, so the
    // shadow alone is invisible and every surface reads flat. The rim — an
    // inset hairline of the theme's own ink — is what carries the elevation.
    for (const preset of themePresets) {
      const tokens = generateThemeTokens(preset, 'tonal', true, false);
      for (const plane of PLANES) {
        expect(
          rimAlphaOf(tokens[plane]),
          `${preset.id}/dark ${plane} needs a rim`,
        ).not.toBeNull();
      }
    }
  });

  it('leaves light planes on the shadow alone', () => {
    // A light card already reads depth from the shadow. A highlight on top of
    // it reads as an outline instead, so the rim must be absent, not weak.
    for (const preset of themePresets) {
      const tokens = generateThemeTokens(preset, 'tonal', false, false);
      for (const plane of PLANES) {
        expect(rimAlphaOf(tokens[plane]), `${preset.id}/light ${plane}`).toBeNull();
      }
    }
  });

  it('makes the catch-light grow with height, so the ladder reads as a ladder', () => {
    for (const preset of themePresets) {
      const tokens = generateThemeTokens(preset, 'tonal', true, false);
      const ladder = PLANES.map((plane) => rimAlphaOf(tokens[plane])!);
      for (let i = 1; i < ladder.length; i += 1) {
        expect(
          ladder[i],
          `${preset.id}/dark: e${i + 1} must catch more light than e${i}`,
        ).toBeGreaterThan(ladder[i - 1]);
      }
    }
  });

  it('keeps the rim subtle — an edge, not a second border', () => {
    // The rim is a highlight, not an outline. If it climbs far enough to read
    // as a stroked border the card looks outlined rather than lit from above.
    for (const preset of themePresets) {
      const tokens = generateThemeTokens(preset, 'tonal', true, false);
      const alphas = PLANES.map((plane) => rimAlphaOf(tokens[plane])!);
      expect(Math.max(...alphas), preset.id).toBeLessThan(0.15);
    }
  });
});
