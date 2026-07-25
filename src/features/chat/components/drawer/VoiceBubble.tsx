import React from 'react';

import { useVoicePlayer } from '@/contexts/VoicePlayerContext';
import { Timer } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { formatClockTime, getSignedFileUrl } from '../chatUtils';
import { MessageTicks } from '../MessageBubble';
import type { Message } from '../types';

/**
 * Waveform gating. We only ask the voice-player context to decode audio peaks
 * once the bubble has scrolled into view — otherwise a 200-message chat with
 * 30 voice notes would kick off 30 fetches + decodeAudioData on first paint,
 * stalling the UI and hitting signed-URL rate limits.
 */
export function useWaveformOnVisible(
  ref: React.RefObject<HTMLDivElement | null>,
  fileUrl: string,
  msgId: string,
  hasCachedWaveform: boolean,
  generateWaveform: (url: string, msgId: string) => Promise<number[]>,
) {
  React.useEffect(() => {
    if (!fileUrl || hasCachedWaveform) return;
    const el = ref.current;
    if (!el) return;
    // Browsers without IntersectionObserver fall back to eager generation
    // (matches old behavior without crashing).
    if (typeof IntersectionObserver === 'undefined') {
      generateWaveform(fileUrl, msgId);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            generateWaveform(fileUrl, msgId);
            io.disconnect();
            break;
          }
        }
      },
      { root: null, rootMargin: '200px 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, fileUrl, msgId, hasCachedWaveform, generateWaveform]);
}

/**
 * Voice-message bubble. Encapsulates the player UI + waveform-on-visible
 * hook so the main render tree stays readable and so the IntersectionObserver
 * only fires for voice notes actually on screen.
 */
export interface VoiceBubbleProps {
  msg: Message;
  isMine: boolean;
  isDarkBg: boolean;
  isFading: boolean;
  fileUrl: string;
  rawFileUrl: string | null;
  senderName: string;
  onSelectToggle: (id: string) => void;
  selectionMode: boolean;
  voicePlayer: ReturnType<typeof useVoicePlayer>;
}

export default function VoiceBubble({
  msg,
  isMine,
  isDarkBg,
  isFading,
  fileUrl,
  rawFileUrl,
  senderName,
  onSelectToggle,
  selectionMode,
  voicePlayer,
}: VoiceBubbleProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const cachedWaveform = voicePlayer.waveformCache[msg.id];
  useWaveformOnVisible(
    containerRef,
    fileUrl,
    msg.id,
    !!cachedWaveform,
    voicePlayer.generateWaveform,
  );

  const isPlaying = voicePlayer.isPlayingMsg(msg.id);
  const progress = voicePlayer.getProgress(msg.id);
  const duration = voicePlayer.getDuration(msg.id);
  const formatDur = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const bars = React.useMemo(() => {
    if (cachedWaveform) return cachedWaveform;
    const seed = msg.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from(
      { length: 40 },
      (_, i) => ((Math.sin(seed * (i + 1) * 0.7) + 1) / 2) * 0.85 + 0.15,
    );
  }, [cachedWaveform, msg.id]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) {
      onSelectToggle(msg.id);
      return;
    }
    const playableUrl = fileUrl || (rawFileUrl ? await getSignedFileUrl(rawFileUrl) : '');
    if (!playableUrl) return;
    voicePlayer.togglePlayback(msg.id, playableUrl, senderName, msg.conversation_id);
  };

  const handleSeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (voicePlayer.state.msgId !== msg.id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    voicePlayer.seek(Math.max(0, Math.min(1, fraction)));
  };

  // ── Pointer-drag scrubber (Telegram-style "drag the playhead") ──────────
  // The bare click- above stays for desktop quick-jumps. On top of
  // it, we layer a pointer-capture flow so users can grab the waveform
  // and slide along — far more accurate than tapping the right position.
  const isMineActiveRef = React.useRef(false);
  const trackRectRef = React.useRef<DOMRect | null>(null);
  const handleScrubStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (voicePlayer.state.msgId !== msg.id) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    isMineActiveRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    trackRectRef.current = e.currentTarget.getBoundingClientRect();
    const r = trackRectRef.current;
    voicePlayer.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  };
  const handleScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMineActiveRef.current || !trackRectRef.current) return;
    const r = trackRectRef.current;
    voicePlayer.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  };
  const handleScrubEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMineActiveRef.current) return;
    isMineActiveRef.current = false;
    trackRectRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* no-op */
    }
  };

  return (
    <div ref={containerRef} className="min-w-[220px] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل الرسالة الصوتية'}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors active:scale-90',
            isMine ? 'bg-primary/20' : 'bg-primary/15',
          )}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary ms-0.5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="flex-1 flex flex-col gap-1.5">
          <div
            className="flex items-center gap-[2px] h-[20px] cursor-pointer touch-none select-none"
            dir="ltr"
            role={voicePlayer.state.msgId === msg.id ? 'slider' : undefined}
            aria-label={'شريط تقدم الصوت'}
            aria-valuemin={voicePlayer.state.msgId === msg.id ? 0 : undefined}
            aria-valuemax={voicePlayer.state.msgId === msg.id ? 100 : undefined}
            aria-valuenow={
              voicePlayer.state.msgId === msg.id ? Math.round(progress * 100) : undefined
            }
            onClick={handleSeek}
            onPointerDown={handleScrubStart}
            onPointerMove={handleScrubMove}
            onPointerUp={handleScrubEnd}
            onPointerCancel={handleScrubEnd}
          >
            {bars.map((h, i) => {
              const barProgress = i / bars.length;
              const isActive = voicePlayer.state.msgId === msg.id && barProgress < progress;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 rounded-full transition-colors duration-100',
                    isActive ? 'bg-primary' : 'bg-muted-foreground/25',
                  )}
                  style={{ height: `${h * 20}px`, minWidth: '2px' }}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between" dir="ltr">
            <span className="text-[0.625rem] tabular-nums text-muted-foreground/50">
              {isPlaying && duration
                ? formatDur(progress * duration)
                : duration
                  ? formatDur(duration)
                  : ''}
            </span>
            <div className="flex items-center gap-1.5">
              {isPlaying && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    voicePlayer.cyclePlaybackRate();
                  }}
                  className={cn(
                    'text-[0.625rem] font-bold tabular-nums px-1.5 py-[1px] rounded-full leading-none transition-colors active:scale-90',
                    isMine && isDarkBg
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-primary/15 text-primary',
                  )}
                  aria-label={'سرعة التشغيل'}
                >
                  {voicePlayer.state.playbackRate === 1
                    ? '1×'
                    : voicePlayer.state.playbackRate === 1.5
                      ? '1.5×'
                      : '2×'}
                </button>
              )}
              <span
                className={cn(
                  'flex items-center gap-[3px] text-[0.6875rem] leading-none',
                  isDarkBg && isMine ? 'text-primary-foreground/70' : 'text-muted-foreground/60',
                )}
              >
                {msg.edited_at && <span className="text-[0.625rem] italic">{'معدّلة'}</span>}
                {isFading && <Timer className="h-[10px] w-[10px] animate-pulse" />}
                {formatClockTime(msg.created_at)}
                {isMine && <MessageTicks status={msg.status} read={msg.read} dimmed={isDarkBg} />}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

