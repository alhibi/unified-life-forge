import { WeatherPanel, Metric } from './WeatherPanels';
import { beaufortLabel } from '../lib/vocabulary';

export interface PhysicalMeasurementsProps {
  snapshot: any; // WeatherSnapshot
}

export function PhysicalMeasurements({ snapshot }: PhysicalMeasurementsProps) {
  return (
    <WeatherPanel
      title="القياسات الفيزيائية اللحظية الفريدة"
      subtitle={`${snapshot.meta.sources_responded}/${snapshot.meta.sources_queried}`}
    >
      <div className="grid grid-cols-3 gap-y-5 gap-x-3">
        <Metric
          label="الكرة الرطبة"
          value={Math.round(snapshot.temperature.wet_bulb_c)}
          unit="°"
        />
        <Metric
          label="انزعاج حراري"
          value={snapshot.temperature.discomfort_index.toFixed(1)}
        />
        <Metric
          label="هبات الرياح"
          value={Math.round(snapshot.wind.gusts_kph)}
          unit="كم/س"
          hint={beaufortLabel(snapshot.wind.beaufort_scale)}
        />
        <Metric
          label="مسافة الرياح اليومية"
          value={snapshot.wind.wind_run_km_day ?? 0}
          unit="كم"
        />
        <Metric
          label="قاعدة السحب"
          value={snapshot.sky.cloud_base_m ?? '—'}
          unit={snapshot.sky.cloud_base_m ? 'م' : ''}
        />
        <Metric
          label="احتمالية الضباب"
          value={Math.round(snapshot.sky.fog_probability_percent)}
          unit="%"
        />
      </div>
    </WeatherPanel>
  );
}