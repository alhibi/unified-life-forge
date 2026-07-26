/**
 * The interface platform's persisted state — "الواجهة والأبعاد".
 *
 * Schema history
 * ─────────────
 *   v1 — a scatter of independent `app-*` localStorage keys.
 *   v2 — one versioned document with 8 advanced fields.
 *   v3 — 13 additional fine-grain dimensions (spacing, radius profile, border
 *        width, dividers, icon weight, row-icon size, focus offset, press
 *        depth, tap-target floor, custom content measure, header height,
 *        scrollbar style and extra safe-area padding).
 *
 * Every reader sanitizes, and every unknown or out-of-range value falls back to
 * the corresponding default, so a v2 document (or a hand-edited one) upgrades
 * silently instead of putting the app into a state the UI cannot render.
 */

export const APPEARANCE_SCHEMA_VERSION = 3 as const;
/** Versions this module can read and upgrade in place. */
export const SUPPORTED_APPEARANCE_SCHEMA_VERSIONS = [2, 3] as const;
export const APPEARANCE_PREFERENCES_STORAGE_KEY = 'app-appearance-preferences-v2';

/* ─────────────────────────────────────────────────────────────────────
 * Bounds — one place, so the sliders and the sanitizer cannot disagree.
 * ───────────────────────────────────────────────────────────────────── */

export const MIN_UI_SCALE = 0.8;
export const MAX_UI_SCALE = 1.35;

export const MIN_SPACING_SCALE = 0.7;
export const MAX_SPACING_SCALE = 1.45;

export const MIN_BORDER_WIDTH = 1;
export const MAX_BORDER_WIDTH = 2;

export const MIN_ICON_WEIGHT_SCALE = 0.7;
export const MAX_ICON_WEIGHT_SCALE = 1.4;

export const MIN_ROW_ICON_SCALE = 0.8;
export const MAX_ROW_ICON_SCALE = 1.4;

export const MIN_FOCUS_OFFSET = 0;
export const MAX_FOCUS_OFFSET = 6;

export const MIN_PRESS_DEPTH = 0;
export const MAX_PRESS_DEPTH = 1.6;

export const MIN_TAP_TARGET = 40;
export const MAX_TAP_TARGET = 64;

export const MIN_CONTENT_MEASURE = 320;
export const MAX_CONTENT_MEASURE = 960;

export const MIN_HEADER_SCALE = 0.85;
export const MAX_HEADER_SCALE = 1.35;

export const MIN_SAFE_AREA_EXTRA = 0;
export const MAX_SAFE_AREA_EXTRA = 40;

/* ─────────────────────────────────────────────────────────────────────
 * Unions
 * ───────────────────────────────────────────────────────────────────── */

export type SurfaceMaterial = 'solid' | 'soft' | 'airy';
export type InteractionStyle = 'calm' | 'balanced' | 'lively';

/**
 * How the four-step radius ladder spreads.
 *
 *   graded     — 6 / 10 / 16 / 24. The shipped relationship.
 *   uniform    — one radius everywhere: a chip and a sheet share a corner.
 *   expressive — an exaggerated spread; small things stay crisp while large
 *                surfaces become markedly rounder.
 */
export type RadiusProfile = 'graded' | 'uniform' | 'expressive';
export const RADIUS_PROFILES: readonly RadiusProfile[] = ['graded', 'uniform', 'expressive'];

/** Volume of the 1px rules that separate rows inside a surface. */
export type DividerStyle = 'hairline' | 'soft' | 'none';
export const DIVIDER_STYLES: readonly DividerStyle[] = ['hairline', 'soft', 'none'];

/** Scrollbar affordance for pointer devices. */
export type ScrollbarStyle = 'auto' | 'thin' | 'hidden';
export const SCROLLBAR_STYLES: readonly ScrollbarStyle[] = ['auto', 'thin', 'hidden'];

/* ─────────────────────────────────────────────────────────────────────
 * Shape
 * ───────────────────────────────────────────────────────────────────── */

export interface AdvancedInterfacePreferences {
  /* ── v2 ── */
  uiScale: number;
  adaptiveLayout: boolean;
  surfaceMaterial: SurfaceMaterial;
  interactionStyle: InteractionStyle;
  reducedTransparency: boolean;
  strongerContrast: boolean;
  largeTouchTargets: boolean;
  clearerFocus: boolean;
  /* ── v3 ── */
  /** Multiplier on every gap, gutter and card padding — independent of scale. */
  spacingScale: number;
  /** How the radius ladder spreads across the four steps. */
  radiusProfile: RadiusProfile;
  /** Hairline thickness in px for every governed surface edge. */
  borderWidth: number;
  /** Volume of in-surface row dividers. */
  dividerStyle: DividerStyle;
  /** Multiplier on the icon stroke weight resolved from the interaction style. */
  iconWeightScale: number;
  /** Multiplier on the size of the tinted `.row-icon` chip. */
  rowIconScale: number;
  /** Gap in px between a focused element and its focus ring. */
  focusOffset: number;
  /** Multiplier on the press scale + travel resolved from the interaction style. */
  pressDepth: number;
  /** Absolute floor in px for any interactive target. */
  tapTargetMin: number;
  /** Content measure in px used when the width option is `custom`. */
  contentWidthCustom: number;
  /** Multiplier on the shared page/panel header height. */
  headerScale: number;
  /** Scrollbar affordance. */
  scrollbarStyle: ScrollbarStyle;
  /** Extra px added below every page, on top of the device safe area. */
  safeAreaExtra: number;
}

/** A portable, versioned appearance profile. */
export interface AppearanceProfile extends AdvancedInterfacePreferences {
  schemaVersion: typeof APPEARANCE_SCHEMA_VERSION;
}

export type AdvancedInterfacePrefs = AdvancedInterfacePreferences;
export type AppearancePreferences = AppearanceProfile;

export const DEFAULT_ADVANCED_INTERFACE_PREFERENCES: Readonly<AdvancedInterfacePreferences> = {
  uiScale: 1,
  adaptiveLayout: true,
  surfaceMaterial: 'soft',
  interactionStyle: 'balanced',
  reducedTransparency: false,
  strongerContrast: false,
  largeTouchTargets: false,
  clearerFocus: false,
  spacingScale: 1,
  radiusProfile: 'graded',
  borderWidth: 1,
  dividerStyle: 'soft',
  iconWeightScale: 1,
  rowIconScale: 1,
  focusOffset: 2,
  pressDepth: 1,
  tapTargetMin: 44,
  contentWidthCustom: 560,
  headerScale: 1,
  scrollbarStyle: 'thin',
  safeAreaExtra: 0,
};

export const DEFAULT_ADVANCED_INTERFACE_PREFS = DEFAULT_ADVANCED_INTERFACE_PREFERENCES;

export const DEFAULT_APPEARANCE_PROFILE: Readonly<AppearanceProfile> = {
  schemaVersion: APPEARANCE_SCHEMA_VERSION,
  ...DEFAULT_ADVANCED_INTERFACE_PREFERENCES,
};

export const DEFAULT_APPEARANCE_PREFERENCES = DEFAULT_APPEARANCE_PROFILE;

/** The v3 keys, in UI order. Used by the token inspector and profile import. */
export const ADVANCED_INTERFACE_KEYS: readonly (keyof AdvancedInterfacePreferences)[] = [
  'uiScale',
  'spacingScale',
  'adaptiveLayout',
  'radiusProfile',
  'surfaceMaterial',
  'interactionStyle',
  'pressDepth',
  'borderWidth',
  'dividerStyle',
  'iconWeightScale',
  'rowIconScale',
  'headerScale',
  'contentWidthCustom',
  'tapTargetMin',
  'focusOffset',
  'scrollbarStyle',
  'safeAreaExtra',
  'reducedTransparency',
  'strongerContrast',
  'largeTouchTargets',
  'clearerFocus',
];

/* ─────────────────────────────────────────────────────────────────────
 * Sanitizing
 * ───────────────────────────────────────────────────────────────────── */

interface StorageReader {
  getItem(key: string): string | null;
}

interface StorageWriter extends StorageReader {
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toNumber(value: unknown): number {
  if (value === null || value === '' || value === undefined) return Number.NaN;
  return typeof value === 'number' ? value : Number(value);
}

/** Clamp to a range, rounding to `precision` decimals. */
function clampTo(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
  precision = 2,
): number {
  const numeric = toNumber(value);
  if (!Number.isFinite(numeric)) return fallback;
  const factor = 10 ** precision;
  return Math.min(max, Math.max(min, Math.round(numeric * factor) / factor));
}

export function clampUiScale(value: number): number {
  return clampTo(value, MIN_UI_SCALE, MAX_UI_SCALE, DEFAULT_ADVANCED_INTERFACE_PREFERENCES.uiScale);
}

export function clampSpacingScale(value: number): number {
  return clampTo(
    value,
    MIN_SPACING_SCALE,
    MAX_SPACING_SCALE,
    DEFAULT_ADVANCED_INTERFACE_PREFERENCES.spacingScale,
  );
}

export function clampBorderWidth(value: number): number {
  return clampTo(
    value,
    MIN_BORDER_WIDTH,
    MAX_BORDER_WIDTH,
    DEFAULT_ADVANCED_INTERFACE_PREFERENCES.borderWidth,
  );
}

export function clampTapTarget(value: number): number {
  return clampTo(
    value,
    MIN_TAP_TARGET,
    MAX_TAP_TARGET,
    DEFAULT_ADVANCED_INTERFACE_PREFERENCES.tapTargetMin,
    0,
  );
}

export function clampContentMeasure(value: number): number {
  return clampTo(
    value,
    MIN_CONTENT_MEASURE,
    MAX_CONTENT_MEASURE,
    DEFAULT_ADVANCED_INTERFACE_PREFERENCES.contentWidthCustom,
    0,
  );
}

export function sanitizeSurfaceMaterial(value: unknown): SurfaceMaterial {
  return value === 'solid' || value === 'airy' || value === 'soft'
    ? value
    : DEFAULT_ADVANCED_INTERFACE_PREFERENCES.surfaceMaterial;
}

export function sanitizeInteractionStyle(value: unknown): InteractionStyle {
  return value === 'calm' || value === 'lively' || value === 'balanced'
    ? value
    : DEFAULT_ADVANCED_INTERFACE_PREFERENCES.interactionStyle;
}

function sanitizeMember<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function sanitizeRadiusProfile(value: unknown): RadiusProfile {
  return sanitizeMember(
    value,
    RADIUS_PROFILES,
    DEFAULT_ADVANCED_INTERFACE_PREFERENCES.radiusProfile,
  );
}

export function sanitizeDividerStyle(value: unknown): DividerStyle {
  return sanitizeMember(value, DIVIDER_STYLES, DEFAULT_ADVANCED_INTERFACE_PREFERENCES.dividerStyle);
}

export function sanitizeScrollbarStyle(value: unknown): ScrollbarStyle {
  return sanitizeMember(
    value,
    SCROLLBAR_STYLES,
    DEFAULT_ADVANCED_INTERFACE_PREFERENCES.scrollbarStyle,
  );
}

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return fallback;
}

/** Sanitize untrusted imported or stored values into a complete preference set. */
export function sanitizeAdvancedInterfacePreferences(
  value: unknown,
  fallback: AdvancedInterfacePreferences = DEFAULT_ADVANCED_INTERFACE_PREFERENCES,
): AdvancedInterfacePreferences {
  const source = isRecord(value) ? value : {};

  return {
    uiScale: Number.isFinite(toNumber(source.uiScale))
      ? clampUiScale(toNumber(source.uiScale))
      : clampUiScale(fallback.uiScale),
    adaptiveLayout: sanitizeBoolean(source.adaptiveLayout, fallback.adaptiveLayout),
    surfaceMaterial:
      source.surfaceMaterial === undefined
        ? sanitizeSurfaceMaterial(fallback.surfaceMaterial)
        : sanitizeSurfaceMaterial(source.surfaceMaterial),
    interactionStyle:
      source.interactionStyle === undefined
        ? sanitizeInteractionStyle(fallback.interactionStyle)
        : sanitizeInteractionStyle(source.interactionStyle),
    reducedTransparency: sanitizeBoolean(source.reducedTransparency, fallback.reducedTransparency),
    strongerContrast: sanitizeBoolean(source.strongerContrast, fallback.strongerContrast),
    largeTouchTargets: sanitizeBoolean(source.largeTouchTargets, fallback.largeTouchTargets),
    clearerFocus: sanitizeBoolean(source.clearerFocus, fallback.clearerFocus),

    spacingScale: clampTo(
      source.spacingScale,
      MIN_SPACING_SCALE,
      MAX_SPACING_SCALE,
      fallback.spacingScale,
    ),
    radiusProfile:
      source.radiusProfile === undefined
        ? sanitizeRadiusProfile(fallback.radiusProfile)
        : sanitizeRadiusProfile(source.radiusProfile),
    borderWidth: clampTo(
      source.borderWidth,
      MIN_BORDER_WIDTH,
      MAX_BORDER_WIDTH,
      fallback.borderWidth,
    ),
    dividerStyle:
      source.dividerStyle === undefined
        ? sanitizeDividerStyle(fallback.dividerStyle)
        : sanitizeDividerStyle(source.dividerStyle),
    iconWeightScale: clampTo(
      source.iconWeightScale,
      MIN_ICON_WEIGHT_SCALE,
      MAX_ICON_WEIGHT_SCALE,
      fallback.iconWeightScale,
    ),
    rowIconScale: clampTo(
      source.rowIconScale,
      MIN_ROW_ICON_SCALE,
      MAX_ROW_ICON_SCALE,
      fallback.rowIconScale,
    ),
    focusOffset: clampTo(
      source.focusOffset,
      MIN_FOCUS_OFFSET,
      MAX_FOCUS_OFFSET,
      fallback.focusOffset,
      1,
    ),
    pressDepth: clampTo(source.pressDepth, MIN_PRESS_DEPTH, MAX_PRESS_DEPTH, fallback.pressDepth),
    tapTargetMin: clampTo(
      source.tapTargetMin,
      MIN_TAP_TARGET,
      MAX_TAP_TARGET,
      fallback.tapTargetMin,
      0,
    ),
    contentWidthCustom: clampTo(
      source.contentWidthCustom,
      MIN_CONTENT_MEASURE,
      MAX_CONTENT_MEASURE,
      fallback.contentWidthCustom,
      0,
    ),
    headerScale: clampTo(
      source.headerScale,
      MIN_HEADER_SCALE,
      MAX_HEADER_SCALE,
      fallback.headerScale,
    ),
    scrollbarStyle:
      source.scrollbarStyle === undefined
        ? sanitizeScrollbarStyle(fallback.scrollbarStyle)
        : sanitizeScrollbarStyle(source.scrollbarStyle),
    safeAreaExtra: clampTo(
      source.safeAreaExtra,
      MIN_SAFE_AREA_EXTRA,
      MAX_SAFE_AREA_EXTRA,
      fallback.safeAreaExtra,
      0,
    ),
  };
}

export function sanitizeAppearanceProfile(value: unknown): AppearanceProfile {
  const source = isRecord(value) && isRecord(value.preferences) ? value.preferences : value;
  return {
    schemaVersion: APPEARANCE_SCHEMA_VERSION,
    ...sanitizeAdvancedInterfacePreferences(source),
  };
}

export const sanitizeAppearancePreferences = sanitizeAppearanceProfile;

export function serializeAppearanceProfile(value: unknown): string {
  return JSON.stringify(sanitizeAppearanceProfile(value));
}

function isSupportedVersion(value: unknown): boolean {
  return (
    typeof value === 'number' &&
    (SUPPORTED_APPEARANCE_SCHEMA_VERSIONS as readonly number[]).includes(value)
  );
}

/**
 * Parse a stored profile. v2 documents are accepted and upgraded to v3 — the
 * fields v2 never had simply resolve to their defaults, which is exactly the
 * look the user already had.
 */
export function parseAppearanceProfile(raw: string | null | undefined): AppearanceProfile | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const envelopeVersion = parsed.schemaVersion;
    const nestedVersion = isRecord(parsed.preferences)
      ? parsed.preferences.schemaVersion
      : undefined;
    if (!isSupportedVersion(envelopeVersion) && !isSupportedVersion(nestedVersion)) {
      return null;
    }
    return sanitizeAppearanceProfile(parsed);
  } catch {
    return null;
  }
}

function safelyRead(storage: StorageReader | undefined, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function defaultStorage(): StorageWriter | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Build a profile from the pre-v2 era's independent localStorage settings. */
export function migrateLegacyAppearancePreferences(
  storage: StorageReader | undefined = defaultStorage(),
): AppearanceProfile {
  const legacy: Record<string, unknown> = {
    uiScale: safelyRead(storage, 'app-ui-scale'),
    adaptiveLayout: safelyRead(storage, 'app-adaptive-layout'),
    surfaceMaterial: safelyRead(storage, 'app-surface-material'),
    interactionStyle: safelyRead(storage, 'app-interaction-style'),
    reducedTransparency: safelyRead(storage, 'app-reduced-transparency'),
    strongerContrast: safelyRead(storage, 'app-stronger-contrast'),
    largeTouchTargets: safelyRead(storage, 'app-large-touch-targets'),
    clearerFocus: safelyRead(storage, 'app-clearer-focus'),
  };

  // Earlier surface and motion controls are the closest semantic equivalents.
  if (legacy.surfaceMaterial === null) {
    const lift = safelyRead(storage, 'app-surface-lift');
    legacy.surfaceMaterial = lift === 'flat' ? 'solid' : lift === 'lifted' ? 'airy' : undefined;
  }
  if (legacy.interactionStyle === null) {
    const rawAmplitude = safelyRead(storage, 'app-motion-amplitude');
    const amplitude = rawAmplitude === null ? Number.NaN : Number(rawAmplitude);
    legacy.interactionStyle = Number.isFinite(amplitude)
      ? amplitude < 0.75
        ? 'calm'
        : amplitude > 1.15
          ? 'lively'
          : 'balanced'
      : undefined;
  }

  return sanitizeAppearanceProfile(legacy);
}

/** Read the profile, migrating and caching legacy or v2 documents when needed. */
export function readAppearancePreferences(
  storage: StorageWriter | undefined = defaultStorage(),
): AppearanceProfile {
  const current = parseAppearanceProfile(safelyRead(storage, APPEARANCE_PREFERENCES_STORAGE_KEY));
  if (current) {
    // Rewrite so the stored document carries the current schema version.
    if (storage) {
      try {
        storage.setItem(APPEARANCE_PREFERENCES_STORAGE_KEY, serializeAppearanceProfile(current));
      } catch {
        // Non-fatal: the in-memory profile is authoritative.
      }
    }
    return current;
  }

  const migrated = migrateLegacyAppearancePreferences(storage);
  if (storage) {
    try {
      storage.setItem(APPEARANCE_PREFERENCES_STORAGE_KEY, serializeAppearanceProfile(migrated));
    } catch {
      // Storage is an optimization; sanitized defaults remain usable without it.
    }
  }
  return migrated;
}

export function writeAppearancePreferences(
  value: unknown,
  storage: StorageWriter | undefined = defaultStorage(),
): AppearanceProfile {
  const profile = sanitizeAppearanceProfile(value);
  if (storage) {
    try {
      storage.setItem(APPEARANCE_PREFERENCES_STORAGE_KEY, serializeAppearanceProfile(profile));
    } catch {
      // Keep the pure return value useful in storage-restricted environments.
    }
  }
  return profile;
}
