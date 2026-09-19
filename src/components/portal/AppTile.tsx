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
 *   Each tile derives every colour from one `--tile` accent token supplied by
 *   `getTileIdentity`, and carries a single app-specific motif (see
 *   AppTileVisuals). The previous editorial costume — corner crop marks,
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

import { ChevronRight, MoreHorizontal, Pin } from '@/lib/icons';
import { MOTION } from '@/lib/motion';
import { prefetchRoute } from '@/lib/routePrefetch';
import { cn } from '@/lib/utils';

import type { PortalApp } from './apps';
import { getTileIdentity, TileMotif } from './AppTileVisuals';

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

const AppTileImpl = forwardRef<HTMLDivElement, AppTileProps>(function AppTileImpl(
  { app, index, list, active, pinned, badge, onOpen, onInspect, onFocusApp, registerRef },
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
      className="relative"
      style={{ '--tile': identity.accent } as React.CSSProperties}
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
        className={cn(
          'arch-plate group relative w-full overflow-hidden rounded-card text-start',
          'transition-[transform,border-color,background-color,box-shadow] duration-normal ease-out-expo',
          'hover:-translate-y-0.5 hover:bg-[hsl(var(--interactive-hover))]',
          'active:translate-y-0 active:scale-[0.985]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          active && 'ring-1 ring-inset ring-[hsl(var(--tile)/0.45)]',
          list ? 'flex items-center gap-3 p-3' : 'flex min-h-[132px] flex-col justify-between p-4',
        )}
      >
        <TileMotif motif={identity.motif} />

        <div
          className={cn(
            'relative z-10 flex w-full',
            list ? 'items-center gap-3' : 'flex-col gap-3',
          )}
        >
          {/* The app's colour survives in exactly one place: the glyph. The
              chip itself is a neutral tonal well, so a grid of twenty apps
              reads as one system instead of twenty coloured badges. */}
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-[10px]',
              'bg-secondary text-[hsl(var(--tile))]',
              'shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.05)]',
              'transition-transform duration-normal ease-out-expo group-hover:scale-105 motion-reduce:transition-none',
              list ? 'h-10 w-10' : 'h-11 w-11',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className={cn('truncate text-foreground', list ? 'type-body' : 'type-section')}>
                {app.label}
              </span>
              {pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
            </span>
            <span className="type-meta mt-1 block truncate text-muted-foreground">
              {app.description}
            </span>
            {!list && (
              <span className="type-meta mt-2 block font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                {app.caption}
              </span>
            )}
          </span>

          {list && (
            <ChevronRight
              className="ms-auto me-9 h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
              aria-hidden
            />
          )}
        </div>

        {typeof badge === 'number' && badge > 0 && (
          <span
            className={cn(
              'absolute z-10 flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5',
              'bg-primary text-mini font-bold tabular-nums text-primary-foreground',
              list ? 'end-12 top-1/2 -translate-y-1/2' : 'top-3 end-3',
            )}
            aria-label={`${badge} غير مقروء`}
          >
            {badge > 99 ? '٩٩+' : badge}
          </span>
        )}
      </button>

      {/* Detail affordance */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onInspect(app);
        }}
        aria-label={`اختصارات ${app.label}`}
        className={cn(
          'absolute z-10 flex h-8 w-8 items-center justify-center rounded-md',
          'text-muted-foreground opacity-60 transition-[opacity,background-color,color] duration-fast',
          'hover:bg-muted hover:text-foreground hover:opacity-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          list ? 'end-2 top-1/2 -translate-y-1/2' : 'bottom-2 end-2',
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
    </motion.div>
  );
});

export const AppTile = memo(AppTileImpl);
export default AppTile;
