import { APP_BADGES } from '../data/badges';
import { ProfileBadge, ProfileActivitySummary } from '../types';

/**
 * Dynamically evaluates achievement badges against active user metrics.
 * Updates progress percentages, unlock timestamps, and localized milestone labels.
 */
export function evaluateProfileBadges(
  summary: ProfileActivitySummary,
  profileCompletionPercentage: number = 100
): ProfileBadge[] {
  return APP_BADGES.map((badge) => {
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
}
