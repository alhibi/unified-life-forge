// Thermal & moisture calculations.
// All inputs in SI (°C, %RH, m/s, kPa). Every formula is annotated with its
// scientific reference so future maintainers can verify.

import type { ThermalComfort } from '../types/WeatherSnapshot';

/** Saturation vapor pressure (kPa) — Tetens (1930) formula, valid for T > 0. */
export function saturationVaporPressure_kPa(t_c: number): number {
  return 0.6108 * Math.exp((17.27 * t_c) / (t_c + 237.3));
}

/** Actual vapor pressure (kPa) from temperature and relative humidity. */
export function actualVaporPressure_kPa(t_c: number, rh_percent: number): number {
  return saturationVaporPressure_kPa(t_c) * (rh_percent / 100);
}

/** Vapor Pressure Deficit (kPa) — agricultural/biological standard. */
export function vaporPressureDeficit_kPa(t_c: number, rh_percent: number): number {
  const es = saturationVaporPressure_kPa(t_c);
  const ea = es * (rh_percent / 100);
  return Math.max(0, es - ea);
}

/** Dew point (°C) — Magnus formula, accurate for -45..60 °C. */
export function dewPoint_C(t_c: number, rh_percent: number): number {
  const a = 17.27, b = 237.7;
  const alpha = (a * t_c) / (b + t_c) + Math.log(Math.max(0.01, rh_percent / 100));
  return (b * alpha) / (a - alpha);
}

/** Wet-bulb temperature (°C) — Stull (2011) empirical approximation.
 *  Valid for 5 ≤ RH ≤ 99 and -20 ≤ T ≤ 50. */
export function wetBulb_C(t_c: number, rh_percent: number): number {
  const T = t_c;
  const RH = Math.max(1, Math.min(99, rh_percent));
  return (
    T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659))
    + Math.atan(T + RH) - Math.atan(RH - 1.676331)
    + 0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH)
    - 4.686035
  );
}

/** Absolute humidity (g/m³) — IAPWS-derived approximation. */
export function absoluteHumidity_gm3(t_c: number, rh_percent: number): number {
  // ρ_v = (e × 100) / (Rv × T_kelvin); Rv = 461.5 J/(kg·K)
  const e_pa = actualVaporPressure_kPa(t_c, rh_percent) * 1000;
  const T_k = t_c + 273.15;
  return (e_pa / (461.5 * T_k)) * 1000;
}

/** Specific humidity (g/kg) — mass mixing ratio approximation. */
export function specificHumidity_gkg(t_c: number, rh_percent: number, pressure_hpa = 1013.25): number {
  const e_hpa = actualVaporPressure_kPa(t_c, rh_percent) * 10;
  return (621.97 * e_hpa) / (pressure_hpa - 0.378 * e_hpa);
}

/** NWS Rothfusz heat index (°C). Only meaningful when T ≥ 26.7 °C and RH ≥ 40. */
export function heatIndex_C(t_c: number, rh_percent: number): number | null {
  if (t_c < 26.7 || rh_percent < 40) return null;
  const T = t_c * 9 / 5 + 32; // Rothfusz is in °F
  const R = rh_percent;
  const HI_F =
    -42.379 + 2.04901523 * T + 10.14333127 * R
    - 0.22475541 * T * R - 0.00683783 * T * T
    - 0.05481717 * R * R + 0.00122874 * T * T * R
    + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
  return (HI_F - 32) * 5 / 9;
}

/** NWS / Environment Canada wind chill (°C). Valid for T ≤ 10 °C, V ≥ 4.8 kph. */
export function windChill_C(t_c: number, wind_kph: number): number | null {
  if (t_c > 10 || wind_kph < 4.8) return null;
  const V = Math.pow(wind_kph, 0.16);
  return 13.12 + 0.6215 * t_c - 11.37 * V + 0.3965 * t_c * V;
}

/** Canadian Humidex. */
export function humidex(t_c: number, rh_percent: number): number | null {
  if (t_c < 21) return null;
  const ea_hpa = actualVaporPressure_kPa(t_c, rh_percent) * 10;
  return t_c + 0.5555 * (ea_hpa - 10);
}

/** Unified apparent temperature: pick whichever model applies. */
export function apparentTemperature_C(t_c: number, rh_percent: number, wind_kph: number): number {
  const hi = heatIndex_C(t_c, rh_percent);
  if (hi !== null) return hi;
  const wc = windChill_C(t_c, wind_kph);
  if (wc !== null) return wc;
  return t_c;
}

/** Thom Discomfort Index — DI = T - 0.55(1 - 0.01·RH)(T - 14.5). */
export function discomfortIndex(t_c: number, rh_percent: number): number {
  return t_c - 0.55 * (1 - 0.01 * rh_percent) * (t_c - 14.5);
}

/** Human thermal-comfort bucket from apparent temperature. */
export function classifyThermalComfort(apparent_c: number): ThermalComfort {
  if (apparent_c < -15) return 'dangerously_cold';
  if (apparent_c < 5)   return 'cold';
  if (apparent_c < 15)  return 'cool';
  if (apparent_c < 24)  return 'comfortable';
  if (apparent_c < 30)  return 'warm';
  if (apparent_c < 40)  return 'hot';
  return 'dangerously_hot';
}

/** Cloud base estimate (m) when no source supplies it.
 *  Espy's formula: base ≈ 125 × (T − Td). */
export function estimateCloudBase_m(t_c: number, dew_point_c: number): number {
  const spread = Math.max(0, t_c - dew_point_c);
  return Math.round(spread * 125);
}
