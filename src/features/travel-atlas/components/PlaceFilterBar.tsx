import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ArrowDownWideNarrow, Check, Filter, Heart, Search, X } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { CATEGORY_GROUPS, MONTH_LABELS, VISIT_STATUS_META } from '../data/categories';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  type PlaceFilters,
  type PlaceSort,
} from '../lib/filtering';

interface PlaceFilterBarProps {
  filters: PlaceFilters;
  onChange: (filters: PlaceFilters) => void;
  /** Number of places currently matching, shown next to the field. */
  resultCount: number;
  className?: string;
}

const SORT_LABELS: Record<PlaceSort, string> = {
  recent: 'الأحدث إضافة',
  name: 'أبجديًا',
  rating: 'الأعلى تقييمًا',
  visited: 'آخر زيارة',
};

/**
 * Search plus the four filters that matter when an atlas grows past a screenful:
 * status, kind, favourites, and "good this month". Everything else is sorting.
 */
export default function PlaceFilterBar({
  filters,
  onChange,
  resultCount,
  className,
}: PlaceFilterBarProps) {
  const activeCount = activeFilterCount(filters);
  const patch = (next: Partial<PlaceFilters>) => onChange({ ...filters, ...next });

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={filters.query}
            onChange={(event) => patch({ query: event.target.value })}
            placeholder="ابحث في أماكنك…"
            className="ps-10 pe-10"
            aria-label="البحث في الأماكن"
          />
          {filters.query.length > 0 && (
            <button
              type="button"
              onClick={() => patch({ query: '' })}
              aria-label="إفراغ البحث"
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="app-icon-btn relative shrink-0 border border-border"
              aria-label="تصفية"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              {activeCount > 0 && (
                <span className="absolute -top-1 -end-1 grid h-4 min-w-4 place-items-center rounded-full bg-[hsl(var(--live))] px-1 font-mono text-micro tabular-nums text-background">
                  {activeCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 min-w-56 overflow-y-auto">
            <DropdownMenuLabel>الحالة</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => patch({ status: 'all' })} className="gap-2">
              <CheckSlot active={filters.status === 'all'} />
              كل الحالات
            </DropdownMenuItem>
            {VISIT_STATUS_META.map((status) => (
              <DropdownMenuItem
                key={status.value}
                onSelect={() => patch({ status: status.value })}
                className="gap-2"
              >
                <CheckSlot active={filters.status === status.value} />
                {status.label}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>النوع</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => patch({ group: 'all' })} className="gap-2">
              <CheckSlot active={filters.group === 'all'} />
              كل الأنواع
            </DropdownMenuItem>
            {CATEGORY_GROUPS.map((group) => (
              <DropdownMenuItem
                key={group.key}
                onSelect={() => patch({ group: group.key })}
                className="gap-2"
              >
                <CheckSlot active={filters.group === group.key} />
                {group.label}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>مناسب في شهر</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => patch({ month: null })} className="gap-2">
              <CheckSlot active={filters.month === null} />
              أي شهر
            </DropdownMenuItem>
            {MONTH_LABELS.map((label, index) => (
              <DropdownMenuItem
                key={label}
                onSelect={() => patch({ month: index + 1 })}
                className="gap-2"
              >
                <CheckSlot active={filters.month === index + 1} />
                {label}
              </DropdownMenuItem>
            ))}

            {activeCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() =>
                    onChange({ ...DEFAULT_FILTERS, query: filters.query, sort: filters.sort })
                  }
                >
                  إلغاء كل التصفية
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() => patch({ favoritesOnly: !filters.favoritesOnly })}
          aria-pressed={filters.favoritesOnly}
          aria-label="المفضّلة فقط"
          className={cn(
            'app-icon-btn shrink-0 border border-border',
            filters.favoritesOnly && 'text-[hsl(var(--live))]',
          )}
        >
          <Heart className="h-4 w-4" fill={filters.favoritesOnly ? 'currentColor' : undefined} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="app-icon-btn shrink-0 border border-border"
              aria-label="الترتيب"
            >
              <ArrowDownWideNarrow className="h-4 w-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuLabel>الترتيب</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(Object.keys(SORT_LABELS) as PlaceSort[]).map((sort) => (
              <DropdownMenuItem key={sort} onSelect={() => patch({ sort })} className="gap-2">
                <CheckSlot active={filters.sort === sort} />
                {SORT_LABELS[sort]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-micro text-muted-foreground" aria-live="polite">
        {resultCount === 0 ? 'لا نتائج' : `${resultCount} مكانًا`}
      </p>
    </div>
  );
}

function CheckSlot({ active }: { active: boolean }) {
  return (
    <span className="grid h-4 w-4 place-items-center">
      {active && <Check className="h-4 w-4" aria-hidden="true" />}
    </span>
  );
}
