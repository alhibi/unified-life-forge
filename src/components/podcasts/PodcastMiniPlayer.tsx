// App-wide floating mini-player.
//
// Direct port of Podium's `FloatingMediaPlayer.kt` — same behavior,
// same approximate layout (artwork on the leading edge, title +
// subtitle + progress bar in the middle, play/pause toggle on the
// trailing edge). Lives just above the bottom navigation; tapping it
// expands the full `PlayerSheet`.
//
// We render this only when there's a current track AND the player
// sheet isn't already open — same gating logic Podium uses.

import { memo, useState } from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePodcastPlayer } from '@/contexts/PodcastPlayerContext';
import PlayerSheet from './PlayerSheet';

const MINI_PLAYER_HEIGHT = 64;

const PodcastMiniPlayer = memo(function PodcastMiniPlayer() {
  const player = usePodcastPlayer();
  const [sheetOpen, setSheetOpen] = useState(false);

  const visible = !!player.current && !sheetOpen;

  // Progress bar fill percent. We use the live position state which
  // updates ~4Hz — fast enough for a smooth bar without being so
  // frequent it tanks rendering.
  const pct = player.duration > 0
    ? Math.min(100, Math.max(0, (player.position / player.duration) * 100))
    : 0;

  const Icon = player.isLoading ? Loader2 : player.isPlaying ? Pause : Play;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="fixed left-2 right-2 z-40 pointer-events-none"
            // Position above the bottom nav (which is roughly 64px tall
            // with insets). We use bottom: env(safe-area...) + 72 so the
            // bar nudges up to clear iOS home-indicator + nav.
            style={{
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)',
            }}
          >
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="pointer-events-auto w-full max-w-md mx-auto flex items-center gap-3 ps-2 pe-3 rounded-full border shadow-lg overflow-hidden"
              style={{
                height: MINI_PLAYER_HEIGHT,
                // Theme tint: the mini-player uses the active podcast's
                // seed color when one is available, otherwise falls
                // back to the app's surface tokens.
                background: 'var(--podcast-primary-subtle, hsl(var(--card)))',
                borderColor: 'var(--podcast-primary, hsl(var(--border)))',
                color: 'hsl(var(--foreground))',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              {/* Artwork */}
              <img
                src={player.current?.podcastImageUrl ?? ''}
                alt=""
                className="w-12 h-12 rounded-full object-cover bg-muted/40 shrink-0"
              />

              {/* Title / subtitle / progress */}
              <div className="flex-1 min-w-0 text-start">
                <p className="text-[13px] font-bold leading-tight truncate">
                  {player.current?.episode.title}
                </p>
                <p className="text-[11px] opacity-80 leading-tight truncate">
                  {player.current?.podcastTitle}
                </p>
                <div className="mt-1 h-1 rounded-full bg-foreground/10 overflow-hidden">
                  <div
                    className="h-full transition-[width] duration-200"
                    style={{
                      width: `${pct}%`,
                      background: 'var(--podcast-primary, hsl(var(--primary)))',
                    }}
                  />
                </div>
              </div>

              {/* Play / Pause toggle */}
              <span
                onClick={(e) => { e.stopPropagation(); player.toggle(); }}
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                style={{
                  background: 'var(--podcast-primary, hsl(var(--primary)))',
                  color: 'var(--podcast-primary-fg, hsl(var(--primary-foreground)))',
                }}
                role="button"
                aria-label={player.isPlaying ? 'Pause' : 'Play'}
              >
                <Icon
                  className={`w-4 h-4 ${player.isLoading ? 'animate-spin' : ''}`}
                  fill={player.isPlaying && !player.isLoading ? 'currentColor' : 'none'}
                />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <PlayerSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
});

export default PodcastMiniPlayer;
