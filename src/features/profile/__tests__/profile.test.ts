import { describe, expect, it } from 'vitest';

import { APP_BADGES } from '../data/badges';
import { calculateProfileActivitySummary } from '../lib/activityAggregator';
import { evaluateProfileBadges } from '../lib/badgeEvaluator';
import { ProfileActivitySummary } from '../types';

describe('Profile Activity Aggregator & Badge Evaluator', () => {
  it('calculates default activity summary structure correctly', () => {
    const summary = calculateProfileActivitySummary();

    expect(summary).toBeDefined();
    expect(typeof summary.totalDistanceKm).toBe('number');
    expect(typeof summary.totalWorkouts).toBe('number');
    expect(typeof summary.masteredWords).toBe('number');
    expect(typeof summary.savedPoemsCount).toBe('number');
    expect(typeof summary.activeNotesCount).toBe('number');
    expect(typeof summary.visitedCountriesCount).toBe('number');
    expect(typeof summary.totalDhikrCount).toBe('number');
  });

  it('evaluates badges progress and unlocks dynamically based on metrics', () => {
    const customSummary: ProfileActivitySummary = {
      totalDistanceKm: 55,
      totalWorkouts: 20,
      totalCalories: 3500,
      masteredWords: 100,
      shelfMasteryPercent: 100,
      surgeStreakDays: 10,
      savedPoemsCount: 25,
      readingHours: 15,
      activeNotesCount: 20,
      journalEntriesCount: 12,
      visitedCountriesCount: 6,
      travelStampsCount: 8,
      totalDhikrCount: 1000,
      dhikrStreakDays: 10,
    };

    const badges = evaluateProfileBadges(customSummary, 100);

    expect(badges.length).toBe(APP_BADGES.length);

    // Check german master badge unlocked
    const germanMaster = badges.find((b) => b.id === 'badge_german_master');
    expect(germanMaster).toBeDefined();
    expect(germanMaster?.progressPercent).toBe(100);
    expect(germanMaster?.unlockedAt).not.toBeNull();

    // Check marathon mind badge unlocked (55km >= 50km target)
    const marathon = badges.find((b) => b.id === 'badge_marathon_mind');
    expect(marathon).toBeDefined();
    expect(marathon?.progressPercent).toBe(100);
    expect(marathon?.milestoneLabelAr).toContain('50.0/50 كم');

    // Check zen elite badge reflects completion percentage
    const zenElite = badges.find((b) => b.id === 'badge_zen_elite');
    expect(zenElite?.progressPercent).toBe(100);
  });
});
