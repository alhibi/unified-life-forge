/**
 * Time Ledger API — Unified timeline data access layer.
 *
 * Single chokepoint for all Supabase queries in this feature.
 * Aggregates data from multiple domain tables into TimeLedgerEntry objects.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { WeatherSnapshot } from '@/features/weather/types/WeatherSnapshot';

import {
  type CalendarEntry,
  type FitnessEntry,
  type HabitEntry,
  type JournalEntry,
  type KnowledgeEntry,
  type PrayerEntry,
  type QuickCaptureEntry,
  type TimeLedgerDayGroup,
  type TimeLedgerEntry,
  type TimeLedgerQueryFilters,
  type TimeLedgerSource,
  type WeatherEntry,
  CalendarEntrySchema,
  FitnessEntrySchema,
  HabitEntrySchema,
  JournalEntrySchema,
  KnowledgeEntrySchema,
  PrayerEntrySchema,
  QuickCaptureEntrySchema,
  TimeLedgerEntrySchema,
  WeatherEntrySchema,
} from './types';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const db = supabase as any;

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function dateRangeToISO(filters?: TimeLedgerQueryFilters): { start?: string; end?: string } {
  if (!filters?.dateRange) return {};
  return {
    start: filters.dateRange.start,
    end: filters.dateRange.end,
  };
}

function applyDateRange(query: any, field: string, range?: { start?: string; end?: string }) {
  if (!range) return query;
  if (range.start) query = query.gte(field, range.start);
  if (range.end) query = query.lte(field, range.end);
  return query;
}

function applyLimit(query: any, limit?: number) {
  if (limit && limit > 0) return query.limit(limit);
  return query;
}

// ──────────────────────────────────────────────────────────────────────────────
// Calendar Events
// ──────────────────────────────────────────────────────────────────────────────

async function fetchCalendarEvents(filters?: TimeLedgerQueryFilters): Promise<CalendarEntry[]> {
  const uid = await currentUserId();
  if (!uid) return [];

  const range = dateRangeToISO(filters);

  const { data, error } = await applyLimit(
    applyDateRange(
      db.from('calendar_events').select('*').eq('user_id', uid).order('start_time', { ascending: true }),
      'start_time',
      range
    ),
    filters?.limit
  );

  if (error) {
    console.error('[time-ledger] Calendar fetch failed:', error);
    return [];
  }

  return (data ?? []).map((row: any) => {
    const entry: CalendarEntry = {
      id: row.id,
      source: 'calendar',
      timestamp: row.start_time,
      endTimestamp: row.end_time,
      title: row.title ?? 'بدون عنوان',
      description: row.description,
      tags: Array.isArray(row.tags) ? row.tags : [],
      layerColor: 'var(--tl-layer-calendar)',
      meta: {
        calendarId: row.calendar_id,
        calendarName: row.calendar_name,
        eventId: row.event_id ?? row.id,
        location: row.location,
        attendees: Array.isArray(row.attendees) ? row.attendees : undefined,
        isAllDay: row.is_all_day ?? false,
        recurrenceRule: row.recurrence_rule,
        status: row.status ?? 'confirmed',
        htmlLink: row.html_link,
      },
    };
    return CalendarEntrySchema.parse(entry);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Habits (from profile streaks + dhikr/sunnah)
// ──────────────────────────────────────────────────────────────────────────────

async function fetchHabitEntries(filters?: TimeLedgerQueryFilters): Promise<HabitEntry[]> {
  const uid = await currentUserId();
  if (!uid) return [];

  const range = dateRangeToISO(filters);
  const entries: HabitEntry[] = [];

  // Fetch streak-based habits (daily visits, workouts, etc.)
  const { data: streaks, error: streakError } = await applyLimit(
    applyDateRange(
      db.from('streak_logs').select('*').eq('user_id', uid).order('date_iso', { ascending: true }),
      'date_iso',
      range
    ),
    filters?.limit
  );

  if (!streakError && streaks) {
    for (const row of streaks) {
      const entry: HabitEntry = {
        id: `streak-${row.id}`,
        source: 'habits',
        timestamp: `${row.date_iso}T00:00:00.000Z`,
        title: row.habit_name ?? 'عاده يومية',
        description: row.notes,
        tags: ['streak', row.category].filter(Boolean),
        layerColor: 'var(--tl-layer-habits)',
        meta: {
          habitId: row.habit_id ?? row.id,
          habitName: row.habit_name ?? 'عاده',
          habitType: 'streak',
          completionStatus: row.count > 0 ? 'completed' : 'missed',
          currentStreak: row.current_streak,
          targetCount: row.target_count ?? 1,
          completedCount: row.count,
          unit: row.unit,
        },
      };
      entries.push(HabitEntrySchema.parse(entry));
    }
  }

  // Fetch adhkar/sunnah completions
  const { data: adhkar, error: adhkarError } = await applyLimit(
    applyDateRange(
      db.from('adhkar_completions').select('*').eq('user_id', uid).order('completed_at', { ascending: true }),
      'completed_at',
      range
    ),
    filters?.limit
  );

  if (!adhkarError && adhkar) {
    for (const row of adhkar) {
      const entry: HabitEntry = {
        id: `adhkar-${row.id}`,
        source: 'habits',
        timestamp: row.completed_at,
        title: row.adhkar_name ?? 'ذكر',
        description: row.notes,
        tags: ['adhkar', row.category].filter(Boolean),
        layerColor: 'var(--tl-layer-habits)',
        meta: {
          habitId: row.adhkar_id ?? row.id,
          habitName: row.adhkar_name ?? 'ذكر',
          habitType: 'adhkar',
          completionStatus: 'completed',
          targetCount: row.target_count ?? 1,
          completedCount: row.completed_count ?? 1,
          unit: 'مرات',
        },
      };
      entries.push(HabitEntrySchema.parse(entry));
    }
  }

  // Fetch sunnah completions
  const { data: sunnah, error: sunnahError } = await applyLimit(
    applyDateRange(
      db.from('sunnah_completions').select('*').eq('user_id', uid).order('completed_at', { ascending: true }),
      'completed_at',
      range
    ),
    filters?.limit
  );

  if (!sunnahError && sunnah) {
    for (const row of sunnah) {
      const entry: HabitEntry = {
        id: `sunnah-${row.id}`,
        source: 'habits',
        timestamp: row.completed_at,
        title: row.sunnah_name ?? 'سنة',
        description: row.notes,
        tags: ['sunnah', row.category].filter(Boolean),
        layerColor: 'var(--tl-layer-habits)',
        meta: {
          habitId: row.sunnah_id ?? row.id,
          habitName: row.sunnah_name ?? 'سنة',
          habitType: 'sunnah',
          completionStatus: 'completed',
          targetCount: row.target_count ?? 1,
          completedCount: row.completed_count ?? 1,
          unit: 'مرات',
        },
      };
      entries.push(HabitEntrySchema.parse(entry));
    }
  }

  return entries;
}

// ──────────────────────────────────────────────────────────────────────────────
// Fitness Activities
// ──────────────────────────────────────────────────────────────────────────────

async function fetchFitnessEntries(filters?: TimeLedgerQueryFilters): Promise<FitnessEntry[]> {
  const uid = await currentUserId();
  if (!uid) return [];

  const range = dateRangeToISO(filters);

  const { data, error } = await applyLimit(
    applyDateRange(
      db.from('fitness_activities').select('*').eq('user_id', uid).order('start_time', { ascending: true }),
      'start_time',
      range
    ),
    filters?.limit
  );

  if (error) {
    console.error('[time-ledger] Fitness fetch failed:', error);
    return [];
  }

  return (data ?? []).map((row: any) => {
    const entry: FitnessEntry = {
      id: row.id,
      source: 'fitness',
      timestamp: row.start_time,
      endTimestamp: row.end_time,
      title: row.name ?? 'تمرين',
      description: row.notes,
      tags: Array.isArray(row.tags) ? row.tags : [row.workout_type].filter(Boolean),
      layerColor: 'var(--tl-layer-fitness)',
      meta: {
        workoutId: row.id,
        workoutType: row.workout_type,
        durationSeconds: row.duration_seconds ?? 0,
        distanceKm: row.distance_meters ? row.distance_meters / 1000 : undefined,
        caloriesKcal: row.calories,
        avgHeartRate: row.avg_heart_rate,
        maxHeartRate: row.max_heart_rate,
        gpxPath: row.gpx_path,
        feeling: row.feeling,
        equipment: Array.isArray(row.equipment) ? row.equipment : undefined,
      },
    };
    return FitnessEntrySchema.parse(entry);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Weather Snapshots (hourly for the date range)
// ──────────────────────────────────────────────────────────────────────────────

async function fetchWeatherEntries(filters?: TimeLedgerQueryFilters): Promise<WeatherEntry[]> {
  const uid = await currentUserId();
  if (!uid) return [];

  const range = dateRangeToISO(filters);

  // Weather snapshots are stored per location per hour
  const { data, error } = await applyLimit(
    applyDateRange(
      db.from('weather_snapshots').select('*').eq('user_id', uid).order('timestamp_unix', { ascending: true }),
      'timestamp_unix',
      range
    ),
    filters?.limit
  );

  if (error) {
    console.error('[time-ledger] Weather fetch failed:', error);
    return [];
  }

  return (data ?? []).map((row: any) => {
    const snapshot = row.snapshot as WeatherSnapshot;
    if (!snapshot) return null;

    const entry: WeatherEntry = {
      id: row.id,
      source: 'weather',
      timestamp: new Date(row.timestamp_unix * 1000).toISOString(),
      title: `طقس: ${snapshot.temperature.actual_c.toFixed(1)}°م، ${snapshot.sky.cloud_type}`,
      description: `رطوبة ${snapshot.moisture.relative_humidity_percent}%، رياح ${snapshot.wind.speed_kph} كم/س`,
      tags: ['weather', snapshot.sky.cloud_type, snapshot.temperature.thermal_comfort_level].filter(Boolean),
      layerColor: 'var(--tl-layer-weather)',
      meta: {
        temperatureC: snapshot.temperature.actual_c,
        feelsLikeC: snapshot.temperature.feels_like_c,
        conditionCode: snapshot.sky.cloud_cover_total_percent,
        conditionLabel: snapshot.sky.cloud_type,
        conditionIcon: '', // resolved in UI
        humidityPercent: snapshot.moisture.relative_humidity_percent,
        windKph: snapshot.wind.speed_kph,
        uvIndex: snapshot.solar.uv_index,
        aqi: snapshot.airQuality.aqi_us,
        precipitationMm: snapshot.precipitation.accumulation_1h_mm,
        locationName: row.location_name ?? 'موقع غير معروف',
        lat: snapshot.meta.location.lat,
        lng: snapshot.meta.location.lng,
      },
    };
    return WeatherEntrySchema.parse(entry);
  }).filter((e: WeatherEntry | null): e is WeatherEntry => e !== null);
}

// ──────────────────────────────────────────────────────────────────────────────
// Knowledge (Reading, Podcasts, Archive, PKM)
// ──────────────────────────────────────────────────────────────────────────────

async function fetchKnowledgeEntries(filters?: TimeLedgerQueryFilters): Promise<KnowledgeEntry[]> {
  const uid = await currentUserId();
  if (!uid) return [];

  const range = dateRangeToISO(filters);
  const entries: KnowledgeEntry[] = [];

  // Reading articles (read_state timestamps)
  const { data: readState, error: readError } = await applyLimit(
    applyDateRange(
      db.from('reading_read_state').select('*').eq('user_id', uid).order('read_at', { ascending: true }),
      'read_at',
      range
    ),
    filters?.limit
  );

  if (!readError && readState) {
    for (const row of readState) {
      const entry: KnowledgeEntry = {
        id: `reading-${row.id}`,
        source: 'knowledge',
        timestamp: row.read_at,
        title: `مقالة: ${row.article_title ?? 'بدون عنوان'}`,
        description: row.article_summary,
        tags: ['article', 'reading', ...(Array.isArray(row.tags) ? row.tags : [])].filter(Boolean),
        layerColor: 'var(--tl-layer-knowledge)',
        meta: {
          contentType: 'article',
          contentId: row.article_link,
          contentTitle: row.article_title ?? 'بدون عنوان',
          sourceName: row.feed_name ?? 'مصدر غير معروف',
          author: row.author,
          url: row.article_link,
          isFavorite: false,
          tags: Array.isArray(row.tags) ? row.tags : [],
        },
      };
      entries.push(KnowledgeEntrySchema.parse(entry));
    }
  }

  // Podcast listening history
  const { data: podcasts, error: podError } = await applyLimit(
    applyDateRange(
      db.from('podcast_history').select('*').eq('user_id', uid).order('listened_at', { ascending: true }),
      'listened_at',
      range
    ),
    filters?.limit
  );

  if (!podError && podcasts) {
    for (const row of podcasts) {
      const entry: KnowledgeEntry = {
        id: `podcast-${row.id}`,
        source: 'knowledge',
        timestamp: row.listened_at,
        title: `حلقة: ${row.episode_title ?? 'بدون عنوان'}`,
        description: row.episode_description,
        tags: ['podcast', row.show_name].filter(Boolean),
        layerColor: 'var(--tl-layer-knowledge)',
        meta: {
          contentType: 'podcast',
          contentId: row.episode_id,
          contentTitle: row.episode_title ?? 'بدون عنوان',
          sourceName: row.show_name,
          author: row.author,
          url: row.episode_url,
          durationMinutes: row.duration_minutes,
          progressPercent: row.progress_percent,
          isFavorite: row.is_favorite ?? false,
          tags: ['podcast', row.show_name].filter(Boolean),
        },
      };
      entries.push(KnowledgeEntrySchema.parse(entry));
    }
  }

  // Archive monographs
  const { data: archive, error: archiveError } = await applyLimit(
    applyDateRange(
      db.from('archive_monographs').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
      'created_at',
      range
    ),
    filters?.limit
  );

  if (!archiveError && archive) {
    for (const row of archive) {
      const entry: KnowledgeEntry = {
        id: `archive-${row.id}`,
        source: 'knowledge',
        timestamp: row.created_at,
        title: `أرشيف: ${row.title ?? 'بدون عنوان'}`,
        description: row.summary,
        tags: ['archive', 'monograph', ...(Array.isArray(row.tags) ? row.tags : [])].filter(Boolean),
        layerColor: 'var(--tl-layer-knowledge)',
        meta: {
          contentType: 'monograph',
          contentId: row.id,
          contentTitle: row.title ?? 'بدون عنوان',
          sourceName: 'الأرشيف المعرفي',
          author: row.author,
          url: `/archive/${row.id}`,
          isFavorite: row.is_favorite ?? false,
          tags: Array.isArray(row.tags) ? row.tags : [],
        },
      };
      entries.push(KnowledgeEntrySchema.parse(entry));
    }
  }

  return entries;
}

// ──────────────────────────────────────────────────────────────────────────────
// Prayer Times Completions
// ──────────────────────────────────────────────────────────────────────────────

async function fetchPrayerEntries(filters?: TimeLedgerQueryFilters): Promise<PrayerEntry[]> {
  const uid = await currentUserId();
  if (!uid) return [];

  const range = dateRangeToISO(filters);

  const { data, error } = await applyLimit(
    applyDateRange(
      db.from('prayer_completions').select('*').eq('user_id', uid).order('prayer_time', { ascending: true }),
      'prayer_time',
      range
    ),
    filters?.limit
  );

  if (error) {
    console.error('[time-ledger] Prayer fetch failed:', error);
    return [];
  }

  return (data ?? []).map((row: any) => {
    const entry: PrayerEntry = {
      id: row.id,
      source: 'prayer',
      timestamp: row.prayer_time,
      title: `صلاة ${row.prayer_label_ar ?? row.prayer_name}`,
      description: row.notes,
      tags: ['prayer', row.prayer_name].filter(Boolean),
      layerColor: 'var(--tl-layer-prayer)',
      meta: {
        prayerName: row.prayer_name,
        prayerLabelAr: row.prayer_label_ar,
        isCompleted: row.is_completed ?? false,
        completionTime: row.completed_at,
        locationName: row.location_name ?? 'غير معروف',
        method: row.calculation_method ?? 'muslim_world_league',
      },
    };
    return PrayerEntrySchema.parse(entry);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Journal Entries
// ──────────────────────────────────────────────────────────────────────────────

async function fetchJournalEntries(filters?: TimeLedgerQueryFilters): Promise<JournalEntry[]> {
  const uid = await currentUserId();
  if (!uid) return [];

  const range = dateRangeToISO(filters);

  const { data, error } = await applyLimit(
    applyDateRange(
      db.from('journal_entries').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
      'created_at',
      range
    ),
    filters?.limit
  );

  if (error) {
    console.error('[time-ledger] Journal fetch failed:', error);
    return [];
  }

  return (data ?? []).map((row: any) => {
    const entry: JournalEntry = {
      id: row.id,
      source: 'journal',
      timestamp: row.created_at,
      title: row.title ?? 'مذكرة يومية',
      description: row.content?.slice(0, 200),
      tags: Array.isArray(row.tags) ? row.tags : [],
      layerColor: 'var(--tl-layer-journal)',
      meta: {
        entryId: row.id,
        mood: row.mood,
        energyLevel: row.energy_level,
        wordCount: row.word_count ?? 0,
        hasVoiceNote: row.has_voice_note ?? false,
        tags: Array.isArray(row.tags) ? row.tags : [],
      },
    };
    return JournalEntrySchema.parse(entry);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Quick Capture (local-first, synced via outbox)
// ──────────────────────────────────────────────────────────────────────────────

async function fetchQuickCaptureEntries(filters?: TimeLedgerQueryFilters): Promise<QuickCaptureEntry[]> {
  const uid = await currentUserId();
  if (!uid) return [];

  const range = dateRangeToISO(filters);

  const { data, error } = await applyLimit(
    applyDateRange(
      db.from('quick_captures').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
      'created_at',
      range
    ),
    filters?.limit
  );

  if (error) {
    console.error('[time-ledger] Quick capture fetch failed:', error);
    return [];
  }

  return (data ?? []).map((row: any) => {
    const entry: QuickCaptureEntry = {
      id: row.id,
      source: 'quick-capture',
      timestamp: row.created_at,
      title: row.title ?? (row.is_task ? 'مهمة' : 'ملاحظة'),
      description: row.content,
      tags: Array.isArray(row.tags) ? row.tags : [],
      layerColor: 'var(--tl-layer-capture)',
      pendingSync: row.pending_sync ?? false,
      meta: {
        captureType: row.capture_type,
        isTask: row.is_task ?? false,
        taskCompleted: row.task_completed ?? false,
        taskDueAt: row.task_due_at,
        linkedEntryId: row.linked_entry_id,
        voiceTranscript: row.voice_transcript,
      },
    };
    return QuickCaptureEntrySchema.parse(entry);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

export const timeLedgerApi = {
  /**
   * Fetch all timeline entries for the current user, merged and sorted by timestamp.
   * This is the primary query for the TimeLedgerView.
   */
  async fetchTimeline(filters?: TimeLedgerQueryFilters): Promise<TimeLedgerEntry[]> {
    const sources = filters?.sources ?? [
      'calendar',
      'habits',
      'fitness',
      'weather',
      'knowledge',
      'quick-capture',
      'prayer',
      'journal',
    ];

    const fetchers: Array<() => Promise<TimeLedgerEntry[]>> = [];

    if (sources.includes('calendar')) fetchers.push(() => fetchCalendarEvents(filters));
    if (sources.includes('habits')) fetchers.push(() => fetchHabitEntries(filters));
    if (sources.includes('fitness')) fetchers.push(() => fetchFitnessEntries(filters));
    if (sources.includes('weather')) fetchers.push(() => fetchWeatherEntries(filters));
    if (sources.includes('knowledge')) fetchers.push(() => fetchKnowledgeEntries(filters));
    if (sources.includes('quick-capture')) fetchers.push(() => fetchQuickCaptureEntries(filters));
    if (sources.includes('prayer')) fetchers.push(() => fetchPrayerEntries(filters));
    if (sources.includes('journal')) fetchers.push(() => fetchJournalEntries(filters));

    const results = await Promise.all(fetchers.map(f => f().catch(e => {
      console.error('[time-ledger] Fetcher failed:', e);
      return [] as TimeLedgerEntry[];
    })));

    // Flatten, sort by timestamp (newest first), and apply global limit
    const allEntries = results.flat()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filters?.limit && filters.limit > 0) {
      return allEntries.slice(0, filters.limit);
    }
    return allEntries;
  },

  /**
   * Fetch timeline grouped by day (for DayCard rendering).
   */
  async fetchTimelineByDay(filters?: TimeLedgerQueryFilters): Promise<TimeLedgerDayGroup[]> {
    const entries = await this.fetchTimeline(filters);

    // Group by date (YYYY-MM-DD)
    const byDate = new Map<string, TimeLedgerEntry[]>();

    for (const entry of entries) {
      const date = entry.timestamp.split('T')[0];
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(entry);
    }

    // Build day groups sorted by date (newest first)
    const dayGroups: TimeLedgerDayGroup[] = Array.from(byDate.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, entries]) => {
        const bySource: Record<string, number> = {};
        for (const e of entries) {
          bySource[e.source] = (bySource[e.source] ?? 0) + 1;
        }

        return {
          date,
          entries,
          summary: {
            total: entries.length,
            bySource: bySource as Record<TimeLedgerSource, number>,
            hasIncompleteTasks: entries.some(
              e => e.source === 'quick-capture' && e.meta.isTask && !e.meta.taskCompleted
            ),
            hasUnfinishedHabits: entries.some(
              e => e.source === 'habits' && e.meta.completionStatus !== 'completed'
            ),
          },
        };
      });

    return dayGroups;
  },

  /**
   * Create a quick capture entry (optimistic local write, then sync).
   */
  async createQuickCapture(entry: Omit<QuickCaptureEntry, 'id' | 'source' | 'layerColor'>): Promise<QuickCaptureEntry> {
    const uid = await currentUserId();
    if (!uid) throw new Error('يجب تسجيل الدخول أولاً');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newEntry: QuickCaptureEntry = {
      ...entry,
      id,
      source: 'quick-capture',
      layerColor: 'var(--tl-layer-capture)',
      timestamp: entry.timestamp ?? now,
    };

    // Optimistic local insert
    const { error } = await db.from('quick_captures').insert({
      id,
      user_id: uid,
      title: newEntry.title,
      content: newEntry.description ?? '',
      capture_type: newEntry.meta.captureType,
      is_task: newEntry.meta.isTask,
      task_completed: newEntry.meta.taskCompleted ?? false,
      task_due_at: newEntry.meta.taskDueAt,
      linked_entry_id: newEntry.meta.linkedEntryId,
      voice_transcript: newEntry.meta.voiceTranscript,
      tags: newEntry.tags,
      pending_sync: true,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      console.error('[time-ledger] Quick capture create failed:', error);
      throw error;
    }

    // Enqueue for background sync (via existing PKM sync engine pattern)
    window.dispatchEvent(new CustomEvent('time-ledger:quick-capture-created', { detail: newEntry }));

    return QuickCaptureEntrySchema.parse(newEntry);
  },

  /**
   * Update a quick capture entry (toggle task completion, etc.)
   */
  async updateQuickCapture(id: string, patch: Partial<Pick<QuickCaptureEntry, 'title' | 'description' | 'tags' | 'meta'>>): Promise<void> {
    const uid = await currentUserId();
    if (!uid) throw new Error('يجب تسجيل الدخول أولاً');

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      pending_sync: true,
    };

    if (patch.title !== undefined) updatePayload.title = patch.title;
    if (patch.description !== undefined) updatePayload.content = patch.description;
    if (patch.tags !== undefined) updatePayload.tags = patch.tags;
    if (patch.meta) {
      if (patch.meta.isTask !== undefined) updatePayload.is_task = patch.meta.isTask;
      if (patch.meta.taskCompleted !== undefined) updatePayload.task_completed = patch.meta.taskCompleted;
      if (patch.meta.taskDueAt !== undefined) updatePayload.task_due_at = patch.meta.taskDueAt;
      if (patch.meta.voiceTranscript !== undefined) updatePayload.voice_transcript = patch.meta.voiceTranscript;
    }

    const { error } = await db.from('quick_captures').update(updatePayload).eq('id', id).eq('user_id', uid);

    if (error) {
      console.error('[time-ledger] Quick capture update failed:', error);
      throw error;
    }

    window.dispatchEvent(new CustomEvent('time-ledger:quick-capture-updated', { detail: { id, patch } }));
  },

  /**
   * Delete a quick capture entry.
   */
  async deleteQuickCapture(id: string): Promise<void> {
    const uid = await currentUserId();
    if (!uid) throw new Error('يجب تسجيل الدخول أولاً');

    const { error } = await db.from('quick_captures').delete().eq('id', id).eq('user_id', uid);

    if (error) {
      console.error('[time-ledger] Quick capture delete failed:', error);
      throw error;
    }

    window.dispatchEvent(new CustomEvent('time-ledger:quick-capture-deleted', { detail: { id } }));
  },
};