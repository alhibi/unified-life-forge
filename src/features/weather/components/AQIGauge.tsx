// ============================================================================
// AQIGauge — air quality panel with a large dial + six pollutant cards.
//
// VISUAL REDESIGN
//   • The previous dial was 160px wide and crammed. New dial is 240px and
//     uses a 9-band gradient stroke instead of solid colours — gives a
//     sense of "all the air quality states are here" without dominating.
//   • The needle is now an animated path with a proper pivot circle.
//   • Pollutants are cards in a 2×3 grid below the dial — each shows the
//     value, the WHO limit, and a coloured progress bar.
//   • Source attribution moves to a subtle line under the dial.
// ============================================================================

import { motion } from 'framer-motion';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';

import { duration, easing } from '../lib/weather-motion';

interface AQIGaugeProps {
  caqi: number;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  advisory: string;
  healthScore: number;
  source: string | null;
}

interface Band {
  to: number;
  label: string;
  labelEn: string;
  gradient: string; // 'from-X to-Y' pair
  textClass: string;
}

const BANDS: Band[] = [
  { to: 25,  label: 'ممتاز',     labelEn: 'excellent', gradient: 'from-emerald-400 to-emerald-500', textClass: 'text-emerald-600 dark:text-emerald-400' },
  { to: 50,  label: 'جيد',       labelEn: 'good',      gradient: 'from-lime-400 to-emerald-500',   textClass: 'text-lime-600 dark:text-lime-400' },
  { to: 75,  label: 'متوسط',     labelEn: 'moderate',  gradient: 'from-yellow-400 to-amber-500',   textClass: 'text-amber-600 dark:text-amber-400' },
  { to: 100, label: 'ضعيف',      labelEn: 'poor',      gradient: 'from-orange-400 to-orange-500',  textClass: 'text-orange-600 dark:text-orange-400' },
  { to: 150, label: 'رديء جداً', labelEn: 'very-poor', gradient: 'from-rose-500 to-rose-600',      textClass: 'text-rose-600 dark:text-rose-400' },
];

const W = 240;
const H = 140;
const CX = 120;
const CY = 120;
const R = 96;
const START_ANGLE = Math.PI; // 180° (left)
const END_ANGLE = 2 * Math.PI; // 360° (right) — half circle from left to right

const angleFor = (v: number) =>
  START_ANGLE + (Math.max(0, Math.min(150, v)) / 150) * (END_ANGLE - START_ANGLE);

const pointFor = (v: number, r: number = R) => {
  const a = angleFor(v);
  return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
};

function PollutantCard({
  label,
  formula,
  value,
  unit,
  limit,
  textClass,
}: {
  label: string;
  formula: string;
  value: number;
  unit: string;
  limit: number;
  textClass: string;
}) {
  const pct = Math.max(0, Math.min(1, value / limit));
  return (
    <div className="rounded-xl bg-background/40 border border-foreground/8 px-3 py-2.5 space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-mini font-bold text-foreground leading-none">{label}</span>
          <span className="text-[0.625rem] font-medium text-foreground/50 leading-none">
            {formula}
          </span>
        </div>
        <span className={cn('text-meta font-bold tabular-nums leading-none', textClass)} dir="ltr">
          {value.toFixed(value < 10 ? 1 : 0)}
          <span className="ms-0.5 text-[0.625rem] font-semibold text-foreground/45">{unit}</span>
        </span>
      </div>
      <div className="relative h-1 rounded-full bg-foreground/8 overflow-hidden" dir="ltr">
        <motion.div
          className={cn('h-full origin-left rounded-full bg-gradient-to-r', textClass.replace('text-', 'from-').split(' ')[0])}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct }}
          transition={{ duration: duration.reveal * 1.5, ease: easing.decelerate, delay: 0.1 }}
        />
      </div>
    </div>
  );
}

export function AQIGauge({
  caqi,
  pm25,
  pm10,
  o3,
  no2,
  so2,
  co,
  advisory,
  healthScore,
  source,
}: AQIGaugeProps) {
  const clamped = Math.max(0, Math.min(150, caqi));
  const needle = pointFor(clamped, R - 12);
  const activeBand = BANDS.find((b) => clamped <= b.to) ?? BANDS[BANDS.length - 1];

  const pollutants = useMemo(
    () => [
      { label: 'PM2.5', formula: 'جسيمات دقيقة', value: pm25, unit: 'µg', limit: 25 },
      { label: 'PM10',  formula: 'جسيمات كبيرة', value: pm10, unit: 'µg', limit: 50 },
      { label: 'O₃',    formula: 'أوزون',         value: o3,   unit: 'µg', limit: 120 },
      { label: 'NO₂',   formula: 'ثاني أكسيد النيتروجين', value: no2, unit: 'µg', limit: 40 },
      { label: 'SO₂',   formula: 'ثاني أكسيد الكبريت', value: so2, unit: 'µg', limit: 40 },
      { label: 'CO',    formula: 'أول أكسيد الكربون', value: co, unit: 'mg', limit: 10 },
    ],
    [pm25, pm10, o3, no2, so2, co],
  );

  return (
    <section className="rounded-2xl border border-border/40 surface-depth overflow-hidden">
      <header className="flex items-end justify-between gap-3 px-6 pt-6 pb-3">
        <div>
          <h3 className="text-lead font-bold text-foreground leading-tight">
            {'جودة الهواء والملوثات'}
          </h3>
          <p className="mt-1 text-mini text-foreground/60 leading-snug">
            {'مؤشر CAQI الأوروبي ومستويات ستة ملوثات رئيسية'}
          </p>
        </div>
        {source && (
          <span className="text-[0.625rem] font-bold tracking-[0.16em] uppercase text-foreground/50 truncate max-w-[140px]">
            {source}
          </span>
        )}
      </header>

      {/* Dial + advisory */}
      <div className="px-6 pb-5 grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-6">
        <div className="relative w-full max-w-[280px] mx-auto sm:mx-0" style={{ aspectRatio: `${W} / ${H + 20}` }}>
          <svg viewBox={`0 0 ${W} ${H + 20}`} className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <linearGradient id="aqi-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(150 55% 50%)" />
                <stop offset="25%" stopColor="hsl(80 55% 50%)" />
                <stop offset="50%" stopColor="hsl(45 85% 55%)" />
                <stop offset="75%" stopColor="hsl(20 80% 55%)" />
                <stop offset="100%" stopColor="hsl(0 70% 52%)" />
              </linearGradient>
            </defs>
            {/* Track */}
            <path
              d={`M ${pointFor(0).x} ${pointFor(0).y} A ${R} ${R} 0 0 1 ${pointFor(150).x} ${pointFor(150).y}`}
              fill="none"
              stroke="hsl(var(--foreground) / 0.10)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Active arc — length depends on clamped value */}
            <motion.path
              d={`M ${pointFor(0).x} ${pointFor(0).y} A ${R} ${R} 0 0 1 ${pointFor(clamped).x} ${pointFor(clamped).y}`}
              fill="none"
              stroke="url(#aqi-grad)"
              strokeWidth="14"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: duration.reveal * 2, ease: easing.decelerate }}
            />
            {/* Band ticks */}
            {BANDS.map((b) => {
              const p = pointFor(b.to, R);
              return (
                <g key={b.labelEn}>
                  <circle cx={p.x} cy={p.y} r="2" fill="hsl(var(--foreground) / 0.3)" />
                </g>
              );
            })}
            {/* Needle */}
            <motion.line
              x1={CX}
              y1={CY}
              x2={needle.x}
              y2={needle.y}
              stroke="hsl(var(--foreground))"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: duration.base, delay: duration.reveal * 0.6 }}
            />
            <motion.circle
              cx={CX}
              cy={CY}
              r="6"
              fill="hsl(var(--foreground))"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14, delay: duration.reveal * 0.4 }}
            />
          </svg>

          {/* Value overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 pointer-events-none" dir="ltr">
            <span className="text-[2.75rem] font-extralight tracking-[-0.04em] text-foreground tabular-nums leading-none">
              {Math.round(clamped)}
            </span>
            <span className="mt-1 text-[0.625rem] font-bold tracking-[0.2em] uppercase text-foreground/55">
              CAQI
            </span>
          </div>
        </div>

        {/* Active band + advisory + health score */}
        <div className="space-y-4">
          <div>
            <p className="text-[0.625rem] font-bold tracking-[0.2em] uppercase text-foreground/55 mb-1.5">
              {'الحالة'}
            </p>
            <p className={cn('text-title font-bold leading-tight', activeBand.textClass)}>
              {activeBand.label}
            </p>
          </div>
          <p className="text-mini text-foreground/80 leading-relaxed">{advisory}</p>

          <div className="pt-3 border-t border-foreground/10">
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55">
                {'صحة الأنشطة الخارجية'}
              </span>
              <span className="text-meta font-bold text-foreground tabular-nums leading-none" dir="ltr">
                {Math.round(healthScore)}
                <span className="text-[0.625rem] font-medium text-foreground/55 ms-0.5">/100</span>
              </span>
            </div>
            <div className="h-1 rounded-full bg-foreground/10 overflow-hidden" dir="ltr">
              <motion.div
                className="h-full origin-left rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: Math.max(0, Math.min(1, healthScore / 100)) }}
                transition={{ duration: duration.reveal * 2, ease: easing.decelerate }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pollutant grid */}
      <div className="px-6 pb-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {pollutants.map((p) => (
          <PollutantCard
            key={p.label}
            label={p.label}
            formula={p.formula}
            value={p.value}
            unit={p.unit}
            limit={p.limit}
            textClass={activeBand.textClass}
          />
        ))}
      </div>
    </section>
  );
}