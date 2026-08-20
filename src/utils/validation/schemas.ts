import { z } from 'zod';

// ============================================================================
// Core Atomic Schemas & Validators
// ============================================================================

export const UuidSchema = z.string().uuid({ message: 'Invalid UUID v4 format' });
export const IsoDateSchema = z.string().datetime({ message: 'Invalid ISO 8601 date-time format' });
export const EmailSchema = z.string().email({ message: 'Invalid email address format' });

// Username validation: 3-24 characters, alphanumeric and underscore only
export const UsernameSchema = z
  .string()
  .min(3, { message: 'Username must be at least 3 characters long' })
  .max(24, { message: 'Username must be at most 24 characters long' })
  .regex(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain English letters, numbers, and underscores',
  });

// Password validation: 8-128 characters
export const PasswordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .max(128, { message: 'Password must be at most 128 characters long' });

// ============================================================================
// Domain-Specific Schemas
// ============================================================================

// Authentication Credentials
export const AuthCredentialsSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

// User Profile Preferences (nested settings object)
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'obsidian']).default('dark'),
  language: z.enum(['en', 'ar']).default('ar'),
  sound_enabled: z.boolean().default(true),
  vibration_enabled: z.boolean().default(true),
  reduced_motion: z.boolean().default(false),
  data_saver: z.boolean().default(false),
  battery_saver: z.boolean().default(false),
});

export const SocialLinksSchema = z.object({
  github: z.string().max(100).optional().nullable(),
  twitter: z.string().max(100).optional().nullable(),
  telegram: z.string().max(100).optional().nullable(),
  linkedin: z.string().max(100).optional().nullable(),
  instagram: z.string().max(100).optional().nullable(),
}).default({});

export const PrivacySettingsSchema = z.object({
  hide_activity: z.boolean().default(false),
  hide_location: z.boolean().default(false),
  hide_online_status: z.boolean().default(false),
}).default({ hide_activity: false, hide_location: false, hide_online_status: false });

// Full User Profile Model
export const UserProfileSchema = z.object({
  id: UuidSchema,
  email: EmailSchema,
  username: UsernameSchema.optional(),
  full_name: z.string().min(2, { message: 'Full name must have at least 2 characters' }).max(100).optional(),
  display_name: z.string().max(50).optional().nullable(),
  avatar_url: z.string().max(500).optional().nullable(),
  bio: z.string().max(200, { message: 'Bio cannot exceed 200 characters' }).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  website_url: z.string().max(200).optional().nullable(),
  status_text: z.string().max(100).optional().nullable(),
  status_emoji: z.string().max(10).optional().nullable().default('✨'),
  social_links: SocialLinksSchema,
  featured_badges: z.array(z.string()).default([]),
  profile_theme: z.string().default('obsidian'),
  is_public: z.boolean().default(true),
  privacy_settings: PrivacySettingsSchema,
  preferences: UserPreferencesSchema.default({
    theme: 'dark',
    language: 'ar',
    sound_enabled: true,
    vibration_enabled: true,
    reduced_motion: false,
    data_saver: false,
    battery_saver: false,
  }),
  created_at: IsoDateSchema.optional(),
  updated_at: IsoDateSchema.optional(),
});

// Personal Knowledge Management (PKM) Entities
export const PKMTagSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1, { message: 'Tag name cannot be empty' }).max(50),
  color: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, {
    message: 'Color must be a valid hex triplet or octet (e.g., #B8492E)',
  }).optional(),
});

export const PKMNoteSchema = z.object({
  id: UuidSchema,
  title: z.string().min(1, { message: 'Title is required' }).max(200),
  content: z.string(),
  tags: z.array(PKMTagSchema).default([]),
  created_at: IsoDateSchema,
  updated_at: IsoDateSchema,
  is_archived: z.boolean().default(false),
  status: z.enum(['active', 'archived', 'trash']).default('active'),
});

export const PKMNoteDraftSchema = PKMNoteSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// GPS / Activity Tracking Models
export const GeoCoordinateSchema = z.object({
  lat: z.number().min(-90, { message: 'Latitude must be between -90 and 90' }).max(90),
  lng: z.number().min(-180, { message: 'Longitude must be between -180 and 180' }).max(180),
  alt: z.number().optional().nullable(),
  timestamp: IsoDateSchema.optional(),
});

export const FitnessActivitySchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  type: z.enum(['walking', 'running', 'cycling', 'hiking', 'swimming']),
  start_time: IsoDateSchema,
  end_time: IsoDateSchema.optional().nullable(),
  distance_meters: z.number().min(0).default(0),
  duration_seconds: z.number().min(0).default(0),
  calories_burned: z.number().min(0).optional().nullable(),
  route_coordinates: z.array(GeoCoordinateSchema).default([]),
});

// Weather / Environmental Engine Models
export const WeatherConditionSchema = z.object({
  temp: z.number(),
  feels_like: z.number(),
  humidity: z.number().min(0).max(100),
  wind_speed: z.number().min(0),
  wind_direction: z.number().min(0).max(360),
  condition: z.enum(['clear', 'clouds', 'rain', 'snow', 'storm', 'mist']),
  icon: z.string(),
});

// ============================================================================
// Enterprise Infrastructure & API Validation Models
// ============================================================================

// Standardized API Payload Envelope
export const ApiResponseMetadataSchema = z.object({
  timestamp: IsoDateSchema,
  processing_time_ms: z.number().nonnegative().optional(),
  page: z.number().positive().optional(),
  per_page: z.number().positive().optional(),
  total_records: z.number().nonnegative().optional(),
});

export const ApiResponseErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

// A robust function to construct generic schema wrappers for enveloped API responses
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema.nullable(),
    error: ApiResponseErrorSchema.nullable(),
    meta: ApiResponseMetadataSchema,
    status: z.enum(['success', 'error'] as const),
  });
}

// Global System Telemetry / Diagnostic Event Schema
export const TelemetryEventSchema = z.object({
  id: UuidSchema,
  event_kind: z.enum(['Auth', 'Sync', 'Navigation', 'Performance', 'Exception'] as const),
  message: z.string().min(1),
  route: z.string().optional(),
  timestamp: IsoDateSchema,
  context_map: z.record(z.string(), z.any()).default({}),
});

// ============================================================================
// TypeScript Types & Custom Discriminated Unions
// ============================================================================

export type AuthCredentials = z.infer<typeof AuthCredentialsSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type PKMTag = z.infer<typeof PKMTagSchema>;
export type PKMNote = z.infer<typeof PKMNoteSchema>;
export type PKMNoteDraft = z.infer<typeof PKMNoteDraftSchema>;
export type FitnessActivity = z.infer<typeof FitnessActivitySchema>;
export type GeoCoordinate = z.infer<typeof GeoCoordinateSchema>;
export type WeatherCondition = z.infer<typeof WeatherConditionSchema>;
export type ApiResponseMetadata = z.infer<typeof ApiResponseMetadataSchema>;
export type ApiResponseError = z.infer<typeof ApiResponseErrorSchema>;
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;

// Discriminated Unions for UI Network/Fetch States
export type AsyncState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null | T; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null | T; error: Error };

// Discriminated Union for Unified Action Payload Trackers
export type SystemAction =
  | { type: 'THEME_SWAP'; payload: { from: string; to: string } }
  | { type: 'SYNC_BEGIN'; payload: { queueLength: number } }
  | { type: 'SYNC_END'; payload: { durationMs: number; successCount: number; failCount: number } }
  | { type: 'AUTH_EXPIRED'; payload: { reason: string } }
  | { type: 'FITNESS_GPS_DRIFT'; payload: { lat: number; lng: number; driftMeters: number } };

// ============================================================================
// Type Guards
// ============================================================================

export function isUserProfile(payload: unknown): payload is UserProfile {
  return UserProfileSchema.safeParse(payload).success;
}

export function isPKMNote(payload: unknown): payload is PKMNote {
  return PKMNoteSchema.safeParse(payload).success;
}

export function isFitnessActivity(payload: unknown): payload is FitnessActivity {
  return FitnessActivitySchema.safeParse(payload).success;
}
