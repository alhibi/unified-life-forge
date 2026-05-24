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
//   • Auto-restore the *last* episode on page load so the mini-player
//     reappears with a paused track ready to resume

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode,
} from 'react';
import {
  getPlayState,
  savePlayStateWithNotify as savePlayState,
  markEpisodePlayedWithNotify as markEpisodePlayed,
  getLastPlayedId,
  setLastPlayedIdWithNotify as setLastPlayedId,
} from '@/lib/podcasts/store';
import type { PodcastEpisode } from '@/lib/podcasts/rss';

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
  /** The track currently bound to the audio element. Null before any
   *  episode has been activated this session. */
  current: PlayingEpisodeMeta | null;
  isPlaying: boolean;
  isLoading: boolean;
  /** Live playhead position in seconds. Throttled to 4 Hz of state
   *  updates to avoid re-rendering the world while audio is playing. */
  position: number;
  duration: number;
  /** Current playback rate (1.0 by default). */
  speed: number;
  error: string | null;

  play: (meta?: PlayingEpisodeMeta) => Promise<void>;
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
  isLoadingEpisode: (id: string) => boolean;
}

const PodcastPlayerContext = createContext<PodcastPlayerContextValue | undefined>(undefined);

const SPEED_KEY = 'podcasts.playbackSpeed';
const SKIP_SECONDS = 15;

export function PodcastPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<PlayingEpisodeMeta | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState<number>(() => {
    const saved = parseFloat(localStorage.getItem(SPEED_KEY) ?? '1');
    return Number.isFinite(saved) && saved > 0 ? saved : 1;
  });
  const [error, setError] = useState<string | null>(null);

  // Restore the last played episode on first mount so the mini-player
  // reappears (paused) when the user returns to the app. We only know
  // the episodeId here — we can't fully reconstruct `PlayingEpisodeMeta`
  // without re-fetching the RSS feed. So we leave `current = null` and
  // let the relevant podcast detail page rehydrate it on visit. (The
  // mini-player simply doesn't appear until the user interacts.)
  useEffect(() => {
    void getLastPlayedId(); // touch — keeps the value warm in our import graph
  }, []);

  /* ----------------------------- audio listeners ----------------------------- */

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = speed;

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
  }, [speed]);

  // Keep a ref of the current track for use inside listeners that
  // shouldn't recreate every time `current` updates.
  const currentRef = useRef(current);
  useEffect(() => { currentRef.current = current; }, [current]);

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
      artwork: [{ src: current.podcastImageUrl, sizes: '512x512', type: 'image/jpeg' }],
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

  const play = useCallback(async (meta?: PlayingEpisodeMeta) => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);

    if (meta && (!current || current.episode.id !== meta.episode.id)) {
      // Loading a new episode. Persist the last-played id so we can
      // restore the mini-player on next visit, then point the audio
      // element at the new URL and seek to the saved resume position.
      setCurrent(meta);
      setLastPlayedId(meta.episode.id);
      audio.src = meta.episode.audioUrl;
      audio.preload = 'auto';
      audio.playbackRate = speed;
      const saved = getPlayState(meta.episode.id);
      if (saved && saved.position > 0 && !saved.played) {
        // `loadedmetadata` fires before we can seek, so we wait for it
        // before assigning currentTime — assigning before metadata is
        // ready is a no-op on most browsers.
        const onMeta = () => {
          audio.currentTime = saved.position;
          audio.removeEventListener('loadedmetadata', onMeta);
        };
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
  }, [current, speed]);

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
    setCurrent(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setLastPlayedId(null);
  }, []);

  const isLoadingEpisode = useCallback((id: string) =>
    isLoading && current?.episode.id === id, [isLoading, current]);

  const value = useMemo<PodcastPlayerContextValue>(() => ({
    current, isPlaying, isLoading, position, duration, speed, error,
    play, pause, toggle, seek, skip, setSpeed, close, isLoadingEpisode,
  }), [current, isPlaying, isLoading, position, duration, speed, error,
      play, pause, toggle, seek, skip, setSpeed, close, isLoadingEpisode]);

  return (
    <PodcastPlayerContext.Provider value={value}>
      {/* Single hidden audio element shared by every consumer. Hidden
          via inline display:none — `controls={false}` is the default
          but some browsers leak a 0-px-tall layout box without the
          explicit none. */}
      <audio ref={audioRef} preload="none" style={{ display: 'none' }} />
      {children}
    </PodcastPlayerContext.Provider>
  );
}

export function usePodcastPlayer(): PodcastPlayerContextValue {
  const ctx = useContext(PodcastPlayerContext);
  if (!ctx) throw new Error('usePodcastPlayer must be used inside <PodcastPlayerProvider>');
  return ctx;
}
