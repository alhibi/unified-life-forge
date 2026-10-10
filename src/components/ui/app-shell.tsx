import * as React from 'react';

import { ChevronLeft } from '@/lib/icons';
import { cn } from '@/lib/utils';

/**
 * UNIFIED DESIGN PRIMITIVES — single source of truth for layout chrome.
 *
 * Every full-screen route should be wrapped in <PageShell> and use
 * <AppCard> for every visible "card" surface. This guarantees identical
 * background, radius, padding, border, and pressable physics
 * across the entire app, regardless of which screen the user is on.
 *
 * Do NOT add bespoke bg-card / rounded-* / border-border combos in
 * pages — compose from these primitives instead.
 *
 * The row family (AppList / AppRow / IconChip / StatGrid / Stat) was added
 * by the system-unification pass: lists used to be either five separate
 * hairline cards holding one row each, or a bespoke `divide-y` card with
 * hand-written padding per screen. The list is now the surface and the row
 * is the unit — one chrome, one divider tone, one press language, one
 * geometry, everywhere.
 */

type DivProps = React.HTMLAttributes<HTMLDivElement>;

interface PageShellProps extends DivProps {
  /** Skip the default 56px top padding (use when the page has its own sticky header). */
  flush?: boolean;
  /** Wrap children in the canonical max-w-lg centered column. Default true. */
  centered?: boolean;
}

/** Canonical page background + safe-area aware padding + centered column. */
export function PageShell({
  flush,
  centered = true,
  className,
  children,
  ...rest
}: PageShellProps) {
  return (
    <div
      data-ui-surface="page"
      className={cn('page-shell relative overflow-hidden', flush && 'page-shell-flush', className)}
      {...rest}
    >
      {centered ? (
        <div className="page-shell-inner app-stack relative">{children}</div>
      ) : (
        <div className="relative">{children}</div>
      )}
    </div>
  );
}

interface AppCardProps extends DivProps {
  /** Coordinated coloured widget body; omitted for reading/form surfaces. */
  tone?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Tighter padding (p-3) — use for list rows. */
  compact?: boolean;
  /** No inset chrome — for nested cards inside another AppCard. */
  flat?: boolean;
  /** Adds spring press feedback. Use when the card is a button. */
  pressable?: boolean;
  /** Render as a different element (button, a, section…). */
  as?: keyof React.JSX.IntrinsicElements;
}

type AppCardElementProps = DivProps & {
  ref?: React.ForwardedRef<HTMLDivElement>;
  'data-ui-surface'?: string;
};

/** Canonical card surface — replaces every bespoke bg-card/rounded-2xl/border combo. */
export const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(
  ({ compact, flat, pressable, tone, as = 'div', className, ...rest }, ref) => {
    const Comp = as as unknown as React.ComponentType<AppCardElementProps>;
    return (
      <Comp
        ref={ref}
        data-ui-surface="card"
        data-tile-tone={tone}
        className={cn(
          'app-card',
          tone !== undefined && 'rich-widget',
          compact && 'app-card-compact',
          flat && 'app-card-flat',
          pressable && 'app-card-pressable',
          className,
        )}
        {...rest}
      />
    );
  },
);
AppCard.displayName = 'AppCard';

/** The one grouped list surface. Rows stack inside it; the container owns the chrome. */
export function AppList({
  compact,
  className,
  children,
  ...rest
}: DivProps & { compact?: boolean }) {
  return (
    <div
      data-ui-surface="list"
      className={cn('app-list', compact && 'app-list-compact', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

type AppRowOwnProps = {
  /** Leading unit — an <IconChip> or a bare glyph. */
  leading?: React.ReactNode;
  /** The row label. */
  title: React.ReactNode;
  /** Optional supporting line under the title. */
  subtitle?: React.ReactNode;
  /** Trailing value (rendered muted, tabular). */
  value?: React.ReactNode;
  /** Show the forward chevron at the end of the row. */
  chevron?: boolean;
  /** Destructive row (logout, delete…). */
  tone?: 'default' | 'danger';
  /** Element to render. Defaults to <button type="button">. */
  as?: 'button' | 'a' | 'div';
};

export type AppRowProps = AppRowOwnProps &
  Omit<React.HTMLAttributes<HTMLElement>, 'title'> &
  Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'type'> &
  Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'>;

/**
 * One row of a grouped list: [leading] title/subtitle … value [chevron].
 *
 * Rows are `<button>`s by default, so the single global press rule owns the
 * tactile feedback; hover/pressed also move on the published interactive
 * ladder. There is no per-row scale or shadow — geometry is fixed here.
 */
export const AppRow = React.forwardRef<HTMLElement, AppRowProps>(function AppRow(
  {
    leading,
    title,
    subtitle,
    value,
    chevron,
    tone = 'default',
    as = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  const interactive = as === 'div' ? Boolean(rest.onClick) : !rest.disabled;
  const classes = cn(
    'app-row',
    interactive && 'app-row-interactive',
    tone === 'danger' && 'app-row-danger',
    className,
  );
  const inner = (
    <>
      {leading != null && <span className="inline-flex shrink-0">{leading}</span>}
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className="app-row-title w-full truncate text-body font-medium">{title}</span>
        {subtitle != null && (
          <span className="app-row-sub w-full truncate text-mini text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      {value != null && (
        <span className="app-row-value shrink-0 text-mini text-muted-foreground tabular-nums">
          {value}
        </span>
      )}
      {chevron && (
        <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground-subtle" aria-hidden />
      )}
      {children}
    </>
  );

  if (as === 'a') {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        data-ui-surface="row"
        className={classes}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {inner}
      </a>
    );
  }
  if (as === 'div') {
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        data-ui-surface="row"
        className={classes}
        {...rest}
      >
        {inner}
      </div>
    );
  }
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      data-ui-surface="row"
      className={classes}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {inner}
    </button>
  );
});
AppRow.displayName = 'AppRow';

interface IconChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** sm = 32 · md = 44 · xl = 56. */
  size?: 'sm' | 'md' | 'xl';
  tone?: 'accent' | 'plain' | 'danger' | 'success';
}

/**
 * The leading icon plate used by rows, headers and empty states.
 * Renders on the `.row-icon` family (the name a dozen screens already use).
 */
export function IconChip({
  size = 'md',
  tone = 'accent',
  className,
  children,
  ...rest
}: IconChipProps) {
  return (
    <span
      data-ui-surface="chip"
      className={cn(
        'row-icon',
        size === 'md' && 'row-icon-md',
        size === 'xl' && 'row-icon-xl',
        tone === 'plain' && 'row-icon-plain',
        tone === 'danger' && 'row-icon-danger',
        tone === 'success' && 'row-icon-success',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/** Metric cluster used by every stats strip (games, journal, diwan, mihrab…). */
export function StatGrid({
  cols = 3,
  className,
  children,
  ...rest
}: DivProps & { cols?: 2 | 3 | 4 }) {
  return (
    <div
      data-ui-surface="stats"
      className={cn('app-stat-grid', className)}
      style={{ '--stat-cols': cols } as React.CSSProperties}
      {...rest}
    >
      {children}
    </div>
  );
}

/** One metric: big tabular value over a quiet label. */
export function Stat({
  value,
  label,
  className,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('app-stat', className)}>
      <span className="app-stat-value">{value}</span>
      <span className="app-stat-label">{label}</span>
    </div>
  );
}

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

/** Canonical 44×44 circular, raised icon button used in headers and toolbars. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, type = 'button', ...rest }, ref) => (
    <button ref={ref} type={type} className={cn('app-icon-btn', className)} {...rest} />
  ),
);
IconButton.displayName = 'IconButton';

interface SectionProps extends DivProps {
  /** Optional uppercase tracking label shown above the section. */
  label?: React.ReactNode;
  /** Override the canonical gap (default = app-stack = 24px). */
  tight?: boolean;
}

/** Canonical vertical stack section with optional label. */
export function Section({ label, tight, className, children, ...rest }: SectionProps) {
  return (
    <section className={cn(className)} {...rest}>
      {label && <div className="app-section-label">{label}</div>}
      <div className={tight ? 'app-stack-sm' : 'app-stack'}>{children}</div>
    </section>
  );
}
