import type { CSSProperties, HTMLAttributes } from 'react';
import React from 'react';

import { cn } from '@/lib/utils';

/**
 * The one placeholder system.
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ RULES                                                                ║
 * ║                                                                      ║
 * ║ 1. A placeholder RESERVES the final layout box. If the real content   ║
 * ║    is a 44px-tall row, the placeholder is 44px tall — otherwise the   ║
 * ║    page reflows the moment data lands, which is exactly the shift we  ║
 * ║    are removing. Height/width come from the caller, or from one of    ║
 * ║    the composites below whose geometry mirrors the real component.    ║
 * ║ 2. Only OPACITY animates. `animate-pulse` is opacity-only, so the     ║
 * ║    breathing runs on the compositor and never triggers layout.        ║
 * ║ 3. Timing comes from the motion tokens, never a local duration.       ║
 * ║ 4. Placeholders are invisible to assistive tech and announce a busy   ║
 * ║    region once, via `aria-busy` on the group — not per line.          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

export type SkeletonVariant = 'block' | 'text' | 'circle' | 'pill';

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  block: 'rounded-md',
  text: 'rounded-sm',
  circle: 'rounded-full aspect-square',
  pill: 'rounded-full',
};

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  /** Reserved height, e.g. `44`, `'2.75rem'`. Required for anything not sized by className. */
  height?: number | string;
  /** Reserved width; defaults to filling the parent. */
  width?: number | string;
  /** Reserve a ratio box instead of a fixed height, e.g. `'16 / 9'`. */
  ratio?: string;
}

const size = (v: number | string | undefined) =>
  typeof v === 'number' ? `${v}px` : v;

export function Skeleton({
  className,
  variant = 'block',
  height,
  width,
  ratio,
  style,
  ...props
}: SkeletonProps) {
  const reserved: CSSProperties = {
    height: size(height),
    width: size(width),
    aspectRatio: ratio,
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      data-skeleton={variant}
      className={cn(
        'animate-pulse bg-muted/60 shrink-0',
        VARIANT_CLASS[variant],
        !height && !ratio && variant === 'text' && 'h-[0.85em]',
        className,
      )}
      style={reserved}
      {...props}
    />
  );
}

/**
 * Wrapper that marks a region as loading for assistive tech. Wrap composites in
 * this once — never put `role="status"` on every bar.
 */
export function SkeletonGroup({
  className,
  label = 'جارٍ التحميل',
  ...props
}: HTMLAttributes<HTMLDivElement> & { label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className} {...props} />
  );
}

/** N text lines at real line-height, last one short like real prose. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height="0.9em"
          width={i === lines - 1 ? '62%' : '100%'}
        />
      ))}
    </div>
  );
}

/** Avatar + two lines — the shape of every list row in the app. */
export function SkeletonRow({
  avatar = true,
  className,
  height = 64,
}: {
  avatar?: boolean;
  className?: string;
  height?: number;
}) {
  return (
    <div
      className={cn('flex items-center gap-3 px-1', className)}
      style={{ height: `${height}px` }}
    >
      {avatar && <Skeleton variant="circle" height={40} />}
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" height="0.9em" width="45%" />
        <Skeleton variant="text" height="0.8em" width="72%" />
      </div>
    </div>
  );
}

export function SkeletonList({
  rows = 5,
  avatar = true,
  rowHeight = 64,
  className,
}: {
  rows?: number;
  avatar?: boolean;
  rowHeight?: number;
  className?: string;
}) {
  return (
    <SkeletonGroup className={cn('divide-y divide-border/40', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} avatar={avatar} height={rowHeight} />
      ))}
    </SkeletonGroup>
  );
}

/** Card placeholder matching <AppCard> padding and radius. */
export function SkeletonCard({
  lines = 2,
  media,
  className,
  height,
}: {
  lines?: number;
  /** Reserve a media box on top, e.g. `'16 / 9'`. */
  media?: string;
  className?: string;
  height?: number | string;
}) {
  return (
    <div
      className={cn('rounded-xl border border-border/40 bg-card/40 p-4 space-y-3', className)}
      style={{ height: size(height) }}
    >
      {media && <Skeleton ratio={media} className="w-full" />}
      <Skeleton variant="text" height="1.1em" width="52%" />
      <SkeletonText lines={lines} />
    </div>
  );
}

/** Label + control — the unit that makes forms shift when it appears late. */
export function SkeletonField({
  className,
  controlHeight = 44,
}: {
  className?: string;
  controlHeight?: number;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton variant="text" height="0.8em" width="30%" />
      <Skeleton height={controlHeight} className="w-full rounded-lg" />
    </div>
  );
}

export function SkeletonForm({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <SkeletonGroup className={cn('space-y-4', className)}>
      {Array.from({ length: fields }, (_, i) => (
        <SkeletonField key={i} />
      ))}
    </SkeletonGroup>
  );
}

/** Full-route placeholder: header strip + hero card + rows. */
export function SkeletonPage({ className }: { className?: string }) {
  return (
    <SkeletonGroup className={cn('min-h-screen space-y-4 p-4', className)}>
      <Skeleton height={32} width={160} className="mx-auto rounded-lg" />
      <Skeleton height={96} className="w-full rounded-xl" />
      <SkeletonCard lines={2} />
      <SkeletonList rows={3} />
    </SkeletonGroup>
  );
}

/** Media placeholder that reserves a ratio box — never a bare `animate-pulse` div. */
export function SkeletonMedia({
  ratio = '16 / 9',
  className,
}: {
  ratio?: string;
  className?: string;
}) {
  return <Skeleton ratio={ratio} className={cn('w-full rounded-xl', className)} />;
}

export default Skeleton;
