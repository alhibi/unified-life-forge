/**
 * Living Mind — growth model.
 *
 * Two independent curves:
 *  - Fullness: time-gated, content-blind. Reaches 1.0 in ten years from
 *    the user's first note. Not accelerable by writing more.
 *  - Vitality: content-driven, immediate. Rises with cumulative note mass.
 *
 * Per-hemisphere mass is tracked separately so the mind's asymmetry
 * honestly reflects how the user actually thinks.
 */

export const TEN_YEARS_MS = 10 * 365.25 * 24 * 60 * 60 * 1000;

/** Smootherstep — slow start, gathers pace, settles gently. */
export function fullnessLevel(firstNoteAt: Date | number | null, now: Date | number = Date.now()): number {
  if (!firstNoteAt) return 0;
  const first = typeof firstNoteAt === 'number' ? firstNoteAt : firstNoteAt.getTime();
  const t = typeof now === 'number' ? now : now.getTime();
  const x = Math.min(1, Math.max(0, (t - first) / TEN_YEARS_MS));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export interface NoteContribution {
  wordCount: number;
  isAiSynthesized: boolean;
  backlinkCount: number;
}

/** Calibrated so ~2 substantive notes/day for ~2 years → vitality ≈ 0.7. */
const M_REF = 4200;

export function noteMass({ wordCount, isAiSynthesized, backlinkCount }: NoteContribution): number {
  return Math.log(1 + Math.max(0, wordCount)) * (isAiSynthesized ? 1.15 : 1.0) * (1 + 0.1 * Math.max(0, backlinkCount));
}

export function vitality(cumulativeMass: number): number {
  return 1 - Math.exp(-Math.max(0, cumulativeMass) / M_REF);
}

export interface RenderParams {
  coreRadius: number;
  organic: { glowIntensity: number; filamentCount: number };
  mechanical: { glowIntensity: number; filamentCount: number };
}

export function renderParams(
  fullness: number,
  vOrganic: number,
  vMech: number,
  opts: { baseRadius?: number; maxFilaments?: number } = {},
): RenderParams {
  const BASE_RADIUS = opts.baseRadius ?? 1.0;
  const MAX_FILAMENTS = opts.maxFilaments ?? 300;
  return {
    coreRadius: BASE_RADIUS * (0.15 + 0.85 * fullness),
    organic:    { glowIntensity: 0.15 + 0.85 * vOrganic, filamentCount: Math.floor(MAX_FILAMENTS * vOrganic) },
    mechanical: { glowIntensity: 0.15 + 0.85 * vMech,    filamentCount: Math.floor(MAX_FILAMENTS * vMech) },
  };
}

/** Convenience: format an age in a "2y 4m" style, RTL-safe (pure digits). */
export function formatAge(firstNoteAt: Date | number | null, now: Date | number = Date.now()): string {
  if (!firstNoteAt) return '0d';
  const first = typeof firstNoteAt === 'number' ? firstNoteAt : firstNoteAt.getTime();
  const t = typeof now === 'number' ? now : now.getTime();
  const ms = Math.max(0, t - first);
  const days = Math.floor(ms / (24 * 3600 * 1000));
  const years = Math.floor(days / 365.25);
  const months = Math.floor((days - years * 365.25) / 30.4375);
  if (years > 0) return `${years}y ${months}m`;
  if (months > 0) return `${months}m ${days - months * 30}d`;
  return `${days}d`;
}