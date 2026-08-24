/**
 * Profile Completion Engine — Core calculation for profile completeness
 * ---------------------------------------------------------------------------
 * Single source of truth for profile completion percentage.
 * Combines static profile fields + dynamic activity metrics + customization.
 * Cached for performance, invalidated on relevant changes.
 */
import { ProfileActivitySummary } from '../types';
import { SocialLinks } from '../types';
import { completionCache } from '../lib/cache';

export interface CompletionItem {
  id: string;
  labelAr: string;
  labelEn: string;
  category: 'identity' | 'activity' | 'customization' | 'social';
  weight: number; // Total weights should sum to 100
  isCompleted: boolean;
  actionTab?: ProfileTab;
  fieldKey?: string;
  // For dynamic items - function to evaluate completion
  evaluate?: (summary: ProfileActivitySummary, profile: ProfileData) => boolean;
  // Progress for partial completion (0-100)
  progress?: number;
}

export interface ProfileData {
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  title: string;
  location: string;
  statusText: string;
  statusEmoji: string;
  websiteUrl: string;
  socialLinks: SocialLinks;
  featuredBadges: string[];
  coverThemeId: string;
  isPublic: boolean;
  privacySettings: {
    hide_activity: boolean;
    hide_location: boolean;
    hide_online_status: boolean;
  };
}

export type ProfileTab = 'overview' | 'activity' | 'badges' | 'edit' | 'privacy';

export interface ProfileCompletionMetrics {
  percentage: number;
  completedCount: number;
  totalCount: number;
  items: CompletionItem[];
  // Breakdown by category
  byCategory: {
    identity: { completed: number; total: number; percentage: number };
    activity: { completed: number; total: number; percentage: number };
    customization: { completed: number; total: number; percentage: number };
    social: { completed: number; total: number; percentage: number };
  };
  // Next actionable items
  nextActions: CompletionItem[];
}

// Default weights - must sum to 100
const ITEM_WEIGHTS = {
  // Identity (35%)
  username: 10,
  displayName: 10,
  avatar: 8,
  bio: 7,
  // Activity (30%)
  workouts: 8,
  knowledge: 8,
  spiritual: 7,
  language: 7,
  // Customization (20%)
  coverTheme: 5,
  status: 5,
  featuredBadges: 5,
  privacy: 5,
  // Social (15%)
  socialLinks: 8,
  website: 7,
} as const;

/**
 * Creates the full completion item list with dynamic evaluators
 */
function createCompletionItems(
  profile: ProfileData,
  summary: ProfileActivitySummary
  // unifiedStreakDays reserved for future streak-based completion items
): CompletionItem[] {
  return [
    // === IDENTITY (35%) ===
    {
      id: 'username',
      labelAr: 'اسم مستخدم مميز',
      labelEn: 'Distinct Username',
      category: 'identity',
      weight: ITEM_WEIGHTS.username,
      isCompleted: profile.username.trim().length >= 3,
      actionTab: 'edit',
      fieldKey: 'username',
    },
    {
      id: 'displayName',
      labelAr: 'اسم ظاهر كامل',
      labelEn: 'Display Name',
      category: 'identity',
      weight: ITEM_WEIGHTS.displayName,
      isCompleted: profile.displayName.trim().length >= 2,
      actionTab: 'edit',
      fieldKey: 'displayName',
    },
    {
      id: 'avatar',
      labelAr: 'صورة الملف الشخصي',
      labelEn: 'Profile Avatar',
      category: 'identity',
      weight: ITEM_WEIGHTS.avatar,
      isCompleted: Boolean(profile.avatar),
      actionTab: 'edit',
      fieldKey: 'avatar',
    },
    {
      id: 'bio',
      labelAr: 'نبذة عن الشغف والتخصص',
      labelEn: 'Bio / About',
      category: 'identity',
      weight: ITEM_WEIGHTS.bio,
      isCompleted: profile.bio.trim().length >= 20,
      actionTab: 'edit',
      fieldKey: 'bio',
      progress: Math.min(100, Math.round((profile.bio.trim().length / 20) * 100)),
    },

    // === ACTIVITY (30%) - Dynamic based on actual usage ===
    {
      id: 'workouts',
      labelAr: 'نشاط لياقة بدنية مسجل',
      labelEn: 'Fitness Activity Logged',
      category: 'activity',
      weight: ITEM_WEIGHTS.workouts,
      isCompleted: (summary.totalWorkouts || 0) > 0,
      evaluate: () => (summary.totalWorkouts || 0) > 0,
      progress: Math.min(100, Math.round(((summary.totalWorkouts || 0) / 10) * 100)), // 10 workouts = full
    },
    {
      id: 'knowledge',
      labelAr: 'نشاط معرفي (قراءة/تدوين)',
      labelEn: 'Knowledge Activity',
      category: 'activity',
      weight: ITEM_WEIGHTS.knowledge,
      isCompleted: (summary.activeNotesCount || 0) > 0 || (summary.readingHours || 0) > 0,
      evaluate: () => (summary.activeNotesCount || 0) > 0 || (summary.readingHours || 0) > 0,
      progress: Math.min(100, Math.round(
        (((summary.activeNotesCount || 0) + (summary.readingHours || 0) * 2) / 20) * 100
      )),
    },
    {
      id: 'spiritual',
      labelAr: 'سلسلة أذكار أو ممارسة روحية',
      labelEn: 'Spiritual Practice Streak',
      category: 'activity',
      weight: ITEM_WEIGHTS.spiritual,
      isCompleted: (summary.dhikrStreakDays || 0) >= 3,
      evaluate: () => (summary.dhikrStreakDays || 0) >= 3,
      progress: Math.min(100, Math.round(((summary.dhikrStreakDays || 0) / 7) * 100)),
    },
    {
      id: 'language',
      labelAr: 'تقدم في تعلم اللغة',
      labelEn: 'Language Learning Progress',
      category: 'activity',
      weight: ITEM_WEIGHTS.language,
      isCompleted: (summary.masteredWords || 0) >= 10,
      evaluate: () => (summary.masteredWords || 0) >= 10,
      progress: Math.min(100, Math.round(((summary.masteredWords || 0) / 100) * 100)),
    },

    // === CUSTOMIZATION (20%) ===
    {
      id: 'coverTheme',
      labelAr: 'سمة غلاف مخصصة',
      labelEn: 'Custom Cover Theme',
      category: 'customization',
      weight: ITEM_WEIGHTS.coverTheme,
      isCompleted: profile.coverThemeId !== 'obsidian',
      actionTab: 'privacy',
      fieldKey: 'coverTheme',
    },
    {
      id: 'status',
      labelAr: 'حالة ورمز تعبيري محدث',
      labelEn: 'Status & Emoji',
      category: 'customization',
      weight: ITEM_WEIGHTS.status,
      isCompleted: profile.statusText.trim().length > 0,
      actionTab: 'edit',
      fieldKey: 'status',
    },
    {
      id: 'featuredBadges',
      labelAr: 'أوسمة مثبتة في الرأس',
      labelEn: 'Featured Badges',
      category: 'customization',
      weight: ITEM_WEIGHTS.featuredBadges,
      isCompleted: profile.featuredBadges.length >= 1,
      actionTab: 'badges',
      fieldKey: 'featuredBadges',
      progress: Math.min(100, Math.round((profile.featuredBadges.length / 3) * 100)),
    },
    {
      id: 'privacy',
      labelAr: 'إعدادات خصوصية مخصصة',
      labelEn: 'Custom Privacy Settings',
      category: 'customization',
      weight: ITEM_WEIGHTS.privacy,
      isCompleted: 
        profile.privacySettings.hide_activity || 
        profile.privacySettings.hide_location || 
        profile.privacySettings.hide_online_status,
      actionTab: 'privacy',
      fieldKey: 'privacy',
    },

    // === SOCIAL (15%) ===
    {
      id: 'socialLinks',
      labelAr: 'حسابات تواصل مرتبطة',
      labelEn: 'Connected Social Links',
      category: 'social',
      weight: ITEM_WEIGHTS.socialLinks,
      isCompleted: Object.values(profile.socialLinks).some(Boolean),
      actionTab: 'edit',
      fieldKey: 'socialLinks',
      progress: Math.min(100, Math.round(
        (Object.values(profile.socialLinks).filter(Boolean).length / 4) * 100
      )),
    },
    {
      id: 'website',
      labelAr: 'موقع شخصي أو معرض أعمال',
      labelEn: 'Personal Website / Portfolio',
      category: 'social',
      weight: ITEM_WEIGHTS.website,
      isCompleted: profile.websiteUrl.trim().length > 0,
      actionTab: 'edit',
      fieldKey: 'website',
    },
  ];
}

/**
 * Calculates category breakdown
 */
function calculateCategoryBreakdown(items: CompletionItem[]) {
  const categories: ProfileCompletionMetrics['byCategory'] = {
    identity: { completed: 0, total: 0, percentage: 0 },
    activity: { completed: 0, total: 0, percentage: 0 },
    customization: { completed: 0, total: 0, percentage: 0 },
    social: { completed: 0, total: 0, percentage: 0 },
  };

  items.forEach(item => {
    const cat = categories[item.category];
    cat.total += item.weight;
    if (item.isCompleted) {
      cat.completed += item.weight;
    }
  });

  (Object.keys(categories) as Array<keyof typeof categories>).forEach(key => {
    const cat = categories[key];
    cat.percentage = cat.total > 0 
      ? Math.round((cat.completed / cat.total) * 100) 
      : 0;
  });

  return categories;
}

/**
 * Gets next actionable incomplete items (sorted by weight desc)
 */
function getNextActions(items: CompletionItem[], limit = 3): CompletionItem[] {
  return items
    .filter(item => !item.isCompleted)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

/**
 * Creates cache key from profile + activity data
 */
function createCompletionCacheKey(
  profile: ProfileData,
  summary: ProfileActivitySummary,
  unifiedStreakDays: number
): string {
  const profileHash = [
    profile.username,
    profile.displayName,
    Boolean(profile.avatar),
    profile.bio.length,
    profile.title,
    profile.location,
    profile.statusText,
    profile.websiteUrl,
    JSON.stringify(profile.socialLinks),
    profile.featuredBadges.length,
    profile.coverThemeId,
    profile.isPublic,
    JSON.stringify(profile.privacySettings),
  ].join('|');

  const activityHash = [
    summary.totalWorkouts,
    summary.activeNotesCount,
    summary.readingHours,
    summary.masteredWords,
    summary.dhikrStreakDays,
    unifiedStreakDays,
  ].join('|');

  // Simple hash
  let hash = 0;
  const combined = profileHash + '|' + activityHash;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return `completion:${Math.abs(hash)}`;
}

/**
 * Main entry point: Calculate profile completion metrics
 * Uses caching to avoid recomputation on every render
 */
export function calculateProfileCompletion(
  profile: ProfileData,
  summary: ProfileActivitySummary,
  unifiedStreakDays: number = 0
): ProfileCompletionMetrics {
  const cacheKey = createCompletionCacheKey(profile, summary, unifiedStreakDays);

  // Try cache first
  const cached = completionCache.read(cacheKey);
  if (cached.valid) {
    return cached.value as ProfileCompletionMetrics;
  }

  // Create items with dynamic evaluations
  const items = createCompletionItems(profile, summary);
  
  // Evaluate dynamic items
  const evaluatedItems = items.map(item => {
    if (item.evaluate) {
      const isCompleted = item.evaluate(summary, profile);
      return { ...item, isCompleted };
    }
    return item;
  });

  // Calculate totals
  const completed = evaluatedItems.filter(i => i.isCompleted);
  const percentage = completed.reduce((acc, curr) => acc + curr.weight, 0);

  const metrics: ProfileCompletionMetrics = {
    percentage: Math.min(100, percentage),
    completedCount: completed.length,
    totalCount: evaluatedItems.length,
    items: evaluatedItems,
    byCategory: calculateCategoryBreakdown(evaluatedItems),
    nextActions: getNextActions(evaluatedItems),
  };

  // Cache for 10 minutes
  completionCache.write(cacheKey, metrics, 10 * 60 * 1000);
  return metrics;
}

/**
 * Session-only version for real-time UI
 */
const sessionCompletionCache = new Map<string, ProfileCompletionMetrics>();

export function calculateProfileCompletionSession(
  profile: ProfileData,
  summary: ProfileActivitySummary,
  unifiedStreakDays: number = 0
): ProfileCompletionMetrics {
  const cacheKey = createCompletionCacheKey(profile, summary, unifiedStreakDays);

  if (sessionCompletionCache.has(cacheKey)) {
    return sessionCompletionCache.get(cacheKey)!;
  }

  const metrics = calculateProfileCompletion(profile, summary, unifiedStreakDays);
  sessionCompletionCache.set(cacheKey, metrics);
  
  // Limit session cache size
  if (sessionCompletionCache.size > 20) {
    const firstKey = sessionCompletionCache.keys().next().value;
    if (firstKey) sessionCompletionCache.delete(firstKey);
  }

  return metrics;
}

/**
 * Invalidates completion cache (call after profile/activity updates)
 */
export function invalidateCompletionCache(): void {
  completionCache.clear();
  sessionCompletionCache.clear();
}

/**
 * Gets completion for a specific profile field (for inline progress)
 */
export function getFieldCompletion(
  fieldKey: string,
  profile: ProfileData,
  summary: ProfileActivitySummary
): number {
  const items = createCompletionItems(profile, summary);
  const item = items.find(i => i.fieldKey === fieldKey);
  if (!item) return 0;
  return item.progress || (item.isCompleted ? 100 : 0);
}

/**
 * Checks if profile qualifies for Zen Elite badge
 */
export function checkZenEliteQualification(metrics: ProfileCompletionMetrics): boolean {
  // Requires 100% completion + at least 1 badge featured + custom theme + privacy configured
  return (
    metrics.percentage >= 100 &&
    metrics.byCategory.customization.percentage >= 80 &&
    metrics.byCategory.identity.percentage >= 80
  );
}