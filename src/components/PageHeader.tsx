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
        className={cn(
          'app-page-header flex flex-col pb-4',
          sticky && 'z-header app-sticky-header',
          className,
        )}
      >
        <div className="flex min-h-[var(--ui-header-h)] items-center gap-2 px-[var(--header-pad,var(--ui-gutter))]">
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

        <div className="flex flex-col items-start gap-2 px-[var(--header-pad,var(--ui-gutter))] pb-2 pt-6 text-start">
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
        // anchor jumps always land clear of it. Horizontal padding comes from
        // `--header-pad`: 0 inside a PageShell (the shell already owns the
        // gutter, so the header aligns with card edges) and the gutter when the
        // header is mounted on its own full-bleed surface.
        //
        // The header is a wrapping rail, not a fixed 56px row. A page may pass
        // a crowded action cluster (a game clock + pause + mute + board), and
        // on a 390px phone that cluster used to crush the title below its own
        // word width — the h1 was then ellipsised to a sliver (seen on
        // /games/sudoku and /games/memory). Now the start rail (back + title)
        // keeps a readable floor and the whole action cluster wraps to a second
        // rail instead of squeezing the page identity away.
        'app-page-header flex min-h-[var(--ui-header-h)] flex-wrap items-center gap-x-2 gap-y-1 px-[var(--header-pad,var(--ui-gutter))] py-2',
        sticky && 'z-header app-sticky-header',
        className,
      )}
    >
      <div className="flex min-w-0 flex-auto items-center gap-2">
        {!hideBack && <BackButton to={backTo} fallback={backFallback} />}

        {icon && <span className="shrink-0 inline-flex">{icon}</span>}
        <div className="min-w-0 flex-1">
          <h1 className="line-clamp-2 text-balance text-title font-semibold text-foreground [overflow-wrap:break-word]">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-0.5 text-micro text-muted-foreground truncate">{subtitle}</div>
          )}
        </div>
      </div>

      {right ? (
        <div className="ms-auto flex shrink-0 flex-wrap items-center justify-end gap-2">{right}</div>
      ) : !hideBack ? (
        // Optical balance — the title row visually centers between back
        // and this 44 px placeholder. Without it, short titles pull
        // toward the start edge on wide screens, which feels off.
        <div className="ms-auto w-11 shrink-0" aria-hidden="true" />
      ) : null}
    </header>
  );
}
