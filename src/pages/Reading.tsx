import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Rss, Trash2, ExternalLink, RefreshCw, ChevronLeft,
  Bookmark, BookmarkCheck, Search, Settings2, Globe, Star, Clock,
  Newspaper, X, Check, Copy, Database, Wifi
} from 'lucide-react';
import { toast } from 'sonner';

interface FeedItem {
  title: string;
  link: string;
  description: string;
  fullContent?: string;
  pubDate: string;
  image: string | null;
  images?: string[];
  source: string;
}

interface FeedSource {
  url: string;
  name: string;
  category: string;
  enabled: boolean;
}

const DEFAULT_FEEDS: FeedSource[] = [
  { url: 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bba0b18ad1a2', name: 'الجزيرة نت', category: 'أخبار', enabled: true },
  { url: 'https://www.sana.sy/?feed=rss2', name: 'سانا', category: 'أخبار', enabled: true },
];

const SUGGESTED_FEEDS: FeedSource[] = [
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'New York Times - World', category: 'أخبار', enabled: true },
  { url: 'https://feeds.bbci.co.uk/arabic/rss.xml', name: 'BBC عربي', category: 'أخبار', enabled: true },
  { url: 'https://www.reddit.com/r/worldnews/.rss', name: 'Reddit - World News', category: 'أخبار', enabled: true },
  { url: 'https://feeds.feedburner.com/TechCrunch', name: 'TechCrunch', category: 'تقنية', enabled: true },
  { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', category: 'تقنية', enabled: true },
  { url: 'https://css-tricks.com/feed/', name: 'CSS-Tricks', category: 'تقنية', enabled: true },
];

const FEEDS_STORAGE_KEY = 'rss-reader-feeds-v2';
const BOOKMARKS_STORAGE_KEY = 'rss-reader-bookmarks';
const READ_STORAGE_KEY = 'rss-reader-read';
const LAST_REFRESH_KEY = 'rss-reader-last-refresh';

function getStoredFeeds(): FeedSource[] {
  try {
    const stored = localStorage.getItem(FEEDS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') return parsed;
    }
    return DEFAULT_FEEDS;
  } catch { return DEFAULT_FEEDS; }
}

function storeFeeds(feeds: FeedSource[]) { localStorage.setItem(FEEDS_STORAGE_KEY, JSON.stringify(feeds)); }
function getBookmarks(): string[] { try { return JSON.parse(localStorage.getItem(BOOKMARKS_STORAGE_KEY) || '[]'); } catch { return []; } }
function storeBookmarks(bookmarks: string[]) { localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks)); }
function getReadArticles(): string[] { try { return JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || '[]'); } catch { return []; } }
function storeReadArticles(read: string[]) { localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(read)); }

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
  } catch { return ''; }
}

function formatDate(dateStr: string, lang: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

type View = 'list' | 'article' | 'manage' | 'suggested';
type FilterTab = 'all' | 'bookmarks' | 'unread';

export default function ReadingPage() {
  const { language } = useApp();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  const [feedSources, setFeedSources] = useState<FeedSource[]>(getStoredFeeds);
  const [articles, setArticles] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
  const [totalInDB, setTotalInDB] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<string | null>(localStorage.getItem(LAST_REFRESH_KEY));
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const enabledFeeds = useMemo(() => feedSources.filter(f => f.enabled), [feedSources]);
  const enabledNames = useMemo(() => enabledFeeds.map(f => f.name), [enabledFeeds]);
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach(a => { counts[a.source] = (counts[a.source] || 0) + 1; });
    return counts;
  }, [articles]);

  // === CORE: Load articles from database ===
  const loadFromDB = useCallback(async () => {
    if (enabledNames.length === 0) { setArticles([]); setTotalInDB(0); return; }
    
    try {
      const { data, count } = await supabase
        .from('rss_articles')
        .select('*', { count: 'exact' })
        .in('source_name', enabledNames)
        .order('pub_date', { ascending: false })
        .limit(500);
      
      if (data) {
        const items: FeedItem[] = data.map((r: any) => ({
          title: r.title,
          link: r.link,
          description: r.description || '',
          fullContent: r.full_content || '',
          pubDate: r.pub_date || r.created_at || '',
          image: r.image,
          images: r.images || [],
          source: r.source_name,
        }));
        setArticles(items);
        setTotalInDB(count || items.length);
      }
    } catch (e) {
      console.error('DB load error:', e);
    }
  }, [enabledNames]);

  // === Background refresh: fetch from RSS, store in DB, then reload from DB ===
  const refreshFeeds = useCallback(async (silent = false) => {
    if (enabledFeeds.length === 0) return;
    if (!silent) setRefreshing(true);
    
    try {
      const nameMap: Record<string, string> = {};
      enabledFeeds.forEach(f => { nameMap[f.url] = f.name; });
      
      const { data, error } = await supabase.functions.invoke('fetch-rss', {
        body: { 
          urls: enabledFeeds.map(f => f.url), 
          limit: 100, 
          fetchFullContent: true, 
          store: true, 
          nameMap 
        },
      });
      
      if (error) throw error;
      
      const now = new Date().toISOString();
      setLastRefresh(now);
      localStorage.setItem(LAST_REFRESH_KEY, now);
      
      // Merge: DB articles + fresh response articles (for custom feeds not in DB)
      const freshItems: FeedItem[] = [];
      if (data?.feeds) {
        for (const feed of data.feeds) {
          const overrideName = nameMap[feed.url] || feed.title;
          for (const item of (feed.items || [])) {
            freshItems.push({
              title: item.title,
              link: item.link,
              description: item.description || '',
              fullContent: item.fullContent || '',
              pubDate: item.pubDate || '',
              image: item.image,
              images: item.images || [],
              source: overrideName,
            });
          }
        }
      }
      
      // Reload DB articles
      const { data: dbData } = await supabase
        .from('rss_articles')
        .select('*', { count: 'exact' })
        .in('source_name', enabledNames)
        .order('pub_date', { ascending: false })
        .limit(500);
      
      const dbItems: FeedItem[] = (dbData || []).map((r: any) => ({
        title: r.title,
        link: r.link,
        description: r.description || '',
        fullContent: r.full_content || '',
        pubDate: r.pub_date || r.created_at || '',
        image: r.image,
        images: r.images || [],
        source: r.source_name,
      }));
      
      // Merge: DB articles take priority, add fresh items not in DB
      const dbLinks = new Set(dbItems.map(a => a.link));
      const merged = [...dbItems, ...freshItems.filter(a => !dbLinks.has(a.link))];
      merged.sort((a, b) => {
        const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const db2 = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return db2 - da;
      });
      
      setArticles(merged);
      setTotalInDB(dbData?.length || 0);
      
      if (!silent) {
        toast.success(isAr ? `تم تحديث ${merged.length} مقال` : `Updated ${merged.length} articles`);
      }
    } catch (e: any) {
      console.error('Refresh error:', e);
      if (!silent) {
        toast.error(isAr ? 'فشل في التحديث' : 'Refresh failed');
      }
    } finally {
      setRefreshing(false);
    }
  }, [enabledFeeds, enabledNames, isAr]);

  // On mount: load from DB immediately, then background refresh
  useEffect(() => {
    setLoading(true);
    loadFromDB().then(() => {
      setLoading(false);
      // Check if we need a refresh (>30 min since last)
      const last = localStorage.getItem(LAST_REFRESH_KEY);
      const shouldRefresh = !last || (Date.now() - new Date(last).getTime() > 30 * 60 * 1000);
      if (shouldRefresh) {
        refreshFeeds(true);
      }
    });
    
    // Auto-refresh every hour
    autoRefreshRef.current = setInterval(() => refreshFeeds(true), 60 * 60 * 1000);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [loadFromDB, refreshFeeds]);

  const filteredArticles = useMemo(() => {
    let items = [...articles];
    if (filterTab === 'bookmarks') items = items.filter(a => bookmarks.includes(a.link));
    else if (filterTab === 'unread') items = items.filter(a => !readArticles.includes(a.link));
    if (sourceFilter !== 'all') items = items.filter(a => a.source === sourceFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.source.toLowerCase().includes(q));
    }
    return items;
  }, [articles, filterTab, sourceFilter, searchQuery, bookmarks, readArticles]);

  const unreadCount = useMemo(() => articles.filter(a => !readArticles.includes(a.link)).length, [articles, readArticles]);

  const toggleBookmark = (link: string) => {
    const updated = bookmarks.includes(link) ? bookmarks.filter(b => b !== link) : [...bookmarks, link];
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
    if (feedSources.some(f => f.url === url)) { toast.error(isAr ? 'هذا المصدر موجود بالفعل' : 'Feed already exists'); return; }
    const source: FeedSource = { url, name: newName.trim() || url.split('/')[2] || 'Feed', category: newCategory || 'أخبار', enabled: true };
    const updated = [...feedSources, source];
    setFeedSources(updated);
    storeFeeds(updated);
    setNewUrl(''); setNewName('');
    toast.success(isAr ? 'تمت إضافة المصدر' : 'Feed added');
  };

  const addSuggestedFeed = (feed: FeedSource) => {
    if (feedSources.some(f => f.url === feed.url)) { toast.error(isAr ? 'هذا المصدر موجود بالفعل' : 'Feed already exists'); return; }
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
    const updated = feedSources.map(f => f.url === url ? { ...f, enabled: !f.enabled } : f);
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

  const handleBack = () => {
    if (view === 'article') { setView('list'); setSelectedArticle(null); }
    else if (view === 'suggested') { setView('manage'); }
    else if (view === 'manage') { setView('list'); }
    else { navigate('/'); }
  };

  const refreshTimeAgo = lastRefresh ? timeAgo(lastRefresh, language) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <AnimatePresence mode="wait">
        {/* === Article Detail View === */}
        {view === 'article' && selectedArticle && (
          <motion.div key="article" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col min-h-screen">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-10">
              <button onClick={handleBack} className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all">
                <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
              </button>
              <span className="text-xs text-primary font-semibold truncate flex-1">{selectedArticle.source}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleBookmark(selectedArticle.link)} className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all">
                  {bookmarks.includes(selectedArticle.link) ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
                </button>
                <button onClick={() => copyLink(selectedArticle.link)} className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all">
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
                <a href={selectedArticle.link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            </div>
            <div className="flex-1">
              {selectedArticle.image && (
                <div className="relative">
                  <img src={selectedArticle.image} alt="" className="w-full h-52 object-cover" loading="lazy" />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
                </div>
              )}
              <div className="px-5 pt-4 pb-8">
                <h2 className="text-xl font-bold text-foreground leading-relaxed mb-3">{selectedArticle.title}</h2>
                <div className="flex items-center gap-2 mb-5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{formatDate(selectedArticle.pubDate, language)}</span>
                </div>
                <div className="h-px bg-border/40 mb-5" />
                {selectedArticle.fullContent && selectedArticle.fullContent.length > 0 ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-foreground/85 leading-[1.9]
                      [&_img]:rounded-xl [&_img]:my-4 [&_img]:w-full [&_img]:max-h-80 [&_img]:object-cover
                      [&_a]:text-primary [&_a]:no-underline [&_a]:font-medium
                      [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm
                      [&_p]:mb-4 [&_blockquote]:border-s-2 [&_blockquote]:border-primary/30 [&_blockquote]:ps-4 [&_blockquote]:italic
                      [&_figure]:my-4 [&_figcaption]:text-xs [&_figcaption]:text-muted-foreground [&_figcaption]:mt-2"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedArticle.fullContent!) }}
                  />
                ) : (
                  <p className="text-sm text-foreground/80 leading-[1.9]">{selectedArticle.description}</p>
                )}
                <a href={selectedArticle.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-2xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 active:scale-[0.98] transition-all">
                  {isAr ? 'المصدر الأصلي' : 'Original source'}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* === Suggested Feeds View === */}
        {view === 'suggested' && (
          <motion.div key="suggested" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="flex flex-col min-h-screen">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-10">
              <button onClick={handleBack} className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all">
                <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
              </button>
              <Star className="h-4 w-4 text-primary" />
              <h3 className="text-base font-bold text-foreground flex-1">{isAr ? 'مصادر مقترحة' : 'Suggested Feeds'}</h3>
            </div>
            <div className="flex-1 p-4">
              {SUGGESTED_FEEDS.filter(sf => !feedSources.some(f => f.url === sf.url)).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Check className="h-8 w-8 text-primary/40" />
                  <p className="text-sm text-muted-foreground">{isAr ? 'تمت إضافة جميع المصادر المقترحة' : 'All suggested feeds added'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {SUGGESTED_FEEDS.filter(sf => !feedSources.some(f => f.url === sf.url)).map((feed, i) => (
                    <motion.div key={feed.url} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-accent/20 hover:bg-accent/30 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Globe className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{feed.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{feed.category}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => addSuggestedFeed(feed)} className="shrink-0 h-9 w-9 p-0 rounded-xl">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* === Feed Management View === */}
        {view === 'manage' && (
          <motion.div key="manage" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="flex flex-col min-h-screen">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-10">
              <button onClick={handleBack} className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all">
                <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
              </button>
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="text-base font-bold text-foreground flex-1">{isAr ? 'إدارة المصادر' : 'Manage Feeds'}</h3>
              <button onClick={() => setView('suggested')} className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all">
                <Star className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 border-b border-border/30 space-y-2.5">
              <div className="flex gap-2">
                <Input placeholder={isAr ? 'رابط RSS...' : 'RSS URL...'} value={newUrl} onChange={e => setNewUrl(e.target.value)} className="flex-1 text-sm h-10 rounded-xl" dir="ltr" />
                <Button size="sm" onClick={addFeed} className="shrink-0 h-10 w-10 p-0 rounded-xl">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {newUrl.trim() && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2">
                  <Input placeholder={isAr ? 'اسم المصدر (اختياري)' : 'Feed name (optional)'} value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 text-sm h-10 rounded-xl" />
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground">
                    <option value="أخبار">{isAr ? 'أخبار' : 'News'}</option>
                    <option value="تقنية">{isAr ? 'تقنية' : 'Tech'}</option>
                    <option value="إسلامي">{isAr ? 'إسلامي' : 'Islamic'}</option>
                    <option value="ثقافة">{isAr ? 'ثقافة' : 'Culture'}</option>
                    <option value="رياضة">{isAr ? 'رياضة' : 'Sports'}</option>
                    <option value="أخرى">{isAr ? 'أخرى' : 'Other'}</option>
                  </select>
                </motion.div>
              )}
            </div>

            <div className="flex-1 p-4">
              {feedSources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Rss className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد مصادر' : 'No feeds'}</p>
                  <Button variant="outline" size="sm" onClick={() => setView('suggested')} className="rounded-xl">
                    <Star className="h-3.5 w-3.5 me-1.5" />
                    {isAr ? 'تصفح المقترحات' : 'Browse suggestions'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {feedSources.map((feed, i) => (
                    <motion.div key={feed.url} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl transition-colors ${feed.enabled ? 'bg-accent/20' : 'bg-accent/5 opacity-60'}`}>
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Rss className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{feed.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate" dir="ltr">{feed.url}</p>
                      </div>
                      <span className="text-[11px] px-2 py-1 rounded-lg bg-primary/10 text-primary font-bold shrink-0">
                        {sourceCounts[feed.name] || 0}
                      </span>
                      <button onClick={() => toggleFeedEnabled(feed.url)} className={`p-1.5 rounded-lg transition-colors ${feed.enabled ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-accent'}`}>
                        {feed.enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </button>
                      <button onClick={() => removeFeed(feed.url)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Database className="h-3 w-3" />
                {isAr ? `${totalInDB} مقال في الأرشيف` : `${totalInDB} in archive`}
              </span>
              <Button variant="ghost" size="sm" className="h-8 text-xs rounded-xl" onClick={() => setView('suggested')}>
                <Star className="h-3 w-3 me-1" />
                {isAr ? 'مقترحات' : 'Suggestions'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* === Main Articles List === */}
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col min-h-screen">
            <div className="px-4 py-3 border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all">
                    <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
                  </button>
                  <h3 className="text-lg font-bold flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Newspaper className="h-4 w-4 text-primary" />
                    </div>
                    {isAr ? 'إطلاع' : 'News'}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowSearch(!showSearch)} className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all">
                    <Search className={`h-4 w-4 ${showSearch ? 'text-primary' : 'text-muted-foreground'}`} />
                  </button>
                  <button onClick={() => refreshFeeds(false)} disabled={refreshing} className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all relative">
                    <RefreshCw className={`h-4 w-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing && <Wifi className="h-2.5 w-2.5 text-primary absolute top-1 end-1 animate-pulse" />}
                  </button>
                  <button onClick={() => setView('manage')} className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showSearch && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative mb-2.5 overflow-hidden">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={isAr ? 'بحث في المقالات...' : 'Search articles...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="ps-10 h-10 text-sm rounded-xl" />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute end-3 top-1/2 -translate-y-1/2">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button onClick={() => { setFilterTab('all'); setSourceFilter('all'); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 ${filterTab === 'all' && sourceFilter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'}`}>
                  {isAr ? 'الكل' : 'All'}
                  <span className="ms-1 opacity-70">{articles.length}</span>
                </button>
                {enabledFeeds.map(source => (
                  <button key={source.url} onClick={() => { setFilterTab('all'); setSourceFilter(source.name === sourceFilter ? 'all' : source.name); }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 ${filterTab === 'all' && sourceFilter === source.name ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'}`}>
                    {source.name}
                    <span className="ms-1 opacity-70">{sourceCounts[source.name] || 0}</span>
                  </button>
                ))}
                <div className="w-px h-4 bg-border/40 shrink-0" />
                <button onClick={() => setFilterTab('unread')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 ${filterTab === 'unread' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'}`}>
                  {isAr ? 'غير مقروء' : 'Unread'}
                  <span className="ms-1 opacity-70">{unreadCount}</span>
                </button>
                <button onClick={() => setFilterTab('bookmarks')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 ${filterTab === 'bookmarks' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'}`}>
                  <Bookmark className="h-3 w-3 inline me-1" />
                  {isAr ? 'المحفوظات' : 'Saved'}
                  {bookmarks.length > 0 && <span className="ms-1 opacity-70">{bookmarks.length}</span>}
                </button>
              </div>
            </div>

            <div className="flex-1">
              {loading && articles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  {filterTab === 'bookmarks' ? (
                    <><Bookmark className="h-8 w-8 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{isAr ? 'لا توجد مقالات محفوظة' : 'No saved articles'}</p></>
                  ) : searchQuery ? (
                    <><Search className="h-8 w-8 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{isAr ? 'لا توجد نتائج' : 'No results'}</p></>
                  ) : (
                    <><Newspaper className="h-8 w-8 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{isAr ? 'لا توجد مقالات' : 'No articles'}</p>
                      <Button variant="outline" size="sm" onClick={() => refreshFeeds(false)} className="rounded-xl">
                        <RefreshCw className="h-3.5 w-3.5 me-1.5" />
                        {isAr ? 'تحديث الآن' : 'Refresh now'}
                      </Button></>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {filteredArticles.map((article, i) => {
                    const isRead = readArticles.includes(article.link);
                    const isBookmarked = bookmarks.includes(article.link);
                    return (
                      <motion.div key={`${article.link}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className={`group relative ${isRead ? 'opacity-65' : ''}`}>
                        <button onClick={() => openArticle(article)} className="w-full text-start p-4 hover:bg-accent/20 active:bg-accent/30 transition-colors flex gap-3.5">
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-[13px] leading-snug line-clamp-2 ${isRead ? 'font-normal text-foreground/70' : 'font-semibold text-foreground'}`}>{article.title}</h4>
                            {article.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{article.description}</p>}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[11px] text-primary/80 font-semibold">{article.source}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span className="text-[11px] text-muted-foreground/60">{timeAgo(article.pubDate, language)}</span>
                              {isBookmarked && <BookmarkCheck className="h-3 w-3 text-primary/60" />}
                            </div>
                          </div>
                          {article.image && <img src={article.image} alt="" className="w-16 h-16 object-cover rounded-xl shrink-0" loading="lazy" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleBookmark(article.link); }}
                          className="absolute top-3.5 end-3.5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent/50 transition-all">
                          {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Database className="h-3 w-3" />
                {isAr ? `${totalInDB} مقال محفوظ` : `${totalInDB} archived`}
              </span>
              <span className="flex items-center gap-1.5">
                {refreshing ? (
                  <><Wifi className="h-3 w-3 animate-pulse text-primary" />{isAr ? 'جاري التحديث...' : 'Syncing...'}</>
                ) : refreshTimeAgo ? (
                  <><Clock className="h-3 w-3" />{isAr ? `آخر تحديث ${refreshTimeAgo}` : `Updated ${refreshTimeAgo}`}</>
                ) : (
                  <><Clock className="h-3 w-3" />{isAr ? 'لم يتم التحديث بعد' : 'Not synced yet'}</>
                )}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
