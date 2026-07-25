// Weatherbit — packages AQI inside hourly forecast. BYOK.

import { BaseAdapter, safeJson, readEnv, type AdapterContext } from './BaseAdapter';
import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';

interface WBResp { data?: Array<Record<string, number | string>>; }

export class WeatherbitAdapter extends BaseAdapter {
  readonly id: SourceId = 'weatherbit';
  readonly meta = SOURCE_REGISTRY['weatherbit'];

  async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const key = ctx.apiKey ?? readEnv(this.meta.apiKeyEnv);
    if (!key) return {};
    const url = `https://api.weatherbit.io/v2.0/current?lat=${ctx.lat.toFixed(2)}&lon=${ctx.lng.toFixed(2)}&key=${key}`;
    const r = await safeJson<WBResp>(url, { signal: ctx.signal });
    const d = r.data?.[0] ?? {};
    const n = (k: string) => typeof d[k] === 'number' ? (d[k] as number) : 0;
    return {
      temperature: { actual_c: n('temp'), feels_like_c: n('app_temp'), dew_point_c: n('dewpt') } as PartialSnapshot['temperature'],
      moisture: { relative_humidity_percent: n('rh') } as PartialSnapshot['moisture'],
      pressure: { msl_hpa: n('slp'), surface_hpa: n('pres') } as PartialSnapshot['pressure'],
      wind: { speed_ms: n('wind_spd'), speed_kph: n('wind_spd') * 3.6, direction_deg: n('wind_dir') } as PartialSnapshot['wind'],
      sky: { cloud_cover_total_percent: n('clouds'), visibility_km: n('vis') } as PartialSnapshot['sky'],
      solar: { uv_index: n('uv'), ghi_wm2: n('ghi'), dni_wm2: n('dni'), dhi_wm2: n('dhi') } as PartialSnapshot['solar'],
      airQuality: { aqi_us: n('aqi') } as PartialSnapshot['airQuality'],
    };
  }
}
