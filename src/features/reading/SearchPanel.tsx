import { AnimatePresence,motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { isSupabaseConfigured,supabase } from '@/integrations/supabase/client';
import {
  ChevronLeft, Clock, Loader2, RefreshCw, Search, TrendingUp, X,
} from '@/lib/icons';

import { highlightText } from './highlight';
import { SourcePill } from './SourcePill';
import {
  clearSearchHistory,
  getSearchHistory,
  pushSearchHistory,
  removeSearchHistoryEntry,
  type SearchHistoryEntry,
} from './storage';
import type { FeedItem } from './types';
import { timeAgo } from './utils';

/**
 * Full-archive search.
 *
 * Calls the search-articles edge function which uses Postgres'
 * tsvector + GIN index, so we can scan the full body of every stored
 * article in a few hundred milliseconds.
 *
 * Three layered enhancements over the bare SQL:
 *  - Search history (last 20 queries) shown when the input is empty,
 *    each row tappable + dismissible. Stored locally so suggestions
 *    appear instantly without a roundtrip.
 *  - Time-range chips (today / week / month / all). The chip the user
 *    picks becomes a `since` ISO timestamp on the request.
 *  - Inline `<mark>` highlight on the title + description so users
 *    can see *why* a row matched without re-reading the whole text.
 *    Highlight is Arabic-aware (matches normalised tashkeel/hamza
 *    variants) so the visible underline always lines up with what
 *    the SQL search considered a match.
 */

interface SearchHit {
  link: string;
  title: string;
  description: string;
  pub_date: string | null;
  image: string | null;
  source_name: string;
  rank: number;
}

type Range = 'all' | 'today' | 'week' | 'month';

function rangeToSinceIso(r: Range): string | undefined {
  const now = Date.now();
  const d = 24 * 60 * 60 * 1000;
  if (r === 'today') return new Date(now - d).toISOString();
  if (r === 'week') return new Date(now - 7 * d).toISOString();
  if (r === 'month') return new Date(now - 30 * d).toISOString();
  return undefined;
}

/**
 * Extract a readable message from a `supabase.functions.invoke` error.
 *
 * For non-2xx responses, supabase-js raises `FunctionsHttpError` whose
 * `.message` is the literal string "Edge Function returned a non-2xx
 * status code". The actual error body is on `.context` (a `Response`).
 * We try the JSON body first, then text, then fall back.
 *
 * The reason this matters: without unpacking `context`, every server
 * failure looks identical to the user, which is what made the search
 * panel feel broken whenever the backend hiccuped.
 */
async function readFunctionsError(
  err: unknown,
  fallback: string,
): Promise<string> {
  if (!err) return fallback;
  const e = err as { message?: string; context?: unknown };
  const ctx = e?.context;
  if (ctx && typeof ctx === 'object') {
    const r = ctx as Response & { json?: () => Promise<unknown>; text?: () => Promise<string> };
    // Only the *first* read of a Response body succeeds, so we clone
    // before reading. supabase-js may have read it already; in that
    // case .clone() throws and we fall through.
    try {
      const cloned = typeof (r as Response).clone === 'function'
        ? (r as Response).clone()
        : null;
      if (cloned) {
        const text = await cloned.text();
        if (text) {
          try {
            const parsed = JSON.parse(text) as { error?: string; message?: string; note?: string };
            return parsed.error || parsed.message || parsed.note || text.slice(0, 200);
          } catch {
            return text.slice(0, 200);
          }
        }
      }
    } catch { /* ignore — body already consumed */ }
  }
  if (typeof e?.message === 'string' && e.message && !/non-2xx status code/i.test(e.message)) {
    return e.message;
  }
  return fallback;
}

export function SearchPanel({
  language,
  restrictTo,
  onBack,
  onOpenArticle,
}: {
  language: string;
  restrictTo?: string[];
  onBack: () => void;
  onOpenArticle: (item: FeedItem) => void;
}) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [error, setError] = useState('');
  const [range, setRange] = useState<Range>('all');
  const [history, setHistory] = useState<SearchHistoryEntry[]>(getSearchHistory);
  // Bumping this triggers a re-fetch of the *current* debounced query
  // even if neither the query nor the filters changed — used by the
  // Retry button after a transient failure.
  const [retryNonce, setRetryNonce] = useState(0);
  // Track in-flight requests so we ignore stale results when the user
  // types fast or hits Retry mid-request.
  const reqIdRef = useRef(0);

  // Debounce keyboard input by 350 ms.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    const myReqId = ++reqIdRef.current;
    const run = async () => {
      if (debounced.length < 2) {
        setHits([]);
        setError('');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        // Backend not wired (env vars missing in this build). Avoid the
        // noisy raw English error from the noop fetch and show a
        // localized, friendly message instead.
        if (!isSupabaseConfigured) {
          setError(
            'خدمة البحث غير متاحة حاليًا. حاول مجدّدًا لاحقًا.',
          );
          setHits([]);
          return;
        }
        const { data, error } = await supabase.functions.invoke(
          'search-articles',
          {
            body: {
              q: debounced,
              sources: restrictTo === undefined ? null : restrictTo,
              limit: 100,
              since: rangeToSinceIso(range),
            },
          },
        );
        // A newer request started — drop this result on the floor.
        if (cancelled || myReqId !== reqIdRef.current) return;
        if (error) {
          const msg = await readFunctionsError(
            error,
            'تعذّر البحث',
          );
          // Map the well-known "not configured" 503 body to a friendly
          // localized line — the raw English JSON used to leak into UI.
          setError(
            /supabase_not_configured|environment variables are missing/i.test(msg)
              ? ('خدمة البحث غير متاحة حاليًا. حاول مجدّدًا لاحقًا.')
              : msg,
          );
          setHits([]);
          return;
        }
        const payload = data as
          | { results?: SearchHit[]; error?: string; note?: string }
          | null;
        if (payload?.error) {
          // The function decided to return 200 with an error string
          // (or an explanatory note). Treat both uniformly.
          setError(payload.error);
          setHits([]);
          return;
        }
        const results = payload?.results || [];
        setHits(results);
        // Persist as history once a debounced query has resolved
        // (avoids storing every keystroke). We only push on the
        // "all" range so the suggestion list remains stable
        // regardless of which time-range chip was active.
        if (range === 'all' && results.length > 0) {
          pushSearchHistory(debounced, results.length);
          setHistory(getSearchHistory());
        }
      } catch (e: unknown) {
        if (cancelled || myReqId !== reqIdRef.current) return;
        const msg = await readFunctionsError(
          e,
          'تعذّر البحث',
        );
        setError(msg);
        setHits([]);
      } finally {
        if (!cancelled && myReqId === reqIdRef.current) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced, restrictTo, range, retryNonce]);

  const headline = useMemo(() => {
    if (q.length === 0 || debounced.length < 2) return '';
    if (loading) {
      return 'جاري البحث...';
    }
    // When an error is set the dedicated error block below explains
    // what happened — don't *also* claim "no results", that's a
    // confusing double-message (the original UX bug from the report).
    if (error) return '';
    if (hits.length === 0) {
      return `لا نتائج لـ "${debounced}"`;
    }
    return `${hits.length} نتيجة لـ "${debounced}"`;
  }, [q.length, debounced, loading, hits.length, error]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col min-h-screen"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 app-sticky-header-card z-raised">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={'رجوع'}
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <Search className="h-4 w-4 text-primary" />
        <h3 className="text-body font-bold flex-1">
          {'بحث الأرشيف'}
        </h3>
      </div>

      <div className="px-4 py-3 border-b border-border/30 space-y-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder={'ابحث في كل المقالات المؤرشفة...'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="ps-10 h-11 text-meta rounded-xl"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-accent/40"
              aria-label={'مسح'}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Time-range chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', ar: 'كل الأرشيف', en: 'All' },
              { id: 'today', ar: 'اليوم', en: 'Today' },
              { id: 'week', ar: 'الأسبوع', en: 'This week' },
              { id: 'month', ar: 'الشهر', en: 'This month' },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 rounded-full text-mini font-medium transition-colors shrink-0 ${
                range === r.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'
              }`}
            >
              {r.ar}
            </button>
          ))}
          {restrictTo && restrictTo.length > 0 && (
            <span className="ms-auto shrink-0 text-micro text-muted-foreground/70">
              {`${restrictTo.length} مصدر مفعّل`}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Empty input → recent search history */}
        {q.length === 0 && (
          <RecentSearches
            history={history}
            onPick={(s) => setQ(s)}
            onRemove={(s) => {
              removeSearchHistoryEntry(s);
              setHistory(getSearchHistory());
            }}
            onClear={() => {
              clearSearchHistory();
              setHistory([]);
            }}
          />
        )}

        {/* Header strip — counts / loading / error */}
        {q.length > 0 && (
          <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            <span className="text-micro text-muted-foreground tabular-nums">
              {headline}
            </span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Search className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="text-meta font-medium text-foreground">
                {'تعذّر إكمال البحث'}
              </p>
              <p className="text-mini text-muted-foreground max-w-xs leading-relaxed">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRetryNonce((n) => n + 1)}
              className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-mini font-medium transition-colors active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {'إعادة المحاولة'}
            </button>
          </div>
        )}

        {!loading && !error && q.length > 0 && debounced.length < 2 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-6">
            <p className="text-meta text-muted-foreground">
              {'اكتب حرفين على الأقل'}
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {hits.map((hit, i) => (
            <motion.button
              key={hit.link}
              type="button"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.25) }}
              onClick={() =>
                onOpenArticle({
                  title: hit.title,
                  link: hit.link,
                  description: hit.description,
                  pubDate: hit.pub_date || '',
                  image: hit.image,
                  images: hit.image ? [hit.image] : [],
                  source: hit.source_name,
                })}
              className="w-full text-start p-4 hover:bg-accent/20 active:bg-accent/30 transition-colors flex gap-3 border-b border-border/15"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-meta font-semibold leading-snug line-clamp-2">
                  {highlightText(hit.title, debounced)}
                </h4>
                {hit.description && (
                  <p className="text-mini text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {highlightText(hit.description, debounced)}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <SourcePill name={hit.source_name} size="sm" />
                  <span className="text-micro text-foreground/70 font-medium">
                    {hit.source_name}
                  </span>
                  {hit.pub_date && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <span className="text-micro text-muted-foreground/70">
                        {timeAgo(hit.pub_date, language)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {hit.image && (
                <img
                  src={hit.image}
                  alt=""
                  className="w-16 h-16 object-cover rounded-xl shrink-0"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Recent searches block ──────────────────────────────────────────────

function RecentSearches({
  history,
  onPick,
  onRemove,
  onClear,
}: {
  history: SearchHistoryEntry[];
  onPick: (q: string) => void;
  onRemove: (q: string) => void;
  onClear: () => void;
}) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
        <Search className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-meta text-muted-foreground max-w-xs">
          {'اكتب كلمتين أو أكثر للبحث في كامل الأرشيف'}
        </p>
      </div>
    );
  }
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-micro uppercase tracking-wider font-bold text-muted-foreground inline-flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {'عمليات البحث الأخيرة'}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-micro text-muted-foreground hover:text-foreground transition-colors"
        >
          {'مسح الكل'}
        </button>
      </div>
      <div className="space-y-1">
        {history.map((entry) => (
          <div
            key={entry.q}
            className="group flex items-center gap-2 rounded-xl hover:bg-accent/15 transition-colors"
          >
            <button
              type="button"
              onClick={() => onPick(entry.q)}
              className="flex-1 text-start flex items-center gap-3 py-2 ps-3 min-w-0"
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <span className="text-meta truncate flex-1">{entry.q}</span>
              {typeof entry.hits === 'number' && entry.hits > 0 && (
                <span className="text-micro text-muted-foreground/60 inline-flex items-center gap-1 shrink-0">
                  <TrendingUp className="h-2.5 w-2.5" />
                  {entry.hits}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onRemove(entry.q)}
              className="p-1.5 me-2 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent/40 transition-opacity"
              aria-label={'إزالة'}
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
