// Full-screen podcast player.
//
// Equivalent to Podium's `MediaPlayerBottomSheet.kt`: opens when the
// user taps the mini-player. Shows the full artwork, title/subtitle,
// a wide seekable progress bar, skip-back / play-pause / skip-forward
// transport, and a row of secondary controls (speed, sleep timer,
// auto-play, share, close).
//
// Visual design notes:
//   • The sheet is layered over an ambient backdrop that blurs the
//     active episode's cover art and tints it with the podcast's seed
//     color. Two slow-drifting gradient blobs add depth without
//     stealing focus from the controls.
//   • The artwork itself sits inside a card that breathes (scale +
//     pulsing rim glow) when audio is playing and visibly compresses
//     when paused — a familiar Apple Music / Spotify cue.
//   • Transport row uses a large gradient play button with a halo
//     that breathes in sync with playback; the skip buttons embed
//     their "15s" labels inside the rotation arrows so the meaning is
//     clear at a glance.
//   • Every animation respects `prefers-reduced-motion` (handled in
//     `index.css`).

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown, ChevronUp, FileText, Gauge, ListMusic, Loader2, Moon, Pause, Play, Repeat,
  RotateCcw, RotateCw, Share2, X,
} from '@/lib/icons';
import { AnimatePresence, motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { usePodcastPlayer, usePodcastPlayerProgress } from '@/features/podcasts/contexts/PodcastPlayerContext';
import { useApp } from '@/contexts/AppContext';
import QueueSheet from './QueueSheet';

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
    <div className="px-6 mt-6">
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
          // We add a soft 20% drop at the head of the filled portion so the
          // bar reads as a smooth ribbon rather than a hard pill.
          background: `linear-gradient(to right,
            var(--podcast-primary, hsl(var(--primary))) 0%,
            var(--podcast-primary, hsl(var(--primary))) ${pct}%,
            hsl(var(--muted-foreground) / 0.25) ${pct}%,
            hsl(var(--muted-foreground) / 0.25) 100%)`,
          height: 6,
          borderRadius: 999,
        }}
        aria-label={ariaLabel}
      />
      <div className="flex justify-between mt-2 text-[11px] tabular-nums text-muted-foreground font-medium">
        <span>{formatTime(position)}</span>
        <span>-{formatTime(Math.max(0, duration - position))}</span>
      </div>
    </div>
  );
}

/**
 * Three animated bars indicating active playback. Pure CSS animation
 * (see `.podcast-eq` in `index.css`) so it doesn't burn React renders.
 * The `data-playing` attribute switches between the live animation and
 * a static low-amplitude pose so the icon also makes sense when paused.
 */
function EqIndicator({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <span
      className={`podcast-eq ${className ?? ''}`}
      data-playing={playing ? 'true' : 'false'}
      aria-hidden="true"
    >
      <span /><span /><span />
    </span>
  );
}

export default function PlayerSheet({ open, onClose }: PlayerSheetProps) {
  const player = usePodcastPlayer();
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';

  // Sleep-timer popover open/close. Kept here (not inside the popover
  // component) so tapping elsewhere on the sheet collapses it.
  const [sleepOpen, setSleepOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  // Speed popover — replaces the previous always-on row of pills with
  // a compact chip + on-demand picker, freeing horizontal space for
  // the transport row to breathe.
  const [speedOpen, setSpeedOpen] = useState(false);
  // Show-notes panel. Hidden by default — long descriptions used to
  // crowd the hero, push the transport down, and steal touch focus
  // from the seek bar. Now they live behind a discreet "Show notes"
  // toggle that expands an animated panel on demand.
  const [descOpen, setDescOpen] = useState(false);
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
      setSpeedOpen(false);
      setDescOpen(false);
      setQueueOpen(false);
      setCopiedLink(false);
    }
  }, [open]);

  // Collapse the show-notes panel whenever the active episode changes
  // — the previously-expanded panel almost certainly held content for
  // a different episode, and a fresh track should land on the clean
  // hero view rather than carrying over the previous reader state.
  useEffect(() => {
    setDescOpen(false);
  }, [player.current?.episode.id]);

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
  const isActive = player.isPlaying && !player.isLoading;

  // Speed label, formatted without trailing zeros: 1, 1.25, 1.5, 1.75, 2.
  const speedLabel = `${player.speed.toFixed(2).replace(/\.?0+$/, '')}x`;

  return createPortal(
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[120] flex items-end justify-center"
          // Solid scrim — the sheet itself paints the ambient backdrop,
          // so out here we just want a clean black wash.
          style={{ background: 'rgba(0, 0, 0, 0.65)' }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="relative w-full max-w-md max-h-[100dvh] overflow-hidden rounded-t-3xl shadow-2xl flex flex-col text-foreground"
            style={{
              // Surface tone — the ambient backdrop layer on top of
              // this gives the sheet its tinted feel; the base color
              // is the app's card token so the bottom edge still
              // matches the theme cleanly.
              background: 'hsl(var(--card))',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* ── Ambient backdrop ───────────────────────────────────
                A heavily blurred copy of the cover art fills the back
                of the sheet, tinted by two slow-drifting gradient
                blobs in the podcast's seed color and finally hazed
                with a card-toned veil so the foreground controls keep
                their contrast. */}
            <div className="absolute inset-0 -z-0 overflow-hidden pointer-events-none" aria-hidden="true">
              <img
                src={episodeArtwork}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'blur(48px) saturate(1.4)', transform: 'scale(1.25)', opacity: 0.55 }}
              />
              {/* Drifting tint blobs — they pick up the seed color so
                  the backdrop reads as "this podcast" rather than a
                  generic out-of-focus image. */}
              <span
                className="podcast-blob podcast-blob-a"
                style={{
                  width: '60%', height: '60%',
                  top: '-10%', left: '-10%',
                  background: 'var(--podcast-primary, hsl(var(--primary)))',
                }}
              />
              <span
                className="podcast-blob podcast-blob-b"
                style={{
                  width: '55%', height: '55%',
                  bottom: '-15%', right: '-15%',
                  background: 'var(--podcast-primary, hsl(var(--primary)))',
                  opacity: 0.4,
                }}
              />
              {/* Top→bottom card veil — keeps text legible while
                  letting the tint bleed through near the edges. */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg,
                    hsl(var(--card) / 0.55) 0%,
                    hsl(var(--card) / 0.85) 55%,
                    hsl(var(--card) / 0.96) 100%)`,
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              />
            </div>

            {/* All foreground content sits in a flex column above the
                backdrop. `relative` lifts it onto the next stacking
                context. */}
            <div className="relative flex flex-col flex-1 min-h-0 overflow-y-auto">
              {/* Drag handle / header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-foreground/10 transition-colors"
                  aria-label={lang === 'ar' ? 'إغلاق' : 'Schließen'}
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <EqIndicator playing={isActive} />
                  <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    {lang === 'ar' ? 'يُشغَّل الآن' : 'Wird abgespielt'}
                  </span>
                </div>
                <button
                  onClick={() => { player.close(); onClose(); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-foreground/10 transition-colors"
                  aria-label={lang === 'ar' ? 'إغلاق المشغل' : 'Player schließen'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Artwork ───────────────────────────────────────────
                  Slightly compressed when paused (Apple Music vinyl
                  cue), full-size when playing. The breathing rim glow
                  is driven entirely by CSS so the React tree stays
                  quiet. */}
              <div className="px-8 pt-4 pb-4 flex justify-center">
                <motion.div
                  animate={{ scale: isActive ? 1 : 0.92 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                  className={`relative aspect-square w-full max-w-[300px] rounded-3xl overflow-hidden ${
                    isActive ? 'podcast-art-pulse' : ''
                  }`}
                  style={{
                    boxShadow: isActive
                      ? undefined  // handled by .podcast-art-pulse keyframes
                      : '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                  }}
                >
                  <img
                    src={episodeArtwork}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {/* Inner highlight — a 1px translucent border traces
                      the cover's rounded corners so the artwork looks
                      lit even on dark themes. */}
                  <span
                    className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{ boxShadow: 'inset 0 0 0 1px hsl(var(--foreground) / 0.08)' }}
                    aria-hidden="true"
                  />
                </motion.div>
              </div>

              {/* ── Title / subtitle ──────────────────────────────────
                  Stays compact (two lines max) so the hero never
                  pushes the transport off-screen on shorter viewports. */}
              <div className="px-6 text-center">
                <h2 className="text-lg font-bold leading-tight line-clamp-2">
                  {player.current.episode.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {player.current.podcastTitle}
                </p>
              </div>

              {/* ── Show-notes toggle + collapsible panel ─────────────
                  The episode description used to be permanently
                  visible right below the title, which crowded the
                  hero and made long show-notes (sponsor blocks,
                  transcripts) feel intrusive. It now lives behind a
                  small chip that expands a height-animated panel only
                  when the listener asks for it.

                  Uses framer-motion's `height: 'auto'` enter/exit so
                  the layout below (seek bar, transport, secondary row)
                  reflows smoothly instead of snapping. Tapping the
                  chip a second time collapses the panel; we also
                  reset `descOpen` whenever the sheet closes or the
                  active episode changes (see the effect above) so the
                  panel never carries stale state. */}
              {safeDescription && (
                <div className="px-6 mt-3">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setDescOpen(o => !o)}
                      aria-expanded={descOpen}
                      aria-controls="podcast-show-notes-panel"
                      className="flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>
                        {descOpen
                          ? (lang === 'ar' ? 'إخفاء الوصف' : 'Beschreibung ausblenden')
                          : (lang === 'ar' ? 'عرض الوصف'   : 'Beschreibung anzeigen')}
                      </span>
                      {descOpen
                        ? <ChevronUp   className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {descOpen && (
                      <motion.div
                        id="podcast-show-notes-panel"
                        key="show-notes"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        // `overflow-hidden` is required for the height
                        // animation to clip the inner content cleanly
                        // while it's collapsing.
                        className="overflow-hidden"
                      >
                        <div
                          className="mt-2 rounded-2xl border border-border/40 px-4 py-3 max-h-40 overflow-y-auto"
                          style={{
                            background: 'hsl(var(--card) / 0.55)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                          }}
                          // Touch scroll stays inside the panel — keeps
                          // the bottom-sheet's own gesture handler from
                          // fighting the show-notes scroll.
                          onTouchMove={e => e.stopPropagation()}
                        >
                          <div
                            className="text-[12px] text-foreground/80 leading-relaxed podcast-html"
                            dangerouslySetInnerHTML={{ __html: safeDescription }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── Progress slider ───────────────────────────────────
                  Owns its own subscription to the 4 Hz progress context
                  so position ticks don't reconcile the rest of the
                  sheet. */}
              <PlayerSheetSeek
                ariaLabel={lang === 'ar' ? 'الانتقال داخل الحلقة' : 'Position'}
                onSeek={player.seek}
              />

              {/* ── Transport row ─────────────────────────────────────
                  Skip-back, big gradient play button, skip-forward.
                  The skip arrows have their "15s" label embedded in
                  the center of the rotation icon — same affordance
                  Apple Podcasts / Pocket Casts use. */}
              <div className="flex items-center justify-center gap-6 px-6 mt-5">
                <button
                  onClick={() => player.skip(-SKIP)}
                  className="relative w-14 h-14 rounded-full hover:bg-foreground/10 flex items-center justify-center active:scale-95 transition-all"
                  aria-label={`-${SKIP}s`}
                >
                  <RotateCcw className="w-9 h-9" strokeWidth={1.5} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums pointer-events-none">
                    {SKIP}
                  </span>
                </button>

                <button
                  onClick={() => player.toggle()}
                  className="podcast-play-button w-20 h-20 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                  data-playing={isActive ? 'true' : 'false'}
                  style={{
                    // Two-stop gradient gives the button visual depth
                    // without needing an extra ring element. The fall-
                    // back hsl() values keep things readable when the
                    // seed-color tokens haven't been set (e.g. before
                    // the cover art has loaded).
                    background: `radial-gradient(circle at 30% 30%,
                      var(--podcast-primary, hsl(var(--primary))) 0%,
                      color-mix(in srgb, var(--podcast-primary, hsl(var(--primary))) 75%, #000 25%) 100%)`,
                    color: 'var(--podcast-primary-fg, hsl(var(--primary-foreground)))',
                  }}
                  aria-label={player.isPlaying ? 'Pause' : 'Play'}
                >
                  <Icon
                    className={`w-9 h-9 ${player.isLoading ? 'animate-spin' : ''}`}
                    fill={isActive ? 'currentColor' : 'none'}
                  />
                </button>

                <button
                  onClick={() => player.skip(SKIP)}
                  className="relative w-14 h-14 rounded-full hover:bg-foreground/10 flex items-center justify-center active:scale-95 transition-all"
                  aria-label={`+${SKIP}s`}
                >
                  <RotateCw className="w-9 h-9" strokeWidth={1.5} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums pointer-events-none">
                    {SKIP}
                  </span>
                </button>
              </div>

              {/* ── Secondary feature row ─────────────────────────────
                  Sleep timer, speed, auto-play, share. Less visually
                  prominent than the transport — small chips on a
                  single row instead of full buttons. */}
              <div className="flex items-center justify-center gap-1.5 px-4 mt-5 mb-5 relative flex-wrap">
                {/* Speed — opens a popover with the full preset list. */}
                <button
                  type="button"
                  onClick={() => { setSpeedOpen(o => !o); setSleepOpen(false); }}
                  aria-pressed={player.speed !== 1}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-semibold transition-colors ${
                    player.speed !== 1 ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={{
                    background: player.speed !== 1
                      ? 'var(--podcast-primary-soft, hsl(var(--primary)/0.15))'
                      : 'transparent',
                  }}
                >
                  <Gauge className="w-4 h-4" />
                  <span className="tabular-nums">{speedLabel}</span>
                </button>

                {/* Sleep timer */}
                <button
                  type="button"
                  onClick={() => { setSleepOpen(o => !o); setSpeedOpen(false); }}
                  aria-pressed={!!player.sleepTimer}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-semibold transition-colors ${
                    player.sleepTimer ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={{
                    background: player.sleepTimer
                      ? 'var(--podcast-primary-soft, hsl(var(--primary)/0.15))'
                      : 'transparent',
                  }}
                >
                  <Moon className="w-4 h-4" />
                  <span>
                    {player.sleepTimer
                      ? player.sleepTimer.mode === 'episode-end'
                        ? (lang === 'ar' ? 'نهاية الحلقة' : 'Bis Ende')
                        : formatCountdown(player.sleepTimer.secondsRemaining, lang)
                      : (lang === 'ar' ? 'مؤقت' : 'Sleep')}
                  </span>
                </button>

                {/* Auto-play next */}
                <button
                  type="button"
                  onClick={() => player.setAutoPlayNext(!player.autoPlayNext)}
                  aria-pressed={player.autoPlayNext}
                  title={lang === 'ar' ? 'تشغيل التالي تلقائياً' : 'Nächste automatisch'}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-semibold transition-colors ${
                    player.autoPlayNext ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={{
                    background: player.autoPlayNext
                      ? 'var(--podcast-primary-soft, hsl(var(--primary)/0.15))'
                      : 'transparent',
                  }}
                >
                  <Repeat className="w-4 h-4" />
                  <span>
                    {lang === 'ar' ? 'تلقائي' : 'Auto'}
                  </span>
                </button>

                {/* Queue / Up Next */}
                <button
                  type="button"
                  onClick={() => { setQueueOpen(true); setSleepOpen(false); setSpeedOpen(false); }}
                  aria-label={lang === 'ar' ? 'قائمة التشغيل' : 'Warteschlange'}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-semibold transition-colors ${
                    player.queueCount > 0 ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={{
                    background: player.queueCount > 0
                      ? 'var(--podcast-primary-soft, hsl(var(--primary)/0.15))'
                      : 'transparent',
                  }}
                >
                  <ListMusic className="w-4 h-4" />
                  <span>
                    {player.queueCount > 0
                      ? player.queueCount
                      : (lang === 'ar' ? 'التالي' : 'Nächste')}
                  </span>
                </button>

                {/* Share */}
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

                {/* ── Speed popover ─────────────────────────────────
                    Anchored above the chip row so it floats over the
                    transport without pushing the layout. */}
                <AnimatePresence>
                  {speedOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full mb-2 left-4 right-4 mx-auto max-w-xs rounded-2xl border border-border/50 shadow-xl p-2 z-10"
                      style={{
                        background: 'hsl(var(--card) / 0.96)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                      }}
                    >
                      <p className="text-[11px] font-semibold text-muted-foreground px-2 pt-1 pb-2">
                        {lang === 'ar' ? 'سرعة التشغيل' : 'Wiedergabegeschwindigkeit'}
                      </p>
                      <div className="grid grid-cols-3 gap-1">
                        {SPEEDS.map(s => {
                          const active = Math.abs(player.speed - s) < 0.001;
                          const label = `${s.toFixed(2).replace(/\.?0+$/, '')}x`;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => { player.setSpeed(s); setSpeedOpen(false); }}
                              className="px-2 py-2 rounded-xl text-[12.5px] font-semibold tabular-nums transition-colors"
                              style={{
                                background: active
                                  ? 'var(--podcast-primary, hsl(var(--primary)))'
                                  : 'transparent',
                                color: active
                                  ? 'var(--podcast-primary-fg, hsl(var(--primary-foreground)))'
                                  : 'hsl(var(--foreground) / 0.85)',
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

                {/* ── Sleep-timer popover ───────────────────────────── */}
                <AnimatePresence>
                  {sleepOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full mb-2 left-4 right-4 mx-auto max-w-xs rounded-2xl border border-border/50 shadow-xl p-2 z-10"
                      style={{
                        background: 'hsl(var(--card) / 0.96)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                      }}
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
                                isActive ? 'bg-foreground/10 text-foreground' : 'hover:bg-foreground/5 text-foreground/80'
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
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      <QueueSheet open={queueOpen} onClose={() => setQueueOpen(false)} />
    </>,
    document.body,
  );
}

