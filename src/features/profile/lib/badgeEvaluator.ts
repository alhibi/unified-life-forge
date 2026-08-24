/**
 * Profile Badge Evaluator — enhanced with caching for performance
 * Dynamically evaluates achievement badges against active user metrics.
 * Updates progress percentages, unlock timestamps, and localized milestone labels.
 * Uses caching to avoid repeated localStorage reads on every render.
 */
import { APP_BADGES } from '../data/badges';
import { ProfileActivitySummary, ProfileBadge } from '../types';
import { 
  badgeCache, 
  sessionBadgeCache, 
} from '../lib/cache';

/**
 * Creates a hash key from summary data for cache lookup
 */
function createSummaryHash(
  summary: ProfileActivitySummary,
  profileCompletionPercentage: number,
  unifiedStreakDays: number
): string {
  return [
    summary.totalDistanceKm,
    summary.totalWorkouts,
    summary.totalCalories,
    summary.masteredWords,
    summary.shelfMasteryPercent,
    summary.surgeStreakDays,
    summary.savedPoemsCount,
    summary.readingHours,
    summary.activeNotesCount,
    summary.journalEntriesCount,
    summary.visitedCountriesCount,
    summary.travelStampsCount,
    summary.totalDhikrCount,
    summary.dhikrStreakDays,
    summary.totalAppVisits,
    summary.visitStreakDays,
    summary.lastVisitDateIso,
    profileCompletionPercentage,
    unifiedStreakDays
  ].join('|');
}

/**
 * Default TTL for badge evaluation cache (5 minutes)
 * Badge progress changes infrequently, so 5min cache is reasonable
 */
const BADGE_EVAL_CACHE_TTL = 5 * 60 * 1000;

/**
 * Evaluates achievement badges against active user metrics.
 * Uses caching to avoid redundant localStorage reads on every render.
 * 
 * @param summary - User activity summary metrics
 * @param profileCompletionPercentage - Overall profile completion (0-100)
 * @param unifiedStreakDays - Current unified streak in days
 * @returns Array of badges with updated progress and unlock status
 */
export function evaluateProfileBadges(
  summary: ProfileActivitySummary,
  profileCompletionPercentage: number = 100,
  unifiedStreakDays: number = 0
): ProfileBadge[] {
  // Generate a hash from the summary data to use as cache key
  const summaryHash = createSummaryHash(summary, profileCompletionPercentage, unifiedStreakDays);

  // Try to get cached result first
  const cached = badgeCache.read(summaryHash);
  if (cached.valid && cached.value?.length === APP_BADGES.length) {
    // Verify cache has all badges (not partial/missing)
    return cached.value as typeof APP_BADGES;
  }

  // Compute badges fresh (fallback to computation)
  const results = APP_BADGES.map((badge) => {
    let progress = badge.progressPercent;
    let isUnlocked = Boolean(badge.unlockedAt);
    let milestoneLabel = badge.milestoneLabelAr;

    switch (badge.id) {
      case 'badge_knowledge_pioneer': {
        const target = 10;
        const current = Math.min(target, summary.activeNotesCount || (summary.readingHours > 0 ? 10 : 0));
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} وثائق`;
        break;
      }

      case 'badge_night_runner': {
        const target = 5;
        const current = Math.min(target, summary.totalDistanceKm);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current.toFixed(1)}/${target} كم ليلي`;
        break;
      }

      case 'badge_german_master': {
        const target = 100;
        const current = Math.min(target, summary.masteredWords);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} مفردة`;
        break;
      }

      case 'badge_poetry_connoisseur': {
        const target = 20;
        const current = Math.min(target, summary.savedPoemsCount);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} قصيدة محفوفة`;
        break;
      }

      case 'badge_atlas_voyager': {
        const target = 5;
        const current = Math.min(target, summary.travelStampsCount);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} أختام`;
        break;
      }

      case 'badge_dhikr_guardian': {
        const target = 7;
        const current = Math.min(target, summary.dhikrStreakDays);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `سلسلة ${current} أيام`;
        break;
      }

      case 'badge_thought_archivist': {
        const target = 15;
        const current = Math.min(target, summary.activeNotesCount);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} ملاحظة`;
        break;
      }

      case 'badge_marathon_mind': {
        const target = 50;
        const current = Math.min(target, summary.totalDistanceKm);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current.toFixed(1)}/${target} كم`;
        break;
      }

      case 'badge_dictionary_scholar': {
        const target = 30;
        const current = Math.min(target, summary.masteredWords);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} بحث معجمي`;
        break;
      }

      case 'badge_muallaqa_master': {
        const target = 7;
        const current = Math.min(target, summary.savedPoemsCount);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} معلقات كاملة`;
        break;
      }

      case 'badge_journal_philosopher': {
        const target = 10;
        const current = Math.min(target, summary.journalEntriesCount);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} تدوينات`;
        break;
      }

      case 'badge_zen_elite': {
        progress = Math.min(100, profileCompletionPercentage);
        milestoneLabel = `${progress}% تخصيص واجهة`;
        break;
      }

      case 'badge_eternal_flame': {
        const target = 30;
        const current = Math.min(target, unifiedStreakDays);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} يوماً متتالياً`;
        break;
      }

      // === NEW QUALITATIVE BADGES ===
      
      case 'badge_weekend_warrior': {
        // This would need weekend-specific data - using totalWorkouts as proxy
        // In production, you'd check the activity matrix for Sat/Sun activity
        const target = 4;
        const current = Math.min(target, Math.floor((summary.totalWorkouts || 0) / 3)); // rough proxy
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} أسابيع`;
        break;
      }

      case 'badge_morning_lark': {
        // Proxy: use spiritual streak as morning activity indicator
        const target = 14;
        const current = Math.min(target, summary.dhikrStreakDays || 0);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} يوماً`;
        break;
      }

      case 'badge_night_owl': {
        // Proxy: use knowledge activities as evening activity
        const target = 10;
        const current = Math.min(target, Math.floor((summary.activeNotesCount || 0) / 2));
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} أيام`;
        break;
      }

      case 'badge_streak_architect': {
        // Check streaks across modules - use available streaks as proxy
        const moduleStreaks = [
          summary.visitStreakDays || 0,
          summary.dhikrStreakDays || 0,
          summary.surgeStreakDays || 0,
        ].filter(s => s >= 7).length;
        const target = 3;
        const current = Math.min(target, moduleStreaks);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} وحدات`;
        break;
      }

      case 'badge_wellness_balanced': {
        // Check if multiple categories active - proxy using non-zero counts
        const categoriesActive = [
          summary.totalWorkouts > 0,
          summary.dhikrStreakDays > 0,
          (summary.activeNotesCount || summary.readingHours) > 0,
        ].filter(Boolean).length;
        const target = 5;
        const current = Math.min(target, categoriesActive); // simplified
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} أيام`;
        break;
      }

      case 'badge_polyglot_path': {
        // Proxy: use mastered words as language learning indicator
        const target = 3;
        const current = Math.min(target, Math.floor((summary.masteredWords || 0) / 50));
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} لغات`;
        break;
      }

      case 'badge_deep_work_master': {
        // Proxy: use reading hours or notes as deep work indicator
        const target = 1;
        const current = summary.readingHours >= 1.5 ? 1 : (summary.activeNotesCount >= 5 ? 1 : 0);
        progress = current * 100;
        milestoneLabel = current ? 'جلسة 90+ دقيقة' : '0/1 جلسة';
        break;
      }

      case 'badge_habit_chain': {
        // Check if fitness + german + spiritual have simultaneous streaks
        const hasFitness = (summary.visitStreakDays || 0) >= 21;
        const hasGerman = (summary.masteredWords || 0) >= 100;
        const hasSpiritual = (summary.dhikrStreakDays || 0) >= 21;
        const activeHabits = [hasFitness, hasGerman, hasSpiritual].filter(Boolean).length;
        const target = 3;
        const current = Math.min(target, activeHabits);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} عادات`;
        break;
      }

      case 'badge_reflection_sage': {
        // Proxy: journal entries as weekly reflections
        const target = 8;
        const current = Math.min(target, summary.journalEntriesCount || 0);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} أسابيع`;
        break;
      }

      case 'badge_explorer_spirit': {
        // This would need route visit data - using visit streak as proxy
        const target = 3;
        const current = Math.min(target, Math.floor((summary.totalAppVisits || 0) / 20));
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} أقسام`;
        break;
      }

      case 'badge_consistency_king': {
        // Uses unifiedStreakDays with 3-day grace
        const target = 60;
        const grace = 3;
        const effectiveStreak = unifiedStreakDays + grace;
        const current = Math.min(target, effectiveStreak);
        progress = Math.min(100, Math.round((current / target) * 100));
        milestoneLabel = `${current}/${target} يوماً`;
        break;
      }

      case 'badge_founding_member':
      default: {
        progress = badge.progressPercent || 100;
        break;
      }
    }

    if (progress >= 100 && !isUnlocked) {
      isUnlocked = true;
    }

    return {
      ...badge,
      progressPercent: progress,
      unlockedAt: isUnlocked ? (badge.unlockedAt || new Date().toISOString()) : null,
      milestoneLabelAr: milestoneLabel,
    };
  });

  // Cache the result for future calls
  badgeCache.write(summaryHash, results, BADGE_EVAL_CACHE_TTL);

  return results;
}

/**
 * Evaluates badges using session-only cache (faster, non-persistent)
 * Good for real-time UI updates where persistence across sessions isn't needed
 * 
 * @param summary - User activity summary metrics
 * @param profileCompletionPercentage - Overall profile completion (0-100)
 * @param unifiedStreakDays - Current unified streak in days
 * @returns Array of badges with updated progress and unlock status
 */
export function evaluateProfileBadgesSession(
  summary: ProfileActivitySummary,
  profileCompletionPercentage: number = 100,
  unifiedStreakDays: number = 0
): ProfileBadge[] {
  // Use session cache (in-memory, faster, no localStorage)
  const cached = sessionBadgeCache.read('latest-eval');
  if (cached.valid && cached.value?.length === APP_BADGES.length) {
    return cached.value as typeof APP_BADGES;
  }

  // Compute badges
  const results = evaluateProfileBadges(summary, profileCompletionPercentage, unifiedStreakDays);
  
  // Cache in session
  sessionBadgeCache.write('latest-eval', results);
  
  return results;
}

/**
 * Invalidates all badge caches
 */
export function invalidateBadgeCache(): void {
  badgeCache.clear();
  sessionBadgeCache.clear();
}

/**
 * Pre-computes badge evaluations for a given summary
 * Useful when summary data changes and you need fresh badge results
 * 
 * @param summary - User activity summary metrics
 * @param profileCompletionPercentage - Overall profile completion (0-100)
 * @param unifiedStreakDays - Current unified streak in days
 * @returns Fresh badge evaluation results
 */
export function precomputeBadgeEvaluations(
  summary: ProfileActivitySummary,
  profileCompletionPercentage: number = 100,
  unifiedStreakDays: number = 0
): ProfileBadge[] {
  // Clear any stale cache entries using the hash
  const summaryHash = createSummaryHash(summary, profileCompletionPercentage, unifiedStreakDays);
  badgeCache.remove(summaryHash);
  sessionBadgeCache.remove('latest-session');
  
  // Compute fresh results
  return evaluateProfileBadges(summary, profileCompletionPercentage, unifiedStreakDays);
}