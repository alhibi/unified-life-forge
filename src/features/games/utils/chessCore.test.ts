import { describe, expect, it } from 'vitest';

import {
  allLegalMoves,
  applyMoveUci,
  gameStatus,
  initialPosition,
  isInCheck,
  moveFromUci,
  moveToUci,
  perft,
  positionAfter,
  positionFromFen,
  positionToFen,
  repetitionKey,
} from './chessCore';

/**
 * Perft reference counts are the community-standard correctness metric for
 * chess move generation (Chess Programming Wiki). If these numbers match,
 * this engine agrees with Stockfish & friends on the rules.
 */
function perftSuite(fen: string, counts: Record<number, number>) {
  const pos = positionFromFen(fen)!;
  for (const [depthStr, expected] of Object.entries(counts)) {
    const depth = Number(depthStr);
    it(`perft(${depth}) = ${expected} for ${fen.split(' ').slice(0, 2).join(' ')}`, () => {
      expect(perft(pos, depth)).toBe(expected);
    });
  }
}

describe('chessCore — legal move generation (perft)', () => {
  // Start position.
  perftSuite('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', {
    1: 20,
    2: 400,
    3: 8902,
  });

  // "Kiwipete" — castling, pins, discovered checks, promotions nearby.
  perftSuite('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', {
    1: 48,
    2: 2039,
  });

  // En-passant / pin edge cases (official CPW Position 3).
  perftSuite('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', {
    1: 14,
    2: 191,
    3: 2812,
  });

  // Promotions and underpromotions (official CPW Position 4).
  perftSuite('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', {
    1: 6,
    2: 264,
  });

  // Mixed motif position (CPW "position 5").
  perftSuite('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', {
    1: 44,
    2: 1486,
  });
});

describe('chessCore — FEN', () => {
  it('round-trips the initial position', () => {
    expect(positionToFen(initialPosition())).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    );
  });

  it('rejects malformed FENs', () => {
    expect(positionFromFen('not a fen')).toBeNull();
    expect(positionFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP w KQkq - 0 1')).toBeNull(); // 7 ranks
    expect(positionFromFen('8/8/8/8/8/8/8/K7 w - - 0 1')).toBeNull(); // black has no king
    expect(positionFromFen('8/8/8/8/8/8/8/8 w - - 0 1')).toBeNull(); // no kings at all
  });

  it('parses en-passant target into board coordinates', () => {
    // e3 (white just double-pushed) is rank 3 → row index 5.
    const pos = positionFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e3 0 1')!;
    expect(pos.enPassant).toEqual([5, 4]);
    // e6 (black just double-pushed) is rank 6 → row index 2.
    const pos2 = positionFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e6 0 1')!;
    expect(pos2.enPassant).toEqual([2, 4]);
  });
});

describe('chessCore — UCI application', () => {
  it('plays the Italian opening moves legally', () => {
    const pos = positionAfter('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [
      'e2e4',
      'e7e5',
      'g1f3',
      'b8c6',
      'f1c4',
    ]);
    expect(pos).not.toBeNull();
    // Exact placement after 1.e4 e5 2.Nf3 Nc6 3.Bc4.
    const fen = positionToFen(pos!);
    expect(fen.split(' ')[0]).toBe('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R');
  });

  it('rejects illegal moves instead of corrupting state', () => {
    const pos = initialPosition();
    expect(applyMoveUci(pos, 'e2e5')).toBeNull(); // pawn can't jump 3
    expect(applyMoveUci(pos, 'e1e2')).toBeNull(); // king blocked
    expect(applyMoveUci(pos, 'd7d5e')).toBeNull(); // malformed
  });

  it('handles castling both sides and strips rights after moving', () => {
    // Kings on their home squares; rooks a1/h1 vs a8/h8. The white king is NOT
    // on e1 in this file, so place both kings correctly: white Ke1, black Ke8.
    let pos = positionFromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')!;
    expect(allLegalMoves(pos).some((m) => moveToUci(m) === 'e1g1')).toBe(true);
    expect(allLegalMoves(pos).some((m) => moveToUci(m) === 'e1c1')).toBe(true);
    pos = applyMoveUci(pos, 'e1g1')!;
    expect(positionToFen(pos)).toContain('R4RK1'); // rook landed on f1
    // The f1 rook now eyes the f-file: f8 is attacked, so black may NOT castle
    // kingside through it — but queenside (d8/c8 untouched) remains legal.
    const blackMoves = allLegalMoves(pos).map(moveToUci);
    expect(blackMoves).not.toContain('e8g8');
    expect(blackMoves).toContain('e8c8');
    pos = applyMoveUci(pos, 'e8c8')!;
    expect(positionToFen(pos)).toContain('2kr3r');
  });

  it('forbids castling through an attacked square', () => {
    // Rook on f3 attacks f1 → white cannot castle kingside (passes through f1),
    // and the king cannot step onto the attacked f1 either.
    const pos = positionFromFen('4k3/8/8/8/8/5r2/8/4K2R w K - 0 1')!;
    expect(allLegalMoves(pos).some((m) => moveToUci(m) === 'e1g1')).toBe(false);
    expect(allLegalMoves(pos).some((m) => moveToUci(m) === 'e1f1')).toBe(false);
    // Queenside castling is still fine (b1/c1/d1 are untouched by the f3 rook).
    const withQ = positionFromFen('4k3/8/8/8/8/5r2/8/R3K3 w Q - 0 1')!;
    expect(allLegalMoves(withQ).some((m) => moveToUci(m) === 'e1c1')).toBe(true);
  });

  it('allows en passant and removes the captured pawn from its true square', () => {
    let pos = positionFromFen('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3')!;
    pos = applyMoveUci(pos, 'e5f6')!;
    // The f5 pawn must be gone (it was on row 3), not the d5 pawn.
    expect(pos.board[3][5]).toBeNull();
    expect(pos.board[3][3]).not.toBeNull();
  });

  it('forbids the pinned en-passant capture that would expose the king', () => {
    // Classic position: exd6 e.p. is illegal because removing BOTH pawns
    // opens the 5th rank to the black rook.
    const pos = positionFromFen('8/8/8/K1pP3r/8/8/8/4k3 w - c6 0 1')!;
    expect(allLegalMoves(pos).some((m) => moveToUci(m) === 'b5c6')).toBe(false);
  });

  it('supports under-promotion and records the piece', () => {
    const pos = positionFromFen('8/P7/8/8/8/8/k6K/8 w - - 0 1')!;
    const moves = allLegalMoves(pos).map(moveToUci);
    expect(moves).toContain('a7a8q');
    expect(moves).toContain('a7a8n');
    expect(moves).toContain('a7a8r');
    expect(moves).toContain('a7a8b');
  });

  it('round-trips UCI parsing', () => {
    expect(moveToUci(moveFromUci('e7e8q')!)).toBe('e7e8q');
    expect(moveFromUci('x9x9')).toBeNull();
  });
});

describe('chessCore — status detection', () => {
  it('detects checkmate (fool’s mate)', () => {
    const pos = positionAfter(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      ['f2f3', 'e7e5', 'g2g4', 'd8h4'],
    )!;
    expect(isInCheck(pos, 'w')).toBe(true);
    const status = gameStatus(pos);
    expect(status.over).toBe(true);
    expect(status.result).toBe('b');
    expect(status.reason).toBe('checkmate');
  });

  it('detects stalemate', () => {
    const pos = positionFromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')!;
    const status = gameStatus(pos);
    expect(status.over).toBe(true);
    expect(status.result).toBe('draw');
    expect(status.reason).toBe('stalemate');
    expect(status.check).toBe(false);
  });

  it('detects insufficient material', () => {
    const pos = positionFromFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1')!;
    expect(gameStatus(pos).reason).toBe('insufficient');

    const kvb = positionFromFen('4k3/8/8/8/8/8/8/4KB2 w - - 0 1')!;
    expect(gameStatus(kvb).reason).toBe('insufficient');

    // Same-colored bishops cannot mate: d8 (row0+col3=odd) and c1 (row7+col2=odd)
    // sit on the SAME color complex.
    const sameBishops = positionFromFen('3bk3/8/8/8/8/8/8/2B1K3 w - - 0 1')!;
    expect(gameStatus(sameBishops).reason).toBe('insufficient');
    // Opposite complexes can still mate: d8 (odd) and d1 (row7+col3=even).
    const oppBishops = positionFromFen('3bk3/8/8/8/8/8/8/3BK3 w - - 0 1')!;
    expect(gameStatus(oppBishops).reason).toBeNull();
  });

  it('detects the fifty-move rule', () => {
    const pos = positionFromFen('4k3/8/8/8/8/8/8/4KR2 w - - 100 80')!;
    const status = gameStatus(pos);
    expect(status.over).toBe(true);
    expect(status.reason).toBe('fifty');
  });

  it('reports threefold only when repetition counts are supplied', () => {
    // Rooks + kings: enough material to play on, quiet enough to repeat.
    const pos = positionFromFen('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1')!;
    const key = repetitionKey(pos);
    expect(gameStatus(pos).over).toBe(false); // without counts
    const withCounts = gameStatus(pos, { [key]: 3 });
    expect(withCounts.over).toBe(true);
    expect(withCounts.reason).toBe('threefold');
  });

  it('keeps a normal running game open', () => {
    const pos = initialPosition();
    const status = gameStatus(pos);
    expect(status.over).toBe(false);
    expect(status.check).toBe(false);
  });
});
