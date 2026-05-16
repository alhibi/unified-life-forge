import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bookmark, BookmarkCheck, ChevronLeft, ExternalLink, Loader2, Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeRssHtml } from '@/utils/sanitizeRssHtml';
import type { ReaderPrefs } from './types';
import { ReaderPrefsPopover } from './ReaderPrefsPopover';
import { ArticleDetailSkeleton } from './Skeletons';
import { offlineDb } from './offlineDb';
import { readingMinutes } from './utils';
import { toast } from 'sonner';

/**
 * ReaderView — turns any URL the user pastes into a clean, readable
 * article rendered with the same typography controls and progress bar
 * as the in-feed reader. Calls the extract-article edge function and
 * lets the user save the result for offline reading even though it
 * wasn't published in any of their RSS feeds.
 */

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
      // Auto-cache the hero image so offline rendering works.
      if (payload.image) void offlineDb.cacheImage(payload.image);
    } catch (e: any) {
      // If we already populated `article` from the cache above, keep
      // it visible — the network refresh failed but the user can read
      // the cached copy.
      if (!article) {
        setError(
          e?.message ||
            (isAr ? 'تعذّر استخراج المقال' : 'Could not extract article'),
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
    await offlineDb.saveArticle({
      title: article.title,
      link: article.url,
      description: article.description || '',
      fullContent: article.html,
      pubDate: new Date().toISOString(),
      image: article.image,
      images: article.image ? [article.image] : [],
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
              href={article.url}
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

      <div className="px-4 py-4 border-b border-border/30">
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
        {!loading && !error && !article && (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-3 px-6">
            <Type className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground max-w-xs">
              {isAr
                ? 'الصق رابط أي مقال — سنعرضه بدون إعلانات بنفس وضع القراءة'
                : 'Paste any article URL — we’ll show it ad-free in the same reader mode'}
            </p>
          </div>
        )}
        {article && (
          <article className="px-5 pt-5 pb-16 max-w-prose mx-auto">
            <h2
              className="text-xl font-bold leading-snug mb-3"
              style={{
                fontFamily: prefs.fontFamily === 'serif' ? 'Georgia, serif' : undefined,
              }}
            >
              {article.title}
            </h2>
            <div className="flex items-center gap-2 mb-5 flex-wrap text-xs opacity-70">
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
