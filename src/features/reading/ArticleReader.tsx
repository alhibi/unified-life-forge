import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bookmark, BookmarkCheck, ChevronLeft, Clock, Copy,
  ExternalLink, Share2,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import { sanitizeRssHtml } from '@/utils/sanitizeRssHtml';
import type { FeedItem, ReaderPrefs } from './types';
import { formatDate, readingMinutes, safeHref } from './utils';
import { ReaderPrefsPopover } from './ReaderPrefsPopover';
import { SourcePill } from './SourcePill';
import { ArticleDetailSkeleton } from './Skeletons';

/**
 * Article reader view. Renders sanitized HTML body, exposes reading-
 * preference popover (font size / line-height / theme / family),
 * scroll-based progress bar (with proper `progressbar` ARIA role so
 * screen readers can announce position), share sheet (Web Share API
 * or copy fallback), and a strong "open original" affordance at the
 * bottom.
 *
 * Theme handling: the user-selectable sepia / dim / system themes now
 * cover the *entire* surface (header chrome, progress bar background,
 * body) so there's no jarring chrome-vs-body color flip when reading
 * in sepia mode.
 *
 * RTL handling: titles, descriptions, and article body all carry
 * `dir="auto"` so a Latin headline inside an Arabic-RTL UI gets its
 * own bidi context — punctuation lands on the correct side and the
 * line wraps naturally.
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
  const headerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(57);

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

  // Theme palette — applied to BOTH the body and the header chrome so
  // the whole reader surface stays visually coherent in sepia/dim.
  const themePalette = useMemo(() => {
    if (prefs.theme === 'sepia') {
      return {
        background: '#f4ecd8',
        color: '#3a2f1d',
        chromeBg: '#efe5cc',
        chromeBorder: 'rgba(58, 47, 29, 0.12)',
        progressTrack: 'rgba(58, 47, 29, 0.1)',
        gradientTo: '#f4ecd8',
        gradientFrom: 'rgba(244, 236, 216, 0)',
      };
    }
    if (prefs.theme === 'dim') {
      return {
        background: '#1f1f23',
        color: '#e8e6e3',
        chromeBg: '#191a1d',
        chromeBorder: 'rgba(232, 230, 227, 0.08)',
        progressTrack: 'rgba(232, 230, 227, 0.08)',
        gradientTo: '#1f1f23',
        gradientFrom: 'rgba(31, 31, 35, 0)',
      };
    }
    return null; // system theme uses Tailwind tokens
  }, [prefs.theme]);

  // Reading progress: track scroll position 0..1 of inner panel.
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

  // Measure the header so the progress bar lands flush against it,
  // even if the header height changes (e.g. font-scaling, future
  // additions). Uses ResizeObserver where available.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.offsetHeight);
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

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
      notify.linkCopied(isAr ? 'ar' : 'en');
    } catch {
      notify.copyFailed(isAr ? 'ar' : 'en');
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(article.link);
      notify.linkCopied(isAr ? 'ar' : 'en');
    } catch {
      notify.copyFailed(isAr ? 'ar' : 'en');
    }
  };

  const surfaceStyle = themePalette
    ? { background: themePalette.background, color: themePalette.color }
    : undefined;
  const chromeStyle = themePalette
    ? {
        background: `${themePalette.chromeBg}E6`, // ~90% alpha for backdrop blur to show through
        borderColor: themePalette.chromeBorder,
        color: themePalette.color,
      }
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col min-h-screen"
      style={surfaceStyle}
    >
      {/* Header */}
      <div
        ref={headerRef}
        className={`flex items-center gap-2 px-4 py-3 border-b backdrop-blur-md sticky top-0 z-20 ${
          themePalette ? '' : 'border-border/40 bg-card/90'
        }`}
        style={chromeStyle}
      >
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-current/10 active:scale-95 transition-all"
          aria-label={isAr ? 'رجوع' : 'Back'}
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <SourcePill name={article.source} size="sm" />
        <span
          className="text-xs font-semibold truncate flex-1 opacity-90"
          dir="auto"
        >
          {article.source}
        </span>
        <div className="flex items-center gap-0.5">
          <ReaderPrefsPopover prefs={prefs} onChange={onChangePrefs} isAr={isAr} />
          <button
            type="button"
            onClick={onToggleBookmark}
            className="p-2 rounded-xl hover:bg-current/10 active:scale-95 transition-all"
            aria-label={
              isBookmarked
                ? (isAr ? 'إلغاء الحفظ' : 'Remove bookmark')
                : (isAr ? 'حفظ' : 'Bookmark')
            }
            aria-pressed={isBookmarked}
          >
            {isBookmarked
              ? <BookmarkCheck className="h-4 w-4 text-primary" />
              : <Bookmark className="h-4 w-4 opacity-70" />}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="p-2 rounded-xl hover:bg-current/10 active:scale-95 transition-all"
            aria-label={isAr ? 'مشاركة' : 'Share'}
          >
            <Share2 className="h-4 w-4 opacity-70" />
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="p-2 rounded-xl hover:bg-current/10 active:scale-95 transition-all"
            aria-label={isAr ? 'نسخ الرابط' : 'Copy link'}
          >
            <Copy className="h-4 w-4 opacity-70" />
          </button>
          <a
            href={safeHref(article.link)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl hover:bg-current/10 active:scale-95 transition-all inline-flex items-center justify-center"
            aria-label={isAr ? 'فتح الرابط الأصلي' : 'Open original'}
          >
            <ExternalLink className="h-4 w-4 opacity-70" />
          </a>
        </div>
      </div>

      {/* Reading progress bar — proper a11y role so screen readers can
          announce position. Positioned dynamically so it always sits
          flush against whatever header height we have. */}
      <div
        className={`h-[3px] w-full sticky z-20 ${
          themePalette ? '' : 'bg-foreground/5'
        }`}
        style={{
          top: `${headerHeight}px`,
          background: themePalette?.progressTrack,
        }}
        role="progressbar"
        aria-label={isAr ? 'تقدّم القراءة' : 'Reading progress'}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${(progress * 100).toFixed(2)}%` }}
        />
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        {article.image && (
          <div className="relative">
            <img
              src={article.image}
              alt=""
              className="w-full h-56 object-cover"
              loading="eager"
              fetchPriority="high"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div
              className={`absolute inset-x-0 bottom-0 h-16 ${
                themePalette ? '' : 'bg-gradient-to-t from-background to-transparent'
              }`}
              style={themePalette
                ? {
                    background: `linear-gradient(to top, ${themePalette.gradientTo}, ${themePalette.gradientFrom})`,
                  }
                : undefined}
            />
          </div>
        )}
        <article className="px-5 pt-5 pb-16 max-w-prose mx-auto">
          <h2
            className="text-xl font-bold leading-snug mb-3"
            dir="auto"
            style={{ fontFamily: prefs.fontFamily === 'serif' ? 'Georgia, serif' : undefined }}
          >
            {article.title}
          </h2>
          <div className="flex items-center gap-2 mb-5 flex-wrap" dir="auto">
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
                <span className="text-xs opacity-70" dir="auto">{article.author}</span>
              </>
            )}
          </div>
          <div className="h-px bg-current opacity-10 mb-6" />

          {article.fullContent && article.fullContent.length > 0
            ? (
              <div
                dir="auto"
                className="prose prose-sm dark:prose-invert max-w-none
                  [&_img]:rounded-xl [&_img]:my-4 [&_img]:w-full [&_img]:max-h-[420px] [&_img]:object-cover
                  [&_a]:text-primary [&_a]:no-underline [&_a]:font-medium [&_a:hover]:underline
                  [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1,&_h2,&_h3]:font-bold [&_h1,&_h2,&_h3]:mt-6 [&_h1,&_h2,&_h3]:mb-2
                  [&_p]:mb-4
                  [&_blockquote]:border-s-2 [&_blockquote]:border-primary/40 [&_blockquote]:ps-4 [&_blockquote]:italic [&_blockquote]:opacity-85 [&_blockquote]:my-4
                  [&_ul,&_ol]:my-3 [&_ul,&_ol]:ps-6 [&_li]:mb-1
                  [&_figure]:my-4 [&_figcaption]:text-xs [&_figcaption]:opacity-65 [&_figcaption]:mt-2
                  [&_pre]:bg-current/5 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:text-xs
                  [&_code]:bg-current/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs"
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
                  dir="auto"
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
            href={safeHref(article.link)}
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
