import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive, Bell, Bookmark, CheckCheck, ChevronLeft, Compass, FolderOpen, MoreHorizontal,
  Newspaper, RefreshCw, Search, Settings2, Type, Wifi, X,
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
  isAr: boolean;
  onBack: () => void;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  refreshing: boolean;
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
    <div
      className="px-4 pt-3.5 pb-2.5 border-b border-border/40 sticky top-0 z-10 bg-card/85 backdrop-blur-xl"
      style={{
        backgroundImage:
          'linear-gradient(180deg, hsl(var(--primary) / 0.04) 0%, transparent 100%)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ms-1 rounded-xl hover:bg-accent/50 active:scale-95 transition-all shrink-0"
            aria-label={isAr ? 'رجوع' : 'Back'}
          >
            <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
              <Newspaper className="h-4 w-4 text-primary" />
            </span>
            <div className="flex flex-col leading-tight min-w-0">
              <h3 className="text-[17px] font-bold truncate">
                {isAr ? 'إطلاع' : 'Reading'}
              </h3>
              <span className="text-[10.5px] text-muted-foreground/80 tabular-nums truncate">
                {isAr
                  ? `${articleCount} مقالة · ${unreadCount} غير مقروء`
                  : `${articleCount} articles · ${unreadCount} unread`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <IconBtn
            onClick={() => setShowSearch(!showSearch)}
            active={showSearch}
            aria-label={isAr ? 'بحث في القائمة' : 'Filter list'}
            title={isAr ? 'بحث في القائمة الحالية' : 'Filter the current list'}
          >
            <Search className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            onClick={onRefresh}
            disabled={refreshing}
            aria-label={isAr ? 'تحديث' : 'Refresh'}
            title={isAr ? 'تحديث الآن' : 'Refresh now'}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
          </IconBtn>
          <IconBtn
            onClick={onDiscoverFeeds}
            accent
            aria-label={isAr ? 'اكتشاف مصادر' : 'Discover feeds'}
            title={isAr ? 'اكتشاف وإضافة مصادر جديدة' : 'Discover & add feeds'}
          >
            <Compass className="h-4 w-4" />
          </IconBtn>
          <ReadingPrefsToolbar
            isAr={isAr}
            prefs={listPrefs}
            onChange={onListPrefsChange}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all relative"
                aria-label={isAr ? 'المزيد' : 'More actions'}
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                {unseenAlerts > 0 && (
                  <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
                {isAr ? 'إجراءات' : 'Actions'}
              </DropdownMenuLabel>
              {unreadCount > 0 && (
                <DropdownMenuItem onClick={onMarkAllRead} className="rounded-lg gap-2.5">
                  <CheckCheck className="h-4 w-4 text-muted-foreground" />
                  <span>{isAr ? 'تحديد الكل كمقروء' : 'Mark all as read'}</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onOpenArchiveSearch} className="rounded-lg gap-2.5">
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span>{isAr ? 'بحث الأرشيف' : 'Search archive'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenAlerts} className="rounded-lg gap-2.5">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{isAr ? 'تنبيهات الكلمات' : 'Keyword alerts'}</span>
                {unseenAlerts > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground tabular-nums">
                    {unseenAlerts}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenReader} className="rounded-lg gap-2.5">
                <Type className="h-4 w-4 text-muted-foreground" />
                <span>{isAr ? 'قراءة رابط' : 'Reader view'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onManage} className="rounded-lg gap-2.5">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span>{isAr ? 'إدارة المصادر' : 'Manage feeds'}</span>
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
              placeholder={isAr ? 'بحث في المقالات...' : 'Search articles...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 h-11 text-[15px] rounded-2xl bg-background/60 border-border/50"
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
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-2.5 -mx-1 px-1">
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
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
        <Chip
          active={filterTab === 'all' && sourceFilter === 'all'}
          onClick={() => {
            setFilterTab('all');
            setSourceFilter('all');
          }}
          label={isAr ? 'الكل' : 'All'}
          count={articleCount}
        />
        <Chip
          active={filterTab === 'unread'}
          onClick={() => setFilterTab(filterTab === 'unread' ? 'all' : 'unread')}
          label={isAr ? 'غير مقروء' : 'Unread'}
          count={unreadCount}
        />
        <Chip
          active={filterTab === 'bookmarks'}
          onClick={() => setFilterTab(filterTab === 'bookmarks' ? 'all' : 'bookmarks')}
          icon={<Bookmark className="h-3 w-3 inline" />}
          label={isAr ? 'المحفوظات' : 'Saved'}
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
