import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sunrise, Sunset, Sun } from '@/lib/icons';
import { timeLabel } from '../lib/utils';
import { comfortLabel } from '../lib/vocabulary';
import { labelForWeatherCode, describeWeatherCode } from '../lib/conditions';
import { WeatherPanel, Metric } from './WeatherPanels';
import { AmbientBackdrop } from './AmbientBackdrop';

export interface WeatherHeroProps {
  snapshot: any; // WeatherSnapshot
  hourly: any[];
}

export function WeatherHero({
  snapshot,
  hourly,
}: WeatherHeroProps) {
  const currentHour = hourly[0];
  const currentCondition = describeWeatherCode(
    currentHour?.weather_code ?? 0,
    currentHour?.is_day ?? true
  );
  const CurrentIcon = currentCondition.icon;
  const conf = snapshot.meta.ensemble_confidence_percent;

  return (
    <WeatherPanel
      title="الحالة الجوية الحالية"
      subtitle="الآن"
      accentLine={false}
      padding="none"
      elevated={false}
      className="relative rounded-[26px] surface-depth overflow-hidden"
    >
      <AmbientBackdrop
        code={currentHour?.weather_code ?? 0}
        isDay={currentHour?.is_day ?? true}
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/40" />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-micro tracking-[0.2em] uppercase text-primary/95 font-bold">
              {comfortLabel(snapshot.temperature.thermal_comfort_level)}
            </p>
            <div className="mt-3 flex items-end gap-3" dir="ltr">
              <span className="text-hero leading-[0.72] text-foreground tabular-nums font-extrabold">
                {Math.round(snapshot.temperature.actual_c)}°
              </span>
              <span className="mb-1 flex items-baseline gap-1 leading-none">
                <span className="text-display text-primary/90 font-bold tabular-nums">
                  /{Math.round(snapshot.temperature.apparent_c)}°
                </span>
                <span className="text-micro font-bold uppercase tracking-[0.12em] text-primary/70">
                  {'محسوسة'}
                </span>
              </span>
            </div>
            <p className="mt-4 text-meta text-foreground/95 font-extrabold">
              {labelForWeatherCode(currentHour?.weather_code ?? 0)}
            </p>
            <p className="mt-2 text-mini text-foreground/90 font-bold tabular-nums" dir="ltr">
              ↑ {Math.round(snapshot.temperature.daily_high_c)}° · ↓{' '}
              {Math.round(snapshot.temperature.daily_low_c)}° · {'ندى'}{' '}
              {Math.round(snapshot.temperature.dew_point_c)}°
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 shrink-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 16 }}
              className="relative"
            >
              <CurrentIcon className="w-20 h-20 text-primary" strokeWidth={1.05} />
            </motion.div>
            <div className="text-center">
              <div className="text-micro tracking-[0.15em] uppercase text-foreground/80 font-bold">
                {'ثقة التنبؤ'}
              </div>
              <div className="font-bold text-display leading-none text-foreground tabular-nums" dir="ltr">
                {conf}%
              </div>
            </div>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-5 h-1.5 rounded-full bg-foreground/15 overflow-hidden" dir="ltr">
          <motion.div
            className="h-full w-full origin-left rounded-full bg-primary"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: conf / 100 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Ensemble range */}
        {snapshot.temperature.ensemble_range_c.max > snapshot.temperature.ensemble_range_c.min && (
          <p className="mt-2 text-micro text-muted-foreground tabular-nums" dir="ltr">
            {'نطاق النماذج'} {Math.round(snapshot.temperature.ensemble_range_c.min)}°–{' '}
            {Math.round(snapshot.temperature.ensemble_range_c.max)}° ·{' '}
            {snapshot.meta.models_outlier.length > 0
              ? `استُبعد ${snapshot.meta.models_outlier.length} كشاذ`
              : 'لا نماذج شاذة'}
          </p>
        )}

        {/* Quick metrics grid */}
        <div className="mt-4 grid grid-cols-4 gap-2.5 text-center" dir="ltr">
          {[
            {
              label: 'ضغط',
              value: `${Math.round(snapshot.pressure.msl_hpa)}`,
              unit: 'hPa',
            },
            {
              label: 'الاتجاه',
              value: snapshot.pressure.tendency_label,
              unit: '',
            },
            {
              label: 'أمطار ٦س',
              value: snapshot.precipitation.accumulation_6h_mm.toFixed(1),
              unit: 'mm',
            },
            {
              label: 'رطوبة مطلقة',
              value: snapshot.moisture.absolute_humidity_gm3.toFixed(1),
              unit: 'g/m³',
            },
          ].map((m) => (
            <Metric
              key={m.label}
              label={m.label}
              value={m.value}
              unit={m.unit}
              size="sm"
              className="rounded-xl border border-border/50 bg-background/50 py-2.5 px-1.5 shadow-sm"
            />
          ))}
        </div>
      </div>
    </WeatherPanel>
  );
}