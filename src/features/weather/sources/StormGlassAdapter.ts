// StormGlass — marine + multi-altitude wind + solar radiation. BYOK, 10/day.

import { BaseAdapter, safeJson, readEnv, type AdapterContext } from './BaseAdapter';
import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';

interface SGResp { hours?: Array<Record<string, Record<string, number> | number | string>>; }

export class StormGlassAdapter extends BaseAdapter {
  readonly id: SourceId = 'stormglass';
  readonly meta = SOURCE_REGISTRY['stormglass'];

  async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const key = ctx.apiKey ?? readEnv(this.meta.apiKeyEnv);
    if (!key) return {};
    const params = ['waveHeight','wavePeriod','waveDirection','swellHeight','swellPeriod','waterTemperature','visibility'].join(',');
    const url = `https://api.stormglass.io/v2/weather/point?lat=${ctx.lat.toFixed(2)}&lng=${ctx.lng.toFixed(2)}&params=${params}`;
    const r = await safeJson<SGResp>(url, { headers: { Authorization: key }, signal: ctx.signal });
    const h0 = r.hours?.[0] ?? {};
    const pick = (k: string): number | null => {
      const v = h0[k];
      if (typeof v === 'object' && v !== null) {
        const vals = Object.values(v).filter(x => typeof x === 'number') as number[];
        return vals.length ? vals.reduce((a, b) => a + b) / vals.length : null;
      }
      return typeof v === 'number' ? v : null;
    };
    const waveH = pick('waveHeight');
    return {
      marine: {
        available: waveH !== null,
        wave_height_m: waveH,
        wave_period_s: pick('wavePeriod'),
        wave_direction_deg: pick('waveDirection'),
        swell_height_m: pick('swellHeight'),
        swell_period_s: pick('swellPeriod'),
        sea_surface_temp_c: pick('waterTemperature'),
        water_visibility_m: pick('visibility'),
      } as PartialSnapshot['marine'],
    };
  }
}
