// Forecast resolution layers: minutely → hourly → extended → daily → trend.
// Each layer has its own confidence-decay function.

export interface MinutelyEntry {
  timestamp_unix: number;          // minute boundary
  precip_mm_hr: number;
  precip_probability_percent: number;
  lightning_proximity_km: number | null;
}

export interface HourlyEntry {
  timestamp_unix: number;
  temperature_c: number;
  apparent_c: number;
  precip_mm: number;
  precip_probability_percent: number;
  wind_kph: number;
  wind_direction_deg: number;
  cloud_cover_percent: number;
  humidity_percent: number;
  pressure_hpa: number;
  uv_index: number;
  weather_code: number;
  is_day: boolean;
  confidence_percent: number;
}

export interface ExtendedHourlyEntry {
  timestamp_unix: number;
  temperature_c: number;
  precip_mm: number;
  wind_kph: number;
  uv_index: number;
  aqi_us: number | null;
  confidence_percent: number;     // decays with horizon
}

export interface DailyEntry {
  date_unix: number;
  high_c: number;
  low_c: number;
  precip_mm: number;
  precip_probability_percent: number;
  wind_kph_max: number;
  uv_index_max: number;
  sunrise: string;
  sunset: string;
  weather_code: number;
  day_quality_score: number;       // 0-100 composite
  climatology_delta_c: number | null;
  confidence_percent: number;
}

export interface TrendEntry {
  date_unix: number;
  temperature_anomaly_c: number;   // vs 30-yr average
  confidence_percent: number;      // typically < 40 for 15-30d
}

export interface ForecastLayers {
  minutely: MinutelyEntry[];       // 0-60 min
  hourly: HourlyEntry[];           // 0-48 hr
  extendedHourly: ExtendedHourlyEntry[]; // 48-168 hr
  daily: DailyEntry[];             // 0-14 days
  trend: TrendEntry[];             // 15-30 days
}

export const EMPTY_FORECAST: ForecastLayers = {
  minutely: [],
  hourly: [],
  extendedHourly: [],
  daily: [],
  trend: [],
};
