/**
 * Sudoku generation with a GUARANTEED UNIQUE solution.
 *
 * Why this exists: the previous generator dug random holes and stopped at a
 * removal quota without ever checking uniqueness. A sudoku with several
 * solutions is not a sudoku — the app then judged a logically-correct
 * alternative completion as "wrong", because correctness was compared against
 * ONE stored solution. This module refuses to produce such boards:
 *
 *   1. Build a complete valid grid (randomized backtracking).
 *   2. Remove cells in random order; after each removal COUNT solutions
 *      (capped at 2). If the count exceeds 1, put the clue back.
 *   3. What remains has exactly one solution — provably, by construction.
 *
 * Variants: classic 9×9, X-sudoku (both diagonals also 1–9), and a real
 * 6×6 mini (the old code accepted `mini` as a variant string but generated a
 * 9×9 board for it — dead config, now actually supported).
 *
 * Pure module: no React, no storage. Deterministic under a seed string.
 */

export type SudokuVariant = 'classic' | 'x' | 'mini';
export type SudokuDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** Cell value: 1..N or null for empty. */
export type SudokuGrid = (number | null)[][];

interface VariantSpec {
  /** Board edge length. */
  size: number;
  /** Digit range 1..size. */
  digits: number[];
  /** Box height/width in cells (rows-per-box, cols-per-box). */
  boxRows: number;
  boxCols: number;
  /** X-diagonal constraint applies. */
  diagonals: boolean;
}

const SPECS: Record<SudokuVariant, VariantSpec> = {
  classic: { size: 9, digits: [1, 2, 3, 4, 5, 6, 7, 8, 9], boxRows: 3, boxCols: 3, diagonals: false },
  x: { size: 9, digits: [1, 2, 3, 4, 5, 6, 7, 8, 9], boxRows: 3, boxCols: 3, diagonals: true },
  mini: { size: 6, digits: [1, 2, 3, 4, 5, 6], boxRows: 2, boxCols: 3, diagonals: false },
};

/* ── deterministic RNG ────────────────────────────────────────────────── */

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── constraint checks ────────────────────────────────────────────────── */

/** Can digit `n` legally sit at (r,c) given current placements? */
export function isValidPlacement(
  board: SudokuGrid,
  r: number,
  c: number,
  n: number,
  variant: SudokuVariant,
): boolean {
  const spec = SPECS[variant];
  const size = spec.size;
  for (let i = 0; i < size; i++) {
    if (i !== c && board[r][i] === n) return false;
    if (i !== r && board[i][c] === n) return false;
  }
  const r0 = Math.floor(r / spec.boxRows) * spec.boxRows;
  const c0 = Math.floor(c / spec.boxCols) * spec.boxCols;
  for (let i = r0; i < r0 + spec.boxRows; i++) {
    for (let j = c0; j < c0 + spec.boxCols; j++) {
      if ((i !== r || j !== c) && board[i][j] === n) return false;
    }
  }
  if (spec.diagonals) {
    const last = size - 1;
    if (r === c) {
      for (let i = 0; i < size; i++) if (i !== r && board[i][i] === n) return false;
    }
    if (r + c === last) {
      for (let i = 0; i < size; i++) if (i !== r && board[i][last - i] === n) return false;
    }
  }
  return true;
}

/** All legal digits for an empty cell. */
export function legalCandidates(
  board: SudokuGrid,
  r: number,
  c: number,
  variant: SudokuVariant,
): Set<number> {
  const spec = SPECS[variant];
  const out = new Set<number>();
  if (board[r][c] !== null) return out;
  for (const n of spec.digits) {
    if (isValidPlacement(board, r, c, n, variant)) out.add(n);
  }
  return out;
}

/** Coordinates of cells violating a constraint (both offenders included). */
export function findConflicts(board: SudokuGrid, variant: SudokuVariant): Set<string> {
  const spec = SPECS[variant];
  const size = spec.size;
  const out = new Set<string>();
  const flag = (r: number, c: number) => out.add(`${r}-${c}`);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = board[r][c];
      if (v === null) continue;
      for (let i = 0; i < size; i++) {
        if (i !== c && board[r][i] === v) { flag(r, c); flag(r, i); }
        if (i !== r && board[i][c] === v) { flag(r, c); flag(i, c); }
      }
      const r0 = Math.floor(r / spec.boxRows) * spec.boxRows;
      const c0 = Math.floor(c / spec.boxCols) * spec.boxCols;
      for (let i = r0; i < r0 + spec.boxRows; i++) {
        for (let j = c0; j < c0 + spec.boxCols; j++) {
          if ((i !== r || j !== c) && board[i][j] === v) { flag(r, c); flag(i, j); }
        }
      }
      if (spec.diagonals) {
        const last = size - 1;
        if (r === c) {
          for (let i = 0; i < size; i++) if (i !== r && board[i][i] === v) { flag(r, c); flag(i, i); }
        }
        if (r + c === last) {
          for (let i = 0; i < size; i++) if (i !== r && board[i][last - i] === v) { flag(r, c); flag(i, last - i); }
        }
      }
    }
  }
  return out;
}

/* ── solving machinery ────────────────────────────────────────────────── */

function nextByMrv(board: SudokuGrid, variant: SudokuVariant): { r: number; c: number; cands: number[] } | null {
  const spec = SPECS[variant];
  let best: { r: number; c: number; cands: number[] } | null = null;
  for (let r = 0; r < spec.size; r++) {
    for (let c = 0; c < spec.size; c++) {
      if (board[r][c] !== null) continue;
      const cands = [...legalCandidates(board, r, c, variant)];
      if (cands.length === 0) return { r, c, cands }; // dead end, report fast
      if (!best || cands.length < best.cands.length) {
        best = { r, c, cands };
        if (cands.length === 1) return best;
      }
    }
  }
  return best;
}

/**
 * Count solutions up to `cap` (early exit). `cap = 2` answers the only
 * question generation cares about: "is this still uniquely solvable?"
 */
export function countSolutions(board: SudokuGrid, variant: SudokuVariant, cap: number): number {
  const cell = nextByMrv(board, variant);
  if (!cell) return 1; // fully and consistently filled
  if (cell.cands.length === 0) return 0;
  let found = 0;
  for (const n of cell.cands) {
    board[cell.r][cell.c] = n;
    found += countSolutions(board, variant, cap - found);
    board[cell.r][cell.c] = null;
    if (found >= cap) break;
  }
  return found;
}

function buildSolvedGrid(rng: () => number, variant: SudokuVariant): SudokuGrid {
  const spec = SPECS[variant];
  const board: SudokuGrid = Array.from({ length: spec.size }, () =>
    Array.from({ length: spec.size }, () => null),
  );
  const fill = (): boolean => {
    const cell = nextByMrv(board, variant);
    if (!cell) return true;
    for (const n of shuffled(cell.cands, rng)) {
      board[cell.r][cell.c] = n;
      if (fill()) return true;
      board[cell.r][cell.c] = null;
    }
    return false;
  };
  fill();
  return board;
}

/* ── public generator ─────────────────────────────────────────────────── */

/** Clue-removal targets per difficulty (tuned to the app's ladder). */
const REMOVALS: Record<SudokuDifficulty, number> = {
  easy: 35,
  medium: 45,
  hard: 52,
  expert: 58,
};
const MINI_REMOVALS: Record<SudokuDifficulty, number> = {
  easy: 14,
  medium: 18,
  hard: 21,
  expert: 24,
};

export interface GeneratedPuzzle {
  /** The playable board (clues + nulls). */
  puzzle: SudokuGrid;
  /** The unique intended solution. */
  solution: number[][];
  /** Number of clues kept. */
  givens: number;
}

/**
 * Generate a puzzle whose solution is UNIQUE by construction.
 * Deterministic when `seed` is provided (used for the daily board so every
 * player gets the exact same grid).
 */
export function generatePuzzle(
  difficulty: SudokuDifficulty,
  variant: SudokuVariant,
  seed?: string,
): GeneratedPuzzle {
  const spec = SPECS[variant];
  const rng = seed !== undefined ? mulberry32(hashString(seed)) : Math.random;

  const solution = buildSolvedGrid(rng, variant);
  const puzzle: SudokuGrid = solution.map((row) => [...row]);

  // X-sudoku is more constrained → slightly fewer safe removals available.
  let budget =
    variant === 'mini' ? MINI_REMOVALS[difficulty] : REMOVALS[difficulty];
  if (variant === 'x') budget = Math.min(budget + 2, spec.size * spec.size - 25);

  const cells = shuffled(
    Array.from({ length: spec.size * spec.size }, (_, i) => i),
    rng,
  );
  let removed = 0;
  for (const idx of cells) {
    if (removed >= budget) break;
    const r = Math.floor(idx / spec.size);
    const c = idx % spec.size;
    const backup = puzzle[r][c];
    puzzle[r][c] = null;
    const probe = puzzle.map((row) => [...row]);
    if (countSolutions(probe, variant, 2) === 1) {
      removed++;
    } else {
      puzzle[r][c] = backup;
    }
  }

  return {
    puzzle,
    solution: solution as number[][],
    givens: spec.size * spec.size - removed,
  };
}
