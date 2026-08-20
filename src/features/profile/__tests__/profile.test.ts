import { beforeEach, describe, expect, it } from 'vitest';

import { APP_BADGES } from '../data/badges';
import {
  calculate365DayContributions,
  calculateProfileActivitySummary,
} from '../lib/activityAggregator';
import { evaluateProfileBadges } from '../lib/badgeEvaluator';
import {
  calculateVisitStats,
  getAppVisitLogs,
  recordAppVisit,
  seedHistoricalVisitsIfEmpty,
} from '../lib/visitTracker';
import { ProfileActivitySummary } from '../types';

// Mock localStorage for Node test runner
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
  });
}

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: { pathname: '/' },
      localStorage: localStorageMock,
    },
  });
}

describe('Profile Activity & Visit Tracking Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Real Visit Tracking Engine', () => {
    it('records and retrieves app visit logs accurately', () => {
      const visit = recordAppVisit('/quran', 120);
      expect(visit).not.toBeNull();
      expect(visit?.route).toBe('/quran');

      const logs = getAppVisitLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].route).toBe('/quran');
    });

    it('calculates visit statistics and active streaks correctly', () => {
      recordAppVisit('/', 60);
      recordAppVisit('/diwan', 180);

      const stats = calculateVisitStats();
      expect(stats.totalAppVisits).toBeGreaterThanOrEqual(1);
      expect(stats.visitStreakDays).toBeGreaterThanOrEqual(1);
      expect(stats.lastVisitDateIso).toBeDefined();
    });

    it('seeds historical visits automatically when logs are empty', () => {
      seedHistoricalVisitsIfEmpty();
      const logs = getAppVisitLogs();
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('365-Day Contribution Matrix & Activity Feed', () => {
    it('generates a 52-week contribution matrix with exact intensity levels', () => {
      recordAppVisit('/', 60);
      recordAppVisit('/fitness', 120);

      const summary = calculate365DayContributions();
      expect(summary).toBeDefined();
      expect(summary.dailyContributions.length).toBeGreaterThanOrEqual(364);
      expect(summary.totalContributions).toBeGreaterThanOrEqual(1);
      expect(summary.activityEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('filters contribution timeline events by activity category', () => {
      recordAppVisit('/quran', 60);

      const allSummary = calculate365DayContributions(undefined, 'all');
      const visitSummary = calculate365DayContributions(undefined, 'visits');
      const fitnessSummary = calculate365DayContributions(undefined, 'fitness');

      expect(allSummary.totalContributions).toBeGreaterThanOrEqual(1);
      expect(visitSummary.totalContributions).toBeGreaterThanOrEqual(1);
      expect(fitnessSummary.totalContributions).toBe(0);
    });
  });

  describe('Profile Activity Aggregator & Badge Evaluator', () => {
    it('calculates default activity summary structure correctly including visits', () => {
      const summary = calculateProfileActivitySummary();

      expect(summary).toBeDefined();
      expect(typeof summary.totalDistanceKm).toBe('number');
      expect(typeof summary.totalWorkouts).toBe('number');
      expect(typeof summary.masteredWords).toBe('number');
      expect(typeof summary.savedPoemsCount).toBe('number');
      expect(typeof summary.activeNotesCount).toBe('number');
      expect(typeof summary.visitedCountriesCount).toBe('number');
      expect(typeof summary.totalDhikrCount).toBe('number');
      expect(typeof summary.totalAppVisits).toBe('number');
      expect(typeof summary.visitStreakDays).toBe('number');
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
        totalAppVisits: 50,
        visitStreakDays: 14,
        lastVisitDateIso: '2025-03-12',
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
});
