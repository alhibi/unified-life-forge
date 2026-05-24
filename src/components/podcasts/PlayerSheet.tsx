// Full-screen podcast player.
//
// Equivalent to Podium's `MediaPlayerBottomSheet.kt`: opens when the
// user taps the mini-player. Shows the full artwork, title/subtitle,
// a wide seekable progress bar, skip-back / play-pause / skip-forward
// transport, and a row of secondary controls (speed, close).

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Gauge, Loader2, Pause, Play, RotateCcw, RotateCw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePodcastPlayer } from '@/contexts/PodcastPlayerContext';
import { useApp } from '@/contexts/AppContext';

const SKIP = 15;
const SPEEDS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}:${String(mins % 60).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

interface PlayerSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function PlayerSheet({ open, onClose }: PlayerSheetProps) {
  const player = usePodcastPlayer();
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';

  // Lock body scroll while the sheet is open (parity with the country
  // dialog and the rest of the app's modals).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!player.current) return null;

  const Icon = player.isLoading ? Loader2 : player.isPlaying ? Pause : Play;
  const pct = player.duration > 0
    ? (player.position / player.duration) * 100
    : 0;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[120] flex items-end justify-center"
          // Black scrim with a subtle tint of the seed color on top so
          // the sheet feels visually connected to the podcast.
          style={{
            background: `radial-gradient(ellipse at top, var(--podcast-primary-subtle, transparent), rgba(0,0,0,0.85))`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="bg-card text-foreground w-full max-w-md max-h-[100dvh] rounded-t-3xl shadow-2xl flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Drag handle / header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted/60">
                <ChevronDown className="w-5 h-5" />
              </button>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {lang === 'ar' ? 'يُشغَّل الآن' : 'Wird abgespielt'}
              </span>
              <button
                onClick={() => { player.close(); onClose(); }}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted/60"
                aria-label={lang === 'ar' ? 'إغلاق المشغل' : 'Player schließen'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Artwork */}
            <div className="px-6 pt-3 pb-4">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={player.current.podcastImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Title / subtitle */}
            <div className="px-6">
              <h2 className="text-lg font-bold leading-tight line-clamp-2">
                {player.current.episode.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {player.current.podcastTitle}
              </p>
            </div>

            {/* Progress slider */}
            <div className="px-6 mt-5">
              <input
                type="range"
                min={0}
                max={Math.max(1, player.duration)}
                step={1}
                value={Math.min(player.position, player.duration || 0)}
                onChange={e => player.seek(parseFloat(e.target.value))}
                className="w-full appearance-none bg-transparent podcast-seek"
                style={{
                  // Inline gradient is easier to tint than ::-webkit-slider-runnable-track.
                  background: `linear-gradient(to right,
                    var(--podcast-primary, hsl(var(--primary))) 0%,
                    var(--podcast-primary, hsl(var(--primary))) ${pct}%,
                    hsl(var(--muted) / 0.5) ${pct}%,
                    hsl(var(--muted) / 0.5) 100%)`,
                  height: 6,
                  borderRadius: 999,
                }}
                aria-label={lang === 'ar' ? 'الانتقال داخل الحلقة' : 'Position'}
              />
              <div className="flex justify-between mt-2 text-[11px] tabular-nums text-muted-foreground">
                <span>{formatTime(player.position)}</span>
                <span>-{formatTime(Math.max(0, player.duration - player.position))}</span>
              </div>
            </div>

            {/* Transport controls */}
            <div className="flex items-center justify-center gap-6 px-6 mt-4">
              <button
                onClick={() => player.skip(-SKIP)}
                className="w-14 h-14 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label={`-${SKIP}s`}
              >
                <RotateCcw className="w-7 h-7" />
              </button>
              <button
                onClick={() => player.toggle()}
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                style={{
                  background: 'var(--podcast-primary, hsl(var(--primary)))',
                  color: 'var(--podcast-primary-fg, hsl(var(--primary-foreground)))',
                }}
                aria-label={player.isPlaying ? 'Pause' : 'Play'}
              >
                <Icon
                  className={`w-9 h-9 ${player.isLoading ? 'animate-spin' : ''}`}
                  fill={player.isPlaying && !player.isLoading ? 'currentColor' : 'none'}
                />
              </button>
              <button
                onClick={() => player.skip(SKIP)}
                className="w-14 h-14 rounded-full hover:bg-muted/60 flex items-center justify-center"
                aria-label={`+${SKIP}s`}
              >
                <RotateCw className="w-7 h-7" />
              </button>
            </div>

            {/* Speed controls */}
            <div className="flex items-center justify-center gap-1 px-6 mt-5 mb-4">
              <Gauge className="w-3.5 h-3.5 text-muted-foreground me-1" />
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => player.setSpeed(s)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                  style={{
                    background: player.speed === s ? 'var(--podcast-primary, hsl(var(--primary)))' : 'transparent',
                    color: player.speed === s ? 'var(--podcast-primary-fg, hsl(var(--primary-foreground)))' : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {s.toFixed(2).replace(/\.?0+$/, '')}x
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
