/**
 * Pure GPS / physiology math for the fitness engine.
 * No React, no I/O — fully unit-testable.
 */

import type { RoutePoint, TrackSplit } from './types';

/** Earth radius in meters. */
const EARTH_RADIUS = 6371000;

/** Haversine distance in meters between two coordinates. */
export function haversine(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Adaptive 1D Kalman filter for GPS coordinates.
 * Smooths jitter while staying responsive to real movement, using the
 * reported horizontal accuracy as the measurement variance.
 */
export class GeoKalmanFilter {
  private variance = -1; // meters^2, negative == uninitialised
  private lat = 0;
  private lng = 0;
  private timestamp = 0;

  /** @param processNoise expected movement noise in m/s (1–3 for humans) */
  constructor(private readonly processNoise = 1.4) {}

  reset() {
    this.variance = -1;
  }

  process(lat: number, lng: number, accuracy: number, timestamp: number) {
    const acc = Math.max(accuracy || 8, 1);

    if (this.variance < 0) {
      this.lat = lat;
      this.lng = lng;
      this.timestamp = timestamp;
      this.variance = acc * acc;
      return { lat, lng, accuracy: acc };
    }

    const dtMs = timestamp - this.timestamp;
    if (dtMs > 0) {
      this.variance += (dtMs * this.processNoise * this.processNoise) / 1000;
      this.timestamp = timestamp;
    }

    const gain = this.variance / (this.variance + acc * acc);
    this.lat += gain * (lat - this.lat);
    this.lng += gain * (lng - this.lng);
    this.variance = (1 - gain) * this.variance;

    return { lat: this.lat, lng: this.lng, accuracy: Math.sqrt(this.variance) };
  }
}

/** Convert m/s to pace in seconds per kilometer (0 when standing still). */
export function speedToPace(metersPerSecond: number): number {
  if (!metersPerSecond || metersPerSecond <= 0.15) return 0;
  return 1000 / metersPerSecond;
}

/** Format seconds-per-km as `m:ss`. Returns `--:--` for invalid pace. */
export function formatPace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0 || secondsPerKm > 3600) {
    return '--:--';
  }
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  if (secs === 60) return `${mins + 1}:00`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** Format a duration in seconds as `h:mm:ss` / `mm:ss`. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return [
    hrs > 0 ? String(hrs) : null,
    String(mins).padStart(2, '0'),
    String(secs).padStart(2, '0'),
  ]
    .filter(Boolean)
    .join(':');
}

/** Total route distance in meters. */
export function routeDistance(route: RoutePoint[] | null | undefined): number {
  if (!route || route.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += haversine(route[i - 1], route[i]);
  }
  return total;
}

/**
 * Cumulative elevation gain/loss in meters, ignoring sub-threshold noise.
 */
export function elevationProfile(
  route: RoutePoint[] | null | undefined,
  noiseThreshold = 1.5
): { gain: number; loss: number; hasData: boolean } {
  if (!route || route.length < 2) return { gain: 0, loss: 0, hasData: false };
  let gain = 0;
  let loss = 0;
  let reference: number | null = null;
  let hasData = false;

  for (const point of route) {
    if (typeof point.alt !== 'number' || !Number.isFinite(point.alt)) continue;
    hasData = true;
    if (reference === null) {
      reference = point.alt;
      continue;
    }
    const delta = point.alt - reference;
    if (Math.abs(delta) < noiseThreshold) continue;
    if (delta > 0) gain += delta;
    else loss += -delta;
    reference = point.alt;
  }

  return { gain: Math.round(gain), loss: Math.round(loss), hasData };
}

/**
 * Split the route into fixed-distance segments (default 1 km) with the
 * elapsed time and pace of each, interpolating across the crossing point.
 */
export function computeSplits(
  route: RoutePoint[] | null | undefined,
  unitMeters = 1000
): TrackSplit[] {
  if (!route || route.length < 2 || unitMeters <= 0) return [];

  const splits: TrackSplit[] = [];
  let cumulative = 0;
  let splitStartTime = route[0].timestamp;
  let nextBoundary = unitMeters;

  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1];
    const curr = route[i];
    const segment = haversine(prev, curr);
    if (segment <= 0) continue;
    const segmentTime = Math.max(0, curr.timestamp - prev.timestamp);

    let consumed = 0;
    while (cumulative + (segment - consumed) >= nextBoundary) {
      const needed = nextBoundary - (cumulative + consumed);
      const ratio = needed / (segment - consumed || 1);
      const boundaryTime = prev.timestamp + segmentTime * (consumed / segment + ratio);
      const seconds = Math.max(0, (boundaryTime - splitStartTime) / 1000);
      splits.push({
        index: splits.length + 1,
        distanceMeters: unitMeters,
        seconds: Math.round(seconds),
        paceSecPerKm: seconds > 0 ? (seconds / unitMeters) * 1000 : 0,
        partial: false,
      });
      splitStartTime = boundaryTime;
      consumed += needed;
      nextBoundary += unitMeters;
    }

    cumulative += segment;
  }

  // Trailing partial split
  const covered = splits.length * unitMeters;
  const remainder = cumulative - covered;
  if (remainder > 20) {
    const seconds = Math.max(0, (route[route.length - 1].timestamp - splitStartTime) / 1000);
    splits.push({
      index: splits.length + 1,
      distanceMeters: Math.round(remainder),
      seconds: Math.round(seconds),
      paceSecPerKm: seconds > 0 && remainder > 0 ? (seconds / remainder) * 1000 : 0,
      partial: true,
    });
  }

  return splits;
}

/** Speed-aware MET table (walking / running), used for live calorie burn. */
export function metForSpeed(metersPerSecond: number): number {
  const kmh = metersPerSecond * 3.6;
  if (kmh < 1.5) return 1.5; // standing
  if (kmh < 3.5) return 2.8; // slow stroll
  if (kmh < 5) return 3.5;
  if (kmh < 6.5) return 4.3; // brisk walk
  if (kmh < 8) return 6.0; // jog
  if (kmh < 9.7) return 8.3;
  if (kmh < 11.3) return 9.8;
  if (kmh < 12.9) return 11.0;
  if (kmh < 14.5) return 12.8;
  return 14.5;
}

/**
 * Incremental calorie burn for a slice of time at a given speed.
 * kcal = MET * 3.5 * weightKg / 200 * minutes
 */
export function caloriesForSlice(
  metersPerSecond: number,
  seconds: number,
  weightKg: number
): number {
  if (seconds <= 0) return 0;
  const met = metForSpeed(metersPerSecond);
  return met * 3.5 * (weightKg / 200) * (seconds / 60);
}

/** Estimated step count from distance, adjusted per activity type. */
export function estimateSteps(distanceMeters: number, activityType?: string): number {
  const stride = activityType === 'running' ? 1.05 : 0.75;
  return Math.max(0, Math.round((distanceMeters || 0) / stride));
}