import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// Best-effort language detection so the play-failure toast follows the user's
// preferred locale without coupling this context to AppContext.
const detectIsAr = (): boolean => {
  if (typeof document === 'undefined') return false;
  const lang = document.documentElement.lang || localStorage.getItem('app-language') || '';
  return lang.toLowerCase().startsWith('ar');
};

let lastPlayErrorAt = 0;
const notifyPlayFailure = () => {
  const now = Date.now();
  if (now - lastPlayErrorAt < 2500) return; // throttle bursts
  lastPlayErrorAt = now;
  const isAr = detectIsAr();
  toast.error(isAr ? 'تعذر تشغيل الرسالة الصوتية' : 'Sprachnachricht konnte nicht abgespielt werden');
};

interface VoicePlayerState {
  isPlaying: boolean;
  msgId: string | null;
  url: string;
  progress: number;
  duration: number;
  senderName: string;
  conversationId: string;
  waveformData: number[];
  /** Playback rate: 1, 1.5 or 2. Persisted across messages within a session. */
  playbackRate: number;
}

interface VoicePlayerContextType {
  state: VoicePlayerState;
  play: (msgId: string, url: string, senderName: string, conversationId: string) => void;
  pause: () => void;
  togglePlayback: (msgId: string, url: string, senderName: string, conversationId: string) => void;
  seek: (fraction: number) => void;
  stop: () => void;
  /** Cycle 1 → 1.5 → 2 → 1. */
  cyclePlaybackRate: () => void;
  setPlaybackRate: (rate: number) => void;
  getProgress: (msgId: string) => number;
  getDuration: (msgId: string) => number;
  isPlayingMsg: (msgId: string) => boolean;
  generateWaveform: (url: string, msgId: string) => Promise<number[]>;
  waveformCache: Record<string, number[]>;
  /**
   * Register a resolver that returns the next voice message to auto-play
   * once the current one ends. Pass `undefined` to disable auto-advance.
   * The chat drawer wires this with its current conversation messages list
   * so playback flows continuously like Telegram / WhatsApp.
   */
  setOnEnded: (
    resolver:
      | ((finishedMsgId: string, conversationId: string) => Promise<{ msgId: string; url: string; senderName: string } | null> | { msgId: string; url: string; senderName: string } | null)
      | undefined,
  ) => void;
}

const VoicePlayerContext = createContext<VoicePlayerContextType | null>(null);

export const useVoicePlayer = () => {
  const ctx = useContext(VoicePlayerContext);
  if (!ctx) throw new Error('useVoicePlayer must be used within VoicePlayerProvider');
  return ctx;
};

// Generate a stable seed-based waveform as fallback
const seedWaveform = (id: string, count = 40): number[] => {
  const seed = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: count }, (_, i) => {
    const h = ((Math.sin(seed * (i + 1) * 0.7) + 1) / 2) * 0.85 + 0.15;
    return h;
  });
};

type AudioContextCtor = typeof AudioContext;
function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

// Decode audio buffer and extract waveform peaks. Bounded by an AbortController
// so a stalled signed URL can't hang the request forever, and the AudioContext
// is always closed in `finally` even on decode failure.
const extractWaveform = async (url: string, barCount = 40): Promise<number[]> => {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let audioCtx: AudioContext | null = null;
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return [];
    const arrayBuffer = await response.arrayBuffer();
    audioCtx = new Ctor();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channelData.length / barCount));
    const peaks: number[] = [];
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channelData.length);
      for (let j = start; j < end; j++) sum += Math.abs(channelData[j]);
      peaks.push(sum / blockSize);
    }
    const max = Math.max(...peaks, 0.001);
    return peaks.map(p => Math.max(p / max, 0.08));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
    if (audioCtx && audioCtx.state !== 'closed') {
      try { await audioCtx.close(); } catch { /* no-op */ }
    }
  }
};

export const VoicePlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<VoicePlayerState>({
    isPlaying: false,
    msgId: null,
    url: '',
    progress: 0,
    duration: 0,
    senderName: '',
    conversationId: '',
    waveformData: [],
    playbackRate: 1,
  });

  const [waveformCache, setWaveformCache] = useState<Record<string, number[]>>({});
  const waveformCacheRef = useRef<Record<string, number[]>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  // Mirror state in a ref so callbacks captured before a setState batch
  // (like the play() factory below) can still read the latest playbackRate.
  const stateRef = useRef<VoicePlayerState>({
    isPlaying: false, msgId: null, url: '', progress: 0, duration: 0,
    senderName: '', conversationId: '', waveformData: [], playbackRate: 1,
  });
  useEffect(() => { stateRef.current = state; }, [state]);
  // Auto-advance resolver — see setOnEnded(). Callers register a function
  // that, given the message that just ended and its conversation id, returns
  // the next voice message to play (or null to stop). Stored in a ref so
  // updates do not retrigger consumers.
  type EndedResolver = (
    finishedMsgId: string,
    conversationId: string,
  ) =>
    | Promise<{ msgId: string; url: string; senderName: string } | null>
    | { msgId: string; url: string; senderName: string }
    | null;
  const onEndedRef = useRef<EndedResolver | undefined>(undefined);

  const setOnEnded = useCallback((resolver: EndedResolver | undefined) => {
    onEndedRef.current = resolver;
  }, []);

  const stopRAF = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Throttle progress writes to ~12 Hz instead of the full 60 fps RAF rate.
  // 80 ms updates keep the playhead visually smooth without driving a
  // re-render through every consumer 60 times a second.
  const lastProgressAtRef = useRef(0);
  const startRAF = useCallback(() => {
    stopRAF();
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused && audio.duration && isFinite(audio.duration)) {
        const now = performance.now();
        if (now - lastProgressAtRef.current >= 80) {
          lastProgressAtRef.current = now;
          setState(prev => ({ ...prev, progress: audio.currentTime / audio.duration }));
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopRAF]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    stopRAF();
    setState(prev => ({ ...prev, isPlaying: false, msgId: null, progress: 0 }));
  }, [stopRAF]);

  const play = useCallback((msgId: string, url: string, senderName: string, conversationId: string) => {
    if (!url) return;

    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    stopRAF();

    const waveform = waveformCacheRef.current[msgId] || seedWaveform(msgId);

    // Set state to "loading" - show play button changing
    setState(prev => ({
      isPlaying: false,
      msgId,
      url,
      progress: 0,
      duration: 0,
      senderName,
      conversationId,
      waveformData: waveform,
      playbackRate: prev.playbackRate,
    }));

    const audio = new Audio();
    audio.preload = 'auto';
    audio.playbackRate = stateRef.current.playbackRate;
    audioRef.current = audio;

    let started = false;

    const doPlay = () => {
      if (started) return;
      started = true;
      audio.play().then(() => {
        setState(prev => prev.msgId === msgId ? { ...prev, isPlaying: true } : prev);
        startRAF();
      }).catch((err: unknown) => {
        // Reset only if this is still the active message
        setState(prev => prev.msgId === msgId ? { ...prev, isPlaying: false, msgId: null } : prev);
        // Suppress the NotAllowedError that fires when the browser blocks
        // autoplay before a gesture — the user will tap play themselves.
        const name = (err as { name?: string } | null)?.name;
        if (name !== 'NotAllowedError' && name !== 'AbortError') notifyPlayFailure();
      });
    };

    audio.onloadedmetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setState(prev => prev.msgId === msgId ? { ...prev, duration: audio.duration } : prev);
        return;
      }
      // Chromium's MediaRecorder produces webm/opus without a duration
      // header, so `audio.duration` is `Infinity` until we seek past the
      // end. Force a seek to a huge offset — the browser then rewinds
      // and reports the true duration via a second `durationchange`.
      try {
        const onDurationFix = () => {
          if (isFinite(audio.duration) && audio.duration > 0) {
            audio.removeEventListener('durationchange', onDurationFix);
            const dur = audio.duration;
            audio.currentTime = 0;
            setState(prev => prev.msgId === msgId ? { ...prev, duration: dur } : prev);
          }
        };
        audio.addEventListener('durationchange', onDurationFix);
        audio.currentTime = 1e9;
      } catch { /* no-op */ }
    };

    audio.oncanplaythrough = () => doPlay();
    // Fallback - some browsers only fire canplay
    audio.oncanplay = () => doPlay();

    audio.onended = () => {
      stopRAF();
      const finishedId = msgId;
      const conv = conversationId;
      // Reset state immediately so the bubble flips back to "play" while we
      // resolve the next clip.
      setState(prev => ({ ...prev, isPlaying: false, progress: 0, msgId: null }));
      const resolver = onEndedRef.current;
      if (!resolver) return;
      try {
        const ret = resolver(finishedId, conv);
        const handle = (
          next: { msgId: string; url: string; senderName: string } | null,
        ) => {
          if (!next) return;
          // Use the public `play` via this same closure-capable function.
          // Wrap in a setTimeout so the previous Audio element is fully torn
          // down before we mount the next one — otherwise iOS Safari's
          // single-element audio session gets confused.
          setTimeout(() => play(next.msgId, next.url, next.senderName, conv), 80);
        };
        if (ret && typeof (ret as Promise<unknown>).then === 'function') {
          (ret as Promise<{ msgId: string; url: string; senderName: string } | null>).then(handle).catch(() => {});
        } else {
          handle(ret as { msgId: string; url: string; senderName: string } | null);
        }
      } catch { /* no-op — defensive */ }
    };

    audio.onerror = () => {
      setState(prev => prev.msgId === msgId ? { ...prev, isPlaying: false, msgId: null } : prev);
      notifyPlayFailure();
    };

    audio.src = url;
    audio.load();

    // Safety timeout: if canplay doesn't fire within 500ms, force play
    setTimeout(() => {
      if (!started && audioRef.current === audio) {
        doPlay();
      }
    }, 500);
  }, [stopRAF, startRAF]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      stopRAF();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [stopRAF]);

  const togglePlayback = useCallback((msgId: string, url: string, senderName: string, conversationId: string) => {
    if (state.msgId === msgId && state.isPlaying) {
      pause();
    } else if (state.msgId === msgId && !state.isPlaying && audioRef.current && audioRef.current.src) {
      // Resume paused audio
      audioRef.current.play().then(() => {
        setState(prev => ({ ...prev, isPlaying: true }));
        startRAF();
      }).catch(() => {
        // If resume fails, restart from scratch
        play(msgId, url, senderName, conversationId);
      });
    } else {
      play(msgId, url, senderName, conversationId);
    }
  }, [state.msgId, state.isPlaying, pause, play, startRAF]);

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (audio && audio.duration && isFinite(audio.duration)) {
      audio.currentTime = fraction * audio.duration;
      setState(prev => ({ ...prev, progress: fraction }));
    }
  }, []);

  const getProgress = useCallback((msgId: string) => {
    return state.msgId === msgId ? state.progress : 0;
  }, [state.msgId, state.progress]);

  const getDuration = useCallback((msgId: string) => {
    return state.msgId === msgId ? state.duration : 0;
  }, [state.msgId, state.duration]);

  const isPlayingMsg = useCallback((msgId: string) => {
    return state.msgId === msgId && state.isPlaying;
  }, [state.msgId, state.isPlaying]);

  const setPlaybackRate = useCallback((rate: number) => {
    const clamped = Math.max(0.5, Math.min(3, rate));
    if (audioRef.current) audioRef.current.playbackRate = clamped;
    setState(prev => ({ ...prev, playbackRate: clamped }));
  }, []);

  const cyclePlaybackRate = useCallback(() => {
    const cur = stateRef.current.playbackRate;
    // 1 → 1.5 → 2 → 1 (Telegram's voice-message speed cycle).
    const next = cur < 1.25 ? 1.5 : cur < 1.75 ? 2 : 1;
    setPlaybackRate(next);
  }, [setPlaybackRate]);

  // Tracks in-flight extractions so the same msgId can't trigger N parallel
  // fetches if many bubbles mount at once.
  const inflightWaveforms = useRef<Set<string>>(new Set());
  const generateWaveform = useCallback(async (url: string, msgId: string): Promise<number[]> => {
    if (waveformCacheRef.current[msgId]) return waveformCacheRef.current[msgId];
    const fallback = seedWaveform(msgId);
    waveformCacheRef.current[msgId] = fallback;
    setWaveformCache(prev => ({ ...prev, [msgId]: fallback }));
    if (!inflightWaveforms.current.has(msgId)) {
      inflightWaveforms.current.add(msgId);
      extractWaveform(url).then(peaks => {
        if (peaks.length > 0) {
          waveformCacheRef.current[msgId] = peaks;
          setWaveformCache(prev => ({ ...prev, [msgId]: peaks }));
        }
      }).finally(() => {
        inflightWaveforms.current.delete(msgId);
      });
    }
    return fallback;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      stopRAF();
    };
  }, [stopRAF]);

  return (
    <VoicePlayerContext.Provider value={{
      state,
      play,
      pause,
      togglePlayback,
      seek,
      stop,
      cyclePlaybackRate,
      setPlaybackRate,
      getProgress,
      getDuration,
      isPlayingMsg,
      generateWaveform,
      waveformCache,
      setOnEnded,
    }}>
      {children}
    </VoicePlayerContext.Provider>
  );
};
