// App-wide podcast audio player.
//
// One `<audio>` element lives at the root of the React tree (mounted
// next to the provider) and survives every route change. Pages just
// read/dispatch via `usePodcastPlayer()`. This is the web equivalent
// of Podium's `PlaybackService` (a foreground media session): the
// distinction is that on the web we don't get OS-level notifications
// for free, but the Media Session API gives us lock-screen controls
// and headset hooks if the browser supports it (most do).
//
// Behaviors implemented (parity with Podium):
//   • Play / pause / seek
//   • Restore last position from localStorage when an episode loads
//   • Persist position throughout playback (1Hz tick) so reloading the
//     tab resumes within a second of where you left off
//   • Mark episode as played on `ended` (sets position = duration)
//   • Variable speed (0.5x – 3x) — also persisted
//   • Skip forward/back (15s default like most podcast apps)
//   • Auto-restore the last episode on page load: the persisted record
//     hydrates `current` so the floating mini-player is visible the
//     instant the app boots, paused, ready to resume on tap
//
// Context split:
// We expose TWO contexts. `usePodcastPlayer()` returns the slow-changing
// command surface (current track, isPlaying, isLoading, speed, error,
// the action callbacks). `usePodcastPlayerProgress()` returns just
// `{ position, duration }` and updates ~4 Hz during playback. Splitting
// keeps the 50+ `EpisodeListItem`s on a podcast detail page from
// re-rendering on every progress tick — they only need the command
// slice.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode,
} from 'react';
import {
  getPlayState,
  savePlayStateWithNotify as savePlayState,
  markEpisodePlayedWithNotify as markEpisodePlayed,
  getLastPlayed,
  setLastPlayedWithNotify as setLastPlayed,
  pushRecentEpisodeWithNotify as pushRecentEpisode,
  removeRecentEpisodeWithNotify as removeRecentEpisode,
  addToQueueWithNotify as addToQueueStore,
  removeFromQueueWithNotify as removeFromQueueStore,
  reorderQueueWithNotify as reorderQueueStore,
  clearQueueWithNotify as clearQueueStore,
  popNextFromQueueWithNotify as popNextFromQueueStore,
  addHistoryEntryWithNotify as addHistoryEntryStore,
  useQueue,
  useQueueCount,
  type QueueItem,
  type LastPlayedRecord,
} from '@/features/podcasts/lib/store';
import type { PodcastEpisode } from '@/features/podcasts/lib/rss';

export interface PlayingEpisodeMeta {
  episode: PodcastEpisode;
  /** Podcast-level metadata (title, image, seed color) — duplicated on
   *  every track so the mini-player has everything it needs without a
   *  separate lookup. */
  podcastTitle: string;
  podcastImageUrl: string;
  /** HSL components from the cover-art seed color, or null if we never
   *  got one (e.g. image failed to load). The mini-player tints itself
   *  with these. */
  seedH: number | null;
  seedS: number | null;
  seedL: number | null;
}

interface PodcastPlayerContextValue {
  /** The track currently bound to (or staged for) the audio element.
   *  Null before any episode has been activated AND no persisted track
   *  exists. After hydration this points at the last-played track even
   *  before the user has tapped play. */
  current: PlayingEpisodeMeta | null;
  isPlaying: boolean;
  isLoading: boolean;
  /** Current playback rate (1.0 by default). */
  speed: number;
  error: string | null;

  /** Auto-play the next queued episode when the current one ends.
   *  Persisted to localStorage so the choice survives reloads. */
  autoPlayNext: boolean;
  setAutoPlayNext: (v: boolean) => void;

  /** Sleep timer state. `null` = off; `secondsRemaining` ticks down
   *  once a second while playing. When `mode === 'episode-end'` we
   *  ignore `secondsRemaining` and just stop on the natural `ended`
   *  event; the field is still tracked so the UI can surface the
   *  "until end of episode" label. */
  sleepTimer: { mode: 'timed' | 'episode-end'; secondsRemaining: number } | null;
  /** `seconds` for a timed countdown, `'episode-end'` to stop after
   *  the current track finishes, or `null` to cancel any active
   *  timer. */
  setSleepTimer: (value: number | 'episode-end' | null) => void;

  play: (meta?: PlayingEpisodeMeta, queue?: PlayingEpisodeMeta[]) => Promise<void>;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  /** Move forward (positive) or back (negative) by `delta` seconds. */
  skip: (delta: number) => void;
  setSpeed: (s: number) => void;
  /** Stop playback, unload the source, and clear the mini-player. */
  close: () => void;

  /** True for the brief window between `play(meta)` being called for a
   *  new track and `loadeddata` firing — used by per-episode play
   *  buttons to show a spinner instead of a play icon. */
  /** Persistent Up Next queue items. */
  queueItems: QueueItem[];
  queueCount: number;
  addToQueue: (item: Omit<QueueItem, 'addedAt'>) => void;
  addEpisodeToQueue: (episode: PodcastEpisode, podcastTitle: string, podcastImageUrl: string, seedH: number | null, seedS: number | null, seedL: number | null) => void;
  removeFromQueue: (episodeId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  playNextFromQueue: () => void;

  isLoadingEpisode: (id: string) => boolean;
}

interface PodcastPlayerProgressValue {
  /** Live playhead position in seconds. Throttled to 4 Hz of state
   *  updates to avoid re-rendering the world while audio is playing. */
  position: number;
  duration: number;
}

const PodcastPlayerContext = createContext<PodcastPlayerContextValue | undefined>(undefined);
const PodcastPlayerProgressContext = createContext<PodcastPlayerProgressValue | undefined>(undefined);

const SPEED_KEY = 'podcasts.playbackSpeed';
const AUTO_NEXT_KEY = 'podcasts.autoPlayNext';
const SKIP_SECONDS = 15;

export function PodcastPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Hydrate `current` from the last-played record stored in
  // localStorage. We do this in the `useState` initializer so the
  // first paint already shows the mini-player — no flash of "nothing"
  // followed by it sliding in. The audio element is NOT yet bound to
  // a src; that happens lazily on the first `play()`.
  const [current, setCurrent] = useState<PlayingEpisodeMeta | null>(() => {
    const restored = getLastPlayed();
    return restored ? recordToMeta(restored) : null;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState<number>(() => {
    const saved = parseFloat(localStorage.getItem(SPEED_KEY) ?? '1');
    return Number.isFinite(saved) && saved > 0 ? saved : 1;
  });
  const [error, setError] = useState<string | null>(null);

  /**
   * Pending playback queue. When the user starts an episode from a
   * podcast detail page we attach the remaining episodes after it (in
   * the same display order); on `ended` we shift the head and play
   * it if `autoPlayNext` is enabled. The queue is in-memory only —
   * we deliberately do NOT persist it because the canonical source of
   * truth is the RSS feed, and reconstructing the queue on reload
   * would require re-fetching the feed anyway.
   */
  const queueRef = useRef<PlayingEpisodeMeta[]>([]);

  const [autoPlayNext, setAutoPlayNextState] = useState<boolean>(() => {
    return localStorage.getItem(AUTO_NEXT_KEY) === '1';
  });
  const autoPlayNextRef = useRef(autoPlayNext);
  useEffect(() => { autoPlayNextRef.current = autoPlayNext; }, [autoPlayNext]);

  const [sleepTimer, setSleepTimerState] = useState<
    { mode: 'timed' | 'episode-end'; secondsRemaining: number } | null
  >(null);

  /* -------------------------------- refs ----------------------------------- */
  // We keep refs of mutable state so the audio listeners and the
  // memoized `play` callback don't have to recreate on every state
  // change — recreating them re-attaches DOM listeners and cancels
  // in-flight `play()` promises.

  const currentRef = useRef(current);
  useEffect(() => { currentRef.current = current; }, [current]);

  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  /**
   * Tracks which episode id is bound to the audio element's `src`.
   * Different from `current.episode.id` because hydrating from
   * localStorage sets `current` without binding any audio yet — the
   * first `play()` call notices the mismatch and binds lazily. This
   * also makes the "is loading" branch in `play()` decisive instead
   * of relying on string comparison of (potentially URL-normalized)
   * `audio.src` values.
   */
  const boundEpisodeIdRef = useRef<string | null>(null);

  /**
   * Cleanup function for the most recent `loadedmetadata` listener
   * registered by `play()`. We need this because rapid track switching
   * can replace `audio.src` before the previous load fires its
   * `loadedmetadata` — the listener would otherwise stay attached
   * forever and seek the wrong track when a *future* metadata event
   * fired. The new `play()` invokes the previous cleanup before
   * registering its own listener.
   */
  const metaCleanupRef = useRef<(() => void) | null>(null);

  /* ----------------------------- audio listeners ----------------------------- */
  // Bound once on mount, never recreated. `speed` is applied in a
  // separate effect below — including it here would re-attach all
  // eight listeners on every speed change.

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setPosition(audio.currentTime);
    };
    const onDurationChange = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onLoadStart = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onPlay = () => { setIsPlaying(true); setIsLoading(false); };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      const cur = currentRef.current;
      if (cur) {
        markEpisodePlayed(cur.episode.id, audio.duration || cur.episode.duration || 0, true);
        // Record in listening history
        addHistoryEntryStore({
          episodeId: cur.episode.id,
          episodeTitle: cur.episode.title,
          podcastTitle: cur.podcastTitle,
          podcastImageUrl: cur.podcastImageUrl,
          feedOrigin: cur.episode.id.split(':')[0] || '',
          position: audio.duration || cur.episode.duration || 0,
          duration: audio.duration || cur.episode.duration || 0,
          completed: true,
        });
        // An episode that finished naturally is no longer "in
        // progress" — drop it from the Continue Listening rail so the
        // user doesn't see a fully-completed track sitting at 100%.
        removeRecentEpisode(cur.episode.id);
      }
      // Sleep timer set to "end of current episode" — honor it by
      // refusing to auto-advance regardless of `autoPlayNext`. We
      // clear the timer so the next manual play isn't constrained.
      if (sleepTimerRef.current?.mode === 'episode-end') {
        setSleepTimerState(null);
        return;
      }
      // Auto-play next: try the persistent queue first, then
      // fall back to the in-memory queueRef passed from the detail page.
      if (autoPlayNextRef.current) {
        const persistedNext = popNextFromQueueStore();
        if (persistedNext) {
          const meta: PlayingEpisodeMeta = {
            episode: persistedNext.episode,
            podcastTitle: persistedNext.podcastTitle,
            podcastImageUrl: persistedNext.podcastImageUrl,
            seedH: persistedNext.seedH,
            seedS: persistedNext.seedS,
            seedL: persistedNext.seedL,
          };
          Promise.resolve().then(() => { void playRef.current(meta); });
        } else if (queueRef.current.length > 0) {
          const next = queueRef.current.shift()!;
          Promise.resolve().then(() => { void playRef.current(next); });
        }
      }
    };
    const onError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError('Audio failed to load');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Apply `speed` to the audio element whenever it changes. Tiny effect
  // so we don't drag the listener attachments through this dep.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
  }, [speed]);

  /* ----------------------------- sleep timer --------------------------------- */

  // Mirror the sleep-timer state in a ref so the audio listeners
  // (registered once on mount, never re-created) and the queue path
  // can read the latest value without recreating their callbacks.
  const sleepTimerRef = useRef<typeof sleepTimer>(null);
  useEffect(() => { sleepTimerRef.current = sleepTimer; }, [sleepTimer]);

  // Tick the timed sleep countdown once a second while playback is
  // active. We don't tick when paused (matches Pocket Casts / Apple
  // behavior — pausing pauses the timer too) and we don't tick for
  // 'episode-end' mode (the natural `ended` event drives that case).
  useEffect(() => {
    if (!isPlaying) return;
    if (!sleepTimer || sleepTimer.mode !== 'timed') return;
    const id = window.setInterval(() => {
      setSleepTimerState(prev => {
        if (!prev || prev.mode !== 'timed') return prev;
        const next = prev.secondsRemaining - 1;
        if (next <= 0) {
          // Pause without unloading — the user can resume later if
          // they hit play before the next mount drops the source.
          audioRef.current?.pause();
          return null;
        }
        return { ...prev, secondsRemaining: next };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, sleepTimer]);

  const setSleepTimer = useCallback((value: number | 'episode-end' | null) => {
    if (value === null) { setSleepTimerState(null); return; }
    if (value === 'episode-end') {
      setSleepTimerState({ mode: 'episode-end', secondsRemaining: 0 });
      return;
    }
    if (Number.isFinite(value) && value > 0) {
      setSleepTimerState({ mode: 'timed', secondsRemaining: Math.round(value) });
    }
  }, []);

  const setAutoPlayNext = useCallback((v: boolean) => {
    setAutoPlayNextState(v);
    try { localStorage.setItem(AUTO_NEXT_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  }, []);

  /* ----------------------------- persist position ---------------------------- */

  // Persist position once a second while the track is playing. We don't
  // want to write on every `timeupdate` (~4 Hz) because each write is a
  // sync localStorage call.
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      const audio = audioRef.current;
      const cur = currentRef.current;
      if (!audio || !cur) return;
      savePlayState({
        episodeId: cur.episode.id,
        position: audio.currentTime,
        duration: audio.duration || cur.episode.duration || 0,
        played: false,
        updatedAt: Date.now(),
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  // And persist once on pause too — otherwise pausing right after a
  // tick would lose up to a second.
  useEffect(() => {
    if (isPlaying) return;
    const audio = audioRef.current;
    const cur = currentRef.current;
    if (!audio || !cur || audio.currentTime === 0) return;
    savePlayState({
      episodeId: cur.episode.id,
      position: audio.currentTime,
      duration: audio.duration || cur.episode.duration || 0,
      played: false,
      updatedAt: Date.now(),
    });
  }, [isPlaying]);

  /* ----------------------------- media session API --------------------------- */

  // Hook into the browser's Media Session API so headset / lock-screen
  // controls work (Chrome, Edge, Safari, Firefox all support this).
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: current.episode.title,
      artist: current.podcastTitle,
      album: current.podcastTitle,
      // Prefer episode-specific artwork — same precedence as the
      // mini-player and player sheet — so the lock-screen poster
      // matches what the user sees in-app.
      artwork: [{
        src: current.episode.imageUrl || current.podcastImageUrl,
        sizes: '512x512',
        type: 'image/jpeg',
      }],
    });
    ms.setActionHandler('play', () => audioRef.current?.play().catch(() => {}));
    ms.setActionHandler('pause', () => audioRef.current?.pause());
    ms.setActionHandler('seekbackward', () => skipRef.current(-SKIP_SECONDS));
    ms.setActionHandler('seekforward', () => skipRef.current(SKIP_SECONDS));
    ms.setActionHandler('seekto', e => {
      if (typeof e.seekTime === 'number') seekRef.current(e.seekTime);
    });
    return () => {
      ms.setActionHandler('play', null);
      ms.setActionHandler('pause', null);
      ms.setActionHandler('seekbackward', null);
      ms.setActionHandler('seekforward', null);
      ms.setActionHandler('seekto', null);
    };
  }, [current]);

  /* ----------------------------- actions ------------------------------------- */

  const skipRef = useRef<(d: number) => void>(() => {});
  const seekRef = useRef<(s: number) => void>(() => {});
  const playRef = useRef<(meta?: PlayingEpisodeMeta, queue?: PlayingEpisodeMeta[]) => Promise<void>>(
    async () => {}
  );

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || seconds, seconds));
  }, []);
  seekRef.current = seek;

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    seek(audio.currentTime + delta);
  }, [seek]);
  skipRef.current = skip;

  const play = useCallback(async (meta?: PlayingEpisodeMeta, queue?: PlayingEpisodeMeta[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);

    // If no meta is provided we play whatever's currently staged. This
    // is the mini-player's pause→play toggle path; on first play after
    // hydration it also covers "the user tapped resume on a restored
    // track that isn't bound yet".
    const target = meta ?? currentRef.current;
    if (!target) return;

    // Update the auto-play queue. A caller passing a queue replaces
    // the old one wholesale (the new context is the most recent
    // intent); a caller that doesn't pass one leaves the existing
    // queue untouched so the toggle path keeps the rail intact.
    if (queue !== undefined) {
      // Filter out the target episode itself in case the caller
      // passed the current podcast's full episode list — we don't
      // want to "auto-advance" to ourselves.
      queueRef.current = queue.filter(q => q.episode.id !== target.episode.id);
    }

    const needsLoad = boundEpisodeIdRef.current !== target.episode.id;
    if (needsLoad) {
      // Switching episodes: drop any pending `loadedmetadata` listener
      // from the previous load. Without this, rapid clicks on
      // different episodes leak listeners that fire days later when
      // an unrelated track happens to dispatch the same event.
      metaCleanupRef.current?.();
      metaCleanupRef.current = null;

      // Loading a new episode. Persist the last-played record (full
      // meta, not just an id) so the mini-player can rehydrate on
      // next visit, then point the audio element at the new URL and
      // seek to the saved resume position.
      //
      // `audio.src` is set to the publisher's *original* enclosure URL
      // straight from the RSS `<enclosure url="...">`. The browser
      // streams it natively at the publisher's encoded bitrate — we
      // never re-encode, transcode, or proxy the audio bytes (only
      // RSS XML goes through the proxy fallback when needed). That
      // keeps playback lossless: whatever quality the producer
      // uploaded is what plays in the browser.
      //
      // We deliberately do NOT set `audio.crossOrigin`. Most podcast
      // CDNs (anchor.fm, libsyn, megaphone, ArtNouveau) don't send
      // `Access-Control-Allow-Origin` on audio responses, and setting
      // `crossOrigin` would make the browser refuse to play those.
      // Plain `<audio src=...>` playback works without CORS.
      if (target !== currentRef.current) setCurrent(target);
      setLastPlayed(metaToRecord(target));
      // Surface the episode in the Continue Listening rail. Pushing
      // here (not on `play` resolve) means the row appears even if
      // playback is blocked by autoplay policy — the user already
      // committed to the track by tapping play.
      pushRecentEpisode(metaToRecord(target));
      audio.src = target.episode.audioUrl;
      audio.preload = 'auto';
      audio.playbackRate = speedRef.current;
      // Reset live progress so the mini-player's bar doesn't show
      // stale values from the previous track until `timeupdate` fires.
      setPosition(0);
      setDuration(0);
      boundEpisodeIdRef.current = target.episode.id;

      const saved = getPlayState(target.episode.id);
      if (saved && saved.position > 0 && !saved.played) {
        // `loadedmetadata` fires before we can seek, so we wait for it
        // before assigning currentTime — assigning before metadata is
        // ready is a no-op on most browsers. Both the listener and
        // its remover live behind a stable cleanup function we can
        // re-invoke from the next `play()` if this load gets canceled.
        const cleanup = () => {
          audio.removeEventListener('loadedmetadata', onMeta);
          if (metaCleanupRef.current === cleanup) metaCleanupRef.current = null;
        };
        const onMeta = () => {
          // Guard against a stale listener firing on a new track
          // (defense-in-depth — should be unreachable thanks to the
          // pre-cleanup above, but cheap to verify).
          if (boundEpisodeIdRef.current === target.episode.id) {
            audio.currentTime = saved.position;
          }
          cleanup();
        };
        metaCleanupRef.current = cleanup;
        audio.addEventListener('loadedmetadata', onMeta);
      }
    }

    try {
      await audio.play();
    } catch (e) {
      // Common case: NotAllowedError because the page hasn't had a user
      // gesture yet. We surface that as a recoverable error rather than
      // crashing.
      setError(e instanceof Error ? e.message : 'Playback blocked');
    }
  }, []);
  playRef.current = play;

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause(); else void play();
  }, [isPlaying, pause, play]);

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s);
    localStorage.setItem(SPEED_KEY, String(s));
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    metaCleanupRef.current?.();
    metaCleanupRef.current = null;
    boundEpisodeIdRef.current = null;
    queueRef.current = [];
    setSleepTimerState(null);
    setCurrent(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setLastPlayed(null);
  }, []);

  const isLoadingEpisode = useCallback((id: string) =>
    isLoading && current?.episode.id === id, [isLoading, current]);

  
  /* ----------------------------- queue management ---------------------------- */

  const queueItems = useQueue();
  const queueCount = useQueueCount();

  const addToQueue = useCallback((item: Omit<QueueItem, 'addedAt'>) => {
    addToQueueStore(item);
  }, []);

  const addEpisodeToQueue = useCallback((
    episode: PodcastEpisode,
    podcastTitle: string,
    podcastImageUrl: string,
    seedH: number | null,
    seedS: number | null,
    seedL: number | null,
  ) => {
    addToQueueStore({
      episode,
      podcastTitle,
      podcastImageUrl,
      seedH,
      seedS,
      seedL,
    });
  }, []);

  const removeFromQueue = useCallback((episodeId: string) => {
    removeFromQueueStore(episodeId);
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    reorderQueueStore(fromIndex, toIndex);
  }, []);

  const clearQueue = useCallback(() => {
    clearQueueStore();
  }, []);

  const playNextFromQueue = useCallback(() => {
    const next = popNextFromQueueStore();
    if (next) {
      const meta: PlayingEpisodeMeta = {
        episode: next.episode,
        podcastTitle: next.podcastTitle,
        podcastImageUrl: next.podcastImageUrl,
        seedH: next.seedH,
        seedS: next.seedS,
        seedL: next.seedL,
      };
      void playRef.current(meta);
    }
  }, []);

// Command slice — does NOT include position/duration. Splitting these
  // out from the progress slice keeps EpisodeListItem (and any other
  // consumer that doesn't care about live playhead) from re-rendering
  // 4 Hz during playback.
  const commandValue = useMemo<PodcastPlayerContextValue>(() => ({
    current, isPlaying, isLoading, speed, error,
    queueItems, queueCount, addToQueue, addEpisodeToQueue, removeFromQueue, reorderQueue, clearQueue, playNextFromQueue,
      autoPlayNext, setAutoPlayNext, sleepTimer, setSleepTimer,
    play, pause, toggle, seek, skip, setSpeed, close, isLoadingEpisode,
  }), [current, isPlaying, isLoading, speed, error,
      queueItems, queueCount, addToQueue, addEpisodeToQueue, removeFromQueue, reorderQueue, clearQueue, playNextFromQueue,
      autoPlayNext, setAutoPlayNext, sleepTimer, setSleepTimer,
      play, pause, toggle, seek, skip, setSpeed, close, isLoadingEpisode]);

  const progressValue = useMemo<PodcastPlayerProgressValue>(() => ({
    position, duration,
  }), [position, duration]);

  return (
    <PodcastPlayerContext.Provider value={commandValue}>
      <PodcastPlayerProgressContext.Provider value={progressValue}>
        {/* Single hidden audio element shared by every consumer. Hidden
            via inline display:none — `controls={false}` is the default
            but some browsers leak a 0-px-tall layout box without the
            explicit none. */}
        <audio ref={audioRef} preload="none" style={{ display: 'none' }} />
        {children}
      </PodcastPlayerProgressContext.Provider>
    </PodcastPlayerContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                     */
/* -------------------------------------------------------------------------- */

export function usePodcastPlayer(): PodcastPlayerContextValue {
  const ctx = useContext(PodcastPlayerContext);
  if (!ctx) throw new Error('usePodcastPlayer must be used inside <PodcastPlayerProvider>');
  return ctx;
}

/**
 * Subscribe to the live playhead. Updates ~4 Hz during playback. Use
 * this only in components that actually visualize progress (mini-player
 * progress bar, full-player slider, time labels) — pulling it into a
 * list-item or a screen-level component will tank your render budget.
 */
export function usePodcastPlayerProgress(): PodcastPlayerProgressValue {
  const ctx = useContext(PodcastPlayerProgressContext);
  if (!ctx) throw new Error('usePodcastPlayerProgress must be used inside <PodcastPlayerProvider>');
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*  Conversions                                                               */
/* -------------------------------------------------------------------------- */

/** `LastPlayedRecord` and `PlayingEpisodeMeta` have identical shapes
 *  on disk — the conversion is a pass-through. We keep both names
 *  (and these explicit converters) so the storage type is allowed to
 *  diverge later without a hunt for callsites. */
function metaToRecord(m: PlayingEpisodeMeta): LastPlayedRecord {
  return {
    episode: m.episode,
    podcastTitle: m.podcastTitle,
    podcastImageUrl: m.podcastImageUrl,
    seedH: m.seedH,
    seedS: m.seedS,
    seedL: m.seedL,
  };
}

function recordToMeta(r: LastPlayedRecord): PlayingEpisodeMeta {
  return {
    episode: r.episode,
    podcastTitle: r.podcastTitle,
    podcastImageUrl: r.podcastImageUrl,
    seedH: r.seedH,
    seedS: r.seedS,
    seedL: r.seedL,
  };
}
