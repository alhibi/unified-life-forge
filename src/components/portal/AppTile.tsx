/**
 * AppTile — one app in the launcher.
 *
 * Interaction contract:
 *   • Primary tap / Enter  → open the app.
 *   • The trailing "…" affordance (44×44) → open the app's deep-link panel
 *     without navigating. It is a real button, not a hover-only secret.
 *   • Long-press / right-click → same as the affordance, for touch users who
 *     expect a launcher to behave like a home screen.
 *
 * Motion contract (design system §8: transform + opacity only):
 *   • Entrance: spring fade-up, stagger capped at 6 items so a long list is
 *     never punished with a visible cascade.
 *   • Hover / focus: −2px lift on the tile and a 1.06 scale on the icon chip,
 *     both pure transforms driven by CSS transitions (no React state, so
 *     hovering never re-renders the grid).
 *   • Reorder between filters is a FLIP via framer's `layout` — the tile
 *     animates its own transform, no layout thrash.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { forwardRef, memo, useCallback, useRef } from 'react';

import { ChevronRight, MoreHorizontal, Pin } from '@/lib/icons';
import { cn } from '@/lib/utils';

import type { PortalApp } from './apps';

const LONG_PRESS_MS = 420;

export interface AppTileProps {
  app: PortalApp;
  index: number;
  /** Grid or single-column list presentation. */
  list: boolean;
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

/**
 * `forwardRef` is required, not optional: `<AnimatePresence mode="popLayout">`
 * clones each child with a ref so it can measure the exiting element. A plain
 * function component there logs "Function components cannot be given refs" and
 * silently loses the exit animation.
 */
const AppTileImpl = forwardRef<HTMLDivElement, AppTileProps>(function AppTileImpl(
  { app, index, list, active, pinned, badge, onOpen, onInspect, onFocusApp, registerRef },
  forwardedRef,
) {
  const reduce = useReducedMotion();
  const Icon = app.icon;
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse') return;
      longPressFired.current = false;
      clearLongPress();
      longPressTimer.current = window.setTimeout(() => {
        longPressFired.current = true;
        // Haptic confirmation where supported — a long-press with no feedback
        // reads as a dropped tap.
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
    [app, clearLongPress, onInspect],
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
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
      transition={
        reduce
          ? { duration: 0.12, ease: 'linear' }
          : {
              type: 'spring',
              stiffness: 420,
              damping: 34,
              mass: 0.9,
              // Cap the cascade: item 7 must not wait 240 ms to exist.
              delay: Math.min(index, 6) * 0.035,
            }
      }
      style={{ willChange: 'transform, opacity' }}
      className="relative"
    >
      <button
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
        onMouseEnter={() => onFocusApp(app)}
        onFocus={() => onFocusApp(app)}
        aria-label={`${app.label} — ${app.description}`}
        aria-current={active ? 'true' : undefined}
        data-portal-tile={app.key}
        className={cn(
          'app-card group relative w-full text-start',
          'transition-[transform,border-color,background-color] duration-normal ease-out-expo',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'hover:-translate-y-0.5',
          active && 'border-primary/70 bg-accent/40',
          list ? 'flex items-center gap-3' : 'flex min-h-[124px] flex-col gap-3',
        )}
      >
        {/* Editorial index number — gives the neutral grid a typographic
            anchor without adding colour or ornament. */}
        {!list && (
          <span
            className="pointer-events-none absolute top-3 end-3 text-micro font-semibold tabular-nums text-muted-foreground/45"
            aria-hidden
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        )}

        <span className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
              'transition-[transform,background-color,color] duration-normal ease-out-expo',
              'group-hover:scale-105 group-focus-visible:scale-105',
              active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>

          {list && (
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-body font-semibold text-foreground">{app.label}</span>
                {pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
              </span>
              <span className="mt-0.5 block truncate text-mini text-muted-foreground">{app.description}</span>
            </span>
          )}
        </span>

        {!list && (
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-body font-semibold text-foreground">{app.label}</span>
              {pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
            </span>
            <span className="mt-1 block text-mini leading-[1.125rem] text-muted-foreground">{app.description}</span>
            <span className="mt-2 block text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
              {app.caption}
            </span>
          </span>
        )}

        {typeof badge === 'number' && badge > 0 && (
          <span
            className={cn(
              'absolute flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5',
              'bg-primary text-primary-foreground text-micro font-bold tabular-nums',
              list ? 'end-14 top-1/2 -translate-y-1/2' : 'top-3 start-3',
            )}
            aria-label={`${badge} غير مقروء`}
          >
            {badge > 99 ? '٩٩+' : badge}
          </span>
        )}

        {list && <ChevronRight className="ms-auto h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />}
      </button>

      {/* Detail affordance — separate button so the tile's primary tap stays
          "open the app". Positioned in the corner the index number does not
          occupy so the two never collide. */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onInspect(app);
        }}
        aria-label={`اختصارات ${app.label}`}
        className={cn(
          'absolute flex h-8 w-8 items-center justify-center rounded-sm',
          'text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          list ? 'end-10 top-1/2 -translate-y-1/2' : 'bottom-2 end-2',
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
    </motion.div>
  );
});

export const AppTile = memo(AppTileImpl);
export default AppTile;
