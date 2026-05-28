import type { FeedSource, ReaderPrefs } from './types';
import { DEFAULT_FEEDS } from './feeds';

/**
 * localStorage adapter — every reader on this device shares the same
 * keyspace. Values are forward-compatible: an unknown shape is treated
 * as "not present" and replaced with defaults instead of crashing.
 *
 * Each helper wraps the raw `localStorage` calls in try/catch because
 * Safari Private Mode + storage-quota errors throw, and a reader UI
 * crashing on a localStorage error would be a worse bug than silently
 * failing to persist a single setting.
 */

export const FEEDS_KEY = 'rss-reader-feeds-v2';
export const BOOKMARKS_KEY = 'rss-reader-bookmarks';
export const READ_KEY = 'rss-reader-read';
export const LAST_REFRESH_KEY = 'rss-reader-last-refresh';
export const SCROLL_POS_KEY = 'rss-reader-scroll-pos';
export const READER_PREFS_KEY = 'rss-reader-prefs-v1';
export const NOTIFICATION_PREFS_KEY = 'rss-reader-notification-prefs-v1';
export const SEARCH_HISTORY_KEY = 'rss-reader-search-history-v1';
export const READER_HISTORY_KEY = 'rss-reader-reader-history-v1';
export const OFFLINE_PREFS_KEY = 'rss-reader-offline-prefs-v1';
export const FEED_FREQUENCY_KEY = 'rss-reader-feed-frequency-v1';

// ─── Feeds ────────────────────────────────────────────────────────────

export function getStoredFeeds(): FeedSource[] {
  try {
    const stored = localStorage.getItem(FEEDS_KEY);
    if (!stored) return DEFAULT_FEEDS;
    const parsed = JSON.parse(stored);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      typeof parsed[0] === 'object' &&
      typeof parsed[0].url === 'string'
    ) return parsed as FeedSource[];
    return DEFAULT_FEEDS;
  } catch {
    return DEFAULT_FEEDS;
  }
}

export function storeFeeds(feeds: FeedSource[]): void {
  try { localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds)); } catch { /* quota */ }
}

// ─── Bookmarks + read state ───────────────────────────────────────────

export function getBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch { return []; }
}

export function storeBookmarks(b: string[]): void {
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(b)); } catch { /* quota */ }
}

export function getReadArticles(): string[] {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch { return []; }
}

export function storeReadArticles(r: string[]): void {
  try {
    // Cap the read-list at 50 000 entries — generous enough to track
    // read state across months of heavy usage without ever losing data.
    const capped = r.length > 50000 ? r.slice(-50000) : r;
    localStorage.setItem(READ_KEY, JSON.stringify(capped));
  } catch { /* quota */ }
}

// ─── Reader prefs ─────────────────────────────────────────────────────

const DEFAULT_PREFS: ReaderPrefs = {
  fontSize: 'md',
  lineHeight: 'normal',
  theme: 'system',
  fontFamily: 'sans',
};

export function getReaderPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem(READER_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed } as ReaderPrefs;
  } catch { return DEFAULT_PREFS; }
}

export function storeReaderPrefs(p: ReaderPrefs): void {
  try { localStorage.setItem(READER_PREFS_KEY, JSON.stringify(p)); } catch { /* quota */ }
}

/** Remember scroll position keyed by tab/source so navigation feels persistent. */
export function getScrollPos(key: string): number {
  try {
    const raw = localStorage.getItem(SCROLL_POS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return typeof parsed[key] === 'number' ? parsed[key] : 0;
  } catch { return 0; }
}

export function storeScrollPos(key: string, y: number): void {
  try {
    const raw = localStorage.getItem(SCROLL_POS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[key] = y;
    localStorage.setItem(SCROLL_POS_KEY, JSON.stringify(parsed));
  } catch { /* quota */ }
}

// ─── Notification preferences ─────────────────────────────────────────
// Per-device: even though keyword alerts themselves live server-side,
// the Web Notification permission and "quiet hours" choice are device-
// specific (you may want desktop notifications on your laptop but not
// on your work phone). Stored locally so they don't require auth.

export interface NotificationPrefs {
  /** Whether the user has opted into browser notifications at all. */
  enabled: boolean;
  /** "HH:mm" 24h format. Notifications during this window are silenced. */
  quietStart: string;
  quietEnd: string;
  /** "instant" fires every match; "digest" coalesces hourly. */
  frequency: 'instant' | 'digest';
  /** Mute everything until this ISO timestamp (snooze for 1 / 8 / 24h). */
  mutedUntil: string | null;
  /** Whether to also play a soft sound when a notification fires. */
  sound: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  frequency: 'instant',
  mutedUntil: null,
  sound: false,
};

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed } as NotificationPrefs;
  } catch { return DEFAULT_NOTIFICATION_PREFS; }
}

export function storeNotificationPrefs(p: NotificationPrefs): void {
  try {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(p));
  } catch { /* quota */ }
}

/**
 * Determine whether a notification should fire *right now* given the
 * current prefs. Returns a reason string when blocked so the caller
 * can show it in a debug panel.
 */
export function notificationsActive(p: NotificationPrefs, now = new Date()):
  | { ok: true }
  | { ok: false; reason: 'disabled' | 'muted' | 'quiet-hours' }
{
  if (!p.enabled) return { ok: false, reason: 'disabled' };
  if (p.mutedUntil) {
    const t = new Date(p.mutedUntil).getTime();
    if (!Number.isNaN(t) && t > now.getTime()) {
      return { ok: false, reason: 'muted' };
    }
  }
  // Quiet hours: handle wrap-around (22:00 → 07:00 spans midnight).
  if (p.quietStart && p.quietEnd && p.quietStart !== p.quietEnd) {
    const [sh, sm] = p.quietStart.split(':').map((x) => parseInt(x, 10));
    const [eh, em] = p.quietEnd.split(':').map((x) => parseInt(x, 10));
    const startMins = (sh || 0) * 60 + (sm || 0);
    const endMins = (eh || 0) * 60 + (em || 0);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const inWindow = startMins < endMins
      ? nowMins >= startMins && nowMins < endMins
      : nowMins >= startMins || nowMins < endMins;
    if (inWindow) return { ok: false, reason: 'quiet-hours' };
  }
  return { ok: true };
}

// ─── Search history ───────────────────────────────────────────────────
// Last N successful queries the user typed in the archive search.
// Stored locally so we can suggest "recent searches" before any input
// without a roundtrip. Each entry remembers the query and a timestamp
// so the suggestion list can age out stale ones.

export interface SearchHistoryEntry {
  q: string;
  at: number;
  /** Number of results last time we ran it (UI hint, optional). */
  hits?: number;
}

const SEARCH_HISTORY_LIMIT = 50;

export function getSearchHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.q === 'string' && typeof e.at === 'number')
      .slice(0, SEARCH_HISTORY_LIMIT) as SearchHistoryEntry[];
  } catch { return []; }
}

/** Add `q` to the front of history, dedupe on case-insensitive match. */
export function pushSearchHistory(q: string, hits?: number): void {
  const trimmed = q.trim();
  if (trimmed.length < 2) return;
  try {
    const cur = getSearchHistory();
    const lc = trimmed.toLowerCase();
    const filtered = cur.filter((e) => e.q.toLowerCase() !== lc);
    const next = [{ q: trimmed, at: Date.now(), hits }, ...filtered]
      .slice(0, SEARCH_HISTORY_LIMIT);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch { /* quota */ }
}

export function clearSearchHistory(): void {
  try { localStorage.removeItem(SEARCH_HISTORY_KEY); } catch { /* */ }
}

export function removeSearchHistoryEntry(q: string): void {
  try {
    const cur = getSearchHistory();
    const next = cur.filter((e) => e.q.toLowerCase() !== q.toLowerCase());
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch { /* */ }
}

// ─── Reader View history ──────────────────────────────────────────────
// Last 20 arbitrary URLs the user pasted into "Reader". Lets us show a
// "recently read" list under the URL input so revisiting a research
// thread is one tap, not "find the email I sent myself".

export interface ReaderHistoryEntry {
  url: string;
  title: string;
  siteName?: string;
  image?: string | null;
  at: number;
}

const READER_HISTORY_LIMIT = 50;

export function getReaderHistory(): ReaderHistoryEntry[] {
  try {
    const raw = localStorage.getItem(READER_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.url === 'string' && typeof e.at === 'number')
      .slice(0, READER_HISTORY_LIMIT) as ReaderHistoryEntry[];
  } catch { return []; }
}

export function pushReaderHistory(entry: Omit<ReaderHistoryEntry, 'at'>): void {
  const url = entry.url?.trim();
  if (!url) return;
  try {
    const cur = getReaderHistory();
    const filtered = cur.filter((e) => e.url !== url);
    const next: ReaderHistoryEntry[] = [
      { ...entry, url, at: Date.now() },
      ...filtered,
    ].slice(0, READER_HISTORY_LIMIT);
    localStorage.setItem(READER_HISTORY_KEY, JSON.stringify(next));
  } catch { /* quota */ }
}

export function removeReaderHistoryEntry(url: string): void {
  try {
    const cur = getReaderHistory();
    const next = cur.filter((e) => e.url !== url);
    localStorage.setItem(READER_HISTORY_KEY, JSON.stringify(next));
  } catch { /* */ }
}

export function clearReaderHistory(): void {
  try { localStorage.removeItem(READER_HISTORY_KEY); } catch { /* */ }
}

// ─── Offline storage preferences ──────────────────────────────────────
// User-controllable "auto-cache the last N unread articles" setting,
// plus an opt-in for caching all images (default off because images
// are the bulk of disk usage).

export interface OfflinePrefs {
  /** Auto-cache the most recent N unread articles in the background. */
  autoCacheCount: 0 | 10 | 25 | 50 | 100 | 250 | 500;
  /** Also pre-cache the article images, not just the text. */
  cacheImages: boolean;
  /** DEPRECATED: Articles are now stored permanently. Kept for compat. */
  retentionDays: 'forever' | 30 | 60 | 90 | 180 | 365;
}

const DEFAULT_OFFLINE_PREFS: OfflinePrefs = {
  autoCacheCount: 100,
  cacheImages: true,
  retentionDays: 'forever',
};

export function getOfflinePrefs(): OfflinePrefs {
  try {
    const raw = localStorage.getItem(OFFLINE_PREFS_KEY);
    if (!raw) return DEFAULT_OFFLINE_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_OFFLINE_PREFS, ...parsed } as OfflinePrefs;
  } catch { return DEFAULT_OFFLINE_PREFS; }
}

export function storeOfflinePrefs(p: OfflinePrefs): void {
  try { localStorage.setItem(OFFLINE_PREFS_KEY, JSON.stringify(p)); } catch { /* quota */ }
}

// ─── Per-feed publication-frequency cache ─────────────────────────────
// The "site posts every X" estimate that drives the Add-Feed Preview
// description ("publishes ~3 articles/day"). We compute it from the
// pubDates of the preview items the discover-feed function returns,
// then memoise per source URL so repeat lookups don't hit the network.

export interface FeedFrequency {
  /** Median minutes between successive publications. */
  medianMinutes: number;
  /** Sample size used for the estimate. */
  samples: number;
  /** When the estimate was last computed. */
  computedAt: number;
}

export function getFeedFrequencies(): Record<string, FeedFrequency> {
  try {
    const raw = localStorage.getItem(FEED_FREQUENCY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

export function setFeedFrequency(url: string, f: FeedFrequency): void {
  try {
    const cur = getFeedFrequencies();
    cur[url] = f;
    localStorage.setItem(FEED_FREQUENCY_KEY, JSON.stringify(cur));
  } catch { /* */ }
}

/**
 * Format `medianMinutes` as a human-readable cadence ("~3/day", "weekly").
 * Pure function so callers can render in any locale wrapper.
 */
export function describeFrequency(
  f: FeedFrequency | undefined,
  isAr: boolean,
): string {
  if (!f || f.samples < 3) return '';
  const m = f.medianMinutes;
  if (m < 60) {
    const perHour = Math.round(60 / m);
    return isAr ? `≈${perHour} مقالة/ساعة` : `≈${perHour}/hour`;
  }
  if (m < 60 * 12) {
    const perDay = Math.max(1, Math.round((60 * 24) / m));
    return isAr ? `≈${perDay} مقالة/يوم` : `≈${perDay}/day`;
  }
  if (m < 60 * 24 * 3) {
    return isAr ? 'يومي تقريباً' : 'roughly daily';
  }
  if (m < 60 * 24 * 10) {
    const perWeek = Math.max(1, Math.round((60 * 24 * 7) / m));
    return isAr ? `≈${perWeek} مقالة/أسبوع` : `≈${perWeek}/week`;
  }
  if (m < 60 * 24 * 45) {
    return isAr ? 'أسبوعي' : 'weekly';
  }
  return isAr ? 'شهري أو أقل' : 'monthly or less';
}
