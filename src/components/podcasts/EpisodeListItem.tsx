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

import { memo, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { CheckCircle2, Loader2, Pause, Play, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PodcastEpisode } from '@/lib/podcasts/rss';
import { usePodcastPlayer, type PlayingEpisodeMeta } from '@/contexts/PodcastPlayerContext';
import { markEpisodePlayedWithNotify, usePlayState } from '@/lib/podcasts/store';
import { useApp } from '@/contexts/AppContext';

interface EpisodeListItemProps {
  episode: PodcastEpisode;
  /** Podcast metadata required to bind the episode to the player. */
  podcastTitle: string;
  podcastImageUrl: string;
  seedH: number | null;
  seedS: number | null;
  seedL: number | null;
  /**
   * Full ordered episode list of the parent podcast. Forwarded into
   * the player as the auto-play-next queue. Optional because the
   * mini-player and other surfaces that don't have a feed in scope
   * can play a single track without it; auto-play-next just won't
   * fire in that case.
   */
  episodes?: PodcastEpisode[];
}

function formatRelativeDate(ms: number, lang: 'ar' | 'de'): string {
  if (!ms) return '';
  const date = new Date(ms);
  const now = Date.now();
  const days = Math.floor((now - ms) / 86_400_000);
  if (days < 1)  return lang === 'ar' ? 'اليوم' : 'Heute';
  if (days < 2)  return lang === 'ar' ? 'أمس' : 'Gestern';
  if (days < 30) return lang === 'ar' ? `قبل ${days} يوم` : `vor ${days} Tagen`;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'de-DE', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(date);
}

function formatRemaining(durationSec: number, positionSec: number, lang: 'ar' | 'de'): string {
  const remaining = Math.max(0, Math.round(durationSec - positionSec));
  if (!remaining) return '';
  const m = Math.floor(remaining / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return lang === 'ar' ? `${h} س ${m % 60} د متبقية` : `noch ${h} h ${m % 60} min`;
  return lang === 'ar' ? `${m} د متبقية` : `noch ${m} min`;
}

function formatDuration(durationSec: number): string {
  if (!durationSec || durationSec < 0) return '';
  const m = Math.floor(durationSec / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

const EpisodeListItem = memo(function EpisodeListItem({
  episode, podcastTitle, podcastImageUrl, seedH, seedS, seedL, episodes,
}: EpisodeListItemProps) {
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';
  const player = usePodcastPlayer();
  const playState = usePlayState(episode.id, episode.duration);

  // Description sanitization — memoized on the description string so it
  // re-runs only when the actual content changes (cheap — DOMPurify is
  // ~5KB sync). Previously this used `useState(() => sanitize(...))`
  // which would freeze the result to whatever description was on the
  // FIRST render and ignore prop changes — a real bug when the same
  // memoized list-item slot got reused for a different episode.
  const safeDescription = useMemo(
    () => DOMPurify.sanitize(episode.description ?? '', {
      ALLOWED_TAGS: ['a', 'b', 'br', 'em', 'i', 'p', 'span', 'strong', 'u'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    }),
    [episode.description],
  );

  const isCurrent = player.current?.episode.id === episode.id;
  const isThisLoading = isCurrent && player.isLoading;
  const isThisPlaying = isCurrent && player.isPlaying;
  const duration = playState.duration || episode.duration || 0;
  const progressPct = duration > 0
    ? Math.min(100, Math.max(0, (playState.position / duration) * 100))
    : 0;

  const handlePlay = () => {
    if (isCurrent) {
      player.toggle();
      return;
    }
    const meta: PlayingEpisodeMeta = {
      episode,
      podcastTitle,
      podcastImageUrl,
      seedH, seedS, seedL,
      episodes,
    };
    void player.play(meta);
  };

  const handleMarkPlayed = () => {
    markEpisodePlayedWithNotify(
      episode.id,
      duration,
      !playState.played,
    );
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
        {!playState.played && playState.position === 0 && (
          <span
            className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-md"
            style={{
              background: 'var(--podcast-primary-soft, hsl(var(--primary) / 0.14))',
              color: 'var(--podcast-primary, hsl(var(--primary)))',
            }}
          >
            {lang === 'ar' ? 'جديد' : 'NEU'}
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
          className="relative flex items-center gap-2 ps-1.5 pe-3 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors active:scale-95"
          style={{
            background: 'var(--podcast-primary, hsl(var(--primary)))',
            color: 'var(--podcast-primary-fg, hsl(var(--primary-foreground)))',
          }}
        >
          {/* Progress ring overlay — uses an inline SVG circle so we
              don't need to ship a chart lib for ~80 bytes of geometry. */}
          {progressPct > 1 && progressPct < 99 && !isThisPlaying && !isThisLoading && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <rect x="0" y="0" width={progressPct} height="100" fill="rgba(255,255,255,0.18)" />
            </svg>
          )}
          <span className="relative w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
            <PlayIcon className={`w-4 h-4 ${isThisLoading ? 'animate-spin' : ''}`} fill={isThisPlaying ? 'currentColor' : 'none'} />
          </span>
          <span className="relative">
            {playState.played
              ? (lang === 'ar' ? 'تم الاستماع' : 'Gehört')
              : playState.position > 5
              ? formatRemaining(duration, playState.position, lang)
              : formatDuration(duration) || (lang === 'ar' ? 'تشغيل' : 'Abspielen')}
          </span>
        </button>

        <button
          onClick={handleMarkPlayed}
          aria-label={playState.played ? 'Mark unplayed' : 'Mark played'}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          {playState.played
            ? <RotateCcw className="w-4 h-4" />
            : <CheckCircle2 className="w-4 h-4" />}
        </button>
      </footer>
    </motion.article>
  );
});

export default EpisodeListItem;
