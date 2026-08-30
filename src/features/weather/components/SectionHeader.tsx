// ============================================================================
// SectionHeader — small component used to label a section of the page that
// doesn't have its own card chrome. Used for bento grids, list groups, and
// the area between major cards.
//
// Visual:
//   • Eyebrow line: 2px height, primary colour, gradient fade on both ends
//   • Title + optional Arabic subtitle on the right
//   • Right slot for actions like "see all"
// ============================================================================

import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  /** Eyebrow text — uppercase, tracked. */
  eyebrow?: string;
  /** Main title (Arabic). */
  title: string;
  /** Optional subtitle in smaller text below. */
  subtitle?: string;
  /** Right-aligned slot for actions. */
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <header className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span aria-hidden className="inline-block w-6 h-px bg-gradient-to-r from-primary to-transparent" />
          {eyebrow && (
            <span className="text-[0.625rem] font-bold tracking-[0.22em] uppercase text-primary">
              {eyebrow}
            </span>
          )}
        </div>
        <h3 className="text-lead font-bold text-foreground leading-tight">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-mini text-foreground/65 font-medium leading-snug">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}