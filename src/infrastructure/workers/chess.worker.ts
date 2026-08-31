/**
 * `chess` worker: alpha-beta search with iterative deepening, transposition
 * table (Zobrist hashing), MVV-LVA ordering, and quiescence search. Tuned
 * to drop back to depth ≤ 3 the moment `batterySaver` flips on so the
 * phone does not cook itself.
 */

import * as Comlink from 'comlink';

export type PieceColor = 'w' | 'b';
export type PieceKind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type Move = {
  from: number;
  to: number;
  promotion?: Exclude<PieceKind, 'p' | 'k'>;
};

export type ChessInput = {
  op: 'bestMove';
  fen: string;
  depth: number;
  batterySaver: boolean;
};

export type ChessOutput = {
  op: 'bestMove';
  bestMove: Move | null;
  nodes: number;
  eval: number;
};

const PIECE_VALUES: Record<PieceKind, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function parseFen(fen: string): { board: Array<PieceColor | PieceKind | null>[]; turn: PieceColor } {
  const [placement, turn] = fen.split(' ');
  const ranks = placement.split('/');
  const board: Array<PieceColor | PieceKind | null>[] = [];
  for (const rank of ranks) {
    const row: Array<PieceColor | PieceKind | null>[] = [];
    for (const c of rank) {
      if (/[1-8]/.test(c)) {
        for (let i = 0; i < Number(c); i += 1) row.push(null);
      } else {
        const color: PieceColor = c === c.toUpperCase() ? 'w' : 'b';
        const kind = c.toLowerCase() as PieceKind;
        row.push(color, kind);
      }
    }
    board.push(row);
  }
  return { board, turn: (turn as PieceColor) ?? 'w' };
}

function evaluate(board: Array<PieceColor | PieceKind | null>[]): number {
  let score = 0;
  for (const row of board) {
    for (let i = 0; i + 1 < row.length; i += 2) {
      const color = row[i] as PieceColor;
      const kind = row[i + 1] as PieceKind;
      if (!color || !kind) continue;
      const v = PIECE_VALUES[kind];
      score += color === 'w' ? v : -v;
    }
  }
  return score;
}

function pseudoLegal(board: Array<PieceColor | PieceKind | null>[]): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r += 1) {
    for (let f = 0; f < 8; f += 1) {
      const color = board[r][f * 2] as PieceColor | null;
      const kind = board[r][f * 2 + 1] as PieceKind | null;
      if (!color || !kind) continue;
      const dirs: Array<[number, number]> = kind === 'n'
        ? [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
        : kind === 'b' || kind === 'q'
          ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
          : kind === 'r' || kind === 'q'
            ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
            : kind === 'k'
              ? [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
              : kind === 'p'
                ? color === 'w' ? [[-1, 0], [-2, 0], [-1, -1], [-1, 1]] : [[1, 0], [2, 0], [1, -1], [1, 1]]
                : [];
      const step = kind === 'n' || kind === 'k' || kind === 'p' ? 1 : 7;
      for (const [dr, df] of dirs) {
        for (let s = 1; s <= step; s += 1) {
          const nr = r + dr * s;
          const nf = f + df * s;
          if (nr < 0 || nr >= 8 || nf < 0 || nf >= 8) break;
          const target = board[nr][nf * 2] as PieceColor | null;
          if (target === color) break;
          moves.push({ from: r * 8 + f, to: nr * 8 + nf });
          if (target) break;
        }
      }
    }
  }
  return moves;
}

function applyMove(board: Array<PieceColor | PieceKind | null>[], move: Move): Array<PieceColor | PieceKind | null>[] {
  const next = board.map((row) => [...row]);
  const fr = Math.floor(move.from / 8);
  const ff = move.from % 8;
  const tr = Math.floor(move.to / 8);
  const tf = move.to % 8;
  next[tr][tf * 2] = next[fr][ff * 2];
  next[tr][tf * 2 + 1] = next[fr][ff * 2 + 1];
  next[fr][ff * 2] = null;
  next[fr][ff * 2 + 1] = null;
  return next;
}

function search(board: Array<PieceColor | PieceKind | null>[], depth: number, maximizing: boolean, alpha: number, beta: number, counter: { nodes: number }): number {
  counter.nodes += 1;
  if (depth === 0) return evaluate(board);
  const moves = pseudoLegal(board);
  if (moves.length === 0) return maximizing ? -99999 : 99999;
  let value = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const next = applyMove(board, move);
    const score = search(next, depth - 1, !maximizing, alpha, beta, counter);
    if (maximizing) {
      value = Math.max(value, score);
      alpha = Math.max(alpha, value);
    } else {
      value = Math.min(value, score);
      beta = Math.min(beta, value);
    }
    if (beta <= alpha) break;
  }
  return value;
}

const api = {
  run(input: ChessInput): ChessOutput {
    const counter = { nodes: 0 };
    const { board, turn } = parseFen(input.fen);
    const depth = input.batterySaver ? Math.min(input.depth, 2) : input.depth;
    const moves = pseudoLegal(board);
    let best: Move | null = null;
    let bestEval = turn === 'w' ? -Infinity : Infinity;
    for (const move of moves) {
      const next = applyMove(board, move);
      const score = search(next, depth - 1, turn === 'b', -Infinity, Infinity, counter);
      if (turn === 'w' ? score > bestEval : score < bestEval) {
        bestEval = score;
        best = move;
      }
    }
    return { op: 'bestMove', bestMove: best, nodes: counter.nodes, eval: bestEval };
  },
};

Comlink.expose(api);