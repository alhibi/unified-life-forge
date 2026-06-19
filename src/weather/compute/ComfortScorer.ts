// Composite scoring algorithms — DayQuality (recreational outlook) and
// OutdoorHealth (medical-leaning risk). Each returns 0..100.

import type { WeatherSnapshot } from '../types/WeatherSnapshot';

/** Gaussian comfort: 100 at peak temp, falling off symmetrically. */
function gaussianComfort(t: number, peak = 22, sigma = 8): number {
  const d = (t - peak) / sigma;
  return Math.exp(-(d * d) / 2);
}

export interface DayQualityInputs {
  sunshine_pct: number;
  gusts_kph: number;
  precip_prob_pct: number;
  aqi_us: number;
  temp_c: number;
}

export function dayQualityScore(i: DayQualityInputs): number {
  const sunshine = Math.max(0, Math.min(1, i.sunshine_pct / 100)) * 0.25;
  const wind     = Math.max(0, 1 - i.gusts_kph / 80) * 0.15;
  const precip   = Math.max(0, 1 - i.precip_prob_pct / 100) * 0.30;
  const aqi      = Math.max(0, 1 - i.aqi_us / 200) * 0.15;
  const temp     = gaussianComfort(i.temp_c) * 0.15;
  return Math.round((sunshine + wind + precip + aqi + temp) * 100);
}

export interface OutdoorHealthInputs {
  aqi_us: number;
  uv_index: number;
  pollen_total: number | null;
  apparent_c: number;
}

export function outdoorHealthScore(i: OutdoorHealthInputs): number {
  // Each component subtracts a penalty from a perfect 100.
  let score = 100;
  // AQI: 0 → 0 pts off, 100 → 25 off, 200 → 50 off, 300 → 75 off
  score -= Math.min(75, (i.aqi_us / 4));
  // UV: above 6 increasingly painful
  score -= Math.max(0, (i.uv_index - 3) * 5);
  // Pollen 0..10 (index scale): each point ≈ 3 pts off
  if (i.pollen_total !== null) score -= Math.min(30, i.pollen_total * 3);
  // Heat / cold extremes
  const tempPenalty = Math.max(0, Math.abs(i.apparent_c - 22) - 10) * 1.5;
  score -= tempPenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function aqiCategory(aqi_us: number): WeatherSnapshot['airQuality']['aqi_category'] {
  if (aqi_us <= 50)  return 'good';
  if (aqi_us <= 100) return 'moderate';
  if (aqi_us <= 150) return 'unhealthy_sensitive';
  if (aqi_us <= 200) return 'unhealthy';
  if (aqi_us <= 300) return 'very_unhealthy';
  return 'hazardous';
}

export function uvCategory(uv: number): WeatherSnapshot['solar']['uv_category'] {
  if (uv < 3)  return 'low';
  if (uv < 6)  return 'moderate';
  if (uv < 8)  return 'high';
  if (uv < 11) return 'very_high';
  return 'extreme';
}

/** Skin-type burn time (minutes). Reference: NIH / WHO UV-effect table.
 *  k_factor varies by Fitzpatrick skin type (II ≈ 200, IV ≈ 400). */
export function burnTimeMinutes(uv: number, k_factor: number): number | null {
  if (uv <= 0) return null;
  return Math.round(k_factor / (uv * 3));
}
