import { describe, expect, it } from 'vitest';

import { generateThemeTokens, themePresets } from '@/utils/themeEngine';

/**
 * The semantic contract, enforced rather than described.
 *
 * DESIGN.md §3 lists the roles every component is allowed to consume. A theme
 * family that forgets one of them does not fail loudly at runtime — the token
 * resolves to nothing and the surface paints transparent or inherits the
 * wrong colour. This test walks the published contract for every family in
 * both modes and fails the moment a role disappears.
 */

const COLOR_ROLES = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--surface-0',
  '--surface-1',
  '--surface-2',
  '--surface-3',
  '--muted',
  '--muted-foreground',
  '--muted-foreground-subtle',
  '--disabled',
  '--border',
  '--input',
  '--ring',
  '--focus-ring',
  '--primary',
  '--primary-foreground',
  '--primary-container',
  '--on-primary-container',
  '--secondary',
  '--secondary-foreground',
  '--tertiary',
  '--tertiary-container',
  '--on-tertiary-container',
  '--accent',
  '--accent-foreground',
  '--accent-brand',
  '--destructive',
  '--destructive-foreground',
  '--success',
  '--success-foreground',
  '--warning',
  '--warning-foreground',
  '--error',
  '--error-foreground',
  '--information',
  '--signal',
  '--signal-soft',
  '--signal-foreground',
  '--live',
  '--track',
  '--navigation',
  '--navigation-foreground',
  '--overlay-surface',
  '--overlay-foreground',
  '--interactive-hover',
  '--interactive-pressed',
  '--interactive-selected',
  '--interactive-selected-foreground',
  '--selected-indicator',
  '--scrim',
  '--data-1',
  '--data-2',
  '--data-3',
  '--data-4',
  '--data-5',
  '--data-6',
  '--sun',
  '--moon',
] as const;

const LADDER_STEPS = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const SHADOW_ROLES = ['--shadow-1', '--shadow-2', '--shadow-3', '--shadow-4'] as const;

function assertHsl(role: string, value: string | undefined) {
  expect(value, role + ' must exist').toBeTruthy();
  const parts = String(value).split(' ');
  expect(parts, role + ' must be an HSL triple').toHaveLength(3);
  for (const part of parts) {
    expect(Number.isFinite(Number.parseFloat(part)), role + ' must be numeric').toBe(true);
  }
  const lightness = Number.parseFloat(parts[2]);
  expect(lightness).toBeGreaterThanOrEqual(0);
  expect(lightness).toBeLessThanOrEqual(100);
}

describe('semantic role contract', () => {
  for (const preset of themePresets) {
    for (const isDark of [false, true]) {
      for (const isBlack of isDark ? [false, true] : [false]) {
        const mode = isDark ? (isBlack ? 'black' : 'dark') : 'light';
        it(preset.id + ' ' + mode + ': publishes every colour role', () => {
          const tokens = generateThemeTokens(preset, 'tonal', isDark, isBlack);
          for (const role of COLOR_ROLES) assertHsl(role, tokens[role]);
          for (let index = 1; index <= 6; index += 1) {
            assertHsl('--data-' + index + '-surface', tokens['--data-' + index + '-surface']);
            assertHsl('--on-data-' + index + '-surface', tokens['--on-data-' + index + '-surface']);
            assertHsl('--data-' + index + '-container', tokens['--data-' + index + '-container']);
            assertHsl('--on-data-' + index + '-container', tokens['--on-data-' + index + '-container']);
          }
          for (const step of LADDER_STEPS) assertHsl('--theme-' + step, tokens['--theme-' + step]);
          for (const shadow of SHADOW_ROLES) {
            expect(tokens[shadow], shadow).toBeTruthy();
            expect(tokens[shadow]).not.toBe('none');
          }
        });
      }
    }
  }

  it('every family still ships an art direction', () => {
    // The art direction is what keeps the palettes distinct instead of
    // fourteen recolourings of one neutral shell.
    for (const preset of themePresets) {
      expect(preset.artDirection, preset.id).toBeDefined();
      expect(preset.artDirection.philosophy.length, preset.id).toBeGreaterThan(10);
      expect(preset.artDirection.dataHues).toHaveLength(6);
    }
  });

  it('the registry keeps fourteen families plus the dynamic one', () => {
    expect(themePresets).toHaveLength(14);
    const ids = themePresets.map((preset) => preset.id);
    for (const id of [
      'expressive',
      'editorial',
      'copper',
      'paper',
      'mono',
      'obsidian',
      'clay',
      'gold',
      'moss',
      'ocean',
      'arctic',
      'midnight',
      'nebula',
      'rose',
    ]) {
      expect(ids, 'missing family ' + id).toContain(id);
    }
  });
});
