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
//   `podcasts.lastPlayed`   → episodeId | null  (boots the mini-player)
//
// Cross-tab sync is wired via the `storage` event so opening the app
// in two tabs and subscribing in one updates the other's library.

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

const SUBS_KEY = 'podcasts.subs';
const PLAY_KEY = 'podcasts.playState';
const LAST_KEY = 'podcasts.lastPlayed';

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

export function getLastPlayedId(): string | null {
  return read<string | null>(LAST_KEY, null);
}

export function setLastPlayedId(id: string | null) {
  write(LAST_KEY, id);
}

/* -------------------------------------------------------------------------- */
/*  React hook                                                                */
/* -------------------------------------------------------------------------- */

import { useEffect, useState, useSyncExternalStore } from 'react';

const subscribers = new Set<() => void>();

// Cached snapshot for useSyncExternalStore — it requires a STABLE
// reference between calls when nothing changed, otherwise React
// bails out with "Maximum update depth exceeded".
let subsSnapshot: SubscribedPodcast[] = getSubscriptions();
function refreshSubsSnapshot() {
  subsSnapshot = getSubscriptions();
}

function notify() {
  refreshSubsSnapshot();
  subscribers.forEach(fn => fn());
}

// Cross-tab sync. The `storage` event fires only on OTHER tabs when
// localStorage changes, so we also notify locally after each writer.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === SUBS_KEY || e.key === PLAY_KEY || e.key === LAST_KEY) {
      refreshSubsSnapshot();
      subscribers.forEach(fn => fn());
    }
  });
}

function wrapWithNotify<F extends (...a: never[]) => unknown>(fn: F): F {
  return ((...args: never[]) => {
    const result = fn(...args);
    notify();
    return result;
  }) as F;
}

export const subscribeWithNotify = wrapWithNotify(subscribe);
export const unsubscribeWithNotify = wrapWithNotify(unsubscribe);
export const savePlayStateWithNotify = wrapWithNotify(savePlayState);
export const markEpisodePlayedWithNotify = wrapWithNotify(markEpisodePlayed);
export const setLastPlayedIdWithNotify = wrapWithNotify(setLastPlayedId);

function subscribeStore(cb: () => void) {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
}

export function useSubscriptions(): SubscribedPodcast[] {
  return useSyncExternalStore(subscribeStore, () => subsSnapshot, () => subsSnapshot);
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
 */
export function usePlayState(episodeId: string | undefined, durationHint = 0): PlayState {
  const [state, setState] = useState<PlayState>(() => readOrSynth(episodeId, durationHint));
  useEffect(() => {
    setState(readOrSynth(episodeId, durationHint));
    return subscribeStore(() => setState(readOrSynth(episodeId, durationHint)));
  }, [episodeId, durationHint]);
  return state;
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
