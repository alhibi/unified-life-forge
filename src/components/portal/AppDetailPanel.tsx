/**
 * AppDetailPanel — the deep-link surface for one app.
 *
 * One component, two hosts: it renders inside the sticky desktop side column
 * and inside the mobile drawer. Keeping a single implementation is what stops
 * the two from drifting (the old portal had the desktop panel only, so touch
 * users could not reach any deep link at all).
 *
 * The content cross-fades when the selected app changes — a 6px slide plus
 * opacity, keyed on the app id, so switching apps reads as a swap rather than
 * a repaint.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';

import { ChevronLeft, Pin } from '@/lib/icons';
import { prefetchRoute } from '@/lib/routePrefetch';
import { cn } from '@/lib/utils';

import type { PortalApp } from './apps';

export interface AppDetailPanelProps {
  app: PortalApp;
  pinned: boolean;
  onOpenPath: (path: string) => void;
  onTogglePin: (key: string) => void;
  /** Renders without the outer card chrome (the drawer supplies its own). */
  bare?: boolean;
}

function PinToggle({
  app,
  pinned,
  onTogglePin,
}: {
  app: PortalApp;
  pinned: boolean;
  onTogglePin: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onTogglePin(app.key)}
      aria-pressed={pinned}
      aria-label={pinned ? `إلغاء تثبيت ${app.label}` : `تثبيت ${app.label}`}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border',
        'transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        pinned
          ? 'border-primary/60 bg-accent/50 text-foreground'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {/* One glyph for both states: a slashed pin for "not pinned" reads as
          "pinning is disabled". State lives in the surface + aria-pressed. */}
      <Pin className="h-4 w-4" aria-hidden fill={pinned ? 'currentColor' : undefined} />
    </button>
  );
}

function AppDetailPanelImpl({ app, pinned, onOpenPath, onTogglePin, bare }: AppDetailPanelProps) {
  const reduce = useReducedMotion();
  const Icon = app.icon;

  return (
    <div className={cn(!bare && 'app-card p-0 overflow-hidden')}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={app.key}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={reduce ? { duration: 0.1, ease: 'linear' } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{ willChange: 'transform, opacity' }}
        >
          {/* Header. Suppressed in `bare` mode because the drawer already
              renders the app name as its own accessible title — repeating it
              would push the actual links below the fold on small phones. */}
          {!bare && (
            <div className="flex items-start gap-3 border-b border-border p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-title font-semibold text-foreground">{app.label}</h2>
                <p className="mt-0.5 text-mini text-muted-foreground">{app.description}</p>
              </div>
              <PinToggle app={app} pinned={pinned} onTogglePin={onTogglePin} />
            </div>
          )}

          {/* Deep links */}
          <div className={cn(bare ? 'space-y-2' : 'space-y-2 p-4')}>
            <p className="app-section-label mb-1">الاختصارات</p>
            {app.links.map((link) => {
              const LinkIcon = link.icon;
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => onOpenPath(link.path)}
                  // Warm the chunk on intent so the tap lands on a rendered page.
                  onMouseEnter={() => prefetchRoute(link.path)}
                  onFocus={() => prefetchRoute(link.path)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-md border border-border/70 p-3 text-start',
                    'transition-[transform,border-color,background-color] duration-normal ease-out-expo',
                    'hover:-translate-y-0.5 hover:border-border hover:bg-muted/50',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-meta font-semibold text-foreground">{link.label}</span>
                    <span className="mt-0.5 block truncate text-mini text-muted-foreground">{link.note}</span>
                  </span>
                  <ChevronLeft
                    className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180 transition-transform duration-normal ease-out-expo group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onOpenPath(app.path)}
              className={cn(
                'mt-3 flex h-12 w-full items-center justify-between rounded-button px-4',
                'bg-primary text-primary-foreground text-body font-semibold',
                'transition-transform duration-normal ease-out-expo hover:-translate-y-0.5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <span>{`افتح ${app.label}`}</span>
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </button>

            {bare && (
              <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-meta font-semibold text-foreground">التثبيت في المقدمة</span>
                  <span className="mt-0.5 block text-mini text-muted-foreground">
                    التطبيقات المثبّتة تظهر أولاً في الشبكة
                  </span>
                </span>
                <PinToggle app={app} pinned={pinned} onTogglePin={onTogglePin} />
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export const AppDetailPanel = memo(AppDetailPanelImpl);
export default AppDetailPanel;
