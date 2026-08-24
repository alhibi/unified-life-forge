import { timeLabel } from '../lib/utils';
import { Metric,WeatherPanel } from './WeatherPanels';

export interface AstronomicsProps {
  snapshot: any; // WeatherSnapshot
  locale: string;
  moonGlyph: string;
}

export function Astronomics({ snapshot, locale, moonGlyph }: AstronomicsProps) {
  return (
    <WeatherPanel title="الفلك والضوء والشهور القمرية" subtitle="تفاصيل فلكية">
      <div className="grid grid-cols-3 gap-y-5 gap-x-3">
        <Metric
          label="طول النهار"
          value={snapshot.astronomical.day_length_hours.toFixed(1)}
          unit="h"
        />
        <Metric
          label="الشمس"
          value={snapshot.solar.solar_elevation_deg.toFixed(0)}
          unit="°"
          hint={`${snapshot.solar.solar_azimuth_deg.toFixed(0)}°`}
        />
        <Metric label="GHI" value={Math.round(snapshot.solar.ghi_wm2)} unit="W/m²" />
        <Metric
          label="إشعاع مباشر DNI"
          value={snapshot.solar.dni_wm2 !== null ? Math.round(snapshot.solar.dni_wm2) : '—'}
          unit={snapshot.solar.dni_wm2 !== null ? 'W/m²' : ''}
        />
        <Metric
          label="القمر"
          value={`${moonGlyph} ${snapshot.astronomical.moon_illumination_percent.toFixed(0)}%`}
          hint={snapshot.astronomical.moon_phase_name.replace(/_/g, ' ')}
        />
        <Metric
          label="الساعة الذهبية"
          value={timeLabel(snapshot.astronomical.golden_hour_evening_start, locale)}
        />
      </div>
    </WeatherPanel>
  );
}