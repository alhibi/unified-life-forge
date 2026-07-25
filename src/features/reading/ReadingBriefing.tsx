import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Bookmark, Clock, Newspaper, Play, Rss } from '@/lib/icons';

import type { FeedItem } from './types';
import { readingMinutes, timeAgo } from './utils';

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
    <AppCard className="mx-4 mt-3 p-4" aria-label="ملخص القراءة">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-mini text-muted-foreground">مساحة قراءتك</p>
          <h4 className="text-title font-bold mt-1">ابدأ بما يهمك الآن</h4>
        </div>
        <span className="w-11 h-11 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
          <Newspaper className="h-5 w-5" />
        </span>
      </div>

      <div className="grid grid-cols-3 mt-4">
        <BriefMetric icon={<Rss className="h-3.5 w-3.5" />} label="مصادر نشطة" value={enabledFeedCount} />
        <BriefMetric bordered icon={<Clock className="h-3.5 w-3.5" />} label="جديد اليوم" value={freshToday} />
        <BriefMetric bordered icon={<Bookmark className="h-3.5 w-3.5" />} label="محفوظ" value={bookmarksCount} />
      </div>

      {nextArticle && (
        <button
          type="button"
          onClick={() => onOpenArticle(nextArticle)}
          className="w-full mt-4 p-3 rounded-lg bg-accent/35 hover:bg-accent/55 text-start transition-colors"
          aria-label={`متابعة القراءة: ${nextArticle.title}`}
        >
          <div className="flex items-center gap-2 text-mini text-muted-foreground">
            <Play className="h-3.5 w-3.5 text-primary" fill="currentColor" />
            <span>متابعة القراءة</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{`${unreadCount} غير مقروء`}</span>
            {unreadMinutes > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>{`حوالي ${unreadMinutes} د`}</span>
              </>
            )}
          </div>
          <p className="text-body font-semibold leading-relaxed line-clamp-2 mt-1.5" dir="auto">
            {nextArticle.title}
          </p>
          <p className="text-mini text-muted-foreground mt-1" dir="auto">
            {`${nextArticle.source} · ${timeAgo(nextArticle.pubDate, language)}`}
          </p>
        </button>
      )}
    </AppCard>
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
    <div className={`px-2 first:ps-0 last:pe-0 ${bordered ? 'border-s border-border/50' : ''}`}>
      <span className="inline-flex items-center gap-1 text-mini text-muted-foreground">
        {icon}
        {label}
      </span>
      <p className="text-lead font-bold tabular-nums mt-1">{value}</p>
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
