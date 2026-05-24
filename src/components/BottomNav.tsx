import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import {
  House, Dices, SlidersHorizontal, HandHeart, Feather, MessageCircle,
  HeartPulse,
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

// Visual order, left → right. In the previous flex+RTL layout `diwan`
// landed on the far right and `settings` on the far left; with absolute
// `left` positioning we keep that exact visual layout by ordering the
// array left → right.
const tabs: Tab[] = [
  { key: 'settings', path: '/settings', icon: SlidersHorizontal, labelKey: 'nav.settings', color: '#94a3b8' },
  { key: 'games',    path: '/games',    icon: Dices,             labelKey: 'nav.games',    color: '#fb923c' },
  { key: 'chat',     path: '/chat',     icon: MessageCircle,     labelKey: 'nav.chat',     color: '#7dd3fc' },
  { key: 'home',     path: '/',         icon: House,             labelKey: 'nav.home',     color: '#c4b5fd' },
  { key: 'wellness', path: '/wellness', icon: HeartPulse,        labelKey: 'nav.wellness', color: '#34d399' },
  { key: 'duas',     path: '/duas',     icon: HandHeart,         labelKey: 'nav.duas',     color: '#fcd34d' },
  { key: 'diwan',    path: '/diwan',    icon: Feather,           labelKey: 'nav.diwan',    color: '#f9a8d4' },
];

// Show the bar only on these top-level destinations (same gate as before).
const TAB_PATHS = new Set<string>(tabs.map(t => t.path));

const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

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

export default function TideBar() {
  const { t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();

  // ── Live container width ──────────────────────────────────────────────
  // The SVG wave is drawn in absolute pixels (viewBox 0 0 W 64), so we
  // measure the bar and re-compute on resize / orientation change.
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
  // Fall back to home (visual middle) so the wave is never off-screen
  // during the brief render before the gate below kicks in.
  const safeActiveIndex = activeIndex < 0 ? tabs.findIndex(t => t.key === 'home') : activeIndex;
  const activeColor = tabs[safeActiveIndex].color;

  // ── Wave geometry ─────────────────────────────────────────────────────
  const totalTabs = tabs.length;
  const itemWidth = containerWidth / totalTabs;
  const cx = (safeActiveIndex + 0.5) * itemWidth;
  const lift = 26;
  const wavePath = buildPath(cx, containerWidth, itemWidth, lift);

  // Regenerate the gradient id when the active tab changes so the SVG
  // forces a fresh paint of the fill instead of relying purely on stop
  // interpolation.
  const baseId = useId();
  const gradientId = `${baseId}-tide-${safeActiveIndex}`;

  // Visibility gate (preserved): only show on top-level destinations.
  if (!TAB_PATHS.has(location.pathname)) return null;

  return (
    <nav
      data-bottom-nav
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        style={{
          height: 72,
          background: '#050510',
          borderRadius: 26,
          border: '1px solid #ffffff07',
        }}
      >
        {/* ── Top hairline ──────────────────────────────────────────── */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-0 pointer-events-none"
          style={{
            height: 1,
            background: `linear-gradient(to right, transparent, ${activeColor}55, ${activeColor}80, ${activeColor}55, transparent)`,
            transition: 'background 0.5s ease',
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
              <stop offset="0%"   stopColor={activeColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={activeColor} stopOpacity="0.04" />
            </linearGradient>
          </defs>

          <path
            d={wavePath}
            fill={`url(#${gradientId})`}
            style={{
              transition: `d 0.5s ${SPRING}, fill 0.4s ease`,
            }}
          />

          {/* Crest glow that slides horizontally with the wave peak. */}
          <ellipse
            cx={cx}
            cy={22 - lift}
            rx={Math.max(itemWidth * 0.6, 12)}
            ry={3}
            fill={activeColor}
            opacity={0.35}
            style={{
              transition: `cx 0.5s ${SPRING}, fill 0.4s ease`,
            }}
          />
        </svg>

        {/* ── Icons (absolutely positioned, NOT a flex row) ────────── */}
        {tabs.map((tab, i) => {
          const active = i === safeActiveIndex;
          const Icon = tab.icon;
          const showBadge = tab.key === 'chat' && unreadCount > 0;
          const slotPercent = ((i + 0.5) / totalTabs) * 100;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.path)}
              aria-label={t(tab.labelKey)}
              aria-current={active ? 'page' : undefined}
              className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
              style={{
                left: `calc(${slotPercent}% - 24px)`,
                width: 48,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                zIndex: 4,
              }}
            >
              {/* Icon — lifted up out of the wave when active */}
              <div
                className="relative flex items-center justify-center"
                style={{
                  transform: active
                    ? 'translateY(-10px) scale(1.08)'
                    : 'translateY(0) scale(1)',
                  opacity: active ? 1 : 0.3,
                  transition: `transform 0.45s ${SPRING}, opacity 0.45s ${SPRING}`,
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.8}
                  style={{
                    color: active ? tab.color : '#aaaacc',
                    transition: 'color 0.4s ease',
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

              {/* Label — only visible for the active tab */}
              <span
                aria-hidden={!active}
                className="absolute"
                style={{
                  bottom: 8,
                  fontSize: '8.5px',
                  fontWeight: 800,
                  direction: 'rtl',
                  color: tab.color,
                  opacity: active ? 1 : 0,
                  transform: active ? 'translateY(0)' : 'translateY(4px)',
                  transition: 'opacity 0.3s ease, transform 0.3s ease',
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
