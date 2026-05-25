import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import {
  House, Dices, Compass, BookOpen, MessageCircle, HeartPulse,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * TideBar
 * ──────────────────────────────────────────────────────────────────────────
 * A bottom navigation bar with no chips, pills, or backgrounds.
 * Instead, an SVG wave rises beneath the active icon, the way water is
 * pulled up by gravity. Wave fill, crest glow, top hairline, active icon
 * and label all share the active tab's accent color, so the bar feels
 * alive and breathing rather than mechanical.
 *
 * Floating + theme-aware:
 *   • Surface uses hsl(var(--card)) + backdrop-blur so the bar adapts
 *     to light / dark / MD3 themes instead of being hard-coded dark.
 *   • Sits ~10px above the screen bottom (above safe-area inset) with
 *     a soft two-layer shadow → feels like it's hovering, not glued.
 *   • Inactive icons use the app's `--muted-foreground` token so they
 *     read correctly in every theme.
 *   • Easing tokens (--ease-spring, --ease-out-expo) are reused so the
 *     bar's physics match the rest of the app.
 *
 * Touch interactions:
 *   • TAP a tab → navigate (button onClick).
 *   • DRAG horizontally on the bar → the wave follows the finger and
 *     the icon under the finger lifts in real time. Release to commit
 *     the destination, even if the finger crossed multiple tabs. CSS
 *     transitions are switched off during the drag so the wave moves
 *     at exactly finger-speed; on release the spring eases re-engage.
 *   • `touch-action: pan-y` on the surface so vertical page scroll
 *     still passes through when the gesture starts on the bar.
 *
 * Routing logic (where the bar appears, which tab is active, navigation,
 * unread chat badge, RTL visual ordering) is preserved 1:1 with the
 * previous BottomNav implementation.
 */

type Tab = {
  key: string;
  path: string;
  icon: typeof House;
  labelKey: string;
  /** Curated per-tab accent color — drives wave, crest, hairline, label. */
  color: string;
};

// Visual order, left → right. The previous (7-tab) layout has been
// retired in favour of 6 hub destinations that mirror the user's
// mental modes (now / play / talk / body / discover / reflect):
//   • settings, duas, diwan are no longer top-level tabs:
//       – Settings is now reached via the avatar shortcut on Home.
//       – Duas content lives under /mihrab → Dhikr.
//       – Diwan content lives under /mihrab → Literature.
//   • New tabs: `mihrab` (gold) consolidates Quran/Dhikr/Sunnah/
//     Literature; `browse` (violet) consolidates Podcasts + Articles.
//
// Right-most slot is the most prominent in RTL (the user's eye lands
// there first), so we put `mihrab` at the right and keep `home`
// near the centre as the anchor.
const tabs: Tab[] = [
  { key: 'games',    path: '/games',    icon: Dices,         labelKey: 'nav.games',    color: '#fb923c' },
  { key: 'chat',     path: '/chat',     icon: MessageCircle, labelKey: 'nav.chat',     color: '#7dd3fc' },
  { key: 'wellness', path: '/wellness', icon: HeartPulse,    labelKey: 'nav.wellness', color: '#34d399' },
  { key: 'home',     path: '/',         icon: House,         labelKey: 'nav.home',     color: '#c4b5fd' },
  { key: 'browse',   path: '/browse',   icon: Compass,       labelKey: 'nav.browse',   color: '#a78bfa' },
  { key: 'mihrab',   path: '/mihrab',   icon: BookOpen,      labelKey: 'nav.mihrab',   color: '#fcd34d' },
];

// Show the bar only on these top-level destinations (same gate as before).
const TAB_PATHS = new Set<string>(tabs.map(t => t.path));

// Reuse the app's easing tokens so the bar speaks the same motion
// dialect as cards, sheets, and the sidebar. Inline fallbacks keep the
// curve identical even on browsers that mis-resolve var() in transitions.
const SPRING   = 'var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))';
const OUT_EXPO = 'var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))';

// Pointer must move past this distance for us to treat the gesture as
// a swipe instead of a tap. Below the threshold, the inner button's
// onClick handles navigation cleanly.
const TAP_SLOP = 4;

/**
 * Bell-curve cubic bezier that lifts the wave under the active tab.
 * The baseline sits at y=22 inside a 64px tall SVG; the fill area
 * extends down to y=64 (bottom of SVG).
 */
function buildPath(cx: number, containerWidth: number, itemWidth: number, lift = 26) {
  const left  = Math.max(0, cx - itemWidth * 1.6);
  const right = Math.min(containerWidth, cx + itemWidth * 1.6);
  return `
    M0,22
    L${left},22
    Q${cx - itemWidth * 0.8},22
      ${cx - itemWidth * 0.28},${22 - lift * 0.55}
    Q${cx},${22 - lift}
      ${cx + itemWidth * 0.28},${22 - lift * 0.55}
    Q${cx + itemWidth * 0.8},22
      ${right},22
    L${containerWidth},22
    L${containerWidth},64
    L0,64
    Z
  `;
}

type DragState = {
  /** Where the gesture started, relative to the bar's left edge (CSS px). */
  startX: number;
  /** Latest finger X relative to the bar's left edge. */
  x: number;
  /** Tab slot under the finger (clamped 0..totalTabs-1). */
  index: number;
  /** True once the finger has moved past TAP_SLOP. */
  moved: boolean;
};

export default function TideBar() {
  const { t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();

  // ── Live container width ──────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 360,
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

  // ── Active tab resolution (unchanged from previous behavior) ──────────
  const isActive = useCallback(
    (path: string) =>
      path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
    [location.pathname],
  );

  const activeIndex = tabs.findIndex(tab => isActive(tab.path));
  const safeActiveIndex = activeIndex < 0 ? tabs.findIndex(t => t.key === 'home') : activeIndex;

  // ── Swipe-to-switch state ─────────────────────────────────────────────
  // dragRef mirrors `drag` so high-frequency pointer handlers can read
  // the latest value without recreating the callback on every move.
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const setDragState = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const totalTabs = tabs.length;
  const itemWidth = containerWidth / totalTabs;
  const lift = 26;

  const computeIndexFromX = useCallback(
    (x: number) => {
      if (containerWidth <= 0 || totalTabs === 0) return 0;
      const slot = Math.floor(x / itemWidth);
      return Math.max(0, Math.min(totalTabs - 1, slot));
    },
    [containerWidth, itemWidth, totalTabs],
  );

  // ── Pointer handlers ──────────────────────────────────────────────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Right/middle mouse-click should not start a drag.
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const surface = containerRef.current;
      if (!surface) return;
      const rect = surface.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setDragState({
        startX: x,
        x,
        index: computeIndexFromX(x),
        moved: false,
      });
      // Capture so we keep getting move/up events even if the finger
      // leaves the bar (e.g., overshoots the right edge mid-drag).
      try {
        surface.setPointerCapture(e.pointerId);
      } catch {
        /* iOS Safari may throw on edge cases — gesture still works. */
      }
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
      // Tiny haptic when the finger crosses into a new tab slot — gives
      // the gesture physical "click" feedback on Android. Silently
      // ignored on iOS Safari (no Vibration API).
      if (newIndex !== prev.index) {
        try { navigator.vibrate?.(3); } catch { /* noop */ }
      }
      setDragState({
        ...prev,
        x,
        index: newIndex,
        moved: prev.moved || Math.abs(x - prev.startX) > TAP_SLOP,
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
        try {
          surface.releasePointerCapture(pointerId);
        } catch { /* noop */ }
      }
      setDragState(null);
      if (commit && prev.moved) {
        // Only navigate via the drag path when the user actually moved.
        // For pure taps (moved=false), let the inner button's onClick
        // handle navigation so we don't fight its press feedback.
        const target = tabs[prev.index];
        if (target && location.pathname !== target.path) {
          navigate(target.path);
        }
      }
    },
    [navigate, location.pathname, setDragState],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => endDrag(true, e.pointerId),
    [endDrag],
  );
  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => endDrag(false, e.pointerId),
    [endDrag],
  );

  // ── Visual layer: drag preview overrides location-based active ────────
  const dragging = drag !== null;
  // While dragging, the wave/icons reflect the *previewed* tab so the
  // user gets immediate feedback. aria-current still mirrors the route.
  const visualIndex = drag ? drag.index : safeActiveIndex;
  const visualColor = tabs[visualIndex].color;
  const visualCx = drag
    ? Math.max(itemWidth * 0.5, Math.min(containerWidth - itemWidth * 0.5, drag.x))
    : (visualIndex + 0.5) * itemWidth;
  const wavePath = buildPath(visualCx, containerWidth, itemWidth, lift);

  // Regenerate the gradient id when the previewed tab changes so the
  // SVG forces a fresh paint of the fill instead of relying purely on
  // stop interpolation.
  const baseId = useId();
  const gradientId = `${baseId}-tide-${visualIndex}`;

  // Visibility gate (preserved): only show on top-level destinations.
  if (!TAB_PATHS.has(location.pathname)) return null;

  return (
    <nav
      data-bottom-nav
      data-tide-bar
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{
        // Lift the floating bar above the safe-area inset, then add a
        // small breathing gap. Padding (not margin) so the safe-area
        // grows the wrapper rather than pushing the bar off-screen.
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
        paddingInline: '12px',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="tide-bar-surface relative w-full pointer-events-auto"
        style={{
          height: 68,
          // Theme-aware translucent surface. We layer a tiny tonal
          // overlay so the wave gradient still has contrast even on
          // light themes (where --card is near-white).
          background:
            'linear-gradient(hsl(var(--foreground) / 0.04), hsl(var(--foreground) / 0.04)), hsl(var(--card) / 0.82)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          backdropFilter: 'blur(18px) saturate(160%)',
          borderRadius: 22,
          border: '1px solid hsl(var(--border) / 0.6)',
          // Soft two-layer elevation — present, never shouting.
          boxShadow:
            '0 8px 24px -12px hsl(var(--foreground) / 0.18), 0 2px 6px -2px hsl(var(--foreground) / 0.08)',
          overflow: 'hidden',
          // Allow native vertical page-scroll to pass through when the
          // gesture starts on the bar; capture horizontal moves for
          // our swipe-to-switch logic.
          touchAction: 'pan-y',
          cursor: dragging ? 'grabbing' : undefined,
        }}
      >
        {/* ── Top hairline ──────────────────────────────────────────── */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-0 pointer-events-none"
          style={{
            height: 1,
            background: `linear-gradient(to right, transparent, ${visualColor}55, ${visualColor}80, ${visualColor}55, transparent)`,
            transition: dragging ? 'none' : 'background 0.5s ease',
            zIndex: 3,
          }}
        />

        {/* ── Wave layer ────────────────────────────────────────────── */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width="100%"
          height="100%"
          viewBox={`0 0 ${containerWidth} 64`}
          preserveAspectRatio="none"
          aria-hidden
          style={{ zIndex: 1 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={visualColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={visualColor} stopOpacity="0.04" />
            </linearGradient>
          </defs>

          <path
            d={wavePath}
            fill={`url(#${gradientId})`}
            style={{
              // No transition during drag → wave follows the finger 1:1.
              // On release the spring eases re-engage for a snap-to-rest.
              transition: dragging ? 'none' : `d 0.5s ${SPRING}, fill 0.4s ease`,
            }}
          />

          {/* Crest glow that slides horizontally with the wave peak. */}
          <ellipse
            cx={visualCx}
            cy={22 - lift}
            rx={Math.max(itemWidth * 0.6, 12)}
            ry={3}
            fill={visualColor}
            opacity={0.35}
            style={{
              transition: dragging ? 'none' : `cx 0.5s ${SPRING}, fill 0.4s ease`,
            }}
          />
        </svg>

        {/* ── Icons (absolutely positioned, NOT a flex row) ────────── */}
        {tabs.map((tab, i) => {
          // visuallyActive drives the lift / color so the user sees the
          // preview while dragging. routeActive drives ARIA so screen
          // readers report the real current page.
          const visuallyActive = i === visualIndex;
          const routeActive    = i === safeActiveIndex;
          const Icon = tab.icon;
          const showBadge = tab.key === 'chat' && unreadCount > 0;
          const slotPercent = ((i + 0.5) / totalTabs) * 100;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                // If the user just released a drag, our pointer-up
                // handler has already navigated; calling navigate again
                // with the same path is a no-op so this stays safe.
                if (location.pathname !== tab.path) navigate(tab.path);
              }}
              aria-label={t(tab.labelKey)}
              aria-current={routeActive ? 'page' : undefined}
              className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
              style={{
                left: `calc(${slotPercent}% - 24px)`,
                width: 48,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                zIndex: 4,
                // Inherit the parent's gesture policy so a drag that
                // starts on top of an icon still bubbles cleanly.
                touchAction: 'pan-y',
              }}
            >
              {/* Icon — lifted up out of the wave when active */}
              <div
                className="relative flex items-center justify-center"
                style={{
                  transform: visuallyActive
                    ? 'translateY(-10px) scale(1.08)'
                    : 'translateY(0) scale(1)',
                  opacity: visuallyActive ? 1 : 0.45,
                  // During a drag, snap instantly as the finger crosses
                  // tab boundaries so the lift mirrors the wave; ease
                  // back into spring physics once the gesture ends.
                  transition: dragging
                    ? 'none'
                    : `transform 0.45s ${SPRING}, opacity 0.35s ${OUT_EXPO}`,
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={visuallyActive ? 2.2 : 1.8}
                  style={{
                    color: visuallyActive
                      ? tab.color
                      : 'hsl(var(--muted-foreground))',
                    transition: dragging ? 'none' : 'color 0.4s ease',
                  }}
                />

                {showBadge && (
                  <span
                    aria-label={`${unreadCount} ${t('nav.chat')}`}
                    className="absolute -top-1.5 -right-2 flex items-center justify-center font-bold leading-none"
                    style={{
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      borderRadius: 999,
                      fontSize: 9.5,
                      background: '#ef4444',
                      color: '#ffffff',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>

              {/* Label — only visible for the previewed/active tab */}
              <span
                aria-hidden={!visuallyActive}
                className="absolute"
                style={{
                  bottom: 8,
                  fontSize: '8.5px',
                  fontWeight: 800,
                  direction: 'rtl',
                  color: tab.color,
                  opacity: visuallyActive ? 1 : 0,
                  transform: visuallyActive ? 'translateY(0)' : 'translateY(4px)',
                  transition: dragging
                    ? 'none'
                    : 'opacity 0.3s ease, transform 0.3s ease',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  letterSpacing: 0,
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
