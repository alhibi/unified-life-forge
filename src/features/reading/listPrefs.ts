/**
 * Reading-list display preferences (sort, grouping, density,
 * auto-mark-on-scroll). Persisted in localStorage so a user's choices
 * survive across sessions on the same device.
 *
 * Inspired by ReadYou and CapyReader: those Android RSS readers
 * surface these knobs as first-class settings rather than burying
 * them. Users very quickly form a strong preference (e.g. "I always
 * want oldest first, grouped by day, marked-as-read on scroll") and
 * resent having to rebuild it every visit.
 */

import { useEffect, useState } from 'react';
import { loadReaderPrefs, saveReaderPrefs } from './api';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

/** Ordering applied to the article list before rendering. */
export type SortMode = 'newest' | 'oldest' | 'unread-first';

/** Whether (and how) to insert section headers in the list. */
export type GroupMode = 'off' | 'date';

/**
 * Visual density for the list rows.
 *  - comfortable: current default — thumbnails, multi-line, generous spacing.
 *  - compact: tighter rows, no thumbnail, single-line title (good for
 *    skimming a 200-item list at a glance).
 *  - cards: large card-style with bigger thumbnail, bigger heading.
 */
export type Density = 'comfortable' | 'compact' | 'cards';

export interface ListPrefs {
  sort: SortMode;
  group: GroupMode;
  density: Density;
  /** When true, an article scrolling past the top of the viewport is
   *  marked as read automatically. ReadYou's signature behaviour. */
  autoMarkOnScroll: boolean;
  /** When true, on lg+ screens the article reader renders alongside
   *  the list (split pane) instead of replacing it. */
  twoPaneOnDesktop: boolean;
}

const DEFAULT_LIST_PREFS: ListPrefs = {
  sort: 'newest',
  group: 'off',
  density: 'comfortable',
  autoMarkOnScroll: false,
  twoPaneOnDesktop: true,
};

const KEY = 'rss-reader-list-prefs-v1';

export function getListPrefs(): ListPrefs {
  if (typeof localStorage === 'undefined') return DEFAULT_LIST_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_LIST_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_LIST_PREFS, ...parsed } as ListPrefs;
  } catch {
    return DEFAULT_LIST_PREFS;
  }
}

export function storeListPrefs(p: ListPrefs): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* quota */ }
}

/**
 * Convenience hook: returns the current prefs and a setter that
 * persists every change. Cheap — re-renders only when prefs change.
 */
export function useListPrefs(): [ListPrefs, (next: Partial<ListPrefs>) => void] {
  const [prefs, setPrefs] = useState<ListPrefs>(getListPrefs);

  useEffect(() => {
    const syncPrefs = async () => {
      if (!isSupabaseConfigured) return;
      try {
        const cloudPrefs = await loadReaderPrefs();
        if (cloudPrefs) {
          const listPrefs: ListPrefs = {
            sort: (cloudPrefs.listSort as SortMode) || prefs.sort,
            group: prefs.group,
            density: prefs.density,
            autoMarkOnScroll: prefs.autoMarkOnScroll,
            twoPaneOnDesktop: prefs.twoPaneOnDesktop,
          };
          localStorage.setItem(KEY, JSON.stringify(listPrefs));
          setPrefs(listPrefs);
        }
      } catch (e) {
        console.error(e);
      }
    };
    syncPrefs();
  }, []);

  useEffect(() => {
    storeListPrefs(prefs);
    if (isSupabaseConfigured) {
      loadReaderPrefs().then((curCloud) => {
        const updated = {
          ...(curCloud || {}),
          listSort: prefs.sort,
        };
        saveReaderPrefs(updated as any).catch(console.error);
      }).catch(console.error);
    }
  }, [prefs]);

  const update = (next: Partial<ListPrefs>) =>
    setPrefs((cur) => ({ ...cur, ...next }));
  return [prefs, update];
}

// ─── Date-grouping helpers ────────────────────────────────────────────
// We bucket articles by the user's local time, not UTC, so an article
// published "yesterday at 23:50" doesn't get classified as "today"
// just because the device's UTC offset is positive.

export type DateBucket =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'thisMonth'
  | 'older';

export function bucketOf(dateStr: string, now = new Date()): DateBucket {
  if (!dateStr) return 'older';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'older';
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const t = d.getTime();
  if (t >= todayMs) return 'today';
  if (t >= todayMs - dayMs) return 'yesterday';
  if (t >= todayMs - 7 * dayMs) return 'thisWeek';
  if (t >= todayMs - 30 * dayMs) return 'thisMonth';
  return 'older';
}

export function bucketLabel(bucket: DateBucket): string {
  switch (bucket) {
    case 'today':     return 'اليوم';
    case 'yesterday': return 'أمس';
    case 'thisWeek':  return 'هذا الأسبوع';
    case 'thisMonth': return 'هذا الشهر';
    case 'older':     return 'أقدم';
  }
}

/** Display order so headers always render in a stable, sensible sequence. */
export const BUCKET_ORDER: ReadonlyArray<DateBucket> = [
  'today',
  'yesterday',
  'thisWeek',
  'thisMonth',
  'older',
];
