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
   * Stick the header to the top of the viewport with a backdrop blur.
   * One canonical token — no per-page tweaking of opacity/blur/border.
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
 *   • One height (py-3 → ~48 px header).
 *   • One sticky token (z-30, bg/85 + blur-md, hairline border-b/30).
 *   • One title weight (semibold, 17 px) — easily overridden by passing
 *     a custom node.
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
        'flex items-center gap-2 px-4 py-3',
        sticky &&
          'sticky top-0 z-30 bg-background/92 backdrop-blur-md border-b border-border/50',
        className,
      )}
    >
      {!hideBack && (
        <BackButton to={backTo} fallback={backFallback} />
      )}

      <div className="flex-1 min-w-0 flex items-center gap-2">
        {icon && <span className="shrink-0 inline-flex">{icon}</span>}
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <div className="text-[11px] text-muted-foreground truncate leading-tight mt-1">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {right ? (
        <div className="shrink-0 flex items-center gap-2">{right}</div>
      ) : !hideBack ? (
        // Optical balance — the title row visually centers between back
        // and this 36 px placeholder. Without this, short titles pull
        // toward the start edge on wide screens, which feels off.
        <div className="w-9 shrink-0" aria-hidden="true" />
      ) : null}
    </header>
  );
}
