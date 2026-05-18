import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bookmark, BookmarkCheck, ChevronLeft, Clock, Copy,
  ExternalLink, Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { notify } from '@/lib/notify';
import { sanitizeRssHtml } from '@/utils/sanitizeRssHtml';
import type { FeedItem, ReaderPrefs } from './types';
import { formatDate, readingMinutes } from './utils';
import { ReaderPrefsPopover } from './ReaderPrefsPopover';
import { SourcePill } from './SourcePill';
import { ArticleDetailSkeleton } from './Skeletons';

/**
 * Article reader view. Renders sanitized HTML body, exposes reading-
 * preference popover (font size / line-height / theme / family),
 * scroll-based progress bar, share sheet (Web Share API or copy
 * fallback), and a strong "open original" affordance at the bottom.
 */
export function ArticleReader({
  article,
  isBookmarked,
  prefs,
  isAr,
  language,
  onBack,
  onToggleBookmark,
  onChangePrefs,
}: {
  article: FeedItem;
  isBookmarked: boolean;
  prefs: ReaderPrefs;
  isAr: boolean;
  language: string;
  onBack: () => void;
  onToggleBookmark: () => void;
  onChangePrefs: (p: ReaderPrefs) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const minutes = readingMinutes(
    article.fullContent || article.description || article.title,
    language,
  );

  // Map prefs → CSS values
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
  const themeStyle = useMemo(() => {
    if (prefs.theme === 'sepia') {
      return { background: '#f4ecd8', color: '#3a2f1d' };
    }
    if (prefs.theme === 'dim') {
      return { background: '#1f1f23', color: '#e8e6e3' };
    }
    return {};
  }, [prefs.theme]);

  // Reading progress: track scroll position 0..1 of inner panel
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const max = el.scrollHeight - el.clientHeight;
      const ratio = max > 0 ? el.scrollTop / max : 0;
      setProgress(Math.min(1, Math.max(0, ratio)));
    };
    el.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => el.removeEventListener('scroll', handler);
  }, [article.link]);

  // Reset to top whenever the article changes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [article.link]);

  const onShare = async () => {
    const shareData = {
      title: article.title,
      text: article.title,
      url: article.link,
    };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(article.link);
      notify.linkCopied(isAr ? 'ar' : 'de');
    } catch {
      notify.copyFailed(isAr ? 'ar' : 'de');
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(article.link);
      notify.linkCopied(isAr ? 'ar' : 'de');
    } catch {
      notify.copyFailed(isAr ? 'ar' : 'de');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col min-h-screen"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-20">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={isAr ? 'رجوع' : 'Back'}
        >
          <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
        </button>
        <SourcePill name={article.source} size="sm" />
        <span className="text-xs text-foreground font-semibold truncate flex-1">
          {article.source}
        </span>
        <div className="flex items-center gap-0.5">
          <ReaderPrefsPopover prefs={prefs} onChange={onChangePrefs} isAr={isAr} />
          <button
            type="button"
            onClick={onToggleBookmark}
            className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
            aria-label={
              isBookmarked
                ? (isAr ? 'إلغاء الحفظ' : 'Remove bookmark')
                : (isAr ? 'حفظ' : 'Bookmark')
            }
          >
            {isBookmarked
              ? <BookmarkCheck className="h-4 w-4 text-primary" />
              : <Bookmark className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
            aria-label={isAr ? 'مشاركة' : 'Share'}
          >
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
            aria-label={isAr ? 'نسخ الرابط' : 'Copy link'}
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
          </button>
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all inline-flex items-center justify-center"
            aria-label={isAr ? 'فتح الرابط الأصلي' : 'Open original'}
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* Reading progress bar */}
      <div className="h-[2px] w-full bg-foreground/5 sticky top-[57px] z-20">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${(progress * 100).toFixed(2)}%` }}
        />
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={themeStyle}
      >
        {article.image && (
          <div className="relative">
            <img
              src={article.image}
              alt=""
              className="w-full h-56 object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}
        <article className="px-5 pt-5 pb-16 max-w-prose mx-auto">
          <h2
            className="text-xl font-bold leading-snug mb-3"
            style={{ fontFamily: prefs.fontFamily === 'serif' ? 'Georgia, serif' : undefined }}
          >
            {article.title}
          </h2>
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <Clock className="h-3.5 w-3.5 opacity-60" />
            <span className="text-xs opacity-70">
              {formatDate(article.pubDate, language)}
            </span>
            <span className="w-1 h-1 rounded-full bg-current opacity-30" />
            <span className="text-xs opacity-70">
              {isAr ? `${minutes} دقيقة قراءة` : `${minutes} min read`}
            </span>
            {article.author && (
              <>
                <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                <span className="text-xs opacity-70">{article.author}</span>
              </>
            )}
          </div>
          <div className="h-px bg-current opacity-10 mb-6" />

          {article.fullContent && article.fullContent.length > 0
            ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none
                  [&_img]:rounded-xl [&_img]:my-4 [&_img]:w-full [&_img]:max-h-[420px] [&_img]:object-cover
                  [&_a]:text-primary [&_a]:no-underline [&_a]:font-medium [&_a:hover]:underline
                  [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1,&_h2,&_h3]:font-bold [&_h1,&_h2,&_h3]:mt-6 [&_h1,&_h2,&_h3]:mb-2
                  [&_p]:mb-4
                  [&_blockquote]:border-s-2 [&_blockquote]:border-primary/40 [&_blockquote]:ps-4 [&_blockquote]:italic [&_blockquote]:text-foreground/75 [&_blockquote]:my-4
                  [&_ul,&_ol]:my-3 [&_ul,&_ol]:ps-6 [&_li]:mb-1
                  [&_figure]:my-4 [&_figcaption]:text-xs [&_figcaption]:opacity-65 [&_figcaption]:mt-2
                  [&_pre]:bg-foreground/5 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:text-xs
                  [&_code]:bg-foreground/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs"
                style={{
                  fontSize: sizeMap[prefs.fontSize],
                  lineHeight: heightMap[prefs.lineHeight],
                  fontFamily: prefs.fontFamily === 'serif' ? 'Georgia, serif' : undefined,
                }}
                dangerouslySetInnerHTML={{
                  __html: sanitizeRssHtml(article.fullContent),
                }}
              />
            )
            : article.description
              ? (
                <p
                  className="opacity-85"
                  style={{
                    fontSize: sizeMap[prefs.fontSize],
                    lineHeight: heightMap[prefs.lineHeight],
                  }}
                >
                  {article.description}
                </p>
              )
              : <ArticleDetailSkeleton />}

          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-8 px-5 py-3 rounded-2xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 active:scale-[0.98] transition-all"
          >
            {isAr ? 'المصدر الأصلي' : 'Original source'}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </article>
      </div>
    </motion.div>
  );
}
