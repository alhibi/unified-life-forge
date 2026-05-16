import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, Newspaper, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FeedItem, FilterTab } from './types';
import { ArticleCard, HeroArticleCard } from './ArticleCard';
import { ArticleListSkeleton } from './Skeletons';
import { getScrollPos, storeScrollPos } from './storage';

/**
 * Renders the filtered article list. The first unread article is
 * promoted into a hero card; everything else falls into the standard
 * row layout. Scroll position is remembered per filter+source so going
 * into an article and back lands the user where they were.
 */
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
  onOpenArticle,
  onToggleBookmark,
  onRefresh,
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
  onOpenArticle: (a: FeedItem) => void;
  onToggleBookmark: (link: string) => void;
  onRefresh: () => void;
}) {
  const scrollKey = `${filterTab}|${sourceFilter}`;
  const containerRef = useRef<HTMLDivElement>(null);

  // Restore scroll on mount / when scrollKey changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const y = getScrollPos(scrollKey);
    if (y > 0) {
      // Defer until after children paint
      requestAnimationFrame(() => {
        el.scrollTop = y;
      });
    }
    const onScroll = () => storeScrollPos(scrollKey, el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollKey]);

  const heroAndRest = useMemo(() => {
    if (articles.length === 0) return { hero: null, rest: [] };
    // Promote the first unread article with an image to the hero slot;
    // fall back to the first unread article overall, then to the very
    // first article. Hero only when on the "all" tab and no source
    // filter — otherwise the layout feels noisy.
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
          onRefresh={onRefresh}
        />
      </div>
    );
  }

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
      <div className="divide-y divide-border/20">
        {heroAndRest.rest.map((article, i) => (
          <ArticleCard
            key={`${article.link}-${i}`}
            article={article}
            index={i}
            isRead={readArticles.includes(article.link)}
            isBookmarked={bookmarks.includes(article.link)}
            cached={cachedLinks?.has(article.link)}
            language={language}
            onOpen={() => onOpenArticle(article)}
            onToggleBookmark={() => onToggleBookmark(article.link)}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  filterTab,
  searchQuery,
  isAr,
  refreshing,
  onRefresh,
}: {
  filterTab: FilterTab;
  searchQuery: string;
  isAr: boolean;
  refreshing: boolean;
  onRefresh: () => void;
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
