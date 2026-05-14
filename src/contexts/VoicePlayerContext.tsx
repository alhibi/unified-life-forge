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
}

interface VoicePlayerContextType {
  state: VoicePlayerState;
  play: (msgId: string, url: string, senderName: string, conversationId: string) => void;
  pause: () => void;
  togglePlayback: (msgId: string, url: string, senderName: string, conversationId: string) => void;
  seek: (fraction: number) => void;
  stop: () => void;
  getProgress: (msgId: string) => number;
  getDuration: (msgId: string) => number;
  isPlayingMsg: (msgId: string) => boolean;
  generateWaveform: (url: string, msgId: string) => Promise<number[]>;
  waveformCache: Record<string, number[]>;
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
  });

  const [waveformCache, setWaveformCache] = useState<Record<string, number[]>>({});
  const waveformCacheRef = useRef<Record<string, number[]>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

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
    setState({
      isPlaying: false,
      msgId,
      url,
      progress: 0,
      duration: 0,
      senderName,
      conversationId,
      waveformData: waveform,
    });

    const audio = new Audio();
    audio.preload = 'auto';
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
      if (isFinite(audio.duration)) {
        setState(prev => prev.msgId === msgId ? { ...prev, duration: audio.duration } : prev);
      }
    };

    audio.oncanplaythrough = () => doPlay();
    // Fallback - some browsers only fire canplay
    audio.oncanplay = () => doPlay();

    audio.onended = () => {
      stopRAF();
      setState(prev => ({ ...prev, isPlaying: false, progress: 0, msgId: null }));
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
      getProgress,
      getDuration,
      isPlayingMsg,
      generateWaveform,
      waveformCache,
    }}>
      {children}
    </VoicePlayerContext.Provider>
  );
};
