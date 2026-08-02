// NOAA / NWS — US-only authoritative source.
// Two-step protocol: /points/{lat,lng} → forecast URL, then fetch it.
// Returns empty for non-US coordinates rather than failing the ensemble.

import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';
import { type AdapterContext,BaseAdapter, safeJson } from './BaseAdapter';

const UA = 'SmartHub/1.0 (https://amv.life)';

function isLikelyUS(lat: number, lng: number): boolean {
  // Continental US bounding box plus Alaska & Hawaii buffer.
  if (lat >= 18 && lat <= 72 && lng >= -180 && lng <= -65) return true;
  return false;
}

interface PointsResp { properties: { forecastHourly: string; forecast: string }; }
interface ForecastResp {
  properties: {
    periods: Array<{
      temperature: number; temperatureUnit: 'F' | 'C';
      windSpeed: string; windDirection: string;
      shortForecast: string; probabilityOfPrecipitation?: { value: number | null };
      relativeHumidity?: { value: number | null };
    }>;
  };
}

export class NOAAAdapter extends BaseAdapter {
  override readonly id: SourceId = 'noaa';
  override readonly meta = SOURCE_REGISTRY['noaa'];

  override async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    if (!isLikelyUS(ctx.lat, ctx.lng)) return {};
    const points = await safeJson<PointsResp>(
      `https://api.weather.gov/points/${ctx.lat.toFixed(2)},${ctx.lng.toFixed(2)}`,
      { headers: { 'User-Agent': UA, Accept: 'application/geo+json' }, signal: ctx.signal },
    );
    const fc = await safeJson<ForecastResp>(points.properties.forecastHourly,
      { headers: { 'User-Agent': UA, Accept: 'application/geo+json' }, signal: ctx.signal });
    const p = fc.properties.periods[0];
    if (!p) return {};
    const tC = p.temperatureUnit === 'F' ? (p.temperature - 32) * 5 / 9 : p.temperature;
    const speedMatch = p.windSpeed?.match(/(\d+)/);
    const speedMph = speedMatch ? Number(speedMatch[1]) : 0;
    return {
      temperature: { actual_c: tC } as PartialSnapshot['temperature'],
      wind: {
        speed_kph: speedMph * 1.60934,
        speed_ms: (speedMph * 1.60934) / 3.6,
      } as PartialSnapshot['wind'],
      precipitation: {
        probability_percent: p.probabilityOfPrecipitation?.value ?? 0,
      } as PartialSnapshot['precipitation'],
      moisture: { relative_humidity_percent: p.relativeHumidity?.value ?? 0 } as PartialSnapshot['moisture'],
    };
  }
}
