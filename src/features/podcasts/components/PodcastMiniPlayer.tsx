// App-wide floating mini-player.
//
// Direct port of Podium's `FloatingMediaPlayer.kt` — same behavior,
// same approximate layout (artwork on the leading edge, title +
// subtitle + progress bar in the middle, play/pause toggle on the
// trailing edge). Lives just above the bottom navigation; tapping it
// expands the full `PlayerSheet`.
//
// Visual design (unified design-system pass):
//   • Solid card surface (hsl(var(--card))) — the old frosted-glass
//     treatment was retired; the dead `podcast-mini-glow` class name is
//     gone with it (its keyframes had already been removed).
//   • The active podcast's extracted accent (`--podcast-primary`, set by
//     DynamicPodcastTheme) tints the progress fill and queue badge.
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
import type { CSSProperties } from 'react';
import { lazy, memo, Suspense, useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  usePodcastPlayer,
  usePodcastPlayerProgress,
} from '@/features/podcasts/contexts/PodcastPlayerContext';
import { Loader2, Pause, Play, RotateCcw, RotateCw } from '@/lib/icons';
import { FLOATING_STACK_OFFSET } from '@/lib/layout';

// The mini-player is mounted on EVERY route, so a static import of
// PlayerSheet pulled it — plus QueueSheet and all of DOMPurify — into the
// entry chunk for every visitor. It is only ever rendered after a tap.
const PlayerSheet = lazy(() => import('./PlayerSheet'));

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
        className="h-full rounded-full progress-fill duration-fast"
        style={
          {
            '--progress': pct / 100,
            background: 'var(--podcast-primary, hsl(var(--primary)))',
          } as CSSProperties
        }
      />
    </div>
  );
}

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
            className="fixed start-2 end-2 z-float pointer-events-none"
            // Stacks above the floating portal dock (there is no bottom
            // navigation bar in this app — see src/lib/layout.ts).
            style={{
              bottom: `calc(env(safe-area-inset-bottom, 0px) + ${FLOATING_STACK_OFFSET}px)`,
            }}
          >
            <div
              className="pointer-events-auto w-full max-w-md mx-auto flex items-center gap-2 ps-2 pe-2 rounded-full overflow-hidden border border-border transition-colors touch-manipulation"
              data-playing={isActive ? 'true' : 'false'}
              style={{
                height: MINI_PLAYER_HEIGHT,
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))',
                backgroundColor: 'hsl(var(--card))',
                contain: 'layout paint',
              }}
            >
              {/* Square artwork with rounded corners — modern podcast-
                  app convention (LP covers were never circular) and
                  reads more legibly at small sizes than a circular
                  thumbnail. The equalizer overlay paints over the
                  artwork while audio is playing. */}
              <Button
                variant="ghost"
                activation="click"
                onClick={openSheet}
                aria-label="فتح مشغل البودكاست"
                className="flex-1 min-w-0 h-full gap-2 p-0 text-start"
              >
                <span className="relative w-12 h-12 rounded-2xl overflow-hidden bg-muted/40 shrink-0">
                  <img src={artwork} alt="" className="w-full h-full object-cover" />
                  {/* Eq overlay; passing `playing` keeps the static
                    artwork visible whenever playback is paused. */}
                  <span
                    className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl"
                    style={{
                      background: isActive ? 'hsl(var(--scrim) / 0.35)' : 'transparent',
                      opacity: isActive ? 1 : 0,
                      transition: 'opacity 200ms ease',
                    }}
                    aria-hidden="true"
                  >
                    <span className="podcast-eq" data-playing="true" style={{ height: 12 }}>
                      <span style={{ background: 'hsl(var(--primary-foreground))' }} />
                      <span style={{ background: 'hsl(var(--primary-foreground))' }} />
                      <span style={{ background: 'hsl(var(--primary-foreground))' }} />
                    </span>
                  </span>
                </span>

                {/* Title / subtitle / progress */}
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-mini font-bold leading-tight truncate">
                    {player.current?.episode.title}
                  </p>
                  <p className="text-micro opacity-75 leading-tight truncate">
                    {player.current?.podcastTitle}
                  </p>
                  <MiniProgressBar />
                </div>
              </Button>

              {/* Queue count badge */}
              {player.queueCount > 0 && (
                <span
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-micro font-bold"
                  style={{
                    background: 'var(--podcast-primary-soft, hsl(var(--primary)/0.2))',
                    color: 'var(--podcast-primary, hsl(var(--primary)))',
                  }}
                  title={`${player.queueCount} في قائمة التشغيل`}
                >
                  {player.queueCount > 99 ? '99+' : player.queueCount}
                </span>
              )}

              <Button
                variant="ghost"
                size="icon"
                activation="click"
                onClick={skipBack}
                aria-label="رجوع 15 ثانية"
                className="h-11 w-11 shrink-0 rounded-full"
              >
                <RotateCcw className="w-4 h-4" strokeWidth={2.25} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                activation="click"
                onClick={togglePlay}
                aria-label={player.isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                className="h-11 w-11 shrink-0 rounded-full text-primary"
              >
                <Icon
                  className={`w-4 h-4 ${player.isLoading ? 'animate-spin' : ''}`}
                  fill={isActive ? 'currentColor' : 'none'}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                activation="click"
                onClick={skipForward}
                aria-label="تقديم 15 ثانية"
                className="h-11 w-11 shrink-0 rounded-full"
              >
                <RotateCw className="w-4 h-4" strokeWidth={2.25} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sheetOpen && (
        <Suspense fallback={null}>
          <PlayerSheet open={sheetOpen} onClose={closeSheet} />
        </Suspense>
      )}
    </>
  );
});

export default PodcastMiniPlayer;
