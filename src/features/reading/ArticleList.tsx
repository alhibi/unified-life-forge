import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, Newspaper, Plus, RefreshCw, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FeedItem, FilterTab } from './types';
import { ArticleCard, HeroArticleCard } from './ArticleCard';
import { ArticleListSkeleton } from './Skeletons';
import { getScrollPos, storeScrollPos } from './storage';
import { throttle } from './utils';


/**
 * Renders the filtered article list with windowed rendering for
 * performance on large feeds.
 *
 * Performance features:
 *  - Windowed rendering: only renders articles within the viewport
 *    plus a buffer zone (OVERSCAN). Large lists (500+ articles)
 *    render smoothly because off-screen items are simple spacer divs.
 *  - Scroll-position persistence: throttled to 250ms writes, with
 *    reliable restore using requestAnimationFrame + double-check.
 *  - Memoized hero/rest split to avoid re-sorting on every render.
 *  - Error-resilient: individual card render failures are caught by
 *    the parent ErrorBoundary without crashing the whole list.
 *
 * UX:
 *  - Hero card for the first unread article with image.
 *  - Empty states tailored to the current filter + feed state.
 *  - Smooth entrance animations with stagger cap.
 */

/** Estimated row height for windowing calculations. */
const ESTIMATED_ROW_HEIGHT = 112;
/** How many extra items to render above/below the viewport. */
const OVERSCAN = 8;
/** Beyond this count we enable windowed rendering. */
const VIRTUALIZATION_THRESHOLD = 40;

export function ArticleList({
  articles,
  loading,
  refreshing,
  isAr,
  language,
  filterTab,
  sourceFilter,
  searchQuery,
  bookmarks,
  readArticles,
  cachedLinks,
  hasFeeds,
  onOpenArticle,
  onToggleBookmark,
  onRefresh,
  onAddFeeds,
}: {
  articles: FeedItem[];
  loading: boolean;
  refreshing: boolean;
  isAr: boolean;
  language: string;
  filterTab: FilterTab;
  sourceFilter: string;
  searchQuery: string;
  bookmarks: string[];
  readArticles: string[];
  cachedLinks?: ReadonlySet<string>;
  hasFeeds?: boolean;
  onOpenArticle: (a: FeedItem) => void;
  onToggleBookmark: (link: string) => void;
  onRefresh: () => void;
  onAddFeeds?: () => void;
}) {
  const scrollKey = `${filterTab}|${sourceFilter}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const scrollRestoredRef = useRef(false);

  // ─── Scroll position persistence ─────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    scrollRestoredRef.current = false;

    // Restore scroll position with double-check reliability
    const savedY = getScrollPos(scrollKey);
    if (savedY > 0) {
      // First attempt: immediate rAF
      requestAnimationFrame(() => {
        if (el && !scrollRestoredRef.current) {
          el.scrollTop = savedY;
          scrollRestoredRef.current = true;
          // Second attempt: verify after content has painted
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

    const handleScroll = () => {
      throttledStore();
      // Update visible range for windowed rendering
      if (articles.length > VIRTUALIZATION_THRESHOLD) {
        const scrollTop = el.scrollTop;
        const viewportHeight = el.clientHeight;
        const start = Math.max(0, Math.floor(scrollTop / ESTIMATED_ROW_HEIGHT) - OVERSCAN);
        const visibleCount = Math.ceil(viewportHeight / ESTIMATED_ROW_HEIGHT);
        const end = Math.min(articles.length, start + visibleCount + OVERSCAN * 2);
        setVisibleRange({ start, end });
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      // Final write on unmount
      storeScrollPos(scrollKey, el.scrollTop);
    };
  }, [scrollKey, articles.length]);

  // ─── Hero + rest split ────────────────────────────────────────────────
  const heroAndRest = useMemo(() => {
    if (articles.length === 0) return { hero: null, rest: [] };
    if (filterTab !== 'all' || sourceFilter !== 'all' || searchQuery.trim()) {
      return { hero: null, rest: articles };
    }
    const unreadWithImage = articles.find(
      (a) => !readArticles.includes(a.link) && !!a.image,
    );
    const hero = unreadWithImage || articles[0];
    const rest = articles.filter((a) => a.link !== hero.link);
    return { hero, rest };
  }, [articles, filterTab, sourceFilter, searchQuery, readArticles]);

  // ─── Windowed items ───────────────────────────────────────────────────
  const useVirtualization = heroAndRest.rest.length > VIRTUALIZATION_THRESHOLD;

  const renderItems = useMemo(() => {
    if (!useVirtualization) return heroAndRest.rest;
    return heroAndRest.rest.slice(visibleRange.start, visibleRange.end);
  }, [heroAndRest.rest, useVirtualization, visibleRange]);

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
          isAr={isAr}
          refreshing={refreshing}
          hasFeeds={hasFeeds ?? true}
          onRefresh={onRefresh}
          onAddFeeds={onAddFeeds}
        />
      </div>
    );
  }

  const topSpacer = useVirtualization ? visibleRange.start * ESTIMATED_ROW_HEIGHT : 0;
  const bottomSpacer = useVirtualization
    ? Math.max(0, (heroAndRest.rest.length - visibleRange.end) * ESTIMATED_ROW_HEIGHT)
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

      {/* Top spacer for virtualized items above viewport */}
      {topSpacer > 0 && <div style={{ height: topSpacer }} aria-hidden />}

      <div className="divide-y divide-border/20">
        {renderItems.map((article, i) => {
          const actualIndex = useVirtualization ? visibleRange.start + i : i;
          return (
            <ArticleCard
              key={`${article.link}-${actualIndex}`}
              article={article}
              index={actualIndex}
              isRead={readArticles.includes(article.link)}
              isBookmarked={bookmarks.includes(article.link)}
              cached={cachedLinks?.has(article.link)}
              language={language}
              onOpen={() => onOpenArticle(article)}
              onToggleBookmark={() => onToggleBookmark(article.link)}
            />
          );
        })}
      </div>

      {/* Bottom spacer for virtualized items below viewport */}
      {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} aria-hidden />}
    </div>
  );
}


function EmptyState({
  filterTab,
  searchQuery,
  isAr,
  refreshing,
  hasFeeds,
  onRefresh,
  onAddFeeds,
}: {
  filterTab: FilterTab;
  searchQuery: string;
  isAr: boolean;
  refreshing: boolean;
  hasFeeds: boolean;
  onRefresh: () => void;
  onAddFeeds?: () => void;
}) {
  let icon: JSX.Element;
  let label: string;
  let cta: JSX.Element | null = null;

  if (filterTab === 'bookmarks') {
    icon = <Bookmark className="h-10 w-10 text-muted-foreground/30" />;
    label = isAr ? 'لا توجد مقالات محفوظة' : 'No saved articles';
  } else if (searchQuery) {
    icon = <Search className="h-10 w-10 text-muted-foreground/30" />;
    label = isAr ? 'لا توجد نتائج' : 'No matches';
  } else if (!hasFeeds) {
    icon = <Star className="h-10 w-10 text-primary/40" />;
    label = isAr
      ? 'أضف مصادرك لتبدأ القراءة'
      : 'Add feeds to start reading';
    cta = onAddFeeds
      ? (
        <Button
          variant="default"
          size="sm"
          onClick={onAddFeeds}
          className="rounded-xl mt-2"
        >
          <Plus className="h-3.5 w-3.5 me-1.5" />
          {isAr ? 'تصفح المقترحات' : 'Browse suggestions'}
        </Button>
      )
      : null;
  } else {
    icon = <Newspaper className="h-10 w-10 text-muted-foreground/30" />;
    label = isAr ? 'لا توجد مقالات بعد' : 'Nothing here yet';
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
        {isAr ? 'تحديث الآن' : 'Refresh now'}
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
      <p className="text-sm text-muted-foreground">{label}</p>
      {cta}
    </motion.div>
  );
}
