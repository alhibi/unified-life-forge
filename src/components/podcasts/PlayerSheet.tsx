// Full-screen podcast player.
//
// Equivalent to Podium's `MediaPlayerBottomSheet.kt`: opens when the
// user taps the mini-player. Shows the full artwork, title/subtitle,
// a wide seekable progress bar, skip-back / play-pause / skip-forward
// transport, and a row of secondary controls (speed, sleep timer,
// auto-play toggle).

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown, Gauge, Loader2, Moon, Pause, Play, Repeat,
  RotateCcw, RotateCw, X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import {
  usePodcastPlayer, usePodcastPlayerProgress,
  type SleepTimerSetting,
} from '@/contexts/PodcastPlayerContext';
import { useApp } from '@/contexts/AppContext';

const SKIP = 15;
const SPEEDS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

/** Sleep-timer presets in minutes. `null` is the special "end of
 *  current episode" mode handled inline in the player context. */
const SLEEP_PRESETS_MIN: Array<number | 'episode' | null> = [
  null, 5, 10, 15, 30, 45, 60, 'episode',
];

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

/**
 * Live seek bar — its own component so the surrounding `PlayerSheet`
 * doesn't have to subscribe to the 4 Hz progress context. The slider's
 * value, gradient fill, and time labels are the only things that need
 * to repaint on `timeupdate`; everything else (artwork, title, transport
 * buttons, speed pills) stays stable across position ticks.
 */
function PlayerSheetSeek({
  ariaLabel, onSeek,
}: {
  ariaLabel: string;
  onSeek: (s: number) => void;
}) {
  const { position, duration } = usePodcastPlayerProgress();
  const pct = duration > 0 ? (position / duration) * 100 : 0;
  return (
    <div className="px-6 mt-5">
      <input
        type="range"
        min={0}
        max={Math.max(1, duration)}
        step={1}
        value={Math.min(position, duration || 0)}
        onChange={e => onSeek(parseFloat(e.target.value))}
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
        aria-label={ariaLabel}
      />
      <div className="flex justify-between mt-2 text-[11px] tabular-nums text-muted-foreground">
        <span>{formatTime(position)}</span>
        <span>-{formatTime(Math.max(0, duration - position))}</span>
      </div>
    </div>
  );
}

/**
 * Tiny live-countdown label for an armed sleep timer. Updates 1 Hz off
 * its own interval so we don't need to drag the wall-clock state into
 * the player context (it lives there only as the cutoff timestamp).
 *
 * `kind === 'episode'` returns a static label — there's no countdown
 * to render, just an indicator that the timer will fire when the
 * current episode ends.
 */
function SleepCountdown({ timer, lang }: { timer: SleepTimerSetting; lang: 'ar' | 'de' }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (timer.kind !== 'time') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer.kind]);
  if (timer.kind === 'episode') {
    return <>{lang === 'ar' ? 'حتى نهاية الحلقة' : 'Bis Episodenende'}</>;
  }
  const remaining = Math.max(0, timer.endsAt - now);
  const m = Math.floor(remaining / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  return <>{`${m}:${String(s).padStart(2, '0')}`}</>;
}

export default function PlayerSheet({ open, onClose }: PlayerSheetProps) {
  const player = usePodcastPlayer();
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';

  // Locally-controlled popovers for the three secondary actions. We
  // keep them in component state (not ref/document.body click handlers)
  // because they're modal in feel — only one open at a time, dismissed
  // by tapping outside or selecting a value.
  const [openPopover, setOpenPopover] = useState<null | 'speed' | 'sleep'>(null);

  // Lock body scroll while the sheet is open (parity with the country
  // dialog and the rest of the app's modals).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close popovers when the sheet itself closes — otherwise reopening
  // it later would briefly flash the last-opened popover during the
  // sheet's slide-in.
  useEffect(() => {
    if (!open) setOpenPopover(null);
  }, [open]);

  // Sanitize the episode description once per render. Computed here
  // (above the early return) because hooks must run in the same order
  // on every render. The RSS parser forwards `<content:encoded>` (HTML)
  // when available and the plainer `<description>` otherwise; either
  // can carry markup we don't want to inject blindly. DOMPurify keeps
  // a safe subset.
  //
  // We pull `description` into a separate local so the useMemo
  // dependency list is a primitive — adding the whole `player` object
  // would re-sanitize on every position tick.
  const rawDescription = player.current?.episode.description ?? '';
  const safeDescription = useMemo(() => {
    if (!rawDescription) return '';
    return DOMPurify.sanitize(rawDescription.replace(/\n/g, '<br>'), {
      ALLOWED_TAGS: ['a', 'b', 'br', 'em', 'i', 'p', 'span', 'strong', 'u', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  }, [rawDescription]);

  if (!player.current) return null;

  // Prefer the episode-specific artwork (set on every `<item>` in
  // RSS feeds that ship per-episode covers — e.g. interview shows
  // with guest photos). Falls back to the channel-level cover if
  // the episode didn't override it. The same precedence is what
  // Apple Podcasts and Spotify use.
  const episodeArtwork = player.current.episode.imageUrl
    || player.current.podcastImageUrl;

  const Icon = player.isLoading ? Loader2 : player.isPlaying ? Pause : Play;

  // Display label for the speed pill. We strip trailing zeros so
  // "1.00x" and "1.50x" render as "1x" / "1.5x" — denser, easier to
  // scan at a glance.
  const speedLabel = player.speed.toFixed(2).replace(/\.?0+$/, '') + 'x';

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

            {/* Artwork — episode-specific cover if the feed provided
                one, otherwise the podcast's channel cover. The alt
                text is informative (not decorative) here because the
                player sheet is the focal screen for the episode. */}
            <div className="px-6 pt-3 pb-4">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={episodeArtwork}
                  alt={`${player.current.episode.title} — ${player.current.podcastTitle}`}
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

            {/* Episode description card.
                Capped at ~6rem visible height with internal scroll — long
                show notes (Spotify-style transcripts, sponsor-link dumps)
                won't push the transport off-screen. The container itself
                receives momentum scrolling on iOS via overflow-y-auto. */}
            {safeDescription && (
              <div className="px-6 mt-3">
                <div
                  className="rounded-2xl bg-muted/30 border border-border/30 px-4 py-3 max-h-24 overflow-y-auto"
                  // The actual scrollable region for show notes — touch
                  // scrolling stays inside this box and doesn't fight
                  // the bottom-sheet's own gesture handler.
                  onTouchMove={e => e.stopPropagation()}
                >
                  <div
                    className="text-[12px] text-foreground/75 leading-relaxed podcast-html"
                    dangerouslySetInnerHTML={{ __html: safeDescription }}
                  />
                </div>
              </div>
            )}

            {/* Progress slider */}
            <PlayerSheetSeek
              ariaLabel={lang === 'ar' ? 'الانتقال داخل الحلقة' : 'Position'}
              onSeek={player.seek}
            />

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

            {/* Secondary controls — speed, sleep timer, auto-play.
                One row of icon buttons, each opening a popover where
                relevant. The previous design exposed all six speeds
                as a permanent pill row, which was visual noise during
                the 95 % of playback that doesn't involve speed
                changes. */}
            <div className="relative flex items-center justify-around px-6 mt-5 mb-5">
              {/* Speed */}
              <button
                onClick={() => setOpenPopover(openPopover === 'speed' ? null : 'speed')}
                aria-expanded={openPopover === 'speed'}
                aria-haspopup="menu"
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl hover:bg-muted/40 transition-colors"
              >
                <Gauge className="w-4 h-4 text-muted-foreground" />
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{
                    color: player.speed === 1
                      ? 'hsl(var(--foreground))'
                      : 'var(--podcast-primary, hsl(var(--primary)))',
                  }}
                >
                  {speedLabel}
                </span>
              </button>

              {/* Sleep timer */}
              <button
                onClick={() => setOpenPopover(openPopover === 'sleep' ? null : 'sleep')}
                aria-expanded={openPopover === 'sleep'}
                aria-haspopup="menu"
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl hover:bg-muted/40 transition-colors"
              >
                <Moon
                  className="w-4 h-4"
                  style={{
                    color: player.sleepTimer
                      ? 'var(--podcast-primary, hsl(var(--primary)))'
                      : 'hsl(var(--muted-foreground))',
                  }}
                />
                <span className="text-[11px] font-bold tabular-nums min-w-[34px] text-center">
                  {player.sleepTimer
                    ? <SleepCountdown timer={player.sleepTimer} lang={lang} />
                    : (lang === 'ar' ? 'نوم' : 'Sleep')}
                </span>
              </button>

              {/* Auto-play next toggle */}
              <button
                onClick={() => player.setAutoPlayNext(!player.autoPlayNext)}
                aria-pressed={player.autoPlayNext}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl hover:bg-muted/40 transition-colors"
              >
                <Repeat
                  className="w-4 h-4"
                  style={{
                    color: player.autoPlayNext
                      ? 'var(--podcast-primary, hsl(var(--primary)))'
                      : 'hsl(var(--muted-foreground))',
                  }}
                />
                <span className="text-[11px] font-bold">
                  {lang === 'ar' ? 'تتابع' : 'Auto'}
                </span>
              </button>

              {/* Speed popover */}
              <AnimatePresence>
                {openPopover === 'speed' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-10 bg-popover border border-border/60 rounded-2xl shadow-xl p-2 min-w-[180px]"
                    role="menu"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pt-1 pb-2">
                      {lang === 'ar' ? 'سرعة التشغيل' : 'Wiedergabegeschwindigkeit'}
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {SPEEDS.map(s => (
                        <button
                          key={s}
                          role="menuitemradio"
                          aria-checked={player.speed === s}
                          onClick={() => { player.setSpeed(s); setOpenPopover(null); }}
                          className="px-2.5 py-2 rounded-lg text-[12px] font-semibold transition-colors"
                          style={{
                            background: player.speed === s
                              ? 'var(--podcast-primary, hsl(var(--primary)))'
                              : 'transparent',
                            color: player.speed === s
                              ? 'var(--podcast-primary-fg, hsl(var(--primary-foreground)))'
                              : 'hsl(var(--foreground))',
                          }}
                        >
                          {s.toFixed(2).replace(/\.?0+$/, '')}x
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sleep popover */}
              <AnimatePresence>
                {openPopover === 'sleep' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-10 bg-popover border border-border/60 rounded-2xl shadow-xl p-2 min-w-[200px]"
                    role="menu"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pt-1 pb-2">
                      {lang === 'ar' ? 'مؤقت النوم' : 'Sleep Timer'}
                    </p>
                    <div className="flex flex-col">
                      {SLEEP_PRESETS_MIN.map(preset => {
                        const isOff = preset === null;
                        const isEpisode = preset === 'episode';
                        const isActiveTime = !isOff && !isEpisode &&
                          player.sleepTimer?.kind === 'time';
                        const isActiveEpisode = isEpisode && player.sleepTimer?.kind === 'episode';
                        const isActiveOff = isOff && player.sleepTimer === null;
                        const label = isOff
                          ? (lang === 'ar' ? 'إيقاف' : 'Aus')
                          : isEpisode
                          ? (lang === 'ar' ? 'حتى نهاية الحلقة' : 'Bis Episodenende')
                          : (lang === 'ar' ? `${preset} دقيقة` : `${preset} min`);

                        return (
                          <button
                            key={String(preset)}
                            role="menuitemradio"
                            aria-checked={isActiveOff || isActiveEpisode || isActiveTime}
                            onClick={() => {
                              if (isOff) {
                                player.setSleepTimer(null);
                              } else if (isEpisode) {
                                player.setSleepTimer({ kind: 'episode' });
                              } else {
                                player.setSleepTimer({
                                  kind: 'time',
                                  endsAt: Date.now() + (preset as number) * 60_000,
                                });
                              }
                              setOpenPopover(null);
                            }}
                            className="text-start px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-muted/60 transition-colors"
                            style={{
                              color: (isActiveOff || isActiveEpisode || isActiveTime)
                                ? 'var(--podcast-primary, hsl(var(--primary)))'
                                : 'hsl(var(--foreground))',
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
