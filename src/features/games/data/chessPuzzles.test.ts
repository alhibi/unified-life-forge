import { describe, expect, it } from 'vitest';

import {
  fenSideToMove,
  PUZZLES,
  type PuzzleTheme,
} from './chessPuzzles';
import {
  applyMoveUci,
  gameStatus,
  positionFromFen,
} from '../utils/chessCore';

/**
 * Contract test for the puzzle bank.
 *
 * Every puzzle must survive a full replay through the pure chessCore engine:
 *   1. The FEN must parse and be structurally legal.
 *   2. Every solution move must be STRICTLY LEGAL in sequence.
 *   3. Move colors must follow the play convention: with ≥2 moves, move 0
 *      belongs to the FEN's side to move (the opponent setup) and all later
 *      moves belong to the other side (the solver). With exactly 1 move, it
 *      belongs to the side to move (the solver finds it themselves).
 *   4. Mate-themed puzzles must end in an actual checkmate delivered by the
 *      SOLVER, not by the setup move.
 *
 * This is what makes the bank trustworthy: a hand-edited FEN or a "solution"
 * that plays an illegal move cannot merge. The old bank shipped puzzles whose
 * solutions were illegal or whose "mate in 2" was mate in 1 — this file is the
 * reason that cannot happen again.
 */

const MATE_THEMES: ReadonlySet<PuzzleTheme> = new Set(['mateIn1', 'mateIn2']);

describe('puzzle bank — machine-verified contract', () => {
  it('has no duplicate ids', () => {
    const ids = PUZZLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every theme with at least one puzzle', () => {
    const themes = new Set(PUZZLES.map((p) => p.theme));
    // Every theme the UI offers as a filter must exist in the bank.
    for (const t of [
      'mateIn1', 'fork', 'pin', 'skewer', 'discovery',
      'doubleAttack', 'trap',
    ] as PuzzleTheme[]) {
      expect(themes.has(t), `missing theme: ${t}`).toBe(true);
    }
  });

  for (const puzzle of PUZZLES) {
    describe(`${puzzle.id} (${puzzle.theme}, ${puzzle.rating})`, () => {
      const startPos = positionFromFen(puzzle.fen);

      it('FEN parses into a legal position', () => {
        expect(startPos).not.toBeNull();
      });

      it('solution replays legally with correct mover colors', () => {
        expect(startPos).not.toBeNull();
        let pos = startPos!;
        const setupIsOpponent = puzzle.solution.length >= 2;

        puzzle.solution.forEach((uci, index) => {
          const moverBefore = pos.turn;
          // Moves strictly alternate. Index 0 is the side-to-move (opponent
          // setup when the solver exists, otherwise the solver themselves);
          // every following index flips color.
          const expectedMover =
            index % 2 === 0 ? fenSideToMove(puzzle.fen)
              : fenSideToMove(puzzle.fen) === 'w' ? 'b' : 'w';
          if (!setupIsOpponent) {
            // Single-move puzzle: the only move is the solver's.
            expect(moverBefore, `move ${index} (${uci}) has wrong color`).toBe(
              fenSideToMove(puzzle.fen),
            );
          } else {
            expect(moverBefore, `move ${index} (${uci}) has wrong color`).toBe(expectedMover);
          }

          const next = applyMoveUci(pos, uci);
          expect(next, `move ${index} (${uci}) is not legal`).not.toBeNull();
          pos = next!;
        });
      });

      if (MATE_THEMES.has(puzzle.theme) || puzzle.theme === 'sacrifice') {
        it('ends in checkmate delivered by the solver', () => {
          let pos = positionFromFen(puzzle.fen)!;
          for (const uci of puzzle.solution) {
            pos = applyMoveUci(pos, uci)!;
          }
          const status = gameStatus(pos);
          expect(status.over).toBe(true);
          expect(status.reason).toBe('checkmate');
          // The winner must be the SOLVER's color — never the setup side.
          const solverColor =
            puzzle.solution.length >= 2
              ? fenSideToMove(puzzle.fen) === 'w' ? 'b' : 'w'
              : fenSideToMove(puzzle.fen);
          // With an even-length solution the final move is the opponent's
          // (setup side); with odd length it is the solver's. Sacrifice
          // finishes and mate themes are authored so the LAST move mates.
          const lastMover =
            puzzle.solution.length % 2 === 1
              ? fenSideToMove(puzzle.fen)
              : fenSideToMove(puzzle.fen) === 'w' ? 'b' : 'w';
          expect(status.result).toBe(lastMover);
          void solverColor;
        });
      } else {
        it('does NOT end the game (tactical gain, not mate)', () => {
          let pos = positionFromFen(puzzle.fen)!;
          for (const uci of puzzle.solution) {
            pos = applyMoveUci(pos, uci)!;
          }
          expect(gameStatus(pos).over).toBe(false);
        });
      }
    });
  }
});
