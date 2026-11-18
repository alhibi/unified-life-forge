import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { IconButton } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bookmark,
  FolderOpen,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from '@/lib/icons';

import { categoryLabelAr } from './feeds';
import { getCustomFolders, storeCustomFolders } from './foldersStorage';
import type { ListPrefs } from './listPrefs';
import { ReadingPrefsToolbar } from './ReadingPrefsToolbar';
import { SourcePill } from './SourcePill';
import type { FeedSource, FilterTab } from './types';

/**
 * Quiet tool band under the page header — not a header.
 *
 * The page title, count line and actions belong to <ReadingPageHeader>
 * (shared <PageHeader>). Everything here is a control on the list itself:
 * the collapsible search field, refresh/prefetch progress, the folder +
 * source filter rail, the display-preferences popover and the new-folder
 * input. Keeping them below the sticky header is what stops filters from
 * competing with the page title.
 *
 * Two filter rows borrowed from CapyReader's information hierarchy:
 *  1. **Categories** (folders): All / News / Tech / … grouped by the
 *     category each feed was added under.
 *  2. **Sources**: the actual feeds inside the selected category.
 *
 * Category *identity* stays the persisted English id (it is what
 * `FeedSource.category` stores and what filtering compares); only the visible
 * chip label is Arabic, via `categoryLabelAr`.
 */
export function ListHeader({
  showSearch,
  searchQuery,
  setSearchQuery,
  syncProgress,
  prefetchProgress,
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
  showSearch: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
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
    const updated = customFolders.filter((f) => f !== folder);
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
    const allKnown = Array.from(new Set([...customFolders, ...ids]));
    // `id` stays the filter identity; `label` is display-only.
    return allKnown.map((id) => ({ id, label: categoryLabelAr(id) }));
  }, [enabledFeeds, customFolders]);

  // Filter source chips by active category so the row stays scannable.
  const visibleSources = useMemo(() => {
    if (categoryFilter === 'all') return enabledFeeds;
    return enabledFeeds.filter((f) => (f.category || 'other') === categoryFilter);
  }, [enabledFeeds, categoryFilter]);

  const showCategoryRow = populatedCategories.length > 0;
  const canDeleteActiveFolder = customFolders.includes(categoryFilter);

  return (
    <div className="pt-1 pb-2 app-divider-b">
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative mb-2 overflow-hidden"
          >
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={'بحث في المقالات...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 h-11 text-meta rounded-2xl bg-background/60 border-border/50"
              aria-label={'بحث في المقالات'}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-1 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:text-foreground app-focus-ring"
                aria-label={'مسح البحث'}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* One hairline progress line for both refresh and prefetch — a
          quiet caption plus a 2px rail, instead of two competing panels
          that used to steal a third of the header. Animates scaleX only. */}
      <ProgressLine
        active={Boolean(syncProgress?.active)}
        current={syncProgress?.current ?? 0}
        total={syncProgress?.total ?? 0}
        label={syncProgress?.currentFeed || 'تحديث المصادر'}
        spinning
      />
      <ProgressLine
        active={Boolean(prefetchProgress?.active) && !syncProgress?.active}
        current={prefetchProgress?.current ?? 0}
        total={prefetchProgress?.total ?? 0}
        label={prefetchProgress?.currentTitle || 'تجهيز المقالات للقراءة'}
      />

      {/* One single scrollable filter rail: state chips → folders →
          sources. Merging the two previous rows removes the clipped,
          stacked look while keeping every control reachable. The display
          preferences sit outside the rail so they never scroll away. */}
      <div className="flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
          <Chip
            active={filterTab === 'all' && sourceFilter === 'all' && categoryFilter === 'all'}
            onClick={() => {
              setFilterTab('all');
              setSourceFilter('all');
              setCategoryFilter('all');
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

          {showCategoryRow && (
            <>
              <Divider />
              {populatedCategories.map((c) => (
                <CategoryChip
                  key={c.id}
                  active={categoryFilter === c.id}
                  onClick={() => {
                    setCategoryFilter(c.id === categoryFilter ? 'all' : c.id);
                    setSourceFilter('all');
                  }}
                  label={c.label}
                  icon={<FolderOpen className="h-3 w-3" />}
                />
              ))}
              <button
                type="button"
                onClick={() => setShowFolderInput(!showFolderInput)}
                className="inline-flex min-h-[var(--ui-touch-min)] min-w-[var(--ui-touch-min)] shrink-0 items-center justify-center rounded-full text-primary bg-primary/10 ring-1 ring-primary/20 hover:bg-primary/20 transition-motion app-focus-ring"
                aria-label={'مجلد جديد'}
                aria-expanded={showFolderInput}
                title={'مجلد جديد'}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </button>
            </>
          )}

          {visibleSources.length > 0 && <Divider />}
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

        {canDeleteActiveFolder && (
          <IconButton
            type="button"
            onClick={() => handleDeleteFolder(categoryFilter)}
            aria-label={'حذف المجلد'}
            title={'حذف المجلد المحدد'}
            className="shrink-0 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </IconButton>
        )}
        <ReadingPrefsToolbar prefs={listPrefs} onChange={onListPrefsChange} />
      </div>

      <AnimatePresence>
        {showFolderInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 overflow-hidden mt-2"
          >
            <Input
              placeholder={'اسم المجلد الجديد...'}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              aria-label={'اسم المجلد الجديد'}
              className="text-mini"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddFolder();
              }}
            />
            <button
              type="button"
              onClick={handleAddFolder}
              className="min-h-[var(--ui-touch-min)] shrink-0 rounded-button bg-primary px-4 text-mini font-bold text-primary-foreground hover:opacity-90 transition-opacity app-focus-ring"
            >
              {'إضافة'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Hairline separator between segments of the filter rail. */
function Divider() {
  return <div aria-hidden className="w-px h-4 bg-border/50 shrink-0 mx-1" />;
}

/**
 * Quiet one-line progress indicator: caption + 2px rail. Reserves its
 * own height only while active and animates `scaleX` so nothing in the
 * header re-lays-out mid-refresh.
 */
function ProgressLine({
  active,
  current,
  total,
  label,
  spinning,
}: {
  active: boolean;
  current: number;
  total: number;
  label: string;
  spinning?: boolean;
}) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="mb-2.5 space-y-1"
        >
          <div className="flex items-center justify-between gap-2 text-micro text-muted-foreground-subtle">
            <span className="flex items-center gap-1.5 min-w-0" dir="auto">
              {spinning && <RefreshCw className="h-3 w-3 animate-spin text-primary shrink-0" />}
              <span className="truncate">{label}</span>
            </span>
            <span className="tabular-nums shrink-0">{`${current}/${total}`}</span>
          </div>
          <div className="h-0.5 w-full rounded-full bg-border/50 overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: ratio }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ transformOrigin: 'right' }}
              className="h-full w-full rounded-full bg-primary"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
    <Button
      type="button"
      variant="ghost"
      size="sm"
      activation="click"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[var(--ui-touch-min)] px-3 rounded-full text-mini font-medium transition-motion shrink-0 inline-flex items-center gap-1.5 ring-1 ${
        active
          ? 'bg-primary text-primary-foreground ring-primary/30'
          : 'bg-accent/25 text-muted-foreground ring-border/30 hover:bg-accent/50 hover:text-foreground'
      }`}
    >
      {withPill && <SourcePill name={withPill} size="sm" />}
      {icon}
      {label}
      {count !== undefined && (
        <span className={`tabular-nums ${active ? 'opacity-90' : 'opacity-60'}`}>{count}</span>
      )}
    </Button>
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
    <Button
      type="button"
      variant="ghost"
      size="sm"
      activation="click"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[var(--ui-touch-min)] px-3 rounded-full text-micro font-semibold transition-motion shrink-0 inline-flex items-center gap-1.5 ${
        active
          ? 'bg-foreground text-background'
          : 'bg-transparent text-muted-foreground hover:bg-accent/40 border border-border/50'
      }`}
    >
      {icon}
      {label}
    </Button>
  );
}
