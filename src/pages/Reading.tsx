import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Clock, Database, Wifi, WifiOff } from 'lucide-react';
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
} from '@/features/reading/storage';
import { useReadingData } from '@/features/reading/useReadingData';
import { ListHeader } from '@/features/reading/ListHeader';
import { ArticleList } from '@/features/reading/ArticleList';
import { ArticleReader } from '@/features/reading/ArticleReader';
import { ManageFeedsView } from '@/features/reading/ManageFeedsView';
import { SuggestedFeedsView } from '@/features/reading/SuggestedFeedsView';
import { PullToRefresh } from '@/features/reading/PullToRefresh';
import { SearchPanel } from '@/features/reading/SearchPanel';
import { KeywordAlertsView } from '@/features/reading/KeywordAlertsView';
import { ReaderView } from '@/features/reading/ReaderView';
import { timeAgo } from '@/features/reading/utils';
import { offlineDb } from '@/features/reading/offlineDb';
import { registerReadingServiceWorker } from '@/features/reading/registerSw';

/**
 * Reading (إطلاع) page — thin shell that wires together the feature
 * components in `src/features/reading/`. The heavy lifting (data
 * fetching, persistence, animations, layouts) lives in the feature
 * folder so this file stays scannable.
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
    markAllRead,
    addFeed,
    addSuggestedFeed,
    removeFeed,
    toggleFeedEnabled,
  } = data;

  // ─── View state ───────────────────────────────────────────────────────
  const [view, setView] = useState<View>('list');
  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [unseenAlerts, setUnseenAlerts] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  // ─── Reader prefs (persisted) ─────────────────────────────────────────
  const [readerPrefs, setReaderPrefs] = useState<ReaderPrefs>(getReaderPrefs);
  useEffect(() => { storeReaderPrefs(readerPrefs); }, [readerPrefs]);

  // ─── Service worker + offline cache lifecycle ────────────────────────
  useEffect(() => {
    void registerReadingServiceWorker();
    // Periodic prune of stale archived articles (run once per session)
    void offlineDb.pruneOlderThan().catch(() => undefined);
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
  // Whenever an article is bookmarked we save its full content + image
  // to IndexedDB. Removing a bookmark prunes it from the offline cache.
  useEffect(() => {
    if (!offlineDb.available()) return;
    const bookmarkSet = new Set(bookmarks);
    // Save anything that's bookmarked + currently in our list
    for (const article of articles) {
      if (bookmarkSet.has(article.link)) {
        void offlineDb.saveArticle(article).catch(() => undefined);
      }
    }
  }, [bookmarks, articles]);

  // ─── Unseen keyword alert count ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let chan: ReturnType<typeof supabase.channel> | null = null;
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || cancelled) return;
      const { count } = await supabase.from('keyword_alert_hits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.user.id)
        .eq('seen', false);
      if (!cancelled && typeof count === 'number') setUnseenAlerts(count);

      chan = supabase
        .channel(`alert-hits-badge-${userData.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'keyword_alert_hits',
            filter: `user_id=eq.${userData.user.id}`,
          },
          () => {
            // Re-count on any change (insert / mark-read).
            supabase.from('keyword_alert_hits')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userData.user.id)
              .eq('seen', false)
              .then(({ count }) => {
                if (typeof count === 'number') setUnseenAlerts(count);
              });
          },
        )
        .subscribe();
    };
    load();
    return () => {
      cancelled = true;
      if (chan) supabase.removeChannel(chan);
    };
  }, []);

  // ─── Filtered article view ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = articles;
    if (filterTab === 'bookmarks') {
      list = list.filter((a) => bookmarks.includes(a.link));
    } else if (filterTab === 'unread') {
      list = list.filter((a) => !readArticles.includes(a.link));
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
    sourceFilter,
    searchQuery,
    bookmarks,
    readArticles,
  ]);

  const unreadCount = useMemo(
    () => articles.filter((a) => !readArticles.includes(a.link)).length,
    [articles, readArticles],
  );

  const enabledNames = useMemo(
    () => enabledFeeds.map((f) => f.name),
    [enabledFeeds],
  );

  // ─── Navigation handlers ──────────────────────────────────────────────
  const openArticle = (article: FeedItem) => {
    setSelectedArticle(article);
    markAsRead(article.link);
    setView('article');
  };

  const openLinkInReader = (
    link: string,
    title: string,
    source: string | null,
  ) => {
    // If the link matches an article we already have, open it inline.
    const known = articles.find((a) => a.link === link);
    if (known) {
      openArticle(known);
      return;
    }
    // Otherwise treat it as an external URL and open the Reader View.
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
        setView('list');
        setSelectedArticle(null);
        break;
      default:
        navigate('/');
    }
  };

  const refreshTimeAgo = lastRefresh ? timeAgo(lastRefresh, language) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <SEO
        title={isAr ? 'إطلاع — قارئ الأخبار — SmartHub' : 'Reading — RSS — SmartHub'}
        description={isAr
          ? 'قارئ RSS متكامل مع جلب المحتوى الكامل والمحفوظات.'
          : 'Full-content RSS reader with bookmarks and reading mode.'}
        path="/reading"
      />
      <AnimatePresence mode="wait">
        {view === 'article' && selectedArticle && (
          <ArticleReader
            key="article"
            article={selectedArticle}
            isBookmarked={bookmarks.includes(selectedArticle.link)}
            prefs={readerPrefs}
            isAr={isAr}
            language={language}
            onBack={goBack}
            onToggleBookmark={() => toggleBookmark(selectedArticle.link)}
            onChangePrefs={setReaderPrefs}
          />
        )}

        {view === 'reader' && (
          <ReaderView
            key="reader"
            isAr={isAr}
            language={language}
            prefs={readerPrefs}
            onChangePrefs={setReaderPrefs}
            onBack={goBack}
            initialUrl={selectedArticle?.link}
          />
        )}

        {view === 'suggested' && (
          <SuggestedFeedsView
            key="suggested"
            feedSources={feedSources}
            isAr={isAr}
            onBack={goBack}
            onAddSuggested={addSuggestedFeed}
          />
        )}

        {view === 'manage' && (
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
            onRemove={removeFeed}
            onToggleEnabled={toggleFeedEnabled}
          />
        )}

        {view === 'search' && (
          <SearchPanel
            key="search"
            isAr={isAr}
            language={language}
            restrictTo={enabledNames}
            onBack={goBack}
            onOpenArticle={openArticle}
          />
        )}

        {view === 'alerts' && (
          <KeywordAlertsView
            key="alerts"
            isAr={isAr}
            language={language}
            enabledFeeds={enabledFeeds}
            onBack={goBack}
            onOpenLink={openLinkInReader}
          />
        )}

        {view === 'list' && (
          <div key="list" className="flex flex-col flex-1 min-h-screen">
            <ListHeader
              isAr={isAr}
              onBack={goBack}
              showSearch={showSearch}
              setShowSearch={setShowSearch}
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
              enabledFeeds={enabledFeeds}
              sourceCounts={sourceCounts}
              articleCount={articles.length}
              unreadCount={unreadCount}
              bookmarksCount={bookmarks.length}
            />

            <PullToRefresh
              refreshing={refreshing}
              onRefresh={() => refreshFeeds(false)}
            >
              <ArticleList
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
                onOpenArticle={openArticle}
                onToggleBookmark={toggleBookmark}
                onRefresh={() => refreshFeeds(false)}
              />
            </PullToRefresh>

            <div className="px-4 py-2.5 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Database className="h-3 w-3" />
                {isAr ? `${totalInDB} مقال محفوظ` : `${totalInDB} archived`}
              </span>
              <span className="flex items-center gap-1.5">
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
              </span>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
