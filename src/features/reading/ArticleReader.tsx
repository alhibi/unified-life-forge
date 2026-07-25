import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bookmark, BookmarkCheck, ChevronLeft, Clock, Copy,
  ExternalLink, FileText, Loader2, Share2,
} from '@/lib/icons';
import { notify } from '@/lib/notify';
import { sanitizeRssHtml } from '@/utils/sanitizeRssHtml';
import type { FeedItem, ReaderPrefs } from './types';
import { formatDate, readingMinutes, safeHref } from './utils';
import { ReaderPrefsPopover } from './ReaderPrefsPopover';
import { SourcePill } from './SourcePill';
import { ArticleDetailSkeleton } from './Skeletons';
import { offlineDb } from './offlineDb';
import { needsContentUpgrade, plainTextLength } from './extractArticle';
import { ArticleSpeechPlayer } from './ArticleSpeechPlayer';
import { ArticleTranslator } from './ArticleTranslator';

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
 *
 * Stability hardening:
 *  - **Offline-first body resolution**: when the article hands us a
 *    short body, we first probe IndexedDB in case a previous session
 *    already upgraded this article. Only if neither memory nor IDB
 *    has a richer copy do we hit the network.
 *  - **Auto full-content fetch**: feeds that ship excerpts (very
 *    common for major news outlets) get transparently upgraded via
 *    the `extract-article` edge function. The upgraded body is
 *    persisted both in the parent's article list (via
 *    `onUpgradeContent`) and in IndexedDB.
 *  - **Manual retry**: if the auto-fetch failed, the user gets a
 *    "Load full article" button to try again.
 *  - **Abort on unmount**: a navigation away mid-fetch cancels the
 *    in-flight scrape so no stale promise lands on an unmounted
 *    component.
 */
export function ArticleReader({
  article,
  isBookmarked,
  prefs,
  language,
  onBack,
  onToggleBookmark,
  onChangePrefs,
  onUpgradeContent,
}: {
  article: FeedItem;
  isBookmarked: boolean;
  prefs: ReaderPrefs;
  language: string;
  onBack: () => void;
  onToggleBookmark: () => void;
  onChangePrefs: (p: ReaderPrefs) => void;
  /**
   * Best-effort upgrade hook. The reader calls this when it manages
   * to scrape a richer body (or hydrates from IndexedDB) so the
   * parent can update its in-memory `articles[]` list and persist
   * the upgrade. Optional — without it, the upgrade is rendered for
   * the current view only.
   */
  onUpgradeContent?: (
    link: string,
    opts?: { force?: boolean },
  ) => Promise<{ fullContent: string; image: string | null } | null>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(57);

  /**
   * Local copy of the article body. Starts from props but gets upgraded
   * in place when:
   *   1. We find a richer copy in IndexedDB (offline-first hydration).
   *   2. The `extract-article` edge function returns a longer body.
   *
   * Using local state means the reader stays responsive even if the
   * parent's `articles[]` reducer is slow to flush — the user sees
   * the upgraded text immediately.
   */
  const [bodyHtml, setBodyHtml] = useState<string>(article.fullContent || '');
  const [bodyImage, setBodyImage] = useState<string | null>(article.image);
  /** Status of the background full-content fetch. */
  const [upgradeStatus, setUpgradeStatus] = useState<
    'idle' | 'loading' | 'success' | 'error' | 'unavailable'
  >('idle');
  /** Whether the user explicitly clicked "Load full article". */
  const manualUpgradeRef = useRef(false);

  // Reset local body state whenever a different article is opened.
  useEffect(() => {
    setBodyHtml(article.fullContent || '');
    setBodyImage(article.image);
    setUpgradeStatus('idle');
    manualUpgradeRef.current = false;
    setOriginalBodyHtml(article.fullContent || '');
    setOriginalTitle(article.title);
  }, [article.link, article.fullContent, article.image, article.title]);

  const [originalBodyHtml, setOriginalBodyHtml] = useState<string>(article.fullContent || '');
  const [originalTitle, setOriginalTitle] = useState<string>(article.title);
  const [displayTitle, setDisplayTitle] = useState<string>(article.title);

  useEffect(() => {
    setDisplayTitle(article.title);
  }, [article.title]);

  const minutes = readingMinutes(
    bodyHtml || article.description || article.title,
    language,
  );

  /**
   * Offline-first hydration + auto-upgrade pipeline.
   *
   * On every article change we walk through three escalating tiers:
   *  1. **Offline DB**: the article may have been upgraded in a prior
   *     session and saved to IndexedDB. Read from IDB first — much
   *     faster than the network, and works without connectivity.
   *  2. **Live scrape**: if neither prop nor IDB has a body that
   *     clears the readability threshold, ask the parent (which owns
   *     the data hook + abort registry) to fetch it via the
   *     extract-article edge function.
   *  3. **Manual retry**: if every automatic attempt failed, the
   *     "Load full article" button below lets the user retry.
   *
   * All steps are bounded by a single AbortController tied to the
   * article's lifetime in the reader, so navigating away mid-fetch
   * is clean.
   */
  useEffect(() => {
    if (!article.link || !/^https?:\/\//i.test(article.link)) return;

    const controller = new AbortController();
    let cancelled = false;

    const run = async (): Promise<void> => {
      // Tier 1 — offline-first hydration. If the article in our prop
      // has a short body but the IDB has the full one (e.g. cached
      // from a prior session), prefer the IDB copy.
      if (
        offlineDb.available() &&
        plainTextLength(article.fullContent) < 400
      ) {
        try {
          const cached = await offlineDb.getArticle(article.link);
          if (cancelled) return;
          if (
            cached &&
            plainTextLength(cached.fullContent) >
              plainTextLength(article.fullContent)
          ) {
            setBodyHtml(cached.fullContent || '');
            if (cached.image && !article.image) setBodyImage(cached.image);
            // Falls through to tier 2 only if cache still doesn't
            // clear the readability threshold.
          }
        } catch { /* IDB unavailable — fall through */ }
      }

      // Tier 2 — live upgrade via parent's extract-article wrapper.
      // We re-read needsContentUpgrade against the *latest* bodyHtml
      // (which may have just been hydrated from IDB above).
      if (cancelled) return;
      if (!onUpgradeContent) return;
      // Use a setState callback to read the current body without a
      // closure dep, so we don't re-fire when the body changes.
      let currentBody = '';
      setBodyHtml((cur) => { currentBody = cur; return cur; });
      if (!needsContentUpgrade(currentBody, article.link)) return;

      setUpgradeStatus('loading');
      try {
        const result = await onUpgradeContent(article.link);
        if (cancelled) return;
        if (result?.fullContent) {
          setBodyHtml((cur) => {
            // Don't downgrade if the parent already updated us via
            // props during the await window.
            return plainTextLength(result.fullContent) > plainTextLength(cur)
              ? result.fullContent
              : cur;
          });
          if (result.image) setBodyImage((cur) => cur || result.image);
          setUpgradeStatus('success');
        } else {
          setUpgradeStatus('unavailable');
        }
      } catch (e) {
        if (cancelled) return;
        console.warn('[ArticleReader] upgrade failed', e);
        setUpgradeStatus('error');
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.link]);

  /** Manual "load full article" handler — bypasses the attempted-set. */
  const onManualUpgrade = async (): Promise<void> => {
    if (!onUpgradeContent || !article.link) return;
    manualUpgradeRef.current = true;
    setUpgradeStatus('loading');
    try {
      const result = await onUpgradeContent(article.link, { force: true });
      if (result?.fullContent) {
        setBodyHtml((cur) =>
          plainTextLength(result.fullContent) > plainTextLength(cur)
            ? result.fullContent
            : cur,
        );
        if (result.image) setBodyImage((cur) => cur || result.image);
        setUpgradeStatus('success');
      } else {
        setUpgradeStatus('unavailable');
      }
    } catch {
      setUpgradeStatus('error');
    }
  };

  // Map prefs → CSS values
  const sizeMap: Record<ReaderPrefs['fontSize'], string> = {
    sm: '13px',
    md: '15px',
    lg: '17px',
    xl: '19px',
    '2xl': '22px',
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
    if (prefs.theme === 'emerald') {
      return {
        background: '#064e3b',
        color: '#f3f4f6',
        chromeBg: '#043e2f',
        chromeBorder: 'rgba(243, 244, 246, 0.1)',
        progressTrack: 'rgba(243, 244, 246, 0.1)',
        gradientTo: '#064e3b',
        gradientFrom: 'rgba(6, 78, 59, 0)',
      };
    }
    if (prefs.theme === 'warm-ivory') {
      return {
        background: '#fbf8f3',
        color: '#2d2722',
        chromeBg: '#f5efe6',
        chromeBorder: 'rgba(45, 39, 34, 0.1)',
        progressTrack: 'rgba(45, 39, 34, 0.1)',
        gradientTo: '#fbf8f3',
        gradientFrom: 'rgba(251, 248, 243, 0)',
      };
    }
    if (prefs.theme === 'obsidian-gold') {
      return {
        background: '#121214',
        color: '#e5e7eb',
        chromeBg: '#1a1a1e',
        chromeBorder: 'rgba(212, 175, 55, 0.25)',
        progressTrack: 'rgba(212, 175, 55, 0.15)',
        gradientTo: '#121214',
        gradientFrom: 'rgba(18, 18, 20, 0)',
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
      notify.linkCopied('ar');
    } catch {
      notify.copyFailed('ar');
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(article.link);
      notify.linkCopied('ar');
    } catch {
      notify.copyFailed('ar');
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

  const fontStyle = useMemo(() => {
    if (prefs.fontFamily === 'serif') return { fontFamily: 'Georgia, serif' };
    if (prefs.fontFamily === 'amiri') return { fontFamily: 'Amiri, Georgia, serif' };
    if (prefs.fontFamily === 'kufi') return { fontFamily: 'Noto Kufi Arabic, sans-serif' };
    if (prefs.fontFamily === 'system-arabic') return { fontFamily: 'system-ui, sans-serif' };
    return { fontFamily: 'system-ui, sans-serif' };
  }, [prefs.fontFamily]);

  const dirAttr = useMemo(() => {
    return 'rtl';
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col min-h-screen"
      style={{ ...surfaceStyle, ...fontStyle }}
    >
      {/* Header */}
      <div
        ref={headerRef}
        // `.app-sticky-header-card` owns position, blur, border and the
        // default card backdrop. When the reader has a per-article palette,
        // `chromeStyle` overrides background and border inline, which beats
        // the class — so the conditional Tailwind pair is not needed.
        className="flex items-center gap-2 px-4 py-3 app-sticky-header-card z-sticky"
        style={chromeStyle}
      >
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-current/10 active:scale-95 transition-all"
          aria-label={'رجوع'}
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
          <ReaderPrefsPopover prefs={prefs} onChange={onChangePrefs} />
          <button
            type="button"
            onClick={onToggleBookmark}
            className="p-2 rounded-xl hover:bg-current/10 active:scale-95 transition-all"
            aria-label={
              isBookmarked
                ? ('إلغاء الحفظ')
                : ('حفظ')
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
            aria-label={'مشاركة'}
          >
            <Share2 className="h-4 w-4 opacity-70" />
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="p-2 rounded-xl hover:bg-current/10 active:scale-95 transition-all"
            aria-label={'نسخ الرابط'}
          >
            <Copy className="h-4 w-4 opacity-70" />
          </button>
          <a
            href={safeHref(article.link)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl hover:bg-current/10 active:scale-95 transition-all inline-flex items-center justify-center"
            aria-label={'فتح الرابط الأصلي'}
          >
            <ExternalLink className="h-4 w-4 opacity-70" />
          </a>
        </div>
      </div>

      {/* Reading progress bar — proper a11y role so screen readers can
          announce position. Positioned dynamically so it always sits
          flush against whatever header height we have. */}
      <div
        className={`h-[3px] w-full sticky z-sticky ${
          themePalette ? '' : 'bg-foreground/5'
        }`}
        style={{
          top: `${headerHeight}px`,
          background: themePalette?.progressTrack,
        }}
        role="progressbar"
        aria-label={'تقدّم القراءة'}
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
        {bodyImage && (
          <div className="relative">
            <img
              src={bodyImage}
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
 themePalette ? '' : ' '
 }`}
              style={themePalette
                ? {
                    
                  }
                : undefined}
            />
          </div>
        )}
        <article className="px-5 pt-5 pb-16 max-w-prose mx-auto">
          {/* Audio speech player integration */}
          <div className="mb-4">
            <ArticleSpeechPlayer
              textToSpeak={bodyHtml || article.description || displayTitle}
              language={language}
              ttsSpeed={prefs.ttsSpeed}
              onTtsSpeedChange={(speed) => onChangePrefs({ ...prefs, ttsSpeed: speed })}
            />
          </div>

          {/* Article Translation integration */}
          <div className="mb-6">
            <ArticleTranslator
              originalHtml={originalBodyHtml || article.description || ''}
              originalTitle={originalTitle}
              onTranslationComplete={(transHtml, transTitle) => {
                setBodyHtml(transHtml);
                setDisplayTitle(transTitle);
              }}
              onReset={() => {
                setBodyHtml(originalBodyHtml);
                setDisplayTitle(originalTitle);
              }}
            />
          </div>

          <h2
            className="text-2xl font-bold leading-snug mb-4"
            dir={dirAttr}
            style={fontStyle}
          >
            {displayTitle}
          </h2>
          <div className="flex items-center gap-2 mb-5 flex-wrap" dir="auto">
            <Clock className="h-3.5 w-3.5 opacity-60" />
            <span className="text-xs opacity-70">
              {formatDate(article.pubDate, language)}
            </span>
            <span className="w-1 h-1 rounded-full bg-current opacity-30" />
            <span className="text-xs opacity-70">
              {`${minutes} دقيقة قراءة`}
            </span>
            {article.author && (
              <>
                <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                <span className="text-xs opacity-70" dir="auto">{article.author}</span>
              </>
            )}
          </div>
          <div className="h-px bg-current opacity-10 mb-6" />

          {bodyHtml && bodyHtml.length > 0
            ? (
              <div
                dir={dirAttr}
                className="prose prose-sm dark:prose-invert max-w-none
                  [&_img]:rounded-2xl [&_img]:my-6 [&_img]:w-full [&_img]:max-h-[460px] [&_img]:object-cover [&_img]:shadow-md
                  [&_a]:text-primary [&_a]:no-underline [&_a]:font-bold [&_a:hover]:underline
                  [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h1,&_h2,&_h3]:font-bold [&_h1,&_h2,&_h3]:mt-8 [&_h1,&_h2,&_h3]:mb-3
                  [&_p]:mb-5 [&_p]:leading-relaxed
                  [&_blockquote]:border-s-4 [&_blockquote]:border-primary/50 [&_blockquote]:ps-5 [&_blockquote]:italic [&_blockquote]:opacity-90 [&_blockquote]:my-6 [&_blockquote]:bg-primary/5 [&_blockquote]:py-1 [&_blockquote]:rounded-e-xl
                  [&_ul,&_ol]:my-4 [&_ul,&_ol]:ps-6 [&_li]:mb-2
                  [&_figure]:my-6 [&_figcaption]:text-xs [&_figcaption]:opacity-65 [&_figcaption]:mt-2
                  [&_pre]:bg-current/5 [&_pre]:p-4 [&_pre]:rounded-2xl [&_pre]:overflow-x-auto [&_pre]:text-xs
                  [&_code]:bg-current/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs"
                style={{
                  fontSize: sizeMap[prefs.fontSize],
                  lineHeight: heightMap[prefs.lineHeight],
                  ...fontStyle
                }}
                dangerouslySetInnerHTML={{
                  __html: sanitizeRssHtml(bodyHtml),
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
              : upgradeStatus === 'loading'
                ? <ArticleDetailSkeleton />
                : null}

          {/* Full-content upgrade affordance.
              Visible when the article body is shorter than the
              readability threshold AND a content upgrade hook is
              wired. Shows live status (loading / failed / success
              tease) so the user understands what's happening. */}
          {onUpgradeContent && needsContentUpgrade(bodyHtml, article.link) && (
            <div
              className="mt-6 px-4 py-3.5 rounded-2xl border border-current/10"
              style={{
                background: themePalette
                  ? `${themePalette.chromeBg}66`
                  : undefined,
              }}
            >
              {upgradeStatus === 'loading'
                ? (
                  <div className="flex items-center gap-2 text-sm opacity-80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      {'يتم جلب المقال الكامل من الموقع الأصلي…'}
                    </span>
                  </div>
                )
                : upgradeStatus === 'error' || upgradeStatus === 'unavailable'
                  ? (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 mt-0.5 opacity-60 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-0.5">
                          {'يحتوي هذا المصدر على ملخص فقط'}
                        </p>
                        <p className="text-xs opacity-70 mb-2.5">
                          {'يمكن محاولة جلب النص الكامل من الموقع الأصلي.'}
                        </p>
                        <button
                          type="button"
                          onClick={onManualUpgrade}
                          className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {'جلب المقال الكامل'}
                        </button>
                      </div>
                    </div>
                  )
                  : !manualUpgradeRef.current && upgradeStatus !== 'success'
                    ? (
                      <button
                        type="button"
                        onClick={onManualUpgrade}
                        className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium opacity-75 hover:opacity-100 transition-opacity"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {'جلب المقال الكامل'}
                      </button>
                    )
                    : null}
            </div>
          )}

          <a
            href={safeHref(article.link)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-8 px-5 py-3 rounded-2xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 active:scale-[0.98] transition-all"
          >
            {'المصدر الأصلي'}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </article>
      </div>
    </motion.div>
  );
}
