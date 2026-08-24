import { motion } from 'framer-motion';
import { useMemo } from 'react';

import { WeatherPanel } from './WeatherPanels';

export interface DailyRangeEntry {
  date_unix: number;
  high_c: number;
  low_c: number;
  weather_code: number;
}

export interface DailyRangeStripProps {
  days: DailyRangeEntry[];
  iconFor: (code: number, isDay: boolean) => any;
  locale: string;
}

export function DailyRangeStrip({ days, iconFor, locale }: DailyRangeStripProps) {
  const globalMin = useMemo(() => Math.min(...days.map((d) => d.low_c)), [days]);
  const globalMax = useMemo(() => Math.max(...days.map((d) => d.high_c)), [days]);
  const span = useMemo(() => Math.max(1, globalMax - globalMin), [globalMin, globalMax]);

  if (days.length === 0) return null;

  return (
    <WeatherPanel title="الأيام القادمة وحركة الحرارة" subtitle={`${days.length} ${'أيام'}`}>
      <div className="space-y-2.5" dir="ltr">
        {days.map((d, i) => {
          const DayIcon = iconFor(d.weather_code, true);
          const leftPct = ((d.low_c - globalMin) / span) * 100;
          const rightPct = ((d.high_c - globalMin) / span) * 100;
          return (
            <motion.div
              key={d.date_unix}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-[56px_28px_1fr_auto] items-center gap-3"
            >
              <span className="text-micro text-muted-foreground font-medium">
                {i === 0
                  ? 'اليوم'
                  : new Date(d.date_unix).toLocaleDateString(locale, { weekday: 'short' })}
              </span>
              <DayIcon className="w-4 h-4 text-primary" strokeWidth={1.4} />
              <div className="relative h-1.5 rounded-full bg-foreground/8 overflow-hidden">
                <div
                  className="absolute inset-y-0 rounded-full bg-primary/70"
                  style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
                />
              </div>
              <span className="text-micro tabular-nums text-foreground font-medium">
                <span className="text-muted-foreground">{Math.round(d.low_c)}°</span>
                <span className="mx-1 text-muted-foreground/50">·</span>
                {Math.round(d.high_c)}°
              </span>
            </motion.div>
          );
        })}
      </div>
    </WeatherPanel>
  );
}