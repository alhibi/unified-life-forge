// ============================================================================
// DailyRangeStrip — 7-day range visualisation, redesigned.
//
// NEW LAYOUT
//   • Day name + icon + horizontal bar showing min..max range.
//   • Bars are aligned to the same global min/max so the user can compare
//     days at a glance — a hotter day simply stretches further to the right.
//   • Each row's column count increased so the right-aligned min/max has
//     breathing room.
//
// The previous version had a cramped 4-column grid; the new one widens
// the bar column so the visualisation actually has room to breathe.
// ============================================================================

import { motion } from 'framer-motion';
import { useMemo } from 'react';

import { CalendarRange } from '@/lib/icons';

import { duration, easing } from '../lib/weather-motion';

export interface DailyRangeEntry {
  date_unix: number;
  high_c: number;
  low_c: number;
  weather_code: number;
}

interface DailyRangeStripProps {
  days: DailyRangeEntry[];
  iconFor: (code: number, isDay: boolean) => React.ComponentType<{ className?: string; strokeWidth?: number }>;
  locale: string;
}

export function DailyRangeStrip({ days, iconFor, locale }: DailyRangeStripProps) {
  const globalMin = useMemo(() => Math.min(...days.map((d) => d.low_c)), [days]);
  const globalMax = useMemo(() => Math.max(...days.map((d) => d.high_c)), [days]);
  const span = useMemo(() => Math.max(1, globalMax - globalMin), [globalMin, globalMax]);

  if (days.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/40 surface-depth overflow-hidden">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <header className="px-6 pt-6 pb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-lead leading-tight text-foreground">
            <CalendarRange className="w-5 h-5 text-primary" aria-hidden />
            {'الأيام القادمة'}
          </h2>
          <p className="mt-1 text-mini text-foreground/65 leading-snug">
            {'مدى الحرارة اليومي لكل يوم مع الرمز الجوي'}
          </p>
        </div>
        <span className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 tabular-nums">
          {days.length} أيام
        </span>
      </header>
      <div className="px-6 pb-6 space-y-2.5" dir="ltr">
        {days.map((d, i) => {
          const DayIcon = iconFor(d.weather_code, true);
          const leftPct = ((d.low_c - globalMin) / span) * 100;
          const rightPct = ((d.high_c - globalMin) / span) * 100;
          return (
            <motion.div
              key={d.date_unix}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: duration.reveal, ease: easing.standard }}
              className="grid grid-cols-[60px_28px_1fr_auto] items-center gap-4 py-1.5"
            >
              <span className="text-mini text-foreground/65 font-medium">
                {i === 0
                  ? 'اليوم'
                  : new Date(d.date_unix).toLocaleDateString(locale, { weekday: 'short' })}
              </span>
              <DayIcon className="w-5 h-5 text-primary" strokeWidth={1.3} />
              <div className="relative h-2 rounded-full bg-foreground/8 overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-400/70 via-primary to-rose-400/70"
                  initial={{ scaleX: 0 }}
                  animate={{
                    left: `${leftPct}%`,
                    right: `${100 - rightPct}%`,
                    scaleX: 1,
                  }}
                  transition={{ duration: duration.reveal * 1.2, delay: i * 0.05, ease: easing.decelerate }}
                  style={{ transformOrigin: 'left center' }}
                />
                {/* Min/max dots */}
                <span
                  aria-hidden
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-400"
                  style={{ left: `${leftPct}%` }}
                />
                <span
                  aria-hidden
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-rose-400"
                  style={{ left: `${rightPct}%` }}
                />
              </div>
              <span className="text-mini tabular-nums text-foreground font-bold min-w-[68px] text-end">
                <span className="text-foreground/65 font-medium">{Math.round(d.low_c)}°</span>
                <span className="mx-1 text-foreground/30">·</span>
                {Math.round(d.high_c)}°
              </span>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}