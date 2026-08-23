import { describe, expect, it } from 'vitest';

import { TRAVELING_SETTINGS_ROOT } from '../travelingSettings';
import { parseUserSettingsRoot, USER_SETTINGS_TRAVELING_KEY } from '../userSettingsRoot';

describe('userSettingsRoot — the restore gate', () => {
  it('returns null ONLY for structural corruption', () => {
    expect(parseUserSettingsRoot(null)).toBeNull();
    expect(parseUserSettingsRoot(undefined)).toBeNull();
    expect(parseUserSettingsRoot('{\"injected\":true}')).toBeNull();
    expect(parseUserSettingsRoot([1, 2, 3])).toBeNull();
    expect(parseUserSettingsRoot(42)).toBeNull();
  });

  it('strips unknown keys instead of flowing them into consumers', () => {
    const out = parseUserSettingsRoot({
      theme: 'dark',
      __proto_pollution: 'x',
      rogueKey: { nested: true },
    });
    expect(out).toEqual({ theme: 'dark' });
    expect(Object.keys(out ?? [])).toEqual(['theme']);
  });

  it('degrades an unknown ENUM VALUE to undefined — not a dropped document', () => {
    const out = parseUserSettingsRoot({
      theme: '<script>',
      colorTheme: 'neon',
      prayerMadhab: 'nonexistent',
    });
    expect(out?.theme).toBeUndefined();
    expect(out?.prayerMadhab).toBeUndefined();
    // Healthy siblings survive the same payload.
    expect(out?.colorTheme).toBe('neon');
  });

  it('accepts every literal of the numeric unions and rejects outsiders', () => {
    expect(parseUserSettingsRoot({ fpsCap: 120 })?.fpsCap).toBe(120);
    expect(parseUserSettingsRoot({ fpsCap: 'auto' })?.fpsCap).toBe('auto');
    expect(parseUserSettingsRoot({ fpsCap: 240 })?.fpsCap).toBeUndefined();
    expect(parseUserSettingsRoot({ midnightMode: 2 })?.midnightMode).toBe(2);
    expect(parseUserSettingsRoot({ midnightMode: '2' })?.midnightMode).toBeUndefined();
  });

  it('passes free-form ids through for downstream resolve helpers', () => {
    const out = parseUserSettingsRoot({
      fontFamily: 'ibm-plex-sans-arabic',
      uiDensity: 'cozy',
      cornerSoftness: 1.2,
      fontWeight: 500,
    });
    expect(out?.fontFamily).toBe('ibm-plex-sans-arabic');
    expect(out?.uiDensity).toBe('cozy');
    expect(out?.cornerSoftness).toBe(1.2);
    expect(out?.fontWeight).toBe(500);
  });

  it('keeps the other engines subtrees intact', () => {
    const out = parseUserSettingsRoot({
      chat: { privacy: { readReceipts: false } },
      traveling: { games: { chessBoardTheme: 'midnight' } },
      appearancePreferences: { spacingScale: 1.1 },
    });
    expect(out?.chat).toEqual({ privacy: { readReceipts: false } });
    expect(out?.traveling).toEqual({ games: { chessBoardTheme: 'midnight' } });
    expect(out?.appearancePreferences).toEqual({ spacingScale: 1.1 });
  });

  it('exposes the legacy flat mirrors of advanced interface prefs', () => {
    const out = parseUserSettingsRoot({
      uiScale: 1.15,
      adaptiveLayout: true,
      surfaceMaterial: 'matte',
      largeTouchTargets: true,
    });
    expect(out?.uiScale).toBe(1.15);
    expect(out?.adaptiveLayout).toBe(true);
    expect(out?.surfaceMaterial).toBe('matte');
    expect(out?.largeTouchTargets).toBe(true);
  });

  it('drift guard: the traveling root key agrees across both modules', () => {
    // One side is the writer/reader contract, the other the persisted
    // document layout — if these ever diverge, restored devices silently
    // lose every traveling section.
    expect(USER_SETTINGS_TRAVELING_KEY).toBe(TRAVELING_SETTINGS_ROOT);
  });
});
