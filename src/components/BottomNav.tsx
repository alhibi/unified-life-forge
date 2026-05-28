import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useInChatConversation } from '@/lib/inChatConversation';
import {
  House, Dices, Compass, BookOpen, MessageCircle, HeartPulse, CloudSun,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

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
  color: string;
};

const tabs: Tab[] = [
  { key: 'games',    path: '/games',    icon: Dices,         labelKey: 'nav.games',    color: '#fb923c' },
  { key: 'chat',     path: '/chat',     icon: MessageCircle, labelKey: 'nav.chat',     color: '#7dd3fc' },
  { key: 'wellness', path: '/wellness', icon: HeartPulse,    labelKey: 'nav.wellness', color: '#34d399' },
  { key: 'home',     path: '/',         icon: House,         labelKey: 'nav.home',     color: '#c4b5fd' },
  // Weather sits between Home and Browse so the bar groups by mental
  // mode: utility/social on the left → home anchor → utility/info on
  // the right (weather, browse, mihrab).
  { key: 'weather',  path: '/weather',  icon: CloudSun,      labelKey: 'nav.weather',  color: '#22d3ee' },
  { key: 'browse',   path: '/browse',   icon: Compass,       labelKey: 'nav.browse',   color: '#a78bfa' },
  { key: 'mihrab',   path: '/mihrab',   icon: BookOpen,      labelKey: 'nav.mihrab',   color: '#fcd34d' },
];

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
export const BOTTOM_NAV_HEIGHT = 62;

/** All paths where BottomNav renders — exported so App.tsx can reserve
 *  the correct paddingBottom without duplicating the list. */
export const BOTTOM_NAV_PATHS = new Set(tabs.map(t => t.path));

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
      setDragState({ startX: x, x, index: computeIndexFromX(x), moved: false });
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
      if (commit && prev.moved) {
        const target = tabs[prev.index];
        if (target && location.pathname !== target.path) {
          navigate(target.path);
        }
      }
    },
    [navigate, location.pathname, setDragState],
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
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        /* Safe-area fills the home-indicator notch with the bar bg.
           No transform here — any transform on a fixed element can
           break sub-pixel rendering on iOS Safari. will-change is
           enough to get a compositor layer. */
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        willChange: 'transform',
      }}
    >
      {/* Top separator line — clean edge between content and nav */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'hsl(var(--border) / 0.5)',
          zIndex: 1,
        }}
      />

      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: 62,
          background: 'hsl(var(--card) / 0.92)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          touchAction: 'pan-y',
          cursor: dragging ? 'grabbing' : undefined,
          position: 'relative',
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
              onClick={() => {
                if (location.pathname !== tab.path) navigate(tab.path);
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
                padding: '8px 0 6px',
                cursor: 'pointer',
                position: 'relative',
                touchAction: 'pan-y',
                minWidth: 0,
              }}
            >
              {/* Active indicator dot — top of icon slot */}
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: visuallyActive ? 20 : 4,
                  height: 3,
                  borderRadius: 999,
                  background: visuallyActive ? tab.color : 'transparent',
                  transition: dragging
                    ? 'none'
                    : 'width 0.35s cubic-bezier(0.34,1.56,0.64,1), background 0.25s ease',
                }}
              />

              {/* Icon container */}
              <div
                className="relative flex items-center justify-center"
                style={{
                  marginTop: 8,
                  width: 44,
                  height: 32,
                  borderRadius: 10,
                  background: visuallyActive
                    ? `${tab.color}18`
                    : 'transparent',
                  transform: visuallyActive ? 'scale(1.05)' : 'scale(1)',
                  transition: dragging
                    ? 'none'
                    : [
                        'transform 0.38s cubic-bezier(0.34,1.56,0.64,1)',
                        'background 0.3s ease',
                      ].join(', '),
                }}
              >
                <Icon
                  size={21}
                  strokeWidth={visuallyActive ? 2.25 : 1.75}
                  style={{
                    color: visuallyActive
                      ? tab.color
                      : 'hsl(var(--muted-foreground) / 0.7)',
                    transition: dragging ? 'none' : 'color 0.3s ease, stroke-width 0.3s ease',
                  }}
                />

                {showBadge && (
                  <span
                    aria-label={`${unreadCount} ${t('nav.chat')}`}
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -2,
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      borderRadius: 999,
                      fontSize: 9,
                      fontWeight: 700,
                      lineHeight: '16px',
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

              {/* Label */}
              <span
                aria-hidden={!visuallyActive}
                style={{
                  marginTop: 3,
                  fontSize: '9.5px',
                  fontWeight: 600,
                  letterSpacing: 0,
                  direction: 'rtl',
                  color: tab.color,
                  opacity: visuallyActive ? 1 : 0,
                  transform: visuallyActive ? 'translateY(0) scale(1)' : 'translateY(3px) scale(0.9)',
                  transition: dragging
                    ? 'none'
                    : [
                        'opacity 0.28s cubic-bezier(0.16,1,0.3,1)',
                        'transform 0.32s cubic-bezier(0.34,1.56,0.64,1)',
                      ].join(', '),
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
