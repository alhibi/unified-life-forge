/**
 * Progression domain types.
 *
 * The old model was per-game localStorage blobs (`memory-stats`, `chess-stats`,
 * `sudoku-stats`, …) that each invented their own idea of progress: Memory had
 * an XP field and a level, Chess counted white/black wins, Sudoku counted
 * "flawless" games, and the hub tried to add them up into a single number. There
 * was no shared notion of a level, no rank, no mastery, no season, no
 * achievements outside Memory, and nothing that connected playing chess to
 * progressing anywhere else.
 *
 * This module defines ONE progression spine that every game reports into.
 */

/** The three games. Dice and Focus were retired. */
export type GameId = 'sudoku' | 'chess' | 'memory';

/** Every distinct ruleset a game can be played under. */
export type GameMode =
  // Sudoku
  | 'sudoku-classic'
  | 'sudoku-x'
  | 'sudoku-daily'
  | 'sudoku-time-attack'
  | 'sudoku-flawless'
  // Chess
  | 'chess-versus-ai'
  | 'chess-local'
  | 'chess-blitz'
  | 'chess-puzzles'
  | 'chess-career'
  // Memory
  | 'memory-classic'
  | 'memory-endless'
  | 'memory-time-attack'
  | 'memory-daily'
  | 'memory-versus'
  | 'memory-adventure';

export type Outcome = 'win' | 'loss' | 'draw' | 'abandon';

/** Difficulty ladder shared by every game so multipliers stay comparable. */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master';

/** One completed session, as reported by a game. */
export interface MatchResult {
  game: GameId;
  mode: GameMode;
  outcome: Outcome;
  difficulty?: Difficulty;
  /** Wall-clock duration of the session, ms. */
  durationMs?: number;
  /** Game-native score (memory level reached, puzzle rating, moves, …). */
  score?: number;
  /** Mistakes made. Used for the flawless bonus. */
  mistakes?: number;
  /** Hints consumed. Any hint disqualifies the flawless bonus. */
  hints?: number;
  /** Optional per-mode record candidate (lower-is-better metrics use `lowerIsBetter`). */
  record?: { value: number; lowerIsBetter?: boolean };
}

/** A single XP line in the post-match report. */
export interface XpLine {
  label: string;
  /** XP contributed. May be negative (nothing currently is). */
  amount: number;
  /** Set when the line is a multiplier rather than a flat addition. */
  multiplier?: number;
}

export interface MasteryState {
  /** Lifetime XP earned in this game. */
  xp: number;
  /** Sessions played, all outcomes. */
  played: number;
  wins: number;
  /** Best result per mode, keyed by mode. */
  records: Partial<Record<GameMode, number>>;
  /** Modes the player has completed at least once. */
  modesPlayed: GameMode[];
}

export interface SeasonState {
  /** `YYYY-MM`. */
  id: string;
  xp: number;
  matches: number;
  wins: number;
}

export interface ChallengeProgress {
  /** Challenge id, unique within its day. */
  id: string;
  progress: number;
  completed: boolean;
  /** True once the XP has been credited, so it cannot be paid twice. */
  claimed: boolean;
  /**
   * Distinct modes seen today, for the `variety` challenge kind only.
   * Stored explicitly (rather than inferred from `progress`) because the
   * challenge asks for DIFFERENT modes: replaying the same mode five times must
   * not advance it, and that cannot be expressed by a counter alone. Bounded by
   * the number of modes a game has (≤ 6).
   */
  modes?: GameMode[];
}

export interface ProgressionState {
  /** Schema version — bumped when a migration is needed. */
  version: 1;
  /** Lifetime XP across every game. Drives level and rank. */
  xp: number;
  /** Lifetime totals. */
  matches: number;
  wins: number;
  /** Per-game mastery. */
  mastery: Record<GameId, MasteryState>;
  /** Current season, plus the archive of finished ones (most recent first). */
  season: SeasonState;
  seasonHistory: SeasonState[];
  /** Unlocked achievement ids with the day they unlocked. */
  achievements: Record<string, string>;
  /** Daily play streak. */
  streak: { current: number; best: number; lastPlayedDay: string | null };
  /** Challenge state for one day only: `{ day, items }`. */
  challenges: { day: string; items: ChallengeProgress[] } | null;
  /** Days on which the first-win bonus has already been paid. */
  firstWinDays: string[];
}

/** What the UI shows after a match. */
export interface MatchReport {
  lines: XpLine[];
  xpAwarded: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  /** Achievements unlocked by this match. */
  unlocked: string[];
  /** Challenge ids completed by this match. */
  challengesCompleted: string[];
  /** True when this match set a new per-mode record. */
  newRecord: boolean;
  masteryTierBefore: number;
  masteryTierAfter: number;
}

export const GAME_IDS: readonly GameId[] = ['sudoku', 'chess', 'memory'];
