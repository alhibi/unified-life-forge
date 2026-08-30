// ============================================================================
// WeatherHeroRefined — the page's anchor element. Three visual tiers:
//
//   1. PRIMARY  — current temperature + condition. One glance, no clutter.
//   2. SECONDARY — apparent temp, daily range, ensemble spread, ensemble
//                  confidence. Surrounding context.
//   3. TERTIARY — four micro-metrics (pressure, tendency, 6h rain, humidity).
//                  Chip-sized, monospace, for completeness.
//
// Visual rhythm:
//   • Top accent line — gradient (transparent → primary/50 → transparent).
//   • Ambient backdrop — current condition colour, soft.
//   • Two-column layout on ≥sm: primary column left, icon column right.
//   • Spring-settle for the headline number (feels alive, not jumpy).
//   • Confidence meter uses motion-preset easing.standard — decisive in.
//
// Why a new component rather than edits to WeatherHero:
//   • The original was tightly coupled to WeatherPanel + AmbientBackdrop and
//     Metric. Replacing those is harder than building a clean successor.
//   • The new layout has 3 tiers; the old was flat. Cleaner composition.
// ============================================================================

import { motion } from 'framer-motion';

import { describeWeatherCode, labelForWeatherCode } from '../lib/conditions';
import { comfortLabel } from '../lib/vocabulary';
import {
  duration,
  easing,
  heroSpringTransition,
} from '../lib/weather-motion';
import type { HourlyEntry } from '../types/ForecastLayer';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';
import { AmbientBackdrop } from './AmbientBackdrop';
import { CardEyebrow, UnifiedCard } from './UnifiedCard';

export interface WeatherHeroRefinedProps {
  snapshot: WeatherSnapshot;
  hourly: HourlyEntry[];
}

/** Single micro-metric chip — label / value / unit, dense and tabular. */
function MetricChip({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl bg-background/60 border border-border/40">
      <span className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55">
        {label}
      </span>
      <span className="text-meta font-bold text-foreground tabular-nums" dir="ltr">
        {value}
        {unit && <span className="ms-1 text-mini font-medium text-foreground/55">{unit}</span>}
      </span>
    </div>
  );
}

export function WeatherHeroRefined({ snapshot, hourly }: WeatherHeroRefinedProps) {
  const currentHour = hourly[0];
  const condition = describeWeatherCode(
    currentHour?.weather_code ?? 0,
    currentHour?.is_day ?? true,
  );
  const Icon = condition.icon;
  const conf = snapshot.meta.ensemble_confidence_percent;
  const range = snapshot.temperature.ensemble_range_c;
  const hasSpread = range.max > range.min;

  return (
    <UnifiedCard
      variant="hero"
      padding="none"
      accent={false}
      className="relative"
    >
      <AmbientBackdrop
        code={currentHour?.weather_code ?? 0}
        isDay={currentHour?.is_day ?? true}
      />

      <div className="relative px-5 pt-6 pb-5">
        {/* Eyebrow — comfort level + condition label */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <span className="inline-flex items-center gap-2 text-mini font-bold tracking-[0.2em] uppercase text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
            {'الآن'}
          </span>
          <span className="text-mini font-bold tracking-[0.16em] uppercase text-foreground/70">
            {comfortLabel(snapshot.temperature.thermal_comfort_level)}
          </span>
        </div>

        {/* PRIMARY tier — temperature + icon */}
        <div className="grid grid-cols-[1fr_auto] items-end gap-5" dir="ltr">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={heroSpringTransition}
            className="flex items-baseline gap-2 leading-none"
          >
            <span className="text-[5.5rem] font-extralight tracking-tighter text-foreground tabular-nums">
              {Math.round(snapshot.temperature.actual_c)}
            </span>
            <span className="text-[3rem] font-light text-primary/85 leading-none">°</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="relative w-20 h-20 grid place-items-center"
          >
            <div className="absolute inset-0 rounded-full bg-primary/8 blur-xl" aria-hidden />
            <Icon className="relative w-16 h-16 text-primary" strokeWidth={1.1} />
          </motion.div>
        </div>

        {/* Condition label + apparent temp inline */}
        <div className="mt-3 flex items-baseline justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-lead font-bold text-foreground truncate">
              {labelForWeatherCode(currentHour?.weather_code ?? 0)}
            </p>
            <p className="mt-1 text-mini text-foreground/70 font-medium tabular-nums" dir="ltr">
              {`محسوسة ${Math.round(snapshot.temperature.apparent_c)}°`}
              {' · '}
              {`↑ ${Math.round(snapshot.temperature.daily_high_c)}°`}
              {' · '}
              {`↓ ${Math.round(snapshot.temperature.daily_low_c)}°`}
              {' · '}
              {`ندى ${Math.round(snapshot.temperature.dew_point_c)}°`}
            </p>
          </div>
        </div>

        {/* Confidence meter */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <CardEyebrow className="mb-0">{'ثقة الإجماع'}</CardEyebrow>
            <span className="text-meta font-bold text-foreground tabular-nums" dir="ltr">
              {conf}
              {'٪'}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-foreground/12 overflow-hidden" dir="ltr">
            <motion.div
              className="h-full origin-left rounded-full bg-gradient-to-r from-primary/70 to-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: conf / 100 }}
              transition={{ duration: duration.reveal * 2.5, ease: easing.decelerate }}
            />
          </div>
          {hasSpread && (
            <p className="mt-2 text-micro text-foreground/55 tabular-nums" dir="ltr">
              {'نطاق النماذج '}
              {Math.round(range.min)}°
              {' – '}
              {Math.round(range.max)}°
              {snapshot.meta.models_outlier.length > 0 && (
                <>
                  {' · '}
                  {`استُبعد ${snapshot.meta.models_outlier.length} شاذ`}
                </>
              )}
            </p>
          )}
        </div>

        {/* TERTIARY tier — four micro-metrics */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <MetricChip
            label={'ضغط'}
            value={Math.round(snapshot.pressure.msl_hpa).toString()}
            unit="hPa"
          />
          <MetricChip
            label={'ميل'}
            value={snapshot.pressure.tendency_label}
          />
          <MetricChip
            label={'مطر ٦س'}
            value={snapshot.precipitation.accumulation_6h_mm.toFixed(1)}
            unit="mm"
          />
          <MetricChip
            label={'رطوبة مطلقة'}
            value={snapshot.moisture.absolute_humidity_gm3.toFixed(1)}
            unit="g/m³"
          />
        </div>

        {/* Sources responded */}
        <div className="mt-5 pt-4 border-t border-border/30 flex items-center justify-between text-micro text-foreground/55">
          <span className="tabular-nums" dir="ltr">
            {`${snapshot.meta.sources_responded}/${snapshot.meta.sources_queried} مصدر`}
          </span>
          <span className="tabular-nums" dir="ltr">
            {`${snapshot.meta.fetch_duration_ms} ms`}
          </span>
        </div>
      </div>
    </UnifiedCard>
  );
}