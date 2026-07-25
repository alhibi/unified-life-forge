// Podcasts discovery page.
//
// UX modeled on the open-source `podium` Android app's Discover tab,
// then expanded for cross-language browsing:
//   • header with a back button, a scope/country switcher, search,
//     and the library shortcut
//   • horizontally scrollable category tab row (Apple Podcasts genres)
//   • 3-column grid of podcast cards with artwork + title + author
//   • bottom pill: "Powered by Apple Podcasts"
//
// All data comes from the public iTunes Search / RSS endpoints — no API
// keys, no proxy. See `src/lib/podcasts/itunes.ts` for the wire format.
//
// Two browsing scopes:
//   • COUNTRY  — single Apple storefront chart, up to 200 podcasts
//                (Apple's documented hard cap per request).
//   • REGION   — fan out across every country in the language region
//                in parallel, dedupe by collectionId, return up to
//                200 × N unique podcasts. Used to surface "every
//                Arabic-language podcast" or "every German-speaking
//                podcast" in one ranked list.
//
// Persisted state (localStorage):
//   - `podcasts.scope`   : `'country'` | `'region'`
//   - `podcasts.country` : ISO-3166-1 alpha-2 (default: `sa`)
//   - `podcasts.region`  : key from `podcastRegions` (default: `arabic`)
//   - `podcasts.genre`   : key from `podcastGenres` (default: `all`)
// The scope-specific pickers each persist their own selection so
// flipping between scopes preserves both. Search term is intentionally
// NOT persisted — leaving the tab and coming back resets to the chart.

import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import {
  fetchTopPodcasts,
  fetchTopPodcastsAggregated,
  ITUNES_MAX_LIMIT,
  type PodcastPreview,
  searchPodcasts,
  searchPodcastsAggregated,
  upgradeArtwork,
} from '@/features/podcasts/lib/itunes';
import {
  findCountry,
  findRegion,
  podcastCountries,
  type PodcastCountry,
  type PodcastRegion,
  podcastRegions,
} from '@/features/podcasts/lib/podcastCountries';
import { findGenre, podcastGenres } from '@/features/podcasts/lib/podcastGenres';
import { syncPodcastsFromCloud, useSubscriptions } from '@/features/podcasts/lib/store';
import { Check, Globe, Info, Languages, LibraryBig, Search, X } from '@/lib/icons';

const SCOPE_KEY = 'podcasts.scope';
const COUNTRY_KEY = 'podcasts.country';
const REGION_KEY = 'podcasts.region';
const GENRE_KEY = 'podcasts.genre';

type Scope = 'country' | 'region';

function loadScope(): Scope {
  if (typeof window === 'undefined') return 'country';
  const raw = localStorage.getItem(SCOPE_KEY);
  return raw === 'region' ? 'region' : 'country';
}

/* -------------------------------------------------------------------------- */
/*  Country switcher dialog                                                   */
/* -------------------------------------------------------------------------- */

function CountryDialog({
  open,
  onClose,
  value,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (cc: string) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return podcastCountries;
    return podcastCountries.filter(
      (c) =>
        c.code.includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.nameAr.includes(q) ||
        c.lang.includes(q),
    );
  }, [query]);

  if (!open) return null;
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-fullscreen flex items-end sm:items-center justify-center bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '8%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '8%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h2 className="text-base font-bold text-foreground">
              {'اختيار الدولة'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted/60">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={'ابحث عن دولة'}
                className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {filtered.map((c) => {
              const active = c.code === value;
              const localized = c.nameAr;
              return (
                <button
                  key={c.code}
                  onClick={() => {
                    onSelect(c.code);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-start ${active ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {c.flag}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{localized}</p>
                    <p className="text-[0.6875rem] text-muted-foreground truncate">
                      {c.name} · {c.code.toUpperCase()} · {c.lang}
                    </p>
                  </div>
                  {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                {'لا توجد نتائج'}
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/*  Region switcher dialog                                                    */
/* -------------------------------------------------------------------------- */

function RegionDialog({
  open,
  onClose,
  value,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (key: string) => void;
}) {
  const { t } = useApp();

  if (!open) return null;
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-fullscreen flex items-end sm:items-center justify-center bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '8%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '8%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h2 className="text-base font-bold text-foreground">
              {'اختيار المنطقة'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted/60">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-3">
            {podcastRegions.map((r) => {
              const active = r.key === value;
              return (
                <button
                  key={r.key}
                  onClick={() => {
                    onSelect(r.key);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-start ${active ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {r.flag ?? '🌐'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {t(r.labelKey)}
                    </p>
                    <p className="text-[0.6875rem] text-muted-foreground truncate">
                      {r.countries.length} {'دولة'}
                    </p>
                  </div>
                  {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/*  Powered-by badge                                                          */
/* -------------------------------------------------------------------------- */

function PoweredByApplePodcasts() {
  return (
    <a
      href="https://www.apple.com/legal/internet-services/itunes/appstorebadges/"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-[0.6875rem] font-semibold hover:bg-primary/20 transition-colors"
    >
      <Info className="w-3 h-3" />
      <span>{'مدعوم من Apple Podcasts'}</span>
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

function PodcastCard({
  podcast,
  onOpen,
}: {
  podcast: PodcastPreview;
  onOpen: (p: PodcastPreview) => void;
}) {
  // Discovery grid renders cards at ~110px wide on a phone (3 cols on a
  // 360px viewport, minus padding). Loading the 600px artwork the API
  // returns wastes ~36× the bytes the user actually needs, ~50KB per
  // card across 200 cards. We rewrite the URL to request the 200px
  // variant from Apple's CDN — same path template, ~5KB per card.
  // The full-size cover is still used by `PodcastDetail` (which
  // re-fetches from `lookupPodcast` or the RSS feed).
  const thumb = podcast.artworkUrl ? upgradeArtwork(podcast.artworkUrl, 200) : '';
  return (
    <button
      onClick={() => onOpen(podcast)}
      className="flex flex-col gap-1.5 text-start active:scale-[0.97] transition-transform"
    >
      <div className="aspect-square w-full rounded-2xl overflow-hidden bg-muted/40 border border-border/40">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>
      <p className="text-[0.75rem] font-bold text-foreground leading-tight line-clamp-2">
        {podcast.title}
      </p>
      <p className="text-[0.6875rem] text-muted-foreground leading-tight line-clamp-1">
        {podcast.author}
      </p>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                  */
/* -------------------------------------------------------------------------- */

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="aspect-square w-full rounded-2xl skeleton" />
          <div className="h-3 w-4/5 skeleton rounded" />
          <div className="h-2.5 w-2/3 skeleton rounded" />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

/** Hard cap on rendered cards in a single grid view. The aggregated
 *  region fetch routinely returns 1300-2000 unique podcasts (15
 *  Arabic countries × 200 each yields ~1500 unique after dedup). We
 *  cap rendered DOM at 600 cards because beyond that a low-end
 *  Android with a 3-column DOM grid starts to hitch on scroll. The
 *  cap is generous enough that the user can paginate through 30+
 *  pages of unique podcasts in any region without hitting it; for
 *  the long tail past 600 they switch genre/subgenre. With 100+
 *  genre options this exposes thousands of unique podcasts. */
const RENDER_CAP = 600;
/** Initial chunk shown; "Load more" reveals the next page up to RENDER_CAP. */
const PAGE_STEP = 60;

export default function PodcastsPage() {
  const { t } = useApp();
  const navigate = useNavigate();
  const subs = useSubscriptions();

  useEffect(() => {
    syncPodcastsFromCloud().catch(console.error);
  }, []);

  /* ----- persisted prefs: scope, country, region, genre --------------------- */
  const [scope, setScope] = useState<Scope>(loadScope);
  const [country, setCountry] = useState<PodcastCountry>(() =>
    findCountry(typeof window !== 'undefined' ? localStorage.getItem(COUNTRY_KEY) : null),
  );
  const [regionKey, setRegionKey] = useState<string>(
    () => (typeof window !== 'undefined' ? localStorage.getItem(REGION_KEY) : null) ?? 'arabic',
  );
  const [genreKey, setGenreKey] = useState<string>(
    () => (typeof window !== 'undefined' ? localStorage.getItem(GENRE_KEY) : null) ?? 'all',
  );

  useEffect(() => {
    localStorage.setItem(SCOPE_KEY, scope);
  }, [scope]);
  useEffect(() => {
    localStorage.setItem(COUNTRY_KEY, country.code);
  }, [country]);
  useEffect(() => {
    localStorage.setItem(REGION_KEY, regionKey);
  }, [regionKey]);
  useEffect(() => {
    localStorage.setItem(GENRE_KEY, genreKey);
  }, [genreKey]);

  /* ----- search input + debounce ------------------------------------------- */
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const [showCountry, setShowCountry] = useState(false);
  const [showRegion, setShowRegion] = useState(false);

  const activeGenre = findGenre(genreKey);
  const activeRegion: PodcastRegion | null = findRegion(regionKey);
  const isSearching = debouncedSearch.length >= 2;

  /* ----- query: 4 cases (scope × searching) -------------------------------- */
  // Single-country branches stay enabled when scope=country; aggregated
  // branches activate when scope=region. Each query has its own cache
  // key so flipping back and forth between scopes is instant after the
  // first hit.
  const topQueryCountry = useQuery({
    queryKey: ['podcasts', 'top', 'country', country.code, activeGenre.key],
    queryFn: ({ signal }) =>
      fetchTopPodcasts({
        countryCode: country.code,
        genreId: activeGenre.id,
        limit: ITUNES_MAX_LIMIT,
        signal,
      }),
    enabled: scope === 'country' && !isSearching,
    staleTime: 30 * 60 * 1000,
  });

  const searchQueryCountry = useQuery({
    queryKey: ['podcasts', 'search', 'country', country.code, debouncedSearch],
    queryFn: ({ signal }) =>
      searchPodcasts({
        term: debouncedSearch,
        countryCode: country.code,
        limit: ITUNES_MAX_LIMIT,
        signal,
      }),
    enabled: scope === 'country' && isSearching,
    staleTime: 5 * 60 * 1000,
  });

  const topQueryRegion = useQuery({
    queryKey: ['podcasts', 'top', 'region', regionKey, activeGenre.key],
    queryFn: ({ signal }) =>
      fetchTopPodcastsAggregated({
        countryCodes: activeRegion?.countries ?? [],
        genreId: activeGenre.id,
        // Cap per-country slightly below 200 for the worldwide region
        // (12 × 200 = 2400 raw entries before dedup) — even with dedup
        // crunching that volume client-side stays under 50ms but we'd
        // rather not fetch what we won't render.
        limitPerCountry: ITUNES_MAX_LIMIT,
        signal,
      }),
    enabled: scope === 'region' && !!activeRegion && !isSearching,
    staleTime: 30 * 60 * 1000,
  });

  const searchQueryRegion = useQuery({
    queryKey: ['podcasts', 'search', 'region', regionKey, debouncedSearch],
    queryFn: ({ signal }) =>
      searchPodcastsAggregated({
        term: debouncedSearch,
        countryCodes: activeRegion?.countries ?? [],
        limitPerCountry: ITUNES_MAX_LIMIT,
        signal,
      }),
    enabled: scope === 'region' && !!activeRegion && isSearching,
    staleTime: 5 * 60 * 1000,
  });

  const active =
    scope === 'country'
      ? isSearching
        ? searchQueryCountry
        : topQueryCountry
      : isSearching
        ? searchQueryRegion
        : topQueryRegion;

  /* ----- pagination on the rendered chunk --------------------------------- */
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  // Reset paging whenever the active dataset key changes — otherwise
  // switching genre/scope can leave the user staring at a clipped
  // 60-item slice of the new dataset.
  useEffect(() => {
    setVisibleCount(PAGE_STEP);
  }, [scope, country.code, regionKey, activeGenre.key, debouncedSearch]);

  const fullList = useMemo(() => active.data ?? [], [active.data]);
  const cappedList = useMemo(() => fullList.slice(0, RENDER_CAP), [fullList]);
  const visibleList = cappedList.slice(0, visibleCount);
  const hasMore = visibleList.length < cappedList.length;

  /* ----- auto-scroll active genre tab into view --------------------------- */
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLButtonElement>(`[data-genre="${genreKey}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [genreKey]);

  const handleOpen = (p: PodcastPreview) => {
    navigate(`/podcasts/${encodeURIComponent(p.id)}`, {
      state: p.feedUrl
        ? {
            feedUrl: p.feedUrl,
            title: p.title,
            author: p.author,
            artworkUrl: p.artworkUrl,
            link: p.link,
          }
        : undefined,
    });
  };

  /* ----- subtitle: "Genre · Country" or "Genre · Region (N countries)" ---- */
  const localizedCountry = country.nameAr;
  const subtitle = (() => {
    if (isSearching) {
      const where =
        scope === 'country' ? localizedCountry : activeRegion ? t(activeRegion.labelKey) : '';
      return ('نتائج البحث في ') + where;
    }
    const where =
      scope === 'country' ? localizedCountry : activeRegion ? t(activeRegion.labelKey) : '';
    return t(activeGenre.labelKey) + ' · ' + where;
  })();

  return (
    <div className="min-h-screen bg-background pb-page">
      <SEO
        title={'بودكاست — SmartHub'}
        description={
          'استكشف أفضل البودكاست حول العالم بكل اللغات والفئات، مدعوم من Apple Podcasts.'
        }
        path="/podcasts"
      />

      {/* Sticky top bar — back, scope/country/region pill, search */}
      <div className="z-header app-sticky-header border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2 flex items-center gap-2">
          <BackButton />
          {/* Scope pill: tapping the icon area cycles country↔region;
              tapping the label opens the matching picker. The two-zone
              control keeps the discoverability of "tap to switch
              country" while exposing the new region mode without
              eating any header real estate. */}
          <div className="flex items-center bg-secondary/60 rounded-2xl overflow-hidden h-10">
            <button
              type="button"
              onClick={() => setScope((s) => (s === 'country' ? 'region' : 'country'))}
              className="px-2.5 h-full flex items-center gap-1 active:scale-95 transition-transform border-e border-border/40"
              aria-label={
                scope === 'country'
                  ? 'التبديل إلى وضع المنطقة'
                  : 'التبديل إلى وضع الدولة'
              }
              title={scope === 'country' ? t('podcasts.scope.country') : t('podcasts.scope.region')}
            >
              {scope === 'country' ? (
                <Globe className="w-4 h-4 text-foreground" />
              ) : (
                <Languages className="w-4 h-4 text-foreground" />
              )}
            </button>
            <button
              type="button"
              onClick={() => (scope === 'country' ? setShowCountry(true) : setShowRegion(true))}
              className="px-2.5 h-full flex items-center gap-1.5 active:scale-95 transition-transform"
              aria-label={
                scope === 'country'
                  ? 'تغيير الدولة'
                  : 'تغيير المنطقة'
              }
            >
              <span className="text-base leading-none" aria-hidden>
                {scope === 'country' ? country.flag : (activeRegion?.flag ?? '🌐')}
              </span>
            </button>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={'ابحث'}
              className="w-full h-10 ps-9 pe-9 rounded-full bg-muted/40 border border-border/40 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label={'بحث عن بودكاست'}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute top-1/2 -translate-y-1/2 end-2 w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center"
                aria-label={'مسح البحث'}
              >
                <X className="w-3.5 h-3.5 text-foreground" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/podcasts/library')}
            className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-secondary/60 active:scale-95 transition-transform"
            aria-label={'مكتبتي'}
          >
            <LibraryBig className="w-4 h-4 text-foreground" />
            {subs.length > 0 && (
              <span className="absolute -top-1 -end-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[0.625rem] font-bold flex items-center justify-center">
                {subs.length > 99 ? '99+' : subs.length}
              </span>
            )}
          </button>
        </div>

        {/* Genre tabs — scope-independent, both modes share the same
            genre filter (Apple's genre IDs are identical across all
            storefronts). */}
        <div
          ref={tabsRef}
          className="max-w-lg mx-auto overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex items-center gap-1 px-2 pb-1.5 min-w-max">
            {podcastGenres.map((g) => {
              const isActive = g.key === genreKey && !isSearching;
              return (
                <button
                  key={g.key}
                  data-genre={g.key}
                  onClick={() => {
                    setGenreKey(g.key);
                    setSearch('');
                  }}
                  className={`relative px-3 py-2 text-[0.8125rem] whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(g.labelKey)}
                  {isActive && (
                    <motion.span
                      layoutId="podcasts-tab-underline"
                      className="absolute start-2 end-2 -bottom-0.5 h-[2px] rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[0.75rem] text-muted-foreground line-clamp-1">{subtitle}</p>
          {/* Total counter — useful in region mode where dedup makes
              the count non-obvious. We show "shown/total" so it's
              clear the page is paginated. */}
          {!active.isLoading && cappedList.length > 0 && (
            <span className="text-[0.6875rem] text-muted-foreground tabular-nums shrink-0 ms-3">
              {visibleList.length}/{fullList.length}
            </span>
          )}
        </div>

        {active.isLoading ? (
          <>
            {scope === 'region' && (
              <p className="text-center text-[0.75rem] text-muted-foreground mb-3">
                {t('podcasts.aggregating')}
              </p>
            )}
            <GridSkeleton />
          </>
        ) : active.isError ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">
              {'تعذّر تحميل البودكاست'}
            </p>
            <p className="text-[0.75rem] text-muted-foreground mb-4">
              {'تأكد من الاتصال بالإنترنت ثم حاول مجدداً.'}
            </p>
            <button
              onClick={() => active.refetch()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              {'إعادة المحاولة'}
            </button>
          </div>
        ) : cappedList.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">
              {'لا توجد نتائج'}
            </p>
            <p className="text-[0.75rem] text-muted-foreground mb-5">
              {isSearching
                ? `لم نجد بودكاست بعنوان "${debouncedSearch}".`
                : 'جرّب فئة أخرى أو غيّر النطاق.'}
            </p>
            {isSearching && (
              <button
                onClick={() => setSearch('')}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-95"
              >
                {'مسح البحث'}
              </button>
            )}
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-3 gap-x-3 gap-y-5"
            >
              {visibleList.map((p) => (
                <PodcastCard key={p.id} podcast={p} onOpen={handleOpen} />
              ))}
            </motion.div>
            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => Math.min(c + PAGE_STEP, cappedList.length))}
                className="w-full mt-6 py-3 rounded-2xl text-[0.8125rem] font-semibold border border-border/50 bg-card/50 hover:bg-muted/40 active:scale-[0.98] transition text-primary"
              >
                {`تحميل المزيد (${cappedList.length - visibleList.length})`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Floating "Powered by" pill */}
      <div className="fixed bottom-4 start-0 end-0 z-float flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <PoweredByApplePodcasts />
        </div>
      </div>

      <CountryDialog
        open={showCountry}
        onClose={() => setShowCountry(false)}
        value={country.code}
        onSelect={(cc) => setCountry(findCountry(cc))}
      />
      <RegionDialog
        open={showRegion}
        onClose={() => setShowRegion(false)}
        value={regionKey}
        onSelect={(key) => setRegionKey(key)}
      />
    </div>
  );
}
