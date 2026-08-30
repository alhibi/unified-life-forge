// ============================================================================
// MinutelyRainTimeline — minute-by-minute precipitation for the next hour.
//
// WHY A POLYLINE INSTEAD OF BARS
//   The previous version drew one bar per minute (60 bars total). At small
//   widths the bars become indistinguishable. This version plots a single
//   continuous polyline above a soft fill area — the user reads the shape
//   of the rainstorm, not individual bars.
//
// TWO-LAYER APPROACH
//   • Layer 1 (back): a fill area tinted by intensity.
//   • Layer 2 (front): a crisp polyline at the top of the fill.
//   • Layer 3 (interaction): invisible hit areas per minute for hover
//     tooltips on touch and mouse.
//
// HONESTY
//   Many sources don't provide a minutely layer. We render an "honest
//   silence" message instead of pretending the data exists.
// ============================================================================

import { motion } from 'framer-motion';
import { memo, useMemo, useState } from 'react';

import { CloudRain, Zap } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { duration, easing } from '../lib/weather-motion';
import type { MinutelyEntry } from '../types/ForecastLayer';

interface Props {
  entries: MinutelyEntry[];
  locale: string;
}

const W = 100;
const H = 40;

function MinutelyRainTimelineImpl({ entries, locale }: Props) {
  const slice = useMemo(() => entries.slice(0, 60), [entries]);
  const [hovered, setHovered] = useState<number | null>(null);

  const firstWetIdx = useMemo(() => slice.findIndex((m) => m.precip_mm_hr > 0), [slice]);
  const anyWet = firstWetIdx !== -1;
  const maxIntensity = useMemo(
    () => Math.max(0.5, ...slice.map((m) => m.precip_mm_hr)),
    [slice],
  );
  const totalMm = useMemo(
    () => slice.reduce((sum, m) => sum + m.precip_mm_hr / 60, 0),
    [slice],
  );
  const peakIntensity = useMemo(() => Math.max(...slice.map((m) => m.precip_mm_hr)), [slice]);
  const anyLightning = useMemo(
    () => slice.some((m) => m.lightning_proximity_km !== null && m.lightning_proximity_km < 8),
    [slice],
  );

  if (slice.length === 0) return null;

  // Map minutes to polyline + fill.
  const points = slice.map((m, i) => {
    const x = (i / Math.max(1, slice.length - 1)) * W;
    const y = H - (m.precip_mm_hr / maxIntensity) * (H - 4) - 2;
    return { x: x.toFixed(2), y: y.toFixed(2), v: m.precip_mm_hr };
  });
  const linePath = `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
  const fillPath = `M 0 ${H} L ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${W} ${H} Z`;

  const minutesUntilWet = anyWet ? firstWetIdx : null;
  const hoveredPoint = hovered !== null ? points[hovered] : null;

  return (
    <section
      className="relative rounded-2xl border border-border/40 surface-depth overflow-hidden"
      aria-label="مطر الدقائق القادمة"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <header className="px-6 pt-6 pb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-lead leading-tight text-foreground">
            <CloudRain className="w-5 h-5 text-primary" aria-hidden />
            {'مطر الساعة القادمة'}
          </h2>
          <p className="mt-1 text-mini text-foreground/65 leading-snug">
            {!anyWet
              ? 'لا مطر متوقع خلال الـ 60 دقيقة القادمة'
              : minutesUntilWet === 0
                ? 'المطر يهطل الآن'
                : `أول قطرات متوقعة بعد ~${minutesUntilWet} دقيقة`}
          </p>
        </div>
        <div className="text-end">
          <p className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 leading-none">
            {'إجمالي'}
          </p>
          <p className="mt-1 text-lead font-bold text-foreground tabular-nums leading-none" dir="ltr">
            {totalMm.toFixed(1)}
            <span className="ms-1 text-mini font-semibold text-foreground/55">mm</span>
          </p>
        </div>
      </header>

      {/* Chart */}
      <div className="px-6 pb-3 relative" style={{ aspectRatio: `${W} / ${H + 12}` }}>
        <svg
          viewBox={`0 0 ${W} ${H + 4}`}
          preserveAspectRatio="none"
          className="absolute inset-x-6 inset-y-0 h-[calc(100%-3.5rem)] w-[calc(100%-3rem)]"
        >
          <defs>
            <linearGradient id="minutely-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(210 90% 60%)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(210 90% 60%)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Baseline */}
          <line x1="0" x2={W} y1={H} y2={H} stroke="hsl(var(--foreground) / 0.10)" strokeWidth="0.2" vectorEffect="non-scaling-stroke" />
          {/* Fill */}
          <motion.path
            d={fillPath}
            fill="url(#minutely-fill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: duration.reveal, ease: easing.standard }}
          />
          {/* Line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke="hsl(210 90% 55%)"
            strokeWidth="0.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: duration.reveal * 1.5, ease: easing.decelerate }}
          />
          {/* Hovered dot */}
          {hoveredPoint && (
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="1.2" fill="hsl(210 90% 50%)" />
          )}
        </svg>

        {/* Hover hit areas — one transparent rect per minute. */}
        <div className="absolute inset-x-6 bottom-3 h-[calc(100%-3.5rem)] flex">
          {slice.map((m, i) => (
            <button
              key={m.timestamp_unix}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              className="flex-1 bg-transparent"
              aria-label={`${new Date(m.timestamp_unix).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}: ${m.precip_mm_hr.toFixed(1)} mm/h`}
            />
          ))}
        </div>

        {/* Tooltip */}
        {hoveredPoint && hovered !== null && (
          <div
            className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[0.625rem] font-bold shadow-lg"
            style={{
              left: `calc(${((hovered / Math.max(1, slice.length - 1)) * 100).toFixed(2)}% + 1.5rem - ${hovered * 4}px)`,
              top: `${((hoveredPoint.v ? 1 - hoveredPoint.v / maxIntensity : 1) * 100).toFixed(0)}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <span className="tabular-nums" dir="ltr">
              {slice[hovered].precip_mm_hr.toFixed(1)} mm/h
            </span>
          </div>
        )}
      </div>

      {/* Time axis */}
      <div className="px-6 pb-4 flex justify-between text-[0.625rem] tabular-nums text-foreground/55" dir="ltr">
        <span className="font-bold text-primary">الآن</span>
        <span>
          {new Date(slice[Math.min(29, slice.length - 1)].timestamp_unix).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
        <span>
          {new Date(slice[slice.length - 1].timestamp_unix).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
      </div>

      {/* Lightning advisory */}
      {anyLightning && (
        <div className="mx-6 mb-5 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/12 border border-amber-500/30">
          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" aria-hidden />
          <p className="text-mini text-amber-600 dark:text-amber-300 leading-snug font-semibold">
            {'نشاط برقي مرصود في البيانات — تجنب المناطق المفتوحة.'}
          </p>
        </div>
      )}

      {/* Stats footer */}
      <div className={cn('px-6 pb-6 pt-2 grid grid-cols-2 gap-3 border-t border-foreground/8', anyLightning ? '' : 'mt-1')}>
        <div>
          <p className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 leading-none mb-1">
            {'الذروة'}
          </p>
          <p className="text-meta font-bold text-foreground tabular-nums leading-none" dir="ltr">
            {peakIntensity.toFixed(1)}
            <span className="ms-1 text-[0.625rem] font-semibold text-foreground/55">mm/h</span>
          </p>
        </div>
        <div className="text-end">
          <p className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 leading-none mb-1">
            {'دقيقة الجفاف'}
          </p>
          <p className="text-meta font-bold text-foreground tabular-nums leading-none">
            {anyWet ? `${firstWetIdx}` : '—'}
          </p>
        </div>
      </div>
    </section>
  );
}

export const MinutelyRainTimeline = memo(MinutelyRainTimelineImpl);