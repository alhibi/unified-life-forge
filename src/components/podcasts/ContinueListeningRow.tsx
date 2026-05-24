// "Continue Listening" rail.
//
// Horizontal scroll of recently-played episodes. Each card shows the
// podcast cover, the episode title, and a slim progress bar that
// reflects how far the user has listened. Tapping a card resumes
// playback at the saved position via the global player context.
//
// We render a row, not a grid, because it's a short list (capped at 30
// in the store, displayed at most ~10 here) and discovery / library
// pages have a vertical grid below — a horizontal rail visually
// separates "what you were doing" from "what's new".
//
// Source of truth is `useRecents()` from the podcast store, which is
// updated by the player on track binding and on every 1 Hz play-state
// tick. No network here, no fetch — purely derived from localStorage.

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Pause, Play } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import {
  useRecents,
  removeRecentWithNotify,
  type RecentEpisode,
} from '@/lib/podcasts/store';
import {
  usePodcastPlayer,
  type PlayingEpisodeMeta,
} from '@/contexts/PodcastPlayerContext';

interface ContinueListeningRowProps {
  /** Hard cap on how many tiles we render. The store keeps more than
   *  this for history purposes; the UI only ever shows the top N. */
  limit?: number;
}

const ContinueListeningRow = memo(function ContinueListeningRow({
  limit = 10,
}: ContinueListeningRowProps) {
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';
  const recents = useRecents();
  const player = usePodcastPlayer();

  // Hide the rail entirely when there's nothing to resume — we don't
  // want a stub heading with an empty space below.
  if (recents.length === 0) return null;
  const items = recents.slice(0, limit);

  const handleResume = (r: RecentEpisode) => {
    // If the player already has this episode bound, just toggle —
    // the user's intent is "go back to where I was" and that already
    // happened on a previous tap.
    if (player.current?.episode.id === r.episode.id) {
      player.toggle();
      return;
    }
    const meta: PlayingEpisodeMeta = {
      episode: r.episode,
      podcastTitle: r.podcastTitle,
      podcastImageUrl: r.podcastImageUrl,
      seedH: r.seedH,
      seedS: r.seedS,
      seedL: r.seedL,
      // No `episodes` queue here — the recents store doesn't keep one,
      // so auto-play-next is suppressed for tracks resumed from this
      // rail until the user navigates back to the source podcast.
    };
    void player.play(meta);
  };

  return (
    <section className="mb-5">
      <header className="flex items-center justify-between px-4 mb-2">
        <h2 className="text-[13px] font-bold text-foreground">
          {lang === 'ar' ? 'متابعة الاستماع' : 'Weiterhören'}
        </h2>
      </header>
      <div
        className="overflow-x-auto scrollbar-none pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="flex gap-3 px-4 min-w-max">
          {items.map(r => {
            const isCurrent = player.current?.episode.id === r.episode.id;
            const isThisPlaying = isCurrent && player.isPlaying;
            const isThisLoading = isCurrent && player.isLoading;
            const StateIcon = isThisLoading ? Loader2 : isThisPlaying ? Pause : Play;
            const pct = r.duration > 0
              ? Math.min(100, Math.max(0, (r.position / r.duration) * 100))
              : 0;
            const remainingMin = Math.max(
              0,
              Math.round((r.duration - r.position) / 60),
            );
            // Episode-specific artwork falls back to the podcast cover
            // for the same reason it does inside the player itself.
            const artwork = r.episode.imageUrl || r.podcastImageUrl;
            // Inline tint with the per-episode seed color so the
            // progress bar visually carries the podcast's branding
            // even outside the detail page.
            const tint = r.seedH != null && r.seedS != null && r.seedL != null
              ? `hsl(${r.seedH} ${r.seedS}% ${r.seedL}%)`
              : 'hsl(var(--primary))';

            return (
              <motion.article
                key={r.episode.id}
                layout
                className="relative w-44 shrink-0 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => handleResume(r)}
                  className="block w-full text-start active:scale-[0.98] transition-transform"
                >
                  <div className="relative aspect-square overflow-hidden bg-muted/40">
                    {artwork && (
                      <img
                        src={artwork}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    )}
                    {/* Floating play/pause badge in the corner so the
                        user can see the state of THIS card at a glance
                        without having to map back to the global mini-
                        player at the bottom of the screen. */}
                    <span
                      className="absolute bottom-2 end-2 w-9 h-9 rounded-full flex items-center justify-center shadow-md"
                      style={{ background: tint, color: '#fff' }}
                      aria-hidden
                    >
                      <StateIcon
                        className={`w-4 h-4 ${isThisLoading ? 'animate-spin' : ''}`}
                        fill={isThisPlaying ? 'currentColor' : 'none'}
                      />
                    </span>
                  </div>
                  <div className="px-3 pt-2">
                    <p className="text-[12px] font-bold text-foreground leading-tight line-clamp-2 min-h-[2.4em]">
                      {r.episode.title}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground mt-1 line-clamp-1">
                      {r.podcastTitle}
                    </p>
                  </div>
                  <div className="px-3 pt-2 pb-3">
                    <div className="h-1 rounded-full bg-foreground/10 overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, background: tint }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                      {remainingMin > 0
                        ? (lang === 'ar' ? `${remainingMin} د متبقية` : `noch ${remainingMin} min`)
                        : (lang === 'ar' ? 'استئناف' : 'Fortsetzen')}
                    </p>
                  </div>
                </button>
                {/* Dismiss button — small, in the top corner, only
                    affects the "Continue Listening" rail (not the
                    play-state record itself, so the resume position
                    is preserved if the user taps the episode in its
                    podcast detail page later). */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentWithNotify(r.episode.id);
                  }}
                  className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-black/45 text-white text-[12px] flex items-center justify-center"
                  aria-label={lang === 'ar' ? 'إخفاء' : 'Verbergen'}
                >
                  ×
                </button>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
});

export default ContinueListeningRow;
