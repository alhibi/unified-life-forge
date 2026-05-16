import { motion } from 'framer-motion';
import { Bookmark, BookmarkCheck, Clock } from 'lucide-react';
import type { FeedItem } from './types';
import { readingMinutes, timeAgo } from './utils';
import { SourcePill } from './SourcePill';

/**
 * Compact article row used inside the main list. Hero variant moved
 * separately because it has different proportions and image priority.
 *
 * Layout (LTR):
 *   [text column flex-1] [thumbnail 64×64 if present] [bookmark on hover]
 */
export function ArticleCard({
  article,
  index,
  isRead,
  isBookmarked,
  language,
  onOpen,
  onToggleBookmark,
}: {
  article: FeedItem;
  index: number;
  isRead: boolean;
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
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.25 }}
      className={`group relative ${isRead ? 'opacity-65' : ''}`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-start p-4 hover:bg-accent/20 active:bg-accent/30 transition-colors flex gap-3.5"
      >
        <div className="flex-1 min-w-0">
          <h4
            className={`text-[14px] leading-snug line-clamp-2 ${
              isRead
                ? 'font-normal text-foreground/70'
                : 'font-semibold text-foreground'
            }`}
          >
            {article.title}
          </h4>
          {article.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {article.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
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
          </div>
        </div>
        {article.image && (
          <img
            src={article.image}
            alt=""
            className="w-20 h-20 object-cover rounded-2xl shrink-0"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
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
              background: 'linear-gradient(160deg, hsl(var(--primary) / 0.18), hsl(var(--primary) / 0.06))',
            }}
          />
        )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
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
        <h2 className="text-white text-[18px] font-bold leading-tight line-clamp-3 drop-shadow-sm">
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
