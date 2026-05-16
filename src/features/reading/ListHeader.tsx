import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark, CheckCheck, ChevronLeft, Newspaper,
  RefreshCw, Search, Settings2, Wifi, X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { FeedSource, FilterTab } from './types';
import { SourcePill } from './SourcePill';

/**
 * Sticky page header for the list view: title, action icons, search
 * field (collapsible), filter chips. Kept stateless — all state lives
 * in the parent so it can be shared across views.
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
  filterTab,
  setFilterTab,
  sourceFilter,
  setSourceFilter,
  enabledFeeds,
  sourceCounts,
  articleCount,
  unreadCount,
  bookmarksCount,
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
  filterTab: FilterTab;
  setFilterTab: (t: FilterTab) => void;
  sourceFilter: string;
  setSourceFilter: (s: string) => void;
  enabledFeeds: FeedSource[];
  sourceCounts: Record<string, number>;
  articleCount: number;
  unreadCount: number;
  bookmarksCount: number;
}) {
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
            className="p-2.5 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
            aria-label={isAr ? 'بحث' : 'Search'}
          >
            <Search
              className={`h-4 w-4 ${showSearch ? 'text-primary' : 'text-muted-foreground'}`}
            />
          </button>
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
        {enabledFeeds.map((source) => (
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
