/**
 * PortalSkeletons — loading placeholders for the launcher.
 *
 * Every skeleton mirrors the exact geometry of the real element it stands in
 * for (same heights, same gaps, same container queries), so hydration does not
 * shift the layout: only the shimmer disappears. Motion is a single
 * `animate-pulse`, disabled under `prefers-reduced-motion`, and no skeleton
 * animates a property other than opacity.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** One cell of the pulse bar: icon square + two text lines + trailing number. */
function PulseCellSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2">
      <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-20 max-w-full" />
        <Skeleton className="h-2.5 w-14 max-w-full" />
      </div>
      <Skeleton className="ms-auto h-3 w-9 shrink-0" />
    </div>
  );
}

export function AppTileSkeleton({ list = false }: { list?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-card border border-border/60 bg-muted/30',
        list ? 'flex items-center gap-3 p-3' : 'flex min-h-[132px] flex-col justify-between p-4',
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
    : 'grid grid-cols-1 gap-3 @[22rem]:grid-cols-2 @[40rem]:grid-cols-3 @[40rem]:gap-4 @[64rem]:grid-cols-4';

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

export default PortalRealmsSkeleton;
