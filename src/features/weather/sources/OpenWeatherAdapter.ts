// OpenWeatherMap One Call 3.0 — global fallback. BYOK.

import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';
import { type AdapterContext,BaseAdapter, readEnv, safeJson } from './BaseAdapter';

interface OWMResp {
  current?: { temp: number; feels_like: number; humidity: number; dew_point: number;
    pressure: number; uvi: number; wind_speed: number; wind_deg: number; wind_gust?: number;
    clouds: number; visibility: number; weather: Array<{ id: number; main: string }>; };
}

export class OpenWeatherAdapter extends BaseAdapter {
  readonly id: SourceId = 'openweathermap';
  readonly meta = SOURCE_REGISTRY['openweathermap'];

  async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const key = ctx.apiKey ?? readEnv(this.meta.apiKeyEnv);
    if (!key) return {};
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${ctx.lat.toFixed(2)}&lon=${ctx.lng.toFixed(2)}&exclude=minutely,alerts&units=metric&appid=${key}`;
    const r = await safeJson<OWMResp>(url, { signal: ctx.signal });
    const c = r.current;
    if (!c) return {};
    return {
      temperature: { actual_c: c.temp, feels_like_c: c.feels_like, dew_point_c: c.dew_point } as PartialSnapshot['temperature'],
      moisture: { relative_humidity_percent: c.humidity } as PartialSnapshot['moisture'],
      pressure: { msl_hpa: c.pressure } as PartialSnapshot['pressure'],
      wind: {
        speed_ms: c.wind_speed, speed_kph: c.wind_speed * 3.6,
        direction_deg: c.wind_deg, gusts_kph: (c.wind_gust ?? c.wind_speed) * 3.6,
      } as PartialSnapshot['wind'],
      sky: { cloud_cover_total_percent: c.clouds, visibility_km: c.visibility / 1000 } as PartialSnapshot['sky'],
      solar: { uv_index: c.uvi } as PartialSnapshot['solar'],
    };
  }
}
