import type { ReactNode } from 'react';

import { AlertTriangle, Archive, RefreshCcw, Search, WifiOff } from '@/lib/icons';
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
 * Four kinds, because they need genuinely different tones:
 *
 *   'empty'   nothing yet, and that is normal → invite the first action.
 *   'search'  the query matched nothing → suggest a narrower/wider query.
 *   'offline' we know the network is gone → promise recovery, never blame.
 *   'error'   something actually failed → say what we know, offer a retry.
 *
 * Layout note: the block reserves its own height (`min-h`) so swapping a
 * loading skeleton for a state view — or a state view for real content — does
 * not shift the page around it.
 */

export type StateKind = 'empty' | 'search' | 'offline' | 'error';

const ICONS: Record<StateKind, typeof Archive> = {
  empty: Archive,
  search: Search,
  offline: WifiOff,
  error: AlertTriangle,
};

const TONE: Record<StateKind, string> = {
  empty: 'text-muted-foreground',
  search: 'text-muted-foreground',
  offline: 'text-primary',
  error: 'text-destructive',
};

export interface StateViewProps {
  kind: StateKind;
  /** One specific line. Not "لا توجد بيانات". */
  title: string;
  /** What is missing, why, and what happens next. Two sentences at most. */
  body: string;
  /** The single most useful next step, if there is one. */
  action?: { label: string; onClick: () => void; pending?: boolean };
  /** A quieter secondary escape hatch. */
  secondary?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function StateView({
  kind,
  title,
  body,
  action,
  secondary,
  className,
  compact = false,
}: StateViewProps) {
  const Icon = ICONS[kind];

  return (
    <div
      // `status` (not `alert`) for empty/search: they are the expected state of
      // the screen, and an assertive live region would interrupt the user.
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-surface/20 px-6 text-center',
        compact ? 'min-h-[9rem] py-6' : 'min-h-[15rem] py-12',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/60',
          TONE[kind],
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>

      <h3 className="text-meta font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-mini leading-relaxed text-muted-foreground">{body}</p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          disabled={action.pending}
          className="app-pressable app-focus-ring mt-1 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-mini font-semibold text-foreground transition-snap hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className={cn('h-3.5 w-3.5', action.pending && 'animate-spin')} aria-hidden />
          {action.label}
        </button>
      )}

      {secondary && <div className="mt-1 text-micro text-muted-foreground">{secondary}</div>}
    </div>
  );
}

export default StateView;
