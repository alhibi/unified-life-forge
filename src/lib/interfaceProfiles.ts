import type { SurfaceLift } from '@/utils/themeEngine';

import {
  type AdvancedInterfacePreferences,
  sanitizeAdvancedInterfacePreferences,
} from './appearancePreferences';
import { clampCornerSoftness, resolveBorder, resolveDensity, resolveWidth } from './interfaceScale';

export const INTERFACE_PROFILES_STORAGE_KEY = 'app-interface-profiles-v1';
/**
 * Document version.
 *
 *   v1 — 13 settings (the v2 appearance schema plus the five geometry fields).
 *   v2 — 26 settings (adds the v3 fine-grain dimensions).
 *
 * v1 documents import cleanly: the fields they never had resolve to defaults,
 * which is exactly the geometry the profile was saved with.
 */
export const INTERFACE_PROFILES_VERSION = 2 as const;
export const SUPPORTED_INTERFACE_PROFILE_VERSIONS = [1, 2] as const;
export const MAX_INTERFACE_PROFILES = 8;
export const MAX_INTERFACE_PROFILE_IMPORT_BYTES = 256 * 1024;

export interface InterfaceProfileSettings extends AdvancedInterfacePreferences {
  cornerSoftness: number;
  density: ReturnType<typeof resolveDensity>;
  width: ReturnType<typeof resolveWidth>;
  border: ReturnType<typeof resolveBorder>;
  surfaceLift: SurfaceLift;
}

export interface SavedInterfaceProfile {
  id: string;
  name: string;
  settings: InterfaceProfileSettings;
}

export interface InterfaceProfilesDocument {
  version: typeof INTERFACE_PROFILES_VERSION;
  profiles: SavedInterfaceProfile[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function resolveSurfaceLift(value: unknown): SurfaceLift {
  return value === 'flat' || value === 'lifted' || value === 'subtle' ? value : 'subtle';
}

function sanitizeName(value: unknown, index = 0): string {
  if (typeof value !== 'string') return `ملف واجهة ${index + 1}`;
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, 48);
  return normalized || `ملف واجهة ${index + 1}`;
}

function sanitizeId(value: unknown, index: number): string {
  if (typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)) return value;
  return `interface-${Date.now()}-${index}`;
}

export function sanitizeInterfaceProfileSettings(value: unknown): InterfaceProfileSettings {
  const source = isRecord(value) && isRecord(value.settings) ? value.settings : value;
  const record = isRecord(source) ? source : {};
  return {
    cornerSoftness: clampCornerSoftness(Number(record.cornerSoftness)),
    density: resolveDensity(typeof record.density === 'string' ? record.density : undefined),
    width: resolveWidth(typeof record.width === 'string' ? record.width : undefined),
    border: resolveBorder(typeof record.border === 'string' ? record.border : undefined),
    surfaceLift: resolveSurfaceLift(record.surfaceLift),
    ...sanitizeAdvancedInterfacePreferences(record),
  };
}

export function sanitizeSavedInterfaceProfile(value: unknown, index = 0): SavedInterfaceProfile {
  const record = isRecord(value) ? value : {};
  return {
    id: sanitizeId(record.id, index),
    name: sanitizeName(record.name, index),
    settings: sanitizeInterfaceProfileSettings(record.settings ?? record),
  };
}

export function sanitizeInterfaceProfilesDocument(value: unknown): InterfaceProfilesDocument {
  const source =
    isRecord(value) && Array.isArray(value.profiles)
      ? value.profiles
      : Array.isArray(value)
        ? value
        : isRecord(value)
          ? [value]
          : [];
  const profiles = source
    .slice(0, MAX_INTERFACE_PROFILES)
    .map((profile, index) => sanitizeSavedInterfaceProfile(profile, index));
  return { version: INTERFACE_PROFILES_VERSION, profiles };
}

function defaultStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readInterfaceProfiles(
  storage: StorageLike | undefined = defaultStorage(),
): SavedInterfaceProfile[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(INTERFACE_PROFILES_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeInterfaceProfilesDocument(JSON.parse(raw)).profiles;
  } catch {
    return [];
  }
}

export function writeInterfaceProfiles(
  profiles: readonly SavedInterfaceProfile[],
  storage: StorageLike | undefined = defaultStorage(),
): SavedInterfaceProfile[] {
  const sanitized = sanitizeInterfaceProfilesDocument([...profiles]).profiles;
  if (storage) {
    try {
      storage.setItem(
        INTERFACE_PROFILES_STORAGE_KEY,
        JSON.stringify({ version: INTERFACE_PROFILES_VERSION, profiles: sanitized }),
      );
    } catch {
      // The in-memory result remains useful when storage is unavailable.
    }
  }
  return sanitized;
}

/**
 * The settings every exported document must carry to be recognised as an
 * interface profile rather than an arbitrary JSON file. Deliberately limited to
 * the v1 field set so profiles exported before the v3 upgrade still import.
 */
const REQUIRED_SETTINGS: readonly (keyof InterfaceProfileSettings)[] = [
  'cornerSoftness',
  'density',
  'width',
  'border',
  'surfaceLift',
  'uiScale',
  'adaptiveLayout',
  'surfaceMaterial',
  'interactionStyle',
  'reducedTransparency',
  'strongerContrast',
  'largeTouchTargets',
  'clearerFocus',
];

export function parseInterfaceProfilesImport(raw: string): SavedInterfaceProfile[] | null {
  if (raw.length > MAX_INTERFACE_PROFILE_IMPORT_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      typeof parsed.version !== 'number' ||
      !(SUPPORTED_INTERFACE_PROFILE_VERSIONS as readonly number[]).includes(parsed.version) ||
      !Array.isArray(parsed.profiles) ||
      parsed.profiles.length === 0
    ) {
      return null;
    }
    const hasCompleteProfiles = parsed.profiles.every((profile) => {
      if (!isRecord(profile) || !isRecord(profile.settings)) return false;
      const settings = profile.settings;
      return REQUIRED_SETTINGS.every((key) => Object.prototype.hasOwnProperty.call(settings, key));
    });
    if (!hasCompleteProfiles) return null;
    // Keep the validated source count intact here. The UI applies available
    // capacity and can then report exactly how many profiles were skipped.
    return parsed.profiles.map((profile, index) => sanitizeSavedInterfaceProfile(profile, index));
  } catch {
    return null;
  }
}

export function createSavedInterfaceProfile(
  name: string,
  settings: InterfaceProfileSettings,
): SavedInterfaceProfile {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `interface-${Date.now()}`;
  return sanitizeSavedInterfaceProfile({ id, name, settings });
}
