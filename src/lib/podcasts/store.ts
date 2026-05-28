// localStorage-backed subscription + episode play state.
//
// Mirrors the slice of Podium's Room database that the UI actually
// reads:
//   • `PodcastSubscriptionDao` → `subscriptions`
//   • `PodcastEpisodePlayStateDao` → `playStates`
// All "downloads", "queue", and "sync action" tables are intentionally
// out of scope for this web port — they're not features the user asked
// for and they involve background work the browser can't really do
// reliably without a service-worker rabbit hole.
//
// Storage layout (separate keys to keep writes small and avoid one
// `JSON.stringify` of the whole world per state mutation):
//   `podcasts.subs`         → SubscribedPodcast[]
//   `podcasts.playState`    → Record<episodeId, PlayState>
//   `podcasts.lastPlayed`   → LastPlayedRecord | null  (boots the mini-player)
//   `podcasts.recents`      → RecentEpisodeRecord[]    (continue-listening)
//
// Cross-tab sync is wired via the `storage` event so opening the app
// in two tabs and subscribing in one updates the other's library.
//
// Subscriber model:
// We keep four INDEPENDENT subscriber sets — one per slice. A write
// to `playState` (which happens once a second during playback) only
// notifies components that opted into the play-state slice; it does
// not re-render the library page or the country-search dialog. This
// matters because before the split we re-rendered every consumer of
// `useSubscriptions()` 1Hz the whole time audio was playing. With 50
// `EpisodeListItem`s on a podcast detail page, that was a measurable
// scroll-jank source.

import type { PodcastEpisode } from './rss';

export interface SubscribedPodcast {
  /** RSS feed URL — same value used as `PodcastModel.origin` in Podium. */
  origin: string;
  title: string;
  author: string;
  imageUrl: string;
  /** Source page (Apple Podcasts URL) — purely informational. */
  link: string;
  /** HSL seed color extracted from the cover, used for dynamic theming. */
  seedH: number;
  seedS: number;
  seedL: number;
  subscribedAt: number;
}

export interface PlayState {
  episodeId: string;
  /** Playback position in seconds. */
  position: number;
  /** Duration we observed when last touched (seconds). */
  duration: number;
  played: boolean;
  /** ms since epoch — drives the "Continue listening" sort. */
  updatedAt: number;
}

/**
 * Snapshot of the most-recently-active track so the mini-player can
 * reappear (paused) after the tab is closed and reopened. Same shape
 * as `PlayingEpisodeMeta` in `PodcastPlayerContext` minus the optional
 * auto-play queue (we don't persist queues; the player can rebuild one
 * on demand if the user navigates back to the podcast detail page).
 */
export interface LastPlayedRecord {
  episode: PodcastEpisode;
  podcastTitle: string;
  podcastImageUrl: string;
  seedH: number | null;
  seedS: number | null;
  seedL: number | null;
}

/**
 * Episode that's been started but not finished — drives the
 * "Continue listening" rail in the library. Same shape as
 * `LastPlayedRecord`, kept as a separate type so future fields
 * (queue position, etc.) can diverge without churning the
 * single-track resume path.
 */
export interface RecentEpisodeRecord extends LastPlayedRecord {
  /** ms since epoch — drives the rail's recency sort. */
  startedAt: number;
}

const SUBS_KEY = 'podcasts.subs';
const PLAY_KEY = 'podcasts.playState';
const LAST_KEY = 'podcasts.lastPlayed';
const RECENTS_KEY = 'podcasts.recents';
/** Cap for the recents rail. 20 gives power users plenty of headroom
 *  for switching between many podcasts without bloating localStorage. */
const RECENTS_LIMIT = 20;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota / private mode — silent: an episode that fails to save its
    // resume position will just start over, which is a non-critical
    // degradation.
  }
}

/* -------------------------------------------------------------------------- */
/*  Subscriptions                                                             */
/* -------------------------------------------------------------------------- */

export function getSubscriptions(): SubscribedPodcast[] {
  return read<SubscribedPodcast[]>(SUBS_KEY, []);
}

export function isSubscribed(origin: string): boolean {
  return getSubscriptions().some(s => s.origin === origin);
}

export function subscribe(podcast: Omit<SubscribedPodcast, 'subscribedAt'>): SubscribedPodcast[] {
  const subs = getSubscriptions().filter(s => s.origin !== podcast.origin);
  subs.unshift({ ...podcast, subscribedAt: Date.now() });
  write(SUBS_KEY, subs);
  return subs;
}

export function unsubscribe(origin: string): SubscribedPodcast[] {
  const subs = getSubscriptions().filter(s => s.origin !== origin);
  write(SUBS_KEY, subs);
  return subs;
}

/* -------------------------------------------------------------------------- */
/*  Play state                                                                */
/* -------------------------------------------------------------------------- */

type PlayMap = Record<string, PlayState>;

export function getPlayStateMap(): PlayMap {
  return read<PlayMap>(PLAY_KEY, {});
}

export function getPlayState(episodeId: string): PlayState | null {
  return getPlayStateMap()[episodeId] ?? null;
}

export function savePlayState(state: PlayState) {
  const map = getPlayStateMap();
  map[state.episodeId] = state;
  write(PLAY_KEY, map);
}

export function markEpisodePlayed(episodeId: string, duration: number, played: boolean) {
  const map = getPlayStateMap();
  const prev = map[episodeId];
  map[episodeId] = {
    episodeId,
    duration: duration || prev?.duration || 0,
    position: played ? duration || prev?.duration || 0 : 0,
    played,
    updatedAt: Date.now(),
  };
  write(PLAY_KEY, map);
}

/* -------------------------------------------------------------------------- */
/*  Last played episode (mini-player resume)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Read the persisted "what was the user last listening to" record.
 *
 * Tolerant of legacy data: an earlier version of this file stored just
 * the episode id (`string`) under the same key. Returning `null` for
 * any non-object value is the migration — the worst that happens is a
 * one-time loss of the resume mini-player for users upgrading.
 */
export function getLastPlayed(): LastPlayedRecord | null {
  const raw = read<unknown>(LAST_KEY, null);
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<LastPlayedRecord>;
  if (!candidate.episode || typeof candidate.episode !== 'object') return null;
  if (!candidate.episode.id || !candidate.episode.audioUrl) return null;
  return candidate as LastPlayedRecord;
}

export function setLastPlayed(record: LastPlayedRecord | null) {
  if (record === null) {
    try { localStorage.removeItem(LAST_KEY); } catch { /* ignore */ }
    return;
  }
  write(LAST_KEY, record);
}

/* -------------------------------------------------------------------------- */
/*  Recent episodes (Continue Listening rail)                                  */
/* -------------------------------------------------------------------------- */

/** Read the current "continue-listening" list. */
export function getRecentEpisodes(): RecentEpisodeRecord[] {
  const raw = read<unknown>(RECENTS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is RecentEpisodeRecord =>
    !!r && typeof r === 'object' &&
    !!(r as RecentEpisodeRecord).episode &&
    !!(r as RecentEpisodeRecord).episode.id &&
    !!(r as RecentEpisodeRecord).episode.audioUrl
  );
}

/**
 * Move (or insert) an episode at the head of the recents list. Called
 * from the player provider whenever a NEW episode starts loading. The
 * dedup-by-id keeps the list a clean MRU stack and the cap keeps the
 * stored payload under a few KB.
 */
export function pushRecentEpisode(meta: Omit<RecentEpisodeRecord, 'startedAt'>): RecentEpisodeRecord[] {
  const filtered = getRecentEpisodes().filter(r => r.episode.id !== meta.episode.id);
  filtered.unshift({ ...meta, startedAt: Date.now() });
  const trimmed = filtered.slice(0, RECENTS_LIMIT);
  write(RECENTS_KEY, trimmed);
  return trimmed;
}

/** Remove a single episode from the recents rail (used when the user
 *  marks it played / it ends naturally / they explicitly dismiss it). */
export function removeRecentEpisode(episodeId: string): RecentEpisodeRecord[] {
  const next = getRecentEpisodes().filter(r => r.episode.id !== episodeId);
  write(RECENTS_KEY, next);
  return next;
}

/* -------------------------------------------------------------------------- */
/*  Subscriber model — four independent sets, one per slice                    */
/* -------------------------------------------------------------------------- */

import { useEffect, useState, useSyncExternalStore } from 'react';

type Slice = 'subs' | 'play' | 'last' | 'recents';

const subscribers: Record<Slice, Set<() => void>> = {
  subs: new Set(),
  play: new Set(),
  last: new Set(),
  recents: new Set(),
};

// Cached snapshot for `useSubscriptions` — `useSyncExternalStore`
// requires a STABLE reference between getSnapshot calls when nothing
// has changed, otherwise React bails out with "Maximum update depth
// exceeded".
let subsSnapshot: SubscribedPodcast[] = getSubscriptions();
function refreshSubsSnapshot() {
  subsSnapshot = getSubscriptions();
}

let lastPlayedSnapshot: LastPlayedRecord | null = getLastPlayed();
function refreshLastPlayedSnapshot() {
  lastPlayedSnapshot = getLastPlayed();
}

let recentsSnapshot: RecentEpisodeRecord[] = getRecentEpisodes();
function refreshRecentsSnapshot() {
  recentsSnapshot = getRecentEpisodes();
}

function notify(slice: Slice) {
  if (slice === 'subs') refreshSubsSnapshot();
  if (slice === 'last') refreshLastPlayedSnapshot();
  if (slice === 'recents') refreshRecentsSnapshot();
  subscribers[slice].forEach(fn => fn());
}

// Cross-tab sync. The `storage` event fires only on OTHER tabs when
// localStorage changes, so we also notify locally after each writer.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === SUBS_KEY) {
      refreshSubsSnapshot();
      subscribers.subs.forEach(fn => fn());
    } else if (e.key === PLAY_KEY) {
      subscribers.play.forEach(fn => fn());
    } else if (e.key === LAST_KEY) {
      refreshLastPlayedSnapshot();
      subscribers.last.forEach(fn => fn());
    } else if (e.key === RECENTS_KEY) {
      refreshRecentsSnapshot();
      subscribers.recents.forEach(fn => fn());
    }
  });
}

/**
 * Wrap a writer with a slice-targeted notify. Generic over the writer's
 * argument tuple so we don't lose its parameter types at the call site.
 */
function wrapWithNotify<TArgs extends unknown[], TRet>(
  fn: (...args: TArgs) => TRet,
  slice: Slice,
): (...args: TArgs) => TRet {
  return (...args: TArgs) => {
    const result = fn(...args);
    notify(slice);
    return result;
  };
}

export const subscribeWithNotify        = wrapWithNotify(subscribe, 'subs');
export const unsubscribeWithNotify      = wrapWithNotify(unsubscribe, 'subs');
export const savePlayStateWithNotify    = wrapWithNotify(savePlayState, 'play');
export const markEpisodePlayedWithNotify = wrapWithNotify(markEpisodePlayed, 'play');
export const setLastPlayedWithNotify    = wrapWithNotify(setLastPlayed, 'last');
export const pushRecentEpisodeWithNotify = wrapWithNotify(pushRecentEpisode, 'recents');
export const removeRecentEpisodeWithNotify = wrapWithNotify(removeRecentEpisode, 'recents');

function subscribeToSlice(slice: Slice, cb: () => void) {
  subscribers[slice].add(cb);
  return () => { subscribers[slice].delete(cb); };
}

/* -------------------------------------------------------------------------- */
/*  React hooks                                                               */
/* -------------------------------------------------------------------------- */

export function useSubscriptions(): SubscribedPodcast[] {
  return useSyncExternalStore(
    cb => subscribeToSlice('subs', cb),
    () => subsSnapshot,
    () => subsSnapshot,
  );
}

export function useIsSubscribed(origin: string | undefined): boolean {
  const subs = useSubscriptions();
  return !!origin && subs.some(s => s.origin === origin);
}

/**
 * Reactive snapshot of a single episode's play state. Falls back to a
 * synthesized "fresh" record (position=0, played=false) if there's no
 * entry yet — that way the UI can always render a progress ring without
 * a null check on every consumer.
 *
 * Subscribes only to the `play` slice, so subscription/last-played
 * mutations don't trigger `setState` here.
 */
export function usePlayState(episodeId: string | undefined, durationHint = 0): PlayState {
  const [state, setState] = useState<PlayState>(() => readOrSynth(episodeId, durationHint));
  useEffect(() => {
    setState(readOrSynth(episodeId, durationHint));
    return subscribeToSlice('play', () => setState(readOrSynth(episodeId, durationHint)));
  }, [episodeId, durationHint]);
  return state;
}

/**
 * Reactive snapshot of the persisted "last played" record. Used by the
 * player provider to bootstrap the mini-player on first mount.
 */
export function useLastPlayed(): LastPlayedRecord | null {
  return useSyncExternalStore(
    cb => subscribeToSlice('last', cb),
    () => lastPlayedSnapshot,
    () => lastPlayedSnapshot,
  );
}

/**
 * Reactive snapshot of the recent-episodes rail. Drives the
 * "Continue listening" section in the library. Read-only by design;
 * use `pushRecentEpisodeWithNotify` / `removeRecentEpisodeWithNotify`
 * to mutate.
 */
export function useRecentEpisodes(): RecentEpisodeRecord[] {
  return useSyncExternalStore(
    cb => subscribeToSlice('recents', cb),
    () => recentsSnapshot,
    () => recentsSnapshot,
  );
}

function readOrSynth(episodeId: string | undefined, durationHint: number): PlayState {
  if (!episodeId) return { episodeId: '', position: 0, duration: durationHint, played: false, updatedAt: 0 };
  return getPlayState(episodeId) ?? {
    episodeId,
    position: 0,
    duration: durationHint,
    played: false,
    updatedAt: 0,
  };
}
