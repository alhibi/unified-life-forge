// Single-episode row used inside `PodcastDetail`.
//
// Modeled on Podium's `PodcastEpisodeListItem.kt`:
//   • overline: pub date (and "NEW" badge for unread episodes)
//   • title (bold)
//   • description (3 lines, HTML-rendered then sanitized)
//   • cover artwork (right side, square)
//   • play button with progress ring + duration label
//   • mark-as-played toggle
//
// We render description HTML through DOMPurify (already a dependency
// of this project) so feeds with markup like <a>, <em>, <p> show
// correctly without opening an XSS hole.

import DOMPurify from 'dompurify';
import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';

import { useApp } from '@/contexts/AppContext';
import {
  type PlayingEpisodeMeta,
  usePodcastPlayer,
} from '@/features/podcasts/contexts/PodcastPlayerContext';
import type { PodcastEpisode } from '@/features/podcasts/lib/rss';
import {
  markEpisodePlayedWithNotify,
  removeRecentEpisodeWithNotify,
  usePlayState,
} from '@/features/podcasts/lib/store';
import { CheckCircle2, ListPlus, Loader2, Pause, Play, RotateCcw } from '@/lib/icons';

interface EpisodeListItemProps {
  episode: PodcastEpisode;
  /** Podcast metadata required to bind the episode to the player. */
  podcastTitle: string;
  podcastImageUrl: string;
  seedH: number | null;
  seedS: number | null;
  seedL: number | null;
  /** Full list of episodes in the current display order. Used to
   *  build an auto-play queue (the episodes that come AFTER this one
   *  in the same order) when the user taps play. Pass it from the
   *  parent so the queue reflects whatever sort/filter the user
   *  picked. */
  allEpisodes?: PodcastEpisode[];
}

function formatRelativeDate(ms: number, lang: 'ar'): string {
  if (!ms) return '';
  const date = new Date(ms);
  const now = Date.now();
  const days = Math.floor((now - ms) / 86_400_000);
  if (days < 1) return 'اليوم';
  if (days < 2) return 'أمس';
  if (days < 30) return `قبل ${days} يوم`;
  return new Intl.DateTimeFormat('ar', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * "Recent" window for the NEW badge. Match Podium/Spotify/Apple
 * Podcasts: an episode is "new" only if published in the last 14
 * days. The previous logic (`!played && position === 0`) painted
 * every untouched archive episode as new — a 5-year-old back
 * catalog would light up the entire list.
 */
const NEW_BADGE_WINDOW_MS = 14 * 86_400_000;

function formatRemaining(durationSec: number, positionSec: number, lang: 'ar'): string {
  const remaining = Math.max(0, Math.round(durationSec - positionSec));
  if (!remaining) return '';
  const m = Math.floor(remaining / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h} س ${m % 60} د متبقية`;
  return `${m} د متبقية`;
}

function formatDuration(durationSec: number): string {
  if (!durationSec || durationSec < 0) return '';
  const m = Math.floor(durationSec / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

const EpisodeListItem = memo(function EpisodeListItem({
  episode,
  podcastTitle,
  podcastImageUrl,
  seedH,
  seedS,
  seedL,
  allEpisodes,
}: EpisodeListItemProps) {
  const { } = useApp();
  const lang = 'ar';
  const player = usePodcastPlayer();
  const playState = usePlayState(episode.id, episode.duration);

  // Description sanitization — memoized on the description string so it
  // re-runs only when the actual content changes (cheap — DOMPurify is
  // ~5KB sync). Previously this used `useState(() => sanitize(...))`
  // which would freeze the result to whatever description was on the
  // FIRST render and ignore prop changes — a real bug when the same
  // memoized list-item slot got reused for a different episode.
  const safeDescription = useMemo(
    () =>
      DOMPurify.sanitize(episode.description ?? '', {
        ALLOWED_TAGS: ['a', 'b', 'br', 'em', 'i', 'p', 'span', 'strong', 'u'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      }),
    [episode.description],
  );

  const isCurrent = player.current?.episode.id === episode.id;
  const isThisLoading = isCurrent && player.isLoading;
  const isThisPlaying = isCurrent && player.isPlaying;
  const duration = playState.duration || episode.duration || 0;
  const progressPct =
    duration > 0 ? Math.min(100, Math.max(0, (playState.position / duration) * 100)) : 0;

  // "In progress" means the listener has played past the first few
  // seconds but hasn't finished. We use this to show a progress strip
  // along the bottom of the row + the "X min remaining" label inside
  // the play button.
  const isInProgress = !playState.played && playState.position > 5 && progressPct < 99;

  // The NEW badge should only fire for genuinely recent episodes that
  // haven't been touched — combining the pubDate window with the play
  // state. Episodes from years ago should never show "NEU" / "جديد"
  // even if they're in the user's "haven't played yet" pile.
  const isFreshUnplayed =
    !playState.played &&
    playState.position === 0 &&
    episode.pubDate > 0 &&
    Date.now() - episode.pubDate < NEW_BADGE_WINDOW_MS;

  const handlePlay = () => {
    if (isCurrent) {
      player.toggle();
      return;
    }
    const meta: PlayingEpisodeMeta = {
      episode,
      podcastTitle,
      podcastImageUrl,
      seedH,
      seedS,
      seedL,
    };
    // Build the auto-play queue: every episode AFTER this one in the
    // currently-displayed list order. Skipped when `allEpisodes`
    // wasn't provided — the player simply won't auto-advance.
    let queue: PlayingEpisodeMeta[] | undefined;
    if (allEpisodes && allEpisodes.length > 1) {
      const idx = allEpisodes.findIndex((e) => e.id === episode.id);
      if (idx >= 0 && idx < allEpisodes.length - 1) {
        queue = allEpisodes.slice(idx + 1).map((ep) => ({
          episode: ep,
          podcastTitle,
          podcastImageUrl,
          seedH,
          seedS,
          seedL,
        }));
      }
    }
    void player.play(meta, queue);
  };

  const handleMarkPlayed = () => {
    const willBePlayed = !playState.played;
    markEpisodePlayedWithNotify(episode.id, duration, willBePlayed);
    // When the user marks an episode played, also evict it from the
    // Continue Listening rail. When they UN-mark a played episode we
    // leave the rail alone — un-marking is a "I want to listen again"
    // signal and the natural place for that is the podcast detail
    // page, not the rail.
    if (willBePlayed) removeRecentEpisodeWithNotify(episode.id);
  };

  // PlayIcon picks based on three states (loading, playing, idle).
  const PlayIcon = isThisLoading ? Loader2 : isThisPlaying ? Pause : Play;

  return (
    <motion.article
      layout
      // `aria-current="true"` lets screen readers announce the row that
      // matches the audio bound to the global player. Combined with the
      // tinted border this gives both visual and assistive-tech cues
      // about which episode is the active one.
      aria-current={isCurrent ? 'true' : undefined}
      className="rounded-3xl border border-border/40 bg-card/70 backdrop-blur-sm p-4"
      style={{
        // Tint the active row's border with the seed color so the
        // currently-playing episode visually pops.
        borderColor: isCurrent ? 'var(--podcast-primary)' : undefined,
      }}
    >
      <header className="flex items-center gap-2 mb-2">
        {isFreshUnplayed && (
          <span
            className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-md"
            style={{
              background: 'var(--podcast-primary-soft, hsl(var(--primary) / 0.14))',
              color: 'var(--podcast-primary, hsl(var(--primary)))',
            }}
          >
            {'جديد'}
          </span>
        )}
        {playState.played && (
          <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {'تم'}
          </span>
        )}
        <p className="text-[11px] text-muted-foreground">
          {formatRelativeDate(episode.pubDate, lang)}
        </p>
      </header>

      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-foreground leading-snug line-clamp-2">
            {episode.title}
          </h3>
          {safeDescription && (
            <div
              className="text-[12px] text-muted-foreground leading-relaxed mt-1 line-clamp-3 podcast-html"
              dangerouslySetInnerHTML={{ __html: safeDescription }}
            />
          )}
        </div>
        {episode.imageUrl && (
          <img
            src={episode.imageUrl}
            alt=""
            loading="lazy"
            className="w-14 h-14 rounded-2xl object-cover bg-muted/40 shrink-0"
          />
        )}
      </div>

      <footer className="flex items-center gap-2 mt-3">
        <button
          onClick={handlePlay}
          disabled={!episode.audioUrl}
          aria-label={isThisPlaying ? 'Pause' : 'Play'}
          className="relative flex items-center gap-2 ps-1.5 pe-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors active:scale-95 overflow-hidden"
          style={{
            background: 'var(--podcast-primary, hsl(var(--primary)))',
            color: 'var(--podcast-primary-fg, hsl(var(--primary-foreground)))',
          }}
        >
          <span className="relative w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
            <PlayIcon
              className={`w-4 h-4 ${isThisLoading ? 'animate-spin' : ''}`}
              fill={isThisPlaying ? 'currentColor' : 'none'}
            />
          </span>
          <span className="relative">
            {playState.played
              ? 'تم الاستماع'
              : isInProgress
                ? formatRemaining(duration, playState.position, lang)
                : formatDuration(duration) || ('تشغيل')}
          </span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            player.addEpisodeToQueue(episode, podcastTitle, podcastImageUrl, seedH, seedS, seedL);
            // Brief success flash handled by CSS animation
            const el = e.currentTarget;
            el.classList.add('scale-110');
            setTimeout(() => el.classList.remove('scale-110'), 200);
          }}
          aria-label={'أضف إلى قائمة التشغيل'}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <ListPlus className="w-4 h-4" />
        </button>

        <button
          onClick={handleMarkPlayed}
          aria-label={playState.played ? 'Mark unplayed' : 'Mark played'}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          {playState.played ? (
            <RotateCcw className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </button>
      </footer>

      {/* Bottom progress strip for in-progress episodes. Visible only
          when the listener has actually started the episode but hasn't
          finished — gives the row a glanceable continuation cue
          without depending on the live player tick (we read from the
          persisted play state, which is updated 1 Hz during playback). */}
      {isInProgress && (
        <div className="mt-3 -mx-1 h-1 rounded-full bg-muted/40 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${progressPct}%`,
              background: 'var(--podcast-primary, hsl(var(--primary)))',
            }}
          />
        </div>
      )}
    </motion.article>
  );
});

export default EpisodeListItem;
