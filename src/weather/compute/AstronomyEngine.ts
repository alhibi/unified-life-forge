// Astronomical events — sunrise/sunset, twilight bands, golden/blue hours,
// moon phase. Powered by SunCalc.js (local, zero network).
//
// Reference: Meeus, "Astronomical Algorithms" (the basis of SunCalc).

import * as SunCalc from 'suncalc';
import type { MoonPhaseName, WeatherSnapshot } from '../types/WeatherSnapshot';

function iso(d: Date | null | undefined): string {
  if (!d || isNaN(d.getTime())) return '';
  return d.toISOString();
}

function classifyMoonPhase(phase: number): MoonPhaseName {
  // SunCalc returns 0..1 where 0=new, 0.25=first qtr, 0.5=full, 0.75=last qtr.
  if (phase < 0.03 || phase > 0.97) return 'new_moon';
  if (phase < 0.22) return 'waxing_crescent';
  if (phase < 0.28) return 'first_quarter';
  if (phase < 0.47) return 'waxing_gibbous';
  if (phase < 0.53) return 'full_moon';
  if (phase < 0.72) return 'waning_gibbous';
  if (phase < 0.78) return 'last_quarter';
  return 'waning_crescent';
}

function findNextFullMoon(from: Date): Date {
  // Search forward day-by-day for ~30 days; SunCalc's phase is cheap.
  let prevPhase = SunCalc.getMoonIllumination(from).phase;
  for (let i = 1; i <= 32; i++) {
    const d = new Date(from.getTime() + i * 86_400_000);
    const phase = SunCalc.getMoonIllumination(d).phase;
    // crossing 0.5 → full moon
    if (prevPhase < 0.5 && phase >= 0.5) return d;
    prevPhase = phase;
  }
  return new Date(from.getTime() + 30 * 86_400_000);
}

/**
 * Compute the full astronomical section of a WeatherSnapshot.
 * `now` lets callers pin a specific instant (mainly for tests).
 */
export function computeAstronomy(
  lat: number, lng: number, now: Date = new Date(),
): WeatherSnapshot['astronomical'] {
  const t = SunCalc.getTimes(now, lat, lng);
  const moon = SunCalc.getMoonIllumination(now);
  const moonPos = SunCalc.getMoonPosition(now, lat, lng);
  const moonTimes = SunCalc.getMoonTimes(now, lat, lng);

  // Moon distance — SunCalc doesn't expose it directly, so compute from
  // Meeus mean distance variation (~356,500..406,700 km).
  const meanDist = 384_400; // km
  // Use illumination phase angle to approximate; supermoon when near
  // perigee (<361,000 km) AND near full moon.
  const dist = meanDist - 22_000 * Math.cos(moon.phase * 2 * Math.PI);
  const isSupermoon = dist < 361_000 && Math.abs(moon.phase - 0.5) < 0.05;

  const nextFull = findNextFullMoon(now);

  // Day length: from sunrise → sunset, in hours.
  const dayLength = (t.sunset && t.sunrise && !isNaN(t.sunset.getTime()) && !isNaN(t.sunrise.getTime()))
    ? Math.max(0, (t.sunset.getTime() - t.sunrise.getTime()) / 3_600_000)
    : 0;
  const daylightRemaining = (t.sunset && !isNaN(t.sunset.getTime()))
    ? Math.max(0, (t.sunset.getTime() - now.getTime()) / 3_600_000)
    : 0;

  return {
    sunrise: iso(t.sunrise),
    sunset: iso(t.sunset),
    solar_noon: iso(t.solarNoon),
    astronomical_dawn: iso(t.nightEnd),
    nautical_dawn:     iso(t.nauticalDawn),
    civil_dawn:        iso(t.dawn),
    civil_dusk:        iso(t.dusk),
    nautical_dusk:     iso(t.nauticalDusk),
    astronomical_dusk: iso(t.night),
    golden_hour_morning_start: iso(t.sunrise),
    golden_hour_morning_end:   iso(t.goldenHourEnd),
    golden_hour_evening_start: iso(t.goldenHour),
    golden_hour_evening_end:   iso(t.sunset),
    blue_hour_morning_start: iso(t.dawn),
    blue_hour_morning_end:   iso(t.sunriseEnd),
    blue_hour_evening_start: iso(t.sunsetStart),
    blue_hour_evening_end:   iso(t.dusk),
    day_length_hours: Number(dayLength.toFixed(2)),
    daylight_remaining_hours: Number(daylightRemaining.toFixed(2)),
    moonrise: moonTimes.rise ? iso(moonTimes.rise) : null,
    moonset:  moonTimes.set  ? iso(moonTimes.set)  : null,
    moon_phase_angle_deg: Number((moon.phase * 360).toFixed(2)),
    moon_phase_name: classifyMoonPhase(moon.phase),
    moon_illumination_percent: Number((moon.fraction * 100).toFixed(1)),
    moon_distance_km: Math.round(dist),
    is_supermoon: isSupermoon,
    next_full_moon_date: iso(nextFull),
    next_lunar_eclipse: null,  // would require ELP-2000; out of scope for free tier
    planetary_visibility: [],  // populated by a future ephemeris adapter
    // Live solar position is added by the engine as a runtime overlay.
    ...{} as Record<string, never>,
  };
}

/** Live solar elevation & azimuth (degrees) — recompute every minute in UI. */
export function solarPosition(lat: number, lng: number, when: Date = new Date()) {
  const p = SunCalc.getPosition(when, lat, lng);
  return {
    elevation_deg: (p.altitude * 180) / Math.PI,
    azimuth_deg: ((p.azimuth * 180) / Math.PI + 180) % 360,
  };
}
