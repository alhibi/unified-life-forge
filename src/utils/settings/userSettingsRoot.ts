/**
 * Typed, validated boundary for `user_settings.settings`.
 *
 * Batch 2 of the settings-surface overhaul: the restore path used to cast
 * the cloud row with `as Record<string, any>` — a corrupt/tampered document
 * flowed straight into dozens of unguarded consumers. This schema is the
 * single entry gate:
 *  - Unknown keys are STRIPPED (no prototype-pollution / junk surface).
 *  - Known enum-like fields are validated against their exact literal
 *    unions; an UNKNOWN VALUE degrades to undefined (.catch) so one bad
 *    cell falls back to the local default instead of nuking the whole
 *    restore. Only STRUCTURAL corruption (non-object document) returns null.
 *  - Free-form values stay behind the resolve/clamp helpers downstream —
 *    this gate fixes the SHAPE, those helpers still guard every NUMBER.
 *
 * Shallow-merge contract: engines own DISJOINT top-level subtrees
 * (AppContext → flat preference keys, chat engine → `chat`,
 * traveling layer → `traveling`). See merge_user_settings RPC migration.
 */

import { z } from 'zod';

/** Must stay in sync with TRAVELING_SETTINGS_ROOT (drift-guarded by tests). */
const TRAVELING_ROOT_KEY = 'traveling';

/**
 * Literal unions mirrored from src/contexts/AppContext.tsx. Kept here (not
 * imported) because importing the context module from a leaf utility would
 * create a cycle. A test drift-guards the mirror.
 */
const THEME_VALUES = ['light', 'dark'] as const;
const PALETTE_STYLE_VALUES = [
  'tonal',
  'vibrant',
  'expressive',
  'neutral',
  'rainbow',
] as const;
const COLOR_THEME_VALUES = [
  'paper', 'default', 'midnight', 'rose', 'emerald', 'lavender', 'sunset',
  'ocean', 'neon', 'coffee', 'mono', 'cherry', 'gold', 'aurora', 'sakura',
  'arctic', 'volcano', 'matcha', 'nebula', 'copper', 'mint', 'sandstone',
  'dusk', 'moss', 'clay', 'storm', 'silk', 'amber', 'fog', 'obsidian',
  'terracotta', 'dynamic',
] as const;
const SURFACE_LIFT_VALUES = ['flat', 'lifted', 'subtle'] as const;
const PRAYER_MADHAB_VALUES = ['shafii', 'hanafi', 'hanbali', 'maliki'] as const;
const LATITUDE_ADJ_VALUES = ['middle', 'seventh', 'angle'] as const;

/** Enum-like cloud field: an UNKNOWN stored value degrades to undefined
 *  (falls back to the local default) instead of failing the document. */
function enumField<T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values).optional().catch(undefined);
}

export const userSettingsRootSchema = z.object({
  // ── Appearance ──
  theme: enumField(THEME_VALUES),
  paletteStyle: enumField(PALETTE_STYLE_VALUES),
  blackMode: z.boolean().optional().catch(undefined),
  colorTheme: enumField(COLOR_THEME_VALUES),
  surfaceLift: enumField(SURFACE_LIFT_VALUES),

  // ── Typography (free-form ids — resolved by lib/fonts helpers) ──
  fontFamily: z.string().optional(),
  fontDisplayFamily: z.string().optional(),
  typeRatio: z.string().optional(),
  typeLeading: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.union([z.string(), z.number()]).optional(),
  fontOpacity: z.number().optional(),

  // ── Interface geometry ──
  cornerSoftness: z.union([z.string(), z.number()]).optional(),
  uiDensity: z.string().optional(),
  contentWidth: z.string().optional(),
  borderStrength: z.string().optional(),
  /** Versioned appearance profile (v2/v3 advanced prefs live inside it). */
  appearancePreferences: z.record(z.string(), z.unknown()).optional(),
  // Legacy flat mirrors of the v2 advanced prefs — read when the nested
  // profile is absent (rows written before the versioned document existed).
  uiScale: z.number().optional(),
  adaptiveLayout: z.boolean().optional(),
  surfaceMaterial: z.string().optional(),
  interactionStyle: z.string().optional(),
  reducedTransparency: z.boolean().optional(),
  strongerContrast: z.boolean().optional(),
  largeTouchTargets: z.boolean().optional(),
  clearerFocus: z.boolean().optional(),

  // ── Prayer ──
  prayerMadhab: enumField(PRAYER_MADHAB_VALUES),
  midnightMode: z.number().optional(),
  latitudeAdjMethod: enumField(LATITUDE_ADJ_VALUES),
  dstEnabled: z.boolean().optional(),
  calcMethod: z.union([z.string(), z.number()]).optional(),

  // ── Motion ──
  motionSpeed: z.number().optional(),
  fpsCap: z.union([z.literal('auto'), z.literal(60), z.literal(90), z.literal(120)])
    .optional()
    .catch(undefined),
  motionAmplitude: z.number().optional(),
  springBounce: z.number().optional(),
  motionPreferences: z.record(z.string(), z.unknown()).optional(),

  // ── Feature scratch state that roams with the account ──
  gameStats: z.unknown().optional(),
  savedLocations: z.unknown().optional(),
  mihrab: z.string().optional(),
  tafsir: z.unknown().optional(),
  tafsir_bookmarks: z.unknown().optional(),
  browse: z.string().optional(),

  // ── Other engines' subtrees (owned elsewhere, merged server-side) ──
  /** Owned by lib/chat/settings.ts — loaded by useChatSettings, not here. */
  chat: z.record(z.string(), z.unknown()).optional(),
  /** Owned by utils/settings/travelingSettings.ts — applied via its parser. */
  traveling: z.unknown().optional(),
});

export type UserSettingsRoot = z.infer<typeof userSettingsRootSchema>;

/**
 * Validates an untrusted settings document. Returns null ONLY for structural
 * corruption (not a plain object) — callers treat null as "nothing to
 * restore". Field-level garbage degrades to undefined instead.
 */
export function parseUserSettingsRoot(raw: unknown): UserSettingsRoot | null {
  const result = userSettingsRootSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Test-only drift guard: the traveling root key is a persisted contract. */
export const USER_SETTINGS_TRAVELING_KEY = TRAVELING_ROOT_KEY;
