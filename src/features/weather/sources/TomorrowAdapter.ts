// Tomorrow.io — hyper-local minute-by-minute precipitation + lightning.
// Stub until VITE_TOMORROW_API_KEY is supplied; returns {} silently otherwise.

import { BaseAdapter, safeJson, readEnv, type AdapterContext } from './BaseAdapter';
import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';
import type { ForecastLayers, MinutelyEntry } from '../types/ForecastLayer';

interface TIResp {
  data?: {
    timelines?: Array<{
      intervals: Array<{ startTime: string; values: Record<string, number> }>;
      timestep: string;
    }>;
  };
}

export class TomorrowAdapter extends BaseAdapter {
  readonly id: SourceId = 'tomorrow';
  readonly meta = SOURCE_REGISTRY['tomorrow'];

  private apiKey(): string | undefined {
    return readEnv(this.meta.apiKeyEnv);
  }

  async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const key = ctx.apiKey ?? this.apiKey();
    if (!key) return {};
    const params = new URLSearchParams({
      location: `${ctx.lat.toFixed(2)},${ctx.lng.toFixed(2)}`,
      fields: 'temperature,humidity,windSpeed,windDirection,precipitationIntensity,precipitationProbability,uvIndex,treeIndex,grassIndex,weedIndex',
      timesteps: 'current',
      apikey: key,
    });
    const r = await safeJson<TIResp>(`https://api.tomorrow.io/v4/timelines?${params}`, { signal: ctx.signal });
    const cur = r.data?.timelines?.[0]?.intervals?.[0]?.values ?? {};
    return {
      temperature: { actual_c: cur.temperature ?? 0 } as PartialSnapshot['temperature'],
      moisture: { relative_humidity_percent: cur.humidity ?? 0 } as PartialSnapshot['moisture'],
      wind: { speed_kph: (cur.windSpeed ?? 0) * 3.6, direction_deg: cur.windDirection ?? 0 } as PartialSnapshot['wind'],
      precipitation: {
        intensity_mm_hr: cur.precipitationIntensity ?? 0,
        probability_percent: cur.precipitationProbability ?? 0,
      } as PartialSnapshot['precipitation'],
      solar: { uv_index: cur.uvIndex ?? 0 } as PartialSnapshot['solar'],
      biological: {
        pollen_tree_index: cur.treeIndex ?? null,
        pollen_grass_index: cur.grassIndex ?? null,
        pollen_weed_index: cur.weedIndex ?? null,
      } as PartialSnapshot['biological'],
    };
  }

  async fetchForecast(ctx: AdapterContext): Promise<Partial<ForecastLayers>> {
    const key = ctx.apiKey ?? this.apiKey();
    if (!key) return {};
    const params = new URLSearchParams({
      location: `${ctx.lat.toFixed(2)},${ctx.lng.toFixed(2)}`,
      fields: 'precipitationIntensity,precipitationProbability',
      timesteps: '1m',
      apikey: key,
      endTime: new Date(Date.now() + 60 * 60_000).toISOString(),
    });
    const r = await safeJson<TIResp>(`https://api.tomorrow.io/v4/timelines?${params}`, { signal: ctx.signal });
    const intervals = r.data?.timelines?.[0]?.intervals ?? [];
    const minutely: MinutelyEntry[] = intervals.slice(0, 60).map(iv => ({
      timestamp_unix: new Date(iv.startTime).getTime(),
      precip_mm_hr: iv.values.precipitationIntensity ?? 0,
      precip_probability_percent: iv.values.precipitationProbability ?? 0,
      lightning_proximity_km: null,
    }));
    return { minutely };
  }
}
