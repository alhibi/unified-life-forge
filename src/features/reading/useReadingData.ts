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
import { fetchFeedsClientSide, isSupabaseAvailable } from './clientFetcher';
import { dedupe, withRetry } from '@/lib/fetchRetry';
import type { Database } from '@/integrations/supabase/types';

type RssArticleRow = Database['public']['Tables']['rss_articles']['Row'];

/**
 * Centralised data layer for the reading feature.
 *
 *  - Loads and caches feeds + articles from Supabase.
 *  - Performs background refresh on a configurable cadence.
 *  - Owns bookmarks + read state, persists them to localStorage.
 *  - Exposes `refresh`, `addFeed`, `removeFeed`, etc. as stable callbacks.
 *
 * **Stability invariant**: every public callback (refreshFeeds,
 * addFeed, removeFeed, …) is stable across renders. They read the
 * current feed list from a ref, not from a closure-captured variable,
 * so callers can keep them in `useEffect` deps without retriggering
 * on every state change. This also fixes a real bug: the auto-refresh
 * interval used to be torn down + rebuilt on every feed toggle,
 * because `refreshFeeds` had `enabledFeeds` in its deps.
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

  // Refs that mirror state so stable callbacks below can always read
  // the latest value without participating in a dep array.
  const feedSourcesRef = useRef(feedSources);
  const bookmarksRef = useRef(bookmarks);
  const readArticlesRef = useRef(readArticles);
  const articlesRef = useRef(articles);
  const isArRef = useRef(isAr);
  useEffect(() => { feedSourcesRef.current = feedSources; }, [feedSources]);
  useEffect(() => { bookmarksRef.current = bookmarks; }, [bookmarks]);
  useEffect(() => { readArticlesRef.current = readArticles; }, [readArticles]);
  useEffect(() => { articlesRef.current = articles; }, [articles]);
  useEffect(() => { isArRef.current = isAr; }, [isAr]);

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
  const loadFromDB = useCallback(async (): Promise<void> => {
    const enabled = feedSourcesRef.current.filter((f) => f.enabled);
    const names = enabled.map((f) => f.name);
    if (names.length === 0) {
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
        .in('source_name', names)
        .order('pub_date', { ascending: false })
        .limit(500);
      if (data) {
        online = data.map((r: RssArticleRow) => ({
          title: r.title,
          link: r.link,
          description: r.description || '',
          fullContent: r.full_content || '',
          pubDate: r.pub_date || r.created_at || '',
          image: r.image ?? null,
          images: (r.images as FeedItem['images']) || [],
          author: undefined,
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
  }, []);

  // ─── Refresh from edge function (with client-side fallback) ─────────────
  // `overrideFeeds` lets bulk-add pass the *just-committed* feed list
  // synchronously, sidestepping the React-state-not-yet-flushed race
  // that previously caused OPML imports to miss their own new feeds
  // on the first refresh.
  const refreshFeeds = useCallback(
    async (silent = false, overrideFeeds?: ReadonlyArray<FeedSource>): Promise<void> => {
      const ar = isArRef.current;
      const feeds = (overrideFeeds ?? feedSourcesRef.current).filter((f) => f.enabled);
      if (feeds.length === 0) return;
      if (!silent) setRefreshing(true);
      try {
        let succeeded = false;

        // Try Supabase edge function first (if available)
        if (isSupabaseAvailable()) {
          try {
            const nameMap: Record<string, string> = {};
            feeds.forEach((f) => { nameMap[f.url] = f.name; });

            // Dedupe + retry the edge invocation: parallel refresh
            // triggers (auto-refresh tick colliding with a manual
            // button press) collapse to a single in-flight request,
            // and transient 5xx / network blips get 2 backoff attempts
            // before we fall through to the client-side fallback.
            const { data, error } = await dedupe(
              `fetch-rss:${feeds.map(f => f.url).sort().join('|')}`,
              () => withRetry(
                () => supabase.functions.invoke('fetch-rss', {
                  body: {
                    urls: feeds.map((f) => f.url),
                    limit: 100,
                    fetchFullContent: true,
                    store: true,
                    nameMap,
                  },
                }),
                { attempts: 2, baseMs: 600 },
              ),
            );

            if (!error && data) {
              if (Array.isArray(data?.statuses)) {
                setStatuses(data.statuses as FeedStatus[]);
                // Track failed feeds for user notification
                const failedFeeds = (data.statuses as FeedStatus[]).filter(s => s.status === 'error');
                if (failedFeeds.length > 0 && !silent) {
                  toast.warning(
                    ar
                      ? `تم التحديث، لكن فشل ${failedFeeds.length} مصدر`
                      : `Refreshed, but ${failedFeeds.length} feed(s) failed`,
                  );
                }
              }
              await loadFromDB();
              succeeded = true;
            }
          } catch (e) {
            console.warn('Reading: Supabase refresh failed, falling back to client-side', e);
          }
        }

        // Fallback: client-side fetch via CORS proxy
        if (!succeeded) {
          const controller = new AbortController();
          const results = await fetchFeedsClientSide(feeds, controller.signal);

          const freshArticles: FeedItem[] = [];
          const failedSources: string[] = [];
          for (const r of results) {
            if (r.error) {
              failedSources.push(r.source || r.url);
            } else {
              freshArticles.push(...r.items);
            }
          }

          if (freshArticles.length > 0) {
            setArticles(prev => {
              const seen = new Set(prev.map(a => a.link));
              const newOnes = freshArticles.filter(a => a.link && !seen.has(a.link));
              const merged = [...newOnes, ...prev].sort((a, b) => {
                const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
                const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
                return db - da;
              });
              return merged;
            });
            // Cache for offline use
            for (const a of freshArticles.slice(0, 25)) {
              void offlineDb.saveArticle(a).catch(() => {});
            }
            succeeded = true;
          }

          if (failedSources.length > 0 && !silent) {
            toast.warning(
              ar
                ? `فشل جلب: ${failedSources.slice(0, 3).join('، ')}${failedSources.length > 3 ? '...' : ''}`
                : `Failed: ${failedSources.slice(0, 3).join(', ')}${failedSources.length > 3 ? '...' : ''}`,
            );
          }
        }

        if (succeeded) {
          const now = new Date().toISOString();
          setLastRefresh(now);
          try { localStorage.setItem(LAST_REFRESH_KEY, now); } catch { /* quota or private mode */ }
          if (!silent) toast.success(ar ? 'تم التحديث' : 'Refreshed');
        } else if (!silent) {
          toast.error(ar ? 'فشل التحديث — تحقق من اتصال الإنترنت' : 'Refresh failed — check your connection');
        }
      } catch (e) {
        console.error('Reading: refresh failed', e);
        if (!silent) toast.error(ar ? 'فشل التحديث' : 'Refresh failed');
      } finally {
        setRefreshing(false);
      }
    },
    [loadFromDB],
  );

  // ─── Lifecycle (mount-only) ────────────────────────────────────────────
  // Initial load + a single auto-refresh interval that lives for the
  // entire lifetime of the hook. Previously the effect depended on
  // loadFromDB / refreshFeeds (which depended on enabledFeeds), so
  // every feed toggle would tear down and rebuild the interval —
  // shifting the next tick by up to an hour. With stable callbacks we
  // can wire it once.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadFromDB().finally(() => {
      if (cancelled) return;
      setLoading(false);
      const last = localStorage.getItem(LAST_REFRESH_KEY);
      const stale = !last ||
        Date.now() - new Date(last).getTime() > 30 * 60 * 1000;
      if (stale) void refreshFeeds(true);
    });
    autoRefreshRef.current = setInterval(
      () => { void refreshFeeds(true); },
      60 * 60 * 1000,
    );
    return () => {
      cancelled = true;
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the *enabled set* changes (toggle a feed), reload from DB
  // without rebuilding the interval. Cheap; touches state only.
  useEffect(() => {
    void loadFromDB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledNames.join('|')]);

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
      const allLinks = articlesRef.current.map((a) => a.link).filter(Boolean);
      const set = new Set(prev);
      allLinks.forEach((l) => set.add(l));
      const next = Array.from(set);
      storeReadArticles(next);
      return next;
    });
    toast.success(isArRef.current ? 'تم التحديد كمقروء' : 'Marked as read');
  }, []);

  // ─── Feed CRUD ─────────────────────────────────────────────────────────
  const fetchSingleFeed = useCallback(
    async (feed: FeedSource) => {
      const ar = isArRef.current;
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
            ar
              ? `تمت إضافة ${fresh.length} مقال من ${feed.name}`
              : `Imported ${fresh.length} from ${feed.name}`,
          );
        } else {
          toast.info(
            ar
              ? `لا توجد مقالات من ${feed.name}`
              : `No articles from ${feed.name}`,
          );
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        toast.error(
          ar
            ? `فشل جلب ${feed.name}: ${msg}`
            : `Failed to fetch ${feed.name}: ${msg}`,
        );
      }
    },
    [],
  );

  const addFeed = useCallback(
    (url: string, name: string, category: string) => {
      const ar = isArRef.current;
      const trimmed = url.trim();
      if (!trimmed) return false;
      const current = feedSourcesRef.current;
      if (current.some((f) => f.url === trimmed)) {
        toast.error(ar ? 'هذا المصدر موجود' : 'Feed already exists');
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
      const next = [...current, feed];
      feedSourcesRef.current = next;
      setFeedSources(next);
      storeFeeds(next);
      void fetchSingleFeed(feed);
      return true;
    },
    [fetchSingleFeed],
  );

  const addSuggestedFeed = useCallback(
    (feed: FeedSource) => {
      const ar = isArRef.current;
      const current = feedSourcesRef.current;
      if (current.some((f) => f.url === feed.url)) {
        toast.error(ar ? 'هذا المصدر موجود' : 'Feed already exists');
        return;
      }
      const next = [...current, { ...feed }];
      feedSourcesRef.current = next;
      setFeedSources(next);
      storeFeeds(next);
      void fetchSingleFeed(feed);
    },
    [fetchSingleFeed],
  );

  /**
   * Bulk-add feeds (OPML import or batch suggestion add). We add every
   * new feed to local state in one shot, persist once, then trigger a
   * single batched `refreshFeeds` rather than firing N parallel
   * edge-function invocations.
   *
   * Critical: pass the new feed list **directly** to refreshFeeds
   * instead of relying on React state being flushed first. The old
   * `setTimeout(50)` workaround was a race-condition band-aid that
   * didn't actually solve anything because `refreshFeeds`'s closure
   * still referenced the pre-add list. Now refreshFeeds reads from
   * a ref AND accepts an explicit override.
   */
  const addFeedsBulk = useCallback(
    async (
      feeds: ReadonlyArray<{ url: string; name: string; category: string; enabled?: boolean }>,
    ): Promise<{ added: number; skipped: number }> => {
      const current = feedSourcesRef.current;
      const existingByUrl = new Map(current.map((f) => [f.url, f] as const));
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
        const newFeed: FeedSource = {
          url,
          name,
          category: f.category || 'other',
          enabled: f.enabled !== false,
        };
        fresh.push(newFeed);
        existingByUrl.set(url, newFeed);
      }
      if (fresh.length === 0) return { added: 0, skipped };
      const next = [...current, ...fresh];
      // Update both ref and state synchronously so refreshFeeds can
      // see the new list immediately without waiting for React.
      feedSourcesRef.current = next;
      setFeedSources(next);
      storeFeeds(next);
      // Pass the just-committed list to refreshFeeds explicitly, so
      // even if React hasn't flushed `feedSources` to props/closures
      // anywhere yet, the refresh hits all the new feeds.
      void refreshFeeds(true, next);
      return { added: fresh.length, skipped };
    },
    [refreshFeeds],
  );

  const removeFeed = useCallback(
    (url: string) => {
      const ar = isArRef.current;
      const next = feedSourcesRef.current.filter((f) => f.url !== url);
      feedSourcesRef.current = next;
      setFeedSources(next);
      storeFeeds(next);
      toast.success(ar ? 'تم الحذف' : 'Removed');
    },
    [],
  );

  const toggleFeedEnabled = useCallback(
    (url: string) => {
      const next = feedSourcesRef.current.map((f) =>
        f.url === url ? { ...f, enabled: !f.enabled } : f,
      );
      feedSourcesRef.current = next;
      setFeedSources(next);
      storeFeeds(next);
    },
    [],
  );

  // ─── Offline auto-cache ────────────────────────────────────────────────
  // Reconcile the IndexedDB store whenever `articles` or `bookmarks`
  // changes so the user's "auto-cache last N unread" preference is
  // honoured. Bookmarked links are always included regardless of the
  // cap so explicit saves are never bumped out by the rolling window.
  // Debounced 600 ms so a burst of state updates doesn't write-storm.
  const recacheNow = useCallback(async (): Promise<void> => {
    if (!offlineDb.available()) return;
    const prefs = getOfflinePrefs();
    const currentArticles = articlesRef.current;
    const currentBookmarks = bookmarksRef.current;
    const currentRead = readArticlesRef.current;
    const bookmarkSet = new Set(currentBookmarks);
    const readSet = new Set(currentRead);

    // Pick the auto-cache window: most recent unread, capped at N.
    const toKeep: FeedItem[] = [];
    if (prefs.autoCacheCount > 0) {
      const sorted = [...currentArticles].sort((a, b) => {
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
    const linkToArticle = new Map(currentArticles.map((a) => [a.link, a] as const));
    const bookmarkedItems = currentBookmarks
      .map((l) => linkToArticle.get(l))
      .filter((a): a is FeedItem => !!a);

    try {
      await offlineDb.syncArticles(
        [...toKeep, ...bookmarkedItems],
        currentBookmarks,
      );
    } catch (e) {
      console.warn('Reading: offline sync failed', e);
    }

    // Refresh image cache too, but only if the user wants it.
    if (prefs.cacheImages) {
      const urls: string[] = [];
      for (const a of [...toKeep, ...bookmarkedItems]) {
        if (a.image) urls.push(a.image);
        for (const i of a.images || []) {
          if (typeof i === 'string' && !urls.includes(i)) urls.push(i);
        }
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
  }, []);

  // Debounce auto-cache so frequent state updates don't write-storm IDB.
  // Triggered by articles/bookmarks change.
  useEffect(() => {
    if (autoCacheTimerRef.current) clearTimeout(autoCacheTimerRef.current);
    autoCacheTimerRef.current = setTimeout(() => {
      void recacheNow();
    }, 600);
    return () => {
      if (autoCacheTimerRef.current) clearTimeout(autoCacheTimerRef.current);
    };
  }, [articles, bookmarks, readArticles, recacheNow]);

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
