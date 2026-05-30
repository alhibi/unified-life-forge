import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Database, RefreshCw, Wifi, WifiOff } from '@/lib/icons';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

import type {
  FeedItem,
  FilterTab,
  ReaderPrefs,
  View,
} from '@/features/reading/types';
import {
  getReaderPrefs,
  storeReaderPrefs,
  getOfflinePrefs,
} from '@/features/reading/storage';
import { useListPrefs } from '@/features/reading/listPrefs';
import { useReadingData } from '@/features/reading/useReadingData';
import { ListHeader } from '@/features/reading/ListHeader';
import { ArticleListGrouped } from '@/features/reading/ArticleListGrouped';
import { PullToRefresh } from '@/features/reading/PullToRefresh';
import { ReadingErrorBoundary } from '@/features/reading/ReadingErrorBoundary';
import { timeAgo } from '@/features/reading/utils';
import { offlineDb } from '@/features/reading/offlineDb';
import { registerReadingServiceWorker } from '@/features/reading/registerSw';

// Heavy sub-views are loaded on demand to keep the initial Reading
// bundle small. The list view (default) ships immediately; everything
// else streams in when the user opens that surface.
const ArticleReader = lazy(() => import('@/features/reading/ArticleReader').then(m => ({ default: m.ArticleReader })));
const ManageFeedsView = lazy(() => import('@/features/reading/ManageFeedsView').then(m => ({ default: m.ManageFeedsView })));
const SuggestedFeedsView = lazy(() => import('@/features/reading/SuggestedFeedsView').then(m => ({ default: m.SuggestedFeedsView })));
const SearchPanel = lazy(() => import('@/features/reading/SearchPanel').then(m => ({ default: m.SearchPanel })));
const KeywordAlertsView = lazy(() => import('@/features/reading/KeywordAlertsView').then(m => ({ default: m.KeywordAlertsView })));
const StorageView = lazy(() => import('@/features/reading/StorageView').then(m => ({ default: m.StorageView })));
const CronView = lazy(() => import('@/features/reading/CronView').then(m => ({ default: m.CronView })));
const ReaderView = lazy(() => import('@/features/reading/ReaderView').then(m => ({ default: m.ReaderView })));

const SubviewFallback = () => (
  <div className="min-h-screen p-4 space-y-3">
    <div className="skeleton h-10 w-32" />
    <div className="skeleton h-24 w-full" />
    <div className="skeleton h-24 w-full" />
  </div>
);

/**
 * Reading (إطلاع) page — thin shell that wires together the feature
 * components in `src/features/reading/`. The heavy lifting (data
 * fetching, persistence, animations, layouts) lives in the feature
 * folder so this file stays scannable.
 *
 * Layout-mode awareness (added in the ReadYou/CapyReader inspired
 * upgrade):
 *  - On lg+ screens with `twoPaneOnDesktop` enabled, the article
 *    view renders alongside the list as a split pane (35/65). On
 *    smaller screens we keep the single-pane stacked behaviour.
 *  - All non-article subviews (manage, search, alerts…) stay
 *    single-pane regardless of screen size — those are flow-
 *    disrupting and benefit from focus.
 */
export default function ReadingPage() {
  const { language } = useApp();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  const data = useReadingData({ isAr });
  const {
    feedSources,
    enabledFeeds,
    articles,
    bookmarks,
    readArticles,
    loading,
    refreshing,
    statuses,
    totalInDB,
    lastRefresh,
    sourceCounts,
    refreshFeeds,
    toggleBookmark,
    markAsRead,
    markAsUnread,
    markManyRead,
    markAllRead,
    addFeed,
    addSuggestedFeed,
    addFeedsBulk,
    removeFeed,
    toggleFeedEnabled,
    cachedLinks,
    recacheNow,
    ensureFullContent,
    cancelFullContentFetch,
  } = data;

  // ─── List display preferences (persisted) ────────────────────────────
  const [listPrefs, updateListPrefs] = useListPrefs();

  // ─── View state ───────────────────────────────────────────────────────
  const [view, setView] = useState<View>('list');
  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [unseenAlerts, setUnseenAlerts] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  // ─── Wide-screen detection (for two-pane layout) ─────────────────────
  // We watch `lg` breakpoint via matchMedia rather than relying on CSS
  // alone because the rendering branch (split vs stacked) depends on
  // it. Updates whenever the viewport crosses 1024 px.
  const [isWideScreen, setIsWideScreen] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => setIsWideScreen(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  /** True when we should render article alongside list, not on top. */
  const useTwoPane =
    isWideScreen && listPrefs.twoPaneOnDesktop && view === 'article';

  // ─── Reader prefs (persisted) ─────────────────────────────────────────
  const [readerPrefs, setReaderPrefs] = useState<ReaderPrefs>(getReaderPrefs);
  useEffect(() => { storeReaderPrefs(readerPrefs); }, [readerPrefs]);

  // ─── Service worker + offline cache lifecycle ────────────────────────
  useEffect(() => {
    void registerReadingServiceWorker();
    // Articles are stored permanently — no pruning. The archive only grows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Online/offline tracking ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOn = () => setIsOnline(true);
    const onOff = () => setIsOnline(false);
    window.addEventListener('online', onOn);
    window.addEventListener('offline', onOff);
    return () => {
      window.removeEventListener('online', onOn);
      window.removeEventListener('offline', onOff);
    };
  }, []);

  // ─── Cache bookmarked articles for offline reading ────────────────────
  const savedThisSession = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!offlineDb.available()) return;
    const bookmarkSet = new Set(bookmarks);
    const articleByLink = new Map(articles.map((a) => [a.link, a] as const));

    const toSave: typeof articles = [];
    for (const link of bookmarkSet) {
      if (savedThisSession.current.has(link)) continue;
      savedThisSession.current.add(link);
      const article = articleByLink.get(link);
      if (article) {
        toSave.push(article);
      } else {
        toSave.push({
          title: link,
          link,
          description: '',
          pubDate: '',
          image: null,
          images: [],
          source: '',
        });
      }
    }

    if (toSave.length > 0) {
      void offlineDb.saveArticlesBatch(toSave).catch(() => undefined);
    }

    const toRemove: string[] = [];
    for (const link of Array.from(savedThisSession.current)) {
      if (!bookmarkSet.has(link)) {
        savedThisSession.current.delete(link);
        toRemove.push(link);
      }
    }
    if (toRemove.length > 0) {
      void offlineDb.removeArticlesBatch(toRemove).catch(() => undefined);
    }
  }, [bookmarks, articles]);

  // ─── Unseen keyword alert count ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let chan: ReturnType<typeof supabase.channel> | null = null;

    const tearDown = () => {
      if (chan) {
        supabase.removeChannel(chan);
        chan = null;
      }
    };

    const recount = async (userId: string) => {
      try {
        const { count } = await supabase.from('keyword_alert_hits')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('seen', false);
        if (!cancelled && typeof count === 'number') setUnseenAlerts(count);
      } catch { /* network blip */ }
    };

    let recountTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRecount = (userId: string) => {
      if (recountTimer) clearTimeout(recountTimer);
      recountTimer = setTimeout(() => { void recount(userId); }, 250);
    };

    const subscribe = (userId: string) => {
      tearDown();
      void recount(userId);
      chan = supabase
        .channel(`alert-hits-badge-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'keyword_alert_hits',
            filter: `user_id=eq.${userId}`,
          },
          () => scheduleRecount(userId),
        )
        .subscribe();
    };

    void supabase.auth.getUser().then(({ data: userData }) => {
      if (cancelled) return;
      if (userData.user) subscribe(userData.user.id);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        subscribe(session.user.id);
      } else {
        tearDown();
        setUnseenAlerts(0);
      }
    });

    return () => {
      cancelled = true;
      if (recountTimer) clearTimeout(recountTimer);
      tearDown();
      authSub.subscription.unsubscribe();
    };
  }, []);

  // ─── Filtered article view ────────────────────────────────────────────
  // Now layered: filter tab → category folder → source → search query.
  const filtered = useMemo(() => {
    let list = articles;
    if (filterTab === 'bookmarks') {
      const articleByLink = new Map(articles.map((a) => [a.link, a] as const));
      list = bookmarks.map((link): FeedItem =>
        articleByLink.get(link) ?? {
          title: link,
          link,
          description: '',
          pubDate: '',
          image: null,
          images: [],
          source: '',
        },
      );
    } else if (filterTab === 'unread') {
      list = list.filter((a) => !readArticles.includes(a.link));
    }
    // Category filter (folder): keep only articles whose source feed
    // belongs to the selected category. This requires a source→category
    // lookup since articles only carry the source name.
    if (categoryFilter !== 'all') {
      const allowedSources = new Set(
        enabledFeeds
          .filter((f) => (f.category || 'other') === categoryFilter)
          .map((f) => f.name),
      );
      list = list.filter((a) => allowedSources.has(a.source));
    }
    if (sourceFilter !== 'all') {
      list = list.filter((a) => a.source === sourceFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q) ||
          a.source.toLowerCase().includes(q),
      );
    }
    return list;
  }, [
    articles,
    filterTab,
    categoryFilter,
    sourceFilter,
    searchQuery,
    bookmarks,
    readArticles,
    enabledFeeds,
  ]);

  const unreadCount = useMemo(
    () => articles.filter((a) => !readArticles.includes(a.link)).length,
    [articles, readArticles],
  );

  const enabledNames = useMemo(
    () => enabledFeeds.map((f) => f.name),
    [enabledFeeds],
  );

  const searchRestrict = enabledNames.length > 0 ? enabledNames : undefined;

  // ─── Navigation handlers ──────────────────────────────────────────────
  /**
   * Open an article. Hardened path:
   *   1. Mark it read (which also persists to IDB immediately via the
   *      hook).
   *   2. If the article we have in memory is just a stub or excerpt,
   *      look in the offline DB for a richer cached copy and use that
   *      as the initial render seed. The reader will further upgrade
   *      it via extract-article if still short.
   *
   * Result: the user always sees the best version we've ever managed
   * to capture for this article — never a regression from a stale
   * memory copy when IDB has the full body.
   */
  const openArticle = async (article: FeedItem): Promise<void> => {
    let toOpen = article;
    // If our memory copy is a stub or short excerpt, prefer a cached
    // upgrade if one exists. Run synchronously *before* the view
    // transition so the reader doesn't briefly show a blank.
    if (
      offlineDb.available() &&
      (!article.fullContent || article.fullContent.length < 400)
    ) {
      try {
        const cached = await offlineDb.getArticle(article.link);
        if (
          cached &&
          (cached.fullContent || '').length > (article.fullContent || '').length
        ) {
          toOpen = {
            ...article,
            fullContent: cached.fullContent,
            description: cached.description || article.description,
            image: cached.image || article.image,
            images: cached.images?.length ? cached.images : article.images,
            author: cached.author || article.author,
            pubDate: cached.pubDate || article.pubDate,
          };
        }
      } catch { /* IDB unavailable; fall back to in-memory copy */ }
    }
    setSelectedArticle(toOpen);
    markAsRead(toOpen.link);
    setView('article');
  };

  /** Cancel any in-flight content upgrade when the article view closes. */
  const onArticleBack = () => {
    if (selectedArticle) cancelFullContentFetch(selectedArticle.link);
    goBack();
  };

  const openLinkInReader = (
    link: string,
    title: string,
    source: string | null,
  ) => {
    const known = articles.find((a) => a.link === link);
    if (known) {
      openArticle(known);
      return;
    }
    setSelectedArticle({
      title,
      link,
      description: '',
      pubDate: '',
      image: null,
      images: [],
      source: source ?? '',
    });
    setView('reader');
  };

  const goBack = () => {
    switch (view) {
      case 'article':
        setView('list');
        setSelectedArticle(null);
        break;
      case 'suggested':
        setView('manage');
        break;
      case 'manage':
      case 'search':
      case 'alerts':
      case 'reader':
      case 'storage':
      case 'cron':
        setView('list');
        setSelectedArticle(null);
        break;
      default:
        navigate('/');
    }
  };

  const refreshTimeAgo = lastRefresh ? timeAgo(lastRefresh, language) : null;

  const toggleSearch = (next: boolean) => {
    setShowSearch(next);
    if (!next) setSearchQuery('');
  };

  // ─── Reusable list-pane (used in both single- and two-pane modes) ────
  const listPane = (
    <div className="flex flex-col flex-1 min-h-screen">
      <ListHeader
        isAr={isAr}
        onBack={goBack}
        showSearch={showSearch}
        setShowSearch={toggleSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        refreshing={refreshing}
        onRefresh={() => refreshFeeds(false)}
        onManage={() => setView('manage')}
        onMarkAllRead={markAllRead}
        onOpenArchiveSearch={() => setView('search')}
        onOpenAlerts={() => setView('alerts')}
        onOpenReader={() => {
          setSelectedArticle(null);
          setView('reader');
        }}
        unseenAlerts={unseenAlerts}
        filterTab={filterTab}
        setFilterTab={setFilterTab}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        enabledFeeds={enabledFeeds}
        sourceCounts={sourceCounts}
        articleCount={articles.length}
        unreadCount={unreadCount}
        bookmarksCount={bookmarks.length}
        listPrefs={listPrefs}
        onListPrefsChange={updateListPrefs}
      />

      <PullToRefresh
        refreshing={refreshing}
        onRefresh={() => refreshFeeds(false)}
      >
        <ArticleListGrouped
          articles={filtered}
          loading={loading}
          refreshing={refreshing}
          isAr={isAr}
          language={language}
          filterTab={filterTab}
          sourceFilter={sourceFilter}
          searchQuery={searchQuery}
          bookmarks={bookmarks}
          readArticles={readArticles}
          cachedLinks={cachedLinks}
          hasFeeds={enabledFeeds.length > 0}
          prefs={listPrefs}
          onOpenArticle={openArticle}
          onToggleBookmark={toggleBookmark}
          onRefresh={() => refreshFeeds(false)}
          onAddFeeds={() => setView('suggested')}
          onMarkRead={markAsRead}
          onMarkUnread={markAsUnread}
          onMarkManyRead={markManyRead}
        />
      </PullToRefresh>

      <div className="px-4 py-2.5 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
        <button
          type="button"
          onClick={() => setView('storage')}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          title={isAr ? 'إدارة التخزين دون اتصال' : 'Manage offline storage'}
        >
          <Database className="h-3 w-3" />
          {isAr
            ? `${totalInDB} ${totalInDB === 1 ? 'مقال' : 'مقالاً'} محفوظ${totalInDB === 1 ? '' : 'ة'}`
            : `${totalInDB} archived`}
        </button>
        <button
          type="button"
          onClick={() => setView('cron')}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          title={isAr ? 'حالة التحديث التلقائي' : 'Refresh status'}
        >
          {!isOnline
            ? (<>
                <WifiOff className="h-3 w-3 text-amber-500" />
                {isAr ? 'بدون اتصال' : 'Offline'}
              </>)
            : refreshing
              ? (<>
                  <Wifi className="h-3 w-3 animate-pulse text-primary" />
                  {isAr ? 'جاري التحديث...' : 'Syncing...'}
                </>)
              : refreshTimeAgo
                ? (<>
                    <Clock className="h-3 w-3" />
                    {isAr
                      ? `آخر تحديث ${refreshTimeAgo}`
                      : `Updated ${refreshTimeAgo}`}
                  </>)
                : (<>
                    <Clock className="h-3 w-3" />
                    {isAr ? 'لم يتم التحديث بعد' : 'Not synced yet'}
                  </>)}
        </button>
      </div>
    </div>
  );

  return (
    <ReadingErrorBoundary lang={language}>
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <SEO
        title={isAr ? 'إطلاع — قارئ الأخبار — SmartHub' : 'Reading — RSS — SmartHub'}
        description={isAr
          ? 'قارئ RSS متكامل مع جلب المحتوى الكامل والمحفوظات.'
          : 'Full-content RSS reader with bookmarks and reading mode.'}
        path="/reading"
      />

      {/* Connection recovery banner */}
      {!isOnline && view === 'list' && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            {isAr
              ? 'لا يوجد اتصال — يتم عرض المحتوى المحفوظ'
              : 'No connection — showing cached content'}
          </span>
        </div>
      )}

      {/* Consecutive failure warning */}
      {data.consecutiveFailures >= 3 && isOnline && view === 'list' && (
        <div className="px-4 py-2 bg-destructive/5 border-b border-destructive/10 flex items-center gap-2 text-xs text-destructive/80">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            {isAr
              ? 'تعذّر التحديث عدة مرات — سيُعاد المحاولة تلقائياً'
              : 'Multiple refresh failures — will retry automatically'}
          </span>
          <button
            type="button"
            onClick={() => refreshFeeds(false)}
            className="shrink-0 p-1 rounded hover:bg-destructive/10 transition-colors"
            aria-label={isAr ? 'إعادة المحاولة' : 'Retry now'}
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Two-pane desktop layout — list + article side by side */}
      {useTwoPane && selectedArticle && (
        <div className="flex flex-1 min-h-screen">
          <aside className="w-[40%] max-w-[480px] border-e border-border/40 flex-shrink-0">
            {listPane}
          </aside>
          <main className="flex-1 min-w-0">
            <Suspense fallback={<SubviewFallback />}>
              <ArticleReader
                article={selectedArticle}
                isBookmarked={bookmarks.includes(selectedArticle.link)}
                prefs={readerPrefs}
                isAr={isAr}
                language={language}
                onBack={onArticleBack}
                onToggleBookmark={() => toggleBookmark(selectedArticle.link)}
                onChangePrefs={setReaderPrefs}
                onUpgradeContent={ensureFullContent}
              />
            </Suspense>
          </main>
        </div>
      )}

      {/* Single-pane (mobile, or two-pane disabled) */}
      {!useTwoPane && (
        <AnimatePresence mode="wait">
          {view === 'article' && selectedArticle && (
            <Suspense key="article-s" fallback={<SubviewFallback />}>
              <ArticleReader
                key="article"
                article={selectedArticle}
                isBookmarked={bookmarks.includes(selectedArticle.link)}
                prefs={readerPrefs}
                isAr={isAr}
                language={language}
                onBack={onArticleBack}
                onToggleBookmark={() => toggleBookmark(selectedArticle.link)}
                onChangePrefs={setReaderPrefs}
                onUpgradeContent={ensureFullContent}
              />
            </Suspense>
          )}

          {view === 'reader' && (
            <Suspense key="reader-s" fallback={<SubviewFallback />}>
              <ReaderView
                key="reader"
                isAr={isAr}
                language={language}
                prefs={readerPrefs}
                onChangePrefs={setReaderPrefs}
                onBack={goBack}
                initialUrl={selectedArticle?.link}
                isBookmarked={
                  selectedArticle ? bookmarks.includes(selectedArticle.link) : false
                }
                onToggleBookmark={toggleBookmark}
              />
            </Suspense>
          )}

          {view === 'suggested' && (
            <Suspense key="sugg-s" fallback={<SubviewFallback />}>
              <SuggestedFeedsView
                key="suggested"
                feedSources={feedSources}
                isAr={isAr}
                onBack={goBack}
                onAddSuggested={addSuggestedFeed}
                onAddBulk={addFeedsBulk}
              />
            </Suspense>
          )}

          {view === 'manage' && (
            <Suspense key="manage-s" fallback={<SubviewFallback />}>
              <ManageFeedsView
                key="manage"
                feedSources={feedSources}
                statuses={statuses}
                totalInDB={totalInDB}
                isAr={isAr}
                sourceCounts={sourceCounts}
                onBack={goBack}
                onSuggested={() => setView('suggested')}
                onAdd={addFeed}
                onAddBulk={addFeedsBulk}
                onRemove={removeFeed}
                onToggleEnabled={toggleFeedEnabled}
              />
            </Suspense>
          )}

          {view === 'search' && (
            <Suspense key="search-s" fallback={<SubviewFallback />}>
              <SearchPanel
                key="search"
                isAr={isAr}
                language={language}
                restrictTo={searchRestrict}
                onBack={goBack}
                onOpenArticle={openArticle}
              />
            </Suspense>
          )}

          {view === 'alerts' && (
            <Suspense key="alerts-s" fallback={<SubviewFallback />}>
              <KeywordAlertsView
                key="alerts"
                isAr={isAr}
                language={language}
                enabledFeeds={enabledFeeds}
                onBack={goBack}
                onOpenLink={openLinkInReader}
                onSignIn={() => navigate('/auth')}
              />
            </Suspense>
          )}

          {view === 'storage' && (
            <Suspense key="storage-s" fallback={<SubviewFallback />}>
              <StorageView
                key="storage"
                isAr={isAr}
                bookmarksCount={bookmarks.length}
                onBack={goBack}
                onRecacheNow={recacheNow}
              />
            </Suspense>
          )}

          {view === 'cron' && (
            <Suspense key="cron-s" fallback={<SubviewFallback />}>
              <CronView
                key="cron"
                isAr={isAr}
                language={language}
                feedSources={feedSources}
                onBack={goBack}
              />
            </Suspense>
          )}

          {view === 'list' && (
            <div key="list" className="contents">
              {listPane}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
    </ReadingErrorBoundary>
  );
}
