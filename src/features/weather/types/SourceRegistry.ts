// Source registry — declarative metadata for every weather data source.
// The engine consumes this to know which adapters to call, their weights
// in the ensemble, and their current circuit-breaker state.

import type { ForecastLayers } from './ForecastLayer';
import type { PartialSnapshot } from './WeatherSnapshot';

export type SourceId =
  | 'open-meteo' | 'met-norway' | 'noaa' | 'tomorrow' | 'openweathermap'
  | 'weatherbit' | 'waqi' | 'stormglass' | 'rainviewer' | 'openuv'
  | 'sunrise-sunset' | 'visual-crossing' | 'pws-network';

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface SourceMeta {
  id: SourceId;
  label: string;
  weight: number;            // 0..1 — share of ensemble vote
  requiresApiKey: boolean;
  apiKeyEnv?: string;        // env-var name (Vite import.meta.env)
  domain: 'atmosphere' | 'air-quality' | 'radar' | 'uv' | 'astronomy' | 'historical' | 'marine';
  homepage: string;
  freeTierNotes?: string;
  /** Hard timeout for a single attempt in ms. Tuned per source: heavy APIs
   *  (Met Norway, NOAA, StormGlass) deserve more headroom than lightweight
   *  providers (Open-Meteo, WAQI). Defaults to 5000 if absent. */
  timeoutMs?: number;
  /** Max attempts (including the first). 1 = no retry. Defaults to 2. */
  retryMax?: number;
}

export interface AdapterResponse {
  sourceId: SourceId;
  ok: boolean;
  durationMs: number;
  snapshot?: PartialSnapshot;
  forecast?: Partial<ForecastLayers>;
  error?: string;
}

export interface BreakerSnapshot {
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureUnix: number | null;
  lastSuccessUnix: number | null;
  cooldownUntilUnix: number | null;
  errorRate24h: number;
  avgResponseMs: number;
}

const NO_KEY = false;
const KEY = true;

export const SOURCE_REGISTRY: Record<SourceId, SourceMeta> = {
  'open-meteo':      { id: 'open-meteo',      label: 'Open-Meteo',        weight: 0.22, requiresApiKey: NO_KEY,                                                                                      domain: 'atmosphere',   homepage: 'https://open-meteo.com',                   freeTierNotes: 'Unlimited non-commercial',                       timeoutMs: 4000, retryMax: 2 },
  'met-norway':      { id: 'met-norway',      label: 'MET Norway / Yr',   weight: 0.19, requiresApiKey: NO_KEY,                                                                                      domain: 'atmosphere',   homepage: 'https://api.met.no',                       freeTierNotes: 'User-Agent required',                          timeoutMs: 8000, retryMax: 2 },
  'noaa':            { id: 'noaa',            label: 'NOAA / NWS',        weight: 0.17, requiresApiKey: NO_KEY,                                                                                      domain: 'atmosphere',   homepage: 'https://api.weather.gov',                  freeTierNotes: 'US only',                                      timeoutMs: 8000, retryMax: 2 },
  'tomorrow':        { id: 'tomorrow',        label: 'Tomorrow.io',       weight: 0.16, requiresApiKey: KEY,   apiKeyEnv: 'VITE_TOMORROW_API_KEY',                                                   domain: 'atmosphere',   homepage: 'https://tomorrow.io',                       timeoutMs: 6000, retryMax: 2 },
  'openweathermap':  { id: 'openweathermap',  label: 'OpenWeatherMap',    weight: 0.13, requiresApiKey: KEY,   apiKeyEnv: 'VITE_OWM_API_KEY',                                                        domain: 'atmosphere',   homepage: 'https://openweathermap.org',                timeoutMs: 5000, retryMax: 2 },
  'weatherbit':      { id: 'weatherbit',      label: 'Weatherbit',        weight: 0.10, requiresApiKey: KEY,   apiKeyEnv: 'VITE_WEATHERBIT_API_KEY',                                                domain: 'atmosphere',   homepage: 'https://weatherbit.io',                      timeoutMs: 5000, retryMax: 2 },
  'waqi':            { id: 'waqi',            label: 'World AQI',         weight: 1.00, requiresApiKey: KEY,   apiKeyEnv: 'VITE_WAQI_TOKEN',                                                         domain: 'air-quality',  homepage: 'https://aqicn.org', freeTierNotes: 'Ground station readings',                  timeoutMs: 4000, retryMax: 2 },
  'stormglass':      { id: 'stormglass',      label: 'StormGlass',        weight: 0.08, requiresApiKey: KEY,   apiKeyEnv: 'VITE_STORMGLASS_API_KEY',                                                domain: 'marine',       homepage: 'https://stormglass.io', freeTierNotes: '10 calls/day',                  timeoutMs: 8000, retryMax: 2 },
  'rainviewer':      { id: 'rainviewer',      label: 'RainViewer Radar',  weight: 1.00, requiresApiKey: NO_KEY,                                                                                      domain: 'radar',        homepage: 'https://rainviewer.com',                     timeoutMs: 4000, retryMax: 2 },
  'openuv':          { id: 'openuv',          label: 'OpenUV',            weight: 1.00, requiresApiKey: KEY,   apiKeyEnv: 'VITE_OPENUV_API_KEY',                                                     domain: 'uv',           homepage: 'https://openuv.io', freeTierNotes: '50 calls/day',                       timeoutMs: 4000, retryMax: 2 },
  'sunrise-sunset':  { id: 'sunrise-sunset',  label: 'SunCalc (local)',   weight: 1.00, requiresApiKey: NO_KEY,                                                                                      domain: 'astronomy',    homepage: 'https://github.com/mourner/suncalc',          timeoutMs: 1000, retryMax: 1 },
  'visual-crossing': { id: 'visual-crossing', label: 'Visual Crossing',   weight: 0.00, requiresApiKey: KEY,   apiKeyEnv: 'VITE_VISUAL_CROSSING_API_KEY',                                            domain: 'historical',   homepage: 'https://weather.visualcrossing.com', freeTierNotes: '1000 calls/day, historical only', timeoutMs: 6000, retryMax: 2 },
  'pws-network':     { id: 'pws-network',     label: 'PWS Network (aggregate)', weight: 0.18, requiresApiKey: NO_KEY,                                                                                  domain: 'atmosphere',   homepage: 'https://github.com/unified-life-forge/weather-pws',                          freeTierNotes: 'Aggregates registered PWS providers',                  timeoutMs: 4000, retryMax: 1 },
};

export const ALL_SOURCE_IDS = Object.keys(SOURCE_REGISTRY) as SourceId[];