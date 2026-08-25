/**
 * chessCore — a pure, dependency-free chess rules engine.
 *
 * Why this exists: the games feature had TWO partial rule implementations
 * (Chess.tsx's interactive engine and ChessPuzzle.tsx's raw-moves helper that
 * ignores checks, castling and en-passant legality). Neither could answer "is
 * this whole position legal?" or "what is the FEN?". This module is the single
 * source of truth for rules questions:
 *
 *   - full legal-move generation (pins, checks, castling through attack,
 *     en-passant including the pinned-ep edge case)
 *   - FEN parse / serialize with validation
 *   - UCI move application with strict legality verification
 *   - game-end detection (mate, stalemate, insufficient material, fifty-move)
 *
 * It is pure: no React, no storage, no randomness. The board layout matches
 * the rest of the feature: row 0 is Black's back rank, row 7 White's.
 * Correctness is pinned by perft tests against the standard reference counts
 * (see chessCore.test.ts) — if those pass, these rules agree with every
 * serious chess implementation.
 */

export type CoreColor = 'w' | 'b';
export type CorePieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
export interface CorePiece {
  type: CorePieceType;
  color: CoreColor;
}
/** Row-major 8×8; row 0 = rank 8 (Black's back rank), row 7 = rank 1. */
export type CoreBoard = (CorePiece | null)[][];
export type CoreSquare = [number, number];

export interface CoreCastling {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface CorePosition {
  board: CoreBoard;
  turn: CoreColor;
  castling: CoreCastling;
  /** En-passant target square (the square jumped over), or null. */
  enPassant: CoreSquare | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}

export interface CoreMove {
  from: CoreSquare;
  to: CoreSquare;
  /** Set only for pawn promotions (the promoted-to type). */
  promotion?: Exclude<CorePieceType, 'K' | 'P'>;
}

export type GameEndReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient'
  | 'fifty'
  /** Threefold repetition — only reported when repetition counts are supplied. */
  | 'threefold';

export interface GameStatus {
  over: boolean;
  /** Winner color, or 'draw'. Null while the game is running. */
  result: CoreColor | 'draw' | null;
  reason: GameEndReason | null;
  check: boolean;
}

/* ── geometry helpers ─────────────────────────────────────────────────── */

const FILES = 'abcdefgh';
const KNIGHT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];
const BISHOP_DIRS: ReadonlyArray<readonly [number, number]> = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS: ReadonlyArray<readonly [number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const KING_DIRS: ReadonlyArray<readonly [number, number]> = [...BISHOP_DIRS, ...ROOK_DIRS];

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function other(color: CoreColor): CoreColor {
  return color === 'w' ? 'b' : 'w';
}

/* ── FEN ──────────────────────────────────────────────────────────────── */

/**
 * Parse a FEN string. Returns null when structurally invalid (wrong field
 * count, bad characters, wrong king count) so callers can fall back instead
 * of crashing on malformed stored state.
 */
export function positionFromFen(fen: string): CorePosition | null {
  const fields = fen.trim().split(/\s+/);
  if (fields.length < 4) return null;
  const [placement, turnField, castlingField, epField, halfField, fullField] = fields;

  if (!/^[wb]$/.test(turnField)) return null;

  const board: CoreBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
  const ranks = placement.split('/');
  if (ranks.length !== 8) return null;
  const kings = { w: 0, b: 0 };
  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of ranks[r]) {
      if (/[1-8]/.test(ch)) {
        c += Number(ch);
        continue;
      }
      if (!/^[KQRBNPkqrbnp]$/.test(ch) || c > 7) return null;
      const color: CoreColor = ch === ch.toUpperCase() ? 'w' : 'b';
      const type = ch.toUpperCase() as CorePieceType;
      if (type === 'K') kings[color]++;
      board[r][c] = { type, color };
      c++;
    }
    if (c !== 8) return null;
  }
  if (kings.w !== 1 || kings.b !== 1) return null;

  const castling: CoreCastling = { wK: false, wQ: false, bK: false, bQ: false };
  if (castlingField !== '-') {
    for (const ch of castlingField) {
      if (ch === 'K') castling.wK = true;
      else if (ch === 'Q') castling.wQ = true;
      else if (ch === 'k') castling.bK = true;
      else if (ch === 'q') castling.bQ = true;
      else return null; // X-FEN/Shredder files unsupported by design
    }
  }

  let enPassant: CoreSquare | null = null;
  if (epField !== '-') {
    if (!/^[a-h][36]$/.test(epField)) return null;
    // Rank 3 (white double-push target) is row index 5; rank 6 is row index 3.
    enPassant = [8 - Number(epField[1]), FILES.indexOf(epField[0])];
  }

  const halfmoveClock = Number(halfField ?? 0);
  const fullmoveNumber = Number(fullField ?? 1);
  if (!Number.isFinite(halfmoveClock) || !Number.isFinite(fullmoveNumber)) return null;

  return {
    board,
    turn: turnField as CoreColor,
    castling,
    enPassant,
    halfmoveClock,
    fullmoveNumber: Math.max(1, fullmoveNumber),
  };
}

export function positionToFen(pos: CorePosition): string {
  let placement = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const piece = pos.board[r][c];
      if (!piece) {
        empty++;
        continue;
      }
      if (empty > 0) {
        placement += String(empty);
        empty = 0;
      }
      placement += piece.color === 'w' ? piece.type : piece.type.toLowerCase();
    }
    if (empty > 0) placement += String(empty);
    if (r < 7) placement += '/';
  }
  const c = pos.castling;
  const castling =
    `${c.wK ? 'K' : ''}${c.wQ ? 'Q' : ''}${c.bK ? 'k' : ''}${c.bQ ? 'q' : ''}` || '-';
  const ep = pos.enPassant
    ? `${FILES[pos.enPassant[1]]}${8 - pos.enPassant[0]}`
    : '-';
  return `${placement} ${pos.turn} ${castling} ${ep} ${pos.halfmoveClock} ${pos.fullmoveNumber}`;
}

/* ── attack detection ─────────────────────────────────────────────────── */

/** Is square (r,c) attacked by any piece of `by`? */
export function isSquareAttacked(board: CoreBoard, r: number, c: number, by: CoreColor): boolean {
  // Pawns: a white pawn attacks upward (toward row 0), so a square is attacked
  // by a white pawn sitting one row BELOW it.
  const pawnRow = by === 'w' ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    if (inBounds(pawnRow, c + dc)) {
      const p = board[pawnRow][c + dc];
      if (p && p.color === by && p.type === 'P') return true;
    }
  }
  for (const [dr, dc] of KNIGHT_DELTAS) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === by && p.type === 'N') return true;
    }
  }
  for (const [dr, dc] of KING_DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === by && p.type === 'K') return true;
    }
  }
  const slide = (dirs: ReadonlyArray<readonly [number, number]>, type: CorePieceType) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p) {
          if (p.color === by && (p.type === type || p.type === 'Q')) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
    return false;
  };
  if (slide(BISHOP_DIRS, 'B')) return true;
  if (slide(ROOK_DIRS, 'R')) return true;
  return false;
}

export function findKing(board: CoreBoard, color: CoreColor): CoreSquare | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'K' && p.color === color) return [r, c];
    }
  }
  return null;
}

export function isInCheck(pos: CorePosition, color: CoreColor = pos.turn): boolean {
  const king = findKing(pos.board, color);
  if (!king) return false;
  return isSquareAttacked(pos.board, king[0], king[1], other(color));
}

/* ── pseudo-legal move generation ─────────────────────────────────────── */

interface RawMove {
  from: CoreSquare;
  to: CoreSquare;
  promotion?: Exclude<CorePieceType, 'K' | 'P'>;
}

function generateRawMoves(pos: CorePosition, color: CoreColor): RawMove[] {
  const out: RawMove[] = [];
  const { board, castling, enPassant } = pos;
  const enemy = other(color);

  const addSlides = (from: CoreSquare, dirs: ReadonlyArray<readonly [number, number]>) => {
    const [r, c] = from;
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (target) {
          if (target.color === enemy) out.push({ from, to: [nr, nc] });
          break;
        }
        out.push({ from, to: [nr, nc] });
        nr += dr;
        nc += dc;
      }
    }
  };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== color) continue;
      const from: CoreSquare = [r, c];

      switch (piece.type) {
        case 'P': {
          const dir = color === 'w' ? -1 : 1;
          const startRow = color === 'w' ? 6 : 1;
          const promoRow = color === 'w' ? 0 : 7;
          const oneStep: CoreSquare = [r + dir, c];
          if (inBounds(oneStep[0], c) && !board[oneStep[0]][c]) {
            if (oneStep[0] === promoRow) {
              for (const promotion of ['Q', 'R', 'B', 'N'] as const) {
                out.push({ from, to: oneStep, promotion });
              }
            } else {
              out.push({ from, to: oneStep });
              const twoStep: CoreSquare = [r + 2 * dir, c];
              if (r === startRow && !board[twoStep[0]][c]) {
                out.push({ from, to: twoStep });
              }
            }
          }
          for (const dc of [-1, 1]) {
            const tr = r + dir;
            const tc = c + dc;
            if (!inBounds(tr, tc)) continue;
            const target = board[tr][tc];
            if (target && target.color === enemy) {
              if (tr === promoRow) {
                for (const promotion of ['Q', 'R', 'B', 'N'] as const) {
                  out.push({ from, to: [tr, tc], promotion });
                }
              } else {
                out.push({ from, to: [tr, tc] });
              }
            } else if (!target && enPassant && enPassant[0] === tr && enPassant[1] === tc) {
              out.push({ from, to: [tr, tc] });
            }
          }
          break;
        }
        case 'N':
          for (const [dr, dc] of KNIGHT_DELTAS) {
            const nr = r + dr;
            const nc = c + dc;
            if (inBounds(nr, nc)) {
              const target = board[nr][nc];
              if (!target || target.color === enemy) out.push({ from, to: [nr, nc] });
            }
          }
          break;
        case 'B':
          addSlides(from, BISHOP_DIRS);
          break;
        case 'R':
          addSlides(from, ROOK_DIRS);
          break;
        case 'Q':
          addSlides(from, KING_DIRS);
          break;
        case 'K': {
          for (const [dr, dc] of KING_DIRS) {
            const nr = r + dr;
            const nc = c + dc;
            if (inBounds(nr, nc)) {
              const target = board[nr][nc];
              if (!target || target.color === enemy) out.push({ from, to: [nr, nc] });
            }
          }
          // Castling — rights verified against actual piece placement too.
          const homeRow = color === 'w' ? 7 : 0;
          if (r === homeRow && c === 4 && !isSquareAttacked(board, homeRow, 4, enemy)) {
            const kingSide = color === 'w' ? castling.wK : castling.bK;
            const queenSide = color === 'w' ? castling.wQ : castling.bQ;
            if (
              kingSide &&
              board[homeRow][7]?.type === 'R' &&
              board[homeRow][7]?.color === color &&
              !board[homeRow][5] &&
              !board[homeRow][6] &&
              !isSquareAttacked(board, homeRow, 5, enemy) &&
              !isSquareAttacked(board, homeRow, 6, enemy)
            ) {
              out.push({ from, to: [homeRow, 6] });
            }
            if (
              queenSide &&
              board[homeRow][0]?.type === 'R' &&
              board[homeRow][0]?.color === color &&
              !board[homeRow][1] &&
              !board[homeRow][2] &&
              !board[homeRow][3] &&
              !isSquareAttacked(board, homeRow, 3, enemy) &&
              !isSquareAttacked(board, homeRow, 2, enemy)
            ) {
              out.push({ from, to: [homeRow, 2] });
            }
          }
          break;
        }
      }
    }
  }
  return out;
}

/* ── apply (assumes a pseudo-legal move; used inside legality filtering) ── */

function applyRawUnchecked(pos: CorePosition, move: RawMove): CorePosition {
  const board = pos.board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  const piece = board[move.from[0]][move.from[1]]!;
  const color = piece.color;
  const enemy = other(color);
  const castling = { ...pos.castling };

  board[move.from[0]][move.from[1]] = null;

  // En passant capture: the captured pawn is NOT on the destination square.
  if (piece.type === 'P' && pos.enPassant && move.to[0] === pos.enPassant[0] && move.to[1] === pos.enPassant[1]) {
    const capturedRow = color === 'w' ? move.to[0] + 1 : move.to[0] - 1;
    board[capturedRow][move.to[1]] = null;
  }

  board[move.to[0]][move.to[1]] =
    move.promotion ? { type: move.promotion, color } : piece;

  // Castling also moves the rook.
  if (piece.type === 'K' && Math.abs(move.to[1] - move.from[1]) === 2) {
    const row = move.from[0];
    if (move.to[1] === 6) {
      board[row][5] = board[row][7];
      board[row][7] = null;
    } else {
      board[row][3] = board[row][0];
      board[row][0] = null;
    }
  }

  // Castling rights die when the king or a rook moves, or a rook is captured.
  if (piece.type === 'K') {
    if (color === 'w') {
      castling.wK = false;
      castling.wQ = false;
    } else {
      castling.bK = false;
      castling.bQ = false;
    }
  }
  const kills = (r: number, c: number) => {
    if (r === 7 && c === 7) castling.wK = false;
    if (r === 7 && c === 0) castling.wQ = false;
    if (r === 0 && c === 7) castling.bK = false;
    if (r === 0 && c === 0) castling.bQ = false;
  };
  kills(move.from[0], move.from[1]);
  kills(move.to[0], move.to[1]);

  let enPassant: CoreSquare | null = null;
  if (piece.type === 'P' && Math.abs(move.to[0] - move.from[0]) === 2) {
    enPassant = [(move.from[0] + move.to[0]) / 2, move.from[1]];
  }

  const isCapture =
    pos.board[move.to[0]][move.to[1]] !== null ||
    (piece.type === 'P' &&
      pos.enPassant !== null &&
      move.to[0] === pos.enPassant[0] &&
      move.to[1] === pos.enPassant[1]);
  const resetsHalfmove = piece.type === 'P' || isCapture;

  return {
    board,
    turn: enemy,
    castling,
    enPassant,
    halfmoveClock: resetsHalfmove ? 0 : pos.halfmoveClock + 1,
    fullmoveNumber: pos.fullmoveNumber + (color === 'b' ? 1 : 0),
  };
}

/* ── public move API ──────────────────────────────────────────────────── */

/** Every strictly legal move (own king may not be left in check). */
export function allLegalMoves(pos: CorePosition): CoreMove[] {
  const out: CoreMove[] = [];
  for (const raw of generateRawMoves(pos, pos.turn)) {
    const next = applyRawUnchecked(pos, raw);
    if (!isInCheck(next, pos.turn)) {
      out.push({ from: raw.from, to: raw.to, promotion: raw.promotion });
    }
  }
  return out;
}

/** Legal destinations for the piece on (r, c); empty if none or not ours. */
export function legalMovesFrom(pos: CorePosition, r: number, c: number): CoreSquare[] {
  const piece = pos.board[r]?.[c];
  if (!piece || piece.color !== pos.turn) return [];
  return allLegalMoves(pos)
    .filter((m) => m.from[0] === r && m.from[1] === c)
    .map((m) => m.to);
}

/* ── UCI ──────────────────────────────────────────────────────────────── */

export function moveToUci(move: CoreMove): string {
  const sq = ([r, c]: CoreSquare) => `${FILES[c]}${8 - r}`;
  return `${sq(move.from)}${sq(move.to)}${move.promotion ? move.promotion.toLowerCase() : ''}`;
}

export function moveFromUci(uci: string): CoreMove | null {
  const m = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci);
  if (!m) return null;
  const parse = (s: string): CoreSquare => [8 - Number(s[1]), FILES.indexOf(s[0])];
  return {
    from: parse(m[1]),
    to: parse(m[2]),
    promotion: m[3] ? (m[3].toUpperCase() as Exclude<CorePieceType, 'K' | 'P'>) : undefined,
  };
}

/**
 * Apply a UCI move ONLY if it is strictly legal in this position.
 * Returns the new position, or null when the move is illegal/malformed —
 * callers never have to re-validate.
 */
export function applyMoveUci(pos: CorePosition, uci: string): CorePosition | null {
  const parsed = moveFromUci(uci);
  if (!parsed) return null;
  for (const legal of allLegalMoves(pos)) {
    if (
      legal.from[0] === parsed.from[0] &&
      legal.from[1] === parsed.from[1] &&
      legal.to[0] === parsed.to[0] &&
      legal.to[1] === parsed.to[1] &&
      (legal.promotion ?? undefined) === (parsed.promotion ?? undefined)
    ) {
      return applyRawUnchecked(pos, legal);
    }
  }
  return null;
}

/** Convenience: parse a FEN and immediately play a sequence of UCI moves. */
export function positionAfter(fen: string, uciMoves: string[]): CorePosition | null {
  let pos = positionFromFen(fen);
  if (!pos) return null;
  for (const uci of uciMoves) {
    pos = applyMoveUci(pos, uci);
    if (!pos) return null;
  }
  return pos;
}

/* ── status ───────────────────────────────────────────────────────────── */

function isInsufficientMaterial(board: CoreBoard): boolean {
  const pieces: { type: CorePieceType; color: CoreColor; r: number; c: number }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) pieces.push({ type: p.type, color: p.color, r, c });
    }
  }
  if (pieces.some((p) => p.type === 'P' || p.type === 'R' || p.type === 'Q')) return false;
  if (pieces.length === 2) return true; // K vs K
  if (pieces.length === 3) return true; // K + minor vs K
  if (pieces.length === 4) {
    const bishops = pieces.filter((p) => p.type === 'B');
    // K+B vs K+B with same-colored bishops cannot be won.
    if (bishops.length === 2) {
      const dark = bishops.map((b) => (b.r + b.c) % 2);
      if (dark[0] === dark[1]) return true;
    }
  }
  return false;
}

/**
 * Full game-end evaluation. Pass `repetitionCounts` (map of position-key →
 * occurrences INCLUDING the current one) to enable threefold detection.
 */
export function gameStatus(
  pos: CorePosition,
  repetitionCounts?: Record<string, number>,
): GameStatus {
  const check = isInCheck(pos);
  const moves = allLegalMoves(pos);
  const base = { check };

  if (moves.length === 0) {
    return check
      ? { ...base, over: true, result: other(pos.turn), reason: 'checkmate' }
      : { ...base, over: true, result: 'draw', reason: 'stalemate' };
  }
  if (isInsufficientMaterial(pos.board)) {
    return { ...base, over: true, result: 'draw', reason: 'insufficient' };
  }
  if (pos.halfmoveClock >= 100) {
    return { ...base, over: true, result: 'draw', reason: 'fifty' };
  }
  if (repetitionCounts) {
    const key = repetitionKey(pos);
    if ((repetitionCounts[key] ?? 0) >= 3) {
      return { ...base, over: true, result: 'draw', reason: 'threefold' };
    }
  }
  return { ...base, over: false, result: null, reason: null };
}

/** Canonical repetition key: placement + turn + castling + ep-file. */
export function repetitionKey(pos: CorePosition): string {
  const fen = positionToFen(pos);
  const [placement, , castling, ep] = fen.split(' ');
  // Only the ep FILE matters for repetition (FIDE rule 9.2.3 nuance).
  return `${placement} ${pos.turn} ${castling} ${ep === '-' ? '-' : ep[0]}`;
}

/* ── initial position & perft (testing) ───────────────────────────────── */

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function initialPosition(): CorePosition {
  return positionFromFen(INITIAL_FEN)!;
}

/**
 * Perft: count leaf nodes of the legal-move tree to `depth`.
 * The gold-standard correctness metric for move generation.
 */
export function perft(pos: CorePosition, depth: number): number {
  if (depth === 0) return 1;
  let nodes = 0;
  for (const move of allLegalMoves(pos)) {
    nodes += perft(applyRawUnchecked(pos, move), depth - 1);
  }
  return nodes;
}

/** Clone helper for callers that keep snapshots. */
export function clonePosition(pos: CorePosition): CorePosition {
  return {
    board: pos.board.map((row) => row.map((cell) => (cell ? { ...cell } : null))),
    turn: pos.turn,
    castling: { ...pos.castling },
    enPassant: pos.enPassant ? ([...pos.enPassant] as CoreSquare) : null,
    halfmoveClock: pos.halfmoveClock,
    fullmoveNumber: pos.fullmoveNumber,
  };
}
