import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

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

// Decode audio buffer and extract waveform peaks
const extractWaveform = async (url: string, barCount = 40): Promise<number[]> => {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / barCount);
    const peaks: number[] = [];
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = start; j < start + blockSize && j < channelData.length; j++) {
        sum += Math.abs(channelData[j]);
      }
      peaks.push(sum / blockSize);
    }
    // Normalize to 0..1
    const max = Math.max(...peaks, 0.001);
    audioCtx.close();
    return peaks.map(p => Math.max(p / max, 0.08));
  } catch {
    return [];
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopRAF = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startRAF = useCallback(() => {
    stopRAF();
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused && audio.duration && isFinite(audio.duration)) {
        setState(prev => ({ ...prev, progress: audio.currentTime / audio.duration }));
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
      audioRef.current.src = '';
    }
    stopRAF();

    const audio = new Audio(url);
    audio.preload = 'auto';
    audioRef.current = audio;

    const waveform = waveformCache[msgId] || seedWaveform(msgId);

    setState({
      isPlaying: true,
      msgId,
      url,
      progress: 0,
      duration: 0,
      senderName,
      conversationId,
      waveformData: waveform,
    });

    audio.onloadedmetadata = () => {
      if (isFinite(audio.duration)) {
        setState(prev => ({ ...prev, duration: audio.duration }));
      }
    };

    audio.onplay = () => startRAF();

    audio.onended = () => {
      stopRAF();
      setState(prev => ({ ...prev, isPlaying: false, progress: 0, msgId: null }));
    };

    audio.onerror = () => {
      // Retry without CORS
      const retry = new Audio(url);
      retry.preload = 'auto';
      audioRef.current = retry;
      retry.onloadedmetadata = () => {
        if (isFinite(retry.duration)) setState(prev => ({ ...prev, duration: retry.duration }));
      };
      retry.onplay = () => startRAF();
      retry.onended = () => {
        stopRAF();
        setState(prev => ({ ...prev, isPlaying: false, progress: 0, msgId: null }));
      };
      retry.onerror = () => stop();
      retry.play().catch(() => stop());
    };

    audio.play().catch(() => {
      audio.crossOrigin = null as any;
      audio.load();
      audio.play().catch(() => stop());
    });
  }, [stopRAF, startRAF, stop, waveformCache]);

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
    } else if (state.msgId === msgId && !state.isPlaying && audioRef.current) {
      // Resume
      audioRef.current.play().catch(() => {});
      startRAF();
      setState(prev => ({ ...prev, isPlaying: true }));
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

  const generateWaveform = useCallback(async (url: string, msgId: string): Promise<number[]> => {
    if (waveformCache[msgId]) return waveformCache[msgId];
    const fallback = seedWaveform(msgId);
    // Start async extraction
    extractWaveform(url).then(peaks => {
      if (peaks.length > 0) {
        setWaveformCache(prev => ({ ...prev, [msgId]: peaks }));
      }
    });
    setWaveformCache(prev => ({ ...prev, [msgId]: fallback }));
    return fallback;
  }, [waveformCache]);

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
