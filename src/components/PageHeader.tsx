import { ReactNode } from 'react';

import BackButton from '@/components/BackButton';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Main title (string or any node — supports embedded icons/badges). */
  title: ReactNode;
  /** Optional small text under the title. */
  subtitle?: ReactNode;
  /**
   * Small line ABOVE the title. Display variant only — the hub register,
   * e.g. "محراب · الأدب" or "بوابة السكينة".
   */
  eyebrow?: ReactNode;
  /** Optional decorative icon shown before the title. */
  icon?: ReactNode;
  /** Right-side action cluster (buttons, badges, …). */
  right?: ReactNode;
  /** Hide the back button entirely (top-level tab pages). */
  hideBack?: boolean;
  /** Force a specific back-target rather than smart history-back. */
  backTo?: string;
  /** Where to land when there is no history. Default `/`. */
  backFallback?: string;
  /**
   * Stick the header to the top of the viewport on an opaque surface.
   * One canonical token — no per-page opacity, blur or border tweaks.
   */
  sticky?: boolean;
  /**
   * `compact` (default) — the tool register: one row, start-aligned title,
   *   back button, optional icon and actions. Sub-screens and settings.
   * `display`   — the hub register: back/actions on a quiet rail, then a
   *   large serif title centred with an optional eyebrow, subtitle and a
   *   children slot for chip rails. Landing screens of a section.
   */
  variant?: 'compact' | 'display';
  /** Display variant only: rendered under the title (chip rails, meta rows). */
  children?: ReactNode;
  /**
   * Extra classes for the header container. Avoid using this for
   * spacing tweaks — prefer the page-level wrapper.
   */
  className?: string;
}

/**
 * Single source of truth for page headers.
 *
 * Compact layout: `[ back ] [ icon ] [ title / subtitle ] [ right actions ]`
 *
 * Visual contract:
 *   • One height, from `--ui-header-h` (56px at the default header scale).
 *   • One sticky token (z-header + opaque semantic surface + hairline).
 *   • One title token (`type-title`) and one subtitle token (`text-micro`).
 *   • Back-button comes from the unified `<BackButton/>` (smart back,
 *     aria-label, ghost styling).
 */
export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  icon,
  right,
  hideBack,
  backTo,
  backFallback,
  sticky = false,
  variant = 'compact',
  children,
  className,
}: PageHeaderProps) {
  if (variant === 'display') {
    return (
      <header
        className={cn('flex flex-col pb-4', sticky && 'z-header app-sticky-header', className)}
      >
        <div className="flex min-h-[var(--ui-header-h)] items-center gap-2 px-4">
          {!hideBack ? (
            <BackButton to={backTo} fallback={backFallback} />
          ) : (
            <div className="h-11 w-11 shrink-0" aria-hidden="true" />
          )}

          {eyebrow != null ? (
            <div className="min-w-0 flex-1 text-center text-micro text-muted-foreground">
              {eyebrow}
            </div>
          ) : (
            <div className="flex-1" aria-hidden="true" />
          )}

          {right ? (
            <div className="flex shrink-0 items-center gap-2">{right}</div>
          ) : (
            <div className="w-11 shrink-0" aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-col items-start gap-2 px-[var(--ui-gutter)] pb-2 pt-6 text-start">
          <h1 className="type-display flex items-center gap-2 text-foreground">
            {icon && <span className="inline-flex shrink-0">{icon}</span>}
            <span className="min-w-0">{title}</span>
          </h1>
          {subtitle && <div className="text-meta text-muted-foreground">{subtitle}</div>}
          {children}
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        // The height follows the interface platform's header-scale preference,
        // and `scroll-padding-block-start` in index.css reads the same token so
        // anchor jumps always land clear of it.
        'flex min-h-[var(--ui-header-h)] items-center gap-2 px-4 py-2',
        sticky && 'z-header app-sticky-header',
        className,
      )}
    >
      {!hideBack && <BackButton to={backTo} fallback={backFallback} />}

      <div className="flex-1 min-w-0 flex items-center gap-2">
        {icon && <span className="shrink-0 inline-flex">{icon}</span>}
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-foreground truncate">{title}</h1>
          {subtitle && (
            <div className="mt-0.5 text-micro text-muted-foreground truncate">{subtitle}</div>
          )}
        </div>
      </div>

      {right ? (
        <div className="shrink-0 flex items-center gap-2">{right}</div>
      ) : !hideBack ? (
        // Optical balance — the title row visually centers between back
        // and this 44 px placeholder. Without it, short titles pull
        // toward the start edge on wide screens, which feels off.
        <div className="w-11 shrink-0" aria-hidden="true" />
      ) : null}
    </header>
  );
}
