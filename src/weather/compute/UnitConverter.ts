// Pure unit conversions — no I/O. All functions are total over the real line.

export const msToKph = (ms: number): number => ms * 3.6;
export const kphToMs = (kph: number): number => kph / 3.6;
export const msToKnots = (ms: number): number => ms * 1.9438445;
export const cToF = (c: number): number => c * 9 / 5 + 32;
export const fToC = (f: number): number => (f - 32) * 5 / 9;
export const hpaToInhg = (hpa: number): number => hpa * 0.02953;
export const inhgToHpa = (inhg: number): number => inhg / 0.02953;
export const mmToInches = (mm: number): number => mm / 25.4;
export const kmToMiles = (km: number): number => km * 0.621371;

// 16-point compass — used everywhere we display wind direction.
const COMPASS_16 = [
  'N','NNE','NE','ENE','E','ESE','SE','SSE',
  'S','SSW','SW','WSW','W','WNW','NW','NNW',
] as const;

export function degreesToCardinal16(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const idx = Math.round(normalized / 22.5) % 16;
  return COMPASS_16[idx];
}

// Beaufort scale (0–12) — wind speed in m/s.
const BEAUFORT_THRESHOLDS = [0.3, 1.5, 3.3, 5.5, 7.9, 10.7, 13.8, 17.1, 20.7, 24.4, 28.4, 32.6];
const BEAUFORT_LABELS = [
  'Calm','Light Air','Light Breeze','Gentle Breeze','Moderate Breeze',
  'Fresh Breeze','Strong Breeze','Near Gale','Gale','Strong Gale',
  'Storm','Violent Storm','Hurricane',
];

export function beaufortScale(speed_ms: number): { scale: number; description: string } {
  let scale = 12;
  for (let i = 0; i < BEAUFORT_THRESHOLDS.length; i++) {
    if (speed_ms < BEAUFORT_THRESHOLDS[i]) { scale = i; break; }
  }
  return { scale, description: BEAUFORT_LABELS[scale] };
}

// Beaufort sea state — derived from wave height (m).
const SEA_STATE_THRESHOLDS = [0.1, 0.5, 1.25, 2.5, 4, 6, 9, 14];
const SEA_STATE_LABELS = [
  'Calm (glassy)','Calm (rippled)','Smooth','Slight','Moderate',
  'Rough','Very Rough','High','Very High','Phenomenal',
];

export function beaufortSeaState(wave_height_m: number): { state: number; description: string } {
  let state = 9;
  for (let i = 0; i < SEA_STATE_THRESHOLDS.length; i++) {
    if (wave_height_m < SEA_STATE_THRESHOLDS[i]) { state = i; break; }
  }
  return { state, description: SEA_STATE_LABELS[state] };
}
