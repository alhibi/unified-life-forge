import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive, Bell, Bookmark, CheckCheck, ChevronLeft, Compass, FolderOpen, MoreHorizontal,
  Newspaper, RefreshCw, Search, Settings2, Type, X, Plus, Trash2, Sparkle
} from '@/lib/icons';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FeedSource, FilterTab } from './types';
import type { ListPrefs } from './listPrefs';
import { SourcePill } from './SourcePill';
import { ReadingPrefsToolbar } from './ReadingPrefsToolbar';
import { getCustomFolders, storeCustomFolders } from './foldersStorage';
import { toast } from 'sonner';

/**
 * Sticky page header for the list view: title, action icons, search
 * field (collapsible), category-folder chips, source chips, and the
 * filter row. Stateless — every value lives in the parent so it can
 * be shared across views.
 *
 * Two filter rows borrowed from CapyReader's information hierarchy:
 *  1. **Categories** (folders): All / News / Tech / … grouped by the
 *     category each feed was added under.
 *  2. **Sources**: the actual feeds inside the selected category.
 *
 * Selecting "All" categories shows every source. Picking a category
 * narrows the source row to just feeds in that bucket *and* filters
 * the article list to those sources.
 */
export function ListHeader({
  onBack,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  refreshing,
  syncProgress,
  prefetchProgress,
  onRefresh,
  onManage,
  onDiscoverFeeds,
  onMarkAllRead,
  onOpenArchiveSearch,
  onOpenAlerts,
  onOpenReader,
  unseenAlerts,
  filterTab,
  setFilterTab,
  sourceFilter,
  setSourceFilter,
  categoryFilter,
  setCategoryFilter,
  enabledFeeds,
  sourceCounts,
  articleCount,
  unreadCount,
  bookmarksCount,
  listPrefs,
  onListPrefsChange,
}: {
  onBack: () => void;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  refreshing: boolean;
  syncProgress?: {
    active: boolean;
    total: number;
    current: number;
    currentFeed?: string;
    successCount: number;
    errorCount: number;
  };
  prefetchProgress?: {
    active: boolean;
    total: number;
    current: number;
    currentTitle?: string;
  };
  onRefresh: () => void;
  onManage: () => void;
  onDiscoverFeeds: () => void;
  onMarkAllRead: () => void;
  onOpenArchiveSearch: () => void;
  onOpenAlerts: () => void;
  onOpenReader: () => void;
  unseenAlerts: number;
  filterTab: FilterTab;
  setFilterTab: (t: FilterTab) => void;
  sourceFilter: string;
  setSourceFilter: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  enabledFeeds: FeedSource[];
  sourceCounts: Record<string, number>;
  articleCount: number;
  unreadCount: number;
  bookmarksCount: number;
  listPrefs: ListPrefs;
  onListPrefsChange: (next: Partial<ListPrefs>) => void;
}) {
  const [customFolders, setCustomFolders] = useState<string[]>(getCustomFolders);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);

  const handleAddFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    if (customFolders.includes(trimmed)) {
      toast.error('المجلد موجود بالفعل');
      return;
    }
    const updated = [...customFolders, trimmed];
    setCustomFolders(updated);
    storeCustomFolders(updated);
    setNewFolderName('');
    setShowFolderInput(false);
    toast.success('تم إنشاء المجلد');
  };

  const handleDeleteFolder = (folder: string) => {
    const updated = customFolders.filter(f => f !== folder);
    setCustomFolders(updated);
    storeCustomFolders(updated);
    if (categoryFilter === folder) {
      setCategoryFilter('all');
      setSourceFilter('all');
    }
    toast.success('تم حذف المجلد');
  };

  // Build the set of *populated* categories from the user's enabled
  // feeds. We never show a chip for a category nobody is subscribed
  // to (e.g. "Sports" if you have no sports feeds).
  const populatedCategories = useMemo(() => {
    const ids = new Set<string>();
    for (const f of enabledFeeds) ids.add(f.category || 'other');
    // Ensure all custom folders and default categories are supported
    const allKnown = Array.from(new Set([...customFolders, ...ids]));
    return allKnown.map(id => ({
      id,
      ar: id,
      en: id.charAt(0).toUpperCase() + id.slice(1)
    }));
  }, [enabledFeeds, customFolders]);

  // Filter source chips by active category so the row stays scannable.
  const visibleSources = useMemo(() => {
    if (categoryFilter === 'all') return enabledFeeds;
    return enabledFeeds.filter((f) => (f.category || 'other') === categoryFilter);
  }, [enabledFeeds, categoryFilter]);

  const showCategoryRow = populatedCategories.length > 0;

  return (
    <div
      className="px-4 pt-4 pb-2 border-b border-border/40 sticky top-0 z-10 bg-card/92 backdrop-blur-md"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ms-1 rounded-xl hover:bg-accent/50 active:scale-95 transition-all shrink-0"
            aria-label={'رجوع'}
          >
            <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
              <Newspaper className="h-4 w-4 text-primary" />
            </span>
            <div className="flex flex-col leading-tight min-w-0">
              <h3 className="text-[17px] font-bold truncate">
                {'إطلاع'}
              </h3>
              <span className="text-[10px] text-muted-foreground/80 tabular-nums truncate">
                {`${articleCount} مقالة · ${unreadCount} غير مقروء`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <IconBtn
            onClick={() => setShowSearch(!showSearch)}
            active={showSearch}
            aria-label={'بحث في القائمة'}
            title={'بحث في القائمة الحالية'}
          >
            <Search className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            onClick={onRefresh}
            disabled={refreshing}
            aria-label={'تحديث'}
            title={'تحديث الآن'}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
          </IconBtn>
          <IconBtn
            onClick={onDiscoverFeeds}
            accent
            aria-label={'اكتشاف مصادر'}
            title={'اكتشاف وإضافة مصادر جديدة'}
          >
            <Compass className="h-4 w-4" />
          </IconBtn>
          <ReadingPrefsToolbar
            prefs={listPrefs}
            onChange={onListPrefsChange}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all relative"
                aria-label={'المزيد'}
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                {unseenAlerts > 0 && (
                  <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
                {'إجراءات'}
              </DropdownMenuLabel>
              {unreadCount > 0 && (
                <DropdownMenuItem onClick={onMarkAllRead} className="rounded-lg gap-2.5">
                  <CheckCheck className="h-4 w-4 text-muted-foreground" />
                  <span>{'تحديد الكل كمقروء'}</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onOpenArchiveSearch} className="rounded-lg gap-2.5">
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span>{'بحث الأرشيف'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenAlerts} className="rounded-lg gap-2.5">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{'تنبيهات الكلمات'}</span>
                {unseenAlerts > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground tabular-nums">
                    {unseenAlerts}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenReader} className="rounded-lg gap-2.5">
                <Type className="h-4 w-4 text-muted-foreground" />
                <span>{'قراءة رابط'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onManage} className="rounded-lg gap-2.5">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span>{'إدارة المصادر'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative mb-3 overflow-hidden"
          >
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={'بحث في المقالات...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 h-11 text-[15px] rounded-2xl bg-background/60 border-border/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-3 top-1/2 -translate-y-1/2"
                aria-label={'مسح'}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Sync Progressive Panel (VIP grade) */}
      <AnimatePresence>
        {syncProgress?.active && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 px-3.5 py-2.5 rounded-2xl bg-muted/60 border border-border/50 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span className="truncate max-w-[200px] animate-pulse">
                  {syncProgress.currentFeed || ('جاري تحديث المصادر...')}
                </span>
              </span>
              <span className="tabular-nums opacity-90">
                {syncProgress.current} / {syncProgress.total}
              </span>
            </div>
            {/* VIP Gold-theme smooth progress bar */}
            <div className="h-1.5 w-full bg-amber-500/15 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIP Smart Pre-loading/Pre-fetching Panel */}
      <AnimatePresence>
        {prefetchProgress?.active && !syncProgress?.active && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 px-3.5 py-2 rounded-2xl bg-primary/10 border border-primary/20 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-primary mb-1">
              <span className="flex items-center gap-1.5">
                <Sparkle className="h-3.5 w-3.5 animate-pulse text-amber-500 fill-amber-500" />
                <span>
                  {'تجهيز ذكي فائق للمقالات الكاملة...'}
                </span>
              </span>
              <span className="tabular-nums opacity-90">
                {prefetchProgress.current} / {prefetchProgress.total}
              </span>
            </div>
            {prefetchProgress.currentTitle && (
              <p className="text-[10px] text-muted-foreground truncate mb-1.5 opacity-80" dir="auto">
                {prefetchProgress.currentTitle}
              </p>
            )}
            <div className="h-1.5 w-full bg-primary/15 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(prefetchProgress.current / prefetchProgress.total) * 100}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category folder row */}
      {showCategoryRow && (
        <div className="space-y-2 mb-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
            <CategoryChip
              active={categoryFilter === 'all'}
              onClick={() => {
                setCategoryFilter('all');
                setSourceFilter('all');
              }}
              label={'كل الأقسام'}
              icon={<FolderOpen className="h-3 w-3" />}
            />
            {populatedCategories.map((c) => (
              <div key={c.id} className="relative group shrink-0">
                <CategoryChip
                  active={categoryFilter === c.id}
                  onClick={() => {
                    setCategoryFilter(c.id === categoryFilter ? 'all' : c.id);
                    // Clear source when switching folders
                    setSourceFilter('all');
                  }}
                  label={c.ar}
                />
                {customFolders.includes(c.id) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(c.id);
                    }}
                    className="absolute -top-1 -end-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={'حذف'}
                  >
                    <Trash2 className="h-2 w-2" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setShowFolderInput(!showFolderInput)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 active:scale-95 inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            >
              <Plus className="h-3 w-3" />
              <span>{'مجلد جديد'}</span>
            </button>
          </div>

          <AnimatePresence>
            {showFolderInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2"
              >
                <Input
                  placeholder={'اسم المجلد الجديد...'}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddFolder();
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddFolder}
                  className="px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity shrink-0"
                >
                  {'إضافة'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Filter / source chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
        <Chip
          active={filterTab === 'all' && sourceFilter === 'all'}
          onClick={() => {
            setFilterTab('all');
            setSourceFilter('all');
          }}
          label={'الكل'}
          count={articleCount}
        />
        <Chip
          active={filterTab === 'unread'}
          onClick={() => setFilterTab(filterTab === 'unread' ? 'all' : 'unread')}
          label={'غير مقروء'}
          count={unreadCount}
        />
        <Chip
          active={filterTab === 'bookmarks'}
          onClick={() => setFilterTab(filterTab === 'bookmarks' ? 'all' : 'bookmarks')}
          icon={<Bookmark className="h-3 w-3 inline" />}
          label={'المحفوظات'}
          count={bookmarksCount > 0 ? bookmarksCount : undefined}
        />
        {visibleSources.length > 0 && (
          <div className="w-px h-4 bg-border/40 shrink-0 mx-0.5" />
        )}
        {visibleSources.map((source) => (
          <Chip
            key={source.url}
            active={filterTab === 'all' && sourceFilter === source.name}
            onClick={() => {
              setFilterTab('all');
              setSourceFilter(source.name === sourceFilter ? 'all' : source.name);
            }}
            label={source.name}
            count={sourceCounts[source.name] || 0}
            withPill={source.name}
          />
        ))}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  active,
  accent,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  accent?: boolean;
  'aria-label'?: string;
  title?: string;
}) {
  const base =
    'p-2.5 rounded-xl active:scale-95 transition-all disabled:opacity-50';
  const tone = active
    ? 'bg-primary/15 text-primary'
    : accent
      ? 'text-primary hover:bg-primary/10'
      : 'text-muted-foreground hover:bg-accent/50';
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${tone}`} {...rest}>
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
  icon,
  withPill,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  withPill?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 inline-flex items-center gap-1.5 ring-1 ${
        active
          ? 'bg-primary text-primary-foreground ring-primary/30 shadow-sm shadow-primary/20'
          : 'bg-accent/25 text-muted-foreground ring-border/30 hover:bg-accent/50 hover:text-foreground'
      }`}
    >
      {withPill && <SourcePill name={withPill} size="sm" />}
      {icon}
      {label}
      {count !== undefined && (
        <span className={`tabular-nums ${active ? 'opacity-90' : 'opacity-60'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shrink-0 active:scale-95 inline-flex items-center gap-1.5 ${
        active
          ? 'bg-foreground text-background shadow-sm'
          : 'bg-transparent text-muted-foreground hover:bg-accent/40 border border-border/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
