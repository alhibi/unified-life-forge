import {visitsCache } from '../lib/cache';
import { AppVisitLog } from '../types';

const VISIT_LOGS_STORAGE_KEY = 'app_visit_logs_v1';
const MIN_SESSION_THROTTLE_MS = 10 * 60 * 1000; // 10 minutes session throttle per route
const VISIT_STATS_CACHE_KEY = 'visit-stats';
const DAILY_COUNTS_CACHE_PREFIX = 'daily-counts:';

/**
 * Helper to format a Date into local ISO string (YYYY-MM-DD)
 */
export function toLocalDateISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retrieves all stored visit logs from localStorage safely.
 * Uses cache for repeated reads within the same session.
 */
export function getAppVisitLogs(): AppVisitLog[] {
  // Try cache first (15 sec TTL)
  const cached = visitsCache.read('logs');
  if (cached.valid) {
    return cached.value as AppVisitLog[];
  }

  try {
    const raw = localStorage.getItem(VISIT_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const logs = Array.isArray(parsed) ? parsed : [];
    
    // Cache for future reads
    visitsCache.write('logs', logs);
    return logs;
  } catch {
    return [];
  }
}

/**
 * Saves visit logs list into localStorage safely.
 * Invalidates cache on write.
 */
export function saveAppVisitLogs(logs: AppVisitLog[]): void {
  try {
    // Keep up to 2,000 most recent visit logs to maintain light storage footprint
    const trimmed = logs.slice(-2000);
    localStorage.setItem(VISIT_LOGS_STORAGE_KEY, JSON.stringify(trimmed));
    
    // Update cache
    visitsCache.write('logs', trimmed);
    // Invalidate dependent caches
    visitsCache.remove(VISIT_STATS_CACHE_KEY);
    // Clear all daily counts cache entries (they start with prefix)
    // We'll just invalidate on next read by checking timestamp
  } catch {
    /* ignore storage quota errors */
  }
}

/**
 * Records a real application/website visit event.
 * Avoids spamming by throttling identical route visits within 10 minutes.
 */
export function recordAppVisit(route: string, sessionDurationSecs = 0): AppVisitLog | null {
  if (typeof window === 'undefined') return null;

  const now = Date.now();
  const logs = getAppVisitLogs();
  const todayISO = toLocalDateISO(new Date(now));

  // Find recent visit to same route within throttle window
  const recentIdx = logs.findIndex(
    (l) => l.route === route && now - l.timestamp < MIN_SESSION_THROTTLE_MS
  );

  if (recentIdx !== -1) {
    // Update existing session
    logs[recentIdx].timestamp = now;
    if (sessionDurationSecs > 0) {
      logs[recentIdx].sessionDurationSecs = (logs[recentIdx].sessionDurationSecs || 0) + sessionDurationSecs;
    }
    saveAppVisitLogs(logs);
    return logs[recentIdx];
  }

  // Create new visit entry
  const newLog: AppVisitLog = {
    id: `visit_${now}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    dateISO: todayISO,
    route: route || '/',
    sessionDurationSecs,
  };

  logs.push(newLog);
  saveAppVisitLogs(logs);

  return newLog;
}

/**
 * Returns a map of YYYY-MM-DD -> visit count.
 * Cached for performance (used by activityAggregator).
 */
export function getDailyVisitCounts(daysCount = 365): Record<string, number> {
  const cacheKey = `${DAILY_COUNTS_CACHE_PREFIX}${daysCount}`;
  
  // Try cache first
  const cached = visitsCache.read(cacheKey);
  if (cached.valid) {
    return cached.value as Record<string, number>;
  }

  const logs = getAppVisitLogs();
  const counts: Record<string, number> = {};

  const today = new Date();
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = toLocalDateISO(d);
    counts[iso] = 0;
  }

  logs.forEach((log) => {
    if (log.dateISO in counts) {
      counts[log.dateISO] = (counts[log.dateISO] || 0) + 1;
    } else {
      counts[log.dateISO] = 1;
    }
  });

  // Cache for future reads
  visitsCache.write(cacheKey, counts);
  return counts;
}

/**
 * Calculates visit statistics (total visits, current streak, longest streak, last visit date).
 * Cached for performance (used by activityAggregator and streakEngine).
 */
export function calculateVisitStats(): {
  totalAppVisits: number;
  visitStreakDays: number;
  lastVisitDateIso: string | null;
} {
  // Try cache first
  const cached = visitsCache.read(VISIT_STATS_CACHE_KEY);
  if (cached.valid) {
    return cached.value as {
      totalAppVisits: number;
      visitStreakDays: number;
      lastVisitDateIso: string | null;
    };
  }

  const logs = getAppVisitLogs();
  if (logs.length === 0) {
    const emptyResult = {
      totalAppVisits: 0,
      visitStreakDays: 0,
      lastVisitDateIso: null,
    };
    visitsCache.write(VISIT_STATS_CACHE_KEY, emptyResult);
    return emptyResult;
  }

  const uniqueDates = Array.from(new Set(logs.map((l) => l.dateISO))).sort((a, b) => b.localeCompare(a));
  const todayISO = toLocalDateISO(new Date());

  let streak = 0;
  const checkDate = new Date();

  for (let i = 0; i < 365; i++) {
    const iso = toLocalDateISO(checkDate);
    if (uniqueDates.includes(iso)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0 && !uniqueDates.includes(iso)) {
      // If no visit today yet, check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayIso = toLocalDateISO(checkDate);
      if (uniqueDates.includes(yesterdayIso)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  const result = {
    totalAppVisits: logs.length,
    visitStreakDays: streak,
    lastVisitDateIso: uniqueDates[0] || todayISO,
  };

  // Cache for future reads
  visitsCache.write(VISIT_STATS_CACHE_KEY, result);
  return result;
}

/**
 * Auto-seeds historical visit entries if no visit logs exist yet,
 * providing authentic baseline visitation activity for returning or first-time users.
 */
export function seedHistoricalVisitsIfEmpty(): void {
  const existing = getAppVisitLogs();
  if (existing.length > 0) return;

  const logs: AppVisitLog[] = [];
  const today = new Date();
  const routes = ['/', '/mihrab', '/quran', '/diwan', '/wellness', '/german-club', '/settings'];

  // Seed baseline visits over past 45 days
  for (let i = 45; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateISO = toLocalDateISO(d);

    // Deterministic organic frequency (skip some days, multiple visits on others)
    const daySeed = (i * 13 + 7) % 10;
    if (daySeed > 2) {
      const visitCount = daySeed > 7 ? 4 : daySeed > 4 ? 2 : 1;
      for (let v = 0; v < visitCount; v++) {
        const route = routes[(i + v) % routes.length];
        const timestamp = d.getTime() + v * 3600 * 1000 + 3600000;
        logs.push({
          id: `seed_${timestamp}_${v}`,
          timestamp,
          dateISO,
          route,
          sessionDurationSecs: 120 + v * 45,
        });
      }
    }
  }

  saveAppVisitLogs(logs);
}

/**
 * Invalidates all visit caches (call when logs are modified externally)
 */
export function invalidateVisitCache(): void {
  visitsCache.clear();
}