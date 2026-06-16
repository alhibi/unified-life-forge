// User's subscribed podcasts library.
//
// Pure localStorage-backed view (see `lib/podcasts/store.ts`). Tapping
// a tile opens the same `PodcastDetail` page the discovery grid uses,
// but encodes the feed URL into the route id so we don't need a round-
// trip through Apple's lookup API for already-subscribed podcasts.
//
// The page is composed of two stacked sections:
//   • "Continue Listening" — horizontally scrolling row of in-progress
//     episodes, sourced from the `recents` slice in the store. Tapping
//     a card resumes the episode in the global player; the row is
//     hidden when there's nothing in progress.
//   • "Subscriptions" — a 3-column grid of subscribed podcasts with
//     a sort menu (recent / alphabetical) and a long-press / context
//     menu for quick unsubscribe.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownAZ, Clock, LibraryBig, MoreHorizontal, Play, Trash2, X } from '@/lib/icons';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import {
  unsubscribeWithNotify,
  removeRecentEpisodeWithNotify,
  useRecentEpisodes,
  useSubscriptions,
  type RecentEpisodeRecord,
  type SubscribedPodcast,
} from '@/features/podcasts/lib/store';
import { encodeFeedUrl } from '@/features/podcasts/lib/route';
import { upgradeArtwork } from '@/features/podcasts/lib/itunes';
import { usePodcastPlayer, type PlayingEpisodeMeta } from '@/features/podcasts/contexts/PodcastPlayerContext';

const SORT_KEY = 'podcasts.library.sort';
type SortMode = 'recent' | 'alpha';

function loadSort(): SortMode {
  const raw = (typeof window !== 'undefined' ? localStorage.getItem(SORT_KEY) : null) as SortMode | null;
  return raw === 'alpha' || raw === 'recent' ? raw : 'recent';
}

/* -------------------------------------------------------------------------- */
/*  Continue Listening row                                                    */
/* -------------------------------------------------------------------------- */

function ContinueListeningRow({ items }: { items: RecentEpisodeRecord[] }) {
  const player = usePodcastPlayer();
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';

  if (items.length === 0) return null;

  // We render at most six tiles in the row; the rail caps internally
  // at eight, but six fits two screens on a phone without becoming a
  // scrollable carousel of forgotten episodes.
  const VISIBLE = 6;
  const tiles = items.slice(0, VISIBLE);

  const playEpisode = (rec: RecentEpisodeRecord) => {
    const meta: PlayingEpisodeMeta = {
      episode: rec.episode,
      podcastTitle: rec.podcastTitle,
      podcastImageUrl: rec.podcastImageUrl,
      seedH: rec.seedH, seedS: rec.seedS, seedL: rec.seedL,
    };
    void player.play(meta);
  };

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">
          {lang === 'ar' ? 'تابع الاستماع' : 'Weiterhören'}
        </h2>
        <span className="text-[11px] text-muted-foreground">{items.length}</span>
      </div>
      <div
        className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {tiles.map(rec => {
          const cover = rec.episode.imageUrl || rec.podcastImageUrl;
          return (
            <div
              key={rec.episode.id}
              className="relative shrink-0 w-44"
            >
              <button
                type="button"
                onClick={() => playEpisode(rec)}
                className="w-full text-start rounded-2xl overflow-hidden bg-card/70 border border-border/40 active:scale-[0.98] transition-transform"
              >
                <div className="relative aspect-square bg-muted/40">
                  {cover && (
                    <img src={upgradeArtwork(cover, 200)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  )}
                  {/* Play overlay — visual affordance that this is a
                      playable card, not a navigation tile. */}
                  <span
                    className="absolute bottom-2 end-2 w-9 h-9 rounded-full flex items-center justify-center "
                    style={{
                      background: 'var(--podcast-primary, hsl(var(--primary)))',
                      color: 'var(--podcast-primary-fg, hsl(var(--primary-foreground)))',
                    }}
                  >
                    <Play className="w-4 h-4" fill="currentColor" />
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-[12px] font-bold leading-tight line-clamp-2 text-foreground">
                    {rec.episode.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {rec.podcastTitle}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => removeRecentEpisodeWithNotify(rec.episode.id)}
                aria-label={lang === 'ar' ? 'إزالة' : 'Entfernen'}
                className="absolute top-1.5 end-1.5 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm opacity-90 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subscription tile                                                         */
/* -------------------------------------------------------------------------- */

function SubscriptionTile({
  podcast,
  onOpen,
  onUnsubscribe,
}: {
  podcast: SubscribedPodcast;
  onOpen: () => void;
  onUnsubscribe: () => void;
}) {
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onOpen}
        className="flex flex-col gap-1.5 text-start active:scale-[0.97] transition-transform w-full"
      >
        <div className="aspect-square w-full rounded-2xl overflow-hidden bg-muted/40 border border-border/40">
          {podcast.imageUrl
            ? <img src={upgradeArtwork(podcast.imageUrl, 200)} alt="" loading="lazy" className="w-full h-full object-cover" />
            : null}
        </div>
        <p className="text-[12.5px] font-bold text-foreground leading-tight line-clamp-2">{podcast.title}</p>
        <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">{podcast.author}</p>
      </button>

      {/* Per-tile menu trigger. Floats over the artwork; tapping pops a
          small action sheet with "Unsubscribe". Kept as a separate
          button (not a long-press) because long-press is an unreliable
          gesture on the web — touch-and-hold collides with native
          context menus on mobile and is invisible to mouse users. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
        aria-label={lang === 'ar' ? 'خيارات' : 'Optionen'}
        className="absolute top-1.5 end-1.5 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm opacity-90 hover:opacity-100"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
              className="bg-card w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-3"
            >
              <div className="px-2 py-3 flex items-center gap-3 border-b border-border/40 mb-2">
                {podcast.imageUrl && (
                  <img src={upgradeArtwork(podcast.imageUrl, 200)} alt="" className="w-10 h-10 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold truncate">{podcast.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{podcast.author}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { onUnsubscribe(); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-destructive hover:bg-destructive/10 active:scale-95 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-[13px] font-semibold">
                  {lang === 'ar' ? 'إلغاء الاشتراك' : 'Abonnement entfernen'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-full mt-1 px-3 py-3 rounded-2xl text-foreground hover:bg-muted/60 text-[13px] font-medium"
              >
                {lang === 'ar' ? 'إلغاء' : 'Abbrechen'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function PodcastLibrary() {
  const navigate = useNavigate();
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';
  const subs = useSubscriptions();
  const recents = useRecentEpisodes();

  const [sortMode, setSortMode] = useState<SortMode>(() => loadSort());
  const setSortAndPersist = (m: SortMode) => {
    setSortMode(m);
    try { localStorage.setItem(SORT_KEY, m); } catch { /* ignore */ }
  };

  const sortedSubs = useMemo(() => {
    const list = [...subs];
    if (sortMode === 'alpha') {
      list.sort((a, b) => a.title.localeCompare(b.title, lang === 'ar' ? 'ar' : 'de'));
    } else {
      list.sort((a, b) => b.subscribedAt - a.subscribedAt);
    }
    return list;
  }, [subs, sortMode, lang]);

  return (
    <div className="min-h-screen bg-background pb-32">
      <SEO
        title={lang === 'ar' ? 'مكتبة البودكاست' : 'Podcast-Bibliothek'}
        description={lang === 'ar'
          ? 'البودكاست التي اشتركت بها — جاهزة للاستماع.'
          : 'Deine abonnierten Podcasts — bereit zum Anhören.'}
        path="/podcasts/library"
      />

      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-3 flex items-center gap-2">
          <BackButton />
          <h1 className="flex-1 text-base font-bold text-foreground">
            {lang === 'ar' ? 'مكتبتي' : 'Meine Bibliothek'}
          </h1>
          <span className="text-[11px] text-muted-foreground">{subs.length}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5">
        {/* Continue Listening rail — only renders when there's something to resume. */}
        <ContinueListeningRow items={recents} />

        {subs.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-10 px-6">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
              <LibraryBig className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {lang === 'ar' ? 'لا اشتراكات بعد' : 'Noch keine Abonnements'}
            </p>
            <p className="text-[12px] text-muted-foreground mb-5 max-w-xs">
              {lang === 'ar'
                ? 'اكتشف البودكاست واشترك بها لتظهر هنا.'
                : 'Entdecke Podcasts und abonniere sie, um sie hier zu sehen.'}
            </p>
            <button
              onClick={() => navigate('/podcasts')}
              className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold active:scale-95"
            >
              {lang === 'ar' ? 'استكشاف البودكاست' : 'Podcasts entdecken'}
            </button>
          </div>
        ) : (
          <>
            {/* Sort segmented control. We use a two-button toggle
                (recent vs. alphabetical) instead of a dropdown — the
                set is small and a toggle is one tap instead of two. */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">
                {lang === 'ar' ? 'اشتراكاتي' : 'Abonnements'}
              </h2>
              <div className="inline-flex items-center bg-muted/40 rounded-full p-0.5 border border-border/40">
                <button
                  type="button"
                  onClick={() => setSortAndPersist('recent')}
                  aria-pressed={sortMode === 'recent'}
                  className={`px-2.5 h-7 rounded-full text-[11.5px] font-semibold inline-flex items-center gap-1 transition-colors ${
                    sortMode === 'recent' ? 'bg-card  text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {lang === 'ar' ? 'الأحدث' : 'Neueste'}
                </button>
                <button
                  type="button"
                  onClick={() => setSortAndPersist('alpha')}
                  aria-pressed={sortMode === 'alpha'}
                  className={`px-2.5 h-7 rounded-full text-[11.5px] font-semibold inline-flex items-center gap-1 transition-colors ${
                    sortMode === 'alpha' ? 'bg-card  text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <ArrowDownAZ className="w-3 h-3" />
                  {lang === 'ar' ? 'أبجدي' : 'A–Z'}
                </button>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-3 gap-x-3 gap-y-5"
            >
              {sortedSubs.map(p => (
                <SubscriptionTile
                  key={p.origin}
                  podcast={p}
                  onOpen={() => navigate(`/podcasts/${encodeFeedUrl(p.origin)}`)}
                  onUnsubscribe={() => unsubscribeWithNotify(p.origin)}
                />
              ))}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
