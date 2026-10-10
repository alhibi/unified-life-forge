/**
 * AppTile — one app in the launcher.
 *
 * Interaction contract:
 *   • Primary tap / Enter  → open the app.
 *   • The trailing "…" affordance (32×32) → open the app's deep-link panel
 *     without navigating. It is a real button, not a hover-only secret.
 *   • Long-press / right-click → same as the affordance, for touch users who
 *     expect a launcher to behave like a home screen.
 *
 * Visual contract:
 *   Each tile is a solid widget body whose material tone (0 neutral, 1–6
 *   category) comes from `getTileIdentity`; its head is an inverted icon
 *   chip plus name, and its body is the app's own composition from
 *   AppTileFaces (live values where the app has them).
 *   The previous editorial costume — corner crop marks,
 *   "Nº 0001 / EST. 2024", the ACTIVE SEAL dot, the fake barcode, a per-tile
 *   SVG noise filter and a React-state 3D tilt — is gone: it was uniform
 *   across apps (so it distinguished nothing) and re-rendered on every
 *   pointer move.
 *
 * Motion contract (design system §8: transform + opacity only):
 *   • Entrance: spring fade-up, stagger capped at 6 items.
 *   • Hover / focus: −2px lift plus the motif's own gesture, both pure CSS.
 *   • Reorder between filters is a FLIP via framer's `layout`.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { forwardRef, memo, useCallback, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { ChevronRight, MoreHorizontal, Pin } from '@/lib/icons';
import { MOTION } from '@/lib/motion';
import { prefetchRoute } from '@/lib/routePrefetch';
import { cn } from '@/lib/utils';

import type { PortalApp } from './apps';
import { AppTileFace } from './AppTileFaces';
import { getTileIdentity } from './AppTileVisuals';

const LONG_PRESS_MS = 420;

export interface AppTileProps {
  app: PortalApp;
  index: number;
  /** Grid or single-column list presentation. */
  list: boolean;
  /** Feature widget spanning two grid columns (see `widgetSpans`). */
  wide?: boolean;
  /** The app whose detail panel is currently shown. */
  active: boolean;
  pinned: boolean;
  /** Live counter shown as a numeric badge (chat unread, etc.). */
  badge?: number;
  onOpen: (app: PortalApp) => void;
  onInspect: (app: PortalApp) => void;
  /** Called on hover/focus so the desktop side panel can follow the pointer. */
  onFocusApp: (app: PortalApp) => void;
  registerRef?: (index: number, el: HTMLButtonElement | null) => void;
}

const AppTileImpl = forwardRef<HTMLDivElement, AppTileProps>(function AppTileImpl(
  { app, index, list, wide = false, active, pinned, badge, onOpen, onInspect, onFocusApp, registerRef },
  forwardedRef,
) {
  const reduce = useReducedMotion();
  const identity = getTileIdentity(app.key);
  const Icon = app.icon;
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  /**
   * Intent — not navigation — is what warms the section. Touch users get
   * the warm on press-start (≈120ms before the tap completes), mouse users
   * on hover, keyboard users on focus. `prefetchRoute` is memoised and
   * TTL-guarded, so firing it on every hover costs nothing after the first.
   */
  const warm = useCallback(() => {
    prefetchRoute(app.path);
  }, [app.path]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      warm();
      if (event.pointerType === 'mouse') return;
      longPressFired.current = false;
      clearLongPress();
      longPressTimer.current = window.setTimeout(() => {
        longPressFired.current = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(8);
          } catch {
            /* vibration blocked — silent */
          }
        }
        onInspect(app);
      }, LONG_PRESS_MS);
    },
    [app, clearLongPress, onInspect, warm],
  );

  const handleClick = useCallback(() => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onOpen(app);
  }, [app, onOpen]);

  return (
    <motion.div
      ref={forwardedRef}
      layout={reduce ? false : 'position'}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.99 }}
      transition={
        reduce
          ? { duration: 0.12, ease: 'linear' }
          : { ...MOTION.spring, delay: Math.min(index, 6) * 0.03 }
      }
      className={cn('relative', !list && 'portal-widget-cell')}
      data-tile-tone={identity.tone}
      data-wide={!list && wide ? '' : undefined}
    >
      <Button
        variant="secondary"
        ref={(el) => registerRef?.(index, el)}
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onPointerLeave={clearLongPress}
        onContextMenu={(event) => {
          event.preventDefault();
          onInspect(app);
        }}
        onMouseEnter={() => {
          warm();
          onFocusApp(app);
        }}
        onFocus={() => {
          warm();
          onFocusApp(app);
        }}
        data-prefetch-target={app.path}
        aria-label={`${app.label} — ${app.description}`}
        aria-current={active ? 'true' : undefined}
        data-portal-tile={app.key}
        activation="click"
        className={cn(
          'rich-widget group relative w-full overflow-hidden bg-tile-surface text-start whitespace-normal text-tile-foreground',
          'transition-[transform,background-color,box-shadow] duration-normal ease-out-expo',
          'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100',
          active && 'ring-2 ring-inset ring-tile-foreground/25',
          list
            ? 'flex h-auto items-center gap-3 rounded-card p-4 shadow-e2'
            : 'portal-app-widget flex h-full flex-col items-stretch justify-between gap-3 p-4 sm:p-5',
        )}
      >
        {!list ? (
          <>
            {/* Widget head: inverted chip + name; the end edge is reserved
                for the shortcuts control that sits above the tile. */}
            <span className="relative z-10 flex w-full items-center gap-2.5 pe-12">
              <span
                className="portal-widget-chip flex size-10 shrink-0 items-center justify-center rounded-full shadow-e1 transition-transform duration-normal ease-out-expo group-hover:scale-105 motion-reduce:transition-none"
                aria-hidden
              >
                <Icon className="size-5!" />
              </span>
              <span className="portal-widget-title min-w-0 break-words text-tile-foreground">
                {app.label}
              </span>
              {pinned && <Pin className="size-3.5! shrink-0 text-tile-foreground" aria-hidden />}
            </span>

            {/* The face is the widget's own composition (AppTileFaces). */}
            <span className="tile-face relative z-10 flex min-h-0 w-full flex-1 items-end">
              <AppTileFace appKey={app.key} wide={wide} badge={badge} />
            </span>
          </>
        ) : (
          <>
            <span
              className="portal-widget-chip relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full shadow-e1"
              aria-hidden
            >
              <Icon className="size-6!" />
            </span>
            <span className="relative z-10 min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="type-body break-words font-semibold text-tile-foreground">
                  {app.label}
                </span>
                {pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-tile-foreground" aria-hidden />}
                {typeof badge === 'number' && badge > 0 && (
                  <span
                    className="flex min-w-6 items-center justify-center rounded-full bg-tile-foreground px-1.5 py-0.5 text-micro font-bold tabular-nums text-tile-surface"
                    aria-label={`${badge} غير مقروء`}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-mini font-medium text-muted-foreground">
                {app.description}
              </span>
            </span>
            <ChevronRight
              className="ms-auto me-9 h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
              aria-hidden
            />
          </>
        )}
      </Button>

      {/* Detail affordance — a real 44px control, top-end like a widget menu. */}
      <Button
        variant="ghost"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onInspect(app);
        }}
        aria-label={`اختصارات ${app.label}`}
        className={cn(
          'absolute z-10 flex h-11 w-11 items-center justify-center rounded-full',
          'bg-tile-foreground/10 text-tile-foreground transition-[background-color,color] duration-fast',
          'hover:bg-tile-foreground hover:text-tile-surface',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          list ? 'end-2 top-1/2 -translate-y-1/2' : 'top-3 end-3',
        )}
      >
        <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden />
      </Button>
    </motion.div>
  );
});

export const AppTile = memo(AppTileImpl);
export default AppTile;
