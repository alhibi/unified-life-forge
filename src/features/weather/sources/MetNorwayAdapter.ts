// MET Norway / Yr.no — best-in-class short-range Nordic model.
// Requires a descriptive User-Agent per their terms of service.

import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';
import { type AdapterContext,BaseAdapter, safeJson } from './BaseAdapter';

const UA = 'SmartHub/1.0 (https://amv.life)';

interface MetResp {
  properties?: {
    timeseries: Array<{
      time: string;
      data: {
        instant?: { details?: Record<string, number> };
        next_1_hours?: { details?: Record<string, number>; summary?: { symbol_code?: string } };
        next_6_hours?: { details?: Record<string, number> };
      };
    }>;
  };
}

export class MetNorwayAdapter extends BaseAdapter {
  override readonly id: SourceId = 'met-norway';
  override readonly meta = SOURCE_REGISTRY['met-norway'];

  override async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${ctx.lat.toFixed(2)}&lon=${ctx.lng.toFixed(2)}`;
    const r = await safeJson<MetResp>(url, { headers: { 'User-Agent': UA }, signal: ctx.signal });
    const first = r.properties?.timeseries?.[0];
    const inst = first?.data?.instant?.details ?? {};
    const next1 = first?.data?.next_1_hours?.details ?? {};
    return {
      temperature: {
        actual_c: inst.air_temperature,
        dew_point_c: inst.dew_point_temperature,
      } as PartialSnapshot['temperature'],
      moisture: {
        relative_humidity_percent: inst.relative_humidity,
      } as PartialSnapshot['moisture'],
      pressure: {
        msl_hpa: inst.air_pressure_at_sea_level,
      } as PartialSnapshot['pressure'],
      wind: {
        speed_ms: inst.wind_speed,
        speed_kph: inst.wind_speed != null ? inst.wind_speed * 3.6 : undefined,
        direction_deg: inst.wind_from_direction,
        gusts_kph: inst.wind_speed_of_gust != null ? inst.wind_speed_of_gust * 3.6 : undefined,
      } as PartialSnapshot['wind'],
      precipitation: {
        intensity_mm_hr: next1.precipitation_amount,
        probability_percent: next1.probability_of_precipitation,
        thunder_probability_percent: next1.probability_of_thunder,
      } as PartialSnapshot['precipitation'],
      sky: {
        cloud_cover_total_percent: inst.cloud_area_fraction,
        cloud_cover_low_percent: inst.cloud_area_fraction_low,
        cloud_cover_mid_percent: inst.cloud_area_fraction_medium,
        cloud_cover_high_percent: inst.cloud_area_fraction_high,
        fog_probability_percent: inst.fog_area_fraction,
      } as PartialSnapshot['sky'],
      solar: { uv_index: inst.ultraviolet_index_clear_sky ?? 0 } as PartialSnapshot['solar'],
    };
  }
}
