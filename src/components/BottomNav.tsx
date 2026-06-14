import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useInChatConversation } from '@/lib/inChatConversation';
import {
  House, Dices, Compass, BookOpen, MessageCircle, HeartPulse, CloudSun, Crown,
} from '@/lib/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { prefetchRoute } from '@/lib/routePrefetch';

/**
 * BottomNav — native-feel tab bar
 * ─────────────────────────────────────────────────────────────────────
 * Design principles:
 *   • Full-width, flush to the screen bottom — no floating, no margin.
 *     Sits right at the bottom edge like iOS Tab Bar / Android Nav Bar.
 *   • Clean translucent surface: backdrop-blur + a very subtle top
 *     border separator, no rounded corners, no drop shadow.
 *   • Active tab: icon scales up + color accent + label appears below.
 *   • Inactive tabs: muted icon, no label.
 *   • Indicator dot above active icon for a modern polished feel.
 *   • Smooth spring transitions on activation — icon lifts, label fades in.
 *   • Haptic feedback on drag across tabs (Android Vibration API).
 *   • Touch drag: swipe left/right on the bar to switch tabs.
 *   • RTL-aware layout.
 */

type Tab = {
  key: string;
  path: string;
  icon: typeof House;
  labelKey: string;
};

// UNIFIED VISUAL LANGUAGE
// ─────────────────────────────────────────────────────────────────
// Per-tab colors retired. The entire bar reads as one cohesive
// neutral surface; only the ACTIVE tab earns the single chromatic
// note — `hsl(var(--live))`, the app-wide warm copper. Inactive
// icons sit on `muted-foreground`. This is the "محايد بالكامل +
// نبضة لون واحدة" direction the user chose.
const tabs: Tab[] = [
  { key: 'games',     path: '/games',     icon: Dices,         labelKey: 'nav.games'     },
  { key: 'chat',      path: '/chat',      icon: MessageCircle, labelKey: 'nav.chat'      },
  { key: 'wellness',  path: '/wellness',  icon: HeartPulse,    labelKey: 'nav.wellness'  },
  { key: 'home',      path: '/',          icon: House,         labelKey: 'nav.home'      },
  { key: 'weather',   path: '/weather',   icon: CloudSun,      labelKey: 'nav.weather'   },
  { key: 'browse',    path: '/browse',    icon: Compass,       labelKey: 'nav.browse'    },
  { key: 'knowledge', path: '/knowledge', icon: Crown,         labelKey: 'nav.knowledge' },
  { key: 'mihrab',    path: '/mihrab',    icon: BookOpen,      labelKey: 'nav.mihrab'    },
];

// The ONE accent — referenced as a CSS expression so it follows the
// theme token (always warm copper, theme-independent by design).
const LIVE = 'hsl(var(--live))';
const LIVE_SOFT = 'hsl(var(--live) / 0.14)';

const TAB_PATHS = new Set<string>(tabs.map(t => t.path));
// A drag must travel at least this many pixels before we treat it as
// a "swipe between tabs" gesture. Lower than this and we still let
// the underlying button receive the click. Set well above the iOS
// click-suppression slop (≈10px) so the user has to commit to a
// horizontal sweep — otherwise tiny finger drift across a tab boundary
// while tapping fires an unwanted navigation.
const DRAG_COMMIT_SLOP = 14;

type DragState = {
  startX: number;
  x: number;
  index: number;
  moved: boolean;
};

/** Height of the nav bar content row (excluding safe-area padding). */
export const BOTTOM_NAV_HEIGHT = 58;

export default function BottomNav() {
  const { t, dir } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const inChatConversation = useInChatConversation();
  const { unreadCount } = useUnreadMessages();
  const rtl = dir === 'rtl';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 390,
  );

  // Block rapid-fire tab taps while a navigation is still in flight.
  // Without this, hammering different tabs confuses AnimatePresence and
  // can leave ghost pages stacked. We open a short cooldown window on
  // every navigation and ignore taps/swipes that land inside it.
  const navLockUntilRef = useRef<number>(0);
  const isNavLocked = useCallback(() => Date.now() < navLockUntilRef.current, []);
  const lockNav = useCallback(() => {
    // Match the longest tab transition (~360ms tab-layer slide).
    navLockUntilRef.current = Date.now() + 380;
  }, []);
  useEffect(() => {
    lockNav();
  }, [location.pathname, lockNav]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isActive = useCallback(
    (path: string) =>
      path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
    [location.pathname],
  );

  const activeIndex = tabs.findIndex(tab => isActive(tab.path));
  const safeActiveIndex = activeIndex < 0 ? tabs.findIndex(t => t.key === 'home') : activeIndex;

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const setDragState = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const totalTabs = tabs.length;
  const itemWidth = containerWidth / totalTabs;

  const computeIndexFromX = useCallback(
    (x: number) => {
      if (containerWidth <= 0 || totalTabs === 0) return 0;
      const slot = Math.floor(x / itemWidth);
      const clamped = Math.max(0, Math.min(totalTabs - 1, slot));
      // Flexbox with `flex-direction: row` reverses the visual order of
      // children when the container is RTL: the rightmost slot in
      // physical pixels corresponds to `tabs[0]`, and the leftmost to
      // `tabs[N-1]`. Because we measure x from the physical left, we
      // must mirror the index in RTL — otherwise dragging "right"
      // (toward the visually-next tab in Arabic) snaps to the wrong
      // logical tab and navigates somewhere unrelated.
      return rtl ? totalTabs - 1 - clamped : clamped;
    },
    [containerWidth, itemWidth, totalTabs, rtl],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const surface = containerRef.current;
      if (!surface) return;
      const rect = surface.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const idx = computeIndexFromX(x);
      setDragState({ startX: x, x, index: idx, moved: false });
      // Warm the target tab's module the instant the finger lands —
      // by the time pointerup fires (~150–300ms later) the chunk has
      // usually arrived, so the navigation feels free.
      const target = tabs[idx];
      if (target) prefetchRoute(target.path);
      try { surface.setPointerCapture(e.pointerId); } catch { /* noop */ }
    },
    [computeIndexFromX, setDragState],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const prev = dragRef.current;
      if (!prev) return;
      const surface = containerRef.current;
      if (!surface) return;
      const rect = surface.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newIndex = computeIndexFromX(x);
      if (newIndex !== prev.index) {
        try { navigator.vibrate?.(4); } catch { /* noop */ }
        const t = tabs[newIndex];
        if (t) prefetchRoute(t.path);
      }
      setDragState({
        ...prev,
        x,
        index: newIndex,
        moved: prev.moved || Math.abs(x - prev.startX) > DRAG_COMMIT_SLOP,
      });
    },
    [computeIndexFromX, setDragState],
  );

  const endDrag = useCallback(
    (commit: boolean, pointerId?: number) => {
      const prev = dragRef.current;
      if (!prev) return;
      const surface = containerRef.current;
      if (surface && pointerId !== undefined) {
        try { surface.releasePointerCapture(pointerId); } catch { /* noop */ }
      }
      setDragState(null);
      // Navigate on ANY committed pointer interaction — both a plain tap
      // (no movement) and a horizontal swipe land here on pointerup.
      //
      // Why we navigate from the pointer flow instead of relying on the
      // per-button `onClick`: the container calls `setPointerCapture`
      // for smooth drag tracking, and the Pointer Events spec lets the
      // browser dispatch the follow-up compatibility `click` to the
      // CAPTURE TARGET (this container) rather than the <button> the
      // finger lifted over. On Chromium / Android that means a tab tap
      // never reaches the button's onClick, so taps silently did
      // nothing. Handling navigation here makes every tap and swipe
      // work; the button's onClick is reduced to keyboard-only (see the
      // `e.detail === 0` guard there) so we never double-navigate.
      //
      // `onPointerCancel` passes commit=false (e.g. the gesture turned
      // into a vertical page scroll under `touch-action: pan-y`), so
      // scrolling the page from the bar never triggers a navigation.
      if (commit) {
        const target = tabs[prev.index];
        if (target && location.pathname !== target.path && !isNavLocked()) {
          navigate(target.path);
          lockNav();
        }
      }
    },
    [navigate, location.pathname, setDragState, isNavLocked, lockNav],
  );

  const onPointerUp     = useCallback((e: React.PointerEvent<HTMLDivElement>) => endDrag(true,  e.pointerId), [endDrag]);
  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => endDrag(false, e.pointerId), [endDrag]);

  const dragging    = drag !== null;
  const visualIndex = drag ? drag.index : safeActiveIndex;

  if (!TAB_PATHS.has(location.pathname) || inChatConversation) return null;

  return (
    <nav
      data-bottom-nav
      data-tide-bar
      className="bottom-nav"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
        left: 10,
        right: 10,
        zIndex: 9999,
        /* Isolate this element from any ancestor transforms/contain */
        isolation: 'isolate',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: 58,
          width: '100%',
          maxWidth: 520,
          background: 'hsl(var(--card) / 0.78)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          backdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid hsl(var(--border) / 0.45)',
          borderRadius: 999,
          boxShadow:
            '0 12px 32px -12px rgba(0,0,0,0.55), 0 2px 8px -2px rgba(0,0,0,0.35), inset 0 1px 0 hsl(var(--foreground) / 0.04)',
          touchAction: 'pan-y',
          cursor: dragging ? 'grabbing' : undefined,
          position: 'relative',
          pointerEvents: 'auto',
          overflow: 'hidden',
          padding: '0 4px',
        }}
      >
        {tabs.map((tab, i) => {
          const visuallyActive = i === visualIndex;
          const routeActive    = i === safeActiveIndex;
          const Icon = tab.icon;
          const showBadge = tab.key === 'chat' && unreadCount > 0;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={(e) => {
                // Pointer taps and swipes are handled in the pointer
                // flow (see `endDrag`), because pointer capture on the
                // container can retarget the synthetic mouse `click`
                // away from this button. A pointer-generated click has
                // `detail >= 1`; a keyboard activation (Enter / Space on
                // the focused button) has `detail === 0`. We therefore
                // only navigate here for keyboard clicks — this keeps
                // the tab bar fully keyboard-accessible without
                // double-navigating on pointer interactions.
                if (e.detail !== 0) return;
                if (location.pathname !== tab.path && !isNavLocked()) {
                  navigate(tab.path);
                  lockNav();
                }
              }}
              aria-label={t(tab.labelKey)}
              aria-current={routeActive ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0,
                background: 'transparent',
                border: 'none',
                padding: '6px 0 5px',
                cursor: 'pointer',
                position: 'relative',
                touchAction: 'pan-y',
                minWidth: 0,
              }}
            >
              {/* Icon zone — no container; a soft copper halo breathes behind the active icon. */}
              <div
                className="relative flex items-center justify-center"
                style={{
                  marginTop: 2,
                  width: 40,
                  height: 32,
                }}
              >
                {/* Cymatic resonance — three concentric copper rings that
                    ripple outward continuously from the active icon, like
                    a stone dropped in still water. Each ring is a 1px
                    hairline; staggered delays produce a calm, perpetual
                    pulse that reads as "resonance" rather than decoration. */}
                {visuallyActive && [0, 1.3, 2.6].map((delay, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="nav-cymatic"
                    style={{
                      position: 'absolute',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '1.5px solid hsl(var(--live) / 0.75)',
                      boxShadow: '0 0 10px 0 hsl(var(--live-glow) / 0.4)',
                      opacity: 0,
                      animation: `cymatic-ripple 3.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s infinite`,
                      pointerEvents: 'none',
                      willChange: 'transform, opacity',
                    }}
                  />
                ))}

                {/* Inner copper core — soft warm anchor under the icon so
                    the rings have something to emanate from. */}
                <span
                  aria-hidden
                  className={visuallyActive ? 'nav-halo-breath' : undefined}
                  style={{
                    position: 'absolute',
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background:
                      'radial-gradient(circle at center, hsl(var(--live) / 0.45) 0%, hsl(var(--live) / 0.12) 60%, transparent 82%)',
                    filter: 'blur(2px)',
                    opacity: visuallyActive ? 1 : 0,
                    transform: visuallyActive ? 'scale(1)' : 'scale(0.55)',
                    transition: dragging
                      ? 'none'
                      : 'opacity 0.42s cubic-bezier(0.34,1.56,0.64,1), transform 0.42s cubic-bezier(0.34,1.56,0.64,1)',
                    animation: visuallyActive ? 'halo-breath 5s ease-in-out infinite' : 'none',
                    pointerEvents: 'none',
                  }}
                />

                <Icon
                  size={18}
                  strokeWidth={visuallyActive ? 2.25 : 1.75}
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    color: visuallyActive
                      ? LIVE
                      : 'hsl(var(--muted-foreground) / 0.7)',
                    transform: visuallyActive ? 'scale(1.08)' : 'scale(1)',
                    transition: dragging
                      ? 'none'
                      : 'color 0.3s ease, stroke-width 0.3s ease, transform 0.38s cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                />

                {showBadge && (
                  <span
                    aria-label={`${unreadCount} ${t('nav.chat')}`}
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -4,
                      minWidth: 14,
                      height: 14,
                      padding: '0 3px',
                      borderRadius: 999,
                      fontSize: 8,
                      fontWeight: 700,
                      lineHeight: '14px',
                      background: '#ef4444',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>

              {/* Label — always visible, color denotes active */}
              <span
                style={{
                  marginTop: 2,
                  fontSize: '9px',
                  fontWeight: visuallyActive ? 700 : 500,
                  letterSpacing: 0,
                  direction: 'rtl',
                  color: visuallyActive ? LIVE : 'hsl(var(--muted-foreground) / 0.75)',
                  opacity: 1,
                  transition: dragging
                    ? 'none'
                    : 'color 0.28s ease, font-weight 0.2s ease',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
