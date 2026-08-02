// RainViewer — radar + satellite tile catalog. No key, public CDN.

import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';
import { type AdapterContext,BaseAdapter, safeJson } from './BaseAdapter';

interface RVResp {
  host: string;
  radar?: { past?: Array<{ time: number; path: string }>; nowcast?: Array<{ time: number; path: string }> };
  satellite?: { infrared?: Array<{ time: number; path: string }> };
}

export class RainViewerAdapter extends BaseAdapter {
  override readonly id: SourceId = 'rainviewer';
  override readonly meta = SOURCE_REGISTRY['rainviewer'];

  override async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const r = await safeJson<RVResp>('https://api.rainviewer.com/public/weather-maps.json', { signal: ctx.signal });
    const past = r.radar?.past ?? [];
    const nowcast = r.radar?.nowcast ?? [];
    const sat = r.satellite?.infrared ?? [];
    const latestPath = past[past.length - 1]?.path ?? '';
    const satPath = sat[sat.length - 1]?.path ?? null;
    return {
      radar: {
        tiles_available: past.length > 0,
        past_timestamps: past.map(p => p.time),
        future_timestamps: nowcast.map(p => p.time),
        // Tile template uses {z}/{x}/{y} for Leaflet/MapLibre.
        tile_url_template: latestPath ? `${r.host}${latestPath}/256/{z}/{x}/{y}/2/1_1.png` : '',
        satellite_tile_url_template: satPath ? `${r.host}${satPath}/256/{z}/{x}/{y}/0/0_0.png` : null,
        snowcover_tile_url_template: null,
        last_radar_update_unix: (past[past.length - 1]?.time ?? 0) * 1000,
      } as PartialSnapshot['radar'],
    };
  }
}
