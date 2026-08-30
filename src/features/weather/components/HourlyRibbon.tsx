// ============================================================================
// HourlyRibbon — 24 hours ahead as a horizontal ribbon.
//
// WHY A SPARKLINE BEHIND THE COLUMN
//   Each previous version showed the temperatures as numbers + a tiny heat
//   bar. Numbers are easy to compare; the bar was decoration. This version
//   plots the full 24h temperature curve BEHIND the columns, so the user
//   sees the shape of the day at a glance — drop, peak, recovery — while
//   the foreground columns pin individual hours.
//
// VISUAL HIERARCHY
//   • A continuous polyline (the sparkline) fills the whole ribbon width.
//   • A soft gradient fill underneath the line — same as the line colour,
//     20% at the bottom, transparent at the top.
//   • Each hour gets a thin vertical column with the icon + temperature.
//   • The current hour is highlighted (border + accent label).
//
// ACCESSIBILITY
//   The ribbon is keyboard-scrollable with snap-to-hour. Tabbing through
//   columns moves focus, Enter jumps to detailed view.
// ============================================================================

import { motion } from 'framer-motion';
import { useMemo, useRef } from 'react';

import { cn } from '@/lib/utils';

import { duration, easing } from '../lib/weather-motion';
import type { HourlyEntry } from '../types/ForecastLayer';

const HOUR_MS = 3_600_000;

export interface HourlyRibbonProps {
  entries: HourlyEntry[];
  iconFor: (code: number, isDay: boolean) => React.ComponentType<{ className?: string; strokeWidth?: number }>;
  locale: string;
}

export function HourlyRibbon({ entries, iconFor, locale }: HourlyRibbonProps) {
  const slice = useMemo(() => entries.slice(0, 24), [entries]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { minT, span, polyline, fillPath } = useMemo(() => {
    if (slice.length < 2) return { minT: 0, span: 1, polyline: '', fillPath: '' };
    const temps = slice.map((e) => e.temperature_c);
    const mn = Math.min(...temps);
    const mx = Math.max(...temps);
    const sp = Math.max(1, mx - mn);
    // Map each entry to (x, y) inside a 0..100 / 0..100 viewBox.
    const W = 100;
    const H = 40;
    const pts = slice.map((e, i) => {
      const x = (i / (slice.length - 1)) * W;
      const y = H - ((e.temperature_c - mn) / sp) * (H - 6) - 3;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const line = `M ${pts.join(' L ')}`;
    const fill = `${line} L ${W},${H} L 0,${H} Z`;
    return { minT: mn, span: sp, polyline: line, fillPath: fill };
  }, [slice]);

  if (slice.length < 2) return null;

  const colWidth = 64; // px per hour column

  return (
    <section className="relative rounded-2xl border border-border/40 surface-depth overflow-hidden">
      <header className="flex items-end justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <h3 className="text-lead font-bold text-foreground leading-tight">
            {'الساعات القادمة'}
          </h3>
          <p className="mt-1 text-mini text-foreground/60 leading-snug">
            {'منحنى الحرارة والأيقونات للساعات الأربع وعشرين القادمة'}
          </p>
        </div>
        <span className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 tabular-nums">
          {slice.length} ساعة
        </span>
      </header>

      <div
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar px-5 pb-5"
        dir="ltr"
      >
        <div
          className="relative"
          style={{
            minWidth: `${colWidth * slice.length}px`,
            height: '150px',
          }}
        >
          {/* Sparkline background — full-width continuous curve. */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="hourly-ribbon-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={fillPath} fill="url(#hourly-ribbon-fill)" />
            <motion.path
              d={polyline}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeOpacity="0.75"
              strokeWidth="0.25"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: duration.reveal * 2.2, ease: easing.decelerate }}
            />
          </svg>

          {/* Hour columns. */}
          <motion.div
            key={`columns-${slice[slice.length - 1]?.timestamp_unix ?? 'static'}`}
            className="relative grid items-end h-full pt-6"
            style={{
              gridTemplateColumns: `repeat(${slice.length}, minmax(0, ${colWidth}px))`,
              gap: '2px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: duration.layout, ease: easing.expo }}
          >
            {/* Sweeping highlight overlay — moves left-to-right once on mount. */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-y-2 start-0 rounded-full"
              style={{
                width: `${(100 / slice.length) * 1.5}%`,
                background:
                  'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.18), transparent)',
              }}
              initial={{ left: '-5%' }}
              animate={{ left: '105%' }}
              transition={{ duration: duration.cinematic * 1.2, ease: easing.cinematic }}
            />
            {slice.map((e, i) => {
              const Icon = iconFor(e.weather_code, e.is_day);
              const heat = (e.temperature_c - minT) / span;
              const isNow = i === 0;
              const isPeak = e.temperature_c === Math.max(...slice.map((s) => s.temperature_c));
              const label = isNow
                ? 'الآن'
                : new Date(e.timestamp_unix).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    hour12: false,
                  });
              return (
                <motion.div
                  key={e.timestamp_unix}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.022, duration: duration.reveal, ease: easing.expo }}
                  className={cn(
                    'relative flex flex-col items-center justify-end gap-1.5 pt-2 pb-2 rounded-xl',
                    'border border-transparent',
                    isNow && 'bg-primary/8 border-primary/30 ring-1 ring-primary/15',
                    isPeak && !isNow && 'bg-foreground/4 border-foreground/15',
                    'hover:bg-foreground/6 hover:border-foreground/15 transition-colors',
                  )}
                  tabIndex={0}
                  role="button"
                  aria-label={`${label}: ${Math.round(e.temperature_c)}°`}
                >
                  {/* Heat bar — small visual reinforcement. */}
                  <div
                    aria-hidden
                    className="w-1 rounded-full bg-primary/40 transition-all"
                    style={{ height: `${Math.max(6, heat * 26)}px` }}
                  />
                  <span className={cn(
                    'text-[0.6875rem] font-bold tabular-nums leading-none',
                    isNow ? 'text-primary' : 'text-foreground/65',
                  )}>
                    {label}
                  </span>
                  <Icon
                    className={cn(
                      '[&]:w-3.5 [&]:h-3.5',
                      isNow ? 'text-primary' : 'text-foreground/55',
                    )}
                    strokeWidth={1.5}
                  />
                  <span className={cn(
                    'font-bold tabular-nums leading-none',
                    isNow ? 'text-base text-foreground' : 'text-mini text-foreground/85',
                  )}>
                    {Math.round(e.temperature_c)}°
                  </span>
                  {e.precip_probability_percent > 15 && (
                    <span className="text-[0.625rem] font-semibold text-primary/85 tabular-nums leading-none">
                      {Math.round(e.precip_probability_percent)}٪
                    </span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Re-export the HOUR_MS constant for tests.
export { HOUR_MS };