export const APPEARANCE_SCHEMA_VERSION = 2 as const;
export const APPEARANCE_PREFERENCES_STORAGE_KEY = 'app-appearance-preferences-v2';

export const MIN_UI_SCALE = 0.85;
export const MAX_UI_SCALE = 1.2;

export type SurfaceMaterial = 'solid' | 'soft' | 'airy';
export type InteractionStyle = 'calm' | 'balanced' | 'lively';

export interface AdvancedInterfacePreferences {
  uiScale: number;
  adaptiveLayout: boolean;
  surfaceMaterial: SurfaceMaterial;
  interactionStyle: InteractionStyle;
  reducedTransparency: boolean;
  strongerContrast: boolean;
  largeTouchTargets: boolean;
  clearerFocus: boolean;
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
};

export const DEFAULT_ADVANCED_INTERFACE_PREFS = DEFAULT_ADVANCED_INTERFACE_PREFERENCES;

export const DEFAULT_APPEARANCE_PROFILE: Readonly<AppearanceProfile> = {
  schemaVersion: APPEARANCE_SCHEMA_VERSION,
  ...DEFAULT_ADVANCED_INTERFACE_PREFERENCES,
};

export const DEFAULT_APPEARANCE_PREFERENCES = DEFAULT_APPEARANCE_PROFILE;

interface StorageReader {
  getItem(key: string): string | null;
}

interface StorageWriter extends StorageReader {
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function clampUiScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ADVANCED_INTERFACE_PREFERENCES.uiScale;
  return Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, Math.round(value * 100) / 100));
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
  const rawScale =
    source.uiScale === null || source.uiScale === ''
      ? Number.NaN
      : typeof source.uiScale === 'number'
        ? source.uiScale
        : Number(source.uiScale);

  return {
    uiScale: Number.isFinite(rawScale) ? clampUiScale(rawScale) : clampUiScale(fallback.uiScale),
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

/** Parse an already-versioned profile. Unknown or missing versions are migrated from legacy keys. */
export function parseAppearanceProfile(raw: string | null | undefined): AppearanceProfile | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const envelopeVersion = parsed.schemaVersion;
    const nestedVersion = isRecord(parsed.preferences)
      ? parsed.preferences.schemaVersion
      : undefined;
    if (
      envelopeVersion !== APPEARANCE_SCHEMA_VERSION &&
      nestedVersion !== APPEARANCE_SCHEMA_VERSION
    ) {
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

/** Build a v2 profile from the previously independent localStorage settings. */
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

/** Read the v2 profile, migrating and caching legacy settings when needed. */
export function readAppearancePreferences(
  storage: StorageWriter | undefined = defaultStorage(),
): AppearanceProfile {
  const current = parseAppearanceProfile(safelyRead(storage, APPEARANCE_PREFERENCES_STORAGE_KEY));
  if (current) return current;

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
