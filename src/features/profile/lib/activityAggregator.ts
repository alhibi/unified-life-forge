import { APP_BADGES } from '../data/badges';
import { ProfileBadge, ProfileActivitySummary } from '../types';

/**
 * Calculates real-time user activity across all Super-App modules:
 * Fitness, German Club, Diwan Poetry, PKM Memory, Travel Atlas, and Quran/Dhikr.
 * Safely reads from localStorage and fallback states.
 */
export function calculateProfileActivitySummary(): ProfileActivitySummary {
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
        const totalDistMeters = activities.reduce((acc: number, act: any) => acc + (act.distance_meters || act.distanceMeters || 0), 0);
        totalDistanceKm = Math.round((totalDistMeters / 100) / 10);
        totalCalories = activities.reduce((acc: number, act: any) => acc + (act.calories_burned_est || act.caloriesBurnedEst || 0), 0);
      }
    }
  } catch {
    /* fallback to 0 */
  }

  // 2. German Club & Dictionary Metrics
  let masteredWords = 0;
  let shelfMasteryPercent = 0;
  let surgeStreakDays = 0;

  try {
    const germanRaw = localStorage.getItem('german-club-storage') || localStorage.getItem('german_mastered_words');
    if (germanRaw) {
      const parsed = JSON.parse(germanRaw);
      if (parsed?.state?.masteredEntryIds) {
        masteredWords = Object.keys(parsed.state.masteredEntryIds).length;
      } else if (Array.isArray(parsed)) {
        masteredWords = parsed.length;
      }
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
        journalEntriesCount = parsed.filter((n: any) => n.category === 'journal' || n.type === 'journal').length;
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
        const uniqueCountries = new Set(parsed.map((s: any) => s.countryCode || s.country));
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
  };
}
