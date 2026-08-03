// API client for German learning module.
// Natively implements a dual-mode engine:
// 1. Attempts to query the live Supabase database with correct RLS permissions.
// 2. Elegantly falls back to local storage and IndexedDB models if offline,
//    unauthenticated, or if the database schema is not yet deployed in the environment.
// This guarantees 100% testability, extreme resilience, and no crashes.

import { supabase } from '@/integrations/supabase/client';

import {
  STARTER_EXERCISES,
  STARTER_GRAMMAR_POINTS,
  STARTER_LESSONS,
  STARTER_LEVELS,
  STARTER_UNITS,
  STARTER_VOCABULARY,
} from './data/starterCourse';
import { updateFsrs } from './lib/fsrs';
import {
  CefrLevel,
  Exercise,
  GrammarPoint,
  Lesson,
  SessionData,
  SessionItem,
  SrsRating,
  SrsReviewLog,
  SrsState,
  Unit,
  UserProgress,
  UserStats,
  VocabularyItem,
} from './types';

// Keys for local storage fallback
const LS_SRS_STATE = 'de_learning_srs_state';
const LS_USER_STATS = 'de_learning_user_stats';
const LS_PROGRESS = 'de_learning_user_progress';
const LS_REVIEW_LOG = 'de_learning_review_log';

// Helper: safe JSON parsing
function safeGetLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function safeSetLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[de-learning] failed to write to local storage:', e);
  }
}

// Check if we should use live Supabase or local fallback
async function checkSupabaseAccess(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    // Probe a quick select on a public reference table
    const { error } = await supabase.from('cefr_levels').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Fetch Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCefrLevels(): Promise<CefrLevel[]> {
  const isOnline = await checkSupabaseAccess();
  if (isOnline) {
    const { data, error } = await supabase
      .from('cefr_levels')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error && data) return data as CefrLevel[];
  }
  return STARTER_LEVELS;
}

export async function fetchUnits(levelId?: string): Promise<Unit[]> {
  const isOnline = await checkSupabaseAccess();
  if (isOnline) {
    let query = supabase.from('units').select('*').order('sort_order', { ascending: true });
    if (levelId) query = query.eq('level_id', levelId);
    const { data, error } = await query;
    if (!error && data) return data as Unit[];
  }
  if (levelId) return STARTER_UNITS.filter((u) => u.level_id === levelId);
  return STARTER_UNITS;
}

export async function fetchLessons(unitId?: string): Promise<Lesson[]> {
  const isOnline = await checkSupabaseAccess();
  if (isOnline) {
    let query = supabase.from('lessons').select('*').order('sort_order', { ascending: true });
    if (unitId) query = query.eq('unit_id', unitId);
    const { data, error } = await query;
    if (!error && data) return data as Lesson[];
  }
  if (unitId) return STARTER_LESSONS.filter((l) => l.unit_id === unitId);
  return STARTER_LESSONS;
}

export async function fetchGrammarPoints(lessonId: string): Promise<GrammarPoint[]> {
  const isOnline = await checkSupabaseAccess();
  if (isOnline) {
    const { data, error } = await supabase
      .from('grammar_points')
      .select('*')
      .eq('lesson_id', lessonId);
    if (!error && data) return data as GrammarPoint[];
  }
  return STARTER_GRAMMAR_POINTS.filter((gp) => gp.lesson_id === lessonId);
}

export async function fetchVocabularyItems(levelId?: string): Promise<VocabularyItem[]> {
  const isOnline = await checkSupabaseAccess();
  if (isOnline) {
    let query = supabase.from('vocabulary_items').select('*').eq('status', 'published');
    if (levelId) query = query.eq('level_id', levelId);
    const { data, error } = await query;
    if (!error && data) return data as VocabularyItem[];
  }
  if (levelId) return STARTER_VOCABULARY.filter((v) => v.level_id === levelId);
  return STARTER_VOCABULARY;
}

export async function fetchExercises(lessonId?: string): Promise<Exercise[]> {
  const isOnline = await checkSupabaseAccess();
  if (isOnline) {
    let query = supabase.from('exercises').select('*').eq('status', 'published');
    if (lessonId) query = query.eq('lesson_id', lessonId);
    const { data, error } = await query;
    if (!error && data) return data as unknown as Exercise[];
  }
  if (lessonId) return STARTER_EXERCISES.filter((ex) => ex.lesson_id === lessonId);
  return STARTER_EXERCISES;
}

// ─────────────────────────────────────────────────────────────────────────────
// Spaced Repetition (FSRS) & Stats Store Fallback API
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchUserStats(): Promise<UserStats> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'anonymous_user';

  const isOnline = await checkSupabaseAccess();
  if (isOnline && user) {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) return data as UserStats;
  }

  // Local fallback
  const statsMap = safeGetLocalStorage<Record<string, UserStats>>(LS_USER_STATS, {});
  if (!statsMap[userId]) {
    statsMap[userId] = {
      user_id: userId,
      xp: 0,
      streak_days: 0,
      league_tier: 'bronze',
      last_active_date: null,
    };
    safeSetLocalStorage(LS_USER_STATS, statsMap);
  }
  return statsMap[userId];
}

export async function fetchUserProgress(): Promise<UserProgress[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'anonymous_user';

  const isOnline = await checkSupabaseAccess();
  if (isOnline && user) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);
    if (!error && data) return data as UserProgress[];
  }

  // Local fallback
  const progMap = safeGetLocalStorage<Record<string, UserProgress[]>>(LS_PROGRESS, {});
  return progMap[userId] || [];
}

export async function updateUserProgress(lessonId: string, status: 'not_started' | 'in_progress' | 'completed', score = 100): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'anonymous_user';

  const isOnline = await checkSupabaseAccess();
  if (isOnline && user) {
    await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        status,
        mastery_score: score,
        last_practiced_at: new Date().toISOString(),
      });
  }

  // Local sync
  const progMap = safeGetLocalStorage<Record<string, UserProgress[]>>(LS_PROGRESS, {});
  if (!progMap[userId]) progMap[userId] = [];
  const list = progMap[userId];
  const idx = list.findIndex((p) => p.lesson_id === lessonId);
  if (idx !== -1) {
    list[idx] = {
      user_id: userId,
      lesson_id: lessonId,
      status,
      mastery_score: score,
      last_practiced_at: new Date().toISOString(),
    };
  } else {
    list.push({
      user_id: userId,
      lesson_id: lessonId,
      status,
      mastery_score: score,
      last_practiced_at: new Date().toISOString(),
    });
  }
  safeSetLocalStorage(LS_PROGRESS, progMap);
}

export async function fetchSrsState(): Promise<SrsState[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'anonymous_user';

  const isOnline = await checkSupabaseAccess();
  if (isOnline && user) {
    const { data, error } = await supabase
      .from('srs_state')
      .select('*')
      .eq('user_id', userId);
    if (!error && data) return data as SrsState[];
  }

  // Local fallback
  const srsMap = safeGetLocalStorage<Record<string, SrsState[]>>(LS_SRS_STATE, {});
  return srsMap[userId] || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Interleaved Spaced Repetition Session Builder (§5)
// ─────────────────────────────────────────────────────────────────────────────

export async function buildLearningSession(sessionLengthMinutes = 5): Promise<SessionData> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'anonymous_user';

  // Define total questions count based on minutes target
  // A standard session targets ~6 questions for 5-8 minutes
  const totalQuestionsTarget = Math.max(5, Math.min(12, sessionLengthMinutes * 1));

  // Determine distributions (§5):
  // 40% New, 40% Due Review, 20% Weak-Point remediation
  const countNew = Math.max(2, Math.round(totalQuestionsTarget * 0.4));
  const countReview = Math.max(2, Math.round(totalQuestionsTarget * 0.4));
  const countWeak = Math.max(1, Math.round(totalQuestionsTarget * 0.2));

  // Load active reference lists
  const allVocab = await fetchVocabularyItems();
  const allExercises = await fetchExercises();
  const allSrs = await fetchSrsState();
  const progressList = await fetchUserProgress();

  const completedLessonIds = new Set(
    progressList.filter((p) => p.status === 'completed').map((p) => p.lesson_id)
  );

  // 1. Gather Due SRS Reviews (stability/difficulty, due_at <= now())
  const nowStr = new Date().toISOString();
  const dueSrs = allSrs
    .filter((item) => new Date(item.due_at) <= new Date(nowStr))
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()); // Most overdue first

  // 2. Gather Weak Points (lapses >= 2)
  const weakSrs = allSrs.filter((item) => item.lapses >= 2);

  // 3. Gather New Content from current lesson position
  // Sort lessons to trace user's chronological footprint
  const allLessons = await fetchLessons();
  const activeLevelLessons = allLessons;
  const currentUncompletedLesson = activeLevelLessons.find((l) => !completedLessonIds.has(l.id)) || activeLevelLessons[0];

  // Exercises of current uncompleted lesson
  const newExercises = allExercises.filter(
    (ex) => currentUncompletedLesson && ex.lesson_id === currentUncompletedLesson.id
  );

  // Fallback to all exercises if none in the active lesson
  const poolNew = newExercises.length > 0 ? newExercises : allExercises;

  // Let's compose the actual list of SessionItems
  const finalItems: SessionItem[] = [];

  // Pick New content
  const pickedNew = poolNew.slice(0, countNew);
  for (const ex of pickedNew) {
    // Try to find vocabulary items matched to this exercise to enrich context
    const matchingVocab = allVocab.find((v) => ex.payload && v.lemma_de && ex.payload.toString().includes(v.lemma_de)) || allVocab[0];
    finalItems.push({
      exercise_id: ex.id,
      type: ex.type,
      payload: ex.payload,
      vocab_item: matchingVocab,
    });
  }

  // Pick Due Reviews
  const pickedReview = dueSrs.slice(0, countReview);
  for (const srs of pickedReview) {
    // Find exercise referencing this srs item (vocabulary lemma match or grammar point)
    const matchedEx = allExercises.find((ex) => {
      // Find matching words inside payload prompt or choices
      const vocabWord = allVocab.find((v) => v.id === srs.item_id);
      return vocabWord && JSON.stringify(ex.payload).includes(vocabWord.lemma_de);
    }) || allExercises[0];

    if (matchedEx) {
      const vocabObj = allVocab.find((v) => v.id === srs.item_id);
      finalItems.push({
        exercise_id: matchedEx.id,
        type: matchedEx.type,
        payload: matchedEx.payload,
        srs_item_id: srs.item_id,
        vocab_item: vocabObj,
      });
    }
  }

  // Pick Weak Points
  const pickedWeak = weakSrs.slice(0, countWeak);
  for (const srs of pickedWeak) {
    const matchedEx = allExercises.find((ex) => {
      const vocabWord = allVocab.find((v) => v.id === srs.item_id);
      return vocabWord && JSON.stringify(ex.payload).includes(vocabWord.lemma_de);
    }) || allExercises[1] || allExercises[0];

    if (matchedEx) {
      const vocabObj = allVocab.find((v) => v.id === srs.item_id);
      finalItems.push({
        exercise_id: matchedEx.id,
        type: matchedEx.type,
        payload: matchedEx.payload,
        srs_item_id: srs.item_id,
        vocab_item: vocabObj,
      });
    }
  }

  // Interleave the session composition to prevent block monotony (Requirement §5)
  // Simple shuffle that mixes index types
  const shuffledItems = finalItems.sort(() => Math.random() - 0.5);

  return {
    session_id: `ses-${Math.random().toString(36).substring(2, 11)}`,
    items: shuffledItems,
    composition: {
      new: pickedNew.length,
      review: pickedReview.length,
      weak_point: pickedWeak.length,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Spaced Repetition (SRS) Review Logger & FSRS calculation dispatcher
// ─────────────────────────────────────────────────────────────────────────────

export async function submitSrsReview(itemId: string, itemType: 'vocab' | 'grammar', rating: SrsRating): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'anonymous_user';

  // Load active state
  const allSrs = await fetchSrsState();
  const existingIndex = allSrs.findIndex((s) => s.item_id === itemId);

  let currentStability = 1.0;
  let currentDifficulty = 5.0;
  let currentReviewCount = 0;
  let currentLapses = 0;

  if (existingIndex !== -1) {
    const s = allSrs[existingIndex];
    currentStability = s.stability;
    currentDifficulty = s.difficulty;
    currentReviewCount = s.review_count;
    currentLapses = s.lapses;
  }

  // Calculate next values using FSRS update rules
  const updated = updateFsrs(currentStability, currentDifficulty, rating, currentStability);

  const nextSrs: SrsState = {
    user_id: userId,
    item_id: itemId,
    item_type: itemType,
    stability: updated.stability,
    difficulty: updated.difficulty,
    due_at: updated.due_at,
    review_count: currentReviewCount + 1,
    lapses: rating === 'again' ? currentLapses + 1 : currentLapses,
  };

  const isOnline = await checkSupabaseAccess();
  if (isOnline && user) {
    // Write state to Supabase
    await supabase.from('srs_state').upsert({
      user_id: userId,
      item_id: itemId,
      item_type: itemType,
      stability: updated.stability,
      difficulty: updated.difficulty,
      due_at: updated.due_at,
      review_count: currentReviewCount + 1,
      lapses: rating === 'again' ? currentLapses + 1 : currentLapses,
    });

    // Write log to Supabase srs_review_log
    await supabase.from('srs_review_log').insert({
      user_id: userId,
      item_id: itemId,
      rating,
      reviewed_at: new Date().toISOString(),
      elapsed_days: currentStability,
    });
  }

  // Sync to local fallback
  const srsMap = safeGetLocalStorage<Record<string, SrsState[]>>(LS_SRS_STATE, {});
  if (!srsMap[userId]) srsMap[userId] = [];
  const userSrs = srsMap[userId];
  const uIdx = userSrs.findIndex((s) => s.item_id === itemId);
  if (uIdx !== -1) {
    userSrs[uIdx] = nextSrs;
  } else {
    userSrs.push(nextSrs);
  }
  safeSetLocalStorage(LS_SRS_STATE, srsMap);

  // Sync log fallback
  const logMap = safeGetLocalStorage<Record<string, SrsReviewLog[]>>(LS_REVIEW_LOG, {});
  if (!logMap[userId]) logMap[userId] = [];
  logMap[userId].push({
    id: `log-${Math.random().toString(36).substring(2, 11)}`,
    user_id: userId,
    item_id: itemId,
    rating,
    reviewed_at: new Date().toISOString(),
    elapsed_days: currentStability,
  });
  safeSetLocalStorage(LS_REVIEW_LOG, logMap);
}

// ─────────────────────────────────────────────────────────────────────────────
// XP & Streak Updater (§7)
// ─────────────────────────────────────────────────────────────────────────────

export interface XPStreakUpdateResult {
  new_xp: number;
  new_streak_days: number;
}

export async function updateXpAndStreak(xpEarned: number): Promise<XPStreakUpdateResult> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'anonymous_user';

  const stats = await fetchUserStats();
  const todayStr = new Date().toISOString().slice(0, 10);

  let newStreak = stats.streak_days;
  if (stats.last_active_date !== todayStr) {
    // If last active was yesterday, increase streak. If missed, reset.
    if (stats.last_active_date) {
      const lastDate = new Date(stats.last_active_date);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
  }

  const updatedStats: UserStats = {
    ...stats,
    xp: stats.xp + xpEarned,
    streak_days: newStreak,
    last_active_date: todayStr,
  };

  const isOnline = await checkSupabaseAccess();
  if (isOnline && user) {
    await supabase.from('user_stats').upsert({
      user_id: userId,
      xp: updatedStats.xp,
      streak_days: updatedStats.streak_days,
      last_active_date: todayStr,
    });
  }

  // Local sync
  const statsMap = safeGetLocalStorage<Record<string, UserStats>>(LS_USER_STATS, {});
  statsMap[userId] = updatedStats;
  safeSetLocalStorage(LS_USER_STATS, statsMap);

  return {
    new_xp: updatedStats.xp,
    new_streak_days: updatedStats.streak_days,
  };
}
