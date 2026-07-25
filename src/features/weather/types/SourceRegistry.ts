// Source registry — declarative metadata for every weather data source.
// The engine consumes this to know which adapters to call, their weights
// in the ensemble, and their current circuit-breaker state.

import type { PartialSnapshot } from './WeatherSnapshot';
import type { ForecastLayers } from './ForecastLayer';

export type SourceId =
  | 'open-meteo' | 'met-norway' | 'noaa' | 'tomorrow' | 'openweathermap'
  | 'weatherbit' | 'waqi' | 'stormglass' | 'rainviewer' | 'openuv'
  | 'sunrise-sunset' | 'visual-crossing';

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

export const SOURCE_REGISTRY: Record<SourceId, SourceMeta> = {
  'open-meteo':     { id: 'open-meteo',     label: 'Open-Meteo',        weight: 0.22, requiresApiKey: false,                                    domain: 'atmosphere',  homepage: 'https://open-meteo.com',         freeTierNotes: 'Unlimited non-commercial' },
  'met-norway':     { id: 'met-norway',     label: 'MET Norway / Yr',   weight: 0.19, requiresApiKey: false,                                    domain: 'atmosphere',  homepage: 'https://api.met.no',             freeTierNotes: 'User-Agent required' },
  'noaa':           { id: 'noaa',           label: 'NOAA / NWS',        weight: 0.17, requiresApiKey: false,                                    domain: 'atmosphere',  homepage: 'https://api.weather.gov',        freeTierNotes: 'US only' },
  'tomorrow':       { id: 'tomorrow',       label: 'Tomorrow.io',       weight: 0.16, requiresApiKey: true,  apiKeyEnv: 'VITE_TOMORROW_API_KEY', domain: 'atmosphere',  homepage: 'https://tomorrow.io' },
  'openweathermap': { id: 'openweathermap', label: 'OpenWeatherMap',    weight: 0.13, requiresApiKey: true,  apiKeyEnv: 'VITE_OWM_API_KEY',      domain: 'atmosphere',  homepage: 'https://openweathermap.org' },
  'weatherbit':     { id: 'weatherbit',     label: 'Weatherbit',        weight: 0.10, requiresApiKey: true,  apiKeyEnv: 'VITE_WEATHERBIT_API_KEY', domain: 'atmosphere', homepage: 'https://weatherbit.io' },
  'waqi':           { id: 'waqi',           label: 'World AQI',         weight: 1.00, requiresApiKey: true,  apiKeyEnv: 'VITE_WAQI_TOKEN',       domain: 'air-quality', homepage: 'https://aqicn.org', freeTierNotes: 'Ground station readings' },
  'stormglass':     { id: 'stormglass',     label: 'StormGlass',        weight: 0.08, requiresApiKey: true,  apiKeyEnv: 'VITE_STORMGLASS_API_KEY', domain: 'marine',     homepage: 'https://stormglass.io', freeTierNotes: '10 calls/day' },
  'rainviewer':     { id: 'rainviewer',     label: 'RainViewer Radar',  weight: 1.00, requiresApiKey: false,                                    domain: 'radar',       homepage: 'https://rainviewer.com' },
  'openuv':         { id: 'openuv',         label: 'OpenUV',            weight: 1.00, requiresApiKey: true,  apiKeyEnv: 'VITE_OPENUV_API_KEY',   domain: 'uv',          homepage: 'https://openuv.io', freeTierNotes: '50 calls/day' },
  'sunrise-sunset': { id: 'sunrise-sunset', label: 'SunCalc (local)',   weight: 1.00, requiresApiKey: false,                                    domain: 'astronomy',   homepage: 'https://github.com/mourner/suncalc' },
  'visual-crossing':{ id: 'visual-crossing',label: 'Visual Crossing',   weight: 0.00, requiresApiKey: true,  apiKeyEnv: 'VITE_VISUAL_CROSSING_API_KEY', domain: 'historical', homepage: 'https://weather.visualcrossing.com', freeTierNotes: '1000 calls/day, historical only' },
};

export const ALL_SOURCE_IDS = Object.keys(SOURCE_REGISTRY) as SourceId[];
