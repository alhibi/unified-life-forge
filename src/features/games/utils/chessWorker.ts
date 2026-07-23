// ─────────────────────────────────────────────────────────────────────────────
// High-Performance Chess AI Web Worker
// Offloads heavy minimax alpha-beta pruning searches off the main UI thread.
// Runs at peak performance in an isolated thread, preventing frame drops.
// ─────────────────────────────────────────────────────────────────────────────

type Color = 'w' | 'b';
type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
type Piece = { type: PieceType; color: Color } | null;
type BoardState = Piece[][];
type Square = [number, number];
type AIDifficulty = 'easy' | 'medium' | 'hard' | 'master';

interface BotEvalWeights {
  material: number;
  pst: number;
  pawnPush: number;
  kingAttack: number;
  depthBonus?: number;
  blunderRate?: number;
}

interface GameState {
  board: BoardState;
  turn: Color;
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassant: Square | null;
  moveCount: number;
  captured: { w: string[]; b: string[] };
  halfmoveClock: number;
  positionCounts: Record<string, number>;
}

// ---------- Constants & Tables ----------
const PIECE_VALUES: Record<PieceType, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

const PAWN_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_TABLE = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [ 5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [ 0,  0,  0,  5,  5,  0,  0,  0]
];

const QUEEN_TABLE = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  5,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_TABLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20]
];

const PST: Record<PieceType, number[][]> = {
  P: PAWN_TABLE,
  N: KNIGHT_TABLE,
  B: BISHOP_TABLE,
  R: ROOK_TABLE,
  Q: QUEEN_TABLE,
  K: KING_TABLE,
};

const DEFAULT_WEIGHTS: BotEvalWeights = {
  material: 1.0,
  pst: 1.0,
  pawnPush: 1.0,
  kingAttack: 1.0,
};

// ---------- Game Rules & Move Generation ----------
function inBounds(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function cloneBoard(b: BoardState): BoardState {
  return b.map(row => [...row]);
}

function getRawMoves(board: BoardState, r: number, c: number, enPassant: Square | null): Square[] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: Square[] = [];
  const color = piece.color;
  const oppColor: Color = color === 'w' ? 'b' : 'w';

  switch (piece.type) {
    case 'P': {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      if (inBounds(r + dir, c) && !board[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === startRow && inBounds(r + dir * 2, c) && !board[r + dir * 2][c]) {
          moves.push([r + dir * 2, c]);
        }
      }
      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (inBounds(nr, nc)) {
          const tar = board[nr][nc];
          if (tar && tar.color === oppColor) {
            moves.push([nr, nc]);
          } else if (enPassant && enPassant[0] === nr && enPassant[1] === nc) {
            moves.push([nr, nc]);
          }
        }
      }
      break;
    }
    case 'N': {
      const diffs = [
        [-2,-1],[-2,1],[-1,-2],[-1,2],
        [1,-2],[1,2],[2,-1],[2,1]
      ];
      for (const [dr, dc] of diffs) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc)) {
          const tar = board[nr][nc];
          if (!tar || tar.color === oppColor) moves.push([nr, nc]);
        }
      }
      break;
    }
    case 'B':
    case 'R':
    case 'Q': {
      const dirs: Square[] = [];
      if (piece.type === 'B' || piece.type === 'Q') {
        dirs.push([-1,-1], [-1,1], [1,-1], [1,1]);
      }
      if (piece.type === 'R' || piece.type === 'Q') {
        dirs.push([-1,0], [1,0], [0,-1], [0,1]);
      }
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
          const tar = board[nr][nc];
          if (!tar) {
            moves.push([nr, nc]);
          } else {
            if (tar.color === oppColor) moves.push([nr, nc]);
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }
    case 'K': {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc)) {
            const tar = board[nr][nc];
            if (!tar || tar.color === oppColor) moves.push([nr, nc]);
          }
        }
      }
      break;
    }
  }
  return moves;
}

function findKing(board: BoardState, color: Color): Square {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'K' && p.color === color) return [r, c];
    }
  }
  return [0, 0];
}

function isSquareAttacked(board: BoardState, r: number, c: number, byColor: Color): boolean {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const p = board[i][j];
      if (p && p.color === byColor) {
        const raw = getRawMoves(board, i, j, null);
        if (raw.some(m => m[0] === r && m[1] === c)) return true;
      }
    }
  }
  return false;
}

function isInCheck(board: BoardState, color: Color): boolean {
  const oppColor: Color = color === 'w' ? 'b' : 'w';
  const king = findKing(board, color);
  return isSquareAttacked(board, king[0], king[1], oppColor);
}

function getCastlingMoves(board: BoardState, color: Color, castling: GameState['castling']): Square[] {
  const moves: Square[] = [];
  const r = color === 'w' ? 7 : 0;
  const oppColor: Color = color === 'w' ? 'b' : 'w';

  if (isInCheck(board, color)) return [];

  // Kingside
  const hasK = color === 'w' ? castling.wK : castling.bK;
  if (hasK && !board[r][5] && !board[r][6]) {
    if (!isSquareAttacked(board, r, 5, oppColor) && !isSquareAttacked(board, r, 6, oppColor)) {
      moves.push([r, 6]);
    }
  }

  // Queenside
  const hasQ = color === 'w' ? castling.wQ : castling.bQ;
  if (hasQ && !board[r][3] && !board[r][2] && !board[r][1]) {
    if (!isSquareAttacked(board, r, 3, oppColor) && !isSquareAttacked(board, r, 2, oppColor)) {
      moves.push([r, 2]);
    }
  }
  return moves;
}

function getLegalMoves(board: BoardState, r: number, c: number, enPassant: Square | null, castling: GameState['castling']): Square[] {
  const p = board[r][c];
  if (!p) return [];
  const raw = getRawMoves(board, r, c, enPassant);
  const legal = raw.filter(to => {
    const next = applyMove(board, [r, c], to, enPassant, castling);
    return !isInCheck(next.board, p.color);
  });

  if (p.type === 'K') {
    const cast = getCastlingMoves(board, p.color, castling);
    legal.push(...cast);
  }
  return legal;
}

function hasAnyLegalMoves(board: BoardState, color: Color, enPassant: Square | null, castling: GameState['castling']): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        const leg = getLegalMoves(board, r, c, enPassant, castling);
        if (leg.length > 0) return true;
      }
    }
  }
  return false;
}

function getAllMovesForColor(board: BoardState, color: Color, enPassant: Square | null, castling: GameState['castling']): { from: Square; to: Square }[] {
  const result: { from: Square; to: Square }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color !== color) continue;
      const legal = getLegalMoves(board, r, c, enPassant, castling);
      for (const to of legal) {
        result.push({ from: [r, c], to });
      }
    }
  }
  return result;
}

function applyMove(
  board: BoardState,
  from: Square,
  to: Square,
  enPassant: Square | null,
  castling: GameState['castling']
): { board: BoardState; castling: GameState['castling']; enPassant: Square | null } {
  const nextBoard = cloneBoard(board);
  const p = nextBoard[from[0]][from[1]];
  nextBoard[from[0]][from[1]] = null;
  nextBoard[to[0]][to[1]] = p;

  const nextCastling = { ...castling };
  let nextEp: Square | null = null;

  if (p) {
    // Pawn double push -> set enPassant square
    if (p.type === 'P' && Math.abs(from[0] - to[0]) === 2) {
      nextEp = [(from[0] + to[0]) / 2, from[1]];
    }
    // En Passant capture execution
    if (p.type === 'P' && enPassant && to[0] === enPassant[0] && to[1] === enPassant[1]) {
      nextBoard[from[0]][to[1]] = null;
    }
    // Castling execution
    if (p.type === 'K' && Math.abs(from[1] - to[1]) === 2) {
      const r = from[0];
      if (to[1] === 6) { // Kingside
        nextBoard[r][5] = nextBoard[r][7];
        nextBoard[r][7] = null;
      } else if (to[1] === 2) { // Queenside
        nextBoard[r][3] = nextBoard[r][0];
        nextBoard[r][0] = null;
      }
    }
    // Castling right updates on king/rook move
    if (p.type === 'K') {
      if (p.color === 'w') { nextCastling.wK = false; nextCastling.wQ = false; }
      else                 { nextCastling.bK = false; nextCastling.bQ = false; }
    }
    if (p.type === 'R') {
      if (from[0] === 7 && from[1] === 7) nextCastling.wK = false;
      if (from[0] === 7 && from[1] === 0) nextCastling.wQ = false;
      if (from[0] === 0 && from[1] === 7) nextCastling.bK = false;
      if (from[0] === 0 && from[1] === 0) nextCastling.bQ = false;
    }
    // Promotion (forced queen to keep simple rules)
    if (p.type === 'P' && (to[0] === 0 || to[0] === 7)) {
      nextBoard[to[0]][to[1]] = { type: 'Q', color: p.color };
    }
  }

  // Castling right updates on rook capture
  if (to[0] === 7 && to[1] === 7) nextCastling.wK = false;
  if (to[0] === 7 && to[1] === 0) nextCastling.wQ = false;
  if (to[0] === 0 && to[1] === 7) nextCastling.bK = false;
  if (to[0] === 0 && to[1] === 0) nextCastling.bQ = false;

  return { board: nextBoard, castling: nextCastling, enPassant: nextEp };
}

// ---------- Evaluation & Search Engine ----------
function evaluateBoard(board: BoardState, weights: BotEvalWeights = DEFAULT_WEIGHTS): number {
  let mat = 0;
  let psqt = 0;
  let wBishops = 0, bBishops = 0;
  const wPawnsCol = [0,0,0,0,0,0,0,0], bPawnsCol = [0,0,0,0,0,0,0,0];
  let wKingPos: [number, number] | null = null;
  let bKingPos: [number, number] | null = null;
  let wMost = 6, bMost = 1;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      mat += p.color === 'w' ? PIECE_VALUES[p.type] : -PIECE_VALUES[p.type];
      const table = PST[p.type];
      if (table) {
        const v = p.color === 'w' ? table[r][c] : table[7 - r][c];
        psqt += p.color === 'w' ? v : -v;
      }
      if (p.type === 'B') { if (p.color === 'w') wBishops++; else bBishops++; }
      if (p.type === 'P') {
        if (p.color === 'w') { wPawnsCol[c]++; if (r < wMost) wMost = r; }
        else                 { bPawnsCol[c]++; if (r > bMost) bMost = r; }
      }
      if (p.type === 'K') {
        if (p.color === 'w') wKingPos = [r, c]; else bKingPos = [r, c];
      }
    }
  }

  if (wBishops >= 2) psqt += 35;
  if (bBishops >= 2) psqt -= 35;
  for (let c = 0; c < 8; c++) {
    if (wPawnsCol[c] >= 2) psqt -= 18 * (wPawnsCol[c] - 1);
    if (bPawnsCol[c] >= 2) psqt += 18 * (bPawnsCol[c] - 1);
  }

  let score = weights.material * mat + weights.pst * psqt;

  if (weights.pawnPush !== 0) {
    const wAdv = 6 - wMost;
    const bAdv = bMost - 1;
    score += weights.pawnPush * 8 * (wAdv - bAdv);
  }

  if (weights.kingAttack !== 0 && wKingPos && bKingPos) {
    let wPressure = 0, bPressure = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c]; if (!p) continue;
        const target = p.color === 'w' ? bKingPos : wKingPos;
        const dr = Math.abs(r - target[0]), dc = Math.abs(c - target[1]);
        const cheb = Math.max(dr, dc);
        if (cheb <= 3 && p.type !== 'K' && p.type !== 'P') {
          const heat = (4 - cheb) * (p.type === 'Q' ? 8 : p.type === 'R' ? 5 : 3);
          if (p.color === 'w') wPressure += heat; else bPressure += heat;
        }
      }
    }
    score += weights.kingAttack * (wPressure - bPressure);
  }

  return score;
}

function generateCaptures(board: BoardState, color: Color, enPassant: Square | null, castling: GameState['castling']): { from: Square; to: Square }[] {
  const result: { from: Square; to: Square }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color !== color) continue;
      const legal = getLegalMoves(board, r, c, enPassant, castling);
      for (const to of legal) {
        const target = board[to[0]][to[1]];
        const isEp = board[r][c]?.type === 'P' && enPassant && to[0] === enPassant[0] && to[1] === enPassant[1];
        if (target || isEp) result.push({ from: [r, c], to });
      }
    }
  }
  return result;
}

let searchDeadline = 0;
let nodesSearched = 0;
let activeWeights: BotEvalWeights = DEFAULT_WEIGHTS;

function quiesce(board: BoardState, alpha: number, beta: number, isMaximizing: boolean, enPassant: Square | null, castling: GameState['castling']): number {
  nodesSearched++;
  const stand = evaluateBoard(board, activeWeights);
  if (isMaximizing) {
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
  } else {
    if (stand <= alpha) return alpha;
    if (stand < beta) beta = stand;
  }
  if (nodesSearched % 500 === 0 && Date.now() > searchDeadline) return stand;
  const color: Color = isMaximizing ? 'w' : 'b';
  const caps = generateCaptures(board, color, enPassant, castling);
  caps.sort((a, b) => {
    const va = board[a.to[0]][a.to[1]] ? PIECE_VALUES[board[a.to[0]][a.to[1]]!.type] : 100;
    const vb = board[b.to[0]][b.to[1]] ? PIECE_VALUES[board[b.to[0]][b.to[1]]!.type] : 100;
    return vb - va;
  });

  for (const move of caps) {
    const result = applyMove(board, move.from, move.to, enPassant, castling);
    const score = quiesce(result.board, alpha, beta, isMaximizing, result.enPassant, result.castling);
    if (isMaximizing) {
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    } else {
      if (score <= alpha) return alpha;
      if (score < beta) beta = score;
    }
  }
  return isMaximizing ? alpha : beta;
}

function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  enPassant: Square | null,
  castling: GameState['castling']
): number {
  nodesSearched++;
  if (nodesSearched % 500 === 0 && Date.now() > searchDeadline) return evaluateBoard(board, activeWeights);
  if (depth === 0) return quiesce(board, alpha, beta, isMaximizing, enPassant, castling);

  const color: Color = isMaximizing ? 'w' : 'b';
  const moves = getAllMovesForColor(board, color, enPassant, castling);

  if (moves.length === 0) {
    if (isInCheck(board, color)) return isMaximizing ? -99999 + (10 - depth) : 99999 - (10 - depth);
    return 0;
  }

  moves.sort((a, b) => {
    const capA = board[a.to[0]][a.to[1]];
    const capB = board[b.to[0]][b.to[1]];
    return (capB ? PIECE_VALUES[capB.type] : 0) - (capA ? PIECE_VALUES[capA.type] : 0);
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const result = applyMove(board, move.from, move.to, enPassant, castling);
      const ev = minimax(result.board, depth - 1, alpha, beta, false, result.enPassant, result.castling);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const result = applyMove(board, move.from, move.to, enPassant, castling);
      const ev = minimax(result.board, depth - 1, alpha, beta, true, result.enPassant, result.castling);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function squaresToUci(from: Square, to: Square): string {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  return `${files[from[1]]}${8 - from[0]}${files[to[1]]}${8 - to[0]}`;
}

function uciToMove(uci: string): { from: Square; to: Square } {
  const files: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };
  const fromF = files[uci[0]];
  const fromR = 8 - parseInt(uci[1], 10);
  const toF = files[uci[2]];
  const toR = 8 - parseInt(uci[3], 10);
  return { from: [fromR, fromF], to: [toR, toF] };
}

interface AiOptions {
  weights?: BotEvalWeights;
  history?: string[];
  preferredOpenings?: string[];
}

function getBestMove(
  game: GameState,
  aiColor: Color,
  difficulty: AIDifficulty,
  opts: AiOptions = {}
): { from: Square; to: Square } | null {
  const moves = getAllMovesForColor(game.board, aiColor, game.enPassant, game.castling);
  if (moves.length === 0) return null;

  // Set bot weights
  activeWeights = opts.weights ?? DEFAULT_WEIGHTS;

  // Easy: random with mild capture preference
  if (difficulty === 'easy') {
    const captures = moves.filter(m => game.board[m.to[0]][m.to[1]]);
    if (captures.length > 0 && Math.random() < 0.55) return captures[Math.floor(Math.random() * captures.length)];
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const baseTime  = difficulty === 'medium' ? 800 : difficulty === 'hard' ? 1800 : 3500;
  const baseDepth = difficulty === 'medium' ? 3 : difficulty === 'hard' ? 4 : 5;
  const depthBonus = Math.max(-1, Math.min(2, opts.weights?.depthBonus ?? 0));
  const timeMs   = baseTime + depthBonus * 600;
  const maxDepth = baseDepth + depthBonus;
  searchDeadline = Date.now() + timeMs;
  nodesSearched = 0;

  const isMaximizing = aiColor === 'w';

  moves.sort((a, b) => {
    const capA = game.board[a.to[0]][a.to[1]];
    const capB = game.board[b.to[0]][b.to[1]];
    return (capB ? PIECE_VALUES[capB.type] : 0) - (capA ? PIECE_VALUES[capA.type] : 0);
  });

  let bestMove: { from: Square; to: Square } = moves[0];
  let bestEval = isMaximizing ? -Infinity : Infinity;
  const moveScores = new Map<string, number>();

  for (let depth = 1; depth <= maxDepth; depth++) {
    let iterBest = moves[0];
    let iterBestEval = isMaximizing ? -Infinity : Infinity;
    moves.sort((a, b) => {
      const ka = `${a.from[0]}${a.from[1]}-${a.to[0]}${a.to[1]}`;
      const kb = `${b.from[0]}${b.from[1]}-${b.to[0]}${b.to[1]}`;
      const sa = moveScores.get(ka) ?? -Infinity;
      const sb = moveScores.get(kb) ?? -Infinity;
      return isMaximizing ? sb - sa : sa - sb;
    });
    let timedOut = false;
    for (const move of moves) {
      if (Date.now() > searchDeadline) { timedOut = true; break; }
      const result = applyMove(game.board, move.from, move.to, game.enPassant, game.castling);
      const ev = minimax(result.board, depth - 1, -Infinity, Infinity, !isMaximizing, result.enPassant, result.castling);
      const k = `${move.from[0]}${move.from[1]}-${move.to[0]}${move.to[1]}`;
      moveScores.set(k, ev);
      if (isMaximizing ? ev > iterBestEval : ev < iterBestEval) {
        iterBestEval = ev; iterBest = move;
      }
    }
    if (!timedOut) { bestMove = iterBest; bestEval = iterBestEval; }
    if (Math.abs(bestEval) > 90000) break;
    if (Date.now() > searchDeadline) break;
  }

  // Opening diversity
  const tolerance = difficulty === 'medium' ? 25 : difficulty === 'hard' ? 12 : 5;
  if (game.moveCount < 12) {
    const tied: { from: Square; to: Square }[] = [];
    for (const m of moves) {
      const k = `${m.from[0]}${m.from[1]}-${m.to[0]}${m.to[1]}`;
      const sc = moveScores.get(k);
      if (sc === undefined) continue;
      if (isMaximizing ? sc >= bestEval - tolerance : sc <= bestEval + tolerance) tied.push(m);
    }
    if (tied.length > 1) bestMove = tied[Math.floor(Math.random() * tied.length)];
  }

  // Blunder rate
  const blunderRate = opts.weights?.blunderRate ?? 0;
  if (blunderRate > 0 && Math.random() < blunderRate) {
    const candidates: { from: Square; to: Square }[] = [];
    for (const m of moves) {
      const k = `${m.from[0]}${m.from[1]}-${m.to[0]}${m.to[1]}`;
      const sc = moveScores.get(k);
      if (sc === undefined) continue;
      const delta = isMaximizing ? bestEval - sc : sc - bestEval;
      if (delta >= 40 && delta <= 250) candidates.push(m);
    }
    if (candidates.length > 0) {
      bestMove = candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  return bestMove;
}

// ---------- Message Handler ----------
self.onmessage = (e: MessageEvent) => {
  const { game, aiColor, difficulty, opts } = e.data;
  const bestMove = getBestMove(game, aiColor, difficulty, opts);
  self.postMessage({ bestMove });
};
