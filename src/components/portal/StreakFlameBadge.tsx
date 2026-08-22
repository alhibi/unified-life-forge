/**
 * StreakFlameBadge — the app-wide commitment flame.
 *
 * A hand-crafted SVG flame (not a stock glyph) whose heat grows with the
 * user's real unified streak: ember → spark → torch → inferno. The number
 * sits inside the flame's core so flame + count read as one bare object:
 * no chip, no box, no background — just fire and its number floating free.
 *
 * Single instance: rendered once in the Portal header, beside the avatar.
 */
import { motion } from 'framer-motion';
import { memo, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  calculate365DayContributions,
} from '@/features/profile/lib/activityAggregator';
import {
  buildStreakSnapshot,
  type StreakSnapshot,
} from '@/features/profile/lib/streakEngine';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Heat tiers — drive color, glow and inner-core animation             */
/* ------------------------------------------------------------------ */

export function flameTier(days: number): number {
  if (days >= 100) return 5; // inferno
  if (days >= 30) return 4; // blaze
  if (days >= 14) return 3; // torch
  if (days >= 7) return 2; // flame
  if (days >= 3) return 1; // spark
  return 0; // ember
}

interface TierTheme {
  /** Gradient stops for the flame body, bottom → top. */
  stops: [string, string, string];
  /** Outer glow color. */
  glow: string;
  /** Glow opacity range for the breathing animation. */
  glowOpacity: [number, number];
  /** Core color (the hot center behind the number). */
  core: string;
}

const TIER_THEMES: TierTheme[] = [
  // 0 · ember — quiet ash-grey with a faint warm pulse
  { stops: ['#9CA3AF', '#6B7280', '#4B5563'], glow: 'rgba(156,163,175,0.35)', glowOpacity: [0.15, 0.3], core: 'rgba(255,255,255,0.85)' },
  // 1 · spark — first warmth
  { stops: ['#FDBA74', '#FB923C', '#EA580C'], glow: 'rgba(251,146,60,0.5)', glowOpacity: [0.25, 0.5], core: 'rgba(255,251,235,0.95)' },
  // 2 · flame — committed week
  { stops: ['#FCD34D', '#F59E0B', '#DC2626'], glow: 'rgba(245,158,11,0.55)', glowOpacity: [0.35, 0.65], core: 'rgba(255,255,240,0.95)' },
  // 3 · torch — two weeks of will
  { stops: ['#FDE047', '#F97316', '#B91C1C'], glow: 'rgba(249,115,22,0.6)', glowOpacity: [0.45, 0.75], core: 'rgba(255,255,245,1)' },
  // 4 · blaze — monthly iron will
  { stops: ['#FEF08A', '#F97316', '#991B1B'], glow: 'rgba(239,68,68,0.65)', glowOpacity: [0.5, 0.85], core: 'rgba(255,255,250,1)' },
  // 5 · inferno — legendary
  { stops: ['#FEF9C3', '#FBBF24', '#7F1D1D'], glow: 'rgba(220,38,38,0.7)', glowOpacity: [0.55, 0.95], core: 'rgba(255,255,255,1)' },
];

/* ------------------------------------------------------------------ */
/* Hook — shared streak state (external store, computed once)          */
/* ------------------------------------------------------------------ */

let cachedSnapshot: StreakSnapshot | null = null;
let snapshotComputed = false;

const snapshotStore = {
  subscribe(listener: () => void): () => void {
    // The snapshot is immutable per page-load; re-subscribers get the
    // current value instantly. Storage events could invalidate it, but
    // activity data only changes through in-app actions that remount us.
    window.addEventListener('streak-invalidate', listener);
    return () => window.removeEventListener('streak-invalidate', listener);
  },
  getSnapshot(): StreakSnapshot | null {
    if (!snapshotComputed) {
      try {
        const cells = calculate365DayContributions().dailyContributions;
        cachedSnapshot = buildStreakSnapshot(cells);
      } catch {
        cachedSnapshot = null;
      }
      snapshotComputed = true;
    }
    return cachedSnapshot;
  },
  getServerSnapshot(): StreakSnapshot | null {
    return null; // SSR: no localStorage — render nothing until hydration.
  },
};

/** Reads (and caches) the unified streak without re-walking storage on every mount. */
export function useUnifiedStreakDays(): number | null {
  const snapshot = useSyncExternalStore(
    snapshotStore.subscribe,
    snapshotStore.getSnapshot,
    snapshotStore.getServerSnapshot,
  );
  return snapshot?.unified.currentStreakDays ?? null;
}

/* ------------------------------------------------------------------ */
/* The flame SVG                                                       */
/* ------------------------------------------------------------------ */

interface FlameMarkProps {
  tier: number;
  size: number;
  gradientId: string;
}

/**
 * Layered flame geometry: outer body (sways), inner tongue (counter-sways),
 * hot core disc behind the number. Sway is a slow rotate around the base —
 * organic fire movement with zero image assets.
 */
const FlameMark = memo(function FlameMark({ tier, size, gradientId }: FlameMarkProps) {
  const theme = TIER_THEMES[Math.min(tier, TIER_THEMES.length - 1)];

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="overflow-visible">
      <defs>
        <linearGradient id={`${gradientId}-body`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={theme.stops[2]} />
          <stop offset="55%" stopColor={theme.stops[1]} />
          <stop offset="100%" stopColor={theme.stops[0]} />
        </linearGradient>
        <radialGradient id={`${gradientId}-core`} cx="0.5" cy="0.62" r="0.55">
          <stop offset="0%" stopColor={theme.core} />
          <stop offset="100%" stopColor={theme.core} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer swaying body */}
      <motion.g
        style={{ originX: '24px', originY: '44px' }}
        animate={{ rotate: [-3.5, 3.5, -3.5], scaleX: [1, 1.04, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Main teardrop */}
        <path
          d="M24 4 C27 12 36 16 36 27 A12 13.5 0 0 1 12 27 C12 19 19 14 20 8 C21.5 12 23 13.5 24 4 Z"
          fill={`url(#${gradientId}-body)`}
        />
        {/* Counter-swaying inner tongue */}
        <motion.path
          d="M24 17 C26 21 30 23 30 29 A6 7 0 0 1 18 29 C18 25 22 22 24 17 Z"
          fill="rgba(255,255,255,0.32)"
          style={{ originX: '24px', originY: '40px' }}
          animate={{ rotate: [4, -4, 4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.g>

      {/* Hot core */}
      <circle cx="24" cy="30" r="8.5" fill={`url(#${gradientId}-core)`} />
    </svg>
  );
});

/* ------------------------------------------------------------------ */
/* Public badge                                                        */
/* ------------------------------------------------------------------ */

export interface StreakFlameBadgeProps {
  /** Optional override for tests/storybook. */
  daysOverride?: number | null;
  onClick?: () => void;
}

function StreakFlameBadgeImpl({ daysOverride, onClick }: StreakFlameBadgeProps) {
  const navigate = useNavigate();
  const liveDays = useUnifiedStreakDays();
  const days = daysOverride !== undefined && daysOverride !== null ? daysOverride : liveDays;

  const tier = flameTier(days ?? 0);
  const theme = TIER_THEMES[Math.min(tier, TIER_THEMES.length - 1)];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/profile');
    }
  };

  /* Not signed in / no data at all → render nothing (never a fake zero). */
  if (days === null) return null;

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      aria-label={`سلسلة الالتزام: ${days} ${days === 1 ? 'يوم' : 'أيام'} متتالية`}
      title={`سلسلة نشاطك المتواصل: ${days} ${days === 1 ? 'يوم' : 'أيام'}`}
      className={cn(
        'group relative flex select-none items-center outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring rounded-full',
      )}
    >
      {/* Soft breathing halo directly behind the fire — no box, just light. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-1 top-1/2 h-[34px] w-[52px] -translate-y-1/2 rounded-full blur-lg"
        style={{ background: theme.glow }}
        animate={{ opacity: theme.glowOpacity }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* The flame mark itself */}
      <span className="relative">
        <FlameMark tier={tier} size={30} gradientId="streak-flame" />
      </span>

      {/* Count — tabular so it never jitters as it climbs */}
      <motion.span
        key={days}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        className="relative ps-0.5 text-[17px] font-black leading-none text-foreground"
        style={{
          fontVariantNumeric: 'tabular-nums',
          textShadow: tier >= 2 ? `0 0 12px ${theme.glow}` : undefined,
        }}
      >
        {days}
      </motion.span>
    </motion.button>
  );
}

export const StreakFlameBadge = memo(StreakFlameBadgeImpl);
