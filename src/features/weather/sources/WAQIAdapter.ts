// WAQI — World Air Quality Index. Real ground-station readings (best source).

import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';
import { type AdapterContext,BaseAdapter, readEnv, safeJson } from './BaseAdapter';

interface WAQIResp {
  status: string;
  data?: {
    aqi: number;
    dominentpol?: string;
    city?: { name?: string; geo?: [number, number] };
    iaqi?: Record<string, { v: number }>;
    attributions?: Array<{ name: string }>;
  };
}

function haversine_km(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export class WAQIAdapter extends BaseAdapter {
  override readonly id: SourceId = 'waqi';
  override readonly meta = SOURCE_REGISTRY['waqi'];

  override async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const token = ctx.apiKey ?? readEnv(this.meta.apiKeyEnv);
    if (!token) return {};
    const url = `https://api.waqi.info/feed/geo:${ctx.lat.toFixed(2)};${ctx.lng.toFixed(2)}/?token=${token}`;
    const r = await safeJson<WAQIResp>(url, { signal: ctx.signal });
    if (r.status !== 'ok' || !r.data) return {};
    const d = r.data;
    const iaqi = d.iaqi ?? {};
    const dist = d.city?.geo
      ? haversine_km(ctx.lat, ctx.lng, d.city.geo[0], d.city.geo[1])
      : null;
    return {
      airQuality: {
        aqi_us: d.aqi,
        dominant_pollutant: d.dominentpol ?? 'unknown',
        pm25_ugm3: iaqi.pm25?.v ?? 0,
        pm10_ugm3: iaqi.pm10?.v ?? 0,
        no2_ugm3:  iaqi.no2?.v  ?? 0,
        o3_ugm3:   iaqi.o3?.v   ?? 0,
        co_mgm3:   iaqi.co?.v   ?? 0,
        so2_ugm3:  iaqi.so2?.v  ?? 0,
        source_station_name: d.city?.name ?? null,
        source_station_distance_km: dist !== null ? Number(dist.toFixed(2)) : null,
      } as PartialSnapshot['airQuality'],
    };
  }
}
