import PageHeader from '@/components/PageHeader';
import { IconButton } from '@/components/ui/app-shell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Archive,
  Bell,
  CheckCheck,
  Compass,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings2,
  Type,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

/**
 * The one page header for the Reading list — G2 (editorial/reading).
 *
 * The title, count line and the action cluster are owned by the shared
 * <PageHeader variant="compact">, so this route gets the same h1, the same
 * 56px header height and the same sticky surface as every other page. The
 * filter rail is NOT part of this frame: it lives in <ListHeader> below, as a
 * quiet tool band, so folders/sources stop competing with the page title.
 *
 * Two-pane reader: the page header is intentionally not sticky there
 * (`sticky={false}`) and its back button is hidden. The article pane renders
 * its own sticky header with its own back affordance; two sticky headers would
 * collide (the page header sits on z-header, above the pane's z-sticky) and
 * bury the reader controls. This is the documented exception for the
 * full-bleed reader surface.
 */
export function ReadingPageHeader({
  articleCount,
  unreadCount,
  loading = false,
  online = true,
  showSearch,
  setShowSearch,
  refreshing,
  onRefresh,
  onManage,
  onDiscoverFeeds,
  onMarkAllRead,
  onOpenArchiveSearch,
  onOpenAlerts,
  onOpenReader,
  unseenAlerts,
  hideBack = false,
  sticky = true,
}: {
  articleCount: number;
  unreadCount: number;
  /** First paint: the count line is not a fact yet, so it states what is happening. */
  loading?: boolean;
  online?: boolean;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onManage: () => void;
  onDiscoverFeeds: () => void;
  onMarkAllRead: () => void;
  onOpenArchiveSearch: () => void;
  onOpenAlerts: () => void;
  onOpenReader: () => void;
  unseenAlerts: number;
  hideBack?: boolean;
  sticky?: boolean;
}) {
  return (
    <PageHeader
      variant="compact"
      sticky={sticky}
      title={'إطلاع'}
      // Counts are evidence, not decoration: never print "0 مقالة" while the
      // archive is still opening, and name the offline condition when it is
      // the reason the list is quiet.
      subtitle={
        loading && articleCount === 0
          ? 'جارٍ تحميل المقالات…'
          : !online
            ? `${articleCount} مقالة محفوظة · بدون اتصال`
            : `${articleCount} مقالة · ${unreadCount} غير مقروء`
      }
      hideBack={hideBack}
      // List view keeps the previous behaviour: back leaves Reading for the
      // portal. The sub-view state machine keeps its own back stack.
      backTo={hideBack ? undefined : '/'}
      right={
        <>
          <IconButton
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            aria-label={'بحث في القائمة'}
            aria-pressed={showSearch}
            title={'بحث في القائمة الحالية'}
            className={cn(showSearch && 'bg-primary/15 text-primary')}
          >
            <Search className="h-4 w-4" aria-hidden />
          </IconButton>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton type="button" aria-label={'المزيد'} className="relative">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />
                {unseenAlerts > 0 && (
                  <span
                    aria-hidden
                    className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card"
                  />
                )}
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl">
              <DropdownMenuLabel className="text-micro text-muted-foreground font-normal">
                {'إجراءات'}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={onRefresh}
                disabled={refreshing}
                className="rounded-lg gap-2.5"
              >
                <RefreshCw
                  className={cn('h-4 w-4 text-muted-foreground', refreshing && 'animate-spin text-primary')}
                  aria-hidden
                />
                <span>{refreshing ? 'جاري التحديث…' : 'تحديث الآن'}</span>
              </DropdownMenuItem>
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
                  <span className="text-micro font-semibold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground tabular-nums">
                    {unseenAlerts}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenReader} className="rounded-lg gap-2.5">
                <Type className="h-4 w-4 text-muted-foreground" />
                <span>{'قراءة رابط'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDiscoverFeeds} className="rounded-lg gap-2.5">
                <Compass className="h-4 w-4 text-primary" />
                <span>{'اكتشاف مصادر جديدة'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onManage} className="rounded-lg gap-2.5">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span>{'إدارة المصادر'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
