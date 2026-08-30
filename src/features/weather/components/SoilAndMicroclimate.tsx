// ============================================================================
// SoilAndMicroclimate — soil moisture/temperature layers + atmospheric
// instability indices. Renders as a section with a 2-column micro-metric grid.
// ============================================================================

import { Layers, Sprout } from '@/lib/icons';

import type { WeatherSnapshot } from '../types/WeatherSnapshot';
import { Metric } from './WeatherPanels';

interface SoilAndMicroclimateProps {
  snapshot: WeatherSnapshot;
}

function formatNullable(value: number | null, digits = 0, unit = ''): { value: string; unit: string } {
  if (value === null) return { value: '—', unit: '' };
  if (unit === '%') return { value: (value * 100).toFixed(digits), unit };
  if (unit === '°') return { value: Math.round(value).toString(), unit };
  return { value: value.toFixed(digits), unit };
}

export function SoilAndMicroclimate({ snapshot }: SoilAndMicroclimateProps) {
  const surface = formatNullable(snapshot.moisture.soil_moisture_0_1cm_m3m3, 0, '%');
  const deep = formatNullable(snapshot.moisture.soil_moisture_3_9cm_m3m3, 0, '%');
  const temp = formatNullable(snapshot.moisture.soil_temperature_6cm_c, 0, '°');

  return (
    <section className="rounded-2xl border border-border/40 surface-depth overflow-hidden">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <header className="px-6 pt-6 pb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-lead leading-tight text-foreground">
            <Layers className="w-5 h-5 text-primary" aria-hidden />
            {'التربة والمناخ الدقيق'}
          </h2>
          <p className="mt-1 text-mini text-foreground/65 leading-snug">
            {'طبقات الأرض ومؤشرات عدم الاستقرار الجوي'}
          </p>
        </div>
        <Sprout className="w-5 h-5 text-primary/55 shrink-0" aria-hidden />
      </header>
      <div className="px-6 pb-6 grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
        <Metric
          label="VPD"
          hint="عجز ضغط البخار"
          value={snapshot.moisture.vapor_pressure_deficit_kpa.toFixed(2)}
          unit="kPa"
        />
        <Metric
          label="رطوبة سطحية"
          hint="عمق 0-1 سم"
          value={surface.value}
          unit={surface.unit}
        />
        <Metric
          label="رطوبة عميقة"
          hint="عمق 3-9 سم"
          value={deep.value}
          unit={deep.unit}
        />
        <Metric
          label="حرارة التربة"
          hint="عمق 6 سم"
          value={temp.value}
          unit={temp.unit}
        />
        {snapshot.instability.cape_jkg !== null && (
          <Metric
            label="CAPE"
            hint="طاقة الحمل المتاحة"
            value={Math.round(snapshot.instability.cape_jkg).toString()}
            unit="J/kg"
          />
        )}
        {snapshot.instability.lifted_index !== null && (
          <Metric
            label="Lifted Index"
            hint="مؤشر الرفع"
            value={snapshot.instability.lifted_index.toFixed(1)}
          />
        )}
      </div>
    </section>
  );
}