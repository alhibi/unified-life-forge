// Podcast detail page — Podium's `PodcastPreviewView` ported to web.
//
// Route: `/podcasts/:id` where `:id` is either an Apple Podcasts
// `collectionId` (came from the discovery grid) OR a base64-encoded
// RSS feed URL (came from the library — it doesn't need a round-trip
// through Apple). Both paths converge on the same `feedUrl` and the
// same RSS fetch.
//
// Visual structure (top to bottom):
//   1. Sticky top bar — back button, subscribe button, more menu
//   2. Backdrop: full-bleed blurred cover image with a vertical fade
//      into the page background, plus the foreground square cover with
//      shadow on top of it
//   3. Title (large, auto-shrinks if very long), author
//   4. Description in a card (HTML-sanitized)
//   5. Source link / RSS URL / language code metadata rows
//   6. Episode list (one `EpisodeListItem` per episode)
//
// All of the above lives inside `<DynamicPodcastTheme>` so its
// children can pull `var(--podcast-primary)` for tinting.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { motion } from 'framer-motion';
import {
  ArrowDownNarrowWide, ArrowUpNarrowWide, Check, ChevronDown, ChevronUp,
  ExternalLink, Globe, Loader2, Plus, Rss, Search, Share2, X,
} from 'lucide-react';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import { lookupPodcast, type PodcastPreview } from '@/lib/podcasts/itunes';
import { fetchPodcastFeed } from '@/lib/podcasts/rss';
import { extractSeedColor } from '@/lib/podcasts/colorExtract';
import {
  isSubscribed as isSubscribedSync,
  subscribeWithNotify,
  unsubscribeWithNotify,
  useIsSubscribed,
} from '@/lib/podcasts/store';
import { decodeRouteId } from '@/lib/podcasts/route';
import DynamicPodcastTheme from '@/components/podcasts/DynamicPodcastTheme';
import EpisodeListItem from '@/components/podcasts/EpisodeListItem';

/** Decode is shared with the Library page via `lib/podcasts/route.ts`
 *  so the two ends of the round-trip stay in sync. */

/** Shape of the `state` object the discovery page passes via
 *  `<Link state={...}>` when it already knows the RSS feed URL.
 *  Lets us skip the iTunes lookup round-trip and go straight to
 *  the publisher's RSS — significant for podcasts whose Apple
 *  metadata is incomplete or unavailable in the user's region. */
interface RouteHint {
  feedUrl?: string;
  title?: string;
  author?: string;
  artworkUrl?: string;
  link?: string;
}

export default function PodcastDetail() {
  const { id: routeId = '' } = useParams<{ id: string }>();
  const decoded = useMemo(() => decodeRouteId(routeId), [routeId]);
  const location = useLocation();
  const hint = (location.state ?? null) as RouteHint | null;
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';

  // Step 1 — get podcast metadata.
  // Three branches in order of preference:
  //   • Route hint with feedUrl  → use that, no network round-trip.
  //   • Feed-url route token     → decoded URL becomes the feedUrl.
  //   • Apple-id route           → iTunes `lookup` for feedUrl.
  // The first two are zero-network and bulletproof; only the third
  // can fail (lookup occasionally returns no result).
  const meta = useQuery({
    queryKey: ['podcast-meta', decoded, hint?.feedUrl ?? null],
    queryFn: ({ signal }) => {
      if (hint?.feedUrl) {
        return Promise.resolve<PodcastPreview & { feedUrl: string }>({
          id: routeId,
          title: hint.title ?? '',
          author: hint.author ?? '',
          artworkUrl: hint.artworkUrl ?? '',
          link: hint.link,
          feedUrl: hint.feedUrl,
        });
      }
      if (decoded.kind === 'apple-id') return lookupPodcast({ id: decoded.id, signal });
      // For feed-url routes we synthesize a placeholder; the real
      // metadata comes from the RSS feed below.
      return Promise.resolve<PodcastPreview & { feedUrl: string }>({
        id: routeId,
        title: '',
        author: '',
        artworkUrl: '',
        feedUrl: decoded.url,
      });
    },
    staleTime: 60 * 60 * 1000,
  });

  // Step 2 — fetch the RSS feed.
  const feedUrl = meta.data?.feedUrl;
  const feed = useQuery({
    queryKey: ['podcast-feed', feedUrl],
    queryFn: ({ signal }) => fetchPodcastFeed({ feedUrl: feedUrl!, signal }),
    enabled: !!feedUrl,
    staleTime: 10 * 60 * 1000,
  });

  // Step 3 — extract seed color from the cover. We try the Apple-side
  // image first (loads fastest, already cached for top-charts viewers)
  // and fall back to whatever the RSS channel provided.
  const imageForExtraction = meta.data?.artworkUrl || feed.data?.imageUrl || '';
  const [seed, setSeed] = useState<{ h: number; s: number; l: number } | null>(null);
  const extractedFor = useRef<string>('');
  useEffect(() => {
    if (!imageForExtraction || extractedFor.current === imageForExtraction) return;
    extractedFor.current = imageForExtraction;
    setSeed(null);
    let cancelled = false;
    void extractSeedColor(imageForExtraction).then(c => {
      if (!cancelled && c) setSeed({ h: c.h, s: c.s, l: c.l });
    });
    return () => { cancelled = true; };
  }, [imageForExtraction]);

  // Step 4 — subscription state. The store's hook keeps this in sync
  // with localStorage / other tabs.
  const subscribed = useIsSubscribed(feedUrl);

  // Briefly flash a "Link copied" badge when the share fallback runs.
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSubscribeToggle = () => {
    if (!feed.data || !meta.data) return;
    if (isSubscribedSync(feed.data.origin)) {
      unsubscribeWithNotify(feed.data.origin);
    } else {
      subscribeWithNotify({
        origin: feed.data.origin,
        title: feed.data.title || meta.data.title,
        author: feed.data.author || meta.data.author,
        imageUrl: feed.data.imageUrl || meta.data.artworkUrl,
        link: feed.data.link || meta.data.link || '',
        seedH: seed?.h ?? 200,
        seedS: seed?.s ?? 50,
        seedL: seed?.l ?? 50,
      });
    }
  };

  /**
   * Share the podcast itself (channel-level URL). Mirrors the share
   * helper in `PlayerSheet`, but with the channel's web link as the
   * payload instead of an episode link. Falls back to clipboard
   * when `navigator.share` isn't available.
   */
  const handleShare = async () => {
    const title = feed.data?.title || meta.data?.title || '';
    const url = feed.data?.link || meta.data?.link || feedUrl || '';
    if (!url) return;
    const shareData = { title, text: title, url };
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData);
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch { /* ignore */ }
  };

  const isLoading = meta.isLoading || (!!feedUrl && feed.isLoading);
  const error = meta.error ?? feed.error;

  /* --------------------------- derived display data ------------------------- */

  const displayTitle = feed.data?.title || meta.data?.title || '';
  const displayAuthor = feed.data?.author || meta.data?.author || '';
  const displayImage = feed.data?.imageUrl || meta.data?.artworkUrl || '';
  const displayLink = feed.data?.link || meta.data?.link || '';

  const safeDescription = useMemo(() => {
    const html = feed.data?.description ?? '';
    return DOMPurify.sanitize(html.replace(/\n/g, '<br>'), {
      ALLOWED_TAGS: ['a', 'b', 'br', 'em', 'i', 'p', 'span', 'strong', 'u'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  }, [feed.data?.description]);

  // Show-more / show-less for the description card. We collapse to a
  // line-clamped preview when the raw text is "long enough that it
  // would crowd the page" (≈ four lines on a phone) and let the user
  // expand on tap. The threshold is on character count rather than DOM
  // height so we don't have to measure the rendered height — character
  // count is reliable enough for a binary collapse decision.
  const COLLAPSE_THRESHOLD_CHARS = 280;
  const isLongDescription = (feed.data?.description?.length ?? 0) > COLLAPSE_THRESHOLD_CHARS;
  const [descExpanded, setDescExpanded] = useState(false);

  /* ---------------- episode list state: search / sort / pagination ----------- */

  // Filter, sort and paginate the episode list. With long-running
  // shows (e.g. weekly podcasts running for years → 500+ episodes)
  // rendering everything at once turns the detail page into a 1.5 s
  // mount + several seconds of scroll-jank. Capping at PAGE_SIZE
  // and exposing a "Load more" button keeps the initial mount under
  // 100 ms even on the longest feeds.
  const PAGE_SIZE = 30;
  const [episodeQuery, setEpisodeQuery] = useState('');
  const [debouncedEpisodeQuery, setDebouncedEpisodeQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Debounce the search input — typing one char per ~80 ms shouldn't
  // re-filter on every keystroke when the haystack is 500 items.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedEpisodeQuery(episodeQuery.trim().toLowerCase()), 220);
    return () => clearTimeout(id);
  }, [episodeQuery]);

  // Reset pagination whenever the filter inputs change so the user
  // doesn't see "Load more" at the bottom of a 3-item filtered list.
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [debouncedEpisodeQuery, sortOrder, feedUrl]);

  const filteredSortedEpisodes = useMemo(() => {
    const all = feed.data?.episodes ?? [];
    const filtered = debouncedEpisodeQuery
      ? all.filter(ep =>
          ep.title.toLowerCase().includes(debouncedEpisodeQuery) ||
          (ep.description ?? '').toLowerCase().includes(debouncedEpisodeQuery)
        )
      : all;
    // Most podcast RSS feeds list newest-first already, but a small
    // minority don't, so sort defensively. Items without a parseable
    // pubDate (=0) sink to the bottom in newest mode and to the top
    // in oldest mode — better than scattering them randomly.
    const sorted = [...filtered].sort((a, b) => {
      if (sortOrder === 'newest') return (b.pubDate || 0) - (a.pubDate || 0);
      return (a.pubDate || Number.MAX_SAFE_INTEGER) - (b.pubDate || Number.MAX_SAFE_INTEGER);
    });
    return sorted;
  }, [feed.data?.episodes, debouncedEpisodeQuery, sortOrder]);

  const visibleEpisodes = filteredSortedEpisodes.slice(0, visibleCount);
  const hasMore = filteredSortedEpisodes.length > visibleCount;

  return (
    <DynamicPodcastTheme
      seedH={seed?.h ?? null}
      seedS={seed?.s ?? null}
      seedL={seed?.l ?? null}
    >
      {(themeStyle) => (
        <div className="min-h-screen bg-background pb-40 relative" style={themeStyle}>
          <SEO
            title={displayTitle ? `${displayTitle} — ${lang === 'ar' ? 'بودكاست' : 'Podcasts'}` : (lang === 'ar' ? 'بودكاست' : 'Podcasts')}
            description={feed.data?.description?.slice(0, 160) ?? ''}
            path={`/podcasts/${routeId}`}
          />

          {/* Backdrop: blurred full-bleed cover, fading into the page
              background. Sits at the absolute top so the title/cover
              float over it. */}
          {displayImage && (
            <div className="absolute inset-x-0 top-0 h-[280px] overflow-hidden pointer-events-none">
              <img
                src={displayImage}
                alt=""
                className="w-full h-full object-cover scale-110"
                style={{ filter: 'blur(40px) saturate(1.4)' }}
                aria-hidden
              />
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), hsl(var(--background)))',
                }}
              />
            </div>
          )}

          {/* Top bar */}
          <div className="sticky top-0 z-30 px-4 pt-3 pb-2 flex items-center justify-between">
            <BackButton />
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                disabled={!feed.data && !meta.data?.link}
                aria-label={lang === 'ar' ? 'مشاركة' : 'Teilen'}
                title={copiedLink ? (lang === 'ar' ? 'تم نسخ الرابط' : 'Link kopiert') : undefined}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary/60 hover:bg-secondary active:scale-95 transition-transform disabled:opacity-50"
              >
                {copiedLink
                  ? <Check className="w-4 h-4" />
                  : <Share2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleSubscribeToggle}
                disabled={!feed.data}
                className="flex items-center gap-1.5 h-10 px-4 rounded-full text-[13px] font-bold transition-colors active:scale-95 disabled:opacity-50"
                style={{
                  background: subscribed
                    ? 'transparent'
                    : 'var(--podcast-primary, hsl(var(--primary)))',
                  color: subscribed
                    ? 'var(--podcast-primary, hsl(var(--primary)))'
                    : 'var(--podcast-primary-fg, hsl(var(--primary-foreground)))',
                  border: subscribed ? '1.5px solid var(--podcast-primary, hsl(var(--primary)))' : 'none',
                }}
              >
                {subscribed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>
                  {subscribed
                    ? (lang === 'ar' ? 'مشترك' : 'Abonniert')
                    : (lang === 'ar' ? 'اشترك' : 'Abonnieren')}
                </span>
              </button>
            </div>
          </div>

          {/* Header — cover, title, author */}
          <header className="relative px-6 pt-2 pb-4 flex flex-col items-center text-center">
            <div
              className="w-40 h-40 rounded-3xl overflow-hidden bg-muted/40 shadow-2xl mb-5"
              style={{ boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5)' }}
            >
              {displayImage
                ? <img src={displayImage} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full skeleton" />}
            </div>
            <h1 className="text-2xl font-black leading-tight max-w-md text-foreground">
              {displayTitle || <span className="inline-block h-7 w-48 skeleton rounded-md" />}
            </h1>
            {displayAuthor && (
              <p className="text-sm text-muted-foreground mt-1.5 font-medium">
                {displayAuthor}
              </p>
            )}
          </header>

          {/* Body */}
          <div className="relative max-w-lg mx-auto px-4 space-y-4">
            {error && !feed.data && (
              <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-5 text-center">
                <p className="text-sm font-bold text-foreground mb-1.5">
                  {lang === 'ar' ? 'تعذّر تحميل البودكاست' : 'Podcast konnte nicht geladen werden'}
                </p>
                <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
                  {lang === 'ar'
                    ? 'قد يكون البودكاست محجوباً في منطقتك أو تغيّر رابط RSS الخاص به. حاول تحديث الصفحة أو ابحث عنه باسمه مباشرةً.'
                    : 'Der Podcast ist eventuell in deiner Region nicht verfügbar oder seine RSS-URL hat sich geändert. Lade die Seite neu oder suche ihn nach Namen.'}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => { void meta.refetch(); void feed.refetch(); }}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-95"
                  >
                    {lang === 'ar' ? 'إعادة المحاولة' : 'Erneut versuchen'}
                  </button>
                  {meta.data?.link && (
                    <a
                      href={meta.data.link}
                      target="_blank" rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-semibold"
                    >
                      {lang === 'ar' ? 'فتح في Apple Podcasts' : 'In Apple Podcasts öffnen'}
                    </a>
                  )}
                </div>
                <details className="mt-3 text-start">
                  <summary className="text-[10px] text-muted-foreground/70 cursor-pointer">
                    {lang === 'ar' ? 'تفاصيل تقنية' : 'Technische Details'}
                  </summary>
                  <p className="text-[11px] text-muted-foreground mt-1 break-words" dir="ltr">
                    {(error as Error).message}
                  </p>
                </details>
              </div>
            )}

            {/* Description card */}
            {safeDescription && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/40 p-4"
              >
                <div
                  // When `<p>` blocks are present `line-clamp-N` doesn't
                  // collapse reliably across browsers — Safari treats
                  // each block as its own clamp context and shows more
                  // than the requested lines. Falling back to a fixed
                  // `max-height` with a fade gradient gives a
                  // predictable preview height regardless of inner
                  // markup. Once expanded we drop the cap entirely.
                  className={`text-[13px] text-foreground/85 leading-relaxed podcast-html relative ${
                    isLongDescription && !descExpanded ? 'overflow-hidden' : ''
                  }`}
                  style={
                    isLongDescription && !descExpanded
                      ? { maxHeight: '6.5em', maskImage: 'linear-gradient(to bottom, #000 70%, transparent)' }
                      : undefined
                  }
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
                {isLongDescription && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded(v => !v)}
                    aria-expanded={descExpanded}
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold transition-colors"
                    style={{
                      color: 'var(--podcast-primary, hsl(var(--primary)))',
                    }}
                  >
                    <span>
                      {descExpanded
                        ? (lang === 'ar' ? 'عرض أقل' : 'Weniger anzeigen')
                        : (lang === 'ar' ? 'عرض المزيد' : 'Mehr anzeigen')}
                    </span>
                    {descExpanded
                      ? <ChevronUp className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </motion.div>
            )}

            {/* Metadata rows */}
            {feed.data && (
              <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/40 divide-y divide-border/40 overflow-hidden">
                {displayLink && (
                  <a
                    href={displayLink}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground">
                        {lang === 'ar' ? 'المصدر' : 'Quelle'}
                      </p>
                      <p className="text-[12.5px] truncate text-foreground">{displayLink}</p>
                    </div>
                  </a>
                )}
                <div className="flex items-center gap-3 px-4 py-3">
                  <Rss className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground">RSS</p>
                    <p className="text-[12.5px] truncate text-foreground" dir="ltr">{feed.data.origin}</p>
                  </div>
                </div>
                {feed.data.languageCode && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground">
                        {lang === 'ar' ? 'اللغة' : 'Sprache'}
                      </p>
                      <p className="text-[12.5px] uppercase text-foreground">{feed.data.languageCode}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Episodes section heading + controls (search & sort).
                Visible only when there are episodes to act on; if the
                feed only has 1-2 items the controls would clutter the
                screen for no real benefit. */}
            {feed.data && feed.data.episodes.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground">
                    {lang === 'ar' ? 'الحلقات' : 'Folgen'}
                  </h2>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {debouncedEpisodeQuery
                      ? `${filteredSortedEpisodes.length} / ${feed.data.episodes.length}`
                      : feed.data.episodes.length}
                  </span>
                </div>
                {feed.data.episodes.length > 5 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={episodeQuery}
                        onChange={e => setEpisodeQuery(e.target.value)}
                        placeholder={lang === 'ar' ? 'ابحث في الحلقات' : 'Folgen durchsuchen'}
                        className="w-full h-9 ps-8 pe-8 rounded-full bg-muted/40 border border-border/40 text-[12.5px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        aria-label={lang === 'ar' ? 'بحث في الحلقات' : 'Folgen durchsuchen'}
                      />
                      {episodeQuery && (
                        <button
                          onClick={() => setEpisodeQuery('')}
                          className="absolute top-1/2 -translate-y-1/2 end-2 w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center"
                          aria-label={lang === 'ar' ? 'مسح' : 'Leeren'}
                        >
                          <X className="w-3 h-3 text-foreground" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSortOrder(o => (o === 'newest' ? 'oldest' : 'newest'))}
                      className="h-9 px-3 rounded-full bg-muted/40 border border-border/40 text-[12px] font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
                      aria-label={lang === 'ar' ? 'تبديل الترتيب' : 'Sortierung umschalten'}
                      title={sortOrder === 'newest'
                        ? (lang === 'ar' ? 'الأحدث أولاً' : 'Neueste zuerst')
                        : (lang === 'ar' ? 'الأقدم أولاً' : 'Älteste zuerst')}
                    >
                      {sortOrder === 'newest'
                        ? <ArrowDownNarrowWide className="w-3.5 h-3.5" />
                        : <ArrowUpNarrowWide className="w-3.5 h-3.5" />}
                      <span className="text-[11.5px] hidden sm:inline">
                        {sortOrder === 'newest'
                          ? (lang === 'ar' ? 'الأحدث' : 'Neueste')
                          : (lang === 'ar' ? 'الأقدم' : 'Älteste')}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Episode list */}
            {isLoading && !feed.data && (
              <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="text-[12px]">
                  {lang === 'ar' ? 'يتم تحميل الحلقات...' : 'Folgen werden geladen...'}
                </p>
              </div>
            )}

            {feed.data && (
              <div className="space-y-3">
                {visibleEpisodes.map(ep => (
                  <EpisodeListItem
                    key={ep.id}
                    episode={ep}
                    podcastTitle={feed.data!.title || displayTitle}
                    podcastImageUrl={feed.data!.imageUrl || displayImage}
                    seedH={seed?.h ?? null}
                    seedS={seed?.s ?? null}
                    seedL={seed?.l ?? null}
                    allEpisodes={filteredSortedEpisodes}
                  />
                ))}
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                    className="w-full py-3 rounded-2xl text-[13px] font-semibold border border-border/50 bg-card/50 hover:bg-muted/40 active:scale-[0.98] transition"
                    style={{ color: 'var(--podcast-primary, hsl(var(--primary)))' }}
                  >
                    {lang === 'ar'
                      ? `تحميل المزيد (${filteredSortedEpisodes.length - visibleCount})`
                      : `Mehr laden (${filteredSortedEpisodes.length - visibleCount})`}
                  </button>
                )}
                {/* Empty filter result */}
                {debouncedEpisodeQuery && filteredSortedEpisodes.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      {lang === 'ar' ? 'لا توجد حلقات تطابق بحثك' : 'Keine Folgen gefunden'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {feed.data && feed.data.episodes.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">
                  {lang === 'ar' ? 'لا توجد حلقات منشورة بعد' : 'Noch keine Folgen veröffentlicht'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </DynamicPodcastTheme>
  );
}
