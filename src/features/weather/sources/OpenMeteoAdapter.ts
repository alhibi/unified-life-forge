// Open-Meteo — primary FOSS atmospheric backbone.
// Provides current, hourly (16d), daily (16d), minutely 15-min precip,
// soil temp/moisture, UV, ensemble-derived data. No key required.

import type { DailyEntry, ExtendedHourlyEntry,ForecastLayers, HourlyEntry } from '../types/ForecastLayer';
import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';
import { type AdapterContext,BaseAdapter, safeJson } from './BaseAdapter';

interface OMResponse {
  latitude: number; longitude: number; elevation: number;
  timezone: string;
  current?: Record<string, number>;
  hourly?: Record<string, (number | null)[]> & { time: string[] };
  daily?:  Record<string, (number | null)[]> & { time: string[] };
  minutely_15?: Record<string, (number | null)[]> & { time: string[] };
}

const CURRENT_FIELDS = [
  'temperature_2m','apparent_temperature','relative_humidity_2m','dew_point_2m',
  'precipitation','rain','showers','snowfall','weather_code','cloud_cover',
  'pressure_msl','surface_pressure','wind_speed_10m','wind_direction_10m',
  'wind_gusts_10m','uv_index','is_day','visibility',
].join(',');

const HOURLY_FIELDS = [
  'temperature_2m','apparent_temperature','precipitation','precipitation_probability',
  'weather_code','cloud_cover','wind_speed_10m','wind_direction_10m','wind_gusts_10m',
  'pressure_msl','relative_humidity_2m','uv_index','is_day','visibility',
  'soil_moisture_0_to_1cm','soil_moisture_1_to_3cm','soil_moisture_3_to_9cm','soil_moisture_9_to_27cm',
  'soil_temperature_0cm','soil_temperature_6cm','cape','lifted_index',
].join(',');

const DAILY_FIELDS = [
  'weather_code','temperature_2m_max','temperature_2m_min','sunrise','sunset',
  'uv_index_max','precipitation_sum','precipitation_probability_max',
  'wind_speed_10m_max','wind_direction_10m_dominant','wind_gusts_10m_max',
].join(',');

const MINUTELY_FIELDS = ['precipitation', 'rain', 'snowfall'].join(',');

export class OpenMeteoAdapter extends BaseAdapter {
  override readonly id: SourceId = 'open-meteo';
  override readonly meta = SOURCE_REGISTRY['open-meteo'];

  private async query(ctx: AdapterContext): Promise<OMResponse> {
    const params = new URLSearchParams({
      latitude:  ctx.lat.toFixed(2),
      longitude: ctx.lng.toFixed(2),
      current: CURRENT_FIELDS,
      hourly: HOURLY_FIELDS,
      daily: DAILY_FIELDS,
      minutely_15: MINUTELY_FIELDS,
      timezone: 'auto',
      forecast_days: '14',
      wind_speed_unit: 'kmh',
    });
    return safeJson<OMResponse>(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: ctx.signal });
  }

  override async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const r = await this.query(ctx);
    const c = r.current ?? {};
    const h = r.hourly;
    const d = r.daily;

    const soil0 = h?.soil_moisture_0_to_1cm?.[0] ?? null;
    const soil1 = h?.soil_moisture_1_to_3cm?.[0] ?? null;
    const soil3 = h?.soil_moisture_3_to_9cm?.[0] ?? null;
    const soil9 = h?.soil_moisture_9_to_27cm?.[0] ?? null;
    const soilT0 = h?.soil_temperature_0cm?.[0] ?? null;
    const soilT6 = h?.soil_temperature_6cm?.[0] ?? null;

    return {
      meta: {
        location: { lat: r.latitude, lng: r.longitude, elevation_m: r.elevation, timezone: r.timezone },
      } as PartialSnapshot['meta'],
      temperature: {
        actual_c: c.temperature_2m ?? 0,
        feels_like_c: c.apparent_temperature ?? c.temperature_2m ?? 0,
        dew_point_c: c.dew_point_2m ?? 0,
        daily_high_c: d?.temperature_2m_max?.[0] ?? c.temperature_2m ?? 0,
        daily_low_c:  d?.temperature_2m_min?.[0] ?? c.temperature_2m ?? 0,
      },
      moisture: {
        relative_humidity_percent: c.relative_humidity_2m ?? 0,
        soil_moisture_0_1cm_m3m3: soil0,
        soil_moisture_1_3cm_m3m3: soil1,
        soil_moisture_3_9cm_m3m3: soil3,
        soil_moisture_9_27cm_m3m3: soil9,
        soil_temperature_0cm_c: soilT0,
        soil_temperature_6cm_c: soilT6,
      },
      pressure: {
        msl_hpa: c.pressure_msl ?? 1013,
        surface_hpa: c.surface_pressure ?? c.pressure_msl ?? 1013,
      },
      wind: {
        speed_kph: c.wind_speed_10m ?? 0,
        speed_ms: (c.wind_speed_10m ?? 0) / 3.6,
        gusts_kph: c.wind_gusts_10m ?? 0,
        direction_deg: c.wind_direction_10m ?? 0,
      },
      precipitation: {
        intensity_mm_hr: c.precipitation ?? 0,
        accumulation_24h_mm: d?.precipitation_sum?.[0] ?? 0,
        probability_percent: d?.precipitation_probability_max?.[0] ?? 0,
      },
      sky: {
        cloud_cover_total_percent: c.cloud_cover ?? 0,
        visibility_km: (c.visibility ?? 10000) / 1000,
      },
      solar: {
        uv_index: c.uv_index ?? 0,
        uv_max_today: d?.uv_index_max?.[0] ?? 0,
      },
      instability: {
        cape_jkg: h?.cape?.[0] ?? null,
        lifted_index: h?.lifted_index?.[0] ?? null,
      },
    };
  }

  override async fetchForecast(ctx: AdapterContext): Promise<Partial<ForecastLayers>> {
    const r = await this.query(ctx);
    const h = r.hourly;
    const d = r.daily;
    const m = r.minutely_15;

    const minutely = m?.time?.slice(0, 4).map((t, i) => ({
      timestamp_unix: new Date(t).getTime(),
      precip_mm_hr: (m.precipitation?.[i] ?? 0) * 4, // 15-min → hr
      precip_probability_percent: 0,
      lightning_proximity_km: null,
    })) ?? [];

    const hourly: HourlyEntry[] = (h?.time ?? []).slice(0, 48).map((t, i) => ({
      timestamp_unix: new Date(t).getTime(),
      temperature_c: h!.temperature_2m?.[i] ?? 0,
      apparent_c:    h!.apparent_temperature?.[i] ?? 0,
      precip_mm:     h!.precipitation?.[i] ?? 0,
      precip_probability_percent: h!.precipitation_probability?.[i] ?? 0,
      wind_kph:      h!.wind_speed_10m?.[i] ?? 0,
      wind_direction_deg: h!.wind_direction_10m?.[i] ?? 0,
      cloud_cover_percent: h!.cloud_cover?.[i] ?? 0,
      humidity_percent: h!.relative_humidity_2m?.[i] ?? 0,
      pressure_hpa: h!.pressure_msl?.[i] ?? 1013,
      uv_index: h!.uv_index?.[i] ?? 0,
      weather_code: h!.weather_code?.[i] ?? 0,
      is_day: Boolean(h!.is_day?.[i]),
      confidence_percent: 80,
    }));

    const extendedHourly: ExtendedHourlyEntry[] = (h?.time ?? []).slice(48, 168).map((t, i) => {
      const absIdx = 48 + i;
      const hourOffset = absIdx;
      return {
        timestamp_unix: new Date(t).getTime(),
        temperature_c: h!.temperature_2m?.[absIdx] ?? 0,
        precip_mm:     h!.precipitation?.[absIdx] ?? 0,
        wind_kph:      h!.wind_speed_10m?.[absIdx] ?? 0,
        uv_index:      h!.uv_index?.[absIdx] ?? 0,
        aqi_us: null,
        confidence_percent: Math.round(80 * Math.exp(-0.005 * hourOffset)),
      };
    });

    const daily: DailyEntry[] = (d?.time ?? []).slice(0, 14).map((t, i) => ({
      date_unix: new Date(t).getTime(),
      high_c: d!.temperature_2m_max?.[i] ?? 0,
      low_c:  d!.temperature_2m_min?.[i] ?? 0,
      precip_mm: d!.precipitation_sum?.[i] ?? 0,
      precip_probability_percent: d!.precipitation_probability_max?.[i] ?? 0,
      wind_kph_max: d!.wind_speed_10m_max?.[i] ?? 0,
      uv_index_max: d!.uv_index_max?.[i] ?? 0,
      sunrise: String(d!.sunrise?.[i] ?? ''),
      sunset:  String(d!.sunset?.[i] ?? ''),
      weather_code: d!.weather_code?.[i] ?? 0,
      day_quality_score: 0,        // populated by engine
      climatology_delta_c: null,
      confidence_percent: Math.max(20, 90 - i * 5),
    }));

    return { minutely, hourly, extendedHourly, daily };
  }
}

// Companion: air-quality sub-endpoint for Open-Meteo (CAMS model).
export class OpenMeteoAirQualityAdapter extends BaseAdapter {
  override readonly id: SourceId = 'open-meteo';
  override readonly meta = SOURCE_REGISTRY['open-meteo'];

  override async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const params = new URLSearchParams({
      latitude: ctx.lat.toFixed(2),
      longitude: ctx.lng.toFixed(2),
      current: 'european_aqi,us_aqi,pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide,ammonia',
      hourly: 'alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen',
      timezone: 'auto',
    });
    const r = await safeJson<{
      current?: Record<string, number>;
      hourly?: { time: string[]; alder_pollen?: number[]; birch_pollen?: number[]; grass_pollen?: number[]; mugwort_pollen?: number[]; olive_pollen?: number[]; ragweed_pollen?: number[] };
    }>(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`, { signal: ctx.signal });
    const c = r.current ?? {};
    const h = r.hourly;
    const polGrass = h?.grass_pollen?.[0] ?? null;
    const polTree  = ((h?.birch_pollen?.[0] ?? 0) + (h?.alder_pollen?.[0] ?? 0) + (h?.olive_pollen?.[0] ?? 0)) || null;
    const polWeed  = ((h?.ragweed_pollen?.[0] ?? 0) + (h?.mugwort_pollen?.[0] ?? 0)) || null;
    const total = (polGrass ?? 0) + (polTree ?? 0) + (polWeed ?? 0);
    return {
      airQuality: {
        aqi_us: c.us_aqi ?? 0,
        aqi_eu_caqi: c.european_aqi ?? 0,
        pm25_ugm3: c.pm2_5 ?? 0,
        pm10_ugm3: c.pm10 ?? 0,
        no2_ugm3:  c.nitrogen_dioxide ?? 0,
        o3_ugm3:   c.ozone ?? 0,
        co_mgm3:   (c.carbon_monoxide ?? 0) / 1000,
        so2_ugm3:  c.sulphur_dioxide ?? 0,
        nh3_ugm3:  c.ammonia ?? null,
      },
      biological: {
        pollen_total_index: total > 0 ? Math.round(Math.min(10, total / 10)) : null,
        pollen_grass_index: polGrass !== null ? Math.round(Math.min(10, polGrass / 10)) : null,
        pollen_tree_index:  polTree  !== null ? Math.round(Math.min(10, polTree  / 10)) : null,
        pollen_weed_index:  polWeed  !== null ? Math.round(Math.min(10, polWeed  / 10)) : null,
      },
    };
  }
}
