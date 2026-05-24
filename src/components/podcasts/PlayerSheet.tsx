// Full-screen podcast player.
//
// Equivalent to Podium's `MediaPlayerBottomSheet.kt`: opens when the
// user taps the mini-player. Shows the full artwork, title/subtitle,
// a wide seekable progress bar, skip-back / play-pause / skip-forward
// transport, and a row of secondary controls (speed, close).

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown, Gauge, Loader2, Moon, Pause, Play, Repeat, RotateCcw, RotateCw,
  Share2, X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { usePodcastPlayer, usePodcastPlayerProgress } from '@/contexts/PodcastPlayerContext';
import { useApp } from '@/contexts/AppContext';

const SKIP = 15;
const SPEEDS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

/** Sleep-timer presets, in seconds. The trailing `'episode-end'`
 *  option asks the player to pause on the natural `ended` event
 *  rather than after a fixed duration — useful for "let me finish
 *  this one and then sleep". */
const SLEEP_PRESETS: Array<{ value: number | 'episode-end'; labelAr: string; labelDe: string }> = [
  { value: 5 * 60,        labelAr: '٥ دقائق',         labelDe: '5 Min'           },
  { value: 15 * 60,       labelAr: '١٥ دقيقة',        labelDe: '15 Min'          },
  { value: 30 * 60,       labelAr: '٣٠ دقيقة',        labelDe: '30 Min'          },
  { value: 60 * 60,       labelAr: 'ساعة',            labelDe: '1 Std'           },
  { value: 'episode-end', labelAr: 'حتى نهاية الحلقة', labelDe: 'Bis zum Ende'    },
];

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}:${String(mins % 60).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatCountdown(s: number, lang: 'ar' | 'de'): string {
  if (s <= 0) return '0:00';
  const mins = Math.ceil(s / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return lang === 'ar' ? `${h} س ${m} د` : `${h} h ${m} min`;
  }
  return lang === 'ar' ? `${mins} د` : `${mins} min`;
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

export default function PlayerSheet({ open, onClose }: PlayerSheetProps) {
  const player = usePodcastPlayer();
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';

  // Sleep-timer popover open/close. Kept here (not inside the popover
  // component) so tapping elsewhere on the sheet collapses it.
  const [sleepOpen, setSleepOpen] = useState(false);
  // Briefly flash a "Link copied" badge after the share fallback.
  const [copiedLink, setCopiedLink] = useState(false);

  // Lock body scroll while the sheet is open (parity with the country
  // dialog and the rest of the app's modals).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close popovers when the sheet itself closes.
  useEffect(() => {
    if (!open) {
      setSleepOpen(false);
      setCopiedLink(false);
    }
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

  /**
   * Share handler — uses the native `navigator.share` API where
   * available (Android Chrome, iOS Safari, modern Edge), falling
   * back to clipboard copy otherwise. The shared payload links to
   * the episode's web URL when present, otherwise the audio URL.
   */
  const handleShare = async () => {
    const cur = player.current;
    if (!cur) return;
    const url = cur.episode.link || cur.episode.audioUrl;
    const shareData = {
      title: cur.episode.title,
      text: `${cur.episode.title} — ${cur.podcastTitle}`,
      url,
    };
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // User cancelled the share sheet — silent.
      return;
    }
    // Clipboard fallback. The "Link copied" badge below the share
    // button confirms the action so the user knows it worked even
    // without the OS share sheet.
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // No clipboard either (very old browser / insecure context) —
      // there's nothing else to fall back to silently.
    }
  };

  const Icon = player.isLoading ? Loader2 : player.isPlaying ? Pause : Play;

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
                one, otherwise the podcast's channel cover. */}
            <div className="px-6 pt-3 pb-4">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={episodeArtwork}
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

            {/* Speed controls */}
            <div className="flex items-center justify-center gap-1 px-6 mt-5">
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

            {/* Secondary feature row: sleep timer, auto-play next, share.
                These are deliberately less visually prominent than the
                transport controls — small chips on a single row instead
                of full buttons, mirroring Apple Podcasts and Pocket
                Casts' "more controls" tier. */}
            <div className="flex items-center justify-center gap-2 px-6 mt-4 mb-4 relative">
              <button
                type="button"
                onClick={() => setSleepOpen(o => !o)}
                aria-pressed={!!player.sleepTimer}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-semibold transition-colors ${
                  player.sleepTimer
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                style={{
                  background: player.sleepTimer ? 'var(--podcast-primary-soft, hsl(var(--primary)/0.15))' : 'transparent',
                }}
              >
                <Moon className="w-4 h-4" />
                <span>
                  {player.sleepTimer
                    ? player.sleepTimer.mode === 'episode-end'
                      ? (lang === 'ar' ? 'نهاية الحلقة' : 'Bis Ende')
                      : formatCountdown(player.sleepTimer.secondsRemaining, lang)
                    : (lang === 'ar' ? 'مؤقت النوم' : 'Sleep')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => player.setAutoPlayNext(!player.autoPlayNext)}
                aria-pressed={player.autoPlayNext}
                title={lang === 'ar' ? 'تشغيل التالي تلقائياً' : 'Nächste automatisch'}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-semibold transition-colors ${
                  player.autoPlayNext ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                style={{
                  background: player.autoPlayNext ? 'var(--podcast-primary-soft, hsl(var(--primary)/0.15))' : 'transparent',
                }}
              >
                <Repeat className="w-4 h-4" />
                <span>
                  {lang === 'ar' ? 'تلقائي' : 'Auto'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                aria-label={lang === 'ar' ? 'مشاركة' : 'Teilen'}
                className="flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>
                  {copiedLink
                    ? (lang === 'ar' ? 'تم النسخ' : 'Kopiert')
                    : (lang === 'ar' ? 'مشاركة' : 'Teilen')}
                </span>
              </button>

              {/* Sleep-timer popover. Anchored above the sleep button
                  so it floats over the transport controls instead of
                  pushing the layout down. AnimatePresence handles the
                  open/close transition. */}
              <AnimatePresence>
                {sleepOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 left-4 right-4 mx-auto max-w-xs rounded-2xl bg-card border border-border/50 shadow-xl p-2 z-10"
                  >
                    <p className="text-[11px] font-semibold text-muted-foreground px-2 pt-1 pb-2">
                      {lang === 'ar' ? 'إيقاف بعد' : 'Pause nach'}
                    </p>
                    <div className="grid grid-cols-1 gap-0.5">
                      {SLEEP_PRESETS.map(p => {
                        const isActive =
                          (p.value === 'episode-end' && player.sleepTimer?.mode === 'episode-end') ||
                          (typeof p.value === 'number' &&
                            player.sleepTimer?.mode === 'timed' &&
                            // Treat the user-clicked preset as active
                            // until they pick a different one. We can't
                            // compare exact seconds because the timer
                            // ticks down, so "remaining ≤ preset" is a
                            // good-enough proxy.
                            player.sleepTimer.secondsRemaining <= p.value);
                        return (
                          <button
                            key={String(p.value)}
                            type="button"
                            onClick={() => { player.setSleepTimer(p.value); setSleepOpen(false); }}
                            className={`w-full text-start px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                              isActive ? 'bg-muted/60 text-foreground' : 'hover:bg-muted/40 text-foreground/80'
                            }`}
                          >
                            {lang === 'ar' ? p.labelAr : p.labelDe}
                          </button>
                        );
                      })}
                      {player.sleepTimer && (
                        <button
                          type="button"
                          onClick={() => { player.setSleepTimer(null); setSleepOpen(false); }}
                          className="w-full text-start px-3 py-2 mt-1 rounded-xl text-[13px] font-semibold text-destructive hover:bg-destructive/10 transition-colors border-t border-border/40"
                        >
                          {lang === 'ar' ? 'إلغاء المؤقت' : 'Timer abbrechen'}
                        </button>
                      )}
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
