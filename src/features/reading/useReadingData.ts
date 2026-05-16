import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FeedItem, FeedSource, FeedStatus } from './types';
import { offlineDb } from './offlineDb';
import {
  LAST_REFRESH_KEY,
  getBookmarks,
  getOfflinePrefs,
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
  const [cachedLinks, setCachedLinks] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [lastRefresh, setLastRefresh] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(LAST_REFRESH_KEY) : null,
  );
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Even without enabled feeds, surface anything the user has
      // archived offline so the Saved tab still shows content.
      try {
        const offline = await offlineDb.listArticles();
        setArticles(offline);
        setTotalInDB(offline.length);
      } catch {
        setArticles([]);
        setTotalInDB(0);
      }
      return;
    }
    let online: FeedItem[] = [];
    let onlineCount = 0;
    let onlineFailed = false;
    try {
      const { data, count } = await supabase
        .from('rss_articles')
        .select('*', { count: 'exact' })
        .in('source_name', enabledNames)
        .order('pub_date', { ascending: false })
        .limit(500);
      if (data) {
        online = data.map((r: any) => ({
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
        onlineCount = count || online.length;
      }
    } catch (e) {
      console.error('Reading: DB load failed', e);
      onlineFailed = true;
    }

    // Always merge in offline archive (saved articles, plus anything
    // cached for offline reading) so we have content even when the
    // network is down. De-dupe by link, keeping online's metadata
    // when both sources have the same article.
    let offline: FeedItem[] = [];
    try {
      offline = await offlineDb.listArticles();
    } catch { /* IDB unavailable */ }

    if (onlineFailed && offline.length === 0 && online.length === 0) {
      // Hard offline + nothing cached. Leave articles empty so the
      // empty state shows; don't blow away whatever was already
      // in state from a prior render.
      return;
    }

    const seen = new Set<string>();
    const merged: FeedItem[] = [];
    for (const a of online) {
      if (a.link && !seen.has(a.link)) {
        seen.add(a.link);
        merged.push(a);
      }
    }
    for (const a of offline) {
      if (a.link && !seen.has(a.link)) {
        seen.add(a.link);
        merged.push(a);
      }
    }
    setArticles(merged);
    setTotalInDB(onlineCount || merged.length);
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

  /**
   * Bulk-add feeds (OPML import). We add every new feed to local state
   * in one shot, persist once, then trigger a single batched
   * `refreshFeeds` rather than firing N parallel edge-function
   * invocations. fetch-rss caps each request at MAX_FEEDS_PER_REQUEST
   * (50) so a 200-feed Feedly export still finishes safely.
   */
  const addFeedsBulk = useCallback(
    async (
      feeds: ReadonlyArray<{ url: string; name: string; category: string; enabled?: boolean }>,
    ): Promise<{ added: number; skipped: number }> => {
      const existingByUrl = new Map(feedSources.map((f) => [f.url, f] as const));
      const fresh: FeedSource[] = [];
      let skipped = 0;
      for (const f of feeds) {
        const url = f.url.trim();
        if (!url) {
          skipped++;
          continue;
        }
        if (existingByUrl.has(url)) {
          skipped++;
          continue;
        }
        const name = f.name.trim() || (() => {
          try { return new URL(url).hostname; } catch { return 'Feed'; }
        })();
        fresh.push({
          url,
          name,
          category: f.category || 'other',
          enabled: f.enabled !== false,
        });
        existingByUrl.set(url, fresh[fresh.length - 1]);
      }
      if (fresh.length === 0) return { added: 0, skipped };
      const next = [...feedSources, ...fresh];
      setFeedSources(next);
      storeFeeds(next);
      // refreshFeeds reads from `enabledFeeds`, which is derived from
      // `feedSources` state. State update is asynchronous, so kick off
      // the refresh on the next microtask after React schedules the
      // update — by then `enabledFeeds` will include the new feeds.
      // The `fetch-rss` function chunks at 50 feeds per call internally,
      // so we don't need to fan out manually.
      setTimeout(() => { void refreshFeeds(true); }, 0);
      return { added: fresh.length, skipped };
    },
    [feedSources, refreshFeeds],
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

  // ─── Offline auto-cache ────────────────────────────────────────────────
  // Whenever `articles` or `bookmarks` changes, reconcile the
  // IndexedDB store so the user's "auto-cache last N unread"
  // preference is honoured. We always include bookmarked links
  // regardless of the cap, so explicit saves are never bumped out by
  // the rolling N-most-recent-unread window. Debounced 600 ms so a
  // burst of state updates doesn't trigger a write storm.
  const recacheNow = useCallback(async (): Promise<void> => {
    if (!offlineDb.available()) return;
    const prefs = getOfflinePrefs();
    const bookmarkSet = new Set(bookmarks);
    const readSet = new Set(readArticles);

    // Pick the auto-cache window: most recent unread, capped at N.
    let toKeep: FeedItem[] = [];
    if (prefs.autoCacheCount > 0) {
      const sorted = [...articles].sort((a, b) => {
        const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return db - da;
      });
      for (const a of sorted) {
        if (toKeep.length >= prefs.autoCacheCount) break;
        if (a.link && !readSet.has(a.link) && !bookmarkSet.has(a.link)) {
          toKeep.push(a);
        }
      }
    }

    // Always cache every bookmarked article we currently have a copy of.
    const linkToArticle = new Map(articles.map((a) => [a.link, a] as const));
    const bookmarkedItems = bookmarks
      .map((l) => linkToArticle.get(l))
      .filter((a): a is FeedItem => !!a);

    const sync = await offlineDb.syncArticles(
      [...toKeep, ...bookmarkedItems],
      bookmarks,
    );

    // Refresh image cache too, but only if the user wants it.
    if (prefs.cacheImages) {
      const urls: string[] = [];
      for (const a of [...toKeep, ...bookmarkedItems]) {
        if (a.image) urls.push(a.image);
      }
      if (urls.length > 0 && typeof navigator !== 'undefined') {
        try {
          const reg = await navigator.serviceWorker?.ready;
          reg?.active?.postMessage({ type: 'reading:precache', urls });
        } catch { /* SW unavailable, ignore */ }
      }
    }

    // Refresh the cachedLinks indicator set.
    try {
      const list = await offlineDb.listArticles();
      setCachedLinks(new Set(list.map((a) => a.link)));
    } catch { /* */ }

    return sync as unknown as void;
  }, [articles, bookmarks, readArticles]);

  // Debounce auto-cache so frequent state updates don't write-storm IDB.
  useEffect(() => {
    if (autoCacheTimerRef.current) clearTimeout(autoCacheTimerRef.current);
    autoCacheTimerRef.current = setTimeout(() => {
      void recacheNow();
    }, 600);
    return () => {
      if (autoCacheTimerRef.current) clearTimeout(autoCacheTimerRef.current);
    };
  }, [recacheNow]);

  // Initial load of cachedLinks (so the offline dot renders before the
  // first refresh fires).
  useEffect(() => {
    if (!offlineDb.available()) return;
    let cancelled = false;
    offlineDb.listArticles()
      .then((list) => {
        if (!cancelled) setCachedLinks(new Set(list.map((a) => a.link)));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

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
    cachedLinks,
    // actions
    refreshFeeds,
    toggleBookmark,
    markAsRead,
    markAllRead,
    addFeed,
    addSuggestedFeed,
    addFeedsBulk,
    removeFeed,
    toggleFeedEnabled,
    recacheNow,
  };
}

export type ReadingData = ReturnType<typeof useReadingData>;
