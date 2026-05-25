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
import {
  extractArticleBody,
  needsContentUpgrade,
  plainTextLength,
} from './extractArticle';
import type { Database } from '@/integrations/supabase/types';

type RssArticleRow = Database['public']['Tables']['rss_articles']['Row'];

// ─── Constants for stability & memory management ───────────────────────────
/** Max articles held in memory at once — no hard limit; we rely on
 *  the DB query's own LIMIT (500) and browser memory. The user should
 *  never lose access to articles just because the list grew large. */
const MAX_ARTICLES_IN_MEMORY = 2000;
/** Base auto-refresh interval (ms). Adapts based on consecutive failures. */
const BASE_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour
/** Minimum refresh interval even with exponential backoff. */
const MIN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min
/** Maximum refresh interval on repeated failures. */
const MAX_REFRESH_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
/** Staleness threshold — auto-refresh on mount if older than this. */
const STALE_THRESHOLD = 15 * 60 * 1000; // 15 min

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
  const isArRef = useRef(isAr);
  useEffect(() => { feedSourcesRef.current = feedSources; }, [feedSources]);
  useEffect(() => { bookmarksRef.current = bookmarks; }, [bookmarks]);
  useEffect(() => { readArticlesRef.current = readArticles; }, [readArticles]);
  useEffect(() => { articlesRef.current = articles; }, [articles]);
  useEffect(() => { isArRef.current = isAr; }, [isAr]);

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
        .select('*', { count: 'exact' })
        .in('source_name', names)
        .order('pub_date', { ascending: false })
        .limit(500);
      if (queryError) {
        throw queryError;
      }
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
              const statusesArr: FeedStatus[] = Array.isArray(data?.statuses)
                ? (data.statuses as FeedStatus[])
                : [];
              if (statusesArr.length) setStatuses(statusesArr);

              // Last-resort fallback: if every requested feed errored
              // server-side (Supabase egress blocked, regional outage,
              // CDN-level shadow-ban), don't mark this refresh as
              // "succeeded" — fall through to the client-side proxy
              // path. The browser can sometimes reach feeds the edge
              // function can't, especially on networks where the user
              // sits behind a captive portal whitelisting only their
              // own region.
              const allFailed = statusesArr.length > 0
                && statusesArr.every((s) => s.status === 'error');

              if (allFailed) {
                console.warn(
                  '[Reading] All feeds errored server-side, retrying client-side',
                );
                // Leave succeeded=false; client-side block runs next.
              } else {
                const failedFeeds = statusesArr.filter((s) => s.status === 'error');
                if (failedFeeds.length > 0 && !silent) {
                  toast.warning(
                    ar
                      ? `تم التحديث، لكن فشل ${failedFeeds.length} مصدر`
                      : `Refreshed, but ${failedFeeds.length} feed(s) failed`,
                  );
                }
                await loadFromDB();
                // After loadFromDB updates state, auto-save the freshly
                // loaded articles to IndexedDB so they're available offline.
                // We do this in the background — no need to await.
                const currentArticlesSnapshot = articlesRef.current;
                if (currentArticlesSnapshot.length > 0) {
                  void offlineDb.saveArticlesBatch(currentArticlesSnapshot).catch(() => {});
                }
                succeeded = true;
              }
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
              return capArticles(merged);
            });
            // Auto-save ALL fetched articles to IndexedDB for offline access.
            // Uses batch write for performance — the user should always be
            // able to return to previously-fetched articles even offline.
            void offlineDb.saveArticlesBatch(freshArticles).catch(() => {});
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
          // Reset consecutive failures on success
          consecutiveFailuresRef.current = 0;
          setConsecutiveFailures(0);
          setLastError(null);
        } else if (!silent) {
          toast.error(ar ? 'فشل التحديث — تحقق من اتصال الإنترنت' : 'Refresh failed — check your connection');
          consecutiveFailuresRef.current += 1;
          setConsecutiveFailures(consecutiveFailuresRef.current);
          setLastError(ar ? 'فشل التحديث' : 'Refresh failed');
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
        if (!silent) toast.error(ar ? 'فشل التحديث' : 'Refresh failed');
      } finally {
        setRefreshing(false);
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

    loadFromDB().finally(() => {
      if (cancelled) return;
      setLoading(false);
      // ALWAYS attempt a refresh on mount — the user expects to see
      // the latest articles when they open إطلاع. We only skip if
      // the last refresh was very recent (< 5 min).
      const last = localStorage.getItem(LAST_REFRESH_KEY);
      const recent = last &&
        Date.now() - new Date(last).getTime() < MIN_REFRESH_INTERVAL;
      if (!recent) void refreshFeeds(true);
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
  useEffect(() => {
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
          const ar = isArRef.current;
          toast.warning(
            ar
              ? 'مساحة التخزين منخفضة — قد لا تُحفظ مقالات جديدة دون اتصال'
              : 'Storage low — new articles may not save offline',
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
    async (link: string): Promise<{ fullContent: string; image: string | null } | null> => {
      if (!link) return null;
      const article = articlesRef.current.find((a) => a.link === link);
      if (!article) return null;
      if (!needsContentUpgrade(article.fullContent, link)) return null;
      // Already in flight — let the caller wait on the existing one.
      if (upgradeInFlightRef.current.has(link)) return null;
      // Already attempted (success or fail) — don't hammer the scraper.
      if (upgradeAttemptedRef.current.has(link)) return null;

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
      storeBookmarks(next);
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
    // Persist on open (markAsRead is called from the click-to-open
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
      // Hard-validate the URL before persisting. A malformed feed URL
      // (typo, copy-paste from rich text, accidental space) silently
      // sat in localStorage on the previous version, then errored on
      // every refresh forever. Reject upfront so the user sees the
      // problem at add-time, when they can correct it.
      let parsed: URL;
      try {
        parsed = new URL(trimmed);
      } catch {
        toast.error(ar ? 'الرابط غير صالح' : 'Invalid URL');
        return false;
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        toast.error(
          ar
            ? 'يجب أن يبدأ الرابط بـ http:// أو https://'
            : 'URL must use http:// or https://',
        );
        return false;
      }
      const current = feedSourcesRef.current;
      if (current.some((f) => f.url === trimmed)) {
        toast.error(ar ? 'هذا المصدر موجود' : 'Feed already exists');
        return false;
      }
      const feed: FeedSource = {
        url: trimmed,
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
        // Validate URL before queuing — bad URLs in OPML imports
        // would otherwise sit in localStorage failing forever.
        let parsed: URL;
        try {
          parsed = new URL(url);
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
    consecutiveFailures,
    lastError,
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
    persistOpenedArticle,
    upgradeArticleContent,
    ensureFullContent,
    cancelFullContentFetch,
  };
}

export type ReadingData = ReturnType<typeof useReadingData>;
