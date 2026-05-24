// Podcasts discovery page.
//
// UX modeled on the open-source `podium` Android app's Discover tab:
//   • header with a globe button (country switcher) and a search field
//   • horizontally scrollable category tab row (Apple Podcasts genres)
//   • 3-column grid of podcast cards with artwork + title + author
//   • bottom pill: "Powered by Apple Podcasts"
//
// All data comes from the public iTunes Search / RSS endpoints — no API
// keys, no proxy. See `src/lib/podcasts/itunes.ts` for the wire format.
//
// Persisted state (localStorage):
//   - `podcasts.country` : ISO-3166-1 alpha-2 (default: `sa`)
//   - `podcasts.genre`   : key from `podcastGenres` (default: `all`)
// Search term is intentionally NOT persisted — leaving the tab and
// coming back should reset the user to the chart they were browsing.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Globe, Search, X, Info, Check, LibraryBig } from 'lucide-react';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import { fetchTopPodcasts, searchPodcasts, upgradeArtwork, type PodcastPreview } from '@/lib/podcasts/itunes';
import { podcastGenres } from '@/data/podcastGenres';
import { podcastCountries, findCountry, type PodcastCountry } from '@/data/podcastCountries';
import {
  useSubscriptions,
  getRecentSearches,
  pushRecentSearch,
  clearRecentSearches,
  getRecentCountries,
  pushRecentCountry,
} from '@/lib/podcasts/store';
import ContinueListeningRow from '@/components/podcasts/ContinueListeningRow';

const COUNTRY_KEY = 'podcasts.country';
const GENRE_KEY = 'podcasts.genre';

/* -------------------------------------------------------------------------- */
/*  Country switcher dialog                                                   */
/* -------------------------------------------------------------------------- */

function CountryDialog({
  open, onClose, value, onSelect,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (cc: string) => void;
}) {
  const { language } = useApp();
  const [query, setQuery] = useState('');
  // Recents are read once when the dialog mounts (or `open` flips).
  // We deliberately don't use a reactive hook here — the list only
  // changes when the user picks something, at which point we close
  // the dialog anyway.
  const [recentCodes, setRecentCodes] = useState<string[]>([]);
  useEffect(() => {
    if (open) setRecentCodes(getRecentCountries());
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return podcastCountries;
    return podcastCountries.filter(c =>
      c.code.includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.nameAr.includes(q) ||
      c.nameDe.toLowerCase().includes(q)
    );
  }, [query]);

  // Only show the recents section when the user hasn't started typing
  // a search — once they're searching, the filtered list is what they
  // care about and a separate "recent" header would confuse the layout.
  const recents = recentCodes
    .map(cc => podcastCountries.find(c => c.code === cc))
    .filter((c): c is PodcastCountry => Boolean(c));
  const showRecents = !query.trim() && recents.length > 0;

  if (!open) return null;
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '8%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '8%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h2 className="text-base font-bold text-foreground">
              {language === 'ar' ? 'اختيار الدولة' : 'Land auswählen'}
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
                onChange={e => setQuery(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث عن دولة' : 'Land suchen'}
                className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {showRecents && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-3 pt-2 pb-1">
                  {language === 'ar' ? 'مستخدمة مؤخراً' : 'Zuletzt verwendet'}
                </p>
                {recents.map(c => {
                  const active = c.code === value;
                  const localized = language === 'ar' ? c.nameAr : c.nameDe;
                  return (
                    <button
                      key={`recent-${c.code}`}
                      onClick={() => { onSelect(c.code); onClose(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-start ${active ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
                    >
                      <span className="text-2xl leading-none" aria-hidden>{c.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{localized}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{c.name} · {c.code.toUpperCase()}</p>
                      </div>
                      {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
                <div className="my-2 mx-3 h-px bg-border/50" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-3 pt-2 pb-1">
                  {language === 'ar' ? 'كل الدول' : 'Alle Länder'}
                </p>
              </>
            )}
            {filtered.map(c => {
              const active = c.code === value;
              const localized = language === 'ar' ? c.nameAr : c.nameDe;
              return (
                <button
                  key={c.code}
                  onClick={() => { onSelect(c.code); onClose(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-start ${active ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
                >
                  <span className="text-2xl leading-none" aria-hidden>{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{localized}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.name} · {c.code.toUpperCase()}</p>
                  </div>
                  {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

/* -------------------------------------------------------------------------- */
/*  Powered-by badge                                                          */
/* -------------------------------------------------------------------------- */

function PoweredByApplePodcasts() {
  const { language } = useApp();
  return (
    <a
      href="https://www.apple.com/legal/internet-services/itunes/appstorebadges/"
      target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors"
    >
      <Info className="w-3 h-3" />
      <span>{language === 'ar' ? 'مدعوم من Apple Podcasts' : 'Powered by Apple Podcasts'}</span>
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

function PodcastCard({ podcast, onOpen }: { podcast: PodcastPreview; onOpen: (p: PodcastPreview) => void }) {
  // Discovery grid renders cards at ~110px wide on a phone (3 cols on a
  // 360px viewport, minus padding). Loading the 600px artwork the API
  // returns wastes ~36× the bytes the user actually needs, ~50KB per
  // card across 50 cards. We rewrite the URL to request the 200px
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
      <p className="text-[12.5px] font-bold text-foreground leading-tight line-clamp-2">{podcast.title}</p>
      <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">{podcast.author}</p>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                  */
/* -------------------------------------------------------------------------- */

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
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

export default function PodcastsPage() {
  const { language, t } = useApp();
  const navigate = useNavigate();
  const subs = useSubscriptions();

  // Persisted prefs — read once, written on change.
  const [country, setCountry] = useState<PodcastCountry>(() =>
    findCountry(typeof window !== 'undefined' ? localStorage.getItem(COUNTRY_KEY) : null)
  );
  const [genreKey, setGenreKey] = useState<string>(() =>
    (typeof window !== 'undefined' ? localStorage.getItem(GENRE_KEY) : null) ?? 'all'
  );

  useEffect(() => { localStorage.setItem(COUNTRY_KEY, country.code); }, [country]);
  useEffect(() => { localStorage.setItem(GENRE_KEY, genreKey); }, [genreKey]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  // Recent searches — read once at mount, refreshed only when we
  // ourselves push a new term. Local state (not a hook) because the
  // value rarely changes and sub-millisecond freshness isn't required.
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());

  useEffect(() => {
    const id = setTimeout(() => {
      const trimmed = search.trim();
      setDebouncedSearch(trimmed);
      // Persist any term the user actually committed to (debounced =
      // they stopped typing for 350 ms with at least 2 chars). We
      // don't push partial typing to avoid filling the recents list
      // with single-letter junk.
      if (trimmed.length >= 2) {
        pushRecentSearch(trimmed);
        setRecentSearches(getRecentSearches());
      }
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const [showCountry, setShowCountry] = useState(false);

  const activeGenre = podcastGenres.find(g => g.key === genreKey) ?? podcastGenres[0];
  const isSearching = debouncedSearch.length >= 2;

  // The two queries are mutually exclusive (search OR top-charts) so we
  // toggle which one is enabled instead of running both. React Query
  // keeps each cache entry per (cc, genre/term) tuple, so flipping back
  // and forth between tabs is instant after the first load.
  const topQuery = useQuery({
    queryKey: ['podcasts', 'top', country.code, activeGenre.key],
    queryFn: ({ signal }) => fetchTopPodcasts({
      countryCode: country.code,
      genreId: activeGenre.id,
      limit: 50,
      signal,
    }),
    enabled: !isSearching,
    staleTime: 30 * 60 * 1000, // top charts barely move; cache aggressively
  });

  const searchQuery = useQuery({
    queryKey: ['podcasts', 'search', country.code, debouncedSearch],
    queryFn: ({ signal }) => searchPodcasts({
      term: debouncedSearch,
      countryCode: country.code,
      limit: 50,
      signal,
    }),
    enabled: isSearching,
    staleTime: 5 * 60 * 1000,
  });

  const active = isSearching ? searchQuery : topQuery;

  // Auto-scroll the active genre tab into view so when state restores
  // (or after picking a genre offscreen) it isn't hidden behind the edge.
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLButtonElement>(`[data-genre="${genreKey}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [genreKey]);

  const handleOpen = (p: PodcastPreview) => {
    // Navigate to the detail page using the Apple Podcasts collection
    // id. When the discovery card already has the publisher's RSS
    // feed URL (search results expose it directly), pass it via
    // history state — that lets the detail page skip the iTunes
    // lookup round-trip and avoids one common failure mode where
    // `/lookup` returns no result for region-restricted podcasts.
    navigate(`/podcasts/${encodeURIComponent(p.id)}`, {
      state: p.feedUrl
        ? { feedUrl: p.feedUrl, title: p.title, author: p.author, artworkUrl: p.artworkUrl, link: p.link }
        : undefined,
    });
  };

  const localizedCountry = language === 'ar' ? country.nameAr : country.nameDe;

  return (
    <div className="min-h-screen bg-background pb-32">
      <SEO
        title={language === 'ar' ? 'بودكاست — SmartHub' : 'Podcasts — SmartHub'}
        description={language === 'ar'
          ? 'استكشف أفضل البودكاست حول العالم بحسب الدولة والفئة، مدعوم من Apple Podcasts.'
          : 'Entdecke die besten Podcasts weltweit nach Land und Kategorie, powered by Apple Podcasts.'}
        path="/podcasts"
      />

      {/* Sticky top bar — back, country switcher, search */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2.5 flex items-center gap-2">
          <BackButton />
          <button
            type="button"
            onClick={() => setShowCountry(true)}
            className="flex items-center gap-1.5 px-2.5 h-10 rounded-2xl bg-secondary/60 active:scale-95 transition-transform"
            aria-label={language === 'ar' ? 'تغيير الدولة' : 'Land wechseln'}
          >
            <Globe className="w-4 h-4 text-foreground" />
            <span className="text-base leading-none" aria-hidden>{country.flag}</span>
          </button>
          <div className="flex-1 relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              // Defer the unfocus a hair so a tap on a suggestion
              // registers before the dropdown unmounts. Without this
              // the click is swallowed by the blur → unmount cycle.
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder={language === 'ar' ? 'ابحث' : 'Suchen'}
              className="w-full h-10 ps-9 pe-9 rounded-full bg-muted/40 border border-border/40 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label={language === 'ar' ? 'بحث عن بودكاست' : 'Podcasts suchen'}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute top-1/2 -translate-y-1/2 end-2 w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center"
                aria-label={language === 'ar' ? 'مسح البحث' : 'Suche leeren'}
              >
                <X className="w-3.5 h-3.5 text-foreground" />
              </button>
            )}
            {/* Recent searches dropdown — only when the input is focused
                AND empty AND we actually have history. Picked from the
                store on first render; refreshed on every commit. */}
            {searchFocused && !search && recentSearches.length > 0 && (
              <div className="absolute top-full mt-1.5 left-0 right-0 z-40 bg-popover border border-border/60 rounded-2xl shadow-xl p-2">
                <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    {language === 'ar' ? 'عمليات البحث الأخيرة' : 'Zuletzt gesucht'}
                  </p>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault() /* keep input focus */}
                    onClick={() => { clearRecentSearches(); setRecentSearches([]); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {language === 'ar' ? 'مسح' : 'Löschen'}
                  </button>
                </div>
                <div className="flex flex-col">
                  {recentSearches.map(term => (
                    <button
                      key={term}
                      type="button"
                      onMouseDown={(e) => e.preventDefault() /* keep input focus */}
                      onClick={() => { setSearch(term); setSearchFocused(false); }}
                      className="text-start px-3 py-2 rounded-lg text-[13px] hover:bg-muted/60 flex items-center gap-2"
                    >
                      <Search className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="truncate">{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/podcasts/library')}
            className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-secondary/60 active:scale-95 transition-transform"
            aria-label={language === 'ar' ? 'مكتبتي' : 'Bibliothek'}
          >
            <LibraryBig className="w-4 h-4 text-foreground" />
            {subs.length > 0 && (
              <span className="absolute -top-1 -end-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {subs.length > 99 ? '99+' : subs.length}
              </span>
            )}
          </button>
        </div>

        {/* Genre tabs */}
        <div
          ref={tabsRef}
          className="max-w-lg mx-auto overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex items-center gap-1 px-2 pb-1.5 min-w-max">
            {podcastGenres.map(g => {
              const active = g.key === genreKey && !isSearching;
              return (
                <button
                  key={g.key}
                  data-genre={g.key}
                  onClick={() => { setGenreKey(g.key); setSearch(''); }}
                  className={`relative px-3 py-2 text-[13.5px] whitespace-nowrap transition-colors ${
                    active ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(g.labelKey)}
                  {active && (
                    <motion.span
                      layoutId="podcasts-tab-underline"
                      className="absolute left-2 right-2 -bottom-0.5 h-[2px] rounded-full bg-primary"
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
      <div className="max-w-lg mx-auto pt-4">
        {/* Continue Listening — only visible when the recents store
            has entries; otherwise it self-hides. Lives above the
            country/genre header so it's the very first thing returning
            users see. */}
        {!isSearching && <ContinueListeningRow />}

        <div className="px-4">
          {/* Selected country pill */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] text-muted-foreground">
              {isSearching
                ? (language === 'ar' ? 'نتائج البحث في' : 'Suchergebnisse in') + ` ${localizedCountry}`
                : t(activeGenre.labelKey) + ' · ' + localizedCountry}
            </p>
          </div>

        {active.isLoading ? (
          <GridSkeleton />
        ) : active.isError ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">
              {language === 'ar' ? 'تعذّر تحميل البودكاست' : 'Podcasts konnten nicht geladen werden'}
            </p>
            <p className="text-[12px] text-muted-foreground mb-4">
              {language === 'ar' ? 'تأكد من الاتصال بالإنترنت ثم حاول مجدداً.' : 'Prüfe deine Internetverbindung.'}
            </p>
            <button
              onClick={() => active.refetch()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              {language === 'ar' ? 'إعادة المحاولة' : 'Erneut versuchen'}
            </button>
          </div>
        ) : (active.data?.length ?? 0) === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">
              {language === 'ar' ? 'لا توجد نتائج' : 'Keine Treffer'}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {language === 'ar' ? 'جرّب كلمة بحث أخرى أو غيّر الدولة.' : 'Versuche es mit anderen Stichwörtern.'}
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-3 gap-x-3 gap-y-5"
          >
            {active.data!.map(p => (
              <PodcastCard key={p.id} podcast={p} onOpen={handleOpen} />
            ))}
          </motion.div>
        )}
        </div>
      </div>

      {/* Floating "Powered by" pill */}
      <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <PoweredByApplePodcasts />
        </div>
      </div>

      <CountryDialog
        open={showCountry}
        onClose={() => setShowCountry(false)}
        value={country.code}
        onSelect={cc => {
          setCountry(findCountry(cc));
          // Track recent country picks for the dialog's "Recent" group
          // — write-only here, the dialog reads on its own open.
          pushRecentCountry(cc);
        }}
      />
    </div>
  );
}
