// FSRS Spaced Repetition Engine
// Built according to the specification in GERMAN-MODULE-AGENTS.md.
// Handles stability, difficulty, and retrievability calculations.

import { SrsRating } from '../types';

/**
 * Calculates current retrievability (probability of recall)
 * Formula: R = (1 + elapsed_days / (9 * stability)) ** -1
 */
export function calculateRetrievability(stability: number, elapsedDays: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

export interface FsrsUpdateResult {
  stability: number;
  difficulty: number;
  due_at: string;
}

/**
 * Updates FSRS parameters for a given item based on the review rating and elapsed days.
 *
 * Standard FSRS parameters:
 * - Stability: Represents the interval (in days) where retrievability is expected to be ~90%
 * - Difficulty: Represents how hard the item is on a scale of 1 to 10.
 */
export function updateFsrs(
  currentStability: number,
  currentDifficulty: number,
  rating: SrsRating,
  elapsedDays: number
): FsrsUpdateResult {
  // Ensure we have valid starting parameters
  const s = Math.max(0.1, currentStability);
  const d = Math.max(1, Math.min(10, currentDifficulty));
  const t = Math.max(0, elapsedDays);

  // 1. Calculate new difficulty (D) clamped between 1 and 10
  let dDelta = 0;
  switch (rating) {
    case 'again':
      dDelta = 2.0;
      break;
    case 'hard':
      dDelta = 1.0;
      break;
    case 'good':
      dDelta = -0.2;
      break;
    case 'easy':
      dDelta = -1.5;
      break;
  }
  const nextDifficulty = Math.max(1, Math.min(10, d + dDelta));

  // 2. Calculate new stability (S)
  let nextStability = s;
  if (rating === 'again') {
    // Sharp reduction on lapse
    nextStability = Math.max(0.2, s * 0.15);
  } else {
    // Calculate memory retrievability before the review
    const r = calculateRetrievability(s, t);

    // Multiplier depends on rating and difficulty
    let factor = 1.0;
    switch (rating) {
      case 'hard':
        factor = 0.8 + (10 - d) * 0.05;
        break;
      case 'good':
        factor = 1.5 + (10 - d) * 0.15;
        break;
      case 'easy':
        factor = 2.8 + (10 - d) * 0.35;
        break;
    }

    // Adaptive updating based on elapsed days vs stability
    // Standard FSRS uses exponential growth modified by factor and current retrievability
    nextStability = s * (1 + factor * (1 - r));
  }

  // Safety clamps
  nextStability = Math.max(0.2, Math.min(3650, nextStability));

  // Calculate next due date
  // next_interval_days is stability itself (the 90% retrievability interval)
  const nextIntervalDays = Math.ceil(nextStability);
  const now = new Date();
  const dueAt = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000).toISOString();

  return {
    stability: Number(nextStability.toFixed(4)),
    difficulty: Number(nextDifficulty.toFixed(4)),
    due_at: dueAt,
  };
}

/**
 * Runs a multi-day simulation to verify and stress-test the FSRS parameters.
 * Extremely useful for proving scheduler correctness.
 */
export function runFsrsMultiDaySimulation(
  initialStability = 1.0,
  initialDifficulty = 5.0,
  ratings: { rating: SrsRating; elapsedDays: number }[]
): FsrsUpdateResult[] {
  const history: FsrsUpdateResult[] = [];
  let s = initialStability;
  let d = initialDifficulty;

  for (const step of ratings) {
    const updated = updateFsrs(s, d, step.rating, step.elapsedDays);
    history.push(updated);
    s = updated.stability;
    d = updated.difficulty;
  }

  return history;
}
