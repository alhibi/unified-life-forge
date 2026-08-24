import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { WeatherPanel } from './WeatherPanels';

export interface HourlyRibbonEntry {
  timestamp_unix: number;
  temperature_c: number;
  weather_code: number;
  is_day: boolean;
  precip_probability_percent: number;
}

export interface HourlyRibbonProps {
  entries: HourlyRibbonEntry[];
  iconFor: (code: number, isDay: boolean) => any;
  locale: string;
}

export function HourlyRibbon({ entries, iconFor, locale }: HourlyRibbonProps) {
  const slice = useMemo(() => entries.slice(0, 12), [entries]);
  if (slice.length < 2) return null;

  const temps = slice.map((e) => e.temperature_c);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(1, max - min);

  return (
    <WeatherPanel title="الساعات القادمة" subtitle="12 ساعة">
      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar" dir="ltr">
        <div className="flex items-stretch gap-2 min-w-max">
          {slice.map((e, i) => {
            const Icon = iconFor(e.weather_code, e.is_day);
            const heat = (e.temperature_c - min) / span;
            return (
              <motion.div
                key={e.timestamp_unix}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="w-[56px] shrink-0 rounded-2xl border border-border/45 bg-background/40 px-1.5 py-2.5 text-center"
              >
                <div className="text-micro tracking-[0.1em] uppercase text-foreground/90 font-bold tabular-nums">
                  {i === 0
                    ? 'الآن'
                    : new Date(e.timestamp_unix).toLocaleTimeString(locale, {
                        hour: '2-digit',
                        hour12: false,
                      })}
                </div>
                <Icon className="w-4 h-4 mx-auto my-1.5 text-primary" strokeWidth={1.4} />
                <div className="font-bold text-lead leading-none text-foreground tabular-nums">
                  {Math.round(e.temperature_c)}°
                </div>
                <div className="mt-2 h-8 rounded-full bg-foreground/5 relative overflow-hidden">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-full bg-primary/60"
                    style={{ height: `${Math.max(6, heat * 100)}%` }}
                  />
                </div>
                <div className="mt-1 text-micro text-primary/80 tabular-nums">
                  {Math.round(e.precip_probability_percent)}%
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </WeatherPanel>
  );
}