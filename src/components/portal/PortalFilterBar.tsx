/**
 * PortalFilterBar — search field, view toggle, category segmented control.
 *
 * Layout decision: the view toggle rides on the *search* row, not on the
 * category row. Five Arabic category labels plus a 44px button do not fit
 * 390px, and a segmented control that scrolls its last label under the border
 * reads as a rendering bug rather than as an affordance. Giving the control the
 * full width lets the segments distribute evenly at every size.
 *
 * The active-category indicator is a single `layoutId` element that framer
 * moves between segments. That replaces the previous portal's manual
 * `offsetLeft` / `offsetWidth` measurement (which needed a resize listener, a
 * font-load timeout, and still mis-measured on first paint) and animates
 * transform instead of `left`/`width`, so it never triggers layout.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';

import { Grid3X3, Rows3, Search, X } from '@/lib/icons';
import { MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';

import { PORTAL_CATEGORIES, type PortalCategory } from './apps';
import type { PortalViewMode } from './usePortalPrefs';

export interface PortalFilterBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  category: PortalCategory | 'all';
  onCategoryChange: (c: PortalCategory | 'all') => void;
  view: PortalViewMode;
  onViewChange: (v: PortalViewMode) => void;
  /** Per-category result counts, used to dim segments with no matches. */
  counts: Record<string, number>;
  searchRef?: React.Ref<HTMLInputElement>;
}

function PortalFilterBarImpl({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  view,
  onViewChange,
  counts,
  searchRef,
}: PortalFilterBarProps) {
  const reduce = useReducedMotion();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="ابحث في التطبيقات والاختصارات…"
            aria-label="ابحث في التطبيقات"
            enterKeyHint="search"
            className="app-control h-11 w-full ps-10 pe-10 text-meta"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="مسح البحث"
              className="absolute top-1/2 end-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onViewChange(view === 'grid' ? 'list' : 'grid')}
          aria-label={view === 'grid' ? 'العرض كقائمة' : 'العرض كشبكة'}
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border',
            'text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {view === 'grid' ? (
            <Grid3X3 className="h-5 w-5" aria-hidden />
          ) : (
            <Rows3 className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      <div
        role="tablist"
        aria-label="تصنيفات التطبيقات"
        className="flex w-full items-center gap-1 rounded-md border border-border p-1"
      >
        {PORTAL_CATEGORIES.map((c) => {
          const active = c.key === category;
          const count = counts[c.key] ?? 0;
          const empty = count === 0;
          return (
            <button
              key={c.key}
              role="tab"
              type="button"
              aria-selected={active}
              disabled={empty && !active}
              onClick={() => onCategoryChange(c.key)}
              className={cn(
                'relative isolate min-w-0 flex-1 rounded-sm px-2 py-2 text-center text-mini font-semibold',
                'transition-colors duration-normal ease-out-expo sm:text-meta',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                empty && !active && 'opacity-40',
              )}
            >
              {active && (
                <motion.span
                  layoutId="portal-category-indicator"
                  // Painted before the label in DOM order, so the label sits on
                  // top without introducing an ad-hoc z-index.
                  className="absolute inset-0 rounded-sm bg-primary"
                  transition={reduce ? { duration: 0 } : MOTION.spring}
                  aria-hidden
                />
              )}
              <span className="relative">{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const PortalFilterBar = memo(PortalFilterBarImpl);
export default PortalFilterBar;
