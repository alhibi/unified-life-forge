// App-wide floating mini-player.
//
// Direct port of Podium's `FloatingMediaPlayer.kt` — same behavior,
// same approximate layout (artwork on the leading edge, title +
// subtitle + progress bar in the middle, play/pause toggle on the
// trailing edge). Lives just above the bottom navigation; tapping it
// expands the full `PlayerSheet`.
//
// Visual design:
//   • Frosted-glass surface tinted by the active podcast's seed color.
//   • A subtle breathing  halo hints that audio is alive without
//     fighting page content for attention.
//   • Square artwork (instead of a circle) so the cover art reads at
//     a glance — modern podcast apps moved away from circular avatars
//     for the same reason; LP/CD covers were never round.
//   • A small animated equalizer overlay sits over the artwork
//     whenever audio is actively playing, replacing the previously-
//     static play indicator.
//
// We render this only when there's a current track AND the player
// sheet isn't already open — same gating logic Podium uses.

import { AnimatePresence, motion } from 'framer-motion';
import { KeyboardEvent, memo, MouseEvent, useCallback, useState } from 'react';

import { FLOATING_STACK_OFFSET } from '@/lib/layout';
import {
  usePodcastPlayer,
  usePodcastPlayerProgress,
} from '@/features/podcasts/contexts/PodcastPlayerContext';
import { Loader2, Pause, Play, RotateCcw, RotateCw } from '@/lib/icons';

import PlayerSheet from './PlayerSheet';

const MINI_PLAYER_HEIGHT = 64;
/** Mini-player skip increment, in seconds. Mirrors the full sheet
 *  (`SKIP` constant in PlayerSheet.tsx) so muscle memory transfers
 *  between the two surfaces. Industry standard across Apple Podcasts,
 *  Pocket Casts, Spotify. */
const MINI_SKIP_SECONDS = 15;

/**
 * Tiny child component dedicated to the live progress bar so the
 * surrounding `PodcastMiniPlayer` doesn't have to subscribe to the
 * 4 Hz progress context. Splitting it out keeps the parent's
 * artwork / title / play-button subtree from reconciling on every
 * `timeupdate`. The child is a single `<div>` with an inline width,
 * so its render is essentially free.
 */
function MiniProgressBar() {
  const { position, duration } = usePodcastPlayerProgress();
  const pct = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;
  return (
    <div className="mt-1 h-[3px] rounded-full bg-foreground/10 overflow-hidden">
      <div
        className="h-full rounded-full transition-[width] duration-200"
        style={{
          width: `${pct}%`,
          background: 'var(--podcast-primary, hsl(var(--primary)))',
          // A faint glow at the head of the fill makes the bar read as
          // luminous rather than flat — matches the player sheet's
          // gradient seek bar.
        }}
      />
    </div>
  );
}

/**
 * Inline transport control rendered inside the outer mini-player
 * button. Modeled as `role="button"` rather than a real `<button>`
 * because nested interactive content is invalid HTML — the outer
 * mini-player is itself a button (it opens the full sheet on tap).
 *
 * Stops propagation on every activation path (click, Enter, Space)
 * so tapping a control invokes only that action; the outer "open
 * sheet" gesture is reserved for the artwork / title area.
 */
const InlineControl = memo(function InlineControl({
  onActivate,
  ariaLabel,
  size,
  style,
  children,
}: {
  onActivate: () => void;
  ariaLabel: string;
  size: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLSpanElement>) => {
      e.stopPropagation();
      onActivate();
    },
    [onActivate],
  );
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation();
        e.preventDefault();
        onActivate();
      }
    },
    [onActivate],
  );
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="rounded-full flex items-center justify-center shrink-0 hover:bg-foreground/10 active:scale-90 transition-transform duration-150 cursor-pointer select-none touch-manipulation"
      style={{ width: size, height: size, willChange: 'transform', ...style }}
    >
      {children}
    </span>
  );
});

const PodcastMiniPlayer = memo(function PodcastMiniPlayer() {
  const player = usePodcastPlayer();
  const [sheetOpen, setSheetOpen] = useState(false);

  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const skipBack = useCallback(() => player.skip(-MINI_SKIP_SECONDS), [player]);
  const skipForward = useCallback(() => player.skip(MINI_SKIP_SECONDS), [player]);
  const togglePlay = useCallback(() => player.toggle(), [player]);

  const visible = !!player.current && !sheetOpen;

  const Icon = player.isLoading ? Loader2 : player.isPlaying ? Pause : Play;
  const isActive = player.isPlaying && !player.isLoading;

  // Use the episode-specific cover when the feed provides one,
  // falling back to the podcast's channel cover. Matches the same
  // precedence used by the full player sheet and the OS media-session
  // metadata, so the artwork stays consistent across every surface.
  const artwork = player.current?.episode.imageUrl || player.current?.podcastImageUrl || '';

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="fixed left-2 right-2 z-float pointer-events-none"
            // Stacks above the floating portal dock (there is no bottom
            // navigation bar in this app — see src/lib/layout.ts).
            style={{
              bottom: `calc(env(safe-area-inset-bottom, 0px) + ${FLOATING_STACK_OFFSET}px)`,
            }}
          >
            <button
              type="button"
              onClick={openSheet}
              className="podcast-mini-glow pointer-events-auto w-full max-w-md mx-auto flex items-center gap-2 ps-2 pe-2 rounded-full overflow-hidden border active:scale-[0.985] transition-transform duration-150 touch-manipulation"
              data-playing={isActive ? 'true' : 'false'}
              style={{
                height: MINI_PLAYER_HEIGHT,
                // Solid, visually rich card styling as requested by the user,
                // abandoning the frosted-glass effect for a more substantive,
                // "obsidian" luxury solid look.

                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))',
                backgroundColor: 'hsl(var(--card))',
                boxShadow: '0 -4px 16px -2px rgba(0, 0, 0, 0.2), 0 0 0 1px hsl(var(--border))',
                willChange: 'transform',
                contain: 'layout paint',
              }}
            >
              {/* Square artwork with rounded corners — modern podcast-
                  app convention (LP covers were never circular) and
                  reads more legibly at small sizes than a circular
                  thumbnail. The equalizer overlay paints over the
                  artwork while audio is playing. */}
              <span className="relative w-12 h-12 rounded-2xl overflow-hidden bg-muted/40 shrink-0">
                <img src={artwork} alt="" className="w-full h-full object-cover" />
                <span className="absolute inset-0 rounded-2xl pointer-events-none" style={{}} />
                {/* Eq overlay; passing `playing` keeps the static
                    artwork visible whenever playback is paused. */}
                <span
                  className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl"
                  style={{
                    background: isActive ? 'rgba(0, 0, 0, 0.35)' : 'transparent',
                    opacity: isActive ? 1 : 0,
                    transition: 'opacity 200ms ease',
                  }}
                  aria-hidden="true"
                >
                  <span className="podcast-eq" data-playing="true" style={{ height: 12 }}>
                    <span style={{ background: '#fff' }} />
                    <span style={{ background: '#fff' }} />
                    <span style={{ background: '#fff' }} />
                  </span>
                </span>
              </span>

              {/* Title / subtitle / progress */}
              <div className="flex-1 min-w-0 text-start">
                <p className="text-[13px] font-bold leading-tight truncate">
                  {player.current?.episode.title}
                </p>
                <p className="text-[11px] opacity-75 leading-tight truncate">
                  {player.current?.podcastTitle}
                </p>
                <MiniProgressBar />
              </div>

              {/* Queue count badge */}
              {player.queueCount > 0 && (
                <span
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: 'var(--podcast-primary-soft, hsl(var(--primary)/0.2))',
                    color: 'var(--podcast-primary, hsl(var(--primary)))',
                  }}
                  title={player.queueCount + ' in queue'}
                >
                  {player.queueCount > 99 ? '99+' : player.queueCount}
                </span>
              )}

              {/* Inline transport cluster: skip-back, play/pause, skip-
                  forward. Compact (32–40px tap targets) so the title
                  area still gets the lion's share of horizontal space.
                  Each control has to call `stopPropagation` because the
                  outer element is itself a button (it opens the full
                  sheet); without it, tapping skip would also expand
                  the sheet.

                  We model the inline buttons as `role="button"` spans
                  rather than nested `<button>` elements — nested
                  interactive content is invalid HTML. The same pattern
                  the original play button already used. */}
              <InlineControl onActivate={skipBack} ariaLabel={`-${MINI_SKIP_SECONDS}s`} size={32}>
                <RotateCcw className="w-4 h-4" strokeWidth={2.25} />
              </InlineControl>

              <InlineControl
                onActivate={togglePlay}
                ariaLabel={player.isPlaying ? 'Pause' : 'Play'}
                size={40}
                style={{
                  color: 'var(--podcast-primary-fg, hsl(var(--primary-foreground)))',
                }}
              >
                <Icon
                  className={`w-4 h-4 ${player.isLoading ? 'animate-spin' : ''}`}
                  fill={isActive ? 'currentColor' : 'none'}
                />
              </InlineControl>

              <InlineControl
                onActivate={skipForward}
                ariaLabel={`+${MINI_SKIP_SECONDS}s`}
                size={32}
              >
                <RotateCw className="w-4 h-4" strokeWidth={2.25} />
              </InlineControl>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <PlayerSheet open={sheetOpen} onClose={closeSheet} />
    </>
  );
});

export default PodcastMiniPlayer;
