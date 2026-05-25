import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive, Bell, Bookmark, CheckCheck, ChevronLeft, FolderOpen, Newspaper,
  RefreshCw, Search, Settings2, Type, Wifi, X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { FeedSource, FilterTab } from './types';
import type { ListPrefs } from './listPrefs';
import { CATEGORIES } from './feeds';
import { SourcePill } from './SourcePill';
import { ReadingPrefsToolbar } from './ReadingPrefsToolbar';

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
  isAr,
  onBack,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  refreshing,
  onRefresh,
  onManage,
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
  isAr: boolean;
  onBack: () => void;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onManage: () => void;
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
  // Build the set of *populated* categories from the user's enabled
  // feeds. We never show a chip for a category nobody is subscribed
  // to (e.g. "Sports" if you have no sports feeds).
  const populatedCategories = useMemo(() => {
    const ids = new Set<string>();
    for (const f of enabledFeeds) ids.add(f.category || 'other');
    return CATEGORIES.filter((c) => ids.has(c.id));
  }, [enabledFeeds]);

  // Filter source chips by active category so the row stays scannable.
  const visibleSources = useMemo(() => {
    if (categoryFilter === 'all') return enabledFeeds;
    return enabledFeeds.filter((f) => (f.category || 'other') === categoryFilter);
  }, [enabledFeeds, categoryFilter]);

  const showCategoryRow = populatedCategories.length > 1;

  return (
    <div className="px-4 py-3 border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
            aria-label={isAr ? 'رجوع' : 'Back'}
          >
            <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
          </button>
          <h3 className="text-lg font-bold flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Newspaper className="h-4 w-4 text-primary" />
            </span>
            {isAr ? 'إطلاع' : 'Reading'}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2.5 rounded-xl active:scale-95 transition-all ${
              showSearch
                ? 'bg-primary/15 text-primary'
                : 'hover:bg-accent/50 text-muted-foreground'
            }`}
            aria-label={isAr ? 'بحث في القائمة' : 'Filter list'}
            title={isAr ? 'بحث في القائمة الحالية' : 'Filter the current list'}
            aria-pressed={showSearch}
          >
            <Search className={`h-4 w-4 ${showSearch ? 'text-primary' : ''}`} />
          </button>
          <div className="w-px h-5 bg-border/50 mx-0.5" />
          <button
            type="button"
            onClick={onOpenArchiveSearch}
            className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
            aria-label={isAr ? 'بحث الأرشيف' : 'Search archive'}
            title={isAr ? 'بحث الأرشيف الكامل' : 'Search full archive'}
          >
            <Archive className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={onOpenAlerts}
            className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all relative"
            aria-label={isAr ? 'التنبيهات' : 'Keyword alerts'}
            title={isAr ? 'تنبيهات الكلمات' : 'Keyword alerts'}
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            {unseenAlerts > 0 && (
              <span className="absolute top-1 end-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={onOpenReader}
            className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
            aria-label={isAr ? 'قراءة رابط' : 'Reader view'}
            title={isAr ? 'قراءة رابط من الويب' : 'Read a web link'}
          >
            <Type className="h-4 w-4 text-muted-foreground" />
          </button>
          <ReadingPrefsToolbar
            isAr={isAr}
            prefs={listPrefs}
            onChange={onListPrefsChange}
          />
          <div className="w-px h-5 bg-border/50 mx-0.5" />
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
              aria-label={isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}
              title={isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}
            >
              <CheckCheck className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all relative"
            aria-label={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw
              className={`h-4 w-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing && (
              <Wifi className="h-2.5 w-2.5 text-primary absolute top-1 end-1 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={onManage}
            className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
            aria-label={isAr ? 'إدارة المصادر' : 'Manage feeds'}
          >
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative mb-2.5 overflow-hidden"
          >
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isAr ? 'بحث في المقالات...' : 'Search articles...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 h-10 text-sm rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-3 top-1/2 -translate-y-1/2"
                aria-label={isAr ? 'مسح' : 'Clear'}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category folder row (only when ≥ 2 distinct categories) */}
      {showCategoryRow && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-2">
          <CategoryChip
            active={categoryFilter === 'all'}
            onClick={() => {
              setCategoryFilter('all');
              setSourceFilter('all');
            }}
            label={isAr ? 'كل الأقسام' : 'All folders'}
            icon={<FolderOpen className="h-3 w-3" />}
          />
          {populatedCategories.map((c) => (
            <CategoryChip
              key={c.id}
              active={categoryFilter === c.id}
              onClick={() => {
                setCategoryFilter(c.id === categoryFilter ? 'all' : c.id);
                // Clear source when switching folders
                setSourceFilter('all');
              }}
              label={isAr ? c.ar : c.en}
            />
          ))}
        </div>
      )}

      {/* Filter / source chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <Chip
          active={filterTab === 'all' && sourceFilter === 'all'}
          onClick={() => {
            setFilterTab('all');
            setSourceFilter('all');
          }}
          label={isAr ? 'الكل' : 'All'}
          count={articleCount}
        />
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
        <div className="w-px h-4 bg-border/40 shrink-0" />
        <Chip
          active={filterTab === 'unread'}
          onClick={() => setFilterTab('unread')}
          label={isAr ? 'غير مقروء' : 'Unread'}
          count={unreadCount}
        />
        <Chip
          active={filterTab === 'bookmarks'}
          onClick={() => setFilterTab('bookmarks')}
          icon={<Bookmark className="h-3 w-3 inline me-1" />}
          label={isAr ? 'المحفوظات' : 'Saved'}
          count={bookmarksCount > 0 ? bookmarksCount : undefined}
        />
      </div>
    </div>
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
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 inline-flex items-center gap-1.5 ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'
      }`}
    >
      {withPill && <SourcePill name={withPill} size="sm" />}
      {icon}
      {label}
      {count !== undefined && (
        <span className={`opacity-${active ? '85' : '70'} tabular-nums`}>
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
      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 active:scale-95 inline-flex items-center gap-1.5 ${
        active
          ? 'bg-foreground text-background'
          : 'bg-transparent text-muted-foreground hover:bg-accent/40 border border-border/40'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
