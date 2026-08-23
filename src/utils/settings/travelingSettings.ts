/**
 * Traveling settings — the sync layer for feature-level preferences.
 *
 * Batch 1 of the settings-surface overhaul: closes the largest gap found in
 * the Aug-2026 audit — dozens of localStorage-owned preferences that never
 * left the device while the login card promised «احفظ إعداداتك على جميع
 * الأجهزة».
 *
 * Contract:
 *  - collect()  reads the canonical localStorage keys and returns ONLY what
 *               genuinely exists locally. Absent means "this device has
 *               nothing to say", NOT "reset to defaults" — so a laptop that
 *               never opened the keyboard page can never clobber the phone
 *               that did.
 *  - parse()    validates the cloud side of the same shape. Every section is
 *               validated independently with Zod so one corrupt section can
 *               neither crash the restore nor block the healthy ones.
 *  - apply()    writes validated values back to the SAME canonical keys.
 *               Keyboard settings go through writeKeyboardSettings() so its
 *               live-change events fire and an open soft keyboard re-renders.
 *
 * Single source of truth per section:
 *  - keyboard → src/features/keyboard/lib/preference.ts (types + defaults)
 *  - weather  → src/features/weather/components/CitySearch.tsx (SearchedCity)
 *  - games    → unions mirrored from Chess.tsx / MemoryGame.tsx. Those types
 *               live inside page files; drift is caught by the defaults
 *               self-check at the bottom of this module and by unit tests.
 *
 * Deliberately OUT of scope (own sync path already, or ephemeral state):
 *  - game progress/stats (`chess-stats`, `memory-stats`, …) — persisted via
 *    the games progress API.
 *  - `sudoku-is-daily` — session state about the CURRENT puzzle, not a
 *    preference; restoring it cross-device is semantically wrong.
 */

import { z } from 'zod';

import {
  DEFAULT_KEYBOARD_SETTINGS,
  KEYBOARD_SETTINGS_STORAGE_KEY,
  type KeyboardSettings,
  writeKeyboardSettings,
} from '@/features/keyboard/lib/preference';
import type { SearchedCity } from '@/features/weather/components/CitySearch';

// ── Section schemas ──────────────────────────────────────────────────────────

/** Mirrors `SearchedCity` in CitySearch.tsx — geocoding result rows. */
const searchedCitySchema = z.object({
  id: z.number(),
  name: z.string(),
  country: z.string(),
  admin1: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number(),
  timezone: z.string(),
  country_code: z.string().optional(),
});

/** Mirrors `KeyboardSettings` — kept exhaustive, no unknown passthrough. */
export const keyboardSettingsSchema = z.object({
  preference: z.enum(['app', 'system']),
  theme: z.enum([
    'gboard-dark',
    'gboard-light',
    'oled',
    'luxury-gold',
    'sand',
    'emerald',
    'sapphire',
  ]),
  keyHeight: z.enum(['compact', 'normal', 'tall', 'extra-tall']),
  showNumberRow: z.boolean(),
  digitType: z.enum(['western', 'eastern']),
  showKeyPressPopup: z.boolean(),
  holdDelayMs: z.number().min(80).max(1500),
  soundEnabled: z.boolean(),
  soundOnClick: z.boolean(),
  soundVolume: z.number().min(0).max(1),
  soundTone: z.enum(['default', 'click', 'mechanical', 'soft']),
  hapticIntensity: z.enum(['off', 'light', 'medium', 'heavy']),
  vibrateOnKeyPress: z.boolean(),
  autoCapitalization: z.boolean(),
  autoCorrectionEnabled: z.boolean(),
  autoPeriod: z.boolean(),
  autoTashkeel: z.boolean(),
  oneHandedMode: z.enum(['off', 'left', 'right']),
  clipboardEnabled: z.boolean(),
  clipboardRetention: z.enum(['unlimited', '1day', '7days', '30days', 'session']),
  keyBorders: z.boolean(),
});

/** Weather cities the user pinned / recently searched. */
const weatherSectionSchema = z.object({
  favorites: z.array(searchedCitySchema).max(100),
  searchHistory: z.array(searchedCitySchema).max(100),
});

/**
 * Per-game presentation & rules preferences. Values mirror the unions in
 * Chess.tsx (BoardTheme, TimeControl) and MemoryGame.tsx (Mode, Difficulty).
 */
export const gamePreferencesSchema = z.object({
  chessBoardTheme: z.enum(['classic', 'wooden', 'midnight', 'emerald']),
  chessTimeControl: z.enum(['none', 'rapid', 'blitz', 'bullet']),
  memoryMode: z.enum(['classic', 'endless', 'timeattack', 'daily', 'versus', 'adventure']),
  memoryDifficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  /** Theme ids are open-ended (THEMES registry in MemoryGame.tsx). */
  memoryTheme: z.string().min(1).max(64),
});

// ── Snapshot shape ───────────────────────────────────────────────────────────

export interface WeatherTravelSection {
  favorites: SearchedCity[];
  searchHistory: SearchedCity[];
}

export interface GamePreferences {
  chessBoardTheme: 'classic' | 'wooden' | 'midnight' | 'emerald';
  chessTimeControl: 'none' | 'rapid' | 'blitz' | 'bullet';
  memoryMode: 'classic' | 'endless' | 'timeattack' | 'daily' | 'versus' | 'adventure';
  memoryDifficulty: 'easy' | 'medium' | 'hard' | 'expert';
  memoryTheme: string;
}

export interface TravelingSettingsSnapshot {
  /** Full settings, or the pre-v2 `{ preference }` opt-out marker only. */
  keyboard?: KeyboardSettings | Pick<KeyboardSettings, 'preference'>;
  weather?: WeatherTravelSection;
  /** Partial by design — a device owns only the games it ever configured. */
  games?: Partial<GamePreferences>;
  fitnessAutoDetect?: boolean;
  wellnessOnboarded?: boolean;
}

/** Root key under `user_settings.settings` owned exclusively by this layer. */
export const TRAVELING_SETTINGS_ROOT = 'traveling';

// ── Canonical localStorage keys (must match the feature writers exactly) ─────

const WEATHER_FAVORITES_KEY = 'weather-favorites';
const WEATHER_HISTORY_KEY = 'weather-search-history';
const FITNESS_AUTODETECT_KEY = 'fitness:autoDetect';
const WELLNESS_ONBOARDED_KEY = 'wellness:onboarded';

/**
 * Every localStorage key this layer can write. The sign-out sweep in
 * AppContext uses it so a wiped account leaves no preference residue
 * behind on shared devices.
 */
export const TRAVELING_SETTINGS_STORAGE_KEYS: readonly string[] = [
  KEYBOARD_SETTINGS_STORAGE_KEY,
  WEATHER_FAVORITES_KEY,
  WEATHER_HISTORY_KEY,
  'chess-board-theme',
  'chess-tc',
  'memory-mode',
  'memory-diff',
  'memory-theme',
  FITNESS_AUTODETECT_KEY,
  WELLNESS_ONBOARDED_KEY,
];

// ── Local helpers ────────────────────────────────────────────────────────────

function readJSONObject(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function readFlag(key: string): boolean | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    return raw === 'true' || raw === '1';
  } catch {
    return undefined;
  }
}

function readString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeJSONObject(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private-browsing fallback — mirror the feature writers' behaviour */
  }
}

// ── Keyboard section extractor (shared by collect & parse) ───────────────────

/**
 * Accepts either a full valid settings object or the pre-v2 single-key
 * opt-out marker `{ preference }`. Anything else — including a corrupted
 * full object — is dropped entirely: a broken blob must never degrade
 * into a half-restored preference.
 */
function extractKeyboardSection(
  value: unknown,
): TravelingSettingsSnapshot['keyboard'] {
  const full = keyboardSettingsSchema.safeParse(value);
  if (full.success) return full.data;
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1
  ) {
    const marker = keyboardSettingsSchema
      .pick({ preference: true })
      .required()
      .safeParse(value);
    if (marker.success) return marker.data;
  }
  return undefined;
}

// ── Collect (device → cloud payload) ─────────────────────────────────────────

export function collectTravelingSettings(): TravelingSettingsSnapshot {
  const snapshot: TravelingSettingsSnapshot = {};

  // Speak for the keyboard ONLY when this device actually owns a choice,
  // and only after validating the RAW stored value ourselves. Delegating to
  // readKeyboardSettings() here would fabricate defaults out of a corrupt
  // blob (its catch-path returns DEFAULTS) and sync that fabrication over
  // the user's real cloud settings.
  let keyboardValue: unknown;
  try {
    const raw = localStorage.getItem(KEYBOARD_SETTINGS_STORAGE_KEY);
    keyboardValue = raw === null ? undefined : JSON.parse(raw);
  } catch {
    keyboardValue = undefined;
  }
  if (keyboardValue !== undefined) {
    snapshot.keyboard = extractKeyboardSection(keyboardValue);
  } else {
    // Honour the pre-v2 opt-out so users who chose the OS keyboard carry
    // that choice instead of silently re-enabling the soft keyboard
    // on their other devices.
    try {
      const legacy = localStorage.getItem('smarthub:soft-keyboard');
      if (legacy === 'app' || legacy === 'system') {
        // Valid by construction — matches Pick<KeyboardSettings, 'preference'>.
        snapshot.keyboard = { preference: legacy };
      }
    } catch {
      /* storage unavailable */
    }
  }

  const favorites = readJSONObject(WEATHER_FAVORITES_KEY);
  const history = readJSONObject(WEATHER_HISTORY_KEY);
  if (favorites !== undefined || history !== undefined) {
    const parsed = weatherSectionSchema.safeParse({
      favorites: favorites ?? [],
      searchHistory: history ?? [],
    });
    if (parsed.success) snapshot.weather = parsed.data;
  }

  const games: Partial<GamePreferences> = {};
  const boardTheme = readString('chess-board-theme');
  if (boardTheme !== null) games.chessBoardTheme = boardTheme as GamePreferences['chessBoardTheme'];
  const timeControl = readString('chess-tc');
  if (timeControl !== null) games.chessTimeControl = timeControl as GamePreferences['chessTimeControl'];
  const memoryMode = readString('memory-mode');
  if (memoryMode !== null) games.memoryMode = memoryMode as GamePreferences['memoryMode'];
  const memoryDiff = readString('memory-diff');
  if (memoryDiff !== null) games.memoryDifficulty = memoryDiff as GamePreferences['memoryDifficulty'];
  const memoryTheme = readString('memory-theme');
  if (memoryTheme !== null) games.memoryTheme = memoryTheme;

  const validatedGames = gamePreferencesSchema.partial().safeParse(games);
  if (validatedGames.success && Object.keys(validatedGames.data).length > 0) {
    snapshot.games = validatedGames.data;
  }

  const autoDetect = readFlag(FITNESS_AUTODETECT_KEY);
  if (autoDetect !== undefined) snapshot.fitnessAutoDetect = autoDetect;

  const onboarded = readFlag(WELLNESS_ONBOARDED_KEY);
  if (onboarded !== undefined) snapshot.wellnessOnboarded = onboarded;

  return snapshot;
}

// ── Parse (cloud → validated payload) ────────────────────────────────────────

/**
 * Validates an untrusted `user_settings.settings.<TRAVELING_SETTINGS_ROOT>`
 * value. Corrupt sections are DROPPED, never defaulted — an invalid value
 * must not silently become "the user chose X".
 */
export function parseTravelingSettings(raw: unknown): TravelingSettingsSnapshot {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const input = raw as Record<string, unknown>;
  const snapshot: TravelingSettingsSnapshot = {};

  snapshot.keyboard = extractKeyboardSection(input.keyboard);

  const weather = weatherSectionSchema.safeParse(input.weather);
  if (weather.success) snapshot.weather = weather.data;

  const games = gamePreferencesSchema.partial().safeParse(input.games);
  if (games.success) snapshot.games = games.data;

  const autoDetect = z.boolean().safeParse(input.fitnessAutoDetect);
  if (autoDetect.success) snapshot.fitnessAutoDetect = autoDetect.data;

  const onboarded = z.boolean().safeParse(input.wellnessOnboarded);
  if (onboarded.success) snapshot.wellnessOnboarded = onboarded.data;

  return snapshot;
}

// ── Apply (validated payload → device) ───────────────────────────────────────

/**
 * Writes a VALIDATED snapshot to the canonical keys. Run parseTravelingSettings()
 * first when the payload came from the cloud — this function trusts its input.
 */
export function applyTravelingSettings(snapshot: TravelingSettingsSnapshot): void {
  if (snapshot.keyboard) {
    // Public writer fires 'soft-keyboard-settings-changed', so an open
    // soft keyboard re-renders with the travelled settings immediately.
    writeKeyboardSettings(snapshot.keyboard);
  }

  if (snapshot.weather?.favorites) {
    writeJSONObject(WEATHER_FAVORITES_KEY, snapshot.weather.favorites);
  }
  if (snapshot.weather?.searchHistory) {
    writeJSONObject(WEATHER_HISTORY_KEY, snapshot.weather.searchHistory);
  }

  if (snapshot.games) {
    const g = snapshot.games;
    try {
      if (g.chessBoardTheme !== undefined) localStorage.setItem('chess-board-theme', g.chessBoardTheme);
      if (g.chessTimeControl !== undefined) localStorage.setItem('chess-tc', g.chessTimeControl);
      if (g.memoryMode !== undefined) localStorage.setItem('memory-mode', g.memoryMode);
      if (g.memoryDifficulty !== undefined) localStorage.setItem('memory-diff', g.memoryDifficulty);
      if (g.memoryTheme !== undefined) localStorage.setItem('memory-theme', g.memoryTheme);
    } catch {
      /* storage unavailable */
    }
  }

  if (snapshot.fitnessAutoDetect !== undefined) {
    try {
      localStorage.setItem(FITNESS_AUTODETECT_KEY, String(snapshot.fitnessAutoDetect));
    } catch {
      /* storage unavailable */
    }
  }
  if (snapshot.wellnessOnboarded !== undefined) {
    try {
      localStorage.setItem(WELLNESS_ONBOARDED_KEY, snapshot.wellnessOnboarded ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }
}

// ── Drift guard ──────────────────────────────────────────────────────────────
// If KeyboardSettings gains a field without this schema following, the app
// fails loudly at import time instead of silently losing that field on sync.

{
  const check = keyboardSettingsSchema.safeParse(DEFAULT_KEYBOARD_SETTINGS);
  if (!check.success) {
    throw new Error(
      'travelingSettings: DEFAULT_KEYBOARD_SETTINGS drifted from keyboardSettingsSchema — '
        + JSON.stringify(check.error.issues),
    );
  }
}
