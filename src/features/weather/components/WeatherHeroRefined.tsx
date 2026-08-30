// ============================================================================
// WeatherHeroRefined — the page's anchor. Three visual tiers:
//
//   PRIMARY    — gigantic temperature, atmospheric icon, dynamic gradient
//                driven by solar elevation + weather code.
//   SECONDARY  — apparent temp, daily range, condition label, ensemble spread
//                — the "what does this mean for me" context.
//   TERTIARY   — six micro-metrics in a 3-column grid: pressure, tendency,
//                6h rain, absolute humidity, ensemble confidence, fetch ms.
//
// Why three tiers instead of two:
//   The previous version collapsed everything into one block. The user saw
//   the temperature (good) and a pile of numbers (overwhelming). Tiering
//   gives the eye a clear path: read top → middle → bottom.
//
// Why a single scene canvas behind everything:
//   The previous card used a flat colour overlay. The new hero sits inside
//   WeatherScene, which paints particles (rain/snow/dust) and a soft sun
//   glow that follows the actual code. The card stops feeling like a UI
//   widget and starts feeling like a window onto the sky.
//
// Why a "6-tile" tertiary grid (3 cols × 2 rows):
//   Each tile carries one micro-fact with a quiet label. Six is the maximum
//   number of small numbers a screen can hold without crowding. Anything
//   more would compete with the primary reading.
// ============================================================================

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

import { describeWeatherCode, labelForWeatherCode } from '../lib/conditions';
import { comfortLabel } from '../lib/vocabulary';
import { duration, easing, heroRevealTransition, iconPulseTransition, motionPresets } from '../lib/weather-motion';
import type { HourlyEntry } from '../types/ForecastLayer';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';
import { CardEyebrow } from './UnifiedCard';
import { CountUpNumber } from './CountUpNumber';
import { WeatherScene } from './WeatherScene';

/** Single micro-metric tile used in the tertiary tier. */
function MetricTile({
  label,
  value,
  unit,
  align = 'start',
}: {
  label: string;
  value: string | number;
  unit?: string;
  align?: 'start' | 'center' | 'end';
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl px-3 py-2.5',
        'bg-background/40 backdrop-blur-sm border border-foreground/8',
        align === 'center' && 'items-center text-center',
        align === 'end' && 'items-end text-end',
        align === 'start' && 'items-start text-start',
      )}
    >
      <span className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 leading-none">
        {label}
      </span>
      <span className="text-meta font-bold text-foreground tabular-nums leading-none" dir="ltr">
        {value}
        {unit && <span className="ms-1 text-[0.625rem] font-semibold text-foreground/55">{unit}</span>}
      </span>
    </div>
  );
}

/** Inline eyebrow with the live condition chip + comfort level. */
function HeroEyebrow({
  comfort,
  conditionLabel,
}: {
  comfort: string;
  conditionLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-6">
      <span className="inline-flex items-center gap-2 text-mini font-bold tracking-[0.22em] uppercase text-primary">
        <span className="relative inline-flex h-2 w-2" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        {'الآن'}
      </span>
      <span className="text-mini font-bold tracking-[0.16em] uppercase text-foreground/70 truncate">
        {comfort} · {conditionLabel}
      </span>
    </div>
  );
}

/** Headline temperature with the ° superscript and an animated ink dot. */
function PrimaryTemperature({ celsius }: { celsius: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={heroRevealTransition}
      className="flex items-baseline gap-1 leading-[0.78]"
      dir="ltr"
    >
      <CountUpNumber
        value={celsius}
        className="font-extralight tracking-[-0.045em] text-foreground tabular-nums text-[clamp(4.5rem,12vw,7.5rem)]"
      />
      <span className="text-[clamp(2.25rem,6vw,3.25rem)] font-extralight text-primary/85 -translate-y-3">
        °
      </span>
    </motion.div>
  );
}

function AtmosphericIcon({
  Icon,
  isDay,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  isDay: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: duration.reveal, ease: easing.expo }}
      className="relative w-24 h-24 sm:w-28 sm:h-28 grid place-items-center"
    >
      {/* Outer glow ring */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-2 rounded-full blur-2xl',
          isDay ? 'bg-primary/15' : 'bg-foreground/8',
        )}
      />
      {/* Halo circle */}
      <span
        aria-hidden
        className="absolute inset-1 rounded-full border border-foreground/12"
      />
      <motion.div
        transition={iconPulseTransition}
        animate={{ scale: [1, 1.05, 1], opacity: [1, 0.92, 1] }}
      >
        <Icon className="relative w-20 h-20 sm:w-24 sm:h-24 text-primary" strokeWidth={1.05} />
      </motion.div>
    </motion.div>
  );
}

/** Confidence meter with a gradient fill that sweeps in. */
function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <CardEyebrow className="mb-0">{'ثقة الإجماع'}</CardEyebrow>
        <span className="text-meta font-bold text-foreground tabular-nums leading-none" dir="ltr">
          {value}
          <span className="text-mini font-medium text-foreground/55 ms-0.5">٪</span>
        </span>
      </div>
      <div className="h-1 rounded-full bg-foreground/10 overflow-hidden" dir="ltr">
        <motion.div
          className="h-full origin-left rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.max(0, Math.min(1, value / 100)) }}
          transition={{ duration: duration.reveal * 2.5, ease: easing.decelerate }}
        />
      </div>
    </div>
  );
}

export interface WeatherHeroRefinedProps {
  snapshot: WeatherSnapshot;
  hourly: HourlyEntry[];
}

export function WeatherHeroRefined({ snapshot, hourly }: WeatherHeroRefinedProps) {
  const currentHour = hourly[0];
  const condition = describeWeatherCode(
    currentHour?.weather_code ?? 0,
    currentHour?.is_day ?? true,
  );
  const Icon = condition.icon;
  const isDay = currentHour?.is_day ?? true;
  const conf = snapshot.meta.ensemble_confidence_percent;
  const range = snapshot.temperature.ensemble_range_c;
  const hasSpread = range.max > range.min;
  const outlierCount = snapshot.meta.models_outlier.length;

  return (
    <section
      className={cn(
        'relative rounded-3xl border border-border/40 overflow-hidden',
        'surface-depth isolate',
      )}
    >
      <WeatherScene
        code={currentHour?.weather_code ?? 0}
        isDay={isDay}
        solarElevationDeg={snapshot.solar.solar_elevation_deg}
      />

      {/* Top accent gradient — sits above the scene. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent z-10"
      />

      <div className="relative z-10 px-6 pt-7 pb-6">
        <HeroEyebrow
          comfort={comfortLabel(snapshot.temperature.thermal_comfort_level)}
          conditionLabel={labelForWeatherCode(currentHour?.weather_code ?? 0)}
        />

        {/* PRIMARY tier — temperature + icon */}
        <div className="grid grid-cols-[1fr_auto] items-end gap-6">
          <PrimaryTemperature celsius={snapshot.temperature.actual_c} />
          <AtmosphericIcon Icon={Icon} isDay={isDay} />
        </div>

        {/* SECONDARY tier — apparent, range, spread */}
        <div className="mt-6 pt-5 border-t border-foreground/10">
          <p className="text-meta font-medium text-foreground/85 leading-relaxed" dir="ltr">
            <span className="text-foreground/60">{`محسوسة `}</span>
            <span className="font-bold text-foreground tabular-nums">
              {Math.round(snapshot.temperature.apparent_c)}°
            </span>
            <span className="text-foreground/40 mx-2">·</span>
            <span className="text-foreground/60">{`العظمى `}</span>
            <span className="font-bold text-foreground tabular-nums">
              {Math.round(snapshot.temperature.daily_high_c)}°
            </span>
            <span className="text-foreground/40 mx-2">·</span>
            <span className="text-foreground/60">{`الصغرى `}</span>
            <span className="font-bold text-foreground tabular-nums">
              {Math.round(snapshot.temperature.daily_low_c)}°
            </span>
            <span className="text-foreground/40 mx-2">·</span>
            <span className="text-foreground/60">{`ندى `}</span>
            <span className="font-bold text-foreground tabular-nums">
              {Math.round(snapshot.temperature.dew_point_c)}°
            </span>
          </p>
        </div>

        {/* Confidence meter */}
        <div className="mt-5">
          <ConfidenceMeter value={conf} />
          {hasSpread && (
            <p
              className="mt-2 text-mini text-foreground/55 tabular-nums"
              dir="ltr"
            >
              {`نطاق النماذج ${Math.round(range.min)}° – ${Math.round(range.max)}°`}
              {outlierCount > 0 && (
                <>
                  <span className="text-foreground/30 mx-2">·</span>
                  {`${outlierCount} نموذج شُذوذ`}
                </>
              )}
            </p>
          )}
        </div>

        {/* TERTIARY tier — 3×2 micro-metric grid */}
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          <MetricTile
            label={'ضغط'}
            value={Math.round(snapshot.pressure.msl_hpa).toString()}
            unit="hPa"
          />
          <MetricTile
            label={'ميل'}
            value={snapshot.pressure.tendency_label}
            align="center"
          />
          <MetricTile
            label={'مطر ٦س'}
            value={snapshot.precipitation.accumulation_6h_mm.toFixed(1)}
            unit="mm"
            align="end"
          />
          <MetricTile
            label={'رطوبة مطلقة'}
            value={snapshot.moisture.absolute_humidity_gm3.toFixed(1)}
            unit="g/m³"
          />
          <MetricTile
            label={'مصادر'}
            value={`${snapshot.meta.sources_responded}/${snapshot.meta.sources_queried}`}
            align="center"
          />
          <MetricTile
            label={'زمن الجلب'}
            value={snapshot.meta.fetch_duration_ms.toString()}
            unit="ms"
            align="end"
          />
        </div>
      </div>
    </section>
  );
}