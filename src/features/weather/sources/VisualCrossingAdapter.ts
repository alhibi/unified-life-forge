// Visual Crossing — historical/climatology authority. Used for today-vs-30yr deltas.
// The API key lives server-side; this adapter calls the visual-crossing-proxy
// edge function instead of hitting the provider directly.

import { supabase } from '@/integrations/supabase/client';

import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';
import { type AdapterContext, BaseAdapter } from './BaseAdapter';

interface VCProxyResp {
  temp: number | null;
  tempmax: number | null;
  tempmin: number | null;
  precip: number | null;
  error?: string;
}

export class VisualCrossingAdapter extends BaseAdapter {
  override readonly id: SourceId = 'visual-crossing';
  override readonly meta = SOURCE_REGISTRY['visual-crossing'];

  override async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const { data, error } = await supabase.functions.invoke<VCProxyResp>(
      'visual-crossing-proxy',
      { body: { lat: ctx.lat, lng: ctx.lng } },
    );
    if (error || !data || data.error || data.temp == null) return {};
    return {
      climatology: {
        monthly_avg_temp_c: data.temp,
        monthly_avg_precip_mm: data.precip ?? 0,
        today_temp_anomaly_c: null,
      } as PartialSnapshot['climatology'],
    };
  }
}
