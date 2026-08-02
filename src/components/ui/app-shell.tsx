import * as React from 'react';

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
      {/* High-fidelity ambient radial glow matching the active theme's primary accent color */}
      <div
        className="pointer-events-none fixed top-[-300px] left-1/2 h-[600px] w-[1000px] -translate-x-1/2 opacity-60 dark:opacity-100 transition-all duration-1000"
        style={{
          background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.06) 0%, transparent 65%)',
          zIndex: 0,
        }}
      />
      {centered ? (
        <div className="page-shell-inner app-stack relative z-base">{children}</div>
      ) : (
        <div className="relative z-base">{children}</div>
      )}
    </div>
  );
}

interface AppCardProps extends DivProps {
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
  ({ compact, flat, pressable, as = 'div', className, ...rest }, ref) => {
    const Comp = as as unknown as React.ComponentType<AppCardElementProps>;
    return (
      <Comp
        ref={ref}
        data-ui-surface="card"
        className={cn(
          'app-card',
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

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

/** Canonical 44×44 rounded-md icon button used in headers and toolbars. */
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
