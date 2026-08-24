/**
 * Streak Engine — deep, multi-module commitment streak system.
 * ---------------------------------------------------------------------------
 * Computes per-module and unified daily streaks from the SAME real activity
 * data that powers the contribution matrix (activityAggregator). No fake
 * numbers: every streak is derived from dated events across all modules.
 * 
 * Now with caching for performance optimization.
 * Design principles:
 *  • Pure functions → fully unit-testable (no localStorage reads here).
 *  • Grace-period semantics: "today not yet logged" never breaks a live
 *    streak; the streak only breaks after a full missed day.
 *  • Milestones follow a doubling-ish rhythm (3,7,14,30,60,100,180,365)
 *    with Arabic labels used across the UI in one place.
 *  • Momentum analysis detects weekday rhythm + trend so the UI can show
 *    real insight ("أيام الأحد هي أقوى أيامك") instead of raw counts.
 *  • Risk detection answers "هل سلسلتي في خطر الليلة؟" precisely.
 */
import type { ActivityCategory, DailyContribution } from '../types';
import { toLocalDateISO } from './visitTracker';
import { streakCache, sessionStreakCache, PROFILE_CACHE_TTLs } from '../lib/cache';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface StreakMilestone {
  days: number;
  labelAr: string;
}

export interface ModuleStreak {
  category: ActivityCategory;
  /** Currently active consecutive-day streak (grace-aware for today). */
  currentStreakDays: number;
  /** Best streak ever recorded within the available data window. */
  longestStreakDays: number;
  /** Total distinct active days for this module. */
  activeDaysCount: number;
  /** Total weighted contributions across the window. */
  totalContributions: number;
  /** Next milestone target & remaining days. Null when everything unlocked. */
  nextMilestone: StreakMilestone | null;
  lastActiveDateISO: string | null;
}

export type StreakRiskLevel = 'safe' | 'warning' | 'critical' | 'frozen';

export interface StreakRisk {
  level: StreakRiskLevel;
  /** True when today has no activity yet but yesterday keeps the chain alive. */
  atRiskToday: boolean;
  /** Human explanation in Arabic, ready to render. */
  messageAr: string;
}

export interface WeeklyRhythm {
  /** Average contributions indexed by day of week, 0 = Sunday … 6 = Saturday. */
  averagesByDayOfWeek: number[];
  /** Index of the strongest weekday habit (highest average). */
  strongestDayIndex: number;
  /** Arabic name of the strongest weekday. */
  strongestDayNameAr: string;
  /** Index of the weakest weekday habit (lowest average). */
  weakestDayIndex: number;
  /** Arabic name of the weakest weekday. */
  weakestDayNameAr: string;
}

export interface UnifiedStreak {
  currentStreakDays: number;
  longestStreakDays: number;
  activeDaysCount: number;
  totalContributions: number;
  nextMilestone: StreakMilestone | null;
  risk: StreakRisk;
}

export interface StreakSnapshot {
  unified: UnifiedStreak;
  modules: ModuleStreak[];
  rhythm: WeeklyRhythm;
  /** The single best day in the whole window (golden day). */
  bestDay: DailyContribution | null;
  /** ISO date of the most recent active day (today included). */
  lastActiveDateISO: string | null;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const STREAK_MILESTONES: readonly StreakMilestone[] = [
  { days: 3, labelAr: 'شرارة البداية' },
  { days: 7, labelAr: 'أسبوع الالتزام' },
  { days: 14, labelAr: 'عقد النية' },
  { days: 30, labelAr: 'شهر الصلابة' },
  { days: 60, labelAr: 'جبل العادة' },
  { days: 100, labelAr: 'مئة يوم من الضياء' },
  { days: 180, labelAr: 'نصف عام من الثبات' },
  { days: 365, labelAr: 'سنة كاملة من الإتقان' },
] as const;

const WEEKDAY_NAMES_AR = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
] as const;

/** Modules that participate in per-module streaks (order = display order). */
export const STREAK_MODULE_CATEGORIES: readonly ActivityCategory[] = [
  'visits',
  'spiritual',
  'german',
  'fitness',
  'diwan',
  'pkm',
  'atlas',
] as const;

const MODULE_LABELS_AR: Partial<Record<ActivityCategory, string>> = {
  visits: 'زيارات التطبيق',
  spiritual: 'الأذكار والقرآن',
  german: 'النادي الألماني',
  fitness: 'اللياقة',
  diwan: 'الديوان',
  pkm: 'الذاكرة',
  atlas: 'أطلس الأسفار',
};

export function getModuleLabelAr(category: ActivityCategory): string {
  return MODULE_LABELS_AR[category] || 'نشاطات';
}

function shiftDate(base: Date, deltaDays: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + deltaDays);
  return d;
}

/* ------------------------------------------------------------------ */
/* Core streak computation                                             */
/* ------------------------------------------------------------------ */

/**
 * Counts the consecutive active-day run ending at `endDateISO` (inclusive),
 * walking backwards through `activeSet`. A missing *today* is tolerated via
 * `allowGrace`: if endDate itself is inactive but yesterday is, the chain
 * from yesterday still counts — this is what keeps a live streak alive
 * until the day truly ends with zero activity.
 */
export function countConsecutiveDays(
  activeSet: ReadonlySet<string>,
  endDateISO: string,
  allowGrace: boolean
): number {
  let cursor = new Date(`${endDateISO}T00:00:00`);

  if (!activeSet.has(endDateISO)) {
    if (!allowGrace) return 0;
    cursor = shiftDate(cursor, -1);
    if (!activeSet.has(toLocalDateISO(cursor))) return 0;
  }

  let streak = 0;
  // Hard cap at 40 years to guarantee termination even on corrupt input.
  for (let i = 0; i < 365 * 40; i++) {
    if (!activeSet.has(toLocalDateISO(cursor))) break;
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive dates anywhere inside `activeSet`. */
export function findLongestRun(activeSet: ReadonlySet<string>): number {
  if (activeSet.size === 0) return 0;

  const sorted = Array.from(activeSet).sort();
  let longest = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00`);
    const curr = new Date(`${sorted[i]}T00:00:00`);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }
  return longest;
}

function resolveNextMilestone(currentDays: number): StreakMilestone | null {
  for (const m of STREAK_MILESTONES) {
    if (currentDays < m.days) return m;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Risk assessment                                                     */
/* ------------------------------------------------------------------ */

/**
 * Answers precisely: "Is my streak in danger right now?"
 *  • safe      → today already has activity.
 *  • warning   → no activity today, several hours of daylight remain.
 *  • critical  → no activity today and it's late evening/night.
 *  • frozen    → past midnight into the early hours; yesterday's activity
 *                still carries the chain but today just began.
 */
export function assessStreakRisk(
  activeSet: ReadonlySet<string>,
  now: Date = new Date()
): StreakRisk {
  const todayISO = toLocalDateISO(now);
  const yesterdayISO = toLocalDateISO(shiftDate(now, -1));

  const todayActive = activeSet.has(todayISO);
  const yesterdayActive = activeSet.has(yesterdayISO);

  if (todayActive) {
    return {
      level: 'safe',
      atRiskToday: false,
      messageAr: 'سلسلة اليوم مؤمّنة — واصل على البركة.',
    };
  }

  const hour = now.getHours();

  // Early hours (before 5am): the user is probably up late; yesterday still holds.
  if (hour < 5) {
    return yesterdayActive
      ? {
          level: 'frozen',
          atRiskToday: true,
          messageAr: 'ما زلت في ليلتك — سلسلة أمس محفوظة حتى الفجر.',
        }
      : {
          level: 'safe',
          atRiskToday: false,
          messageAr: 'بداية يوم جديدة — اطبع علامتك الأولى.',
        };
  }

  if (!yesterdayActive) {
    return {
      level: 'safe',
      atRiskToday: false,
      messageAr: 'لا توجد سلسلة نشطة حالياً — اليوم فرصتك لبدء واحدة جديدة.',
    };
  }

  if (hour >= 20) {
    return {
      level: 'critical',
      atRiskToday: true,
      messageAr: 'سلسلتك على المحك! تبقّى القليل قبل منتصف الليل لتُبقيها حيّة.',
    };
  }

  return {
    level: 'warning',
    atRiskToday: true,
    messageAr: 'لم تُسجّل نشاط اليوم بعد — نشاط واحد يُبقي السلسلة مشتعلة.',
  };
}

/* ------------------------------------------------------------------ */
/* Weekly rhythm analysis                                              */
/* ------------------------------------------------------------------ */

export function analyzeWeeklyRhythm(
  dailyContributions: readonly DailyContribution[]
): WeeklyRhythm {
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];

  for (const day of dailyContributions) {
    const dow = day.dayOfWeek;
    if (dow < 0 || dow > 6) continue;
    sums[dow] += day.count;
    counts[dow]++;
  }

  const averagesByDayOfWeek = sums.map((s, i) =>
    counts[i] > 0 ? Math.round((s / counts[i]) * 10) / 10 : 0
  );

  const nonZero = averagesByDayOfWeek.some((a) => a > 0);
  let strongestDayIndex = 0;
  let weakestDayIndex = 0;

  if (nonZero) {
    averagesByDayOfWeek.forEach((avg, idx) => {
      if (avg > averagesByDayOfWeek[strongestDayIndex]) strongestDayIndex = idx;
    });
    // Weakest = lowest average among days that actually have samples.
    const firstSampledIdx = averagesByDayOfWeek.findIndex((_, i) => counts[i] > 0);
    weakestDayIndex = firstSampledIdx === -1 ? 0 : firstSampledIdx;
    averagesByDayOfWeek.forEach((avg, idx) => {
      if (counts[idx] > 0 && avg < averagesByDayOfWeek[weakestDayIndex]) {
        weakestDayIndex = idx;
      }
    });
  }

  return {
    averagesByDayOfWeek,
    strongestDayIndex,
    strongestDayNameAr: WEEKDAY_NAMES_AR[strongestDayIndex],
    weakestDayIndex,
    weakestDayNameAr: WEEKDAY_NAMES_AR[weakestDayIndex],
  };
}

/* ------------------------------------------------------------------ */
/* Cache helpers                                                       */
/* ------------------------------------------------------------------ */

interface DayCellLike {
  dateISO: string;
  count: number;
  breakdown?: Partial<Record<ActivityCategory, number>>;
}

/**
 * Creates a cache key based on the daily cells data
 */
function createStreakCacheKey(dailyCells: readonly DayCellLike[]): string {
  if (dailyCells.length === 0) return 'streak:empty';
  
  // Use all cells to create a comprehensive hash for uniqueness
  const hashInput = dailyCells.map(c => `${c.dateISO}:${c.count}:${JSON.stringify(c.breakdown || {})}`).join('|');
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return `streak:${Math.abs(hash)}:${dailyCells.length}`;
}

/* ------------------------------------------------------------------ */
/* Full snapshot with caching                                          */
/* ------------------------------------------------------------------ */

/**
 * Builds the complete streak snapshot from the real 365-day matrix cells.
 * `dailyCells` must cover every day of the window (as produced by
 * calculate365DayContributions), including zero-activity days.
 * Now with caching for performance.
 */
export function buildStreakSnapshot(dailyCells: readonly DayCellLike[]): StreakSnapshot {
  const cacheKey = createStreakCacheKey(dailyCells);

  // Try session cache first (fastest)
  const sessionCached = sessionStreakCache.read(cacheKey);
  if (sessionCached.valid) {
    return sessionCached.value as StreakSnapshot;
  }

  // Try persistent cache
  const cached = streakCache.read(cacheKey);
  if (cached.valid) {
    sessionStreakCache.write(cacheKey, cached.value);
    return cached.value as StreakSnapshot;
  }

  // Compute fresh
  const result = computeStreakSnapshot(dailyCells);
  
  // Cache results
  streakCache.write(cacheKey, result, PROFILE_CACHE_TTLs.streaks);
  sessionStreakCache.write(cacheKey, result);
  
  return result;
}

/**
 * Internal computation function (separated for testability)
 */
function computeStreakSnapshot(dailyCells: readonly DayCellLike[]): StreakSnapshot {
  const now = new Date();
  const todayISO = toLocalDateISO(now);

  // Unified active set + totals
  const unifiedActive = new Set<string>();
  let totalContributions = 0;

  // Per-module structures
  const moduleActives = new Map<ActivityCategory, Set<string>>();
  const moduleTotals = new Map<ActivityCategory, number>();

  for (const cat of STREAK_MODULE_CATEGORIES) {
    moduleActives.set(cat, new Set());
    moduleTotals.set(cat, 0);
  }

  for (const cell of dailyCells) {
    totalContributions += cell.count;
    if (cell.count > 0) unifiedActive.add(cell.dateISO);

    for (const cat of STREAK_MODULE_CATEGORIES) {
      const c = cell.breakdown?.[cat] || 0;
      if (c > 0) {
        moduleActives.get(cat)!.add(cell.dateISO);
        moduleTotals.set(cat, (moduleTotals.get(cat) || 0) + c);
      }
    }
  }

  const unifiedCurrent = countConsecutiveDays(unifiedActive, todayISO, true);
  const unifiedLongest = Math.max(findLongestRun(unifiedActive), unifiedCurrent);

  const modules: ModuleStreak[] = STREAK_MODULE_CATEGORIES.map((cat) => {
    const actives = moduleActives.get(cat)!;
    const current = countConsecutiveDays(actives, todayISO, true);
    return {
      category: cat,
      currentStreakDays: current,
      longestStreakDays: Math.max(findLongestRun(actives), current),
      activeDaysCount: actives.size,
      totalContributions: moduleTotals.get(cat) || 0,
      nextMilestone: resolveNextMilestone(current),
      lastActiveDateISO: actives.size
        ? Array.from(actives).sort().at(-1)!
        : null,
    };
  });

  const bestDay =
    dailyCells.length > 0
      ? dailyCells.reduce((best, d) => (d.count > best.count ? d : best), dailyCells[0])
      : null;

  return {
    unified: {
      currentStreakDays: unifiedCurrent,
      longestStreakDays: unifiedLongest,
      activeDaysCount: unifiedActive.size,
      totalContributions,
      nextMilestone: resolveNextMilestone(unifiedCurrent),
      risk: assessStreakRisk(unifiedActive, now),
    },
    modules,
    rhythm: analyzeWeeklyRhythm(dailyCells as DailyContribution[]),
    bestDay: bestDay && bestDay.count > 0 ? (bestDay as DailyContribution) : null,
    lastActiveDateISO:
      unifiedActive.size > 0 ? Array.from(unifiedActive).sort().at(-1)! : null,
  };
}

/**
 * Invalidates the streak cache (call when underlying data changes)
 */
export function invalidateStreakCache(): void {
  streakCache.clear();
  sessionStreakCache.clear();
}