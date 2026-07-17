import { useRef } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import {
  Bookmark, BookmarkCheck, CircleCheck, Clock,
} from '@/lib/icons';
import type { FeedItem } from './types';
import type { Density } from './listPrefs';
import { readingMinutes, timeAgo } from './utils';
import { SourcePill } from './SourcePill';
import { ArticleContextMenu } from './ArticleContextMenu';

/**
 * Compact article row used inside the main list.
 *
 * Behaviours borrowed from ReadYou + CapyReader:
 *  - **Swipe gestures** on touch (RTL-aware): swipe one direction to
 *    bookmark, the other to mark as read. The card renders the
 *    revealed action's icon under itself so the gesture has visual
 *    feedback before the threshold fires.
 *  - **Long-press / right-click context menu** with primary actions
 *    (Mark above/below read, Open original, Copy, Share, …).
 *  - **Density variants**: comfortable (default), compact (no
 *    thumbnail, single-line), cards (large thumbnail with overlay).
 *
 * The optional `cached` flag adds a subtle dot so users can see at a
 * glance which articles are already available offline.
 */
export function ArticleCard({
  article,
  index,
  isRead,
  isBookmarked,
  cached,
  language,
  density = 'comfortable',
  isAr: isArProp,
  hasAbove = false,
  hasBelow = false,
  registerEl,
  onOpen,
  onToggleBookmark,
  onMarkRead,
  onMarkUnread,
  onMarkAboveRead,
  onMarkBelowRead,
}: {
  article: FeedItem;
  index: number;
  isRead: boolean;
  isBookmarked: boolean;
  cached?: boolean;
  language: string;
  density?: Density;
  isAr?: boolean;
  hasAbove?: boolean;
  hasBelow?: boolean;
  /** Optional ref-callback so a parent IntersectionObserver can watch
   *  this row (used for auto-mark-on-scroll). */
  registerEl?: (el: HTMLElement | null) => void;
  onOpen: () => void;
  onToggleBookmark: () => void;
  onMarkRead?: () => void;
  onMarkUnread?: () => void;
  onMarkAboveRead?: () => void;
  onMarkBelowRead?: () => void;
}) {
  const isAr = isArProp ?? language === 'ar';
  const minutes = readingMinutes(
    article.fullContent || article.description || article.title,
    language,
  );

  // Pre-compute layout-side handlers so the JSX stays compact.
  const handleMarkRead = onMarkRead ?? (() => undefined);
  const handleMarkUnread = onMarkUnread ?? (() => undefined);

  // ─── Swipe gesture handling ──────────────────────────────────────────
  // Drag x-axis only. The card moves with the finger; once it crosses
  // a threshold (60 px) the corresponding action fires. We snap back
  // to centre via `dragSnapToOrigin` so a successful action doesn't
  // leave the card stranded mid-swipe.
  //
  // RTL note: in RTL languages, `start`/`end` flip relative to the
  // motion direction. The action mappings below are written in
  // LTR-equivalent terms (positive x = right-edge action) and the
  // background reveal panel uses logical `start/end` properties so
  // the icon position auto-mirrors.
  const x = useMotionValue(0);
  const SWIPE_THRESHOLD = 60;

  // The trailing-edge action (positive drag in LTR, negative in RTL):
  // bookmark.  Leading-edge: mark read/unread.
  // We resolve the *signed direction* of bookmark vs mark-read once
  // here so the card's animation logic stays simple.
  const bookmarkDir = isAr ? -1 : 1;
  const markDir = -bookmarkDir;

  // Background icon opacity: fades in proportionally to drag distance
  // up to the threshold.
  const bookmarkBgOpacity = useTransform(x, (v) => {
    const signed = v * bookmarkDir;
    if (signed <= 0) return 0;
    return Math.min(1, signed / SWIPE_THRESHOLD);
  });
  const markReadBgOpacity = useTransform(x, (v) => {
    const signed = v * markDir;
    if (signed <= 0) return 0;
    return Math.min(1, signed / SWIPE_THRESHOLD);
  });

  // Track whether the most-recent gesture *was* a drag, so a tiny
  // tap doesn't get swallowed by the drag handler.
  const draggedRef = useRef(false);

  const onDragStart = () => { draggedRef.current = false; };
  const onDrag = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 4) draggedRef.current = true;
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    const signedBookmark = offsetX * bookmarkDir;
    const signedMark = offsetX * markDir;
    const fast = Math.abs(velocityX) > 300;
    if (signedBookmark > SWIPE_THRESHOLD || (signedBookmark > 30 && fast)) {
      onToggleBookmark();
    } else if (signedMark > SWIPE_THRESHOLD || (signedMark > 30 && fast)) {
      // Toggle read state on swipe — flips between read and unread
      if (isRead) handleMarkUnread();
      else handleMarkRead();
    }
    // Always snap back to 0 — framer-motion does this automatically
    // when we don't set `dragControls` to a fixed value.
  };

  // Single tap (after a drag-cancel) calls onOpen via the inner button;
  // we suppress it when the gesture ended up being a real drag.
  const handleClick = (e: React.MouseEvent) => {
    if (draggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedRef.current = false;
      return;
    }
    onOpen();
  };

  // ─── Density-specific layout ─────────────────────────────────────────
  if (density === 'compact') {
    return (
      <ArticleContextMenu
        article={article}
        isRead={isRead}
        isBookmarked={isBookmarked}
        isAr={isAr}
        hasAbove={hasAbove}
        hasBelow={hasBelow}
        onMarkRead={handleMarkRead}
        onMarkUnread={handleMarkUnread}
        onMarkAboveRead={onMarkAboveRead ?? (() => undefined)}
        onMarkBelowRead={onMarkBelowRead ?? (() => undefined)}
        onToggleBookmark={onToggleBookmark}
      >
        <div ref={registerEl} data-link={article.link} className="relative overflow-hidden">
          <SwipeBackdrop
            isAr={isAr}
            bookmarkOpacity={bookmarkBgOpacity}
            markReadOpacity={markReadBgOpacity}
            isRead={isRead}
            isBookmarked={isBookmarked}
          />
          <motion.div
            drag="x"
            dragSnapToOrigin
            dragConstraints={{ left: -120, right: 120 }}
            dragElastic={0.18}
            onDragStart={onDragStart}
            onDrag={onDrag}
            onDragEnd={onDragEnd}
            style={{ x }}
            className={`relative ${isRead ? 'opacity-65' : ''}`}
          >
            <button
              type="button"
              onClick={handleClick}
              className="w-full text-start px-4 py-2.5 hover:bg-accent/20 active:bg-accent/30 transition-colors flex items-center gap-2.5 bg-background"
            >
              <SourcePill name={article.source} size="sm" />
              <span
                dir="auto"
                className={`flex-1 min-w-0 truncate text-[13px] ${
                  isRead ? 'font-normal text-foreground/70' : 'font-semibold text-foreground'
                }`}
              >
                {article.title}
              </span>
              <span className="text-[10px] text-muted-foreground/70 shrink-0 tabular-nums">
                {timeAgo(article.pubDate, language)}
              </span>
              {isBookmarked && (
                <BookmarkCheck className="h-3 w-3 text-primary/70 shrink-0" />
              )}
            </button>
          </motion.div>
        </div>
      </ArticleContextMenu>
    );
  }

  if (density === 'cards') {
    return (
      <ArticleContextMenu
        article={article}
        isRead={isRead}
        isBookmarked={isBookmarked}
        isAr={isAr}
        hasAbove={hasAbove}
        hasBelow={hasBelow}
        onMarkRead={handleMarkRead}
        onMarkUnread={handleMarkUnread}
        onMarkAboveRead={onMarkAboveRead ?? (() => undefined)}
        onMarkBelowRead={onMarkBelowRead ?? (() => undefined)}
        onToggleBookmark={onToggleBookmark}
      >
        <div ref={registerEl} data-link={article.link} className="relative overflow-hidden px-3 py-2">
          <SwipeBackdrop
            isAr={isAr}
            bookmarkOpacity={bookmarkBgOpacity}
            markReadOpacity={markReadBgOpacity}
            isRead={isRead}
            isBookmarked={isBookmarked}
            rounded
          />
          <motion.button
            type="button"
            drag="x"
            dragSnapToOrigin
            dragConstraints={{ left: -120, right: 120 }}
            dragElastic={0.18}
            onDragStart={onDragStart}
            onDrag={onDrag}
            onDragEnd={onDragEnd}
            onClick={handleClick}
            style={{ x }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.25 }}
            className={`relative w-full text-start rounded-2xl bg-card overflow-hidden ${
              isRead ? 'opacity-70' : ''
            }`}
          >
            {article.image && (
              <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                <img
                  src={article.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <div className="p-3.5 space-y-2">
              <h4
                dir="auto"
                className={`text-[15px] leading-snug line-clamp-2 ${
                  isRead ? 'font-normal text-foreground/75' : 'font-semibold text-foreground'
                }`}
              >
                {article.title}
              </h4>
              {article.description && (
                <p dir="auto" className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {article.description}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <SourcePill name={article.source} size="sm" />
                <span className="text-[11px] text-foreground/75 font-medium truncate max-w-[120px]">
                  {article.source}
                </span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                <span className="text-[11px] text-muted-foreground/70 shrink-0">
                  {timeAgo(article.pubDate, language)}
                </span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                <span className="text-[11px] text-muted-foreground/70 inline-flex items-center gap-0.5 shrink-0">
                  <Clock className="h-2.5 w-2.5" />
                  {isAr ? `${minutes} د` : `${minutes} min`}
                </span>
                {isBookmarked && (
                  <BookmarkCheck className="h-3 w-3 text-primary/60 shrink-0" />
                )}
                {cached && !isBookmarked && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0"
                    title={isAr ? 'متاحة دون اتصال' : 'Available offline'}
                  >
                    <CircleCheck className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
            </div>
          </motion.button>
        </div>
      </ArticleContextMenu>
    );
  }

  // Default: comfortable
  return (
    <ArticleContextMenu
      article={article}
      isRead={isRead}
      isBookmarked={isBookmarked}
      isAr={isAr}
      hasAbove={hasAbove}
      hasBelow={hasBelow}
      onMarkRead={handleMarkRead}
      onMarkUnread={handleMarkUnread}
      onMarkAboveRead={onMarkAboveRead ?? (() => undefined)}
      onMarkBelowRead={onMarkBelowRead ?? (() => undefined)}
      onToggleBookmark={onToggleBookmark}
    >
      <motion.div
        ref={registerEl as React.Ref<HTMLDivElement>}
        data-link={article.link}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.25 }}
        className={`group relative overflow-hidden ${isRead ? 'opacity-70' : ''}`}
      >
        <SwipeBackdrop
          isAr={isAr}
          bookmarkOpacity={bookmarkBgOpacity}
          markReadOpacity={markReadBgOpacity}
          isRead={isRead}
          isBookmarked={isBookmarked}
        />
        <motion.div
          drag="x"
          dragSnapToOrigin
          dragConstraints={{ left: -120, right: 120 }}
          dragElastic={0.18}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragEnd={onDragEnd}
          style={{ x }}
          className="relative bg-background"
        >
          {/* Unread indicator — vertical accent bar on the leading edge */}
          {!isRead && (
            <span
              aria-hidden
              className="absolute top-4 bottom-4 start-0 w-[3px] rounded-full bg-primary/80"
            />
          )}
          <button
            type="button"
            onClick={handleClick}
            className="w-full text-start px-4 py-4 hover:bg-accent/20 active:bg-accent/30 transition-colors flex gap-4"
          >
            <div className="flex-1 min-w-0">
              <h4
                dir="auto"
                className={`text-[15px] leading-[1.35] line-clamp-2 tracking-[-0.005em] ${
                  isRead
                    ? 'font-medium text-foreground/65'
                    : 'font-bold text-foreground'
                }`}
              >
                {article.title}
              </h4>
              {article.description && (
                <p
                  dir="auto"
                  className="text-[12.5px] text-muted-foreground/85 mt-1.5 line-clamp-2 leading-[1.55]"
                >
                  {article.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <SourcePill name={article.source} size="sm" />
                <span className="text-[11px] text-foreground/80 font-semibold truncate max-w-[120px]">
                  {article.source}
                </span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                <span className="text-[11px] text-muted-foreground/70 shrink-0">
                  {timeAgo(article.pubDate, language)}
                </span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                <span className="text-[11px] text-muted-foreground/70 inline-flex items-center gap-0.5 shrink-0">
                  <Clock className="h-2.5 w-2.5" />
                  {isAr ? `${minutes} د` : `${minutes} min`}
                </span>
                {isBookmarked && (
                  <BookmarkCheck className="h-3 w-3 text-primary shrink-0" />
                )}
                {cached && !isBookmarked && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0"
                    title={isAr ? 'متاحة دون اتصال' : 'Available offline'}
                  >
                    <CircleCheck className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
            </div>
            {article.image && (
              <div className="relative w-[84px] h-[84px] shrink-0 rounded-2xl overflow-hidden bg-muted/40 ring-1 ring-border/40">
                <img
                  src={article.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                  loading="lazy"
                  onError={(e) => {
                    const wrap = (e.currentTarget as HTMLImageElement).parentElement;
                    if (wrap) wrap.style.display = 'none';
                  }}
                />
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
            className="absolute top-3.5 end-3.5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent/50 transition-all"
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
        </motion.div>
      </motion.div>
    </ArticleContextMenu>
  );
}

/**
 * Reveal panel rendered behind the swipeable surface. Two halves —
 * the leading edge shows the bookmark icon, the trailing edge shows
 * the mark-read icon. Both fade in proportionally to drag distance
 * via the motion-value transforms passed in.
 */
function SwipeBackdrop({
  isAr,
  bookmarkOpacity,
  markReadOpacity,
  isRead,
  isBookmarked,
  rounded = false,
}: {
  isAr: boolean;
  bookmarkOpacity: import('framer-motion').MotionValue<number>;
  markReadOpacity: import('framer-motion').MotionValue<number>;
  isRead: boolean;
  isBookmarked: boolean;
  rounded?: boolean;
}) {
  // RTL: bookmark = swipe-left, markRead = swipe-right.
  // LTR: bookmark = swipe-right, markRead = swipe-left.
  const radius = rounded ? 'rounded-2xl' : '';
  return (
    <>
      <motion.div
        aria-hidden
        style={{ opacity: bookmarkOpacity }}
        className={`absolute inset-y-0 ${isAr ? 'start-0' : 'end-0'} w-1/2 flex items-center ${
          isAr ? 'justify-start ps-6' : 'justify-end pe-6'
        } bg-primary/15 ${radius}`}
      >
        {isBookmarked
          ? <BookmarkCheck className="h-5 w-5 text-primary" />
          : <Bookmark className="h-5 w-5 text-primary" />}
      </motion.div>
      <motion.div
        aria-hidden
        style={{ opacity: markReadOpacity }}
        className={`absolute inset-y-0 ${isAr ? 'end-0' : 'start-0'} w-1/2 flex items-center ${
          isAr ? 'justify-end pe-6' : 'justify-start ps-6'
        } bg-emerald-500/15 ${radius}`}
      >
        {isRead
          ? <CircleCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 rotate-180" />
          : <CircleCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
      </motion.div>
    </>
  );
}

/**
 * Hero variant — used for the first unread article so the page opens
 * with a strong visual anchor. Falls back gracefully when no image is
 * available (then it just renders a tall gradient panel with the
 * title).
 */
export function HeroArticleCard({
  article,
  isBookmarked,
  language,
  onOpen,
  onToggleBookmark,
}: {
  article: FeedItem;
  isBookmarked: boolean;
  language: string;
  onOpen: () => void;
  onToggleBookmark: () => void;
}) {
  const isAr = language === 'ar';
  const minutes = readingMinutes(
    article.fullContent || article.description || article.title,
    language,
  );

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onClick={onOpen}
      className="relative w-full text-start overflow-hidden rounded-2xl bg-card mx-3 my-2 group"
      style={{ aspectRatio: '16 / 10' }}
    >
      {article.image
        ? (
          <img
            src={article.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        )
        : (
          <div
            className="absolute inset-0"
            style={{
              
 }}
 />
 )}
 <div className="absolute inset-0" />
 <div className="absolute top-3 start-3 flex items-center gap-2">
 <SourcePill name={article.source} size="md" />
 <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/40 text-white/95 backdrop-blur-sm">
 {article.source}
 </span>
 </div>
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
 className="absolute top-3 end-3 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/55 transition-colors"
 aria-label={isBookmarked
 ? (isAr ? 'إلغاء الحفظ' : 'Remove bookmark')
          : (isAr ? 'حفظ' : 'Bookmark')}
      >
        {isBookmarked
          ? <BookmarkCheck className="h-4 w-4 text-white" />
          : <Bookmark className="h-4 w-4 text-white/85" />}
      </button>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-12">
        <h2
          dir="auto"
          className="text-white text-[18px] font-bold leading-tight line-clamp-3 "
        >
          {article.title}
        </h2>
        <div className="flex items-center gap-2 mt-2 text-white/85 text-[11px]">
          <span>{timeAgo(article.pubDate, language)}</span>
          <span className="w-1 h-1 rounded-full bg-white/50" />
          <Clock className="h-3 w-3" />
          <span>{isAr ? `${minutes} د قراءة` : `${minutes} min read`}</span>
        </div>
      </div>
    </motion.button>
  );
}
