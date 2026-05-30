import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark, BookmarkCheck, ChevronLeft, Clipboard, ExternalLink,
  History, Loader2, Trash2, Type, X,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeRssHtml } from '@/utils/sanitizeRssHtml';
import type { ReaderPrefs } from './types';
import { ReaderPrefsPopover } from './ReaderPrefsPopover';
import { ArticleDetailSkeleton } from './Skeletons';
import { offlineDb } from './offlineDb';
import { readingMinutes, safeHref, timeAgo } from './utils';
import {
  type ReaderHistoryEntry,
  clearReaderHistory,
  getReaderHistory,
  pushReaderHistory,
  removeReaderHistoryEntry,
} from './storage';
import { toast } from 'sonner';

/**
 * ReaderView — turns any URL the user pastes into a clean, readable
 * article rendered with the same typography controls and progress bar
 * as the in-feed reader.
 *
 * Three deep enhancements layered onto the basic flow:
 *
 *  - **Clipboard paste-detection**: when the URL field is empty AND
 *    the page becomes visible (i.e. the user just switched back to
 *    this tab), we silently peek at the clipboard. If it contains a
 *    URL the user hasn't already read, we surface a "Read this?" pill
 *    above the input. One tap loads the article — no manual paste
 *    required. The peek uses the async Clipboard API and degrades
 *    gracefully on browsers that block read access.
 *
 *  - **Recently-read history (last 20)**: every successful extract is
 *    written to localStorage with title, site name, image, timestamp.
 *    When the input is empty we render the list as tappable rows,
 *    each individually removable + a "Clear all" affordance.
 *
 *  - **Offline-first read**: still tries IndexedDB before the network
 *    so a previously-saved article is instantly readable without a
 *    connection. Same as before, just kept here for completeness.
 */

/**
 * Extract every absolute http(s) image URL from the rendered article
 * body so we can pass them to the Service Worker pre-cache. Reuses
 * the same conservative URL filter as `clientFetcher.extractImages`
 * (no data:, blob:, or javascript: URLs make it through).
 */
function extractImagesFromHtml(html: string): string[] {
  if (!html) return [];
  const imgs: string[] = [];
  const re = /<img[^>]*?(?:src|data-src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const u = m[1];
    if (!u) continue;
    let abs = u;
    if (u.startsWith('//')) abs = `https:${u}`;
    else if (!/^https?:\/\//i.test(u)) continue;
    if (!imgs.includes(abs)) imgs.push(abs);
  }
  return imgs;
}

interface ExtractedArticle {
  url: string;
  title: string;
  siteName?: string;
  description?: string;
  image: string | null;
  html: string;
}

export function ReaderView({
  isAr,
  language,
  prefs,
  onChangePrefs,
  onBack,
  initialUrl,
  isBookmarked,
  onToggleBookmark,
}: {
  isAr: boolean;
  language: string;
  prefs: ReaderPrefs;
  onChangePrefs: (p: ReaderPrefs) => void;
  onBack: () => void;
  initialUrl?: string;
  isBookmarked?: boolean;
  onToggleBookmark?: (link: string) => void;
}) {
  const [input, setInput] = useState(initialUrl ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [article, setArticle] = useState<ExtractedArticle | null>(null);
  const [history, setHistory] = useState<ReaderHistoryEntry[]>(getReaderHistory);
  /** A URL we found in the clipboard that the user hasn't read yet.
   *  Surfaced as a "Read this?" pill above the input; tapping it
   *  loads the article. We never auto-load — that would be creepy. */
  const [clipboardSuggestion, setClipboardSuggestion] = useState<string | null>(null);
  /** Tracks the last URL we offered as a clipboard suggestion this
   *  session, so we don't keep re-suggesting it after the user
   *  dismisses it. */
  const dismissedClipboardRef = useRef<Set<string>>(new Set());
  // The reader has two related but distinct flags:
  //  - `saved`: the article body is in our IndexedDB offline store
  //    (so it survives going offline / clearing the network cache).
  //  - `bookmarked`: the user has marked it for later in the bookmarks
  //    list (so it shows up in the Saved tab on the main list).
  // The Save button toggles BOTH together, since "save for later"
  // should always be visible to the user regardless of whether they
  // pasted the link or it came from a feed.
  const [saved, setSaved] = useState(false);

  const sizeMap: Record<ReaderPrefs['fontSize'], string> = {
    sm: '13px',
    md: '15px',
    lg: '17px',
    xl: '19px',
  };
  const heightMap: Record<ReaderPrefs['lineHeight'], string> = {
    compact: '1.65',
    normal: '1.85',
    relaxed: '2.05',
  };
  const themeStyle = (() => {
    if (prefs.theme === 'sepia') return { background: '#f4ecd8', color: '#3a2f1d' };
    if (prefs.theme === 'dim') return { background: '#1f1f23', color: '#e8e6e3' };
    return {} as React.CSSProperties;
  })();

  // If we land here with an initialUrl, extract immediately.
  useEffect(() => {
    if (initialUrl) handleExtract(initialUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Clipboard suggestion ──────────────────────────────────────────────
  // Peek at the clipboard whenever the page becomes visible AND the
  // input is empty. If it contains a URL we haven't already read,
  // surface a one-tap "Read this?" pill. We never auto-load — even
  // when the user grants clipboard permission, silently navigating on
  // their behalf would feel like surveillance.
  useEffect(() => {
    let cancelled = false;
    async function peek() {
      if (input.trim().length > 0) return;
      if (article) return;
      if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return;
      // Some browsers (Firefox) require an explicit user gesture, so
      // navigator.clipboard.readText() throws. We just swallow the
      // failure — the manual paste flow is still there.
      let text = '';
      try {
        text = await navigator.clipboard.readText();
      } catch { return; }
      if (cancelled) return;
      const trimmed = (text || '').trim();
      if (!trimmed || trimmed.length > 2048) return;
      if (!/^https?:\/\//i.test(trimmed)) return;
      // Don't suggest URLs the user has already read in this device.
      if (history.some((h) => h.url === trimmed)) return;
      // Don't re-suggest a URL the user dismissed this session.
      if (dismissedClipboardRef.current.has(trimmed)) return;
      setClipboardSuggestion(trimmed);
    }
    void peek();
    const onVis = () => {
      if (document.visibilityState === 'visible') void peek();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [input, article, history]);

  async function handleExtract(rawUrl?: string) {
    const url = (rawUrl ?? input).trim();
    if (!url) return;
    setLoading(true);
    setError('');
    setArticle(null);
    setSaved(false);
    // First, try the offline cache — instant, and works even if we're
    // disconnected. We still hit the edge function below to refresh
    // the content if we have network, but having the cached version
    // ready means a previously-saved article is readable on a plane.
    try {
      const cached = await offlineDb.getArticle(url);
      if (cached) {
        setArticle({
          url: cached.link,
          title: cached.title,
          siteName: cached.source || undefined,
          description: cached.description,
          image: cached.image,
          html: cached.fullContent || '',
        });
        setSaved(true);
        // If we're offline, that's the final answer.
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setLoading(false);
          return;
        }
      }
    } catch { /* IDB unavailable, fall through */ }
    try {
      const { data, error } = await supabase.functions.invoke(
        'extract-article',
        { body: { url } },
      );
      if (error) throw error;
      const payload = data as ExtractedArticle & { error?: string };
      if (payload.error) throw new Error(payload.error);
      // If we got at least an image OR html, surface what we have.
      if (!payload.html && !payload.image) {
        throw new Error(
          isAr
            ? 'لم يتم العثور على محتوى قابل للقراءة'
            : 'No readable content found',
        );
      }
      setArticle(payload);
      // Record successful read in local history so it shows up in the
      // "recently read" list when the URL field is empty next time.
      pushReaderHistory({
        url: payload.url || url,
        title: payload.title || url,
        siteName: payload.siteName,
        image: payload.image,
      });
      setHistory(getReaderHistory());
      // Clear the clipboard suggestion if it matched.
      if (clipboardSuggestion && clipboardSuggestion === url) {
        dismissedClipboardRef.current.add(url);
        setClipboardSuggestion(null);
      }
      // Auto-cache every image referenced in the article body so the
      // user can re-read offline. We hand the list to the SW which
      // does the actual fetching with mode:'no-cors'.
      const allImages = Array.from(new Set([
        ...(payload.image ? [payload.image] : []),
        ...extractImagesFromHtml(payload.html || ''),
      ]));
      if (allImages.length > 0 && typeof navigator !== 'undefined') {
        try {
          const reg = await navigator.serviceWorker?.ready;
          reg?.active?.postMessage({ type: 'reading:precache', urls: allImages });
        } catch { /* SW unavailable; the offline save still works on next refresh */ }
      }
    } catch (e: any) {
      // If we already populated `article` from the cache above, keep
      // it visible — the network refresh failed but the user can read
      // the cached copy.
      if (!article) {
        // supabase-js wraps non-2xx responses in a generic
        // "Edge Function returned a non-2xx status code" error. Try to
        // read the JSON body the function actually returned so we can
        // surface a meaningful message instead of that opaque string.
        let detail = '';
        try {
          const ctx = e?.context;
          if (ctx && typeof ctx.json === 'function') {
            const parsed = await ctx.json();
            if (parsed && typeof parsed.error === 'string') detail = parsed.error;
          } else if (ctx && typeof ctx.text === 'function') {
            const txt = await ctx.text();
            try {
              const parsed = JSON.parse(txt);
              if (parsed && typeof parsed.error === 'string') detail = parsed.error;
              else detail = txt;
            } catch { detail = txt; }
          }
        } catch { /* ignore body parse failures */ }
        const raw = (detail || e?.message || '').trim();
        const looksGeneric =
          /non-2xx status code/i.test(raw) ||
          /failed to fetch/i.test(raw) ||
          /supabase_not_configured/i.test(raw) ||
          /environment variables are missing/i.test(raw);
        setError(
          looksGeneric || !raw
            ? (isAr ? 'تعذّر استخراج المقال من هذا الرابط' : 'Could not extract this article')
            : raw,
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // Keep the local "saved" indicator in sync when the parent's
  // bookmark list changes (e.g. user un-saved from another view).
  useEffect(() => {
    if (typeof isBookmarked === 'boolean') setSaved(isBookmarked);
  }, [isBookmarked]);

  async function handleSave() {
    if (!article) return;
    if (saved) {
      // Toggle off: remove from offline store and bookmarks.
      await offlineDb.removeArticle(article.url).catch(() => undefined);
      onToggleBookmark?.(article.url);
      setSaved(false);
      toast.success(isAr ? 'أُزيل من المحفوظات' : 'Removed from saved');
      return;
    }
    // Extract every <img> URL from the sanitised body so the SW can
    // pre-cache them. Without this, only the hero image survives going
    // offline — inline figures inside the article would 404.
    const inlineImages = extractImagesFromHtml(article.html);
    const images = Array.from(new Set([
      ...(article.image ? [article.image] : []),
      ...inlineImages,
    ]));
    await offlineDb.saveArticle({
      title: article.title,
      link: article.url,
      description: article.description || '',
      fullContent: article.html,
      pubDate: new Date().toISOString(),
      image: article.image,
      images,
      source: article.siteName ||
        (() => {
          try { return new URL(article.url).hostname; } catch { return ''; }
        })(),
    });
    // Mirror the save into bookmarks so it appears in the Saved tab on
    // the main list. We only call onToggleBookmark when the parent
    // says it's not currently bookmarked — otherwise we'd accidentally
    // un-bookmark an existing entry.
    if (onToggleBookmark && !isBookmarked) {
      onToggleBookmark(article.url);
    }
    setSaved(true);
    toast.success(isAr ? 'تم الحفظ للقراءة لاحقاً' : 'Saved for offline reading');
  }

  const minutes = article
    ? readingMinutes(article.html, language)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col min-h-screen"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-20">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={isAr ? 'رجوع' : 'Back'}
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <Type className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold flex-1">
          {isAr ? 'قراءة رابط' : 'Reader View'}
        </h3>
        {article && (
          <>
            <ReaderPrefsPopover prefs={prefs} onChange={onChangePrefs} isAr={isAr} />
            <button
              type="button"
              onClick={handleSave}
              className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
              aria-label={isAr
                ? (saved ? 'إزالة' : 'حفظ')
                : (saved ? 'Unsave' : 'Save offline')}
              title={isAr
                ? (saved ? 'إزالة من المحفوظات' : 'حفظ للقراءة لاحقاً')
                : (saved ? 'Remove from saved' : 'Save offline')}
            >
              {saved
                ? <BookmarkCheck className="h-4 w-4 text-primary" />
                : <Bookmark className="h-4 w-4 text-muted-foreground" />}
            </button>
            <a
              href={safeHref(article.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
              aria-label={isAr ? 'الرابط الأصلي' : 'Original'}
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </>
        )}
      </div>

      <div className="px-4 py-4 border-b border-border/30 space-y-2.5">
        {/* Clipboard suggestion pill — only when input is empty and we
            actually found a fresh URL on the clipboard. */}
        <AnimatePresence>
          {clipboardSuggestion && input.trim().length === 0 && !article && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onClick={() => {
                setInput(clipboardSuggestion);
                handleExtract(clipboardSuggestion);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-primary/10 hover:bg-primary/15 transition-colors text-start"
            >
              <span className="w-8 h-8 rounded-xl bg-primary/15 text-primary inline-flex items-center justify-center shrink-0">
                <Clipboard className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-primary mb-0.5">
                  {isAr ? 'رابط في الحافظة' : 'URL on your clipboard'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate" dir="ltr">
                  {clipboardSuggestion}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissedClipboardRef.current.add(clipboardSuggestion);
                  setClipboardSuggestion(null);
                }}
                className="p-1.5 rounded-md hover:bg-primary/20"
                aria-label={isAr ? 'تجاهل' : 'Dismiss'}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </motion.button>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          <Input
            dir="ltr"
            placeholder="https://..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleExtract();
            }}
            className="flex-1 h-10 text-sm rounded-xl"
            disabled={loading}
          />
          <Button
            onClick={() => handleExtract()}
            disabled={!input.trim() || loading}
            className="shrink-0 h-10 rounded-xl"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : (isAr ? 'اقرأ' : 'Read')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={themeStyle}>
        {loading && <ArticleDetailSkeleton />}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center text-center py-20 gap-3 px-6">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}
        {!loading && !error && !article && history.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-3 px-6">
            <Type className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground max-w-xs">
              {isAr
                ? 'الصق رابط أي مقال — سنعرضه بدون إعلانات بنفس وضع القراءة'
                : 'Paste any article URL — we’ll show it ad-free in the same reader mode'}
            </p>
          </div>
        )}
        {!loading && !error && !article && history.length > 0 && (
          <ReaderHistoryList
            history={history}
            isAr={isAr}
            language={language}
            onPick={(url) => {
              setInput(url);
              handleExtract(url);
            }}
            onRemove={(url) => {
              removeReaderHistoryEntry(url);
              setHistory(getReaderHistory());
            }}
            onClear={() => {
              clearReaderHistory();
              setHistory([]);
            }}
          />
        )}
        {article && (
          <article className="px-5 pt-5 pb-16 max-w-prose mx-auto">
            <h2
              dir="auto"
              className="text-xl font-bold leading-snug mb-3"
              style={{
                fontFamily: prefs.fontFamily === 'serif' ? 'Georgia, serif' : undefined,
              }}
            >
              {article.title}
            </h2>
            <div className="flex items-center gap-2 mb-5 flex-wrap text-xs opacity-70" dir="auto">
              {article.siteName && <span>{article.siteName}</span>}
              {article.siteName && minutes > 0 && (
                <span className="w-1 h-1 rounded-full bg-current opacity-30" />
              )}
              {minutes > 0 && (
                <span>{isAr ? `${minutes} دقيقة قراءة` : `${minutes} min read`}</span>
              )}
            </div>
            {article.image && (
              <img
                src={article.image}
                alt=""
                className="w-full rounded-2xl mb-5 max-h-[420px] object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div
              dir="auto"
              className="prose prose-sm dark:prose-invert max-w-none
                [&_img]:rounded-xl [&_img]:my-4 [&_img]:w-full [&_img]:max-h-[420px] [&_img]:object-cover
                [&_a]:text-primary [&_a]:no-underline [&_a]:font-medium [&_a:hover]:underline
                [&_h1,&_h2,&_h3]:font-bold [&_h1,&_h2,&_h3]:mt-6 [&_h1,&_h2,&_h3]:mb-2
                [&_p]:mb-4
                [&_blockquote]:border-s-2 [&_blockquote]:border-primary/40 [&_blockquote]:ps-4 [&_blockquote]:italic [&_blockquote]:my-4
                [&_ul,&_ol]:my-3 [&_ul,&_ol]:ps-6 [&_li]:mb-1"
              style={{
                fontSize: sizeMap[prefs.fontSize],
                lineHeight: heightMap[prefs.lineHeight],
                fontFamily: prefs.fontFamily === 'serif' ? 'Georgia, serif' : undefined,
              }}
              dangerouslySetInnerHTML={{
                __html: sanitizeRssHtml(article.html),
              }}
            />
          </article>
        )}
      </div>
    </motion.div>
  );
}



// ─── Recently-read history ─────────────────────────────────────────────

function ReaderHistoryList({
  history,
  isAr,
  language,
  onPick,
  onRemove,
  onClear,
}: {
  history: ReaderHistoryEntry[];
  isAr: boolean;
  language: string;
  onPick: (url: string) => void;
  onRemove: (url: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground inline-flex items-center gap-1.5">
          <History className="h-3 w-3" />
          {isAr ? 'قراءات حديثة' : 'Recently read'}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {isAr ? 'مسح الكل' : 'Clear all'}
        </button>
      </div>
      <div className="space-y-1.5">
        {history.map((entry) => (
          <div
            key={entry.url}
            className="group flex items-stretch gap-2 rounded-2xl hover:bg-accent/15 transition-colors"
          >
            <button
              type="button"
              onClick={() => onPick(entry.url)}
              className="flex-1 flex gap-3 items-start p-2.5 text-start min-w-0"
            >
              {entry.image
                ? (
                  <img
                    src={entry.image}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )
                : (
                  <span className="w-12 h-12 rounded-xl bg-primary/10 inline-flex items-center justify-center shrink-0">
                    <Type className="h-4 w-4 text-primary" />
                  </span>
                )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold line-clamp-2 leading-snug">
                  {entry.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {entry.siteName && (
                    <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                      {entry.siteName}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/70">
                    {timeAgo(new Date(entry.at).toISOString(), language)}
                  </span>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onRemove(entry.url)}
              className="px-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
              aria-label={isAr ? 'إزالة' : 'Remove'}
              title={isAr ? 'إزالة' : 'Remove'}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive/80" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
