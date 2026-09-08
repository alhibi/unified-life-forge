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

/**
 * PortalTodayWidgetsSkeleton — the shape of the prayer + weather widgets.
 *
 * Not two grey rectangles: the placeholder carries the same heading row,
 * the same hero figure, the same five prayer cells and the same eight
 * forecast columns as the real widgets, at the same measured heights
 * (21rem / 16.5rem at phone width). Settling into the real content is a
 * cross-fade, never a re-layout.
 */
export function PortalTodayWidgetsSkeleton() {
  return (
    <SkeletonGroup className="space-y-3" label="جارٍ تحميل ودجات اليوم">
      {/* Prayer times */}
      <div className="min-h-[21rem] space-y-4 rounded-3xl border border-border/60 bg-muted/20 p-4 sm:min-h-[19rem]">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton height={12} width={72} variant="text" />
            <Skeleton height={10} width={110} variant="text" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        {/* Next-prayer hero: big time + label */}
        <div className="space-y-2">
          <Skeleton height={40} width={148} />
          <Skeleton height={10} width={96} variant="text" />
        </div>
        <Skeleton height={6} className="w-full rounded-full" />
        {/* Five prayer cells */}
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
        {/* Four metric cells */}
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-1.5 rounded-xl border border-border/50 p-2">
              <Skeleton height={9} width="70%" variant="text" />
              <Skeleton height={11} width="55%" variant="text" />
            </div>
          ))}
        </div>
        {/* Eight-hour strip */}
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
    </SkeletonGroup>
  );
}

export default PortalRealmsSkeleton;
