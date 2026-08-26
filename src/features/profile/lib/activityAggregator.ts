import { activityCache, PROFILE_CACHE_TTLs,sessionActivityCache } from '../lib/cache';
import {
  ActivityCategory,
  ContributionActivityEvent,
  DailyContribution,
  ProfileActivitySummary,
  YearlyContributionSummary,
} from '../types';
import { calculateVisitStats, getAppVisitLogs, toLocalDateISO } from './visitTracker';

const MONTH_NAMES_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

/**
 * Creates a cache key based on the parameters
 */
function createActivityCacheKey(targetYear?: number, categoryFilter: ActivityCategory = 'all'): string {
  return `activity:${targetYear || 'current'}:${categoryFilter}`;
}

/**
 * Calculates real-time user activity totals across all Super-App modules:
 * App Visits, Fitness, German Club, Diwan Poetry, PKM Memory, Travel Atlas, and Quran/Dhikr.
 * Now with caching for performance.
 */
export function calculateProfileActivitySummary(): ProfileActivitySummary {
  // Try session cache first (fastest)
  const sessionCached = sessionActivityCache.read('summary');
  if (sessionCached.valid) {
    return sessionCached.value as ProfileActivitySummary;
  }

  // Try persistent cache
  const cached = activityCache.read('summary');
  if (cached.valid) {
    // Also populate session cache for next time
    sessionActivityCache.write('summary', cached.value);
    return cached.value as ProfileActivitySummary;
  }

  // Compute fresh
  const result = computeProfileActivitySummary();
  
  // Cache results
  activityCache.write('summary', result, PROFILE_CACHE_TTLs.activity);
  sessionActivityCache.write('summary', result);
  
  return result;
}

/**
 * Internal computation function (separated for testability)
 */
function computeProfileActivitySummary(): ProfileActivitySummary {
  // 1. Fitness Module Metrics
  let totalDistanceKm = 0;
  let totalWorkouts = 0;
  let totalCalories = 0;

  try {
    const fitnessRaw = localStorage.getItem('fitness-storage') || localStorage.getItem('fitness_activities');
    if (fitnessRaw) {
      const parsed = JSON.parse(fitnessRaw);
      const activities = parsed?.state?.activities || parsed || [];
      if (Array.isArray(activities)) {
        totalWorkouts = activities.length;
        const totalDistMeters = activities.reduce(
          (acc: number, act: any) => acc + (act.distance_meters || act.distanceMeters || 0),
          0
        );
        totalDistanceKm = Math.round((totalDistMeters / 100) / 10);
        totalCalories = activities.reduce(
          (acc: number, act: any) => acc + (act.calories_burned_est || act.caloriesBurnedEst || 0),
          0
        );
      }
    }
  } catch {
    /* fallback to 0 */
  }

  // 2. German Club & Dictionary Metrics
  let masteredWords = 0;
  let shelfMasteryPercent = 0;
  const surgeStreakDays = 0;

  try {
    const germanRaw = localStorage.getItem('german-club-storage') || localStorage.getItem('german_mastered_words');
    if (germanRaw) {
      const parsed = JSON.parse(germanRaw);
      if (parsed?.state?.masteredEntryIds) {
        masteredWords = Object.keys(parsed.state.masteredEntryIds).length;
      } else if (Array.isArray(parsed)) {
        masteredWords = parsed.length;
      }
      shelfMasteryPercent = Math.min(100, Math.round((masteredWords / 150) * 100));
    }
  } catch {
    /* fallback */
  }

  // Dictionary bookmarks
  try {
    const dictRaw = localStorage.getItem('german-dictionary-storage');
    if (dictRaw) {
      const parsed = JSON.parse(dictRaw);
      const bookmarked = parsed?.state?.bookmarkedIds || [];
      if (Array.isArray(bookmarked) && masteredWords === 0) {
        masteredWords = bookmarked.length;
      }
    }
  } catch {
    /* fallback */
  }

  // 3. Diwan Poetry Metrics
  let savedPoemsCount = 0;
  let readingHours = 0;

  try {
    const bayanRaw = localStorage.getItem('bayan-store') || localStorage.getItem('diwan_saved_poems');
    if (bayanRaw) {
      const parsed = JSON.parse(bayanRaw);
      const bookmarks = parsed?.state?.bookmarkedAnalyses || parsed;
      if (typeof bookmarks === 'object') {
        savedPoemsCount = Object.keys(bookmarks).length;
        readingHours = Math.round(savedPoemsCount * 0.5 * 10) / 10;
      }
    }
  } catch {
    /* fallback */
  }

  // 4. PKM & Memory Notes Metrics
  let activeNotesCount = 0;
  let journalEntriesCount = 0;

  try {
    const pkmRaw = localStorage.getItem('pkm_notes') || localStorage.getItem('user_notes');
    if (pkmRaw) {
      const parsed = JSON.parse(pkmRaw);
      if (Array.isArray(parsed)) {
        activeNotesCount = parsed.length;
        journalEntriesCount = parsed.filter(
          (n: any) => n.category === 'journal' || n.type === 'journal'
        ).length;
      }
    }
  } catch {
    /* fallback */
  }

  // 5. Travel Atlas Metrics
  let visitedCountriesCount = 0;
  let travelStampsCount = 0;

  try {
    const atlasRaw = localStorage.getItem('travel_atlas_stamps');
    if (atlasRaw) {
      const parsed = JSON.parse(atlasRaw);
      if (Array.isArray(parsed)) {
        travelStampsCount = parsed.length;
        const uniqueCountries = new Set(parsed.map((s: any) => s.countryCode || s.country || s.iso_code));
        visitedCountriesCount = uniqueCountries.size;
      }
    }
  } catch {
    /* fallback */
  }

  // 6. Quran & Dhikr Metrics
  let totalDhikrCount = 0;
  let dhikrStreakDays = 0;

  try {
    const dhikrRaw = localStorage.getItem('tasbeeh_count') || localStorage.getItem('dhikr_counter');
    if (dhikrRaw) {
      const parsed = parseInt(dhikrRaw, 10);
      if (!isNaN(parsed)) {
        totalDhikrCount = parsed;
        dhikrStreakDays = Math.max(1, Math.min(30, Math.floor(parsed / 100)));
      }
    }
  } catch {
    /* fallback */
  }

  // 7. App Visit Stats
  const visitStats = calculateVisitStats();

  return {
    totalDistanceKm,
    totalWorkouts,
    totalCalories,
    masteredWords,
    shelfMasteryPercent,
    surgeStreakDays,
    savedPoemsCount,
    readingHours,
    activeNotesCount,
    journalEntriesCount,
    visitedCountriesCount,
    travelStampsCount,
    totalDhikrCount,
    dhikrStreakDays,
    totalAppVisits: visitStats.totalAppVisits,
    visitStreakDays: visitStats.visitStreakDays,
    lastVisitDateIso: visitStats.lastVisitDateIso,
  };
}

/**
 * Calculates a complete GitHub-style 365-Day (52-Week) Contribution Matrix & Activity Timeline.
 * Combines real app visits, fitness activities, german mastered items, diwan bookmarks,
 * PKM notes, travel stamps, and dhikr sessions into exact daily intensity cells and timeline events.
 * Now with caching for performance.
 */
export function calculate365DayContributions(
  targetYear?: number,
  categoryFilter: ActivityCategory = 'all'
): YearlyContributionSummary {
  const cacheKey = createActivityCacheKey(targetYear, categoryFilter);

  // Try session cache first (fastest)
  const sessionCached = sessionActivityCache.read(cacheKey);
  if (sessionCached.valid) {
    return sessionCached.value as YearlyContributionSummary;
  }

  // Try persistent cache
  const cached = activityCache.read(cacheKey);
  if (cached.valid) {
    sessionActivityCache.write(cacheKey, cached.value);
    return cached.value as YearlyContributionSummary;
  }

  // Compute fresh
  const result = compute365DayContributions(targetYear, categoryFilter);
  
  // Cache results
  activityCache.write(cacheKey, result, PROFILE_CACHE_TTLs.activity);
  sessionActivityCache.write(cacheKey, result);
  
  return result;
}

/**
 * Internal computation function (separated for testability)
 */
function compute365DayContributions(
  targetYear?: number,
  categoryFilter: ActivityCategory = 'all'
): YearlyContributionSummary {
  const eventsMap: Record<string, ContributionActivityEvent[]> = {};
  const dailyCountsMap: Record<string, Record<ActivityCategory, number>> = {};

  const ensureDateEntry = (iso: string) => {
    if (!dailyCountsMap[iso]) {
      dailyCountsMap[iso] = {
        all: 0,
        visits: 0,
        fitness: 0,
        german: 0,
        diwan: 0,
        pkm: 0,
        atlas: 0,
        spiritual: 0,
      };
    }
    if (!eventsMap[iso]) {
      eventsMap[iso] = [];
    }
  };

  const addActivity = (
    timestamp: number,
    category: ActivityCategory,
    titleAr: string,
    subtitleAr?: string,
    detailsAr?: string,
    route?: string,
    count = 1
  ) => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return;
    const iso = toLocalDateISO(date);

    ensureDateEntry(iso);
    dailyCountsMap[iso][category] = (dailyCountsMap[iso][category] || 0) + count;
    dailyCountsMap[iso].all += count;

    eventsMap[iso].push({
      id: `evt_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
      dateISO: iso,
      timestamp,
      category,
      titleAr,
      subtitleAr,
      detailsAr,
      count,
      route,
    });
  };

  // A. Aggregate Real App Visits
  try {
    const visits = getAppVisitLogs();
    visits.forEach((v) => {
      const routeLabel = v.route === '/' ? 'الصفحة الرئيسية' : v.route.replace('/', '');
      addActivity(
        v.timestamp,
        'visits',
        'زيارة التطبيق والموقع',
        `تصفح قسم ${routeLabel}`,
        `مدة الجلسة: ${v.sessionDurationSecs ? Math.round(v.sessionDurationSecs / 60) : 1} دقيقة`,
        v.route,
        1
      );
    });
  } catch {
    /* fallback */
  }

  // B. Aggregate Fitness Activities
  try {
    const fitnessRaw = localStorage.getItem('fitness-storage') || localStorage.getItem('fitness_activities');
    if (fitnessRaw) {
      const parsed = JSON.parse(fitnessRaw);
      const activities = parsed?.state?.activities || parsed || [];
      if (Array.isArray(activities)) {
        activities.forEach((act: any) => {
          const ts = act.created_at ? new Date(act.created_at).getTime() : act.timestamp || Date.now();
          const distKm = act.distance_meters ? (act.distance_meters / 1000).toFixed(1) : '1.5';
          addActivity(
            ts,
            'fitness',
            'نشاط لياقة بدنية',
            `${act.type || 'تمارين رياضة'}: ${distKm} كم`,
            `السعرات الحرارية المقدرة: ${act.calories_burned_est || 150} سعرة`,
            '/fitness',
            1
          );
        });
      }
    }
  } catch {
    /* fallback */
  }

  // C. Aggregate German Club
  try {
    const germanRaw = localStorage.getItem('german-club-storage') || localStorage.getItem('german_mastered_words');
    if (germanRaw) {
      const parsed = JSON.parse(germanRaw);
      const mastered = parsed?.state?.masteredEntryIds || {};
      Object.entries(mastered).forEach(([id, ts]: [string, any]) => {
        const timestamp = typeof ts === 'number' ? ts : Date.now();
        addActivity(
          timestamp,
          'german',
          'إتقان مفردة ألمانية',
          `حفظ المفردة رقم #${id}`,
          'النادي الألماني (Der Club)',
          '/german-club',
          1
        );
      });
    }
  } catch {
    /* fallback */
  }

  // D. Aggregate Diwan Poems
  try {
    const bayanRaw = localStorage.getItem('bayan-store') || localStorage.getItem('diwan_saved_poems');
    if (bayanRaw) {
      const parsed = JSON.parse(bayanRaw);
      const bookmarks = parsed?.state?.bookmarkedAnalyses || {};
      Object.entries(bookmarks).forEach(([slug, poem]: [string, any]) => {
        const ts = poem?.timestamp || poem?.savedAt || Date.now();
        addActivity(
          ts,
          'diwan',
          'حفظ تحليل قصيدة في الديوان',
          poem?.title || `قصيدة ${slug}`,
          'ديوان الشعر والتحليل',
          '/diwan',
          1
        );
      });
    }
  } catch {
    /* fallback */
  }

  // E. Aggregate PKM Memory
  try {
    const pkmRaw = localStorage.getItem('pkm_notes');
    if (pkmRaw) {
      const parsed = JSON.parse(pkmRaw);
      if (Array.isArray(parsed)) {
        parsed.forEach((note: any) => {
          const ts = note.createdAt ? new Date(note.createdAt).getTime() : Date.now();
          addActivity(
            ts,
            'pkm',
            note.category === 'journal' ? 'تدوين في اليوميات' : 'إضافة ملاحظة معرفية',
            note.title || 'ملاحظة جديدة',
            'الذاكرة الشخصية (PKM)',
            '/pkm',
            1
          );
        });
      }
    }
  } catch {
    /* fallback */
  }

  // F. Aggregate Travel Atlas
  try {
    const atlasRaw = localStorage.getItem('travel_atlas_stamps');
    if (atlasRaw) {
      const parsed = JSON.parse(atlasRaw);
      if (Array.isArray(parsed)) {
        parsed.forEach((stamp: any) => {
          const ts = stamp.visitedOn ? new Date(stamp.visitedOn).getTime() : Date.now();
          addActivity(
            ts,
            'atlas',
            'توثيق ختم سفر',
            `زيارة دولة ${stamp.countryCode || stamp.isoCode || 'جديدة'}`,
            'أطلس الأسفار',
            '/travel-atlas',
            1
          );
        });
      }
    }
  } catch {
    /* fallback */
  }

  // G. Aggregate Dhikr
  try {
    const dhikrRaw = localStorage.getItem('tasbeeh_count');
    if (dhikrRaw) {
      const count = parseInt(dhikrRaw, 10);
      if (!isNaN(count) && count > 0) {
        addActivity(
          Date.now(),
          'spiritual',
          'جلسة تسبيح وأذكار',
          `إجمالي ${count} تسبيحة ومودة`,
          'محراب الأذكار والقرآن',
          '/dhikr',
          Math.min(10, Math.ceil(count / 100))
        );
      }
    }
  } catch {
    /* fallback */
  }

  // Build the 365-day (52-week) GitHub matrix
  const today = new Date();
  const year = targetYear || today.getFullYear();

  // If targetYear is provided, generate for that full calendar year, else last 365 days
  const isSpecificYear = Boolean(targetYear);
  const startDate = isSpecificYear ? new Date(year, 0, 1) : new Date(today);
  const endDate = isSpecificYear ? new Date(year, 11, 31) : new Date(today);

  if (!isSpecificYear) {
    startDate.setDate(startDate.getDate() - 364);
  }

  const days: DailyContribution[] = [];
  const allEvents: ContributionActivityEvent[] = [];

  const curr = new Date(startDate);
  let totalContributions = 0;
  let activeDaysCount = 0;
  let currentStreakDays = 0;
  let longestStreakDays = 0;
  let runningStreak = 0;
  let elapsedInRangeDays = 0;

  // Align start to the preceding Sunday so matrix weeks align perfectly (0 = Sunday)
  const startDayOfWeek = curr.getDay();
  const alignedStart = new Date(curr);
  alignedStart.setDate(alignedStart.getDate() - startDayOfWeek);

  // Align the end to the following Saturday so the final column is always complete.
  const alignedEnd = new Date(endDate);
  alignedEnd.setDate(alignedEnd.getDate() + (6 - alignedEnd.getDay()));

  const windowStartISO = toLocalDateISO(startDate);
  const windowEndISO = toLocalDateISO(endDate);
  const todayISO = toLocalDateISO(today);

  let weekIdx = 0;

  for (let d = new Date(alignedStart); d <= alignedEnd; d.setDate(d.getDate() + 1)) {
    const dateISO = toLocalDateISO(d);
    const dayOfWeek = d.getDay(); // 0 (Sun) to 6 (Sat)
    const monthIndex = d.getMonth();

    // Cells outside the requested window (calendar padding) and cells in the
    // future are rendered as placeholders — they must never inflate totals,
    // averages, or streaks.
    const isPadding = dateISO < windowStartISO || dateISO > windowEndISO;
    const isFuture = dateISO > todayISO;
    const isCountable = !isPadding && !isFuture;

    const dateCounts = dailyCountsMap[dateISO] || {
      all: 0,
      visits: 0,
      fitness: 0,
      german: 0,
      diwan: 0,
      pkm: 0,
      atlas: 0,
      spiritual: 0,
    };

    const rawCount = categoryFilter === 'all' ? dateCounts.all : dateCounts[categoryFilter] || 0;
    const count = isCountable ? rawCount : 0;

    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (count >= 10) intensity = 4;
    else if (count >= 6) intensity = 3;
    else if (count >= 3) intensity = 2;
    else if (count >= 1) intensity = 1;

    if (isCountable) {
      elapsedInRangeDays++;
      if (count > 0) {
        totalContributions += count;
        activeDaysCount++;
        runningStreak++;
        if (runningStreak > longestStreakDays) longestStreakDays = runningStreak;
      } else {
        runningStreak = 0;
      }
    }

    const dateFormattedAr = `${d.getDate()} ${MONTH_NAMES_AR[monthIndex]} ${d.getFullYear()}`;

    days.push({
      dateISO,
      dateFormattedAr,
      count,
      intensity,
      dayOfWeek,
      weekIndex: weekIdx,
      monthIndex,
      breakdown: isCountable ? dateCounts : {},
      isPadding,
      isFuture,
    });

    if (isCountable && eventsMap[dateISO] && eventsMap[dateISO].length > 0) {
      const filteredEvents =
        categoryFilter === 'all'
          ? eventsMap[dateISO]
          : eventsMap[dateISO].filter((e) => e.category === categoryFilter);
      allEvents.push(...filteredEvents);
    }

    if (dayOfWeek === 6) {
      weekIdx++;
    }
  }


  // Compute current streak ending at today/latest active day
  const streakCheck = new Date(endDate);
  while (streakCheck >= startDate) {
    const iso = toLocalDateISO(streakCheck);
    const cnt = categoryFilter === 'all' ? (dailyCountsMap[iso]?.all || 0) : (dailyCountsMap[iso]?.[categoryFilter] || 0);
    if (cnt > 0) {
      currentStreakDays++;
      streakCheck.setDate(streakCheck.getDate() - 1);
    } else if (toLocalDateISO(streakCheck) === toLocalDateISO(today) && cnt === 0) {
      // Check yesterday if today hasn't had activity yet
      streakCheck.setDate(streakCheck.getDate() - 1);
    } else {
      break;
    }
  }

  // Sort events chronologically descending (newest first)
  allEvents.sort((a, b) => b.timestamp - a.timestamp);

  const averageDaily = Math.round((totalContributions / Math.max(1, days.length)) * 10) / 10;

  return {
    year,
    totalContributions,
    currentStreakDays,
    longestStreakDays,
    averageDaily,
    activeDaysCount,
    dailyContributions: days,
    activityEvents: allEvents,
  };
}

/**
 * Invalidates the activity cache (call when underlying data changes)
 */
export function invalidateActivityCache(): void {
  activityCache.clear();
  sessionActivityCache.clear();
}