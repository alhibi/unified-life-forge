/**
 * PortalFilterBar — view toggle plus the category segmented control.
 *
 * The search field was removed: fourteen tiles are scannable, so the field only
 * added chrome above the grid. The view toggle keeps its own row so the five
 * Arabic category labels get the full width — a segmented control that scrolls
 * its last label under the border reads as a rendering bug, not an affordance.
 *
 * The active-category indicator is a single `layoutId` element that framer
 * moves between segments. That replaces the previous portal's manual
 * `offsetLeft` / `offsetWidth` measurement (which needed a resize listener, a
 * font-load timeout, and still mis-measured on first paint) and animates
 * transform instead of `left`/`width`, so it never triggers layout.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';

import { Grid3X3, Rows3 } from '@/lib/icons';
import { MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';

import { PORTAL_CATEGORIES, type PortalCategory } from './apps';
import type { PortalViewMode } from './usePortalPrefs';

export interface PortalFilterBarProps {
  category: PortalCategory | 'all';
  onCategoryChange: (c: PortalCategory | 'all') => void;
  view: PortalViewMode;
  onViewChange: (v: PortalViewMode) => void;
  /** Per-category result counts, used to dim segments with no matches. */
  counts: Record<string, number>;
}

function PortalFilterBarImpl({
  category,
  onCategoryChange,
  view,
  onViewChange,
  counts,
}: PortalFilterBarProps) {
  const reduce = useReducedMotion();

  return (
    <div className="flex items-end gap-2">
      <div
        role="tablist"
        aria-label="تصنيفات التطبيقات"
        className="flex min-w-0 flex-1 items-end gap-1 border-b border-border/60"
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
                'relative isolate min-w-0 flex-1 px-2 pb-2.5 pt-1.5 text-center text-mini font-semibold',
                'transition-colors duration-normal ease-out-expo sm:text-meta',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                empty && !active && 'opacity-40',
              )}
            >
              {active && (
                <motion.span
                  layoutId="portal-category-indicator"
                  // A copper underline instead of a filled pill: the tab rail
                  // now reads as a drafted baseline, and the moving element is
                  // 2px tall so it never fights the label for contrast.
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary"
                  transition={reduce ? { duration: 0 } : MOTION.spring}
                  aria-hidden
                />
              )}
              <span className="relative">{c.label}</span>
            </button>
          );
        })}
      </div>

        <button
          type="button"
          onClick={() => onViewChange(view === 'grid' ? 'list' : 'grid')}
          aria-label={view === 'grid' ? 'العرض كقائمة' : 'العرض كشبكة'}
          className={cn(
            'mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border',
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
  );
}

export const PortalFilterBar = memo(PortalFilterBarImpl);
export default PortalFilterBar;
