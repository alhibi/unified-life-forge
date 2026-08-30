// ============================================================================
// PWSObservation — one ground-truth reading from one Personal Weather Station.
//
// A PWS is a private weather station run by an individual or an institution
// (Davis Vantage, Netatmo, Tempest, Ecowitt, …). Unlike NWP model outputs,
// which interpolate between official stations, a PWS observation is a real
// measurement at a specific point — the same kind of data a forecast model
// is trying to predict. Folding PWS observations into the ensemble gives the
// engine a ground-truth anchor that no model alone can supply.
//
// STRUCTURE
//   The fields are intentionally minimal. The aggregator picks the closest
//   stations, weights them by distance, and emits a single median reading
//   into the snapshot. The original observations are kept on `moisture` (the
//   only section in WeatherSnapshot.ts that already has a flexible array of
//   sub-fields) so the engine doesn't have to grow its top-level shape.
//
// SOURCE PROVENANCE
//   `provider` identifies the network that returned the reading. This matters
//   because some providers (CWOP, MADIS) are quality-controlled, while others
//   are unfiltered. The aggregator uses `provider` to compute a quality
//   weight — see PWSAggregator.ts.
// ============================================================================

/** Networks that can supply PWS observations. Extend as adapters are added. */
export type PWSProvider =
  | 'cwop'           // Citizen Weather Observer Program — quality-controlled
  | 'madis'          // NOAA MADIS — quality-controlled, US-focused
  | 'open-meteo'     // Open-Meteo's blended NWP+stations product
  | 'netatmo'        // Netatmo consumer stations
  | 'tempest'        // WeatherFlow Tempest
  | 'wu'             // Weather Underground PWS network
  | 'owm-stations'   // OpenWeatherMap registered stations
  | 'manual';        // operator-curated (e.g. trusted blog/twitter feed)

export interface PWSObservation {
  /** Station identifier from the provider (external_id for OWM, callsign for CWOP, …). */
  stationId: string;
  provider: PWSProvider;
  /** Reading timestamp (epoch ms). */
  timestamp_unix: number;
  /** Distance from the requested point, in kilometres. */
  distance_km: number;
  /** °C. */
  temperature_c: number | null;
  /** % 0..100. */
  humidity_percent: number | null;
  /** hPa. */
  pressure_hpa: number | null;
  /** km/h. */
  wind_kph: number | null;
  /** degrees 0..360. */
  wind_direction_deg: number | null;
  /** mm in the last hour. */
  precip_1h_mm: number | null;
  /** Provider-specific quality indicator, 0..1. 1 = highest trust. */
  quality: number;
}

/** A single station's static metadata. */
export interface PWSStationMeta {
  stationId: string;
  provider: PWSProvider;
  name: string;
  lat: number;
  lng: number;
  elevation_m: number;
  /** Whether the station is currently reporting (false = stale > 1 h). */
  isActive: boolean;
}