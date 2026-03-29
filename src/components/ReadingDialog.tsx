import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Rss, Trash2, ExternalLink, RefreshCw, ArrowRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image: string | null;
  source: string;
}

interface FeedResult {
  url: string;
  title: string;
  items: FeedItem[];
}

const DEFAULT_FEEDS = [
  'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bba0b18ad1a2',
  'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
];

const STORAGE_KEY = 'rss-reader-feeds';

function getStoredFeeds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_FEEDS;
  } catch {
    return DEFAULT_FEEDS;
  }
}

function storeFeeds(feeds: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
}

function timeAgo(dateStr: string, lang: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return lang === 'ar' ? 'الآن' : 'Now';
    if (diffMin < 60) return lang === 'ar' ? `منذ ${diffMin} د` : `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return lang === 'ar' ? `منذ ${diffHr} س` : `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return lang === 'ar' ? `منذ ${diffDay} ي` : `${diffDay}d ago`;
  } catch {
    return '';
  }
}

interface ReadingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReadingDialog({ open, onOpenChange }: ReadingDialogProps) {
  const { language } = useApp();
  const isAr = language === 'ar';

  const [feedUrls, setFeedUrls] = useState<string[]>(getStoredFeeds);
  const [articles, setArticles] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);

  const fetchFeeds = useCallback(async () => {
    if (feedUrls.length === 0) { setArticles([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-rss', {
        body: { urls: feedUrls },
      });
      if (error) throw error;
      const allItems: FeedItem[] = [];
      (data.feeds || []).forEach((feed: FeedResult) => {
        feed.items.forEach(item => allItems.push(item));
      });
      allItems.sort((a, b) => {
        const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return db - da;
      });
      setArticles(allItems);
    } catch (e: any) {
      console.error('RSS fetch error:', e);
      toast.error(isAr ? 'فشل في تحميل الأخبار' : 'Failed to load feeds');
    } finally {
      setLoading(false);
    }
  }, [feedUrls, isAr]);

  useEffect(() => {
    if (open) fetchFeeds();
  }, [open, fetchFeeds]);

  const addFeed = () => {
    const url = newUrl.trim();
    if (!url) return;
    if (feedUrls.includes(url)) {
      toast.error(isAr ? 'هذا الرابط موجود بالفعل' : 'Feed already exists');
      return;
    }
    const updated = [...feedUrls, url];
    setFeedUrls(updated);
    storeFeeds(updated);
    setNewUrl('');
    toast.success(isAr ? 'تمت الإضافة' : 'Feed added');
  };

  const removeFeed = (url: string) => {
    const updated = feedUrls.filter(f => f !== url);
    setFeedUrls(updated);
    storeFeeds(updated);
  };

  // Article detail view
  if (selectedArticle) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0 gap-0">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <button
              onClick={() => setSelectedArticle(null)}
              className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
            </button>
            <span className="text-xs text-muted-foreground truncate flex-1">
              {selectedArticle.source}
            </span>
            <a
              href={selectedArticle.link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
          <ScrollArea className="flex-1 px-5 py-4">
            {selectedArticle.image && (
              <img
                src={selectedArticle.image}
                alt=""
                className="w-full h-44 object-cover rounded-xl mb-4"
                loading="lazy"
              />
            )}
            <h2 className="text-lg font-bold text-foreground leading-relaxed mb-2">
              {selectedArticle.title}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              {timeAgo(selectedArticle.pubDate, language)}
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {selectedArticle.description}
            </p>
            <a
              href={selectedArticle.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-6 text-sm text-primary font-medium hover:underline"
            >
              {isAr ? 'قراءة المقال كاملاً' : 'Read full article'}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </a>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  // Feed management view
  if (showManage) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0 gap-0">
          <div className="flex items-center gap-2 p-4 border-b border-border/50">
            <button
              onClick={() => setShowManage(false)}
              className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
            </button>
            <h3 className="text-base font-bold text-foreground flex-1">
              {isAr ? 'إدارة المصادر' : 'Manage Feeds'}
            </h3>
          </div>
          <div className="p-4 border-b border-border/30">
            <div className="flex gap-2">
              <Input
                placeholder={isAr ? 'رابط RSS...' : 'RSS URL...'}
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFeed()}
                className="flex-1 text-sm"
                dir="ltr"
              />
              <Button size="sm" onClick={addFeed} className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {feedUrls.map(url => (
                <div key={url} className="flex items-center gap-2 p-3 rounded-xl bg-accent/30">
                  <Rss className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1" dir="ltr">{url}</span>
                  <button
                    onClick={() => removeFeed(url)}
                    className="p-1 rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ))}
              {feedUrls.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {isAr ? 'لا توجد مصادر. أضف رابط RSS للبدء.' : 'No feeds. Add an RSS URL to start.'}
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  // Main articles list
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <DialogHeader className="flex-1 text-start">
            <DialogTitle className="text-base font-bold">
              {isAr ? 'القراءة' : 'Reading'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchFeeds}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowManage(true)}
              className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <Rss className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading && articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="h-6 w-6 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                {isAr ? 'جاري التحميل...' : 'Loading...'}
              </p>
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Rss className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {isAr ? 'لا توجد مقالات' : 'No articles'}
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowManage(true)}>
                {isAr ? 'إضافة مصادر' : 'Add feeds'}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {articles.map((article, i) => (
                <button
                  key={`${article.link}-${i}`}
                  onClick={() => setSelectedArticle(article)}
                  className="w-full text-start p-4 hover:bg-accent/30 transition-colors flex gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                      {article.title}
                    </h4>
                    {article.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {article.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-primary/70 font-medium">{article.source}</span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {timeAgo(article.pubDate, language)}
                      </span>
                    </div>
                  </div>
                  {article.image && (
                    <img
                      src={article.image}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg shrink-0"
                      loading="lazy"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
