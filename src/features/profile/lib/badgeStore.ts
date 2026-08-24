/**
 * Badge Store — Real-time badge evaluation with subscriptions
 * ---------------------------------------------------------------------------
 * Provides reactive badge evaluation that updates automatically
 * when underlying activity data changes.
 * 
 * Features:
 * - Event-driven badge re-evaluation
 * - Cross-module analytics aggregation
 * - Performance telemetry
 * - Subscription system for UI components
 */
import { ProfileActivitySummary, ProfileBadge } from '../types';
import { 
  invalidateActivityCache 
} from './activityAggregator';
import { 
  evaluateProfileBadges, 
  evaluateProfileBadgesSession, 
  invalidateBadgeCache, 
  precomputeBadgeEvaluations} from './badgeEvaluator';
import { invalidateCompletionCache } from './profileCompletionEngine';
import { invalidateStreakCache } from './streakEngine';
import { invalidateVisitCache } from './visitTracker';

// Types
export interface BadgeEvent {
  type: 'badge_unlocked' | 'badge_progress' | 'badge_downgrade';
  badgeId: string;
  badge: ProfileBadge;
  previousProgress: number;
  newProgress: number;
  timestamp: number;
}

export interface BadgeSubscription {
  id: string;
  callback: (event: BadgeEvent) => void;
  filter?: (badge: ProfileBadge) => boolean;
}

export interface CrossModuleInsight {
  type: 'correlation' | 'pattern' | 'recommendation' | 'milestone';
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  confidence: number; // 0-1
  relatedBadges: string[];
  relatedMetrics: string[];
  actionable: boolean;
  actionTab?: string;
}

// Event emitter for badge updates
type BadgeEventCallback = (event: BadgeEvent) => void;
const badgeSubscriptions = new Set<BadgeSubscription>();

const lastBadgeState: Map<string, ProfileBadge> = new Map();
let lastActivitySummary: ProfileActivitySummary | null = null;
let evaluationInterval: ReturnType<typeof setInterval> | null = null;
let isEvaluating = false;

/**
 * Subscribe to badge events
 */
export function subscribeToBadges(
  callback: BadgeEventCallback,
  filter?: (badge: ProfileBadge) => boolean
): () => void {
  const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const subscription: BadgeSubscription = { id, callback, filter };
  badgeSubscriptions.add(subscription);
  
  // Return unsubscribe function
  return () => {
    badgeSubscriptions.delete(subscription);
  };
}

/**
 * Emit badge event to all subscribers
 */
function emitBadgeEvent(event: BadgeEvent): void {
  badgeSubscriptions.forEach(sub => {
    if (!sub.filter || sub.filter(event.badge)) {
      try {
        sub.callback(event);
      } catch (e) {
        console.error('Badge subscription callback error:', e);
      }
    }
  });
}

/**
 * Evaluates badges and emits events for changes
 */
export async function evaluateAndEmitBadges(
  summary: ProfileActivitySummary,
  profileCompletionPercentage: number = 100,
  unifiedStreakDays: number = 0
): Promise<ProfileBadge[]> {
  if (isEvaluating) {
    // Return session cache if already evaluating
    return evaluateProfileBadgesSession(summary, profileCompletionPercentage, unifiedStreakDays);
  }
  
  isEvaluating = true;
  
  try {
    const badges = evaluateProfileBadges(summary, profileCompletionPercentage, unifiedStreakDays);
    
    // Compare with previous state and emit events
    badges.forEach(badge => {
      const prev = lastBadgeState.get(badge.id);
      const prevProgress = prev?.progressPercent || 0;
      const newProgress = badge.progressPercent;
      
      if (prevProgress !== newProgress) {
        let eventType: BadgeEvent['type'] = 'badge_progress';
        if (!prev?.unlockedAt && badge.unlockedAt) {
          eventType = 'badge_unlocked';
        } else if (prev?.unlockedAt && !badge.unlockedAt) {
          eventType = 'badge_downgrade';
        }
        
        if (prevProgress !== newProgress || eventType !== 'badge_progress') {
          emitBadgeEvent({
            type: eventType,
            badgeId: badge.id,
            badge,
            previousProgress: prevProgress,
            newProgress: newProgress,
            timestamp: Date.now(),
          });
        }
      }
    });
    
    // Update last state
    badges.forEach(b => lastBadgeState.set(b.id, b));
    lastActivitySummary = summary;
    
    return badges;
  } finally {
    isEvaluating = false;
  }
}

/**
 * Start automatic badge evaluation on interval
 * Call once at app startup
 */
export function startBadgeAutoEvaluation(
  getSummary: () => ProfileActivitySummary,
  getCompletion: () => number,
  getStreak: () => number,
  intervalMs: number = 60000 // 1 minute default
): () => void {
  if (evaluationInterval) {
    clearInterval(evaluationInterval);
  }
  
  evaluationInterval = setInterval(() => {
    const summary = getSummary();
    const completion = getCompletion();
    const streak = getStreak();
    
    // Only evaluate if data changed
    if (summary !== lastActivitySummary) {
      evaluateAndEmitBadges(summary, completion, streak);
    }
  }, intervalMs);
  
  // Initial evaluation
  evaluateAndEmitBadges(getSummary(), getCompletion(), getStreak());
  
  return () => {
    if (evaluationInterval) {
      clearInterval(evaluationInterval);
      evaluationInterval = null;
    }
  };
}

/**
 * Stop automatic badge evaluation
 */
export function stopBadgeAutoEvaluation(): void {
  if (evaluationInterval) {
    clearInterval(evaluationInterval);
    evaluationInterval = null;
  }
}

/**
 * Invalidates ALL profile caches and triggers fresh evaluation
 * Call after major data changes (sync, import, etc.)
 */
export async function invalidateAllProfileCachesAndReevaluate(
  getSummary: () => ProfileActivitySummary,
  getCompletion: () => number,
  getStreak: () => number
): Promise<ProfileBadge[]> {
  // Invalidate all caches
  invalidateBadgeCache();
  invalidateActivityCache();
  invalidateCompletionCache();
  invalidateStreakCache();
  invalidateVisitCache();
  
  // Force fresh evaluation
  const summary = getSummary();
  const completion = getCompletion();
  const streak = getStreak();
  
  return precomputeBadgeEvaluations(summary, completion, streak);
}

/**
 * Generates cross-module insights from activity data
 * Provides actionable recommendations based on patterns
 */
export function generateCrossModuleInsights(
  summary: ProfileActivitySummary,
  badges: ProfileBadge[],
  completionMetrics: { percentage: number; byCategory: Record<string, { completed: number; total: number; percentage: number }> }
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];
  
  // Insight 1: Fitness + Spiritual correlation
  if (summary.totalWorkouts > 0 && summary.dhikrStreakDays > 0) {
    insights.push({
      type: 'correlation',
      titleAr: 'لياقة وروح متوازنة',
      titleEn: 'Balanced Fitness & Spirit',
      descriptionAr: `تمارس الرياضة (${summary.totalWorkouts} تمرين) وتواظب على الأذكار (${summary.dhikrStreakDays} يوم)`,
      descriptionEn: `Active fitness (${summary.totalWorkouts} workouts) with spiritual consistency (${summary.dhikrStreakDays} days)`,
      confidence: 0.85,
      relatedBadges: ['badge_night_runner', 'badge_dhikr_guardian'],
      relatedMetrics: ['totalWorkouts', 'dhikrStreakDays'],
      actionable: true,
      actionTab: 'activity',
    });
  }
  
  // Insight 2: Knowledge depth
  if (summary.activeNotesCount > 10 && summary.readingHours > 5) {
    insights.push({
      type: 'pattern',
      titleAr: 'باحث عميق',
      titleEn: 'Deep Researcher',
      descriptionAr: `${summary.activeNotesCount} ملاحظة و ${summary.readingHours} ساعة قراءة - نمط تعلم عميق`,
      descriptionEn: `${summary.activeNotesCount} notes and ${summary.readingHours}h reading - deep learning pattern`,
      confidence: 0.9,
      relatedBadges: ['badge_knowledge_pioneer', 'badge_thought_archivist'],
      relatedMetrics: ['activeNotesCount', 'readingHours'],
      actionable: true,
      actionTab: 'badges',
    });
  }
  
  // Insight 3: Language learning momentum
  if (summary.masteredWords > 50 && summary.shelfMasteryPercent > 30) {
    insights.push({
      type: 'milestone',
      titleAr: 'زخم تعلم اللغة',
      titleEn: 'Language Learning Momentum',
      descriptionAr: `${summary.masteredWords} مفردة محفوظة و ${summary.shelfMasteryPercent}% إتقان الأرفف`,
      descriptionEn: `${summary.masteredWords} words mastered and ${summary.shelfMasteryPercent}% shelf mastery`,
      confidence: 0.8,
      relatedBadges: ['badge_german_master', 'badge_dictionary_scholar'],
      relatedMetrics: ['masteredWords', 'shelfMasteryPercent'],
      actionable: true,
      actionTab: 'badges',
    });
  }
  
  // Insight 4: Near-completion badges
  const nearBadges = badges.filter(b => b.progressPercent >= 80 && b.progressPercent < 100 && !b.unlockedAt);
  if (nearBadges.length > 0) {
    insights.push({
      type: 'recommendation',
      titleAr: 'أوسمة على وشك الفتح',
      titleEn: 'Badges Near Unlock',
      descriptionAr: `${nearBadges.length} وسام بتقدم 80%+ - ركّز عليها للفتح`,
      descriptionEn: `${nearBadges.length} badges at 80%+ progress - focus to unlock`,
      confidence: 0.95,
      relatedBadges: nearBadges.map(b => b.id),
      relatedMetrics: [],
      actionable: true,
      actionTab: 'badges',
    });
  }
  
  // Insight 5: Completion category gaps
  const categories = completionMetrics.byCategory;
  if (categories) {
    const entries = Object.entries(categories) as Array<[string, { completed: number; total: number; percentage: number }]>;
    const lowestCat = entries.sort((a, b) => a[1].percentage - b[1].percentage)[0];
    
    if (lowestCat && lowestCat[1].percentage < 50) {
      const catNames: Record<string, { ar: string; en: string }> = {
        identity: { ar: 'الهوية', en: 'Identity' },
        activity: { ar: 'النشاط', en: 'Activity' },
        customization: { ar: 'التخصيص', en: 'Customization' },
        social: { ar: 'التواصل', en: 'Social' },
      };
      
      insights.push({
        type: 'recommendation',
        titleAr: `فئة تحتاج اهتمام: ${catNames[lowestCat[0]]?.ar || lowestCat[0]}`,
        titleEn: `Category Needs Attention: ${catNames[lowestCat[0]]?.en || lowestCat[0]}`,
        descriptionAr: `إكمال ${lowestCat[1].percentage}% فقط - حسّن هذه الفئة للوصول لـ 100%`,
        descriptionEn: `Only ${lowestCat[1].percentage}% complete - improve to reach 100%`,
        confidence: 0.9,
        relatedBadges: ['badge_zen_elite'],
        relatedMetrics: [lowestCat[0]],
        actionable: true,
        actionTab: 'edit',
      });
    }
  }
  
  // Insight 6: Consistency check
  if (summary.visitStreakDays > 0 && summary.visitStreakDays < 7) {
    insights.push({
      type: 'pattern',
      titleAr: 'بناء عادة الزيارة',
      titleEn: 'Building Visit Habit',
      descriptionAr: `سلسلة زيارات ${summary.visitStreakDays} أيام - استمر لـ 7 أيام`,
      descriptionEn: `${summary.visitStreakDays} day visit streak - continue to 7 days`,
      confidence: 0.75,
      relatedBadges: ['badge_eternal_flame', 'badge_consistency_king'],
      relatedMetrics: ['visitStreakDays'],
      actionable: true,
      actionTab: 'activity',
    });
  }
  
  return insights.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Performance telemetry for badge system
 */
export interface BadgeTelemetry {
  evaluationCount: number;
  cacheHits: number;
  cacheMisses: number;
  averageEvaluationMs: number;
  lastEvaluationMs: number;
  eventsEmitted: number;
  subscribersCount: number;
}

const telemetry: BadgeTelemetry = {
  evaluationCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageEvaluationMs: 0,
  lastEvaluationMs: 0,
  eventsEmitted: 0,
  subscribersCount: 0,
};

/**
 * Record evaluation timing
 */
export function recordBadgeEvaluationTime(ms: number, fromCache: boolean): void {
  telemetry.evaluationCount++;
  telemetry.lastEvaluationMs = ms;
  
  if (fromCache) {
    telemetry.cacheHits++;
  } else {
    telemetry.cacheMisses++;
  }
  
  // Running average
  telemetry.averageEvaluationMs = 
    (telemetry.averageEvaluationMs * (telemetry.evaluationCount - 1) + ms) / telemetry.evaluationCount;
}

/**
 * Get telemetry snapshot
 */
export function getBadgeTelemetry(): BadgeTelemetry {
  return {
    ...telemetry,
    subscribersCount: badgeSubscriptions.size,
  };
}

/**
 * Reset telemetry
 */
export function resetBadgeTelemetry(): void {
  telemetry.evaluationCount = 0;
  telemetry.cacheHits = 0;
  telemetry.cacheMisses = 0;
  telemetry.averageEvaluationMs = 0;
  telemetry.lastEvaluationMs = 0;
  telemetry.eventsEmitted = 0;
}

/**
 * Wraps evaluateProfileBadges with telemetry
 */
export function evaluateProfileBadgesWithTelemetry(
  summary: ProfileActivitySummary,
  profileCompletionPercentage: number = 100,
  unifiedStreakDays: number = 0
): ProfileBadge[] {
  const start = performance.now();
  
  // Check session cache first
  const cached = evaluateProfileBadgesSession(summary, profileCompletionPercentage, unifiedStreakDays);
  const fromCache = cached.length > 0 && cached.some(b => b.progressPercent > 0);
  
  if (!fromCache) {
    // Force fresh evaluation
    const result = evaluateProfileBadges(summary, profileCompletionPercentage, unifiedStreakDays);
    recordBadgeEvaluationTime(performance.now() - start, false);
    return result;
  }
  
  recordBadgeEvaluationTime(performance.now() - start, true);
  return cached;
}

/**
 * Clears all badge state (for testing/logout)
 */
export function clearBadgeState(): void {
  lastBadgeState.clear();
  lastActivitySummary = null;
  badgeSubscriptions.clear();
  stopBadgeAutoEvaluation();
}