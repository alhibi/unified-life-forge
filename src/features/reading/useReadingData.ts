import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { dedupe, withRetry } from '@/lib/fetchRetry';

import { fetchFeedsClientSide, isSupabaseAvailable } from './clientFetcher';
import {
  extractArticleBody,
  needsContentUpgrade,
  plainTextLength,
} from './extractArticle';
import { offlineDb } from './offlineDb';
import {
  deleteBookmark,
  getBookmarks,
  getOfflinePrefs,
  getReadArticles,
  getStoredFeeds,
  LAST_REFRESH_KEY,
  setBookmarkArticle,
  storeFeeds,
  storeReadArticles,
} from './storage';
import {
  hydrateReadingFromCloud,
  subscribeReadingStorage,
} from './storage';
import type { FeedItem, FeedSource, FeedStatus } from './types';


// ─── Constants for stability & memory management ───────────────────────────
/** Max articles held in memory at once. Effectively unlimited for normal
 *  use — the list is virtualized so rendering cost is constant, and modern
 *  browsers handle 100K lightweight objects without issue. The cap exists
 *  purely as a runaway-memory guardrail (e.g. a misbehaving feed flooding
 *  thousands of items). User-saved content (bookmarks, offline archive,
 *  read-state) is never affected by this cap. */
const MAX_ARTICLES_IN_MEMORY = 100000;
/** Base auto-refresh interval (ms). Adapts based on consecutive failures. */
const BASE_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 min (more feeds = fresher)
/** Minimum refresh interval even with exponential backoff. */
const MIN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min
/** Maximum refresh interval on repeated failures. */
const MAX_REFRESH_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
/** Staleness threshold — auto-refresh on mount if older than this. */
const STALE_THRESHOLD = 10 * 60 * 1000; // 10 min
/** The Edge Function caps one request at 15 feeds; the client batches transparently. */
// Must stay <= MAX_FEEDS_PER_REQUEST in the fetch-rss edge function (8);
// larger batches were silently truncated and blew the isolate's memory cap.
const EDGE_BATCH_SIZE = 6;

type EdgeRefreshData = {
  statuses?: FeedStatus[];
};

/**
 * Fetch every enabled source even when a library is larger than the Edge
 * Function's per-request safety cap. This used to submit the whole library
 * and silently refresh only its first 15 feeds.
 */
async function refreshFeedsInBatches(
  feeds: ReadonlyArray<FeedSource>,
  onProgress?: (completed: number, currentFeed: string) => void,
): Promise<{ data: EdgeRefreshData | null; failedUrls: string[] }> {
  const batches: FeedSource[][] = [];
  for (let index = 0; index < feeds.length; index += EDGE_BATCH_SIZE) {
    batches.push(feeds.slice(index, index + EDGE_BATCH_SIZE));
  }

  const statuses: FeedStatus[] = [];
  const failedUrls = new Set<string>();
  let completed = 0;

  for (const batch of batches) {
    const nameMap: Record<string, string> = {};
    batch.forEach((feed) => { nameMap[feed.url] = feed.name; });
    onProgress?.(completed, batch.length === 1 ? batch[0].name : `تحديث ${batch.length} مصادر…`);

    const { data, error } = await dedupe(
      `fetch-rss:${batch.map((feed) => feed.url).sort().join('|')}`,
      () => withRetry(
        () => supabase.functions.invoke('fetch-rss', {
          body: {
            urls: batch.map((feed) => feed.url),
            limit: 25,
            fetchFullContent: true,
            store: true,
            nameMap,
          },
        }),
        { attempts: 2, baseMs: 600 },
      ),
    );

    const received = !error && Array.isArray(data?.statuses)
      ? data.statuses as FeedStatus[]
      : [];
    const receivedByUrl = new Map(received.map((status) => [status.url, status]));
    for (const feed of batch) {
      const status = receivedByUrl.get(feed.url);
      if (status) {
        statuses.push(status);
        if (status.status === 'error') failedUrls.add(feed.url);
      } else {
        statuses.push({
          url: feed.url,
          status: 'error',
          itemCount: 0,
          error: error instanceof Error
            ? error.message
            : error
              ? 'تعذّر الاتصال بخدمة التحديث'
              : 'لم تُرجع الخدمة حالة المصدر',
        });
        failedUrls.add(feed.url);
      }
    }
    completed += batch.length;
    onProgress?.(completed, completed === feeds.length ? 'جاري تحميل المقالات…' : 'الانتقال إلى الدفعة التالية…');
  }

  return {
    data: statuses.length ? { statuses } : null,
    failedUrls: Array.from(failedUrls),
  };
}

function normalizeFeedUrl(input: string): string {
  const url = new URL(input.trim());
  url.hash = '';
  // Hostnames are case-insensitive. URL normalises them and preserves query
  // parameters, which some legitimate feeds require for language or edition.
  return url.toString();
}


/**
 * Centralised data layer for the reading feature.
 *
 *  - Loads and caches feeds + articles from Supabase.
 *  - Performs background refresh on an adaptive cadence.
 *  - Owns bookmarks + read state, persists them to localStorage.
 *  - Exposes `refresh`, `addFeed`, `removeFeed`, etc. as stable callbacks.
 *  - Caps in-memory articles to prevent unbounded growth.
 *  - Tracks consecutive refresh failures for adaptive backoff.
 *  - Monitors online/offline state for smart refresh decisions.
 *
 * **Stability invariant**: every public callback (refreshFeeds,
 * addFeed, removeFeed, …) is stable across renders. They read the
 * current feed list from a ref, not from a closure-captured variable,
 * so callers can keep them in `useEffect` deps without retriggering
 * on every state change.
 */
export function useReadingData() {

  const [feedSources, setFeedSources] = useState<FeedSource[]>(getStoredFeeds);
  const [articles, setArticles] = useState<FeedItem[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>(getBookmarks);
  const [readArticles, setReadArticles] = useState<string[]>(getReadArticles);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    active: boolean;
    total: number;
    current: number;
    currentFeed?: string;
    successCount: number;
    errorCount: number;
  }>({
    active: false,
    total: 0,
    current: 0,
    successCount: 0,
    errorCount: 0,
  });
  const [prefetchProgress, setPrefetchProgress] = useState<{
    active: boolean;
    total: number;
    current: number;
    currentTitle?: string;
  }>({
    active: false,
    total: 0,
    current: 0,
  });
  const [statuses, setStatuses] = useState<FeedStatus[]>([]);
  const [totalInDB, setTotalInDB] = useState(0);
  const [cachedLinks, setCachedLinks] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [lastRefresh, setLastRefresh] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(LAST_REFRESH_KEY) : null,
  );
  /** Consecutive refresh failures — drives adaptive backoff. */
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  /** Last error message for UI feedback. */
  const [lastError, setLastError] = useState<string | null>(null);

  // Refs that mirror state so stable callbacks below can always read
  // the latest value without participating in a dep array.
  const feedSourcesRef = useRef(feedSources);
  const bookmarksRef = useRef(bookmarks);
  const readArticlesRef = useRef(readArticles);
  const articlesRef = useRef(articles);
  useEffect(() => { feedSourcesRef.current = feedSources; }, [feedSources]);
  useEffect(() => { bookmarksRef.current = bookmarks; }, [bookmarks]);
  useEffect(() => { readArticlesRef.current = readArticles; }, [readArticles]);
  useEffect(() => { articlesRef.current = articles; }, [articles]);

  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveFailuresRef = useRef(0);
  /** Track whether the tab is visible — skip refresh when hidden. */
  const visibleRef = useRef(typeof document !== 'undefined' ? !document.hidden : true);

  /**
   * Links currently being upgraded via `extract-article`. Prevents the
   * same article from triggering parallel scrape attempts when the user
   * opens it twice in rapid succession or when a re-render fires the
   * effect again before the first fetch resolved.
   */
  const upgradeInFlightRef = useRef<Set<string>>(new Set());
  /**
   * Links we've *already attempted* to upgrade (success or fail) this
   * session. Without this, every navigation back into the article view
   * would refire extract-article — wasteful for genuinely short
   * articles (X/Twitter posts, photo galleries, paywalls) where the
   * scraper has nothing to add. Cleared on full reload.
   */
  const upgradeAttemptedRef = useRef<Set<string>>(new Set());
  /** AbortControllers for in-flight upgrades, keyed by link. */
  const upgradeAbortRef = useRef<Map<string, AbortController>>(new Map());
  /** Whether we've already shown the "low storage" toast this session. */
  const lowQuotaWarnedRef = useRef(false);

  // ─── Cloud hydration ────────────────────────────────────────────────
  // Feeds, bookmarks, read-state and reader prefs are cloud-backed.
  // The initial useState calls above read from the in-memory mirror,
  // which starts empty on cold boot. Once hydration finishes we
  // re-read the mirror into React state so the UI reflects the user's
  // real cloud data (and any changes made from another device).
  //
  // The subscription also catches auth changes: signing in refreshes
  // the mirror with that user's rows, signing out resets it.
  useEffect(() => {
    let mounted = true;
    const applyFromMirror = () => {
      if (!mounted) return;
      setFeedSources(getStoredFeeds());
      setBookmarks(getBookmarks());
      setReadArticles(getReadArticles());
    };
    void hydrateReadingFromCloud().then(applyFromMirror).catch(() => {});
    const unsub = subscribeReadingStorage(applyFromMirror);
    return () => { mounted = false; unsub(); };
  }, []);

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

  /** Cap article list to MAX_ARTICLES_IN_MEMORY, keeping newest. */
  const capArticles = useCallback((list: FeedItem[]): FeedItem[] => {
    if (list.length <= MAX_ARTICLES_IN_MEMORY) return list;
    return list
      .sort((a, b) => {
        const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return db - da;
      })
      .slice(0, MAX_ARTICLES_IN_MEMORY);
  }, []);

  /** Compute adaptive refresh interval based on consecutive failures. */
  const getAdaptiveInterval = useCallback((): number => {
    const failures = consecutiveFailuresRef.current;
    if (failures === 0) return BASE_REFRESH_INTERVAL;
    // Exponential backoff: 1h, 2h, 4h... capped at MAX_REFRESH_INTERVAL
    const interval = BASE_REFRESH_INTERVAL * Math.pow(2, Math.min(failures, 3));
    return Math.min(interval, MAX_REFRESH_INTERVAL);
  }, []);

  // ─── Load articles from DB ────────────────────────────────────────────
  const loadFromDB = useCallback(async (): Promise<void> => {
    const enabled = feedSourcesRef.current.filter((f) => f.enabled);
    const names = enabled.map((f) => f.name);
    if (names.length === 0) {
      try {
        const offline = await offlineDb.listArticles();
        setArticles(capArticles(offline));
        setTotalInDB(offline.length);
      } catch (e) {
        console.warn('Reading: offline DB read failed', e);
        setArticles([]);
        setTotalInDB(0);
      }
      return;
    }
    let online: FeedItem[] = [];
    let onlineCount = 0;
    let onlineFailed = false;
    try {
      const { data, count, error: queryError } = await supabase
        .from('rss_articles')
        // List rows only — omit `full_content` (can be tens of KB per
        // row of HTML). ArticleReader lazily fetches / extracts the
        // body on demand when the user actually opens an article, so
        // shipping full_content in the list payload is pure waste.
        // Also drop `count: exact` — an unindexed COUNT over the whole
        // table blocks the response for hundreds of ms on cold cache.
        .select('title, link, description, pub_date, created_at, image, images, source_name')
        .in('source_name', names)
        .order('pub_date', { ascending: false })
        .limit(300);
      if (queryError) {
        throw queryError;
      }
      if (data) {
        online = data.map((r) => ({
          title: r.title,
          link: r.link,
          description: r.description || '',
          fullContent: '',
          pubDate: r.pub_date || r.created_at || '',
          image: r.image ?? null,
          images: (r.images as FeedItem['images']) || [],
          author: undefined,
          source: r.source_name,
        }));
        onlineCount = count ?? online.length;
      }
    } catch (e) {
      console.error('Reading: DB load failed', e);
      onlineFailed = true;
      // Set last error for UI feedback but don't crash
      setLastError(
        e instanceof Error ? e.message : 'Database load failed',
      );
    }

    // Always merge in offline archive so we have content even offline
    let offline: FeedItem[] = [];
    try {
      offline = await offlineDb.listArticles();
    } catch (e) {
      console.warn('Reading: IndexedDB read failed during merge', e);
    }

    if (onlineFailed && offline.length === 0 && online.length === 0) {
      return;
    }

    // Clear error on successful load
    if (!onlineFailed) setLastError(null);

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
    setArticles(capArticles(merged));
    setTotalInDB(onlineCount || merged.length);
  }, [capArticles]);

  // ─── Refresh from edge function (with client-side fallback) ─────────────
  // `overrideFeeds` lets bulk-add pass the *just-committed* feed list
  // synchronously, sidestepping the React-state-not-yet-flushed race
  // that previously caused OPML imports to miss their own new feeds
  // on the first refresh.
  const refreshFeeds = useCallback(
    async (silent = false, overrideFeeds?: ReadonlyArray<FeedSource>): Promise<void> => {
      const feeds = (overrideFeeds ?? feedSourcesRef.current).filter((f) => f.enabled);
      if (feeds.length === 0) return;
      if (!silent) setRefreshing(true);
      setSyncProgress({
        active: true,
        total: feeds.length,
        current: 0,
        successCount: 0,
        errorCount: 0,
        currentFeed: 'جاري بدء التحديث...',
      });
      try {
        let succeeded = false;
        let fallbackFeeds = feeds;

        // Try Supabase edge function first (if available)
        if (isSupabaseAvailable()) {
          setSyncProgress((prev) => ({
            ...prev,
            currentFeed: 'جاري الاتصال بالخادم السحابي...',
          }));
          try {
            const { data, failedUrls } = await refreshFeedsInBatches(
              feeds,
              (completed, currentFeed) => {
                setSyncProgress((prev) => ({
                  ...prev,
                  current: completed,
                  currentFeed,
                }));
              },
            );

            if (data) {
              const statusesArr = data.statuses || [];
              setStatuses(statusesArr);
              const failedFeeds = feeds.filter((feed) => failedUrls.includes(feed.url));
              const successfulCount = feeds.length - failedFeeds.length;
              fallbackFeeds = failedFeeds;

              setSyncProgress({
                active: true,
                total: feeds.length,
                current: feeds.length - failedFeeds.length,
                successCount: successfulCount,
                errorCount: failedFeeds.length,
                currentFeed: failedFeeds.length > 0
                  ? 'جاري تجربة المصادر المتعذّرة مباشرة…'
                  : 'جاري تحميل المقالات…',
              });

              if (successfulCount > 0) {
                await loadFromDB();
                const currentArticlesSnapshot = articlesRef.current;
                if (currentArticlesSnapshot.length > 0) {
                  void offlineDb.saveArticlesBatch(currentArticlesSnapshot).catch(() => {});
                }
                succeeded = true;
              }

              if (failedFeeds.length > 0 && !silent) {
                toast.warning(`تعذّر تحديث ${failedFeeds.length} مصدر من الخادم، نجرب اتصالاً مباشراً`);
              }
            }
          } catch (e) {
            console.warn('Reading: Supabase refresh failed, falling back to client-side', e);
          }
        }

        // Fallback: use direct browser retrieval only for sources the Edge
        // Function could not refresh, preserving successful server batches.
        if (!succeeded || fallbackFeeds.length > 0) {
          const controller = new AbortController();
          const limit = 3;
          let activeRequests = 0;
          let currentIndex = 0;
          const failedSources: string[] = [];
          const allFreshArticles: FeedItem[] = [];

          const completedBeforeFallback = feeds.length - fallbackFeeds.length;
          setSyncProgress({
            active: true,
            total: feeds.length,
            current: completedBeforeFallback,
            successCount: completedBeforeFallback,
            errorCount: 0,
            currentFeed: 'جاري جلب المصادر المتعذّرة مباشرة…',
          });

          await new Promise<void>((resolvePromise) => {
            const next = async () => {
              if (currentIndex >= fallbackFeeds.length) {
                if (activeRequests === 0) {
                  resolvePromise();
                }
                return;
              }

              const feed = fallbackFeeds[currentIndex++];
              activeRequests++;

              setSyncProgress((prev) => ({
                ...prev,
                currentFeed: feed.name,
              }));

              try {
                const singleResult = await fetchFeedsClientSide([feed], controller.signal);
                const r = singleResult[0];
                if (r && !r.error && r.items.length > 0) {
                  // Merge immediately in real-time!
                  setArticles((prev) => {
                    const seen = new Set(prev.map((a) => a.link));
                    const newOnes = r.items.filter((a) => a.link && !seen.has(a.link));
                    const merged = [...newOnes, ...prev].sort((a, b) => {
                      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
                      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
                      return db - da;
                    });
                    return capArticles(merged);
                  });
                  allFreshArticles.push(...r.items);

                  setSyncProgress((prev) => ({
                    ...prev,
                    current: prev.current + 1,
                    successCount: prev.successCount + 1,
                  }));
                  succeeded = true;
                } else {
                  if (r?.error) failedSources.push(feed.name);
                  setSyncProgress((prev) => ({
                    ...prev,
                    current: prev.current + 1,
                    errorCount: prev.errorCount + 1,
                  }));
                }
              } catch (_e) {
                failedSources.push(feed.name);
                setSyncProgress((prev) => ({
                  ...prev,
                  current: prev.current + 1,
                  errorCount: prev.errorCount + 1,
                }));
              } finally {
                activeRequests--;
                next();
              }
            };

            for (let c = 0; c < Math.min(limit, fallbackFeeds.length); c++) {
              void next();
            }
          });

          if (allFreshArticles.length > 0) {
            void offlineDb.saveArticlesBatch(allFreshArticles).catch(() => {});
          }

          if (failedSources.length > 0 && !silent) {
            toast.warning(
              `فشل جلب: ${failedSources.slice(0, 3).join('، ')}${failedSources.length > 3 ? '...' : ''}`,
            );
          }
        }

        if (succeeded) {
          const now = new Date().toISOString();
          setLastRefresh(now);
          try { localStorage.setItem(LAST_REFRESH_KEY, now); } catch { /* quota or private mode */ }
          if (!silent) toast.success('تم التحديث بنجاح');
          // Reset consecutive failures on success
          consecutiveFailuresRef.current = 0;
          setConsecutiveFailures(0);
          setLastError(null);
        } else if (!silent) {
          toast.error('فشل التحديث — تحقق من اتصال الإنترنت');
          consecutiveFailuresRef.current += 1;
          setConsecutiveFailures(consecutiveFailuresRef.current);
          setLastError('فشل التحديث');
        } else {
          // Silent failure: still track for backoff
          consecutiveFailuresRef.current += 1;
          setConsecutiveFailures(consecutiveFailuresRef.current);
        }
      } catch (e) {
        console.error('Reading: refresh failed', e);
        consecutiveFailuresRef.current += 1;
        setConsecutiveFailures(consecutiveFailuresRef.current);
        setLastError(e instanceof Error ? e.message : 'Refresh failed');
        if (!silent) toast.error('فشل التحديث');
      } finally {
        setRefreshing(false);
        setTimeout(() => {
          setSyncProgress((prev) => ({ ...prev, active: false }));
        }, 1500);
      }
    },
    [loadFromDB, capArticles],
  );

  // ─── Lifecycle (mount-only) ────────────────────────────────────────────
  // Initial load + adaptive auto-refresh. The interval recalculates
  // based on consecutive failures (exponential backoff) and pauses
  // when the tab is hidden to avoid wasting resources.
  // Also listens for 'online' events to immediately refresh when
  // connectivity is restored.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Track visibility so we skip refreshes while the tab is hidden
    const onVisChange = () => {
      visibleRef.current = !document.hidden;
      // When becoming visible after being hidden, do a staleness check
      if (!document.hidden) {
        const last = localStorage.getItem(LAST_REFRESH_KEY);
        const stale = !last ||
          Date.now() - new Date(last).getTime() > STALE_THRESHOLD;
        if (stale) void refreshFeeds(true);
      }
    };
    document.addEventListener('visibilitychange', onVisChange);

    // Auto-refresh when the device comes back online — ensures the
    // user always sees fresh content after a connectivity gap.
    const onOnline = () => {
      const last = localStorage.getItem(LAST_REFRESH_KEY);
      const stale = !last ||
        Date.now() - new Date(last).getTime() > MIN_REFRESH_INTERVAL;
      if (stale) void refreshFeeds(true);
    };
    window.addEventListener('online', onOnline);

    // Pre-claim the current name signature *before* firing the load
    // so the concurrent `enabledNames` effect below sees a matching
    // sig and skips its own duplicate query.
    lastLoadedNamesRef.current = feedSourcesRef.current
      .filter((f) => f.enabled)
      .map((f) => f.name)
      .join('|');
    loadFromDB().finally(() => {
      if (cancelled) return;
      setLoading(false);
      // Defer the first network refresh past the initial paint so the
      // list renders instantly from cache. The user sees content
      // immediately; the refresh fires in the background a moment
      // later. Skip entirely when the last refresh was very recent.
      const last = localStorage.getItem(LAST_REFRESH_KEY);
      const recent = last &&
        Date.now() - new Date(last).getTime() < MIN_REFRESH_INTERVAL;
      if (!recent) {
        const schedule: (cb: () => void) => void =
          typeof window !== 'undefined' &&
          'requestIdleCallback' in window
            ? (cb) => (window as unknown as {
                requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void;
              }).requestIdleCallback(cb, { timeout: 1500 })
            : (cb) => setTimeout(cb, 400);
        schedule(() => {
          if (!cancelled) void refreshFeeds(true);
        });
      }
    });

    // Adaptive interval: reschedules itself based on failure count
    const scheduleNext = () => {
      if (autoRefreshRef.current) clearTimeout(autoRefreshRef.current as unknown as number);
      const interval = getAdaptiveInterval();
      autoRefreshRef.current = setTimeout(() => {
        // Only refresh if tab is visible and we're online
        if (visibleRef.current && (typeof navigator === 'undefined' || navigator.onLine)) {
          void refreshFeeds(true).finally(scheduleNext);
        } else {
          // Skip this tick but schedule next at normal interval
          scheduleNext();
        }
      }, interval) as unknown as ReturnType<typeof setInterval>;
    };
    scheduleNext();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('online', onOnline);
      if (autoRefreshRef.current) {
        clearTimeout(autoRefreshRef.current as unknown as number);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the *enabled set* changes (toggle a feed), reload from DB
  // without rebuilding the interval. Cheap; touches state only.
  // Dedupe against the last-loaded signature so cloud hydration
  // arriving right after mount doesn't re-fire the same query we
  // already issued from the initial `loadFromDB()` call.
  const lastLoadedNamesRef = useRef<string>('');
  useEffect(() => {
    const sig = enabledNames.join('|');
    if (sig === lastLoadedNamesRef.current) return;
    lastLoadedNamesRef.current = sig;
    void loadFromDB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledNames.join('|')]);

  // ─── Persist-on-demand & full-content upgrade ─────────────────────────
  // Save an article to IndexedDB *immediately* when the user interacts
  // with it (open / bookmark) so it's available offline even if the
  // debounced auto-cache reconciliation hasn't fired yet. Without this,
  // a user opening an article and then going offline within ~600 ms
  // would lose access to it.
  //
  // Failures are non-fatal — the offline DB might be at quota or
  // closed; we just won't have the offline copy. We surface a one-time
  // toast so the user understands why offline reading might be
  // unreliable on this device.
  const persistOpenedArticle = useCallback(async (link: string): Promise<void> => {
    if (!offlineDb.available() || !link) return;
    const article = articlesRef.current.find((a) => a.link === link);
    if (!article) return;
    try {
      await offlineDb.saveArticle(article);
    } catch (e) {
      console.warn('Reading: persist-on-open failed', e);
    }
    // Surface low-quota once per session so the user knows offline
    // reading is degraded.
    if (!lowQuotaWarnedRef.current) {
      try {
        const ok = await offlineDb.hasQuota(50 * 1024);
        if (!ok) {
          lowQuotaWarnedRef.current = true;
          toast.warning(
            'مساحة التخزين منخفضة — قد لا تُحفظ مقالات جديدة دون اتصال',
            { duration: 7000 },
          );
        }
      } catch { /* ignore */ }
    }
  }, []);

  /**
   * Patch an article's `fullContent` (and optionally its hero image) in
   * memory and persist the upgraded copy to IndexedDB. Used by the
   * extract-article flow when we discover a richer body for a feed
   * that only ships excerpts. Idempotent: only writes when the new
   * body is genuinely longer than what we already have.
   */
  const upgradeArticleContent = useCallback(
    async (link: string, fullContent: string, image?: string | null): Promise<void> => {
      if (!link || !fullContent) return;
      let upgraded: FeedItem | null = null;
      setArticles((prev) => {
        const idx = prev.findIndex((a) => a.link === link);
        if (idx < 0) return prev;
        const cur = prev[idx];
        const curLen = plainTextLength(cur.fullContent);
        const newLen = plainTextLength(fullContent);
        // Only upgrade when the new body is actually richer. Some
        // feeds carry an image-heavy excerpt that's already long.
        if (newLen <= curLen) return prev;
        const next = prev.slice();
        const merged: FeedItem = {
          ...cur,
          fullContent,
          description: cur.description?.length
            ? cur.description
            : fullContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400),
          image: cur.image || image || null,
          images: cur.images && cur.images.length > 0
            ? cur.images
            : image
              ? [image]
              : [],
        };
        next[idx] = merged;
        upgraded = merged;
        return next;
      });
      // Persist the upgraded copy outside the setState callback so we
      // don't write inside React's render phase.
      if (upgraded && offlineDb.available()) {
        try {
          await offlineDb.saveArticle(upgraded);
        } catch (e) {
          console.warn('Reading: upgrade persist failed', e);
        }
      }
    },
    [],
  );

  /**
   * Trigger a background full-content fetch for an article whose
   * current body is too short. Aborts any in-flight upgrade for the
   * same link, dedupes against attempts already made this session,
   * and silently no-ops if extract-article isn't available.
   *
   * The returned promise resolves with the upgraded content if the
   * fetch succeeded, or null in every other case (no fetch needed,
   * already attempted, fetch failed, scraper returned nothing). Never
   * throws.
   */
  const ensureFullContent = useCallback(
    async (
      link: string,
      opts?: { force?: boolean },
    ): Promise<{ fullContent: string; image: string | null } | null> => {
      if (!link) return null;
      const article = articlesRef.current.find((a) => a.link === link);
      if (!article) return null;
      const force = opts?.force === true;
      if (!force && !needsContentUpgrade(article.fullContent, link)) return null;
      // Already in flight — let the caller wait on the existing one.
      if (upgradeInFlightRef.current.has(link)) return null;
      // Already attempted (success or fail) — don't hammer the scraper,
      // unless the caller is explicitly retrying (e.g. user pressed
      // "fetch full article" again).
      if (!force && upgradeAttemptedRef.current.has(link)) return null;

      const ctrl = new AbortController();
      upgradeInFlightRef.current.add(link);
      upgradeAbortRef.current.set(link, ctrl);
      try {
        const extracted = await extractArticleBody(link, ctrl.signal);
        upgradeAttemptedRef.current.add(link);
        if (!extracted || !extracted.html) return null;
        await upgradeArticleContent(link, extracted.html, extracted.image);
        return { fullContent: extracted.html, image: extracted.image };
      } finally {
        upgradeInFlightRef.current.delete(link);
        upgradeAbortRef.current.delete(link);
      }
    },
    [upgradeArticleContent],
  );

  /** Cancel any in-flight upgrade for a given link (e.g. user navigated away). */
  const cancelFullContentFetch = useCallback((link: string): void => {
    const ctrl = upgradeAbortRef.current.get(link);
    if (ctrl) {
      ctrl.abort();
      upgradeAbortRef.current.delete(link);
      upgradeInFlightRef.current.delete(link);
    }
  }, []);

  // ─── Bookmark / read mutations ────────────────────────────────────────
  const toggleBookmark = useCallback((link: string) => {
    let nowBookmarked = false;
    setBookmarks((prev) => {
      const exists = prev.includes(link);
      nowBookmarked = !exists;
      const next = exists ? prev.filter((b) => b !== link) : [...prev, link];
      if (exists) {
        deleteBookmark(link);
      } else {
        const article = articlesRef.current.find((a) => a.link === link);
        if (article) {
          setBookmarkArticle(article);
        }
      }
      return next;
    });
    // After *adding* a bookmark we immediately persist the article body
    // so the bookmark survives going offline a moment later. The
    // debounced auto-cache reconciliation (~600 ms) wouldn't — there's
    // a window during which a brand-new bookmark exists in localStorage
    // but not in IDB. Skip on un-bookmark — the article may still be
    // wanted by the rolling auto-cache window.
    if (nowBookmarked) {
      void persistOpenedArticle(link);
      // If the bookmarked article only has a teaser, also kick off a
      // best-effort full-content fetch in the background so when the
      // user comes back to it offline, they actually have something
      // to read.
      void ensureFullContent(link);
    }
  }, [persistOpenedArticle, ensureFullContent]);

  const markAsRead = useCallback((link: string) => {
    setReadArticles((prev) => {
      if (prev.includes(link)) return prev;
      const next = [...prev, link];
      storeReadArticles(next);
      return next;
    });
    // Persist on open (markAsRead is called from the click-
    // handler in Reading.tsx). This guarantees that any article the
    // user actually engages with has an offline copy by the time
    // the next render commits — no debounce window where they could
    // lose it by going offline.
    void persistOpenedArticle(link);
  }, [persistOpenedArticle]);

  const markAllRead = useCallback(() => {
    setReadArticles((prev) => {
      const allLinks = articlesRef.current.map((a) => a.link).filter(Boolean);
      const set = new Set(prev);
      allLinks.forEach((l) => set.add(l));
      const next = Array.from(set);
      storeReadArticles(next);
      return next;
    });
    toast.success('تم التحديد كمقروء');
  }, []);

  /** Restore an article to "unread". Used by the article context menu. */
  const markAsUnread = useCallback((link: string) => {
    setReadArticles((prev) => {
      if (!prev.includes(link)) return prev;
      const next = prev.filter((l) => l !== link);
      storeReadArticles(next);
      return next;
    });
  }, []);

  /**
   * Mark every link in `links` as read in a single state update — used
   * by the "Mark above as read" / "Mark below as read" actions in the
   * article context menu. Treating it as one transaction avoids 50
   * separate setReadArticles calls when the user marks 50 rows.
   */
  const markManyRead = useCallback((links: ReadonlyArray<string>) => {
    if (links.length === 0) return;
    setReadArticles((prev) => {
      const set = new Set(prev);
      let added = 0;
      for (const l of links) {
        if (l && !set.has(l)) {
          set.add(l);
          added++;
        }
      }
      if (added === 0) return prev;
      const next = Array.from(set);
      storeReadArticles(next);
      return next;
    });
    toast.success(
      `تم تحديد ${links.length} مقالة كمقروءة`,
    );
  }, []);

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
        const latestStatuses: FeedStatus[] = Array.isArray(responseData?.statuses)
          ? responseData.statuses as FeedStatus[]
          : [];
        if (latestStatuses.length > 0) {
          setStatuses((previous) => {
            const next = new Map(previous.map((status) => [status.url, status]));
            latestStatuses.forEach((status) => next.set(status.url, status));
            return Array.from(next.values());
          });
        }
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
            `تمت إضافة ${fresh.length} مقال من ${feed.name}`,
          );
        } else {
          toast.info(
            `لا توجد مقالات من ${feed.name}`,
          );
        }
        const now = new Date().toISOString();
        setLastRefresh(now);
        try { localStorage.setItem(LAST_REFRESH_KEY, now); } catch { /* quota or private mode */ }
        setLastError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        toast.error(
          `فشل جلب ${feed.name}: ${msg}`,
        );
      }
    },
    [],
  );

  const refreshFeed = useCallback((url: string) => {
    const feed = feedSourcesRef.current.find((source) => source.url === url);
    if (!feed) return;
    void refreshFeeds(false, [feed]);
  }, [refreshFeeds]);

  const addFeed = useCallback(
    (url: string, name: string, category: string) => {
      const rawUrl = url.trim();
      if (!rawUrl) return false;
      // Normalise hashes and hostname casing before storing. This prevents the
      // same feed being subscribed twice through equivalent pasted URLs.
      // Reject malformed or unsupported links before they can sit in the
      // library and fail on every future refresh.
      let parsed: URL;
      let normalizedUrl: string;
      try {
        parsed = new URL(rawUrl);
        normalizedUrl = normalizeFeedUrl(rawUrl);
      } catch {
        toast.error('الرابط غير صالح');
        return false;
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        toast.error(
          'يجب أن يبدأ الرابط بـ http:// أو https://',
        );
        return false;
      }
      const current = feedSourcesRef.current;
      if (current.some((f) => {
        try { return normalizeFeedUrl(f.url) === normalizedUrl; } catch { return f.url === normalizedUrl; }
      })) {
        toast.error('هذا المصدر موجود');
        return false;
      }
      const feed: FeedSource = {
        url: normalizedUrl,
        name: name.trim() || parsed.hostname,
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
      const current = feedSourcesRef.current;
      if (current.some((f) => f.url === feed.url)) {
        toast.error('هذا المصدر موجود');
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
      const existingByUrl = new Map(
        current.map((feed) => {
          try { return [normalizeFeedUrl(feed.url), feed] as const; } catch { return [feed.url, feed] as const; }
        }),
      );
      const fresh: FeedSource[] = [];
      let skipped = 0;
      for (const f of feeds) {
        const rawUrl = f.url.trim();
        if (!rawUrl) {
          skipped++;
          continue;
        }
        // Validate and normalise each OPML URL before queuing it.
        let parsed: URL;
        let url: string;
        try {
          parsed = new URL(rawUrl);
          url = normalizeFeedUrl(rawUrl);
        } catch {
          skipped++;
          continue;
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          skipped++;
          continue;
        }
        if (existingByUrl.has(url)) {
          skipped++;
          continue;
        }
        const name = f.name.trim() || parsed.hostname;
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
      const next = feedSourcesRef.current.filter((f) => f.url !== url);
      feedSourcesRef.current = next;
      setFeedSources(next);
      storeFeeds(next);
      toast.success('تم الحذف');
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

  // ─── Intelligent Background Pre-fetching Queue ─────────────────────────
  // Proactively scans the top unread articles from enabled feeds and upgrades
  // them in the background while the browser is idle and online.
  // This achieves a flawless VIP experience with instant load times.
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPrefetchingRef = useRef(false);

  useEffect(() => {
    // Only prefetch if online and tab is visible
    if (typeof window === 'undefined' || !navigator.onLine || document.hidden) {
      setPrefetchProgress((prev) => ({ ...prev, active: false }));
      return;
    }

    // Don't run background prefetch while feed refresh/sync is active
    if (refreshing || syncProgress.active) {
      setPrefetchProgress((prev) => ({ ...prev, active: false }));
      return;
    }

    const currentArticles = articles;
    const currentRead = readArticles;
    const readSet = new Set(currentRead);

    // Get top 15 unread articles that need text upgrade
    const candidates = currentArticles
      .filter((a) => a.link && !readSet.has(a.link) && needsContentUpgrade(a.fullContent, a.link))
      .slice(0, 15);

    if (candidates.length === 0) {
      setPrefetchProgress((prev) => ({ ...prev, active: false }));
      return;
    }

    // Set up queue progress
    setPrefetchProgress({
      active: true,
      total: candidates.length,
      current: 0,
      currentTitle: '',
    });

    let queueIndex = 0;
    isPrefetchingRef.current = true;

    const processNext = async () => {
      if (queueIndex >= candidates.length || !isPrefetchingRef.current) {
        setPrefetchProgress((prev) => ({ ...prev, active: false }));
        return;
      }

      const item = candidates[queueIndex];
      setPrefetchProgress((prev) => ({
        ...prev,
        current: queueIndex,
        currentTitle: item.title,
      }));

      try {
        // Execute the upgrade via existing helper which handles caching & memory update
        await ensureFullContent(item.link);
      } catch (e) {
        console.warn('[Reading] prefetch failed for', item.title, e);
      }

      queueIndex++;

      // Snappy but gentle delay (1500ms) between background scrapes to be extremely respectful to servers
      prefetchTimerRef.current = setTimeout(processNext, 1500);
    };

    // Begin progressive background pre-loading after a snappy idle delay (2000ms)
    prefetchTimerRef.current = setTimeout(processNext, 2000);

    return () => {
      isPrefetchingRef.current = false;
      if (prefetchTimerRef.current) {
        clearTimeout(prefetchTimerRef.current);
        prefetchTimerRef.current = null;
      }
    };
  }, [articles, readArticles, refreshing, syncProgress.active, ensureFullContent]);

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
    syncProgress,
    prefetchProgress,
    statuses,
    totalInDB,
    lastRefresh,
    sourceCounts,
    cachedLinks,
    consecutiveFailures,
    lastError,
    // actions
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
    refreshFeed,
    toggleFeedEnabled,
    recacheNow,
    persistOpenedArticle,
    upgradeArticleContent,
    ensureFullContent,
    cancelFullContentFetch,
  };
}

export type ReadingData = ReturnType<typeof useReadingData>;
