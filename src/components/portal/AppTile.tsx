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
import { MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';

import type { PortalApp } from './apps';
import { getTileTheme, TileBackground } from './AppTileVisuals';

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
  const theme = getTileTheme(app.key, index);
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
              // The shared spring, so the tile follows the speed and bounce
              // settings and stops overshooting entirely under the `silk`
              // easing family. It used to carry its own ζ ≈ 0.81 pair, which
              // meant every tile on the home grid settled with a small rebound
              // no preference could reach.
              ...MOTION.spring,
              // Cap the cascade: item 7 must not wait 240 ms to exist.
              delay: Math.min(index, 6) * 0.035,
            }
      }
      className="relative"
    >
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <filter id="paper-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" in="noise" result="coloredNoise" />
          <feBlend in="SourceGraphic" in2="coloredNoise" mode="multiply" />
        </filter>
      </svg>
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
          'app-card group relative w-full text-start overflow-hidden font-amiri',
          theme.bg,
          theme.border,
          theme.glow,
          'border',
          'transition-[transform,border-color,background-color] duration-normal ease-out-expo',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'hover:scale-[1.02]',
          active && 'border-primary/70 bg-accent/40',
          list ? 'flex items-center gap-3 p-4' : 'flex min-h-[140px] flex-col justify-between p-4',
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-base overflow-hidden">
          <TileBackground appKey={app.key} />
        </div>

        {/* Paper texture overlay */}
        <div className="pointer-events-none absolute inset-0 z-raised mix-blend-multiply opacity-40 dark:opacity-20 [filter:url(#paper-noise)]" aria-hidden="true" />

        {/* Content wrapper with z-raised-above */}
        <div className={cn("relative z-raised-above flex h-full w-full", list ? "items-center" : "flex-col justify-between")}>

        {list ? (
          <span className="flex w-full items-center gap-4">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-body font-bold text-foreground drop-shadow-sm">
                  {app.label}
                </span>
                {pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
              </span>
              <span className="mt-0.5 block truncate text-mini text-muted-foreground">
                {app.description}
              </span>
            </span>
            <span className="flex flex-col items-end gap-1 font-mono text-xs text-muted-foreground/60">
              <span>Nº {String(index + 1).padStart(4, '0')}</span>
              <span>EST. 2024</span>
            </span>
          </span>
        ) : (
          <>
            <div className="flex w-full items-start justify-between">
              <span className="min-w-0 flex-1 pe-4">
                <span className="flex items-center gap-2">
                  <span className="truncate text-title font-bold text-foreground drop-shadow-sm">{app.label}</span>
                  {pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
                </span>
                <span className="mt-1 block text-mini leading-[1.4] text-muted-foreground/90">
                  {app.description}
                </span>
                <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 font-sans">
                  {app.caption}
                </span>
              </span>
              <div className="flex flex-col items-end gap-1 text-end">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
                  Nº {String(index + 1).padStart(4, '0')}
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground/60">
                  EST. 2024
                </span>
              </div>
            </div>

            <div className="mt-4 flex h-8 w-full items-center justify-between opacity-30 gap-[1px]">
              <div className="w-[2px] h-full bg-current" />
              <div className="w-[1px] h-full bg-current" />
              <div className="w-[3px] h-full bg-current" />
              <div className="w-[1px] h-full bg-current" />
              <div className="w-[4px] h-full bg-current" />
              <div className="w-[1px] h-full bg-current" />
              <div className="w-[2px] h-full bg-current" />
              <div className="w-[1px] h-full bg-current" />
              <div className="w-[3px] h-full bg-current" />
              <div className="w-[2px] h-full bg-current" />
              <div className="w-[1px] h-full bg-current" />
              <div className="w-[5px] h-full bg-current" />
            </div>
          </>
        )}

        {typeof badge === 'number' && badge > 0 && (
          <span
            className={cn(
              'absolute flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5',
              'bg-primary text-primary-foreground text-xs font-bold tabular-nums',
              list ? 'end-14 top-1/2 -translate-y-1/2' : 'top-3 start-3',
            )}
            aria-label={`${badge} غير مقروء`}
          >
            {badge > 99 ? '٩٩+' : badge}
          </span>
        )}

        {list && (
          <ChevronRight
            className="ms-auto h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
            aria-hidden
          />
        )}
        </div>
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
