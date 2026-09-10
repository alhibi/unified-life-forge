import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { Bookmark, Clock, Play, Rss } from '@/lib/icons';

import type { FeedItem } from './types';
import { readingMinutes } from './utils';

/**
 * A calm, actionable overview placed at the top of the reading list.
 * It turns a potentially overwhelming feed into one clear next action,
 * while keeping the most useful reading metrics visible at a glance.
 */
export function ReadingBriefing({
  articles,
  readArticles,
  bookmarksCount,
  enabledFeedCount,
  language,
  onOpenArticle,
}: {
  articles: FeedItem[];
  readArticles: string[];
  bookmarksCount: number;
  enabledFeedCount: number;
  language: string;
  onOpenArticle: (article: FeedItem) => void;
}) {
  const briefing = useMemo(() => {
    const readSet = new Set(readArticles);
    const today = startOfToday();
    let unreadCount = 0;
    let freshToday = 0;
    let unreadMinutes = 0;
    let sampledMinutes = 0;
    let nextArticle: FeedItem | null = null;

    for (const article of articles) {
      if (!article.link || readSet.has(article.link)) continue;
      unreadCount++;
      const timestamp = toTimestamp(article.pubDate);
      if (timestamp >= today) freshToday++;
      if (!nextArticle || timestamp > toTimestamp(nextArticle.pubDate)) {
        nextArticle = article;
      }
      if (sampledMinutes < 12) {
        unreadMinutes += readingMinutes(
          article.fullContent || article.description || article.title,
          language,
        );
        sampledMinutes++;
      }
    }

    return { freshToday, nextArticle, unreadCount, unreadMinutes };
  }, [articles, language, readArticles]);

  const { freshToday, nextArticle, unreadCount, unreadMinutes } = briefing;

  if (articles.length === 0) return null;

  return (
    <section className="px-4 pt-3 pb-1" aria-label="ملخص القراءة">
      {/* Compact three-column stat strip — same information, a fraction
          of the vertical weight the old card consumed. */}
      <div className="grid grid-cols-3 rounded-lg bg-card/40 ring-1 ring-border/40 py-2.5">
        <BriefMetric icon={<Rss className="h-3 w-3" />} label="مصادر" value={enabledFeedCount} />
        <BriefMetric bordered icon={<Clock className="h-3 w-3" />} label="جديد اليوم" value={freshToday} />
        <BriefMetric bordered icon={<Bookmark className="h-3 w-3" />} label="محفوظ" value={bookmarksCount} />
      </div>

      {/* One quiet action line. It deliberately does NOT repeat the
          article title — the newest item is already the first row, and
          printing it twice was the redundancy in the old card. */}
      {nextArticle && (
        <button
          type="button"
          onClick={() => onOpenArticle(nextArticle)}
          className="w-full mt-1.5 px-1 py-2 rounded-lg text-start transition-colors hover:bg-accent/20 active:bg-accent/30 flex items-center gap-1.5 text-micro"
          aria-label={'ابدأ القراءة من أحدث مقالة غير مقروءة'}
        >
          <Play className="h-3 w-3 text-primary" fill="currentColor" />
          <span className="font-semibold text-primary/90">ابدأ القراءة</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="tabular-nums text-muted-foreground/75">{`${unreadCount} غير مقروء`}</span>
          {unreadMinutes > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="tabular-nums text-muted-foreground/75">{`~${unreadMinutes} د`}</span>
            </>
          )}
        </button>
      )}
    </section>
  );
}

function BriefMetric({
  icon,
  label,
  value,
  bordered = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  bordered?: boolean;
}) {
  return (
    <div className={`px-3 text-center ${bordered ? 'border-s border-border/40' : ''}`}>
      <p className="text-body font-bold tabular-nums leading-none">{value}</p>
      <span className="inline-flex items-center gap-1 text-micro text-muted-foreground/75 mt-1">
        {icon}
        {label}
      </span>
    </div>
  );
}

function startOfToday(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function toTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
