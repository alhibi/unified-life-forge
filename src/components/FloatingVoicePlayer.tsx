import React, { useEffect } from 'react';
import { useVoicePlayer } from '@/contexts/VoicePlayerContext';
import { X, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingVoicePlayer: React.FC = () => {
  const { state, pause, stop, seek, togglePlayback, waveformCache } = useVoicePlayer();

  const show = state.msgId !== null;

  const formatDur = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const waveform = state.msgId ? (waveformCache[state.msgId] || state.waveformData) : [];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9999] safe-area-top"
        >
          <div className="mx-2 mt-2 flex items-center gap-3 rounded-2xl bg-card/95 backdrop-blur-xl px-3 py-2.5 shadow-lg border border-border/30">
            {/* Play/Pause */}
            <button
              onClick={() => state.msgId && togglePlayback(state.msgId, state.url, state.senderName, state.conversationId)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 active:scale-90 transition-transform"
            >
              {state.isPlaying ? (
                <Pause className="h-4 w-4 text-primary" fill="currentColor" />
              ) : (
                <Play className="h-4 w-4 text-primary ms-0.5" fill="currentColor" />
              )}
            </button>

            {/* Waveform + info */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground truncate">{state.senderName || 'رسالة صوتية'}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums" dir="ltr">
                  {state.isPlaying && state.duration ? formatDur(state.progress * state.duration) : (state.duration ? formatDur(state.duration) : '')}
                </span>
              </div>
              {/* Mini waveform */}
              <div
                className="flex items-center gap-[1.5px] h-[16px] cursor-pointer"
                dir="ltr"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const fraction = (e.clientX - rect.left) / rect.width;
                  seek(Math.max(0, Math.min(1, fraction)));
                }}
              >
                {waveform.map((h, i) => {
                  const barProgress = i / waveform.length;
                  const isActive = barProgress < state.progress;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 rounded-full transition-colors duration-100',
                        isActive ? 'bg-primary' : 'bg-muted-foreground/25'
                      )}
                      style={{ height: `${h * 16}px`, minWidth: '1.5px' }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={stop}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-muted/60 active:scale-90 transition-transform"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingVoicePlayer;
