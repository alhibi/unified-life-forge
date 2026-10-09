/**
 * Deterministic per-source refresh scheduling.
 *
 * Each source carries its own failure streak and next-eligible time, so one
 * broken feed backs off on its own instead of slowing (or spamming) the whole
 * library. Pure functions + a tiny persisted map — no React, no timers.
 */
import { z } from 'zod';

import type { FeedSource } from './types';

export const SOURCE_BACKOFF_KEY = 'reading:source-backoff:v1';
/** First retry delay after a failure. */
export const BACKOFF_BASE_MS = 5 * 60 * 1000;
/** Ceiling for any single source's delay. */
export const BACKOFF_MAX_MS = 6 * 60 * 60 * 1000;

const entrySchema = z.object({
  failures: z.number().int().min(0),
  nextAttemptAt: z.number().min(0),
  lastError: z.string().max(300).nullable(),
});
const stateSchema = z.record(z.string(), entrySchema);

export type SourceBackoffEntry = z.infer<typeof entrySchema>;
export type SourceBackoffState = Readonly<Record<string, SourceBackoffEntry>>;

/** Delay after `failures` consecutive failures: 5m, 10m, 20m … capped at 6h. */
export function backoffDelay(failures: number): number {
  if (failures <= 0) return 0;
  return Math.min(BACKOFF_BASE_MS * 2 ** (failures - 1), BACKOFF_MAX_MS);
}

export interface RefreshPlan {
  due: FeedSource[];
  deferred: Array<{ feed: FeedSource; nextAttemptAt: number }>;
}

/**
 * Split enabled sources into those due now and those still backing off.
 * `force` (a user-initiated pull) ignores backoff entirely. Order of `due`
 * is stable: healthy sources first, then recovering ones by fewest failures,
 * each group keeping the user's library order.
 */
export function planRefresh(
  feeds: ReadonlyArray<FeedSource>,
  state: SourceBackoffState,
  now: number,
  force = false,
): RefreshPlan {
  const due: Array<{ feed: FeedSource; failures: number; index: number }> = [];
  const deferred: RefreshPlan['deferred'] = [];
  feeds.forEach((feed, index) => {
    if (!feed.enabled) return;
    const entry = state[feed.url];
    if (!force && entry && entry.nextAttemptAt > now) {
      deferred.push({ feed, nextAttemptAt: entry.nextAttemptAt });
      return;
    }
    due.push({ feed, failures: entry?.failures ?? 0, index });
  });
  due.sort((a, b) => a.failures - b.failures || a.index - b.index);
  return { due: due.map((d) => d.feed), deferred };
}

/** Apply refresh outcomes; successes clear a source's streak. */
export function recordOutcomes(
  state: SourceBackoffState,
  outcomes: ReadonlyArray<{ url: string; ok: boolean; error?: string | null }>,
  now: number,
): SourceBackoffState {
  const next: Record<string, SourceBackoffEntry> = { ...state };
  for (const { url, ok, error } of outcomes) {
    if (ok) {
      delete next[url];
      continue;
    }
    const failures = (next[url]?.failures ?? 0) + 1;
    next[url] = {
      failures,
      nextAttemptAt: now + backoffDelay(failures),
      lastError: error ? error.slice(0, 300) : null,
    };
  }
  return next;
}

/** Drop entries for sources no longer in the library. */
export function pruneState(
  state: SourceBackoffState,
  feeds: ReadonlyArray<FeedSource>,
): SourceBackoffState {
  const urls = new Set(feeds.map((f) => f.url));
  const next: Record<string, SourceBackoffEntry> = {};
  for (const [url, entry] of Object.entries(state)) if (urls.has(url)) next[url] = entry;
  return next;
}

export function loadBackoffState(): SourceBackoffState {
  try {
    const raw = localStorage.getItem(SOURCE_BACKOFF_KEY);
    if (!raw) return {};
    const parsed = stateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function saveBackoffState(state: SourceBackoffState): void {
  try {
    if (Object.keys(state).length === 0) localStorage.removeItem(SOURCE_BACKOFF_KEY);
    else localStorage.setItem(SOURCE_BACKOFF_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode — backoff simply resets next session */
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
