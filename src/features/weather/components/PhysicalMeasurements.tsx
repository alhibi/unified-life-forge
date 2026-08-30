// ============================================================================
// PhysicalMeasurements — non-obvious atmospheric quantities that don't
// have a place in the main hero. Wet bulb temp, discomfort index, fog
// probability, cloud base — the kind of values a meteorologist expects.
// ============================================================================

import { Atom } from '@/lib/icons';

import { beaufortLabel } from '../lib/vocabulary';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';
import { Metric } from './WeatherPanels';

interface PhysicalMeasurementsProps {
  snapshot: WeatherSnapshot;
}

export function PhysicalMeasurements({ snapshot }: PhysicalMeasurementsProps) {
  return (
    <section className="rounded-2xl border border-border/40 surface-depth overflow-hidden">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <header className="px-6 pt-6 pb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-lead leading-tight text-foreground">
            <Atom className="w-5 h-5 text-primary" aria-hidden />
            {'القياسات الفيزيائية'}
          </h2>
          <p className="mt-1 text-mini text-foreground/65 leading-snug">
            {'كميات جوية متخصصة لا تظهر في الواجهة الرئيسية'}
          </p>
        </div>
        <span className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 tabular-nums">
          {`${snapshot.meta.sources_responded}/${snapshot.meta.sources_queried}`}
        </span>
      </header>
      <div className="px-6 pb-6 grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
        <Metric
          label="الكرة الرطبة"
          hint="أدنى حرارة بالتبخر"
          value={Math.round(snapshot.temperature.wet_bulb_c).toString()}
          unit="°"
        />
        <Metric
          label="مؤشر الانزعاج"
          hint="Thom Discomfort Index"
          value={snapshot.temperature.discomfort_index.toFixed(1)}
        />
        <Metric
          label="هبات الرياح"
          hint={beaufortLabel(snapshot.wind.beaufort_scale)}
          value={Math.round(snapshot.wind.gusts_kph).toString()}
          unit="كم/س"
        />
        <Metric
          label="مسافة الرياح اليومية"
          hint="wind run"
          value={(snapshot.wind.wind_run_km_day ?? 0).toString()}
          unit="كم"
        />
        <Metric
          label="قاعدة السحب"
          hint="cloud base"
          value={(snapshot.sky.cloud_base_m ?? '—').toString()}
          unit={snapshot.sky.cloud_base_m ? 'م' : ''}
        />
        <Metric
          label="احتمالية الضباب"
          hint="fog probability"
          value={Math.round(snapshot.sky.fog_probability_percent).toString()}
          unit="%"
        />
      </div>
    </section>
  );
}