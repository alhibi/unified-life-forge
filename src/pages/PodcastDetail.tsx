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
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { motion } from 'framer-motion';
import {
  Check, ExternalLink, Globe, Loader2, Plus, Rss,
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

export default function PodcastDetail() {
  const { id: routeId = '' } = useParams<{ id: string }>();
  const decoded = useMemo(() => decodeRouteId(routeId), [routeId]);
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';

  // Step 1 — get podcast metadata.
  // Apple-id route: `lookup` for feedUrl + nice metadata.
  // Feed-url route: skip the round-trip; we'll trust the feed itself.
  const meta = useQuery({
    queryKey: ['podcast-meta', decoded],
    queryFn: ({ signal }) => {
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
              <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4 text-center">
                <p className="text-sm font-semibold text-foreground mb-1">
                  {lang === 'ar' ? 'تعذّر تحميل البودكاست' : 'Podcast konnte nicht geladen werden'}
                </p>
                <p className="text-[12px] text-muted-foreground mb-3">
                  {(error as Error).message}
                </p>
                <button
                  onClick={() => { meta.refetch(); feed.refetch(); }}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                >
                  {lang === 'ar' ? 'إعادة المحاولة' : 'Erneut versuchen'}
                </button>
              </div>
            )}

            {/* Description card */}
            {safeDescription && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/40 p-4"
              >
                <p
                  className="text-[13px] text-foreground/85 leading-relaxed podcast-html"
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
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

            {/* Episodes section heading */}
            {feed.data && feed.data.episodes.length > 0 && (
              <div className="flex items-center justify-between pt-2">
                <h2 className="text-sm font-bold text-foreground">
                  {lang === 'ar' ? 'الحلقات' : 'Folgen'}
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  {feed.data.episodes.length}
                </span>
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
                {feed.data.episodes.map(ep => (
                  <EpisodeListItem
                    key={ep.id}
                    episode={ep}
                    podcastTitle={feed.data!.title || displayTitle}
                    podcastImageUrl={feed.data!.imageUrl || displayImage}
                    seedH={seed?.h ?? null}
                    seedS={seed?.s ?? null}
                    seedL={seed?.l ?? null}
                  />
                ))}
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
