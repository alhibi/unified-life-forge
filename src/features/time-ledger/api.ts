/**
 * Time Ledger API — Unified timeline data access layer.
 *
 * Single chokepoint for all Supabase queries in this feature.
 * Every fetcher below maps a *real* table that exists in the project schema;
 * layers without a backing table are intentionally absent (see TIME_LEDGER_LAYERS).
 */

import { supabase } from '@/integrations/supabase/client';

import {
  type FitnessEntry,
  type HabitEntry,
  type JournalEntry,
  type KnowledgeEntry,
  type QuickCaptureEntry,
  type TimeLedgerDayGroup,
  type TimeLedgerEntry,
  type TimeLedgerQueryFilters,
  type TimeLedgerSource,
  FitnessEntrySchema,
  HabitEntrySchema,
  JournalEntrySchema,
  KnowledgeEntrySchema,
  QuickCaptureEntrySchema,
  TIME_LEDGER_LAYERS,
} from './types';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Schema-agnostic client: several tables here are not in generated types. */
type LooseQuery = {
  select: (cols: string) => LooseQuery;
  eq: (col: string, val: unknown) => LooseQuery;
  gte: (col: string, val: unknown) => LooseQuery;
  lte: (col: string, val: unknown) => LooseQuery;
  order: (col: string, opts: { ascending: boolean }) => LooseQuery;
  limit: (n: number) => LooseQuery;
  insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
  update: (row: Record<string, unknown>) => LooseQuery;
  delete: () => LooseQuery;
  then: <T>(cb: (r: { data: Record<string, unknown>[] | null; error: { message?: string; code?: string } | null }) => T) => Promise<T>;
};

const db = supabase as unknown as { from: (table: string) => LooseQuery };

const ALL_SOURCES: TimeLedgerSource[] = TIME_LEDGER_LAYERS.map((l) => l.source);

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function dateRangeToISO(filters?: TimeLedgerQueryFilters): { start?: string; end?: string } {
  if (!filters?.dateRange) return {};
  return { start: filters.dateRange.start, end: filters.dateRange.end };
}

function applyDateRange(query: LooseQuery, field: string, range?: { start?: string; end?: string }) {
  if (!range) return query;
  if (range.start) query = query.gte(field, range.start);
  if (range.end) query = query.lte(field, range.end);
  return query;
}

function applyLimit(query: LooseQuery, limit?: number) {
  return limit && limit > 0 ? query.limit(limit) : query;
}

/** Per-source budget so one noisy table can never starve the others. */
function sourceLimit(filters?: TimeLedgerQueryFilters): number {
  const total = filters?.limit && filters.limit > 0 ? filters.limit : 400;
  return Math.max(40, Math.ceil(total / 3));
}

function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return error.code === '42P01' || error.code === 'PGRST205' || msg.includes('does not exist') || msg.includes('schema cache');
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v : fallback;
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function iso(v: unknown): string | null {
  if (typeof v !== 'string' || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function tagList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string' && !!t).slice(0, 8) : [];
}

function safeHost(url: unknown): string {
  const raw = str(url);
  if (!raw) return '';
  try {
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Runs a query, swallowing "table missing" as an empty result instead of a crash. */
async function rows(
  build: () => LooseQuery,
  label: string
): Promise<Record<string, unknown>[]> {
  try {
    const { data, error } = await build();
    if (error) {
      if (!isMissingRelation(error)) console.error(`[time-ledger] ${label} fetch failed:`, error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error(`[time-ledger] ${label} fetch threw:`, err);
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Habits — spaced-repetition reviews + German Club mastery
// ──────────────────────────────────────────────────────────────────────────────

async function fetchHabitEntries(uid: string, filters?: TimeLedgerQueryFilters): Promise<HabitEntry[]> {
  const range = dateRangeToISO(filters);
  const cap = sourceLimit(filters);
  const entries: HabitEntry[] = [];

  const reviews = await rows(
    () =>
      applyLimit(
        applyDateRange(
          db.from('srs_review_log').select('id, item_id, rating, reviewed_at').eq('user_id', uid).order('reviewed_at', { ascending: false }),
          'reviewed_at',
          range
        ),
        cap
      ),
    'srs_review_log'
  );

  // Group reviews per day: a single "مراجعة الحفظ" habit row per day is far more
  // readable than dozens of identical rows.
  const reviewsByDay = new Map<string, { count: number; good: number; last: string }>();
  for (const row of reviews) {
    const at = iso(row.reviewed_at);
    if (!at) continue;
    const day = at.slice(0, 10);
    const bucket = reviewsByDay.get(day) ?? { count: 0, good: 0, last: at };
    bucket.count += 1;
    if (row.rating === 'good' || row.rating === 'easy') bucket.good += 1;
    if (at > bucket.last) bucket.last = at;
    reviewsByDay.set(day, bucket);
  }

  for (const [day, bucket] of reviewsByDay) {
    entries.push(
      HabitEntrySchema.parse({
        id: `srs-${day}`,
        source: 'habits',
        timestamp: bucket.last,
        title: 'مراجعة الحفظ',
        description: `${bucket.count} بطاقة، ${bucket.good} منها بإجابة قوية`,
        tags: ['مراجعة'],
        layerColor: 'var(--tl-layer-habits)',
        meta: {
          habitId: 'srs-review',
          habitName: 'مراجعة الحفظ',
          habitType: 'custom',
          completionStatus: bucket.count > 0 ? 'completed' : 'missed',
          targetCount: Math.max(bucket.count, 1),
          completedCount: bucket.count,
          unit: 'بطاقة',
        },
      }) as HabitEntry
    );
  }

  const mastery = await rows(
    () =>
      applyLimit(
        applyDateRange(
          db
            .from('german_club_progress')
            .select('entry_id, is_mastered, last_seen_at')
            .eq('user_id', uid)
            .order('last_seen_at', { ascending: false }),
          'last_seen_at',
          range
        ),
        cap
      ),
    'german_club_progress'
  );

  const masteryByDay = new Map<string, { seen: number; mastered: number; last: string }>();
  for (const row of mastery) {
    const at = iso(row.last_seen_at);
    if (!at) continue;
    const day = at.slice(0, 10);
    const bucket = masteryByDay.get(day) ?? { seen: 0, mastered: 0, last: at };
    bucket.seen += 1;
    if (row.is_mastered === true) bucket.mastered += 1;
    if (at > bucket.last) bucket.last = at;
    masteryByDay.set(day, bucket);
  }

  for (const [day, bucket] of masteryByDay) {
    entries.push(
      HabitEntrySchema.parse({
        id: `german-${day}`,
        source: 'habits',
        timestamp: bucket.last,
        title: 'تدريب المفردات',
        description: `${bucket.seen} مدخل، أُتقن ${bucket.mastered}`,
        tags: ['مفردات'],
        layerColor: 'var(--tl-layer-habits)',
        meta: {
          habitId: 'german-club',
          habitName: 'تدريب المفردات',
          habitType: 'custom',
          completionStatus: bucket.mastered > 0 ? 'completed' : 'partial',
          targetCount: Math.max(bucket.seen, 1),
          completedCount: bucket.mastered,
          unit: 'مدخل',
        },
      }) as HabitEntry
    );
  }

  return entries;
}

// ──────────────────────────────────────────────────────────────────────────────
// Fitness Activities
// ──────────────────────────────────────────────────────────────────────────────

const ACTIVITY_LABELS: Record<string, string> = {
  walking: 'مشي',
  running: 'جري',
  cycling: 'دراجة',
  hiking: 'هايكنج',
  swimming: 'سباحة',
  strength: 'قوة',
  workout: 'تمرين',
  mobility: 'مرونة',
  yoga: 'يوغا',
};

function workoutKind(activityType: string): 'gps' | 'strength' | 'mobility' | 'custom' {
  if (['walking', 'running', 'cycling', 'hiking'].includes(activityType)) return 'gps';
  if (['strength', 'weights', 'gym'].includes(activityType)) return 'strength';
  if (['mobility', 'yoga', 'stretching'].includes(activityType)) return 'mobility';
  return 'custom';
}

async function fetchFitnessEntries(uid: string, filters?: TimeLedgerQueryFilters): Promise<FitnessEntry[]> {
  const range = dateRangeToISO(filters);

  const data = await rows(
    () =>
      applyLimit(
        applyDateRange(
          db
            .from('fitness_activities')
            .select('id, activity_type, source, start_time, end_time, duration_seconds, distance_meters, calories, avg_heart_rate')
            .eq('user_id', uid)
            .order('start_time', { ascending: false }),
          'start_time',
          range
        ),
        sourceLimit(filters)
      ),
    'fitness_activities'
  );

  const out: FitnessEntry[] = [];
  for (const row of data) {
    const start = iso(row.start_time);
    if (!start) continue;

    const activityType = str(row.activity_type, 'workout');
    const distanceMeters = num(row.distance_meters);
    const duration = num(row.duration_seconds);

    out.push(
      FitnessEntrySchema.parse({
        id: `fitness-${str(row.id)}`,
        source: 'fitness',
        timestamp: start,
        endTimestamp: iso(row.end_time) ?? undefined,
        title: ACTIVITY_LABELS[activityType] ?? activityType,
        tags: [activityType, str(row.source)].filter(Boolean),
        layerColor: 'var(--tl-layer-fitness)',
        meta: {
          workoutId: str(row.id),
          workoutType: workoutKind(activityType),
          durationSeconds: duration && duration > 0 ? Math.round(duration) : 1,
          distanceKm: distanceMeters !== undefined ? distanceMeters / 1000 : undefined,
          caloriesKcal: num(row.calories) !== undefined ? Math.round(num(row.calories)!) : undefined,
          avgHeartRate: num(row.avg_heart_rate) ? Math.round(num(row.avg_heart_rate)!) : undefined,
        },
      }) as FitnessEntry
    );
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// Knowledge — reading, bookmarks, archive monographs, notes
// ──────────────────────────────────────────────────────────────────────────────

async function fetchKnowledgeEntries(uid: string, filters?: TimeLedgerQueryFilters): Promise<KnowledgeEntry[]> {
  const range = dateRangeToISO(filters);
  const cap = Math.max(20, Math.ceil(sourceLimit(filters) / 3));
  const entries: KnowledgeEntry[] = [];

  const [readState, bookmarks, monographs, notes] = await Promise.all([
    rows(
      () =>
        applyLimit(
          applyDateRange(
            db.from('reading_read_state').select('article_link, read_at').eq('user_id', uid).order('read_at', { ascending: false }),
            'read_at',
            range
          ),
          cap
        ),
      'reading_read_state'
    ),
    rows(
      () =>
        applyLimit(
          applyDateRange(
            db.from('reading_bookmarks').select('article_link, snapshot, created_at').eq('user_id', uid).order('created_at', { ascending: false }),
            'created_at',
            range
          ),
          cap
        ),
      'reading_bookmarks'
    ),
    rows(
      () =>
        applyLimit(
          applyDateRange(
            db
              .from('archive_documents')
              .select('id, title, abstract, tags, word_count, created_at')
              .eq('user_id', uid)
              .order('created_at', { ascending: false }),
            'created_at',
            range
          ),
          cap
        ),
      'archive_documents'
    ),
    rows(
      () =>
        applyLimit(
          applyDateRange(
            db
              .from('pkm_notes')
              .select('id, title, content_md, updated_at, is_deleted')
              .eq('user_id', uid)
              .order('updated_at', { ascending: false }),
            'updated_at',
            range
          ),
          cap
        ),
      'pkm_notes'
    ),
  ]);

  for (const row of readState) {
    const at = iso(row.read_at);
    if (!at) continue;
    const url = str(row.article_link);
    const host = safeHost(url);
    entries.push(
      KnowledgeEntrySchema.parse({
        id: `reading-${url || at}`,
        source: 'knowledge',
        timestamp: at,
        title: host ? `قراءة من ${host}` : 'قراءة مقالة',
        tags: host ? [host] : [],
        layerColor: 'var(--tl-layer-knowledge)',
        meta: {
          contentType: 'article',
          contentId: url || at,
          contentTitle: host ? `مقالة من ${host}` : 'مقالة',
          sourceName: host || 'قارئ الأخبار',
          url: url || undefined,
          progressPercent: 100,
          isFavorite: false,
          tags: host ? [host] : [],
        },
      }) as KnowledgeEntry
    );
  }

  for (const row of bookmarks) {
    const at = iso(row.created_at);
    if (!at) continue;
    const snapshot = (row.snapshot ?? {}) as Record<string, unknown>;
    const title = str(snapshot.title, 'مقالة محفوظة');
    const url = str(row.article_link) || str(snapshot.link);
    const host = safeHost(url);
    entries.push(
      KnowledgeEntrySchema.parse({
        id: `bookmark-${url || at}`,
        source: 'knowledge',
        timestamp: at,
        title,
        description: str(snapshot.description).slice(0, 200) || undefined,
        tags: ['محفوظ', host].filter(Boolean),
        layerColor: 'var(--tl-layer-knowledge)',
        meta: {
          contentType: 'article',
          contentId: url || at,
          contentTitle: title,
          sourceName: str(snapshot.source_name, host || 'قارئ الأخبار'),
          url: url || undefined,
          isFavorite: true,
          tags: host ? [host] : [],
        },
      }) as KnowledgeEntry
    );
  }

  for (const row of monographs) {
    const at = iso(row.created_at);
    if (!at) continue;
    const title = str(row.title, 'وثيقة أرشيف');
    entries.push(
      KnowledgeEntrySchema.parse({
        id: `archive-${str(row.id)}`,
        source: 'knowledge',
        timestamp: at,
        title,
        description: str(row.abstract).slice(0, 200) || undefined,
        tags: tagList(row.tags),
        layerColor: 'var(--tl-layer-knowledge)',
        meta: {
          contentType: 'monograph',
          contentId: str(row.id),
          contentTitle: title,
          sourceName: 'الأرشيف',
          durationMinutes: num(row.word_count) ? Math.max(1, Math.round(num(row.word_count)! / 220)) : undefined,
          isFavorite: false,
          tags: tagList(row.tags),
        },
      }) as KnowledgeEntry
    );
  }

  for (const row of notes) {
    if (row.is_deleted === true) continue;
    const at = iso(row.updated_at);
    if (!at) continue;
    const title = str(row.title, 'ملاحظة');
    entries.push(
      KnowledgeEntrySchema.parse({
        id: `note-${str(row.id)}`,
        source: 'knowledge',
        timestamp: at,
        title,
        description: str(row.content_md).replace(/[#*_>`]/g, '').slice(0, 200) || undefined,
        tags: ['ملاحظات'],
        layerColor: 'var(--tl-layer-knowledge)',
        meta: {
          contentType: 'note',
          contentId: str(row.id),
          contentTitle: title,
          sourceName: 'الملاحظات',
          isFavorite: false,
          tags: [],
        },
      }) as KnowledgeEntry
    );
  }

  return entries;
}

// ──────────────────────────────────────────────────────────────────────────────
// Journal
// ──────────────────────────────────────────────────────────────────────────────

async function fetchJournalEntries(uid: string, filters?: TimeLedgerQueryFilters): Promise<JournalEntry[]> {
  const range = dateRangeToISO(filters);

  const data = await rows(
    () =>
      applyLimit(
        applyDateRange(
          db
            .from('journal_entries')
            .select('id, title, content, mood, tags, word_count, created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false }),
          'created_at',
          range
        ),
        sourceLimit(filters)
      ),
    'journal_entries'
  );

  const out: JournalEntry[] = [];
  for (const row of data) {
    const at = iso(row.created_at);
    if (!at) continue;
    out.push(
      JournalEntrySchema.parse({
        id: `journal-${str(row.id)}`,
        source: 'journal',
        timestamp: at,
        title: str(row.title, 'مذكرة يومية'),
        description: str(row.content).slice(0, 200) || undefined,
        tags: tagList(row.tags),
        layerColor: 'var(--tl-layer-journal)',
        meta: {
          entryId: str(row.id),
          mood: typeof row.mood === 'string' ? row.mood : undefined,
          wordCount: num(row.word_count) ?? 0,
          hasVoiceNote: false,
          tags: tagList(row.tags),
        },
      }) as JournalEntry
    );
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// Quick Capture
// ──────────────────────────────────────────────────────────────────────────────

async function fetchQuickCaptureEntries(uid: string, filters?: TimeLedgerQueryFilters): Promise<QuickCaptureEntry[]> {
  const range = dateRangeToISO(filters);

  const data = await rows(
    () =>
      applyLimit(
        applyDateRange(
          db
            .from('quick_captures')
            .select('id, title, content, capture_type, is_task, task_completed, task_due_at, voice_transcript, tags, captured_at')
            .eq('user_id', uid)
            .order('captured_at', { ascending: false }),
          'captured_at',
          range
        ),
        sourceLimit(filters)
      ),
    'quick_captures'
  );

  const out: QuickCaptureEntry[] = [];
  for (const row of data) {
    const at = iso(row.captured_at);
    if (!at) continue;
    out.push(
      QuickCaptureEntrySchema.parse({
        id: `capture-${str(row.id)}`,
        source: 'quick-capture',
        timestamp: at,
        title: str(row.title, row.is_task === true ? 'مهمة' : 'ملاحظة'),
        description: str(row.content) || undefined,
        tags: tagList(row.tags),
        layerColor: 'var(--tl-layer-capture)',
        meta: {
          captureType: (['note', 'task', 'idea', 'reminder', 'observation'] as const).includes(
            row.capture_type as 'note'
          )
            ? (row.capture_type as QuickCaptureEntry['meta']['captureType'])
            : 'note',
          isTask: row.is_task === true,
          taskCompleted: row.task_completed === true,
          taskDueAt: iso(row.task_due_at) ?? undefined,
          voiceTranscript: str(row.voice_transcript) || undefined,
        },
      }) as QuickCaptureEntry
    );
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// Grouping
// ──────────────────────────────────────────────────────────────────────────────

export function groupEntriesByDay(entries: TimeLedgerEntry[]): TimeLedgerDayGroup[] {
  const byDate = new Map<string, TimeLedgerEntry[]>();

  for (const entry of entries) {
    const date = entry.timestamp.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(entry);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayEntries]) => {
      const bySource = {} as Record<TimeLedgerSource, number>;
      for (const e of dayEntries) {
        bySource[e.source] = (bySource[e.source] ?? 0) + 1;
      }

      return {
        date,
        entries: [...dayEntries].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
        summary: {
          total: dayEntries.length,
          bySource,
          hasIncompleteTasks: dayEntries.some(
            (e) => e.source === 'quick-capture' && e.meta.isTask && !e.meta.taskCompleted
          ),
          hasUnfinishedHabits: dayEntries.some(
            (e) => e.source === 'habits' && e.meta.completionStatus !== 'completed'
          ),
        },
      };
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

export const timeLedgerApi = {
  /** All timeline entries for the signed-in user, newest first. */
  async fetchTimeline(filters?: TimeLedgerQueryFilters): Promise<TimeLedgerEntry[]> {
    const uid = await currentUserId();
    if (!uid) return [];

    const sources = filters?.sources?.length ? filters.sources : ALL_SOURCES;
    const jobs: Array<Promise<TimeLedgerEntry[]>> = [];

    if (sources.includes('habits')) jobs.push(fetchHabitEntries(uid, filters));
    if (sources.includes('fitness')) jobs.push(fetchFitnessEntries(uid, filters));
    if (sources.includes('knowledge')) jobs.push(fetchKnowledgeEntries(uid, filters));
    if (sources.includes('journal')) jobs.push(fetchJournalEntries(uid, filters));
    if (sources.includes('quick-capture')) jobs.push(fetchQuickCaptureEntries(uid, filters));

    const results = await Promise.all(
      jobs.map((p) =>
        p.catch((e) => {
          console.error('[time-ledger] Fetcher failed:', e);
          return [] as TimeLedgerEntry[];
        })
      )
    );

    const all = results
      .flat()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filters?.searchText?.trim()) {
      const q = filters.searchText.trim().toLowerCase();
      return all.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description ?? '').toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return filters?.limit && filters.limit > 0 ? all.slice(0, filters.limit) : all;
  },

  /** Timeline grouped by day (kept for prefetch helpers/back-compat). */
  async fetchTimelineByDay(filters?: TimeLedgerQueryFilters): Promise<TimeLedgerDayGroup[]> {
    return groupEntriesByDay(await this.fetchTimeline(filters));
  },

  async createQuickCapture(
    entry: Omit<QuickCaptureEntry, 'id' | 'source' | 'layerColor'>
  ): Promise<QuickCaptureEntry> {
    const uid = await currentUserId();
    if (!uid) throw new Error('يجب تسجيل الدخول أولاً');

    const id = crypto.randomUUID();
    const capturedAt = entry.timestamp ?? new Date().toISOString();

    const { error } = await db.from('quick_captures').insert({
      id,
      user_id: uid,
      title: entry.title,
      content: entry.description ?? null,
      capture_type: entry.meta.captureType,
      is_task: entry.meta.isTask,
      task_completed: entry.meta.taskCompleted ?? false,
      task_due_at: entry.meta.taskDueAt ?? null,
      voice_transcript: entry.meta.voiceTranscript || null,
      tags: entry.tags ?? [],
      captured_at: capturedAt,
    });

    if (error) {
      console.error('[time-ledger] Quick capture create failed:', error);
      throw error instanceof Error ? error : new Error('تعذر حفظ الالتقاط');
    }

    return QuickCaptureEntrySchema.parse({
      ...entry,
      id: `capture-${id}`,
      source: 'quick-capture',
      layerColor: 'var(--tl-layer-capture)',
      timestamp: capturedAt,
    }) as QuickCaptureEntry;
  },

  async updateQuickCapture(
    id: string,
    patch: Partial<Pick<QuickCaptureEntry, 'title' | 'description' | 'tags' | 'meta'>>
  ): Promise<void> {
    const uid = await currentUserId();
    if (!uid) throw new Error('يجب تسجيل الدخول أولاً');

    const payload: Record<string, unknown> = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.description !== undefined) payload.content = patch.description;
    if (patch.tags !== undefined) payload.tags = patch.tags;
    if (patch.meta?.isTask !== undefined) payload.is_task = patch.meta.isTask;
    if (patch.meta?.taskCompleted !== undefined) payload.task_completed = patch.meta.taskCompleted;
    if (patch.meta?.taskDueAt !== undefined) payload.task_due_at = patch.meta.taskDueAt ?? null;
    if (patch.meta?.voiceTranscript !== undefined) payload.voice_transcript = patch.meta.voiceTranscript;

    if (Object.keys(payload).length === 0) return;

    const { error } = await db
      .from('quick_captures')
      .update(payload)
      .eq('id', id.replace(/^capture-/, ''))
      .eq('user_id', uid);

    if (error) {
      console.error('[time-ledger] Quick capture update failed:', error);
      throw error instanceof Error ? error : new Error('تعذر تحديث الالتقاط');
    }
  },

  async deleteQuickCapture(id: string): Promise<void> {
    const uid = await currentUserId();
    if (!uid) throw new Error('يجب تسجيل الدخول أولاً');

    const { error } = await db
      .from('quick_captures')
      .delete()
      .eq('id', id.replace(/^capture-/, ''))
      .eq('user_id', uid);

    if (error) {
      console.error('[time-ledger] Quick capture delete failed:', error);
      throw error instanceof Error ? error : new Error('تعذر حذف الالتقاط');
    }
  },
};
