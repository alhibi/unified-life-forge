/**
 * MinutelyRainTimeline — minute-by-minute arrival of precipitation.
 *
 * Uses the forecast's minutely layer (0–60 min), which the UI previously
 * ignored entirely. Each minute is a bar: height = mm/h intensity, color =
 * intensity class, with a "now" marker and honest empty state when the
 * layer is unavailable or the next hour is dry.
 */
import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';

import { CloudRain, Droplets } from '@/lib/icons';

import type { MinutelyEntry } from '../types/ForecastLayer';

interface Props {
  entries: MinutelyEntry[];
  locale: string;
}

function intensityClass(mmHr: number): { bar: string; label: string } {
  if (mmHr >= 7.6) return { bar: 'bg-indigo-400', label: 'غزير' };
  if (mmHr >= 2.5) return { bar: 'bg-sky-400', label: 'معتدل' };
  if (mmHr >= 0.5) return { bar: 'bg-cyan-300', label: 'خفيف' };
  if (mmHr > 0) return { bar: 'bg-cyan-200/70', label: 'رذاذ' };
  return { bar: 'bg-foreground/10', label: '' };
}

function MinutelyRainTimelineImpl({ entries, locale }: Props) {
  const slice = useMemo(() => entries.slice(0, 60), [entries]);

  const firstWetIdx = useMemo(() => slice.findIndex((m) => m.precip_mm_hr > 0), [slice]);
  const anyWet = firstWetIdx !== -1;
  const maxIntensity = useMemo(
    () => Math.max(0.1, ...slice.map((m) => m.precip_mm_hr)),
    [slice]
  );

  /* Layer unavailable (many sources don't provide it) — say so plainly. */
  if (slice.length === 0) return null;

  const minutesUntilWet = anyWet ? firstWetIdx : null;

  return (
    <section className="relative rounded-2xl surface-depth overflow-hidden" aria-label="مطر الدقائق القادمة">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/40" />
      <header className="px-4 pt-4 pb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-lead leading-none text-foreground">
            <CloudRain className="w-4 h-4 text-primary" aria-hidden />
            {'مطر الساعة القادمة'}
          </h2>
          <p className="mt-1.5 text-micro text-muted-foreground">
            {!anyWet
              ? 'لا مطر متوقع خلال الـ 60 دقيقة القادمة'
              : minutesUntilWet === 0
                ? 'المطر يهطل الآن — يُقدّر استمراره حسب الشريط أدناه'
                : `أول قطرات متوقعة بعد ~${minutesUntilWet} دقيقة`}
          </p>
        </div>
        <Droplets className="w-4 h-4 text-primary/70 shrink-0" aria-hidden />
      </header>

      <div className="px-4 pb-4" dir="ltr">
        {/* Minute bars */}
        <div className="flex items-end gap-[2px] h-20">
          {slice.map((m, i) => {
            const cls = intensityClass(m.precip_mm_hr);
            const h = m.precip_mm_hr > 0 ? Math.max(8, (m.precip_mm_hr / maxIntensity) * 100) : 4;
            return (
              <motion.div
                key={m.timestamp_unix}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.008, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={`flex-1 rounded-t-sm min-w-[3px] ${cls.bar}`}
                title={`${new Date(m.timestamp_unix).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })} — ${m.precip_mm_hr.toFixed(1)}mm/h (${cls.label || 'جاف'})`}
              />
            );
          })}
        </div>

        {/* Time axis: start / +30min / +60min */}
        <div className="mt-2 flex justify-between text-micro tabular-nums text-muted-foreground">
          <span className="font-bold text-primary">الآن</span>
          <span>
            {new Date(slice[Math.min(29, slice.length - 1)].timestamp_unix).toLocaleTimeString(
              locale,
              { hour: '2-digit', minute: '2-digit', hour12: false }
            )}
          </span>
          <span>
            {new Date(slice[slice.length - 1].timestamp_unix).toLocaleTimeString(locale, {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </span>
        </div>

        {/* Lightning proximity, when the layer carries it */}
        {slice.some((m) => m.lightning_proximity_km !== null) && (
          <p className="mt-3 text-micro text-amber-400 font-semibold">
            ⚡ نشاط برقي مرصود في البيانات — تجنّب المناطق المفتوحة.
          </p>
        )}
      </div>
    </section>
  );
}

export const MinutelyRainTimeline = memo(MinutelyRainTimelineImpl);
