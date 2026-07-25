/**
 * XP curve, ranks and mastery — the pure maths of progression.
 *
 * Design of the curve
 * -------------------
 * The old Memory game used `xpForNextLevel = 100 * level`, i.e. a linear cost,
 * and derived the level with a `while` loop over the whole history. Linear costs
 * make early levels feel slow and late levels feel free; they also give no sense
 * of a ceiling. Here the cost of advancing grows linearly, which makes the
 * CUMULATIVE requirement quadratic — the standard shape for a progression that
 * keeps early sessions rewarding while making high levels mean something:
 *
 *     cost(level → level+1) = BASE + STEP × (level − 1)
 *     total(level)          = BASE×(L−1) + STEP×(L−1)(L−2)/2
 *
 * With BASE = 90 and STEP = 45: level 2 costs 90, level 10 costs 495, and
 * reaching level 50 takes ~57k XP. Because `total` is a closed-form quadratic,
 * `levelFromXp` is solved algebraically rather than by iterating — O(1), and
 * correct for any XP value including absurd ones.
 */
import type { Difficulty, GameId, MasteryState, ProgressionState } from './types';

export const MAX_LEVEL = 99;
const BASE_COST = 90;
const STEP_COST = 45;

/** XP cost of advancing FROM `level` to `level + 1`. */
export function xpToAdvance(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  if (clamped >= MAX_LEVEL) return Number.POSITIVE_INFINITY;
  return BASE_COST + STEP_COST * (clamped - 1);
}

/** Cumulative XP required to BE at `level`. `total(1) === 0`. */
export function xpForLevel(level: number): number {
  const L = Math.max(1, Math.floor(level));
  if (L === 1) return 0;
  const n = L - 1;
  return BASE_COST * n + (STEP_COST * n * (n - 1)) / 2;
}

/**
 * Invert `xpForLevel`. Solves
 *   (STEP/2)·n² + (BASE − STEP/2)·n − xp = 0,  n = L − 1
 * then corrects by at most one step for floating-point drift.
 */
export function levelFromXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  const a = STEP_COST / 2;
  const b = BASE_COST - STEP_COST / 2;
  const n = (-b + Math.sqrt(b * b + 4 * a * xp)) / (2 * a);
  let level = Math.floor(n) + 1;
  // Guard both directions; the quadratic root can land a hair either side.
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= xp) level += 1;
  while (level > 1 && xpForLevel(level) > xp) level -= 1;
  return Math.min(MAX_LEVEL, level);
}

export interface LevelProgress {
  level: number;
  /** XP accumulated inside the current level. */
  xpInLevel: number;
  /** XP needed to finish the current level. Infinity at MAX_LEVEL. */
  xpForLevel: number;
  /** 0..1 share of the current level completed. 1 at MAX_LEVEL. */
  ratio: number;
  /** Absolute XP total. */
  totalXp: number;
  atMax: boolean;
}

export function levelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = levelFromXp(xp);
  const atMax = level >= MAX_LEVEL;
  const floor = xpForLevel(level);
  const cost = xpToAdvance(level);
  return {
    level,
    xpInLevel: xp - floor,
    xpForLevel: cost,
    ratio: atMax ? 1 : Math.min(1, (xp - floor) / cost),
    totalXp: xp,
    atMax,
  };
}

/* ── ranks ──────────────────────────────────────────────────────────── */

export interface RankTier {
  id: string;
  label: string;
  /** First level in the tier. */
  from: number;
  /** Number of divisions inside the tier. */
  divisions: number;
}

/**
 * Rank ladder. Divisions exist so that a player sees movement between levels
 * even inside a long tier — a rank that only changes every 15 levels is not a
 * rank, it is a label.
 */
export const RANK_TIERS: readonly RankTier[] = [
  { id: 'novice', label: 'مبتدئ', from: 1, divisions: 3 },
  { id: 'apprentice', label: 'متمرّس', from: 6, divisions: 3 },
  { id: 'skilled', label: 'ماهر', from: 12, divisions: 4 },
  { id: 'expert', label: 'خبير', from: 20, divisions: 4 },
  { id: 'master', label: 'أستاذ', from: 32, divisions: 4 },
  { id: 'elite', label: 'نخبة', from: 48, divisions: 4 },
  { id: 'legend', label: 'أسطورة', from: 70, divisions: 3 },
];

const DIVISION_NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

export interface Rank {
  tier: RankTier;
  /** 1-based division inside the tier. */
  division: number;
  /** e.g. "خبير II". */
  label: string;
  /** Level at which the next division (or tier) begins. Null at the ceiling. */
  nextAtLevel: number | null;
}

export function rankForLevel(level: number): Rank {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  let tierIndex = 0;
  for (let i = 0; i < RANK_TIERS.length; i += 1) {
    if (clamped >= RANK_TIERS[i].from) tierIndex = i;
  }
  const tier = RANK_TIERS[tierIndex];
  const nextTier = RANK_TIERS[tierIndex + 1];
  const tierSpan = (nextTier ? nextTier.from : MAX_LEVEL + 1) - tier.from;
  const perDivision = Math.max(1, Math.ceil(tierSpan / tier.divisions));
  const division = Math.min(tier.divisions, Math.floor((clamped - tier.from) / perDivision) + 1);
  const nextDivisionLevel = tier.from + division * perDivision;
  const nextAtLevel = nextDivisionLevel > MAX_LEVEL ? null : nextDivisionLevel;

  return {
    tier,
    division,
    // A single-division tier reads better without a numeral.
    label: tier.divisions > 1 ? `${tier.label} ${DIVISION_NUMERALS[division - 1]}` : tier.label,
    nextAtLevel,
  };
}

/* ── mastery ────────────────────────────────────────────────────────── */

/**
 * Per-game mastery tiers, 0–5. Thresholds are per-game XP, so mastery in chess
 * is earned by playing chess — a player cannot buy a chess star with sudoku.
 */
export const MASTERY_THRESHOLDS: readonly number[] = [0, 250, 900, 2400, 6000, 14000];

export const MASTERY_LABELS: readonly string[] = [
  'بلا رتبة',
  'برونزي',
  'فضّي',
  'ذهبي',
  'بلاتيني',
  'ماسي',
];

export function masteryTier(gameXp: number): number {
  let tier = 0;
  for (let i = 1; i < MASTERY_THRESHOLDS.length; i += 1) {
    if (gameXp >= MASTERY_THRESHOLDS[i]) tier = i;
  }
  return tier;
}

export interface MasteryProgress {
  tier: number;
  label: string;
  /** 0..1 toward the next tier. 1 when maxed. */
  ratio: number;
  /** XP still needed for the next tier, or null when maxed. */
  remaining: number | null;
}

export function masteryProgress(gameXp: number): MasteryProgress {
  const xp = Math.max(0, Math.floor(gameXp));
  const tier = masteryTier(xp);
  const maxed = tier >= MASTERY_THRESHOLDS.length - 1;
  if (maxed) return { tier, label: MASTERY_LABELS[tier], ratio: 1, remaining: null };
  const floor = MASTERY_THRESHOLDS[tier];
  const ceiling = MASTERY_THRESHOLDS[tier + 1];
  return {
    tier,
    label: MASTERY_LABELS[tier],
    ratio: Math.min(1, (xp - floor) / (ceiling - floor)),
    remaining: ceiling - xp,
  };
}

/* ── multipliers ────────────────────────────────────────────────────── */

/**
 * Difficulty multipliers. Deliberately sub-linear at the top: a master-level
 * sudoku is roughly twice the reward of a medium one, not ten times, so grinding
 * the hardest setting is worthwhile but not the only viable strategy.
 */
export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 0.75,
  medium: 1,
  hard: 1.3,
  expert: 1.6,
  master: 2,
};

export function difficultyLabel(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'easy':
      return 'سهل';
    case 'medium':
      return 'متوسط';
    case 'hard':
      return 'صعب';
    case 'expert':
      return 'خبير';
    case 'master':
      return 'أسطوري';
  }
}

/** Total XP across every game — used for consistency checks in tests. */
export function totalMasteryXp(state: ProgressionState): number {
  return (Object.keys(state.mastery) as GameId[]).reduce(
    (acc, game) => acc + (state.mastery[game]?.xp ?? 0),
    0,
  );
}

export function emptyMastery(): MasteryState {
  return { xp: 0, played: 0, wins: 0, records: {}, modesPlayed: [] };
}
