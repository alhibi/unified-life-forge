import type { ReactNode } from 'react';

import { AlertTriangle, Archive, RefreshCcw, Search, ShieldCheck, WifiOff } from '@/lib/icons';
import { cn } from '@/lib/utils';

/**
 * StateView — the one surface for every screen that has nothing to show.
 *
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║ An empty screen is not an absence of design; it is the screen a     ║
 * ║ user meets FIRST and, when something breaks, the only screen they   ║
 * ║ read. "لا توجد بيانات" tells them nothing: not what should be here, ║
 * ║ not why it isn't, not what to do next. Every use of this component  ║
 * ║ therefore REQUIRES a specific title and body — the props are not    ║
 * ║ optional and there is no default copy to fall back on.              ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * Five kinds, because they need genuinely different tones:
 *
 *   'empty'   nothing yet, and that is normal → invite the first action.
 *   'search'  the query matched nothing → suggest a narrower/wider query.
 *   'offline' we know the network is gone → promise recovery, never blame.
 *   'error'   something actually failed → say what we know, offer a retry.
 *   'auth'    the surface is gated behind sign-in → explain what it is and
 *             what stays local, then offer one quiet sign-in step. It is an
 *             invitation, not a failure: it never renders a retry glyph and
 *             never uses the error tone.
 *
 * Page-level composition for 'auth' (see AuthGuard's `fallback` slot): keep
 * the route's PageShell + PageHeader identity, render this state inside a
 * bounded AppCard, and offer "تسجيل الدخول" as the action with a secondary
 * escape back to the portal. Do not auto-redirect and never autofocus on a
 * coarse pointer.
 *
 * Layout note: the block reserves its own height (`min-h`) so swapping a
 * loading skeleton for a state view — or a state view for real content — does
 * not shift the page around it.
 */

export type StateKind = 'empty' | 'search' | 'offline' | 'error' | 'auth';

const ICONS: Record<StateKind, typeof Archive> = {
  empty: Archive,
  search: Search,
  offline: WifiOff,
  error: AlertTriangle,
  auth: ShieldCheck,
};

/** States whose action is a retry, so the RefreshCcw glyph is the default. */
const RETRY_KINDS: ReadonlySet<StateKind> = new Set(['error', 'offline']);

const TONE: Record<StateKind, string> = {
  empty: 'text-secondary-muted',
  search: 'text-secondary-muted',
  offline: 'text-primary',
  error: 'text-destructive',
  auth: 'text-primary',
};

export interface StateViewProps {
  kind: StateKind;
  /** One specific line. Not "لا توجد بيانات". */
  title: string;
  /** What is missing, why, and what happens next. Two sentences at most. */
  body: string;
  /**
   * The single most useful next step, if there is one.
   *
   * A retry-shaped state (error/offline) defaults to the RefreshCcw glyph.
   * Any other state renders label-only unless it passes an explicit `icon`:
   * a "حدّد الورد" or "العودة إلى الرئيسية" action must not look like a retry.
   */
  action?: {
    label: string;
    onClick: () => void;
    pending?: boolean;
    /** Optional glyph for the action (rendered at the action icon size). */
    icon?: ReactNode;
  };
  /** A quieter secondary escape hatch. */
  secondary?: ReactNode;
  /** Replace the built-in icon (e.g. a feature-specific glyph). */
  icon?: ReactNode;
  /**
   * Replace the default action row entirely. Use when a state needs two
   * genuinely different escapes (retry + clear cache) rather than one step.
   */
  actions?: ReactNode;
  /** Extra content between the body and the actions (error details, path…). */
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  /**
   * Drop the surrounding plate and render the state directly on the page.
   * For full-page states (404, hard failures) where a large grey slab would
   * become the loudest object on an otherwise empty screen.
   */
  bare?: boolean;
}

export function StateView({
  kind,
  title,
  body,
  action,
  secondary,
  icon,
  actions,
  children,
  className,
  compact = false,
  bare = false,
}: StateViewProps) {
  const Icon = ICONS[kind];

  return (
    <div
      // `status` (not `alert`) for empty/search: they are the expected state of
      // the screen, and an assertive live region would interrupt the user.
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-3 px-6 text-center',
        !bare && 'rounded-2xl border border-dashed border-border/80 bg-secondary',
        compact ? 'min-h-[9rem] py-6' : 'min-h-[15rem] py-12',
        className,
      )}
    >
      {icon ?? (
        <span
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-surface-1',
            TONE[kind],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}

      <h3 className="text-meta font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-mini leading-relaxed text-secondary-muted">{body}</p>

      {children}

      {actions ?? (
        <>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              disabled={action.pending}
              aria-busy={action.pending ? true : undefined}
              className="app-pressable app-focus-ring mt-1 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-mini font-semibold text-foreground transition-snap hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {action.pending ? (
                // Pending always wins, so the busy state reads the same for
                // every action kind (the button is also disabled above).
                <RefreshCcw className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : action.icon ? (
                <span className="inline-flex shrink-0 [&_svg]:size-3.5" aria-hidden>
                  {action.icon}
                </span>
              ) : action.icon === undefined && RETRY_KINDS.has(kind) ? (
                <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
              ) : null}
              {action.label}
            </button>
          )}

          {secondary && <div className="mt-1 text-micro text-secondary-muted">{secondary}</div>}
        </>
      )}
    </div>
  );
}

export default StateView;
