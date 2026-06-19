// OpenUV — medically precise UV with skin-type personalization. BYOK.

import { BaseAdapter, safeJson, readEnv, type AdapterContext } from './BaseAdapter';
import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';

interface OUResp {
  result?: {
    uv: number; uv_max: number; uv_max_time: string;
    safe_exposure_time?: Record<string, number | null>;
  };
}

export class OpenUVAdapter extends BaseAdapter {
  readonly id: SourceId = 'openuv';
  readonly meta = SOURCE_REGISTRY['openuv'];

  async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const key = ctx.apiKey ?? readEnv(this.meta.apiKeyEnv);
    if (!key) return {};
    const r = await safeJson<OUResp>(
      `https://api.openuv.io/api/v1/uv?lat=${ctx.lat.toFixed(2)}&lng=${ctx.lng.toFixed(2)}`,
      { headers: { 'x-access-token': key }, signal: ctx.signal },
    );
    const res = r.result;
    if (!res) return {};
    const expo = res.safe_exposure_time ?? {};
    return {
      solar: {
        uv_index: res.uv,
        uv_max_today: res.uv_max,
        uv_max_time: res.uv_max_time,
        burn_time_skin_type_2_min: expo.st2 ?? null,
        burn_time_skin_type_4_min: expo.st4 ?? null,
      } as PartialSnapshot['solar'],
    };
  }
}
