/**
 * PortalSkeletons — loading placeholders for the launcher.
 *
 * Every skeleton mirrors the exact geometry of the real element it stands in
 * for (same heights, same gaps, same container queries), so hydration does not
 * shift the layout: only the shimmer disappears. Motion is a single
 * `animate-pulse`, disabled under `prefers-reduced-motion`, and no skeleton
 * animates a property other than opacity.
 */
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function AppTileSkeleton({ list = false }: { list?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-card border border-border/60 bg-muted/30',
        list ? 'flex items-center gap-3 p-3' : 'portal-widget-cell flex min-h-44 flex-col justify-between p-5',
      )}
      aria-hidden
    >
      <div className={cn('flex w-full', list ? 'items-center gap-3' : 'flex-col gap-3')}>
        <Skeleton className={cn('shrink-0 rounded-xl', list ? 'h-10 w-10' : 'h-11 w-11')} />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-24 max-w-full" />
          <Skeleton className="h-2.5 w-32 max-w-full" />
          {!list && <Skeleton className="h-2 w-16" />}
        </div>
      </div>
    </div>
  );
}

/**
 * Stands in for CelestialRealmsLayout: two realm headers with their tiles,
 * enough to fill the first viewport without pretending to know the real count.
 */
export function PortalRealmsSkeleton({ list = false }: { list?: boolean }) {
  const gridClass = list
    ? 'grid grid-cols-1 gap-2'
    : 'portal-widget-grid grid grid-cols-2 gap-3 @[40rem]:grid-cols-3 @[40rem]:gap-4 @[64rem]:grid-cols-4';

  return (
    <div className="@container space-y-8" role="status" aria-label="جارٍ تحميل التطبيقات">
      {[0, 1].map((realm) => (
        <section key={realm} className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-40" />
            </div>
          </div>
          <div className={gridClass}>
            {Array.from({ length: list ? 3 : 4 }, (_, i) => (
              <AppTileSkeleton key={i} list={list} />
            ))}
          </div>
        </section>
      ))}
      <span className="sr-only">جارٍ التحميل…</span>
    </div>
  );
}

/**
 * PortalTodayWidgetsSkeleton — the shape of the today console.
 *
 * Mirrors the real three-zone grid (prayer · weather · day tools) so the
 * launcher below never jumps when the lazy console resolves. Placeholders are
 * the same geometry at every breakpoint, opacity-only, hidden from AT.
 */
export function PortalTodayWidgetsSkeleton() {
  return (
    <SkeletonGroup
      className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_clamp(17rem,23vw,20rem)_clamp(15rem,21vw,18rem)] lg:gap-6"
      label="جارٍ تحميل ودجات اليوم"
    >
      {/* Prayer */}
      <div className="min-h-[19rem] space-y-4 rounded-3xl border border-border/60 bg-muted/20 p-4 md:col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton height={12} width={72} variant="text" />
            <Skeleton height={10} width={110} variant="text" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton height={40} width={148} />
          <Skeleton height={10} width={96} variant="text" />
        </div>
        <Skeleton height={6} className="w-full rounded-full" />
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border/50 p-2">
              <Skeleton height={9} width="80%" variant="text" />
              <Skeleton height={12} width="90%" variant="text" />
            </div>
          ))}
        </div>
      </div>

      {/* Weather */}
      <div className="min-h-[16.5rem] space-y-4 rounded-3xl border border-border/60 bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton height={36} width={92} />
            <Skeleton height={10} width={120} variant="text" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-1.5 rounded-xl border border-border/50 p-2">
              <Skeleton height={9} width="70%" variant="text" />
              <Skeleton height={11} width="55%" variant="text" />
            </div>
          ))}
        </div>
        <div className="flex items-end justify-between gap-1.5">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <Skeleton height={9} width={22} variant="text" />
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton height={9} width={18} variant="text" />
            </div>
          ))}
        </div>
      </div>

      {/* Day tools */}
      <div className="space-y-3">
        <Skeleton height={12} width={84} variant="text" />
        <div className="space-y-2 rounded-card border border-border/60 bg-muted/20 p-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-1 py-2">
              <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton height={11} width={96} variant="text" />
                <Skeleton height={9} width={128} variant="text" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonGroup>
  );
}

export default PortalRealmsSkeleton;
