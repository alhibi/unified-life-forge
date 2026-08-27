import { z } from 'zod';

/**
 * Time Ledger — Unified Timeline Types
 *
 * Discriminated Unions for type-safe handling of heterogeneous timeline entries.
 * Every entry carries a `source` discriminant so consumers can exhaustively switch.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Base & Common
// ──────────────────────────────────────────────────────────────────────────────

export type TimeLedgerSource =
  | 'calendar'
  | 'habits'
  | 'fitness'
  | 'weather'
  | 'knowledge'
  | 'quick-capture'
  | 'prayer'
  | 'journal';

export interface TimeLedgerBaseEntry {
  /** Stable unique ID for React keys and reconciliation */
  id: string;
  /** Source discriminant — enables exhaustive switching */
  source: TimeLedgerSource;
  /** ISO timestamp — the moment this entry "happened" or "starts" */
  timestamp: string; // ISO 8601
  /** Optional end timestamp for ranged entries (events, workouts) */
  endTimestamp?: string;
  /** Human-readable title/label */
  title: string;
  /** Optional longer description */
  description?: string;
  /** Tags for filtering and grouping */
  tags: string[];
  /** Visual layer color hint (from livingMindPalette tokens) */
  layerColor: string;
  /** Whether this entry was created locally and not yet synced */
  pendingSync?: boolean;
  /** Metadata specific to the source */
  meta: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Source-Specific Entry Types (Discriminated Union Members)
// ──────────────────────────────────────────────────────────────────────────────

/** Calendar event from Google/Outlook/CalDAV via Supabase */
export interface CalendarEntry extends TimeLedgerBaseEntry {
  source: 'calendar';
  meta: {
    calendarId: string;
    calendarName: string;
    eventId: string;
    location?: string;
    attendees?: string[];
    isAllDay: boolean;
    recurrenceRule?: string;
    status: 'confirmed' | 'tentative' | 'cancelled';
    htmlLink?: string;
  };
}

/** Habit/streak entry from profile feature (streaks, daily adhkar, sunnah) */
export interface HabitEntry extends TimeLedgerBaseEntry {
  source: 'habits';
  meta: {
    habitId: string;
    habitName: string;
    habitType: 'streak' | 'adhkar' | 'sunnah' | 'custom';
    completionStatus: 'completed' | 'partial' | 'missed';
    currentStreak?: number;
    targetCount?: number;
    completedCount?: number;
    unit?: string; // e.g., 'ركعات', 'صفحات', 'كم'
  };
}

/** Fitness workout/activity from fitness feature */
export interface FitnessEntry extends TimeLedgerBaseEntry {
  source: 'fitness';
  meta: {
    workoutId: string;
    workoutType: 'gps' | 'strength' | 'mobility' | 'custom';
    durationSeconds: number;
    distanceKm?: number;
    caloriesKcal?: number;
    avgHeartRate?: number;
    maxHeartRate?: number;
    gpxPath?: string; // stored separately, referenced here
    feeling?: 'great' | 'good' | 'ok' | 'tired' | 'exhausted';
    equipment?: string[];
  };
}

/** Weather snapshot entry — hourly conditions at a point in time */
export interface WeatherEntry extends TimeLedgerBaseEntry {
  source: 'weather';
  meta: {
    temperatureC: number;
    feelsLikeC: number;
    conditionCode: number;
    conditionLabel: string;
    conditionIcon: string;
    humidityPercent: number;
    windKph: number;
    uvIndex: number;
    aqi?: number;
    precipitationMm?: number;
    locationName: string;
    lat: number;
    lng: number;
  };
}

/** Knowledge entry — reading article, podcast episode, archive monograph, PKM note */
export interface KnowledgeEntry extends TimeLedgerBaseEntry {
  source: 'knowledge';
  meta: {
    contentType: 'article' | 'podcast' | 'monograph' | 'note' | 'poem';
    contentId: string;
    contentTitle: string;
    sourceName: string; // feed name, podcast show, archive accession
    author?: string;
    url?: string;
    durationMinutes?: number; // for podcasts
    progressPercent?: number; // 0-100
    isFavorite: boolean;
    tags: string[];
  };
}

/** Quick capture — user-created instantaneous note/task/idea */
export interface QuickCaptureEntry extends TimeLedgerBaseEntry {
  source: 'quick-capture';
  meta: {
    captureType: 'note' | 'task' | 'idea' | 'reminder' | 'observation';
    isTask: boolean;
    taskCompleted?: boolean;
    taskDueAt?: string;
    linkedEntryId?: string; // can link to another timeline entry
    voiceTranscript?: string; // if captured via voice
  };
}

/** Prayer time entry from mihrab/adhkar feature */
export interface PrayerEntry extends TimeLedgerBaseEntry {
  source: 'prayer';
  meta: {
    prayerName: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
    prayerLabelAr: string;
    isCompleted: boolean;
    completionTime?: string;
    locationName: string;
    method: string; // calculation method
  };
}

/** Journal entry from journal feature */
export interface JournalEntry extends TimeLedgerBaseEntry {
  source: 'journal';
  meta: {
    entryId: string;
    mood?: 'great' | 'good' | 'neutral' | 'low' | 'difficult';
    energyLevel?: 1 | 2 | 3 | 4 | 5;
    wordCount: number;
    hasVoiceNote: boolean;
    tags: string[];
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Discriminated Union
// ──────────────────────────────────────────────────────────────────────────────

export type TimeLedgerEntry =
  | CalendarEntry
  | HabitEntry
  | FitnessEntry
  | WeatherEntry
  | KnowledgeEntry
  | QuickCaptureEntry
  | PrayerEntry
  | JournalEntry;

// ──────────────────────────────────────────────────────────────────────────────
// Type Guards (for exhaustive switching in components)
// ──────────────────────────────────────────────────────────────────────────────

export function isCalendarEntry(e: TimeLedgerEntry): e is CalendarEntry {
  return e.source === 'calendar';
}
export function isHabitEntry(e: TimeLedgerEntry): e is HabitEntry {
  return e.source === 'habits';
}
export function isFitnessEntry(e: TimeLedgerEntry): e is FitnessEntry {
  return e.source === 'fitness';
}
export function isWeatherEntry(e: TimeLedgerEntry): e is WeatherEntry {
  return e.source === 'weather';
}
export function isKnowledgeEntry(e: TimeLedgerEntry): e is KnowledgeEntry {
  return e.source === 'knowledge';
}
export function isQuickCaptureEntry(e: TimeLedgerEntry): e is QuickCaptureEntry {
  return e.source === 'quick-capture';
}
export function isPrayerEntry(e: TimeLedgerEntry): e is PrayerEntry {
  return e.source === 'prayer';
}
export function isJournalEntry(e: TimeLedgerEntry): e is JournalEntry {
  return e.source === 'journal';
}

// ──────────────────────────────────────────────────────────────────────────────
// Layer Configuration (for LayerToggleBar)
// ──────────────────────────────────────────────────────────────────────────────

export interface TimeLedgerLayerConfig {
  source: TimeLedgerSource;
  label: string;
  labelAr: string;
  icon: string; // Phosphor icon name as string (resolved in component)
  color: string; // CSS variable or hex from palette
  enabled: boolean;
  description: string;
}

export const TIME_LEDGER_LAYERS: readonly TimeLedgerLayerConfig[] = [
  {
    source: 'calendar',
    label: 'Calendar',
    labelAr: 'التقويم',
    icon: 'Calendar',
    color: 'var(--tl-layer-calendar)',
    enabled: true,
    description: 'أحداث من Google/Outlook/CalDAV',
  },
  {
    source: 'habits',
    label: 'Habits',
    labelAr: 'العادات',
    icon: 'Fire',
    color: 'var(--tl-layer-habits)',
    enabled: true,
    description: 'السِلسلة، الأذكار، السنن اليومية',
  },
  {
    source: 'fitness',
    label: 'Fitness',
    labelAr: 'اللياقة',
    icon: 'Activity',
    color: 'var(--tl-layer-fitness)',
    enabled: true,
    description: 'تمارين GPS، قوة، مرونة',
  },
  {
    source: 'weather',
    label: 'Weather',
    labelAr: 'الطقس',
    icon: 'CloudSun',
    color: 'var(--tl-layer-weather)',
    enabled: true,
    description: 'حالات الطقس ساعة بساعة',
  },
  {
    source: 'knowledge',
    label: 'Knowledge',
    labelAr: 'المعرفة',
    icon: 'BookOpen',
    color: 'var(--tl-layer-knowledge)',
    enabled: true,
    description: 'مقالات، بودكاست، أرشيف، ملاحظات',
  },
  {
    source: 'quick-capture',
    label: 'Capture',
    labelAr: 'التقاط سريع',
    icon: 'PlusCircle',
    color: 'var(--tl-layer-capture)',
    enabled: true,
    description: 'ملاحظات ومهام فورية',
  },
  {
    source: 'prayer',
    label: 'Prayer',
    labelAr: 'الصلوات',
    icon: 'Minaret',
    color: 'var(--tl-layer-prayer)',
    enabled: true,
    description: 'أوقات الصلاة والإكمال',
  },
  {
    source: 'journal',
    label: 'Journal',
    labelAr: 'المذكرة',
    icon: 'Journal',
    color: 'var(--tl-layer-journal)',
    enabled: true,
    description: 'تدوين اليوم والحالة',
  },
] as const;

// ──────────────────────────────────────────────────────────────────────────────
// Query / Filter Types
// ──────────────────────────────────────────────────────────────────────────────

export interface TimeLedgerQueryFilters {
  dateRange?: { start: string; end: string }; // ISO dates
  sources?: TimeLedgerSource[];
  tags?: string[];
  searchText?: string;
  onlyPendingSync?: boolean;
  limit?: number;
  offset?: number;
}

export interface TimeLedgerDayGroup {
  date: string; // YYYY-MM-DD
  entries: TimeLedgerEntry[];
  summary: {
    total: number;
    bySource: Record<TimeLedgerSource, number>;
    hasIncompleteTasks: boolean;
    hasUnfinishedHabits: boolean;
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Zod Schemas for Validation (API boundaries)
// ──────────────────────────────────────────────────────────────────────────────

const TimeLedgerBaseEntrySchema = z.object({
  id: z.string().uuid(),
  source: z.enum([
    'calendar',
    'habits',
    'fitness',
    'weather',
    'knowledge',
    'quick-capture',
    'prayer',
    'journal',
  ]),
  timestamp: z.string().datetime(),
  endTimestamp: z.string().datetime().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).default([]),
  layerColor: z.string().default(''),
  pendingSync: z.boolean().optional(),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export const CalendarEntrySchema = TimeLedgerBaseEntrySchema.extend({
  source: z.literal('calendar'),
  meta: z.object({
    calendarId: z.string(),
    calendarName: z.string(),
    eventId: z.string(),
    location: z.string().optional(),
    attendees: z.array(z.string()).optional(),
    isAllDay: z.boolean(),
    recurrenceRule: z.string().optional(),
    status: z.enum(['confirmed', 'tentative', 'cancelled']),
    htmlLink: z.string().url().optional(),
  }),
});

export const HabitEntrySchema = TimeLedgerBaseEntrySchema.extend({
  source: z.literal('habits'),
  meta: z.object({
    habitId: z.string(),
    habitName: z.string(),
    habitType: z.enum(['streak', 'adhkar', 'sunnah', 'custom']),
    completionStatus: z.enum(['completed', 'partial', 'missed']),
    currentStreak: z.number().int().nonnegative().optional(),
    targetCount: z.number().int().positive().optional(),
    completedCount: z.number().int().nonnegative().optional(),
    unit: z.string().optional(),
  }),
});

export const FitnessEntrySchema = TimeLedgerBaseEntrySchema.extend({
  source: z.literal('fitness'),
  meta: z.object({
    workoutId: z.string(),
    workoutType: z.enum(['gps', 'strength', 'mobility', 'custom']),
    durationSeconds: z.number().int().positive(),
    distanceKm: z.number().nonnegative().optional(),
    caloriesKcal: z.number().int().nonnegative().optional(),
    avgHeartRate: z.number().int().positive().optional(),
    maxHeartRate: z.number().int().positive().optional(),
    gpxPath: z.string().optional(),
    feeling: z.enum(['great', 'good', 'ok', 'tired', 'exhausted']).optional(),
    equipment: z.array(z.string()).optional(),
  }),
});

export const WeatherEntrySchema = TimeLedgerBaseEntrySchema.extend({
  source: z.literal('weather'),
  meta: z.object({
    temperatureC: z.number(),
    feelsLikeC: z.number(),
    conditionCode: z.number().int(),
    conditionLabel: z.string(),
    conditionIcon: z.string(),
    humidityPercent: z.number().int().min(0).max(100),
    windKph: z.number().nonnegative(),
    uvIndex: z.number().min(0).max(11),
    aqi: z.number().int().nonnegative().optional(),
    precipitationMm: z.number().nonnegative().optional(),
    locationName: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
});

export const KnowledgeEntrySchema = TimeLedgerBaseEntrySchema.extend({
  source: z.literal('knowledge'),
  meta: z.object({
    contentType: z.enum(['article', 'podcast', 'monograph', 'note', 'poem']),
    contentId: z.string(),
    contentTitle: z.string(),
    sourceName: z.string(),
    author: z.string().optional(),
    url: z.string().url().optional(),
    durationMinutes: z.number().int().positive().optional(),
    progressPercent: z.number().int().min(0).max(100).optional(),
    isFavorite: z.boolean(),
    tags: z.array(z.string()),
  }),
});

export const QuickCaptureEntrySchema = TimeLedgerBaseEntrySchema.extend({
  source: z.literal('quick-capture'),
  meta: z.object({
    captureType: z.enum(['note', 'task', 'idea', 'reminder', 'observation']),
    isTask: z.boolean(),
    taskCompleted: z.boolean().optional(),
    taskDueAt: z.string().datetime().optional(),
    linkedEntryId: z.string().uuid().optional(),
    voiceTranscript: z.string().optional(),
  }),
});

export const PrayerEntrySchema = TimeLedgerBaseEntrySchema.extend({
  source: z.literal('prayer'),
  meta: z.object({
    prayerName: z.enum(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']),
    prayerLabelAr: z.string(),
    isCompleted: z.boolean(),
    completionTime: z.string().datetime().optional(),
    locationName: z.string(),
    method: z.string(),
  }),
});

export const JournalEntrySchema = TimeLedgerBaseEntrySchema.extend({
  source: z.literal('journal'),
  meta: z.object({
    entryId: z.string().uuid(),
    mood: z.enum(['great', 'good', 'neutral', 'low', 'difficult']).optional(),
    energyLevel: z.number().int().min(1).max(5).optional(),
    wordCount: z.number().int().nonnegative(),
    hasVoiceNote: z.boolean(),
    tags: z.array(z.string()),
  }),
});

export const TimeLedgerEntrySchema = z.discriminatedUnion('source', [
  CalendarEntrySchema,
  HabitEntrySchema,
  FitnessEntrySchema,
  WeatherEntrySchema,
  KnowledgeEntrySchema,
  QuickCaptureEntrySchema,
  PrayerEntrySchema,
  JournalEntrySchema,
]);

export type ValidatedTimeLedgerEntry = z.infer<typeof TimeLedgerEntrySchema>;