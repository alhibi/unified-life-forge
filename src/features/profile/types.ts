export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory = 'all' | 'knowledge' | 'fitness' | 'german' | 'diwan' | 'travel' | 'spiritual';

export interface ProfileBadge {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  category: BadgeCategory;
  iconName: string;
  rarity: BadgeRarity;
  unlockedAt?: string | null;
  progressPercent: number; // 0 to 100
  milestoneLabelAr: string;
}

export interface SocialLinks {
  github?: string | null;
  twitter?: string | null;
  telegram?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
}

export interface PrivacySettings {
  hide_activity: boolean;
  hide_location: boolean;
  hide_online_status: boolean;
}

export interface ProfileActivitySummary {
  // Fitness
  totalDistanceKm: number;
  totalWorkouts: number;
  totalCalories: number;

  // German Club
  masteredWords: number;
  shelfMasteryPercent: number;
  surgeStreakDays: number;

  // Diwan
  savedPoemsCount: number;
  readingHours: number;

  // PKM / Memory
  activeNotesCount: number;
  journalEntriesCount: number;

  // Travel Atlas
  visitedCountriesCount: number;
  travelStampsCount: number;

  // Quran / Dhikr
  totalDhikrCount: number;
  dhikrStreakDays: number;
}

export interface ProfileCompletionItem {
  id: string;
  labelAr: string;
  isCompleted: boolean;
  weight: number; // Percentage contribution (e.g. 15)
  actionTab?: string;
  fieldKey?: string;
}

export interface ProfileCompletionMetrics {
  percentage: number;
  completedCount: number;
  totalCount: number;
  items: ProfileCompletionItem[];
}
