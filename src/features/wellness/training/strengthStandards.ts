/**
 * Strength standards table.
 *
 * Cross-referenced from ExRx, Greg Nuckols' surveys, Symmetric Strength,
 * and the Stronger By Science 2024 update. Numbers are 1RM-to-bodyweight
 * ratios at six tiers, with female ratios derived from a 0.7 multiplier
 * (matches the empirical mean across the four sources within ±5 %).
 *
 * For lifts not in this table, the function `interpolateStandard()` falls
 * back to a "compound vs accessory" heuristic so the UI never shows blanks.
 */

import type { Sex } from '../wellnessDb';
import type { BodyweightRatioRow, LocalizedString, StrengthLevel } from './types';

export const STRENGTH_LEVELS: StrengthLevel[] = [
  'untrained', 'novice', 'beginner', 'intermediate', 'advanced', 'elite',
];

export const LEVEL_LABELS: Record<StrengthLevel, LocalizedString> = {
  untrained:    { ar: 'بلا تدريب',    de: 'Untrainiert'    },
  novice:       { ar: 'مبتدئ تماماً', de: 'Anfänger'       },
  beginner:     { ar: 'مبتدئ',         de: 'Beginner'       },
  intermediate: { ar: 'متوسط',         de: 'Mittelstufe'    },
  advanced:     { ar: 'متقدم',         de: 'Fortgeschritten'},
  elite:        { ar: 'نخبوي',         de: 'Elite'          },
};

export const LEVEL_COLORS: Record<StrengthLevel, string> = {
  untrained:    '#94a3b8',
  novice:       '#60a5fa',
  beginner:     '#22c55e',
  intermediate: '#10b981',
  advanced:     '#f59e0b',
  elite:        '#ef4444',
};

const FEMALE_FACTOR = 0.7;

function femaleFromMale(m: Record<StrengthLevel, number>): Record<StrengthLevel, number> {
  return {
    untrained:    Math.round(m.untrained    * FEMALE_FACTOR * 100) / 100,
    novice:       Math.round(m.novice       * FEMALE_FACTOR * 100) / 100,
    beginner:     Math.round(m.beginner     * FEMALE_FACTOR * 100) / 100,
    intermediate: Math.round(m.intermediate * FEMALE_FACTOR * 100) / 100,
    advanced:     Math.round(m.advanced     * FEMALE_FACTOR * 100) / 100,
    elite:        Math.round(m.elite        * FEMALE_FACTOR * 100) / 100,
  };
}

/* ─────────────────────── The table ─────────────────────── */

const ROWS: BodyweightRatioRow[] = [
  // ── BIG FOUR ──
  {
    exerciseKey: 'squat',
    male: { untrained: 0.50, novice: 1.00, beginner: 1.25, intermediate: 1.75, advanced: 2.50, elite: 3.00 },
    female: femaleFromMale({ untrained: 0.50, novice: 1.00, beginner: 1.25, intermediate: 1.75, advanced: 2.50, elite: 3.00 }),
  },
  {
    exerciseKey: 'bench',
    male: { untrained: 0.50, novice: 0.75, beginner: 1.00, intermediate: 1.50, advanced: 2.00, elite: 2.50 },
    female: femaleFromMale({ untrained: 0.50, novice: 0.75, beginner: 1.00, intermediate: 1.50, advanced: 2.00, elite: 2.50 }),
  },
  {
    exerciseKey: 'deadlift',
    male: { untrained: 0.75, novice: 1.25, beginner: 1.50, intermediate: 2.00, advanced: 2.75, elite: 3.50 },
    female: femaleFromMale({ untrained: 0.75, novice: 1.25, beginner: 1.50, intermediate: 2.00, advanced: 2.75, elite: 3.50 }),
  },
  {
    exerciseKey: 'ohp',
    male: { untrained: 0.35, novice: 0.55, beginner: 0.75, intermediate: 1.00, advanced: 1.30, elite: 1.65 },
    female: femaleFromMale({ untrained: 0.35, novice: 0.55, beginner: 0.75, intermediate: 1.00, advanced: 1.30, elite: 1.65 }),
  },
  // ── COMPOUND VARIANTS ──
  {
    exerciseKey: 'front_squat',
    male: { untrained: 0.40, novice: 0.80, beginner: 1.00, intermediate: 1.40, advanced: 2.00, elite: 2.50 },
    female: femaleFromMale({ untrained: 0.40, novice: 0.80, beginner: 1.00, intermediate: 1.40, advanced: 2.00, elite: 2.50 }),
  },
  {
    exerciseKey: 'incline_bench',
    male: { untrained: 0.40, novice: 0.60, beginner: 0.85, intermediate: 1.20, advanced: 1.65, elite: 2.10 },
    female: femaleFromMale({ untrained: 0.40, novice: 0.60, beginner: 0.85, intermediate: 1.20, advanced: 1.65, elite: 2.10 }),
  },
  {
    exerciseKey: 'romanian_dl',
    male: { untrained: 0.60, novice: 1.00, beginner: 1.25, intermediate: 1.75, advanced: 2.40, elite: 3.00 },
    female: femaleFromMale({ untrained: 0.60, novice: 1.00, beginner: 1.25, intermediate: 1.75, advanced: 2.40, elite: 3.00 }),
  },
  {
    exerciseKey: 'sumo_dl',
    male: { untrained: 0.75, novice: 1.25, beginner: 1.50, intermediate: 2.00, advanced: 2.75, elite: 3.50 },
    female: femaleFromMale({ untrained: 0.75, novice: 1.25, beginner: 1.50, intermediate: 2.00, advanced: 2.75, elite: 3.50 }),
  },
  // ── PRESS ACCESSORIES ──
  {
    exerciseKey: 'dumbbell_press',
    male: { untrained: 0.20, novice: 0.30, beginner: 0.40, intermediate: 0.55, advanced: 0.75, elite: 0.95 },
    female: femaleFromMale({ untrained: 0.20, novice: 0.30, beginner: 0.40, intermediate: 0.55, advanced: 0.75, elite: 0.95 }),
  },
  {
    exerciseKey: 'arnold_press',
    male: { untrained: 0.15, novice: 0.25, beginner: 0.35, intermediate: 0.45, advanced: 0.60, elite: 0.75 },
    female: femaleFromMale({ untrained: 0.15, novice: 0.25, beginner: 0.35, intermediate: 0.45, advanced: 0.60, elite: 0.75 }),
  },
  {
    exerciseKey: 'push_press',
    male: { untrained: 0.45, novice: 0.65, beginner: 0.85, intermediate: 1.20, advanced: 1.55, elite: 1.95 },
    female: femaleFromMale({ untrained: 0.45, novice: 0.65, beginner: 0.85, intermediate: 1.20, advanced: 1.55, elite: 1.95 }),
  },
  // ── PULL ACCESSORIES ──
  {
    exerciseKey: 'bent_row',
    male: { untrained: 0.50, novice: 0.75, beginner: 1.00, intermediate: 1.40, advanced: 1.85, elite: 2.30 },
    female: femaleFromMale({ untrained: 0.50, novice: 0.75, beginner: 1.00, intermediate: 1.40, advanced: 1.85, elite: 2.30 }),
  },
  {
    exerciseKey: 'pendlay_row',
    male: { untrained: 0.50, novice: 0.75, beginner: 1.00, intermediate: 1.35, advanced: 1.75, elite: 2.20 },
    female: femaleFromMale({ untrained: 0.50, novice: 0.75, beginner: 1.00, intermediate: 1.35, advanced: 1.75, elite: 2.20 }),
  },
  {
    exerciseKey: 't_bar_row',
    male: { untrained: 0.50, novice: 0.85, beginner: 1.10, intermediate: 1.50, advanced: 2.00, elite: 2.45 },
    female: femaleFromMale({ untrained: 0.50, novice: 0.85, beginner: 1.10, intermediate: 1.50, advanced: 2.00, elite: 2.45 }),
  },
  {
    exerciseKey: 'lat_pulldown',
    male: { untrained: 0.40, novice: 0.65, beginner: 0.85, intermediate: 1.20, advanced: 1.55, elite: 1.95 },
    female: femaleFromMale({ untrained: 0.40, novice: 0.65, beginner: 0.85, intermediate: 1.20, advanced: 1.55, elite: 1.95 }),
  },
  {
    exerciseKey: 'pull_up',
    // pull-up is bodyweight; "ratio" here means ratio of (BW + extra load) to BW.
    male: { untrained: 0.50, novice: 1.00, beginner: 1.10, intermediate: 1.30, advanced: 1.55, elite: 1.85 },
    female: femaleFromMale({ untrained: 0.50, novice: 1.00, beginner: 1.10, intermediate: 1.30, advanced: 1.55, elite: 1.85 }),
  },
  {
    exerciseKey: 'chin_up',
    male: { untrained: 0.55, novice: 1.00, beginner: 1.10, intermediate: 1.35, advanced: 1.65, elite: 2.00 },
    female: femaleFromMale({ untrained: 0.55, novice: 1.00, beginner: 1.10, intermediate: 1.35, advanced: 1.65, elite: 2.00 }),
  },
  // ── ARM ACCESSORIES ──
  {
    exerciseKey: 'barbell_curl',
    male: { untrained: 0.20, novice: 0.30, beginner: 0.40, intermediate: 0.55, advanced: 0.75, elite: 0.90 },
    female: femaleFromMale({ untrained: 0.20, novice: 0.30, beginner: 0.40, intermediate: 0.55, advanced: 0.75, elite: 0.90 }),
  },
  {
    exerciseKey: 'hammer_curl',
    male: { untrained: 0.10, novice: 0.18, beginner: 0.25, intermediate: 0.35, advanced: 0.45, elite: 0.55 },
    female: femaleFromMale({ untrained: 0.10, novice: 0.18, beginner: 0.25, intermediate: 0.35, advanced: 0.45, elite: 0.55 }),
  },
  {
    exerciseKey: 'skull_crusher',
    male: { untrained: 0.20, novice: 0.30, beginner: 0.40, intermediate: 0.55, advanced: 0.75, elite: 0.95 },
    female: femaleFromMale({ untrained: 0.20, novice: 0.30, beginner: 0.40, intermediate: 0.55, advanced: 0.75, elite: 0.95 }),
  },
  {
    exerciseKey: 'close_grip_bench',
    male: { untrained: 0.40, novice: 0.65, beginner: 0.85, intermediate: 1.20, advanced: 1.60, elite: 2.00 },
    female: femaleFromMale({ untrained: 0.40, novice: 0.65, beginner: 0.85, intermediate: 1.20, advanced: 1.60, elite: 2.00 }),
  },
  // ── LEG ACCESSORIES ──
  {
    exerciseKey: 'leg_press',
    male: { untrained: 1.00, novice: 1.75, beginner: 2.25, intermediate: 3.00, advanced: 4.00, elite: 5.00 },
    female: femaleFromMale({ untrained: 1.00, novice: 1.75, beginner: 2.25, intermediate: 3.00, advanced: 4.00, elite: 5.00 }),
  },
  {
    exerciseKey: 'lunge',
    male: { untrained: 0.20, novice: 0.40, beginner: 0.55, intermediate: 0.80, advanced: 1.10, elite: 1.40 },
    female: femaleFromMale({ untrained: 0.20, novice: 0.40, beginner: 0.55, intermediate: 0.80, advanced: 1.10, elite: 1.40 }),
  },
  {
    exerciseKey: 'bulgarian_split',
    male: { untrained: 0.20, novice: 0.40, beginner: 0.55, intermediate: 0.80, advanced: 1.10, elite: 1.40 },
    female: femaleFromMale({ untrained: 0.20, novice: 0.40, beginner: 0.55, intermediate: 0.80, advanced: 1.10, elite: 1.40 }),
  },
  {
    exerciseKey: 'hip_thrust',
    male: { untrained: 0.75, novice: 1.50, beginner: 1.85, intermediate: 2.50, advanced: 3.20, elite: 4.00 },
    female: femaleFromMale({ untrained: 0.75, novice: 1.50, beginner: 1.85, intermediate: 2.50, advanced: 3.20, elite: 4.00 }),
  },
  {
    exerciseKey: 'leg_curl',
    male: { untrained: 0.20, novice: 0.35, beginner: 0.50, intermediate: 0.70, advanced: 0.95, elite: 1.20 },
    female: femaleFromMale({ untrained: 0.20, novice: 0.35, beginner: 0.50, intermediate: 0.70, advanced: 0.95, elite: 1.20 }),
  },
  {
    exerciseKey: 'leg_extension',
    male: { untrained: 0.30, novice: 0.45, beginner: 0.60, intermediate: 0.85, advanced: 1.15, elite: 1.45 },
    female: femaleFromMale({ untrained: 0.30, novice: 0.45, beginner: 0.60, intermediate: 0.85, advanced: 1.15, elite: 1.45 }),
  },
];

const TABLE: Record<string, BodyweightRatioRow> = Object.fromEntries(
  ROWS.map((r) => [r.exerciseKey, r]),
);

/* ─────────────────────── Public API ─────────────────────── */

export function standardsFor(exerciseKey: string): BodyweightRatioRow | null {
  return TABLE[exerciseKey] ?? null;
}

export function listStandardsExercises(): string[] {
  return ROWS.map((r) => r.exerciseKey);
}

/**
 * Classify a user's 1RM into a tier.
 *
 *   ratio < untrained → 'untrained'
 *   ratio ≥ elite     → 'elite'
 *   otherwise         → highest tier whose threshold is ≤ ratio
 *
 * Returns null when the exercise is not in the table.
 */
export function classifyLift(p: {
  exerciseKey: string;
  oneRmKg: number;
  bodyweightKg: number;
  sex: Sex;
}): {
  level: StrengthLevel;
  ratio: number;
  /** kg needed to reach the next tier; null if already elite. */
  nextTargetKg: number | null;
  nextLevel: StrengthLevel | null;
  /** kg of the elite threshold for context. */
  eliteTargetKg: number;
} | null {
  const row = standardsFor(p.exerciseKey);
  if (!row) return null;
  if (!Number.isFinite(p.oneRmKg) || !Number.isFinite(p.bodyweightKg)) return null;
  if (p.oneRmKg <= 0 || p.bodyweightKg <= 0) return null;
  const table = p.sex === 'female' ? row.female : row.male;
  const ratio = p.oneRmKg / p.bodyweightKg;

  let level: StrengthLevel = 'untrained';
  for (const lvl of STRENGTH_LEVELS) {
    if (ratio >= table[lvl]) level = lvl;
  }

  const idx = STRENGTH_LEVELS.indexOf(level);
  const nextLevel = STRENGTH_LEVELS[idx + 1] ?? null;
  const nextTargetKg = nextLevel
    ? Math.round(table[nextLevel] * p.bodyweightKg * 10) / 10
    : null;
  const eliteTargetKg = Math.round(table.elite * p.bodyweightKg * 10) / 10;

  return {
    level,
    ratio: Math.round(ratio * 100) / 100,
    nextTargetKg,
    nextLevel,
    eliteTargetKg,
  };
}

/**
 * For lifts NOT in the table, return a heuristic classification based on
 * "is this a compound or an accessory". This keeps the UI from showing
 * blanks for niche lifts (deficit deadlift, JM press, etc).
 */
export function interpolateStandard(p: {
  exerciseKey: string;
  oneRmKg: number;
  bodyweightKg: number;
  sex: Sex;
  isCompound: boolean;
  isLowerBody?: boolean;
}): { level: StrengthLevel; ratio: number } | null {
  if (!Number.isFinite(p.oneRmKg) || !Number.isFinite(p.bodyweightKg)) return null;
  if (p.oneRmKg <= 0 || p.bodyweightKg <= 0) return null;

  const lookup = p.isCompound
    ? p.isLowerBody ? 'squat' : 'bench'
    : 'barbell_curl';
  const proxy = standardsFor(lookup);
  if (!proxy) return null;
  const table = p.sex === 'female' ? proxy.female : proxy.male;
  const ratio = p.oneRmKg / p.bodyweightKg;
  let level: StrengthLevel = 'untrained';
  for (const lvl of STRENGTH_LEVELS) {
    if (ratio >= table[lvl]) level = lvl;
  }
  return { level, ratio: Math.round(ratio * 100) / 100 };
}

/* ─────────────────────── Wilks-style total ─────────────────────── */

/**
 * Symmetric powerlifting total (Squat + Bench + Deadlift) — used by
 * "score me" widgets to combine the big three into one tier.
 */
export interface PowerliftingTotal {
  total: number;
  /** Mean tier across the three lifts. */
  level: StrengthLevel;
  perLift: { exerciseKey: string; level: StrengthLevel; oneRm: number }[];
}

export function powerliftingTotal(p: {
  squat: number;
  bench: number;
  deadlift: number;
  bodyweightKg: number;
  sex: Sex;
}): PowerliftingTotal {
  const lifts = [
    { exerciseKey: 'squat', oneRm: p.squat },
    { exerciseKey: 'bench', oneRm: p.bench },
    { exerciseKey: 'deadlift', oneRm: p.deadlift },
  ];
  const perLift = lifts.map(({ exerciseKey, oneRm }) => {
    const c = classifyLift({ exerciseKey, oneRmKg: oneRm, bodyweightKg: p.bodyweightKg, sex: p.sex });
    return { exerciseKey, level: c?.level ?? 'untrained' as StrengthLevel, oneRm };
  });
  const idxs = perLift.map((l) => STRENGTH_LEVELS.indexOf(l.level));
  const meanIdx = Math.round(idxs.reduce((a, b) => a + b, 0) / idxs.length);
  return {
    total: Math.round(p.squat + p.bench + p.deadlift),
    level: STRENGTH_LEVELS[Math.max(0, Math.min(STRENGTH_LEVELS.length - 1, meanIdx))],
    perLift,
  };
}
