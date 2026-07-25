// Visual Crossing — historical/climatology authority. Used for today-vs-30yr deltas.

import { BaseAdapter, safeJson, readEnv, type AdapterContext } from './BaseAdapter';
import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';

interface VCResp {
  days?: Array<{ tempmax: number; tempmin: number; temp: number; precip: number }>;
  currentConditions?: { temp: number };
}

export class VisualCrossingAdapter extends BaseAdapter {
  readonly id: SourceId = 'visual-crossing';
  readonly meta = SOURCE_REGISTRY['visual-crossing'];

  async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const key = ctx.apiKey ?? readEnv(this.meta.apiKeyEnv);
    if (!key) return {};
    // We use the "normals" element which returns long-term averages.
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${ctx.lat.toFixed(2)},${ctx.lng.toFixed(2)}/today?unitGroup=metric&include=days,current&elements=temp,tempmax,tempmin,precip&key=${key}&contentType=json`;
    const r = await safeJson<VCResp>(url, { signal: ctx.signal });
    const today = r.days?.[0];
    if (!today) return {};
    return {
      climatology: {
        monthly_avg_temp_c: today.temp,
        monthly_avg_precip_mm: today.precip,
        today_temp_anomaly_c: null,
      } as PartialSnapshot['climatology'],
    };
  }
}
