import type { FeedSource, ReaderPrefs } from './types';
import { DEFAULT_FEEDS } from './feeds';

/**
 * localStorage adapter — every reader on this device shares the same
 * keyspace. Values are forward-compatible: an unknown shape is treated
 * as "not present" and replaced with defaults instead of crashing.
 */

export const FEEDS_KEY = 'rss-reader-feeds-v2';
export const BOOKMARKS_KEY = 'rss-reader-bookmarks';
export const READ_KEY = 'rss-reader-read';
export const LAST_REFRESH_KEY = 'rss-reader-last-refresh';
export const SCROLL_POS_KEY = 'rss-reader-scroll-pos';
export const READER_PREFS_KEY = 'rss-reader-prefs-v1';

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
    // Cap the read-list at 5 000 entries to avoid unbounded growth.
    const capped = r.length > 5000 ? r.slice(-5000) : r;
    localStorage.setItem(READ_KEY, JSON.stringify(capped));
  } catch { /* quota */ }
}

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
