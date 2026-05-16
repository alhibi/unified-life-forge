import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FeedItem, FeedSource, FeedStatus } from './types';
import {
  LAST_REFRESH_KEY,
  getBookmarks,
  getReadArticles,
  getStoredFeeds,
  storeBookmarks,
  storeFeeds,
  storeReadArticles,
} from './storage';

/**
 * Centralised data layer for the reading feature.
 *
 *  - Loads and caches feeds + articles from Supabase.
 *  - Performs background refresh on a configurable cadence.
 *  - Owns bookmarks + read state, persists them to localStorage.
 *  - Exposes `refresh`, `addFeed`, `removeFeed`, etc. as stable callbacks.
 *
 * Splitting this from the page component keeps the page focused on
 * presentation and lets us add additional UIs (e.g. a small home-screen
 * widget) without duplicating any logic.
 */
export function useReadingData(opts: { isAr: boolean }) {
  const { isAr } = opts;

  const [feedSources, setFeedSources] = useState<FeedSource[]>(getStoredFeeds);
  const [articles, setArticles] = useState<FeedItem[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>(getBookmarks);
  const [readArticles, setReadArticles] = useState<string[]>(getReadArticles);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statuses, setStatuses] = useState<FeedStatus[]>([]);
  const [totalInDB, setTotalInDB] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(LAST_REFRESH_KEY) : null,
  );
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const enabledFeeds = useMemo(
    () => feedSources.filter((f) => f.enabled),
    [feedSources],
  );
  const enabledNames = useMemo(
    () => enabledFeeds.map((f) => f.name),
    [enabledFeeds],
  );

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach((a) => {
      counts[a.source] = (counts[a.source] || 0) + 1;
    });
    return counts;
  }, [articles]);

  // ─── Load articles from DB ────────────────────────────────────────────
  const loadFromDB = useCallback(async () => {
    if (enabledNames.length === 0) {
      setArticles([]);
      setTotalInDB(0);
      return;
    }
    try {
      const { data, count } = await supabase
        .from('rss_articles')
        .select('*', { count: 'exact' })
        .in('source_name', enabledNames)
        .order('pub_date', { ascending: false })
        .limit(500);
      if (data) {
        const items: FeedItem[] = data.map((r: any) => ({
          title: r.title,
          link: r.link,
          description: r.description || '',
          fullContent: r.full_content || '',
          pubDate: r.pub_date || r.created_at || '',
          image: r.image,
          images: r.images || [],
          author: r.author,
          source: r.source_name,
        }));
        setArticles(items);
        setTotalInDB(count || items.length);
      }
    } catch (e) {
      console.error('Reading: DB load failed', e);
    }
  }, [enabledNames]);

  // ─── Refresh from edge function ───────────────────────────────────────
  const refreshFeeds = useCallback(
    async (silent = false) => {
      if (enabledFeeds.length === 0) return;
      if (!silent) setRefreshing(true);
      try {
        const nameMap: Record<string, string> = {};
        enabledFeeds.forEach((f) => {
          nameMap[f.url] = f.name;
        });

        const { data, error } = await supabase.functions.invoke('fetch-rss', {
          body: {
            urls: enabledFeeds.map((f) => f.url),
            limit: 100,
            fetchFullContent: true,
            store: true,
            nameMap,
          },
        });

        if (error) throw error;

        if (Array.isArray(data?.statuses)) {
          setStatuses(data.statuses as FeedStatus[]);
        }

        const now = new Date().toISOString();
        setLastRefresh(now);
        try { localStorage.setItem(LAST_REFRESH_KEY, now); } catch { /* quota */ }

        // Re-pull from DB so we reflect the freshly persisted articles.
        await loadFromDB();

        if (!silent) {
          const failed = (data?.errors || []).length as number;
          if (failed > 0) {
            toast.warning(
              isAr
                ? `تم التحديث، لكن فشل ${failed} مصدر`
                : `Refreshed, but ${failed} feed(s) failed`,
            );
          } else {
            toast.success(isAr ? 'تم التحديث' : 'Refreshed');
          }
        }
      } catch (e) {
        console.error('Reading: refresh failed', e);
        if (!silent) toast.error(isAr ? 'فشل التحديث' : 'Refresh failed');
      } finally {
        setRefreshing(false);
      }
    },
    [enabledFeeds, isAr, loadFromDB],
  );

  // ─── Lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadFromDB().finally(() => {
      if (cancelled) return;
      setLoading(false);
      const last = localStorage.getItem(LAST_REFRESH_KEY);
      const stale = !last ||
        Date.now() - new Date(last).getTime() > 30 * 60 * 1000;
      if (stale) refreshFeeds(true);
    });
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    autoRefreshRef.current = setInterval(
      () => refreshFeeds(true),
      60 * 60 * 1000,
    );
    return () => {
      cancelled = true;
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [loadFromDB, refreshFeeds]);

  // ─── Bookmark / read mutations ────────────────────────────────────────
  const toggleBookmark = useCallback((link: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(link)
        ? prev.filter((b) => b !== link)
        : [...prev, link];
      storeBookmarks(next);
      return next;
    });
  }, []);

  const markAsRead = useCallback((link: string) => {
    setReadArticles((prev) => {
      if (prev.includes(link)) return prev;
      const next = [...prev, link];
      storeReadArticles(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadArticles((prev) => {
      const allLinks = articles.map((a) => a.link).filter(Boolean);
      const set = new Set(prev);
      allLinks.forEach((l) => set.add(l));
      const next = Array.from(set);
      storeReadArticles(next);
      return next;
    });
    toast.success(isAr ? 'تم التحديد كمقروء' : 'Marked as read');
  }, [articles, isAr]);

  // ─── Feed CRUD ─────────────────────────────────────────────────────────
  const fetchSingleFeed = useCallback(
    async (feed: FeedSource) => {
      try {
        const nameMap: Record<string, string> = { [feed.url]: feed.name };
        const { data, error } = await supabase.functions.invoke('fetch-rss', {
          body: {
            urls: [feed.url],
            limit: 100,
            fetchFullContent: true,
            store: true,
            nameMap,
          },
        });
        if (error) throw error;
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        const feeds = responseData?.feeds || [];
        const fresh: FeedItem[] = [];
        for (const f of feeds) {
          for (const item of f.items || []) {
            fresh.push({
              title: item.title || '',
              link: item.link || '',
              description: item.description || '',
              fullContent: item.fullContent || '',
              pubDate: item.pubDate || '',
              image: item.image || null,
              images: item.images || [],
              author: item.author,
              source: feed.name,
            });
          }
        }
        if (fresh.length > 0) {
          setArticles((prev) => {
            const seen = new Set(prev.map((a) => a.link));
            const newOnes = fresh.filter((a) => a.link && !seen.has(a.link));
            const merged = [...prev, ...newOnes].sort((a, b) => {
              const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
              const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
              return db - da;
            });
            return merged;
          });
          toast.success(
            isAr
              ? `تمت إضافة ${fresh.length} مقال من ${feed.name}`
              : `Imported ${fresh.length} from ${feed.name}`,
          );
        } else {
          toast.info(
            isAr
              ? `لا توجد مقالات من ${feed.name}`
              : `No articles from ${feed.name}`,
          );
        }
      } catch (e: any) {
        toast.error(
          isAr
            ? `فشل جلب ${feed.name}: ${e?.message || ''}`
            : `Failed to fetch ${feed.name}: ${e?.message || ''}`,
        );
      }
    },
    [isAr],
  );

  const addFeed = useCallback(
    (url: string, name: string, category: string) => {
      const trimmed = url.trim();
      if (!trimmed) return false;
      if (feedSources.some((f) => f.url === trimmed)) {
        toast.error(isAr ? 'هذا المصدر موجود' : 'Feed already exists');
        return false;
      }
      const feed: FeedSource = {
        url: trimmed,
        name: name.trim() || (() => {
          try { return new URL(trimmed).hostname; } catch { return 'Feed'; }
        })(),
        category: category || 'news',
        enabled: true,
      };
      const next = [...feedSources, feed];
      setFeedSources(next);
      storeFeeds(next);
      fetchSingleFeed(feed);
      return true;
    },
    [feedSources, isAr, fetchSingleFeed],
  );

  const addSuggestedFeed = useCallback(
    (feed: FeedSource) => {
      if (feedSources.some((f) => f.url === feed.url)) {
        toast.error(isAr ? 'هذا المصدر موجود' : 'Feed already exists');
        return;
      }
      const next = [...feedSources, { ...feed }];
      setFeedSources(next);
      storeFeeds(next);
      fetchSingleFeed(feed);
    },
    [feedSources, isAr, fetchSingleFeed],
  );

  const removeFeed = useCallback(
    (url: string) => {
      const next = feedSources.filter((f) => f.url !== url);
      setFeedSources(next);
      storeFeeds(next);
      toast.success(isAr ? 'تم الحذف' : 'Removed');
    },
    [feedSources, isAr],
  );

  const toggleFeedEnabled = useCallback(
    (url: string) => {
      const next = feedSources.map((f) =>
        f.url === url ? { ...f, enabled: !f.enabled } : f,
      );
      setFeedSources(next);
      storeFeeds(next);
    },
    [feedSources],
  );

  return {
    // state
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
    // actions
    refreshFeeds,
    toggleBookmark,
    markAsRead,
    markAllRead,
    addFeed,
    addSuggestedFeed,
    removeFeed,
    toggleFeedEnabled,
  };
}

export type ReadingData = ReturnType<typeof useReadingData>;
