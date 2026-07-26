import { ReactNode } from 'react';

import BackButton from '@/components/BackButton';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Main title (string or any node — supports embedded icons/badges). */
  title: ReactNode;
  /** Optional small text under the title. */
  subtitle?: ReactNode;
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
   * Extra classes for the header container. Avoid using this for
   * spacing tweaks — prefer the page-level wrapper.
   */
  className?: string;
}

/**
 * Single source of truth for page headers.
 *
 * Layout: `[ back ] [ icon ] [ title / subtitle ] [ right actions ]`
 *
 * Visual contract:
 *   • One height, from `--ui-header-h` (56px at the default header scale).
 *   • One sticky token (z-header + opaque semantic surface + hairline).
 *   • One title token (`text-title`) and one subtitle token (`text-micro`).
 *   • Back-button comes from the unified `<BackButton/>` (smart back,
 *     aria-label, ghost styling).
 *
 * Migration target: every page that currently rolls its own header.
 * Adopting it is opt-in — the existing pages keep working, and pages
 * with bespoke headers (e.g. game shells, podcast player overlays)
 * can stay on their custom layout.
 */
export default function PageHeader({
  title,
  subtitle,
  icon,
  right,
  hideBack,
  backTo,
  backFallback,
  sticky = false,
  className,
}: PageHeaderProps) {
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
        // and this 44 px placeholder. Without this, short titles pull
        // toward the start edge on wide screens, which feels off.
        <div className="w-11 shrink-0" aria-hidden="true" />
      ) : null}
    </header>
  );
}
