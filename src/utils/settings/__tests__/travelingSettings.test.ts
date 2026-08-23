import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearKeyboardRuntimeCache,
  DEFAULT_KEYBOARD_SETTINGS,
  KEYBOARD_SETTINGS_STORAGE_KEY,
  readKeyboardSettings,
  writeKeyboardSettings,
} from '@/features/keyboard/lib/preference';
import type { SearchedCity } from '@/features/weather/components/CitySearch';

import {
  applyTravelingSettings,
  collectTravelingSettings,
  keyboardSettingsSchema,
  parseTravelingSettings,
  TRAVELING_SETTINGS_ROOT,
  type TravelingSettingsSnapshot,
} from '../travelingSettings';

const CITY: SearchedCity = {
  id: 292223,
  name: 'دمشق',
  country: 'سوريا',
  latitude: 33.5102,
  longitude: 36.29128,
  elevation: 700,
  timezone: 'Asia/Damascus',
};

beforeEach(() => {
  localStorage.clear();
  clearKeyboardRuntimeCache();
});

afterEach(() => {
  localStorage.clear();
  clearKeyboardRuntimeCache();
});

describe('travelingSettings — drift guard', () => {
  it('DEFAULT_KEYBOARD_SETTINGS always satisfies the sync schema', () => {
    const result = keyboardSettingsSchema.safeParse(DEFAULT_KEYBOARD_SETTINGS);
    expect(result.success).toBe(true);
  });
});

describe('travelingSettings — collect', () => {
  it('returns an empty snapshot when nothing is stored locally', () => {
    // Must NOT fabricate defaults for features this device never touched.
    expect(collectTravelingSettings()).toEqual({});
  });

  it('speaks for the keyboard only when a local choice exists', () => {
    writeKeyboardSettings({ theme: 'emerald', soundVolume: 0.75 });
    const snap = collectTravelingSettings();
    expect(snap.keyboard).toMatchObject({ theme: 'emerald', soundVolume: 0.75 });
    expect(snap.keyboard).toMatchObject({ preference: DEFAULT_KEYBOARD_SETTINGS.preference });
  });

  it('collects weather favorites and search history', () => {
    localStorage.setItem('weather-favorites', JSON.stringify([CITY]));
    localStorage.setItem(
      'weather-search-history',
      JSON.stringify([{ ...CITY, id: 1, name: 'حلب' }]),
    );
    const snap = collectTravelingSettings();
    expect(snap.weather?.favorites).toHaveLength(1);
    expect(snap.weather?.favorites[0].name).toBe('دمشق');
    expect(snap.weather?.searchHistory[0].name).toBe('حلب');
  });

  it('collects only the game preferences that actually exist', () => {
    localStorage.setItem('chess-board-theme', 'midnight');
    const snap = collectTravelingSettings();
    expect(snap.games).toEqual({ chessBoardTheme: 'midnight' });
  });

  it('collects boolean flags in both states', () => {
    localStorage.setItem('fitness:autoDetect', 'true');
    localStorage.setItem('wellness:onboarded', '0');
    const snap = collectTravelingSettings();
    expect(snap.fitnessAutoDetect).toBe(true);
    expect(snap.wellnessOnboarded).toBe(false);
  });

  it('drops corrupt local payloads instead of syncing them', () => {
    localStorage.setItem(KEYBOARD_SETTINGS_STORAGE_KEY, '{not json');
    localStorage.setItem('weather-favorites', '[[["deep"]]]');
    expect(collectTravelingSettings()).toEqual({});
  });
});

describe('travelingSettings — parse (cloud side)', () => {
  it('accepts a valid payload unchanged', () => {
    const payload = {
      keyboard: DEFAULT_KEYBOARD_SETTINGS,
      weather: { favorites: [CITY], searchHistory: [] },
      games: { chessTimeControl: 'blitz', memoryMode: 'daily' },
      fitnessAutoDetect: true,
      wellnessOnboarded: true,
    };
    const snap = parseTravelingSettings(payload);
    expect(snap.keyboard).toEqual(DEFAULT_KEYBOARD_SETTINGS);
    expect(snap.weather?.favorites[0]).toEqual(CITY);
    expect(snap.games?.chessTimeControl).toBe('blitz');
    expect(snap.fitnessAutoDetect).toBe(true);
  });

  it('drops ONLY the corrupt section and keeps healthy siblings', () => {
    const payload = {
      keyboard: { ...DEFAULT_KEYBOARD_SETTINGS, theme: 'neon-injected' },
      weather: { favorites: [CITY], searchHistory: [] },
      games: { chessBoardTheme: '<script>' },
    };
    const snap = parseTravelingSettings(payload);
    expect(snap.keyboard).toBeUndefined();
    expect(snap.weather?.favorites).toHaveLength(1);
    expect(snap.games).toBeUndefined();
  });

  it('rejects non-object payloads without throwing', () => {
    expect(parseTravelingSettings(null)).toEqual({});
    expect(parseTravelingSettings('{"evil":1}')).toEqual({});
    expect(parseTravelingSettings([1, 2, 3])).toEqual({});
    expect(parseTravelingSettings(42)).toEqual({});
  });

  it('rejects wrong-typed scalars inside valid sections', () => {
    const snap = parseTravelingSettings({
      games: { memoryDifficulty: 'impossible', memoryTheme: 'classic' },
    });
    // One bad member invalidates the whole games object — no silent partial.
    expect(snap.games).toBeUndefined();
  });
});

describe('travelingSettings — apply', () => {
  it('writes validated values to the canonical keys', () => {
    applyTravelingSettings({
      weather: { favorites: [CITY], searchHistory: [] },
      games: { chessBoardTheme: 'wooden', memoryTheme: 'ocean' },
      fitnessAutoDetect: false,
      wellnessOnboarded: true,
    });
    expect(JSON.parse(localStorage.getItem('weather-favorites') ?? '')).toEqual([CITY]);
    expect(localStorage.getItem('chess-board-theme')).toBe('wooden');
    expect(localStorage.getItem('memory-theme')).toBe('ocean');
    expect(localStorage.getItem('fitness:autoDetect')).toBe('false');
    expect(localStorage.getItem('wellness:onboarded')).toBe('1');
  });

  it('routes keyboard writes through the feature writer (live events fire)', () => {
    const events: unknown[] = [];
    window.addEventListener('soft-keyboard-settings-changed', (e) => {
      events.push((e as CustomEvent).detail);
    });
    applyTravelingSettings({
      keyboard: { ...DEFAULT_KEYBOARD_SETTINGS, hapticIntensity: 'heavy' },
    });
    expect(events).toHaveLength(1);
    expect(readKeyboardSettings().hapticIntensity).toBe('heavy');
  });

  it('never touches keys absent from the snapshot', () => {
    localStorage.setItem('memory-mode', 'versus');
    applyTravelingSettings({ fitnessAutoDetect: true });
    expect(localStorage.getItem('memory-mode')).toBe('versus');
    expect(localStorage.getItem('chess-tc')).toBeNull();
  });
});

describe('travelingSettings — round trip', () => {
  it('apply ∘ collect is an identity on every owned section', () => {
    writeKeyboardSettings({ theme: 'sapphire', oneHandedMode: 'right', holdDelayMs: 350 });
    localStorage.setItem('weather-favorites', JSON.stringify([CITY]));
    localStorage.setItem('weather-search-history', JSON.stringify([]));
    localStorage.setItem('chess-board-theme', 'emerald');
    localStorage.setItem('chess-tc', 'rapid');
    localStorage.setItem('memory-mode', 'timeattack');
    localStorage.setItem('memory-diff', 'expert');
    localStorage.setItem('memory-theme', 'classic');
    localStorage.setItem('fitness:autoDetect', 'true');

    const before = collectTravelingSettings();
    localStorage.clear();
    applyTravelingSettings(before);
    const after = collectTravelingSettings();

    expect(after).toEqual(before satisfies TravelingSettingsSnapshot);
    expect(Object.keys(before).sort()).toEqual([
      'fitnessAutoDetect',
      'games',
      'keyboard',
      'weather',
    ]);
  });

  it('root key constant stays stable — it is a persisted contract', () => {
    expect(TRAVELING_SETTINGS_ROOT).toBe('traveling');
  });
});
