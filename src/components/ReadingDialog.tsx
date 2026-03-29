import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Rss, Trash2, ExternalLink, RefreshCw, ArrowRight, ChevronLeft,
  Bookmark, BookmarkCheck, Search, Settings2, Globe, Star, Clock, Filter,
  Newspaper, BookOpen, X, Check, Copy
} from 'lucide-react';
import { toast } from 'sonner';

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image: string | null;
  source: string;
}

interface FeedSource {
  url: string;
  name: string;
  category: string;
  enabled: boolean;
}

interface FeedResult {
  url: string;
  title: string;
  items: FeedItem[];
}

// مصادر افتراضية - الجزيرة فقط
const DEFAULT_FEEDS: FeedSource[] = [
  {
    url: 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bba0b18ad1a2',
    name: 'الجزيرة نت',
    category: 'أخبار',
    enabled: true,
  },
];

// مصادر مقترحة يمكن للمستخدم إضافتها بنقرة
const SUGGESTED_FEEDS: FeedSource[] = [
  {
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    name: 'New York Times - World',
    category: 'أخبار',
    enabled: true,
  },
  {
    url: 'https://feeds.bbci.co.uk/arabic/rss.xml',
    name: 'BBC عربي',
    category: 'أخبار',
    enabled: true,
  },
  {
    url: 'https://www.reddit.com/r/worldnews/.rss',
    name: 'Reddit - World News',
    category: 'أخبار',
    enabled: true,
  },
  {
    url: 'https://feeds.feedburner.com/TechCrunch',
    name: 'TechCrunch',
    category: 'تقنية',
    enabled: true,
  },
  {
    url: 'https://www.theverge.com/rss/index.xml',
    name: 'The Verge',
    category: 'تقنية',
    enabled: true,
  },
  {
    url: 'https://css-tricks.com/feed/',
    name: 'CSS-Tricks',
    category: 'تقنية',
    enabled: true,
  },
];

const FEEDS_STORAGE_KEY = 'rss-reader-feeds-v2';
const BOOKMARKS_STORAGE_KEY = 'rss-reader-bookmarks';
const READ_STORAGE_KEY = 'rss-reader-read';

function getStoredFeeds(): FeedSource[] {
  try {
    const stored = localStorage.getItem(FEEDS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        return parsed;
      }
    }
    // Migrate from old format
    const oldStored = localStorage.getItem('rss-reader-feeds');
    if (oldStored) {
      const oldUrls = JSON.parse(oldStored);
      if (Array.isArray(oldUrls) && oldUrls.length > 0 && typeof oldUrls[0] === 'string') {
        const migrated: FeedSource[] = oldUrls.map((url: string) => ({
          url,
          name: url.includes('aljazeera') ? 'الجزيرة نت' : url.split('/')[2] || 'Feed',
          category: 'أخبار',
          enabled: true,
        }));
        storeFeeds(migrated);
        return migrated;
      }
    }
    return DEFAULT_FEEDS;
  } catch {
    return DEFAULT_FEEDS;
  }
}

function storeFeeds(feeds: FeedSource[]) {
  localStorage.setItem(FEEDS_STORAGE_KEY, JSON.stringify(feeds));
}

function getBookmarks(): string[] {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_STORAGE_KEY) || '[]');
  } catch { return []; }
}

function storeBookmarks(bookmarks: string[]) {
  localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
}

function getReadArticles(): string[] {
  try {
    return JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || '[]');
  } catch { return []; }
}

function storeReadArticles(read: string[]) {
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(read));
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

function formatDate(dateStr: string, lang: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch { return dateStr; }
}

type View = 'list' | 'article' | 'manage' | 'suggested';
type FilterTab = 'all' | 'bookmarks' | 'unread';

interface ReadingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReadingDialog({ open, onOpenChange }: ReadingDialogProps) {
  const { language } = useApp();
  const isAr = language === 'ar';

  const [feedSources, setFeedSources] = useState<FeedSource[]>(getStoredFeeds);
  const [articles, setArticles] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('أخبار');
  const [view, setView] = useState<View>('list');
  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>(getBookmarks);
  const [readArticles, setReadArticles] = useState<string[]>(getReadArticles);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [showSearch, setShowSearch] = useState(false);

  const enabledUrls = useMemo(() =>
    feedSources.filter(f => f.enabled).map(f => f.url),
    [feedSources]
  );

  const categories = useMemo(() => {
    const cats = new Set(feedSources.map(f => f.category));
    return Array.from(cats);
  }, [feedSources]);

  const sources = useMemo(() => {
    const s = new Set(articles.map(a => a.source));
    return Array.from(s);
  }, [articles]);

  const fetchFeeds = useCallback(async () => {
    if (enabledUrls.length === 0) { setArticles([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-rss', {
        body: { urls: enabledUrls },
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
  }, [enabledUrls, isAr]);

  useEffect(() => {
    if (open) {
      setView('list');
      setSelectedArticle(null);
      fetchFeeds();
    }
  }, [open, fetchFeeds]);

  const filteredArticles = useMemo(() => {
    let items = [...articles];

    if (filterTab === 'bookmarks') {
      items = items.filter(a => bookmarks.includes(a.link));
    } else if (filterTab === 'unread') {
      items = items.filter(a => !readArticles.includes(a.link));
    }

    if (sourceFilter !== 'all') {
      items = items.filter(a => a.source === sourceFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q)
      );
    }

    return items;
  }, [articles, filterTab, sourceFilter, searchQuery, bookmarks, readArticles]);

  const toggleBookmark = (link: string) => {
    const updated = bookmarks.includes(link)
      ? bookmarks.filter(b => b !== link)
      : [...bookmarks, link];
    setBookmarks(updated);
    storeBookmarks(updated);
  };

  const markAsRead = (link: string) => {
    if (!readArticles.includes(link)) {
      const updated = [...readArticles, link];
      setReadArticles(updated);
      storeReadArticles(updated);
    }
  };

  const addFeed = () => {
    const url = newUrl.trim();
    if (!url) return;
    if (feedSources.some(f => f.url === url)) {
      toast.error(isAr ? 'هذا المصدر موجود بالفعل' : 'Feed already exists');
      return;
    }
    const source: FeedSource = {
      url,
      name: newName.trim() || url.split('/')[2] || 'Feed',
      category: newCategory || 'أخبار',
      enabled: true,
    };
    const updated = [...feedSources, source];
    setFeedSources(updated);
    storeFeeds(updated);
    setNewUrl('');
    setNewName('');
    toast.success(isAr ? 'تمت إضافة المصدر' : 'Feed added');
  };

  const addSuggestedFeed = (feed: FeedSource) => {
    if (feedSources.some(f => f.url === feed.url)) {
      toast.error(isAr ? 'هذا المصدر موجود بالفعل' : 'Feed already exists');
      return;
    }
    const updated = [...feedSources, { ...feed }];
    setFeedSources(updated);
    storeFeeds(updated);
    toast.success(isAr ? `تمت إضافة ${feed.name}` : `Added ${feed.name}`);
  };

  const removeFeed = (url: string) => {
    const updated = feedSources.filter(f => f.url !== url);
    setFeedSources(updated);
    storeFeeds(updated);
    toast.success(isAr ? 'تم حذف المصدر' : 'Feed removed');
  };

  const toggleFeedEnabled = (url: string) => {
    const updated = feedSources.map(f =>
      f.url === url ? { ...f, enabled: !f.enabled } : f
    );
    setFeedSources(updated);
    storeFeeds(updated);
  };

  const openArticle = (article: FeedItem) => {
    setSelectedArticle(article);
    markAsRead(article.link);
    setView('article');
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success(isAr ? 'تم نسخ الرابط' : 'Link copied');
  };

  // === Article Detail View ===
  if (view === 'article' && selectedArticle) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-border/40 bg-card/80 backdrop-blur-sm">
            <button
              onClick={() => { setView('list'); setSelectedArticle(null); }}
              className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
            </button>
            <span className="text-xs text-primary font-medium truncate flex-1">
              {selectedArticle.source}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => toggleBookmark(selectedArticle.link)}
                className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
              >
                {bookmarks.includes(selectedArticle.link) ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <button
                onClick={() => copyLink(selectedArticle.link)}
                className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
              <a
                href={selectedArticle.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {selectedArticle.image && (
              <img
                src={selectedArticle.image}
                alt=""
                className="w-full h-48 object-cover"
                loading="lazy"
              />
            )}
            <div className="px-5 py-4">
              <h2 className="text-lg font-bold text-foreground leading-relaxed mb-2">
                {selectedArticle.title}
              </h2>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatDate(selectedArticle.pubDate, language)}
                </span>
              </div>
              <div className="h-px bg-border/40 mb-4" />
              <p className="text-sm text-foreground/80 leading-[1.8]">
                {selectedArticle.description}
              </p>
              <a
                href={selectedArticle.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                {isAr ? 'قراءة المقال كاملاً' : 'Read full article'}
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </a>
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  // === Suggested Feeds View ===
  if (view === 'suggested') {
    const availableSuggested = SUGGESTED_FEEDS.filter(
      sf => !feedSources.some(f => f.url === sf.url)
    );
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-border/40 bg-card/80">
            <button
              onClick={() => setView('manage')}
              className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
            </button>
            <Star className="h-4 w-4 text-primary" />
            <h3 className="text-base font-bold text-foreground flex-1">
              {isAr ? 'مصادر مقترحة' : 'Suggested Feeds'}
            </h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            {availableSuggested.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Check className="h-8 w-8 text-primary/40" />
                <p className="text-sm text-muted-foreground">
                  {isAr ? 'تمت إضافة جميع المصادر المقترحة' : 'All suggested feeds added'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableSuggested.map(feed => (
                  <div key={feed.url} className="flex items-center gap-3 p-3 rounded-xl bg-accent/20 hover:bg-accent/30 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{feed.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{feed.category}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addSuggestedFeed(feed)}
                      className="shrink-0 h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  // === Feed Management View ===
  if (view === 'manage') {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-border/40 bg-card/80">
            <button
              onClick={() => setView('list')}
              className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
            </button>
            <Settings2 className="h-4 w-4 text-primary" />
            <h3 className="text-base font-bold text-foreground flex-1">
              {isAr ? 'إدارة المصادر' : 'Manage Feeds'}
            </h3>
            <button
              onClick={() => setView('suggested')}
              className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
              title={isAr ? 'مصادر مقترحة' : 'Suggested feeds'}
            >
              <Star className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Add new feed */}
          <div className="p-3 border-b border-border/30 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={isAr ? 'رابط RSS...' : 'RSS URL...'}
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                className="flex-1 text-sm h-9"
                dir="ltr"
              />
              <Button size="sm" onClick={addFeed} className="shrink-0 h-9">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {newUrl.trim() && (
              <div className="flex gap-2">
                <Input
                  placeholder={isAr ? 'اسم المصدر (اختياري)' : 'Feed name (optional)'}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="flex-1 text-sm h-9"
                />
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                >
                  <option value="أخبار">{isAr ? 'أخبار' : 'News'}</option>
                  <option value="تقنية">{isAr ? 'تقنية' : 'Tech'}</option>
                  <option value="إسلامي">{isAr ? 'إسلامي' : 'Islamic'}</option>
                  <option value="ثقافة">{isAr ? 'ثقافة' : 'Culture'}</option>
                  <option value="رياضة">{isAr ? 'رياضة' : 'Sports'}</option>
                  <option value="أخرى">{isAr ? 'أخرى' : 'Other'}</option>
                </select>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 p-3">
            {feedSources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Rss className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {isAr ? 'لا توجد مصادر' : 'No feeds'}
                </p>
                <Button variant="outline" size="sm" onClick={() => setView('suggested')}>
                  <Star className="h-3.5 w-3.5 me-1.5" />
                  {isAr ? 'تصفح المقترحات' : 'Browse suggestions'}
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {feedSources.map(feed => (
                  <div
                    key={feed.url}
                    className={`flex items-center gap-2.5 p-3 rounded-xl transition-colors ${
                      feed.enabled ? 'bg-accent/20' : 'bg-accent/5 opacity-60'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Rss className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{feed.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate" dir="ltr">{feed.url}</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                      {feed.category}
                    </span>
                    <button
                      onClick={() => toggleFeedEnabled(feed.url)}
                      className={`p-1 rounded-lg transition-colors ${
                        feed.enabled ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {feed.enabled ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => removeFeed(feed.url)}
                      className="p-1 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Stats bar */}
          <div className="p-3 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {isAr
                ? `${feedSources.length} مصدر • ${feedSources.filter(f => f.enabled).length} مفعّل`
                : `${feedSources.length} feeds • ${feedSources.filter(f => f.enabled).length} enabled`
              }
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setView('suggested')}>
              <Star className="h-3 w-3 me-1" />
              {isAr ? 'مقترحات' : 'Suggestions'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // === Main Articles List ===
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border/40 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 text-start">
              <h3 className="text-base font-bold flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-primary" />
                {isAr ? 'القراءة' : 'Reading'}
              </h3>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Search className={`h-4 w-4 ${showSearch ? 'text-primary' : 'text-muted-foreground'}`} />
              </button>
              <button
                onClick={fetchFeeds}
                disabled={loading}
                className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setView('manage')}
                className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          {showSearch && (
            <div className="relative mb-2">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={isAr ? 'بحث في المقالات...' : 'Search articles...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="ps-9 h-8 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute end-2 top-1/2 -translate-y-1/2"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                filterTab === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'
              }`}
            >
              {isAr ? 'الكل' : 'All'}
              <span className="ms-1 opacity-70">{articles.length}</span>
            </button>
            <button
              onClick={() => setFilterTab('unread')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                filterTab === 'unread'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'
              }`}
            >
              {isAr ? 'غير مقروء' : 'Unread'}
            </button>
            <button
              onClick={() => setFilterTab('bookmarks')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                filterTab === 'bookmarks'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'
              }`}
            >
              <Bookmark className="h-3 w-3 inline me-1" />
              {isAr ? 'المحفوظات' : 'Saved'}
              {bookmarks.length > 0 && <span className="ms-1 opacity-70">{bookmarks.length}</span>}
            </button>

            {/* Source filter */}
            {sources.length > 1 && (
              <>
                <div className="w-px h-4 bg-border/40 shrink-0" />
                <button
                  onClick={() => setSourceFilter('all')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
                    sourceFilter === 'all'
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-accent/20 text-muted-foreground hover:bg-accent/40'
                  }`}
                >
                  {isAr ? 'كل المصادر' : 'All sources'}
                </button>
                {sources.map(s => (
                  <button
                    key={s}
                    onClick={() => setSourceFilter(s === sourceFilter ? 'all' : s)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
                      sourceFilter === s
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-accent/20 text-muted-foreground hover:bg-accent/40'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Articles */}
        <ScrollArea className="flex-1">
          {loading && articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="h-6 w-6 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                {isAr ? 'جاري التحميل...' : 'Loading...'}
              </p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              {filterTab === 'bookmarks' ? (
                <>
                  <Bookmark className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {isAr ? 'لا توجد مقالات محفوظة' : 'No saved articles'}
                  </p>
                </>
              ) : searchQuery ? (
                <>
                  <Search className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {isAr ? 'لا توجد نتائج' : 'No results'}
                  </p>
                </>
              ) : (
                <>
                  <Newspaper className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {isAr ? 'لا توجد مقالات' : 'No articles'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setView('manage')}>
                    {isAr ? 'إضافة مصادر' : 'Add feeds'}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {filteredArticles.map((article, i) => {
                const isRead = readArticles.includes(article.link);
                const isBookmarked = bookmarks.includes(article.link);
                return (
                  <div
                    key={`${article.link}-${i}`}
                    className={`group relative ${isRead ? 'opacity-70' : ''}`}
                  >
                    <button
                      onClick={() => openArticle(article)}
                      className="w-full text-start p-3.5 hover:bg-accent/20 transition-colors flex gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm leading-snug line-clamp-2 ${isRead ? 'font-normal text-foreground/70' : 'font-semibold text-foreground'}`}>
                          {article.title}
                        </h4>
                        {article.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {article.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-primary/80 font-medium">{article.source}</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          <span className="text-[10px] text-muted-foreground/60">
                            {timeAgo(article.pubDate, language)}
                          </span>
                          {isBookmarked && (
                            <BookmarkCheck className="h-3 w-3 text-primary/60" />
                          )}
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
                    {/* Quick bookmark */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(article.link); }}
                      className="absolute top-3 end-3 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent/50 transition-all"
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer stats */}
        <div className="px-3 py-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {isAr
              ? `${filteredArticles.length} مقال`
              : `${filteredArticles.length} articles`
            }
          </span>
          <span>
            {isAr
              ? `${feedSources.filter(f => f.enabled).length} مصدر`
              : `${feedSources.filter(f => f.enabled).length} sources`
            }
          </span>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
