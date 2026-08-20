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

  // Real Site & App Visits
  totalAppVisits: number;
  visitStreakDays: number;
  lastVisitDateIso: string | null;
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

export type ActivityCategory =
  | 'all'
  | 'visits'
  | 'fitness'
  | 'german'
  | 'diwan'
  | 'pkm'
  | 'atlas'
  | 'spiritual';

export interface AppVisitLog {
  id: string;
  timestamp: number;
  dateISO: string; // YYYY-MM-DD
  route: string;
  sessionDurationSecs?: number;
  userAgent?: string;
}

export interface DailyContribution {
  dateISO: string; // YYYY-MM-DD
  dateFormattedAr: string; // e.g. "12 مارس 2025"
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  weekIndex: number; // 0 to 51/52
  monthIndex: number; // 0 to 11
  breakdown: Partial<Record<ActivityCategory, number>>;
}

export interface ContributionActivityEvent {
  id: string;
  dateISO: string; // YYYY-MM-DD
  timestamp: number;
  category: ActivityCategory;
  titleAr: string;
  subtitleAr?: string;
  detailsAr?: string;
  count?: number;
  route?: string;
}

export interface YearlyContributionSummary {
  year: number;
  totalContributions: number;
  currentStreakDays: number;
  longestStreakDays: number;
  averageDaily: number;
  activeDaysCount: number;
  dailyContributions: DailyContribution[];
  activityEvents: ContributionActivityEvent[];
}
