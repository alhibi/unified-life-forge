import { Metric,WeatherPanel } from './WeatherPanels';

export interface SoilAndMicroclimateProps {
  snapshot: any; // WeatherSnapshot
}

export function SoilAndMicroclimate({ snapshot }: SoilAndMicroclimateProps) {
  return (
    <WeatherPanel title="التربة والمناخ الدقيق" subtitle="طبقات الأرض">
      <div className="grid grid-cols-2 gap-y-4 gap-x-4">
        <Metric
          label="VPD"
          value={snapshot.moisture.vapor_pressure_deficit_kpa.toFixed(2)}
          unit="kPa"
        />
        <Metric
          label="رطوبة التربة سطحية"
          value={
            snapshot.moisture.soil_moisture_0_1cm_m3m3 !== null
              ? (snapshot.moisture.soil_moisture_0_1cm_m3m3 * 100).toFixed(0)
              : '—'
          }
          unit={snapshot.moisture.soil_moisture_0_1cm_m3m3 !== null ? '%' : ''}
        />
        <Metric
          label="رطوبة التربة عمق"
          value={
            snapshot.moisture.soil_moisture_3_9cm_m3m3 !== null
              ? (snapshot.moisture.soil_moisture_3_9cm_m3m3 * 100).toFixed(0)
              : '—'
          }
          unit={snapshot.moisture.soil_moisture_3_9cm_m3m3 !== null ? '%' : ''}
        />
        <Metric
          label="حرارة التربة"
          value={
            snapshot.moisture.soil_temperature_6cm_c !== null
              ? Math.round(snapshot.moisture.soil_temperature_6cm_c)
              : '—'
          }
          unit={snapshot.moisture.soil_temperature_6cm_c !== null ? '°' : ''}
        />
        {snapshot.instability.cape_jkg !== null && (
          <Metric label="CAPE" value={Math.round(snapshot.instability.cape_jkg)} unit="J/kg" />
        )}
        {snapshot.instability.lifted_index !== null && (
          <Metric label="Lifted" value={snapshot.instability.lifted_index.toFixed(1)} />
        )}
      </div>
    </WeatherPanel>
  );
}