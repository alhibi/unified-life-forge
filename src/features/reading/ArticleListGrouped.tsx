import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { AlertTriangle, Bookmark, Newspaper, Plus, RefreshCw, Search, Star } from '@/lib/icons';

import { ArticleCard, HeroArticleCard } from './ArticleCard';
import type { ListPrefs } from './listPrefs';
import { bucketLabel, bucketOf, type DateBucket } from './listPrefs';
import { ArticleListSkeleton } from './Skeletons';
import { getScrollPos, storeScrollPos } from './storage';
import type { FeedItem, FilterTab } from './types';
import { throttle } from './utils';

/**
 * Enhanced article list: time-grouping, sort modes, auto-mark on
 * scroll, density variants, swipe and long-press context menus.
 *
 * Behaviour parity points with ReadYou and CapyReader:
 *
 *  - **Sort modes**: newest, oldest, unread-first. The "unread-first"
 *    mode keeps unread items at the top and shoves already-read ones
 *    to the bottom (still ordered by date within each band) — useful
 *    when you have lots of half-cleared backlog.
 *
 *  - **Date grouping**: when `prefs.group === 'date'` we insert
 *    sticky-ish section headers (Today / Yesterday / This week / This
 *    month / Older) between the rows. Buckets are computed in the
 *    user's local time so a 23:55 publication doesn't get bumped into
 *    "yesterday" on a UTC+ device.
 *
 *  - **Auto-mark-on-scroll**: an IntersectionObserver watches every
 *    rendered row. When a row exits the viewport upward (bottom edge
 *    rises above the viewport top), we mark it as read. Ignores rows
 *    that scrolled out *downward* during initial mount so a fresh
 *    page load doesn't mark everything below the fold.
 *
 *  - **Mark above/below as read**: handed down via context menu.
 *    Operates on the *visible-list* index so it respects the active
 *    sort and filters — what you see is what gets touched.
 */

const ESTIMATED_ROW_HEIGHT_COMFORT = 132;
const ESTIMATED_ROW_HEIGHT_COMPACT = 44;
const ESTIMATED_ROW_HEIGHT_CARDS = 300;
// Virtualization is intentionally disabled — pagination (PAGE_SIZE) already
// caps the DOM row count, and fixed-height windowing over variable-height
// cards produces visible scroll jitter. A high threshold keeps the fallback
// path in place for any future edge case where a caller bypasses paging.
const VIRTUALIZATION_THRESHOLD = 10_000;
const OVERSCAN = 6;
const PAGE_SIZE = 20;
const INITIAL_PAGE_SIZE = 20;

export function ArticleListGrouped({
  articles,
  loading,
  refreshing,
  language,
  filterTab,
  sourceFilter,
  searchQuery,
  bookmarks,
  readArticles,
  cachedLinks,
  hasFeeds,
  serviceError,
  prefs,
  onOpenArticle,
  onToggleBookmark,
  onRefresh,
  onAddFeeds,
  onMarkRead,
  onMarkUnread,
  onMarkManyRead,
}: {
  articles: FeedItem[];
  loading: boolean;
  refreshing: boolean;
  language: string;
  filterTab: FilterTab;
  sourceFilter: string;
  searchQuery: string;
  bookmarks: string[];
  readArticles: string[];
  cachedLinks?: ReadonlySet<string>;
  hasFeeds?: boolean;
  /** Generic message when the backend/refresh service failed. */
  serviceError?: string | null;
  prefs: ListPrefs;
  onOpenArticle: (a: FeedItem) => void;
  onToggleBookmark: (link: string) => void;
  onRefresh: () => void;
  onAddFeeds?: () => void;
  onMarkRead: (link: string) => void;
  onMarkUnread: (link: string) => void;
  onMarkManyRead: (links: ReadonlyArray<string>) => void;
}) {
  const scrollKey = `${filterTab}|${sourceFilter}|${prefs.sort}|${prefs.group}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRestoredRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ─── Infinite pagination ─────────────────────────────────────────────
  // Progressive reveal — we hydrate the first PAGE_SIZE rows immediately
  // then grow the window as the user approaches the bottom. Keeps the
  // initial paint feather-light on large archives.
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);

  // Set of article links that are read at hook level — O(1) lookup.
  const readSet = useMemo(() => new Set(readArticles), [readArticles]);

  // ─── Sorted articles ──────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const list = articles.slice();
    const tsOf = (a: FeedItem): number => {
      if (!a.pubDate) return 0;
      const t = new Date(a.pubDate).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    switch (prefs.sort) {
      case 'oldest':
        list.sort((a, b) => tsOf(a) - tsOf(b));
        break;
      case 'unread-first':
        list.sort((a, b) => {
          const ar = readSet.has(a.link) ? 1 : 0;
          const br = readSet.has(b.link) ? 1 : 0;
          if (ar !== br) return ar - br;
          return tsOf(b) - tsOf(a);
        });
        break;
      case 'newest':
      default:
        list.sort((a, b) => tsOf(b) - tsOf(a));
    }
    return list;
  }, [articles, prefs.sort, readSet]);

  // ─── Hero card (only for default view; never with non-newest sort) ────
  const heroAndRest = useMemo(() => {
    const isFiltered =
      filterTab !== 'all' ||
      sourceFilter !== 'all' ||
      searchQuery.trim().length > 0 ||
      prefs.sort !== 'newest' ||
      prefs.group === 'date' ||
      prefs.density !== 'comfortable';
    if (sorted.length === 0 || isFiltered) {
      return { hero: null, rest: sorted };
    }
    const unreadWithImage = sorted.find(
      (a) => !readSet.has(a.link) && !!a.image,
    );
    const hero = unreadWithImage || sorted[0];
    const rest = sorted.filter((a) => a.link !== hero.link);
    return { hero, rest };
  }, [
    sorted,
    filterTab,
    sourceFilter,
    searchQuery,
    prefs.sort,
    prefs.group,
    prefs.density,
    readSet,
  ]);

  // ─── Grouping into buckets (when enabled) ─────────────────────────────
  // Returns a flat list of "items" — either headers or article rows —
  // so we can window over a single homogeneous array.
  type Row =
    | { kind: 'header'; bucket: DateBucket; label: string; count: number }
    | { kind: 'article'; article: FeedItem; visibleIndex: number };

  const rows: Row[] = useMemo(() => {
    const list = heroAndRest.rest;
    if (prefs.group !== 'date') {
      return list.map((article, i) => ({
        kind: 'article',
        article,
        visibleIndex: i,
      }));
    }
    // Bucket the list while preserving the active sort within each
    // bucket. We recompute bucket boundaries linearly — the input is
    // already sorted by date in the relevant direction.
    const out: Row[] = [];
    const counts = new Map<DateBucket, number>();
    for (const a of list) counts.set(
      bucketOf(a.pubDate),
      (counts.get(bucketOf(a.pubDate)) || 0) + 1,
    );
    let visibleIndex = 0;
    let lastBucket: DateBucket | null = null;
    for (const a of list) {
      const b = bucketOf(a.pubDate);
      if (b !== lastBucket) {
        out.push({
          kind: 'header',
          bucket: b,
          label: bucketLabel(b),
          count: counts.get(b) || 0,
        });
        lastBucket = b;
      }
      out.push({ kind: 'article', article: a, visibleIndex });
      visibleIndex++;
    }
    // If sort is `oldest`, the bucket order is naturally reversed by
    // input order; if not, we reorder headers via BUCKET_ORDER. The
    // simpler approach here: trust the input. The user picked the
    // sort.
    return out;
  }, [heroAndRest.rest, prefs.group]);

  // Reset pagination whenever the effective list identity changes.
  useEffect(() => {
    setPageSize(INITIAL_PAGE_SIZE);
  }, [scrollKey, heroAndRest.rest.length]);

  // Slice rows to the currently revealed page window.
  const pagedRows = useMemo(() => {
    // Count article rows only; headers ride along with their bucket.
    let count = 0;
    const out: typeof rows = [];
    for (const r of rows) {
      if (r.kind === 'article') {
        if (count >= pageSize) break;
        count++;
      }
      out.push(r);
    }
    // Trim a trailing orphaned header (no articles after it).
    while (out.length && out[out.length - 1].kind === 'header') out.pop();
    return out;
  }, [rows, pageSize]);

  const totalArticleRows = useMemo(
    () => rows.filter((r) => r.kind === 'article').length,
    [rows],
  );
  const hasMore = pagedRows.filter((r) => r.kind === 'article').length < totalArticleRows;

  // Sentinel-based infinite loader — grows pageSize when bottom nears.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = containerRef.current;
    if (!sentinel || !root || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setPageSize((n) => n + PAGE_SIZE);
          }
        }
      },
      { root, rootMargin: '600px 0px 600px 0px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, pagedRows.length]);

  // Used by context menu's mark-above/below to enumerate links.
  const visibleArticles = useMemo(
    () => heroAndRest.rest,
    [heroAndRest.rest],
  );

  // ─── Auto-mark on scroll (IntersectionObserver) ───────────────────────
  // Track the *initial* set of links rendered so we don't mark
  // everything that was already off-screen below the fold at mount.
  // Only rows that were visible at some point and *then* scrolled out
  // upward get marked.
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elByLinkRef = useRef<Map<string, HTMLElement>>(new Map());
  const seenLinksRef = useRef<Set<string>>(new Set());
  const pendingMarkRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cache of stable per-link ref callbacks so each ArticleCard receives the
  // same function identity across renders. Without this, React invokes
  // ref(null) then ref(el) on every render, forcing the IntersectionObserver
  // to unobserve/observe every row on every keystroke or state tick — a
  // major source of scroll jank on lists of 500+ items.
  const registerElCacheRef = useRef<Map<string, (el: HTMLElement | null) => void>>(new Map());

  const flushPendingMarks = useCallback(() => {
    flushTimerRef.current = null;
    const pending = pendingMarkRef.current;
    if (pending.size === 0) return;
    const links = Array.from(pending);
    pending.clear();
    onMarkManyRead(links);
  }, [onMarkManyRead]);

  useEffect(() => {
    if (!prefs.autoMarkOnScroll) return;
    const root = containerRef.current;
    if (!root) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const link = el.dataset.link;
          if (!link) continue;
          // Once an article has been seen (visible at least once) we
          // queue it for marking when it leaves upward.
          if (entry.isIntersecting) {
            seenLinksRef.current.add(link);
            continue;
          }
          if (!seenLinksRef.current.has(link)) continue;
          // Only mark when the row scrolled *out the top*: the row's
          // bottom is above the root's top.
          const rootBounds = entry.rootBounds;
          if (!rootBounds) continue;
          if (entry.boundingClientRect.bottom <= rootBounds.top + 4) {
            if (!readSet.has(link)) pendingMarkRef.current.add(link);
          }
        }
        if (pendingMarkRef.current.size > 0 && !flushTimerRef.current) {
          flushTimerRef.current = setTimeout(flushPendingMarks, 600);
        }
      },
      {
        root,
        // Slight buffer so a half-visible row doesn't oscillate.
        rootMargin: '0px 0px 0px 0px',
        threshold: [0, 1],
      },
    );
    observerRef.current = obs;

    // Re-observe every currently-registered element.
    for (const el of elByLinkRef.current.values()) obs.observe(el);

    return () => {
      obs.disconnect();
      observerRef.current = null;
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      // Flush whatever we'd accumulated before unmount.
      flushPendingMarks();
    };
  }, [prefs.autoMarkOnScroll, flushPendingMarks, readSet]);

  /** Stable ref-callback handed to each ArticleCard — one function per link. */
  const registerEl = useCallback((link: string) => {
    const cache = registerElCacheRef.current;
    const cached = cache.get(link);
    if (cached) return cached;
    const cb = (el: HTMLElement | null) => {
      const map = elByLinkRef.current;
      const obs = observerRef.current;
      const prev = map.get(link);
      if (prev && prev !== el) {
        if (obs) obs.unobserve(prev);
        map.delete(link);
      }
      if (el) {
        map.set(link, el);
        if (obs) obs.observe(el);
      }
    };
    cache.set(link, cb);
    return cb;
  }, []);

  // ─── Scroll-position persistence ──────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    scrollRestoredRef.current = false;

    const savedY = getScrollPos(scrollKey);
    if (savedY > 0) {
      requestAnimationFrame(() => {
        if (el && !scrollRestoredRef.current) {
          el.scrollTop = savedY;
          scrollRestoredRef.current = true;
          requestAnimationFrame(() => {
            if (el && Math.abs(el.scrollTop - savedY) > 10) {
              el.scrollTop = savedY;
            }
          });
        }
      });
    }

    const throttledStore = throttle(
      () => storeScrollPos(scrollKey, el.scrollTop),
      250,
    );

    let rafPending = false;
    const handleScroll = () => {
      throttledStore();
      if (rows.length > VIRTUALIZATION_THRESHOLD && !rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          recomputeVisible();
        });
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      storeScrollPos(scrollKey, el.scrollTop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey, rows.length]);

  // ─── Windowed rendering ───────────────────────────────────────────────
  const rowHeight =
    prefs.density === 'compact'
      ? ESTIMATED_ROW_HEIGHT_COMPACT
      : prefs.density === 'cards'
        ? ESTIMATED_ROW_HEIGHT_CARDS
        : ESTIMATED_ROW_HEIGHT_COMFORT;

  const useVirtualization = rows.length > VIRTUALIZATION_THRESHOLD;

  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  // Reset the window to the top whenever the effective list identity
  // changes (filter/sort/group switch). Without this, switching from a
  // large list to a small one can leave `end` past the new length and
  // produce a blank viewport until the user scrolls.
  useEffect(() => {
    setVisibleRange({ start: 0, end: Math.min(50, rows.length) });
  }, [scrollKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const recomputeVisible = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const viewportHeight = el.clientHeight;
    const start = Math.max(
      0,
      Math.floor(scrollTop / rowHeight) - OVERSCAN,
    );
    const visibleCount = Math.ceil(viewportHeight / rowHeight);
    const end = Math.min(pagedRows.length, start + visibleCount + OVERSCAN * 2);
    setVisibleRange({ start, end });
  }, [rowHeight, pagedRows.length]);

  useEffect(() => {
    if (useVirtualization) recomputeVisible();
    else setVisibleRange({ start: 0, end: pagedRows.length });
  }, [useVirtualization, recomputeVisible, pagedRows.length]);

  const renderRows = useMemo(() => {
    if (!useVirtualization) return pagedRows;
    return pagedRows.slice(visibleRange.start, visibleRange.end);
  }, [pagedRows, useVirtualization, visibleRange]);

  // ─── Mark-above / mark-below handlers ────────────────────────────────
  const onMarkAboveRead = useCallback(
    (article: FeedItem) => {
      const idx = visibleArticles.findIndex((a) => a.link === article.link);
      if (idx <= 0) return;
      const above = visibleArticles
        .slice(0, idx)
        .map((a) => a.link)
        .filter((l) => l && !readSet.has(l));
      if (above.length > 0) onMarkManyRead(above);
    },
    [visibleArticles, readSet, onMarkManyRead],
  );
  const onMarkBelowRead = useCallback(
    (article: FeedItem) => {
      const idx = visibleArticles.findIndex((a) => a.link === article.link);
      if (idx < 0 || idx >= visibleArticles.length - 1) return;
      const below = visibleArticles
        .slice(idx + 1)
        .map((a) => a.link)
        .filter((l) => l && !readSet.has(l));
      if (below.length > 0) onMarkManyRead(below);
    },
    [visibleArticles, readSet, onMarkManyRead],
  );

  // ─── Render ───────────────────────────────────────────────────────────
  if (loading && articles.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <ArticleListSkeleton count={6} />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <EmptyState
          filterTab={filterTab}
          searchQuery={searchQuery}
          refreshing={refreshing}
          hasFeeds={hasFeeds ?? true}
          serviceError={serviceError ?? null}
          onRefresh={onRefresh}
          onAddFeeds={onAddFeeds}
        />
      </div>
    );
  }

  const topSpacer = useVirtualization ? visibleRange.start * rowHeight : 0;
  const bottomSpacer = useVirtualization
    ? Math.max(0, (pagedRows.length - visibleRange.end) * rowHeight)
    : 0;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      {heroAndRest.hero && (
        <HeroArticleCard
          article={heroAndRest.hero}
          isBookmarked={bookmarks.includes(heroAndRest.hero.link)}
          language={language}
          onOpen={() => onOpenArticle(heroAndRest.hero!)}
          onToggleBookmark={() => onToggleBookmark(heroAndRest.hero!.link)}
        />
      )}

      {topSpacer > 0 && <div style={{ height: topSpacer }} aria-hidden />}

      <div
        className={
          prefs.density === 'cards'
            ? 'space-y-1 pb-2'
            : 'divide-y divide-border/20'
        }
      >
        {renderRows.map((row, i) => {
          if (row.kind === 'header') {
            return (
              <BucketHeader
                key={`hdr-${row.bucket}-${i}`}
                label={row.label}
                count={row.count}
              />
            );
          }
          const a = row.article;
          const idx = row.visibleIndex;
          const isRead = readSet.has(a.link);
          return (
            <ArticleCard
              key={a.link}
              article={a}
              index={idx}
              isRead={isRead}
              isBookmarked={bookmarks.includes(a.link)}
              cached={cachedLinks?.has(a.link)}
              language={language}
              density={prefs.density}
              hasAbove={idx > 0}
              hasBelow={idx < visibleArticles.length - 1}
              registerEl={prefs.autoMarkOnScroll ? registerEl(a.link) : undefined}
              onOpen={() => onOpenArticle(a)}
              onToggleBookmark={() => onToggleBookmark(a.link)}
              onMarkRead={() => onMarkRead(a.link)}
              onMarkUnread={() => onMarkUnread(a.link)}
              onMarkAboveRead={() => onMarkAboveRead(a)}
              onMarkBelowRead={() => onMarkBelowRead(a)}
            />
          );
        })}
      </div>

      {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} aria-hidden />}

      {/* Infinite-scroll sentinel + subtle loading pulse */}
      {hasMore && (
        <div ref={sentinelRef} className="py-6 flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary/30 animate-pulse [animation-delay:300ms]" />
        </div>
      )}
      {!hasMore && totalArticleRows > INITIAL_PAGE_SIZE && (
        <div className="py-8 text-center text-micro text-muted-foreground/60 tracking-wide">
          {'— انتهت المقالات —'}
        </div>
      )}
    </div>
  );
}

function BucketHeader({
  label,
  count,
}: { label: string; count: number; }) {
  return (
    <div className="px-4 pt-4 pb-1 app-sticky-header z-sticky flex items-baseline justify-between border-b border-border/20">
      <h5 className="text-micro font-bold tracking-wide uppercase text-muted-foreground">
        {label}
      </h5>
      <span className="text-micro text-muted-foreground/60 tabular-nums">
        {`${count} مقالة`}
      </span>
    </div>
  );
}

function EmptyState({
  filterTab,
  searchQuery,
  refreshing,
  hasFeeds,
  serviceError,
  onRefresh,
  onAddFeeds,
}: {
  filterTab: FilterTab;
  searchQuery: string;
  refreshing: boolean;
  hasFeeds: boolean;
  serviceError?: string | null;
  onRefresh: () => void;
  onAddFeeds?: () => void;
}) {
  let icon: React.ReactNode;
  let label: string;
  let cta: React.ReactNode = null;
  let hint: string | null = null;

  if (serviceError && filterTab !== 'bookmarks' && !searchQuery) {
    icon = <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />;
    label = 'تعذّر تحديث المقالات مؤقتاً';
    hint =
      'الخدمة مشغولة أو غير متاحة الآن. المقالات المحفوظة تبقى متاحة، ويمكنك المحاولة بعد قليل.';
    cta = (
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        className="rounded-xl mt-2"
        disabled={refreshing}
      >
        <RefreshCw
          className={`h-3.5 w-3.5 me-1.5 ${refreshing ? 'animate-spin' : ''}`}
        />
        {'إعادة المحاولة'}
      </Button>
    );
  } else if (filterTab === 'bookmarks') {
    icon = <Bookmark className="h-10 w-10 text-muted-foreground/30" />;
    label = 'لا توجد مقالات محفوظة';
  } else if (searchQuery) {
    icon = <Search className="h-10 w-10 text-muted-foreground/30" />;
    label = 'لا توجد نتائج';
  } else if (!hasFeeds) {
    icon = <Star className="h-10 w-10 text-primary/40" />;
    label = 'أضف مصادرك لتبدأ القراءة';
    cta = onAddFeeds
      ? (
        <Button
          variant="default"
          size="sm"
          onClick={onAddFeeds}
          className="rounded-xl mt-2"
        >
          <Plus className="h-3.5 w-3.5 me-1.5" />
          {'تصفح المقترحات'}
        </Button>
      )
      : null;
  } else {
    icon = <Newspaper className="h-10 w-10 text-muted-foreground/30" />;
    label = 'لا توجد مقالات بعد';
    cta = (
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        className="rounded-xl mt-2"
        disabled={refreshing}
      >
        <RefreshCw
          className={`h-3.5 w-3.5 me-1.5 ${refreshing ? 'animate-spin' : ''}`}
        />
        {'تحديث الآن'}
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-24 px-6 gap-3 text-center"
    >
      {icon}
      <p className="text-meta text-muted-foreground">{label}</p>
      {hint && (
        <p className="text-mini text-muted-foreground/70 leading-relaxed max-w-xs">
          {hint}
        </p>
      )}
      {cta}
    </motion.div>
  );
}
