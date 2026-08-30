// ============================================================================
// GaugeTileRefined — refined version of the bento tile.
//
// VISUAL TWEAKS vs GaugeTile
//   • Title gets more breathing room and a clearer hierarchy:
//     eyebrow label + bold value + micro unit + optional hint.
//   • Gauge ring has a wider, softer track and a brighter, longer arc.
//   • Container uses the new UnifiedCard variant=tile — same shadow +
//     rounded corners as every other tile in the feature.
//   • Hover lifts the tile by 2px and brightens the border. Subtle, but
//     it's the micro-detail that makes the page feel alive.
// ============================================================================

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

import { duration, easing } from '../lib/weather-motion';

export interface GaugeTileRefinedProps {
  label: string;
  value: string | number;
  unit?: string;
  /** 0..1 — fraction of the ring to fill. */
  pctValue: number;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function GaugeTileRefined({
  label,
  value,
  unit,
  pctValue,
  hint,
  icon,
  className,
}: GaugeTileRefinedProps) {
  const clamped = Math.max(0, Math.min(1, pctValue));
  const offset = CIRCUMFERENCE * (1 - clamped);

  return (
    <div
      className={cn(
        'group relative rounded-2xl border border-border/40 surface-depth overflow-hidden',
        'p-4 min-w-0 h-full',
        'transition-all hover:-translate-y-0.5 hover:border-border/70',
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
      />

      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/65 truncate">
          {label}
        </span>
        {icon && (
          <span className="[&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:text-primary/70 shrink-0 transition-colors group-hover:text-primary">
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <svg viewBox="0 0 88 88" className="w-16 h-16 shrink-0 -rotate-90">
          <defs>
            <linearGradient id={`gauge-grad-${label}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx="44"
            cy="44"
            r={RADIUS}
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeOpacity="0.08"
            strokeWidth="6"
          />
          <motion.circle
            cx="44"
            cy="44"
            r={RADIUS}
            fill="none"
            stroke={`url(#gauge-grad-${label})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: duration.reveal * 2, ease: easing.decelerate }}
          />
        </svg>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1 tabular-nums" dir="ltr">
            <span className="font-bold text-[1.75rem] leading-none text-foreground tracking-tight">
              {value}
            </span>
            {unit && (
              <span className="text-mini font-bold text-primary/75">{unit}</span>
            )}
          </div>
          {hint && (
            <p className="mt-1.5 text-mini text-foreground/65 font-medium truncate">
              {hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}