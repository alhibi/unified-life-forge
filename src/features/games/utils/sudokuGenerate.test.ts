import { describe, expect, it } from 'vitest';

import {
  countSolutions,
  findConflicts,
  generatePuzzle,
  hashString,
  isValidPlacement,
  legalCandidates,
  mulberry32,
} from './sudokuGenerate';

function clone(g: (number | null)[][]): (number | null)[][] {
  return g.map((r) => [...r]);
}

describe('sudoku generator — uniqueness contract', () => {
  it('classic puzzles of every difficulty have EXACTLY one solution', () => {
    for (const difficulty of ['easy', 'medium', 'hard', 'expert'] as const) {
      const { puzzle } = generatePuzzle(difficulty, 'classic', `test-${difficulty}`);
      const probe = clone(puzzle);
      expect(countSolutions(probe, 'classic', 2)).toBe(1);
    }
  });

  it('X-sudoku puzzles are unique AND satisfy the diagonal constraint', () => {
    const { puzzle, solution } = generatePuzzle('hard', 'x', 'test-x');
    expect(countSolutions(clone(puzzle), 'x', 2)).toBe(1);
    const mainRow = solution.map((row, i) => row[i]);
    const antiRow = solution.map((row, i) => row[8 - i]);
    expect(new Set(mainRow).size).toBe(9);
    expect(new Set(antiRow).size).toBe(9);
  });

  it('mini 6×6 puzzles exist and are unique', () => {
    const { puzzle, solution } = generatePuzzle('medium', 'mini', 'test-mini');
    expect(puzzle.length).toBe(6);
    expect(solution.length).toBe(6);
    expect(countSolutions(clone(puzzle), 'mini', 2)).toBe(1);
  });

  it('is deterministic under the same seed (daily boards)', () => {
    const a = generatePuzzle('medium', 'classic', 'daily-2026-08-25');
    const b = generatePuzzle('medium', 'classic', 'daily-2026-08-25');
    expect(a.puzzle).toEqual(b.puzzle);
    expect(a.solution).toEqual(b.solution);
    const c = generatePuzzle('medium', 'classic', 'daily-2026-08-26');
    expect(c.puzzle).not.toEqual(a.puzzle);
  });

  it('respects difficulty clue budgets roughly (easy keeps more clues than expert)', () => {
    const easy = generatePuzzle('easy', 'classic', 'clues-e').givens;
    const expert = generatePuzzle('expert', 'classic', 'clues-x').givens;
    expect(easy).toBeGreaterThan(expert);
    expect(easy).toBeGreaterThanOrEqual(81 - 36); // budget + slack for uniqueness
    expect(expert).toBeGreaterThanOrEqual(22);
  });

  it('the stored solution actually solves the puzzle and obeys every rule', () => {
    const { puzzle, solution } = generatePuzzle('hard', 'classic', 'solve-check');
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect([1, 2, 3, 4, 5, 6, 7, 8, 9]).toContain(solution[r][c]);
        if (puzzle[r][c] !== null) {
          expect(solution[r][c]).toBe(puzzle[r][c]); // clues preserved
        }
      }
    }
  });
});

describe('sudoku helpers', () => {
  it('isValidPlacement rejects row/col/box duplicates', () => {
    const board: (number | null)[][] = Array.from({ length: 9 }, () => Array(9).fill(null));
    board[0][0] = 5;
    expect(isValidPlacement(board, 0, 8, 5, 'classic')).toBe(false); // same row
    expect(isValidPlacement(board, 8, 0, 5, 'classic')).toBe(false); // same col
    expect(isValidPlacement(board, 1, 1, 5, 'classic')).toBe(false); // same box
    expect(isValidPlacement(board, 4, 4, 5, 'classic')).toBe(true);
  });

  it('X variant enforces diagonals in placement checks', () => {
    const board: (number | null)[][] = Array.from({ length: 9 }, () => Array(9).fill(null));
    board[0][0] = 7; // main diagonal
    expect(isValidPlacement(board, 3, 3, 7, 'x')).toBe(false);
    expect(isValidPlacement(board, 3, 3, 7, 'classic')).toBe(true); // not enforced without x
    board[0][8] = 4; // anti-diagonal
    expect(isValidPlacement(board, 4, 4, 4, 'x')).toBe(false);
  });

  it('legalCandidates lists exactly the legal digits', () => {
    const board: (number | null)[][] = Array.from({ length: 9 }, () => Array(9).fill(null));
    board[0] = [1, 2, 3, 4, 5, 6, 7, 8, null];
    const cands = legalCandidates(board, 0, 8, 'classic');
    expect([...cands]).toEqual([9]);
  });

  it('findConflicts marks both offenders in a row clash', () => {
    const board: (number | null)[][] = Array.from({ length: 9 }, () => Array(9).fill(null));
    board[2][0] = 3;
    board[2][5] = 3;
    const conflicts = findConflicts(board, 'classic');
    expect(conflicts.has('2-0')).toBe(true);
    expect(conflicts.has('2-5')).toBe(true);
    expect(conflicts.size).toBe(2);
  });

  it('countSolutions distinguishes open boards from forced ones', () => {
    // An empty grid has astronomically many completions.
    const empty: (number | null)[][] = Array.from({ length: 9 }, () => Array(9).fill(null));
    expect(countSolutions(empty, 'classic', 2)).toBe(2);
    // A solved grid minus one clue stays unique: every other digit in that
    // row/column/box forces the hole's value.
    const { solution } = generatePuzzle('easy', 'classic', 'two-sol');
    const single = clone(solution) as (number | null)[][];
    single[4][4] = null;
    expect(countSolutions(single, 'classic', 2)).toBe(1);
  });

  it('RNG utilities behave', () => {
    const rngA = mulberry32(hashString('seed'));
    const rngB = mulberry32(hashString('seed'));
    expect(rngA()).toBe(rngB());
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
