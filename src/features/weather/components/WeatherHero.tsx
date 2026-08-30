// ============================================================================
// WeatherHero — kept for backward compatibility (some legacy code paths
// import this name). The active hero on the page is WeatherHeroRefined;
// this one provides the same composition pattern in a slightly smaller
// footprint for tools that want a hero without the full scene canvas.
//
// New design: large temperature, atmospheric icon, gradient backdrop,
// ensemble confidence meter, 4 micro-metrics. All surfaces reuse the
// same shape as WeatherHeroRefined minus the WeatherScene.
// ============================================================================

import { motion } from 'framer-motion';

import { describeWeatherCode, labelForWeatherCode } from '../lib/conditions';
import { comfortLabel } from '../lib/vocabulary';
import { duration, easing, heroSpringTransition } from '../lib/weather-motion';
import type { HourlyEntry } from '../types/ForecastLayer';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';
import { AmbientBackdrop } from './AmbientBackdrop';
import { CardEyebrow } from './UnifiedCard';

interface WeatherHeroProps {
  snapshot: WeatherSnapshot;
  hourly: HourlyEntry[];
}

export function WeatherHero({ snapshot, hourly }: WeatherHeroProps) {
  const currentHour = hourly[0];
  const condition = describeWeatherCode(
    currentHour?.weather_code ?? 0,
    currentHour?.is_day ?? true,
  );
  const Icon = condition.icon;
  const conf = snapshot.meta.ensemble_confidence_percent;
  const range = snapshot.temperature.ensemble_range_c;

  return (
    <section className="relative rounded-3xl border border-border/40 overflow-hidden surface-depth isolate">
      <AmbientBackdrop
        code={currentHour?.weather_code ?? 0}
        isDay={currentHour?.is_day ?? true}
      />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent z-10" />

      <div className="relative z-10 px-6 pt-6 pb-5">
        <div className="flex items-center justify-between gap-3 mb-5">
          <span className="inline-flex items-center gap-2 text-mini font-bold tracking-[0.22em] uppercase text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
            {'الآن'}
          </span>
          <span className="text-mini font-bold tracking-[0.16em] uppercase text-foreground/70 truncate">
            {comfortLabel(snapshot.temperature.thermal_comfort_level)}
            {' · '}
            {labelForWeatherCode(currentHour?.weather_code ?? 0)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-end gap-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={heroSpringTransition}
            className="flex items-baseline gap-1 leading-[0.78]"
            dir="ltr"
          >
            <span className="text-[clamp(4.5rem,12vw,7rem)] font-extralight tracking-[-0.045em] text-foreground tabular-nums">
              {Math.round(snapshot.temperature.actual_c)}
            </span>
            <span className="text-[clamp(2rem,5vw,3rem)] font-light text-primary/85 -translate-y-3">°</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
            className="relative w-24 h-24 sm:w-28 sm:h-28 grid place-items-center"
          >
            <span aria-hidden className="absolute inset-2 rounded-full bg-primary/15 blur-2xl" />
            <span aria-hidden className="absolute inset-1 rounded-full border border-foreground/12" />
            <Icon className="relative w-20 h-20 sm:w-24 sm:h-24 text-primary" strokeWidth={1.05} />
          </motion.div>
        </div>

        <p className="mt-4 text-mini text-foreground/80 leading-relaxed tabular-nums" dir="ltr">
          <span className="text-foreground/60">{`محسوسة `}</span>
          <span className="font-bold text-foreground">{Math.round(snapshot.temperature.apparent_c)}°</span>
          <span className="text-foreground/30 mx-2">·</span>
          <span className="text-foreground/60">{`العظمى `}</span>
          <span className="font-bold text-foreground">{Math.round(snapshot.temperature.daily_high_c)}°</span>
          <span className="text-foreground/30 mx-2">·</span>
          <span className="text-foreground/60">{`الصغرى `}</span>
          <span className="font-bold text-foreground">{Math.round(snapshot.temperature.daily_low_c)}°</span>
          <span className="text-foreground/30 mx-2">·</span>
          <span className="text-foreground/60">{`ندى `}</span>
          <span className="font-bold text-foreground">{Math.round(snapshot.temperature.dew_point_c)}°</span>
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <CardEyebrow className="mb-0">{'ثقة الإجماع'}</CardEyebrow>
            <span className="text-meta font-extralight tracking-tight text-foreground tabular-nums" dir="ltr">
              {conf}
              <span className="ms-1 text-mini font-medium text-foreground/55">٪</span>
            </span>
          </div>
          <div className="h-1 rounded-full bg-foreground/10 overflow-hidden" dir="ltr">
            <motion.div
              className="h-full origin-left rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: conf / 100 }}
              transition={{ duration: duration.reveal * 2.5, ease: easing.decelerate }}
            />
          </div>
          {range.max > range.min && (
            <p className="mt-2 text-mini text-foreground/55 tabular-nums" dir="ltr">
              {`نطاق النماذج ${Math.round(range.min)}° – ${Math.round(range.max)}°`}
              {snapshot.meta.models_outlier.length > 0 && (
                <>
                  <span className="text-foreground/30 mx-2">·</span>
                  {`${snapshot.meta.models_outlier.length} شُذوذ`}
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}