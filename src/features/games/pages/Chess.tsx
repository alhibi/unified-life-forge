import { AnimatePresence,motion } from 'framer-motion';
import React, { lazy,Suspense, useCallback, useEffect, useMemo,useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useApp } from '@/contexts/AppContext';
import GameShell from '@/features/games/components/GameShell';
import MatchReportDialog from '@/features/games/components/MatchReportDialog';
import { botById, BotPersonality } from '@/features/games/data/chessBots';
import { recognizeOpening } from '@/features/games/data/chessOpenings';
import { recordCareerResult } from '@/features/games/pages/ChessCareer';
import {
  dayKey,
  type GameMode as ProgressionMode,
  type MatchReport,
  reportMatch,
} from '@/features/games/progression';
import { applyMoveUci, positionFromFen, positionToFen } from '@/features/games/utils/chessCore';
import { playSfx, vibrate } from '@/features/games/utils/gameFeedback';
import { Clock, Copy, Crown, Download, Flag, Lightbulb,Play, RotateCcw, Undo2 } from '@/lib/icons';

/** المشهد ثلاثي الأبعاد — يُحمَّل كسولاً حتى لا يثقل حزمة بقية التطبيق. */
const Board3D = lazy(() => import('@/features/games/components/chess3d/Board3D'));

type Color = 'w' | 'b';
type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
type Piece = { type: PieceType; color: Color } | null;
type BoardState = Piece[][];
type Square = [number, number];
type GameMode = 'local' | 'computer';
type AIDifficulty = 'easy' | 'medium' | 'hard' | 'master';

interface ChessStats {
  gamesPlayed: number;
  whiteWins: number;
  blackWins: number;
  stalemates: number;
  totalMoves: number;
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

function boardHash(b: BoardState, turn: Color, castling: GameState['castling'], ep: Square | null): string {
  let s = turn;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c]; s += p ? p.color + p.type : '.';
  }
  s += castling.wK ? 'K' : ''; s += castling.wQ ? 'Q' : '';
  s += castling.bK ? 'k' : ''; s += castling.bQ ? 'q' : '';
  if (ep) s += `e${ep[0]}${ep[1]}`;
  return s;
}

function isInsufficientMaterial(board: BoardState): boolean {
  const pieces: { color: Color; type: PieceType; r: number; c: number }[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c]; if (p) pieces.push({ ...p, r, c });
  }
  // Any pawn / rook / queen on board -> sufficient material
  if (pieces.some(p => p.type === 'P' || p.type === 'R' || p.type === 'Q')) return false;
  // Only K vs K
  if (pieces.length === 2) return true;
  // K + minor vs K
  if (pieces.length === 3 && pieces.some(p => p.type === 'B' || p.type === 'N')) return true;
  // K + B vs K + B with bishops on same color
  if (pieces.length === 4) {
    const bishops = pieces.filter(p => p.type === 'B');
    if (bishops.length === 2) {
      const sq0 = (bishops[0].r + bishops[0].c) % 2;
      const sq1 = (bishops[1].r + bishops[1].c) % 2;
      if (sq0 === sq1) return true;
    }
  }
  return false;
}

type BoardTheme = 'classic' | 'wooden' | 'midnight' | 'emerald';

const BOARD_THEMES: Record<BoardTheme, { light: string; dark: string; selected: string; legal: string; lastMove: string; check: string }> = {
  classic: {
    light: 'bg-[hsl(40,30%,88%)]',
    dark: 'bg-[hsl(150,15%,50%)]',
    selected: 'bg-[hsl(50,80%,60%)]',
    legal: 'bg-[hsl(50,60%,50%)/0.5]',
    lastMove: 'bg-[hsl(50,70%,65%)/0.35]',
    check: 'bg-[hsl(0,70%,55%)/0.45]',
  },
  wooden: {
    light: 'bg-[hsl(35,40%,82%)]',
    dark: 'bg-[hsl(25,45%,48%)]',
    selected: 'bg-[hsl(45,85%,60%)]',
    legal: 'bg-[hsl(45,60%,50%)/0.5]',
    lastMove: 'bg-[hsl(45,70%,65%)/0.3]',
    check: 'bg-[hsl(0,65%,50%)/0.45]',
  },
  midnight: {
    light: 'bg-[hsl(220,15%,45%)]',
    dark: 'bg-[hsl(220,20%,28%)]',
    selected: 'bg-[hsl(200,70%,50%)]',
    legal: 'bg-[hsl(200,50%,50%)/0.45]',
    lastMove: 'bg-[hsl(200,40%,50%)/0.3]',
    check: 'bg-[hsl(0,65%,50%)/0.5]',
  },
  emerald: {
    light: 'bg-[hsl(120,12%,82%)]',
    dark: 'bg-[hsl(150,30%,38%)]',
    selected: 'bg-[hsl(80,70%,55%)]',
    legal: 'bg-[hsl(80,50%,50%)/0.45]',
    lastMove: 'bg-[hsl(80,40%,55%)/0.3]',
    check: 'bg-[hsl(0,65%,50%)/0.45]',
  },
};

function loadChessStats(): ChessStats {
  const saved = localStorage.getItem('chess-stats');
  return saved ? JSON.parse(saved) : { gamesPlayed: 0, whiteWins: 0, blackWins: 0, stalemates: 0, totalMoves: 0 };
}
import { getGameProgress,saveGameProgress } from '../api';

function saveChessStats(s: ChessStats) {
  localStorage.setItem('chess-stats', JSON.stringify(s));
  saveGameProgress('chess', s).catch(console.error);
}

function loadBoardTheme(): BoardTheme {
  return (localStorage.getItem('chess-board-theme') as BoardTheme) || 'classic';
}
function saveBoardTheme(t: BoardTheme) { localStorage.setItem('chess-board-theme', t); }

interface SavedChessGame {
  game: GameState;
  gameTimer: number;
  gameStarted: boolean;
  moveLog: string[];
  flipped: boolean;
  gameMode: GameMode;
  aiDifficulty: AIDifficulty;
  playerColor: Color;
}

function saveChessGame(state: SavedChessGame) {
  localStorage.setItem('chess-game-state', JSON.stringify(state));
  saveGameProgress('chess-game-state', state).catch(console.error);
}
function loadChessGame(): SavedChessGame | null {
  const saved = localStorage.getItem('chess-game-state');
  if (!saved) return null;
  try { return JSON.parse(saved); } catch { return null; }
}
function clearChessGame() {
  localStorage.removeItem('chess-game-state');
  saveGameProgress('chess-game-state', {}).catch(console.error);
}

const PIECE_SVG: Record<Color, Record<PieceType, string>> = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};

function initBoard(): BoardState {
  const board: BoardState = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRow: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRow[c], color: 'b' };
    board[1][c] = { type: 'P', color: 'b' };
    board[6][c] = { type: 'P', color: 'w' };
    board[7][c] = { type: backRow[c], color: 'w' };
  }
  return board;
}

function cloneBoard(b: BoardState): BoardState {
  return b.map(row => row.map(cell => cell ? { ...cell } : null));
}

function inBounds(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function getRawMoves(board: BoardState, r: number, c: number, enPassant: Square | null): Square[] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: Square[] = [];
  const { type, color } = piece;
  const enemy = color === 'w' ? 'b' : 'w';
  const addSlide = (dr: number, dc: number) => {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (board[nr][nc]) { if (board[nr][nc]!.color === enemy) moves.push([nr, nc]); break; }
      moves.push([nr, nc]); nr += dr; nc += dc;
    }
  };
  switch (type) {
    case 'P': {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      if (inBounds(r + dir, c) && !board[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === startRow && !board[r + 2 * dir][c]) moves.push([r + 2 * dir, c]);
      }
      for (const dc of [-1, 1]) {
        if (inBounds(r + dir, c + dc)) {
          if (board[r + dir][c + dc]?.color === enemy) moves.push([r + dir, c + dc]);
          if (enPassant && enPassant[0] === r + dir && enPassant[1] === c + dc) moves.push([r + dir, c + dc]);
        }
      }
      break;
    }
    case 'N':
      for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc]?.color !== color) moves.push([nr, nc]);
      }
      break;
    case 'B': for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) addSlide(dr, dc); break;
    case 'R': for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) addSlide(dr, dc); break;
    case 'Q': for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) addSlide(dr, dc); break;
    case 'K':
      for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc]?.color !== color) moves.push([nr, nc]);
      }
      break;
  }
  return moves;
}

function findKing(board: BoardState, color: Color): Square {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (board[r][c]?.type === 'K' && board[r][c]?.color === color) return [r, c];
  return [0, 0];
}

function isSquareAttacked(board: BoardState, r: number, c: number, byColor: Color): boolean {
  // 1. Knight Attacks
  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];
  for (let i = 0; i < 8; i++) {
    const nr = r + knightOffsets[i][0];
    const nc = c + knightOffsets[i][1];
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'N') return true;
    }
  }

  // 2. Pawn Attacks
  // If attacking color is white, they attack diagonally up from white's perspective (smaller row indices).
  // So the pawns must be at r + 1.
  // If attacking color is black, pawns are at r - 1.
  const pawnRow = byColor === 'w' ? r + 1 : r - 1;
  if (pawnRow >= 0 && pawnRow < 8) {
    if (c - 1 >= 0) {
      const p = board[pawnRow][c - 1];
      if (p && p.color === byColor && p.type === 'P') return true;
    }
    if (c + 1 < 8) {
      const p = board[pawnRow][c + 1];
      if (p && p.color === byColor && p.type === 'P') return true;
    }
  }

  // 3. King Attacks (adjacent squares)
  const kingOffsets = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  for (let i = 0; i < 8; i++) {
    const nr = r + kingOffsets[i][0];
    const nc = c + kingOffsets[i][1];
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'K') return true;
    }
  }

  // 4. Straight Slider Attacks (Rook, Queen)
  const straightDirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];
  for (let i = 0; i < 4; i++) {
    const dr = straightDirs[i][0];
    const dc = straightDirs[i][1];
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === 'R' || p.type === 'Q')) return true;
        break; // Blocked
      }
      nr += dr;
      nc += dc;
    }
  }

  // 5. Diagonal Slider Attacks (Bishop, Queen)
  const diagDirs = [
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ];
  for (let i = 0; i < 4; i++) {
    const dr = diagDirs[i][0];
    const dc = diagDirs[i][1];
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === 'B' || p.type === 'Q')) return true;
        break; // Blocked
      }
      nr += dr;
      nc += dc;
    }
  }

  return false;
}

function isInCheck(board: BoardState, color: Color): boolean {
  const [kr, kc] = findKing(board, color);
  const enemy = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kr, kc, enemy);
}

function getCastlingMoves(board: BoardState, color: Color, castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }): Square[] {
  const moves: Square[] = [];
  const row = color === 'w' ? 7 : 0;
  const enemy = color === 'w' ? 'b' : 'w';
  if (isInCheck(board, color)) return moves;
  const canKingSide = color === 'w' ? castling.wK : castling.bK;
  if (canKingSide && !board[row][5] && !board[row][6] && board[row][7]?.type === 'R' && board[row][7]?.color === color) {
    if (!isSquareAttacked(board, row, 5, enemy) && !isSquareAttacked(board, row, 6, enemy)) moves.push([row, 6]);
  }
  const canQueenSide = color === 'w' ? castling.wQ : castling.bQ;
  if (canQueenSide && !board[row][3] && !board[row][2] && !board[row][1] && board[row][0]?.type === 'R' && board[row][0]?.color === color) {
    if (!isSquareAttacked(board, row, 3, enemy) && !isSquareAttacked(board, row, 2, enemy)) moves.push([row, 2]);
  }
  return moves;
}

function getLegalMoves(board: BoardState, r: number, c: number, enPassant: Square | null, castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }): Square[] {
  const piece = board[r][c];
  if (!piece) return [];
  let moves = getRawMoves(board, r, c, enPassant).filter(([tr, tc]) => {
    const nb = cloneBoard(board);
    if (piece.type === 'P' && enPassant && tr === enPassant[0] && tc === enPassant[1]) {
      nb[piece.color === 'w' ? tr + 1 : tr - 1][tc] = null;
    }
    nb[tr][tc] = nb[r][c];
    nb[r][c] = null;
    return !isInCheck(nb, piece.color);
  });
  if (piece.type === 'K') moves = [...moves, ...getCastlingMoves(board, piece.color, castling)];
  return moves;
}

function hasAnyLegalMoves(board: BoardState, color: Color, enPassant: Square | null, castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }): boolean {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (board[r][c]?.color === color && getLegalMoves(board, r, c, enPassant, castling).length > 0) return true;
  return false;
}

function initGameState(): GameState {
  const board = initBoard();
  return {
    board,
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    moveCount: 0,
    captured: { w: [], b: [] },
    halfmoveClock: 0,
    positionCounts: { [boardHash(board, 'w', { wK: true, wQ: true, bK: true, bQ: true }, null)]: 1 },
  };
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// ========== AI Engine ==========
const PIECE_VALUES: Record<PieceType, number> = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

// Per-bot evaluation tweaks. The default profile reproduces the original
// behaviour exactly (all multipliers = 1.0, no extras). Bots can override.
import type { BotEvalWeights } from '@/features/games/data/chessBots';
const DEFAULT_WEIGHTS: BotEvalWeights = {
  material: 1.0, pst: 1.0, mobility: 0.0, kingAttack: 0.0,
  pawnPush: 0.0, tradeAversion: 0.0, blunderRate: 0.0, depthBonus: 0,
};

// Piece-square tables (simplified)
const PAWN_TABLE = [
  [0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],
  [5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],
  [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]
];
const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],
  [-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],
  [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]
];
const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,10,10,5,0,-10],
  [-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],
  [-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]
];
const KING_TABLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],
  [20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]
];

const PST: Partial<Record<PieceType, number[][]>> = { P: PAWN_TABLE, N: KNIGHT_TABLE, B: BISHOP_TABLE, K: KING_TABLE };

function evaluateBoard(board: BoardState, weights: BotEvalWeights = DEFAULT_WEIGHTS): number {
  let mat = 0;
  let psqt = 0;
  let wBishops = 0, bBishops = 0;
  const wPawnsCol = [0,0,0,0,0,0,0,0], bPawnsCol = [0,0,0,0,0,0,0,0];
  let wKingPos: [number, number] | null = null;
  let bKingPos: [number, number] | null = null;
  let wMost = 6, bMost = 1; // most-advanced pawn ranks (for pawnPush)

  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
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

  // Bishop pair / doubled pawns (folded into psqt to keep one knob)
  if (wBishops >= 2) psqt += 35;
  if (bBishops >= 2) psqt -= 35;
  for (let c = 0; c < 8; c++) {
    if (wPawnsCol[c] >= 2) psqt -= 18 * (wPawnsCol[c] - 1);
    if (bPawnsCol[c] >= 2) psqt += 18 * (bPawnsCol[c] - 1);
  }

  let score = weights.material * mat + weights.pst * psqt;

  // Pawn-push: reward how far your most-advanced pawn has marched.
  if (weights.pawnPush !== 0) {
    // White advances toward rank 0, Black toward rank 7.
    const wAdv = 6 - wMost;       // 0..6 (rank 1 starts at 6, promotion at 0)
    const bAdv = bMost - 1;
    score += weights.pawnPush * 8 * (wAdv - bAdv);
  }

  // King-attack heat: count enemy pieces close to the friendly king.
  if (weights.kingAttack !== 0 && wKingPos && bKingPos) {
    let wPressure = 0, bPressure = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c]; if (!p) continue;
      // distance to enemy king
      const target = p.color === 'w' ? bKingPos : wKingPos;
      const dr = Math.abs(r - target[0]), dc = Math.abs(c - target[1]);
      const cheb = Math.max(dr, dc);
      if (cheb <= 3 && p.type !== 'K' && p.type !== 'P') {
        const heat = (4 - cheb) * (p.type === 'Q' ? 8 : p.type === 'R' ? 5 : 3);
        if (p.color === 'w') wPressure += heat; else bPressure += heat;
      }
    }
    score += weights.kingAttack * (wPressure - bPressure);
  }

  return score;
}

function generateCaptures(board: BoardState, color: Color, enPassant: Square | null, castling: GameState['castling']): { from: Square; to: Square }[] {
  const result: { from: Square; to: Square }[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c]?.color !== color) continue;
    const legal = getLegalMoves(board, r, c, enPassant, castling);
    for (const to of legal) {
      const target = board[to[0]][to[1]];
      const isEp = board[r][c]?.type === 'P' && enPassant && to[0] === enPassant[0] && to[1] === enPassant[1];
      if (target || isEp) result.push({ from: [r, c], to });
    }
  }
  return result;
}

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
  for (const m of caps) {
    const r = applyMove(board, m.from, m.to, enPassant, castling);
    const sc = quiesce(r.board, alpha, beta, !isMaximizing, r.enPassant, r.castling);
    if (isMaximizing) {
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    } else {
      if (sc <= alpha) return alpha;
      if (sc < beta) beta = sc;
    }
  }
  return isMaximizing ? alpha : beta;
}

function getAllMovesForColor(board: BoardState, color: Color, enPassant: Square | null, castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }): { from: Square; to: Square }[] {
  const moves: { from: Square; to: Square }[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c]?.color !== color) continue;
    const legal = getLegalMoves(board, r, c, enPassant, castling);
    for (const to of legal) moves.push({ from: [r, c], to });
  }
  return moves;
}

function applyMove(board: BoardState, from: Square, to: Square, enPassant: Square | null, castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }): { board: BoardState; castling: typeof castling; enPassant: Square | null } {
  const nb = cloneBoard(board);
  const piece = nb[from[0]][from[1]]!;
  const newCastling = { ...castling };
  let newEnPassant: Square | null = null;

  // En passant capture
  if (piece.type === 'P' && enPassant && to[0] === enPassant[0] && to[1] === enPassant[1]) {
    nb[piece.color === 'w' ? to[0] + 1 : to[0] - 1][to[1]] = null;
  }

  // Castling
  if (piece.type === 'K' && Math.abs(to[1] - from[1]) === 2) {
    const row = from[0];
    if (to[1] === 6) { nb[row][5] = nb[row][7]; nb[row][7] = null; }
    if (to[1] === 2) { nb[row][3] = nb[row][0]; nb[row][0] = null; }
  }

  nb[to[0]][to[1]] = nb[from[0]][from[1]];
  nb[from[0]][from[1]] = null;

  if (piece.type === 'P' && Math.abs(to[0] - from[0]) === 2) newEnPassant = [(from[0] + to[0]) / 2, from[1]];

  // Pawn promotion
  if (piece.type === 'P' && (to[0] === 0 || to[0] === 7)) {
    nb[to[0]][to[1]] = { type: 'Q', color: piece.color };
  }

  if (piece.type === 'K') {
    if (piece.color === 'w') { newCastling.wK = false; newCastling.wQ = false; }
    else { newCastling.bK = false; newCastling.bQ = false; }
  }
  if (piece.type === 'R') {
    if (from[0] === 7 && from[1] === 7) newCastling.wK = false;
    if (from[0] === 7 && from[1] === 0) newCastling.wQ = false;
    if (from[0] === 0 && from[1] === 7) newCastling.bK = false;
    if (from[0] === 0 && from[1] === 0) newCastling.bQ = false;
  }
  if (to[0] === 7 && to[1] === 7) newCastling.wK = false;
  if (to[0] === 7 && to[1] === 0) newCastling.wQ = false;
  if (to[0] === 0 && to[1] === 7) newCastling.bK = false;
  if (to[0] === 0 && to[1] === 0) newCastling.bQ = false;

  return { board: nb, castling: newCastling, enPassant: newEnPassant };
}

let searchDeadline = 0;
let nodesSearched = 0;
let activeWeights: BotEvalWeights = DEFAULT_WEIGHTS;

function minimax(board: BoardState, depth: number, alpha: number, beta: number, isMaximizing: boolean, enPassant: Square | null, castling: GameState['castling']): number {
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
    const valA = capA ? PIECE_VALUES[capA.type] - PIECE_VALUES[board[a.from[0]][a.from[1]]!.type] / 100 : -1000;
    const valB = capB ? PIECE_VALUES[capB.type] - PIECE_VALUES[board[b.from[0]][b.from[1]]!.type] / 100 : -1000;
    return valB - valA;
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const result = applyMove(board, move.from, move.to, enPassant, castling);
      const ev = minimax(result.board, depth - 1, alpha, beta, false, result.enPassant, result.castling);
      if (ev > maxEval) maxEval = ev;
      if (ev > alpha) alpha = ev;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const result = applyMove(board, move.from, move.to, enPassant, castling);
      const ev = minimax(result.board, depth - 1, alpha, beta, true, result.enPassant, result.castling);
      if (ev < minEval) minEval = ev;
      if (ev < beta) beta = ev;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

import { bookContinuations } from '@/features/games/data/chessOpenings';

// Convert a from→to square pair into UCI like "e2e4". Promotion is suffixed
// with the lowercase piece character ("e7e8q"). Used for opening-book lookups.
function squaresToUci(from: Square, to: Square, promotion?: PieceType): string {
  const file = (c: number) => 'abcdefgh'[c];
  const rank = (r: number) => String(8 - r);
  return `${file(from[1])}${rank(from[0])}${file(to[1])}${rank(to[0])}${promotion ? promotion.toLowerCase() : ''}`;
}

export interface AiOptions {
  weights?: BotEvalWeights;
  /** UCI sequence so far — used for opening-book consultation */
  history?: string[];
  /** Bot's preferred openings (UCI first half-moves) */
  preferredOpenings?: string[];
}

function getBestMove(
  game: GameState,
  aiColor: Color,
  difficulty: AIDifficulty,
  opts: AiOptions = {},
): { from: Square; to: Square } | null {
  const moves = getAllMovesForColor(game.board, aiColor, game.enPassant, game.castling);
  if (moves.length === 0) return null;

  // -------- 1. Opening book consultation --------
  // While the played sequence still lies inside the opening book we choose
  // a continuation. This gives bots authentic openings without burning
  // search time. Higher-rated bots only deviate when their preferred
  // continuation is gone.
  if (opts.history && opts.history.length < 14) {
    const continuations = bookContinuations(opts.history);
    if (continuations.length > 0) {
      // Filter to legal moves (the book never has illegal moves but we
      // still cross-check to be safe).
      const legalUci = new Set<string>();
      for (const m of moves) legalUci.add(squaresToUci(m.from, m.to));
      const playable = continuations.filter(c => legalUci.has(c.uci));
      if (playable.length > 0) {
        // Bot preference: if the very first move and the bot prefers a
        // particular opening move, favor that.
        if (opts.history.length === 0 && opts.preferredOpenings?.length) {
          for (const pref of opts.preferredOpenings) {
            const found = playable.find(c => c.uci === pref);
            if (found) return uciToMove(found.uci);
          }
        }
        // Otherwise pick weighted-randomly: prefer the continuation that
        // stays in book longest (more "remaining" depth).
        playable.sort((a, b) => b.remaining - a.remaining);
        const pick = playable[Math.floor(Math.random() * Math.min(3, playable.length))];
        return uciToMove(pick.uci);
      }
    }
  }

  // -------- 2. Set bot personality before searching --------
  activeWeights = opts.weights ?? DEFAULT_WEIGHTS;

  // Easy: random with mild capture preference
  if (difficulty === 'easy') {
    const captures = moves.filter(m => game.board[m.to[0]][m.to[1]]);
    if (captures.length > 0 && Math.random() < 0.55) return captures[Math.floor(Math.random() * captures.length)];
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // -------- 3. Iterative deepening with time budget --------
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

  // Opening / early-game variety: pick randomly among moves within 25cp of best
  // for medium difficulty, 12cp for hard, 5cp for master. Avoids repetitive play.
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

  // Bot personality: with probability=blunderRate, swap to a near-best move.
  // We pick from moves whose evaluation is within 80cp of the best — these
  // are still legal-looking moves a human at that level might play.
  const blunderRate = opts.weights?.blunderRate ?? 0;
  if (blunderRate > 0 && Math.random() < blunderRate) {
    const candidates: { from: Square; to: Square }[] = [];
    for (const m of moves) {
      const k = `${m.from[0]}${m.from[1]}-${m.to[0]}${m.to[1]}`;
      const sc = moveScores.get(k);
      if (sc === undefined) continue;
      const delta = isMaximizing ? bestEval - sc : sc - bestEval;
      // Only allow inaccuracies (≥40cp off) to feel like a real "human" mistake
      if (delta >= 40 && delta <= 250) candidates.push(m);
    }
    if (candidates.length > 0) {
      bestMove = candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  return bestMove;
}

// Convert a UCI string back into a {from,to} move pair. Inverse of squaresToUci.
function uciToMove(uci: string): { from: Square; to: Square } {
  const file = (c: string) => 'abcdefgh'.indexOf(c);
  const rank = (c: string) => 8 - parseInt(c, 10);
  return {
    from: [rank(uci[1]), file(uci[0])] as Square,
    to:   [rank(uci[3]), file(uci[2])] as Square,
  };
}

// ========== Sound Effects ==========
const playMoveSound = () => { playSfx('move'); vibrate(12); };
const playCaptureSound = () => { playSfx('capture'); vibrate([10, 20, 25]); };
const playCheckSound = () => { playSfx('check'); vibrate([30, 30, 50]); };
const playCastleSound = () => { playSfx('castle'); vibrate([20, 30, 20]); };

// ========== Component ==========
export default function ChessPage() {
  const { t, language } = useApp();
  const navigate = useNavigate();
  
  const savedChess = React.useMemo(() => loadChessGame(), []);

  type TimeControl = 'none' | 'rapid' | 'blitz' | 'bullet';
  const TC: Record<TimeControl, { seconds: number; inc: number }> = {
    none:   { seconds: 0,   inc: 0 },
    rapid:  { seconds: 600, inc: 5 },
    blitz:  { seconds: 300, inc: 2 },
    bullet: { seconds: 60,  inc: 1 },
  };

  const [game, setGame] = useState<GameState>(savedChess?.game || initGameState);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [status, setStatus] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [gameTimer, setGameTimer] = useState(savedChess?.gameTimer || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(savedChess?.gameStarted || false);
  const [stats, setStats] = useState<ChessStats>(loadChessStats);

  useEffect(() => {
    const syncStats = async () => {
      try {
        const cloudStats = await getGameProgress('chess');
        if (cloudStats) {
          localStorage.setItem('chess-stats', JSON.stringify(cloudStats));
          setStats(prev => ({ ...prev, ...cloudStats }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    syncStats();
  }, []);

  const [showStats, setShowStats] = useState(false);
  const [history, setHistory] = useState<GameState[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(loadBoardTheme);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [flipped, setFlipped] = useState(savedChess?.flipped || false);
  const [moveLog, setMoveLog] = useState<string[]>(savedChess?.moveLog || []);
  const [gameMode, setGameMode] = useState<GameMode>(savedChess?.gameMode || 'local');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>(savedChess?.aiDifficulty || 'medium');
  const [playerColor, setPlayerColor] = useState<Color>(savedChess?.playerColor || 'w');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);
  // Post-session reward screen — see MatchReportDialog.
  const [matchReport, setMatchReport] = useState<MatchReport | null>(null);
  const [timeControl, setTimeControl] = useState<TimeControl>(() => (localStorage.getItem('chess-tc') as TimeControl) || 'none');
  const [clockW, setClockW] = useState<number>(() => TC[(localStorage.getItem('chess-tc') as TimeControl) || 'none'].seconds);
  const [clockB, setClockB] = useState<number>(() => TC[(localStorage.getItem('chess-tc') as TimeControl) || 'none'].seconds);
  const [hintMove, setHintMove] = useState<{ from: Square; to: Square } | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [hintLoading, setHintLoading] = useState(false);
  // Transient toast for FEN/PGN copy feedback.
  const [copyFlash, setCopyFlash] = useState<string | null>(null);
  // Winner of the just-finished game ('w'|'b'|'draw') for PGN export.
  const [lastGameWinner, setLastGameWinner] = useState<'w' | 'b' | 'draw' | null>(null);

  // Bot personality (e.g. /games/chess?bot=fatima from career mode).
  // When unset, the AI plays the generic profile selected by aiDifficulty.
  const [searchParams] = useSearchParams();
  const activeBot: BotPersonality | null = useMemo(() => {
    const id = searchParams.get('bot');
    return id ? botById(id) : null;
  }, [searchParams]);

  // When a career bot is active, force computer mode and apply the URL color.
  // We do this once on mount so the player can still toggle later if they want.
  useEffect(() => {
    if (!activeBot) return;
    setGameMode('computer');
    const colorParam = searchParams.get('color');
    if (colorParam === 'w' || colorParam === 'b') setPlayerColor(colorParam);
    // Pick AI difficulty from the bot's Elo so the search depth matches.
    if (activeBot.elo < 900) setAiDifficulty('easy');
    else if (activeBot.elo < 1500) setAiDifficulty('medium');
    else if (activeBot.elo < 2000) setAiDifficulty('hard');
    else setAiDifficulty('master');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBot]);

  // UCI history mirrors moveLog for opening-book lookups. Built incrementally
  // as moves are made so we never re-derive it from the board state.
  const [uciHistory, setUciHistory] = useState<string[]>([]);

  // Recognized opening (just the name) — refreshed whenever uciHistory grows
  // while still inside the book. Becomes null once we drift off-book.
  const openingName = useMemo(() => recognizeOpening(uciHistory), [uciHistory]);

  // Auto-save chess game state
  useEffect(() => {
    if (gameOver) {
      clearChessGame();
      return;
    }
    saveChessGame({ game, gameTimer, gameStarted, moveLog, flipped, gameMode, aiDifficulty, playerColor });
  }, [game, gameTimer, gameStarted, moveLog, flipped, gameOver, gameMode, aiDifficulty, playerColor]);

  useEffect(() => {
    if (!isRunning || gameOver) return;
    const iv = setInterval(() => setGameTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, gameOver]);

  // Per-player chess clock
  useEffect(() => {
    if (!isRunning || gameOver || timeControl === 'none') return;
    const iv = setInterval(() => {
      if (game.turn === 'w') setClockW(s => Math.max(0, s - 1));
      else setClockB(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [isRunning, gameOver, game.turn, timeControl]);

  // Flag fall = loss
  useEffect(() => {
    if (timeControl === 'none' || gameOver) return;
    if (clockW <= 0) {
      setStatus('سقوط العلم — فوز الأسود');
      recordResult('b'); setGameOver(true); setIsRunning(false);
    } else if (clockB <= 0) {
      setStatus('سقوط العلم — فوز الأبيض');
      recordResult('w'); setGameOver(true); setIsRunning(false);
    }
  }, [clockW, clockB, timeControl, gameOver, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const recordResult = (winner: 'w' | 'b' | 'draw') => {
    setLastGameWinner(winner);
    const s = { ...stats, gamesPlayed: stats.gamesPlayed + 1, totalMoves: stats.totalMoves + game.moveCount };
    if (winner === 'w') s.whiteWins++;
    else if (winner === 'b') s.blackWins++;
    else s.stalemates++;
    setStats(s);
    saveChessStats(s);

    // Career mode: when an active bot is set we feed the result into the
    // career ladder so the next opponent unlocks and the player rating shifts.
    // The player is whichever color was chosen via playerColor; the bot is the
    // other side. We translate winner→player perspective before recording.
    if (activeBot) {
      let result: 'win' | 'loss' | 'draw';
      if (winner === 'draw') result = 'draw';
      else result = winner === playerColor ? 'win' : 'loss';
      recordCareerResult(activeBot.id, result);
    }

    // Feed the shared progression spine.
    const mode: ProgressionMode = activeBot
      ? 'chess-career'
      : timeControl !== 'none'
        ? 'chess-blitz'
        : gameMode === 'computer'
          ? 'chess-versus-ai'
          : 'chess-local';

    // In local play a human won on this device either way, so the session counts
    // as a win. Against the engine the outcome is from the player's perspective.
    const outcome =
      winner === 'draw' ? 'draw' : gameMode === 'local' ? 'win' : winner === playerColor ? 'win' : 'loss';

    setMatchReport(
      reportMatch({
        game: 'chess',
        mode,
        outcome,
        // Difficulty only means something when an engine is involved.
        difficulty: gameMode === 'computer' ? aiDifficulty : undefined,
        durationMs: gameTimer * 1000,
        score: game.moveCount,
      }),
    );
  };

  const getMoveNotation = (_board: BoardState, _sr: number, sc: number, tr: number, tc: number, piece: { type: PieceType; color: Color }, isCapture: boolean): string => {
    if (piece.type === 'K' && Math.abs(tc - sc) === 2) return tc === 6 ? 'O-O' : 'O-O-O';
    const pieceChar = piece.type === 'P' ? '' : piece.type;
    const captureChar = isCapture ? 'x' : '';
    const fromFile = piece.type === 'P' && isCapture ? FILES[sc] : '';
    const target = FILES[tc] + RANKS[tr];
    return `${pieceChar}${fromFile}${captureChar}${target}`;
  };

  const executeMove = useCallback((sr: number, sc: number, tr: number, tc: number, promoteTo?: PieceType) => {
    const nb = cloneBoard(game.board);
    const piece = nb[sr][sc]!;
    const newCastling = { ...game.castling };
    let newEnPassant: Square | null = null;
    const newCaptured = { w: [...game.captured.w], b: [...game.captured.b] };
    let isCapture = false;

    // En passant capture
    if (piece.type === 'P' && game.enPassant && tr === game.enPassant[0] && tc === game.enPassant[1]) {
      const capturedRow = piece.color === 'w' ? tr + 1 : tr - 1;
      const cp = nb[capturedRow][tc];
      if (cp) newCaptured[game.turn].push(PIECE_SVG[cp.color][cp.type]);
      nb[capturedRow][tc] = null;
      isCapture = true;
    }

    // Regular capture
    const targetPiece = nb[tr][tc];
    if (targetPiece) {
      newCaptured[game.turn].push(PIECE_SVG[targetPiece.color][targetPiece.type]);
      isCapture = true;
    }

    // Castling
    if (piece.type === 'K' && Math.abs(tc - sc) === 2) {
      const row = sr;
      if (tc === 6) { nb[row][5] = nb[row][7]; nb[row][7] = null; }
      if (tc === 2) { nb[row][3] = nb[row][0]; nb[row][0] = null; }
    }

    const notation = getMoveNotation(game.board, sr, sc, tr, tc, piece, isCapture);

    nb[tr][tc] = nb[sr][sc];
    nb[sr][sc] = null;

    if (piece.type === 'P' && Math.abs(tr - sr) === 2) newEnPassant = [(sr + tr) / 2, sc];

    if (piece.type === 'K') {
      if (piece.color === 'w') { newCastling.wK = false; newCastling.wQ = false; }
      else { newCastling.bK = false; newCastling.bQ = false; }
    }
    if (piece.type === 'R') {
      if (sr === 7 && sc === 7) newCastling.wK = false;
      if (sr === 7 && sc === 0) newCastling.wQ = false;
      if (sr === 0 && sc === 7) newCastling.bK = false;
      if (sr === 0 && sc === 0) newCastling.bQ = false;
    }
    if (tr === 7 && tc === 7) newCastling.wK = false;
    if (tr === 7 && tc === 0) newCastling.wQ = false;
    if (tr === 0 && tc === 7) newCastling.bK = false;
    if (tr === 0 && tc === 0) newCastling.bQ = false;

    // Pawn promotion
    if (piece.type === 'P' && (tr === 0 || tr === 7)) {
      nb[tr][tc] = { type: promoteTo || 'Q', color: piece.color };
    }

    setHistory(prev => [...prev, { ...game }]);
    setLastMove({ from: [sr, sc], to: [tr, tc] });
    setHintMove(null);

    // Apply increment for player who just moved
    if (timeControl !== 'none') {
      const inc = TC[timeControl].inc;
      if (inc > 0) {
        if (game.turn === 'w') setClockW(s => s + inc);
        else setClockB(s => s + inc);
      }
    }

    // Sound effects
    const isCastle = piece.type === 'K' && Math.abs(tc - sc) === 2;
    if (isCastle) playCastleSound();
    else if (isCapture) playCaptureSound();
    else playMoveSound();

    const next = game.turn === 'w' ? 'b' : 'w';
    const isPawnOrCapture = piece.type === 'P' || isCapture;
    const newHalfmoveClock = isPawnOrCapture ? 0 : game.halfmoveClock + 1;
    const newPositionCounts = { ...game.positionCounts };
    const positionKey = boardHash(nb, next, newCastling, newEnPassant);
    newPositionCounts[positionKey] = (newPositionCounts[positionKey] || 0) + 1;
    const newGame: GameState = {
      board: nb, turn: next, castling: newCastling,
      enPassant: newEnPassant, moveCount: game.moveCount + 1, captured: newCaptured,
      halfmoveClock: newHalfmoveClock, positionCounts: newPositionCounts,
    };

    const check = isInCheck(nb, next);
    const legal = hasAnyLegalMoves(nb, next, newEnPassant, newCastling);
    const insuf = isInsufficientMaterial(nb);
    const threefold = (newPositionCounts[positionKey] || 0) >= 3;
    const fiftyMove = newHalfmoveClock >= 100;

    let finalNotation = notation;
    if (!legal && check) {
      finalNotation += '#';
      setStatus(`${t('chess.checkmate')} ${game.turn === 'w' ? '♔' : '♚'}`);
      recordResult(game.turn);
      setGameOver(true);
      setIsRunning(false);
      playCheckSound();
    } else if (!legal) {
      setStatus('مأزق — تعادل!');
      recordResult('draw');
      setGameOver(true);
      setIsRunning(false);
    } else if (insuf) {
      setStatus('تعادل: مواد غير كافية');
      recordResult('draw');
      setGameOver(true);
      setIsRunning(false);
    } else if (threefold) {
      setStatus('تعادل: تكرار ثلاثي');
      recordResult('draw');
      setGameOver(true);
      setIsRunning(false);
    } else if (fiftyMove) {
      setStatus('تعادل: قاعدة الـ50 نقلة');
      recordResult('draw');
      setGameOver(true);
      setIsRunning(false);
    } else if (check) {
      finalNotation += '+';
      setStatus(t('chess.check'));
      playCheckSound();
    } else {
      setStatus('');
    }

    setMoveLog(prev => [...prev, finalNotation]);
    // Mirror the move into UCI history for opening-book consultation. Promotion
    // suffix is included when the pawn promoted in this move (board square is
    // a queen but the moving piece was a pawn).
    const promotedHere = piece.type === 'P' && (tr === 0 || tr === 7);
    setUciHistory(prev => [
      ...prev,
      squaresToUci([sr, sc], [tr, tc], promotedHere ? (promoteTo || 'Q') : undefined),
    ]);
    setGame(newGame);
    setSelected(null);
    setLegalMoves([]);
  }, [game, t, language, stats]);

  // Auto-start when player picks Black vs Computer (they can't make the first move)
  useEffect(() => {
    if (gameMode === 'computer' && playerColor === 'b' && !gameStarted && !gameOver && game.moveCount === 0) {
      setGameStarted(true);
      setIsRunning(true);
    }
  }, [gameMode, playerColor, gameStarted, gameOver, game.moveCount]);

  // AI move using dynamic off-thread Web Worker
  useEffect(() => {
    if (gameMode !== 'computer' || gameOver || !gameStarted) return;
    if (game.turn === playerColor) return;

    let cancelled = false;
    setAiThinking(true);

    const aiColor: Color = playerColor === 'w' ? 'b' : 'w';
    const opts = {
      weights: activeBot?.weights,
      history: uciHistory,
      preferredOpenings: activeBot?.preferredOpenings,
    };

    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../utils/chessWorker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      console.warn('[Chess] Failed to spawn Web Worker, falling back to main-thread search:', err);
    }

    if (worker) {
      worker.onmessage = (e: MessageEvent) => {
        if (cancelled) return;
        const { bestMove } = e.data;
        if (bestMove) {
          const movingPiece = game.board[bestMove.from[0]][bestMove.from[1]];
          const promo: PieceType | undefined =
            movingPiece?.type === 'P' && (bestMove.to[0] === 0 || bestMove.to[0] === 7) ? 'Q' : undefined;
          executeMove(bestMove.from[0], bestMove.from[1], bestMove.to[0], bestMove.to[1], promo);
        }
        setAiThinking(false);
        worker?.terminate();
      };

      worker.postMessage({
        game,
        aiColor,
        difficulty: aiDifficulty,
        opts,
      });
    } else {
      // Main-thread fallback
      const timeoutId = setTimeout(() => {
        if (cancelled) return;
        const move = getBestMove(game, aiColor, aiDifficulty, opts);
        if (cancelled) return;
        if (move) {
          const movingPiece = game.board[move.from[0]][move.from[1]];
          const promo: PieceType | undefined =
            movingPiece?.type === 'P' && (move.to[0] === 0 || move.to[0] === 7) ? 'Q' : undefined;
          executeMove(move.from[0], move.from[1], move.to[0], move.to[1], promo);
        }
        setAiThinking(false);
      }, 300 + Math.random() * 400);

      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
        setAiThinking(false);
      };
    }

    return () => {
      cancelled = true;
      if (worker) {
        worker.terminate();
      }
      setAiThinking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, gameMode, gameOver, gameStarted, playerColor, aiDifficulty]);

  const handleClick = useCallback((r: number, c: number) => {
    if (gameOver || aiThinking) return;
    if (gameMode === 'computer' && game.turn !== playerColor) return;
    if (!gameStarted) {
      setGameStarted(true);
      setIsRunning(true);
    }
    const piece = game.board[r][c];
    if (selected) {
      const [sr, sc] = selected;
      if (legalMoves.some(([mr, mc]) => mr === r && mc === c)) {
        // Check if pawn promotion
        const movingPiece = game.board[sr][sc];
        if (movingPiece?.type === 'P' && (r === 0 || r === 7)) {
          setPromotionPending({ from: [sr, sc], to: [r, c] });
          return;
        }
        executeMove(sr, sc, r, c);
        return;
      }
      if (piece?.color === game.turn) {
        setSelected([r, c]);
        setLegalMoves(getLegalMoves(game.board, r, c, game.enPassant, game.castling));
        return;
      }
      setSelected(null);
      setLegalMoves([]);
      return;
    }
    if (piece?.color === game.turn) {
      setSelected([r, c]);
      setLegalMoves(getLegalMoves(game.board, r, c, game.enPassant, game.castling));
    }
  }, [game, selected, legalMoves, gameOver, executeMove, gameMode, playerColor, aiThinking]);

  const handlePromotion = (pieceType: PieceType) => {
    if (!promotionPending) return;
    executeMove(promotionPending.from[0], promotionPending.from[1], promotionPending.to[0], promotionPending.to[1], pieceType);
    setPromotionPending(null);
  };

  const undo = () => {
    if (history.length === 0) return;
    const stepsBack = gameMode === 'computer' && history.length >= 2 ? 2 : 1;
    setGame(history[history.length - stepsBack]);
    setHistory(h => h.slice(0, -stepsBack));
    setMoveLog(prev => prev.slice(0, -stepsBack));
    setUciHistory(prev => prev.slice(0, -stepsBack));
    setSelected(null);
    setLegalMoves([]);
    setStatus('');
    setGameOver(false);
    setIsRunning(true);
    setLastMove(null);
    setHintMove(null);
    playSfx('click');
  };

  const showHint = () => {
    if (gameOver || !gameStarted || aiThinking || hintLoading) return;
    // Compute off-thread: a 'hard' search on the main thread froze the UI.
    setHintLoading(true);
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../utils/chessWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
    const finish = (move: { from: Square; to: Square } | null) => {
      if (move) {
        setHintMove(move); setHintCount(n => n + 1);
        playSfx('hint');
        setTimeout(() => setHintMove(null), 3000);
      }
      setHintLoading(false);
      worker?.terminate();
    };
    if (worker) {
      worker.onmessage = (e: MessageEvent) => {
        finish(e.data.bestMove ?? null);
      };
      worker.onerror = () => {
        // Degraded fallback: quick main-thread search rather than no hint.
        finish(getBestMove(game, game.turn, 'medium'));
      };
      worker.postMessage({ game, aiColor: game.turn, difficulty: 'hard', opts: {} });
    } else {
      const move = getBestMove(game, game.turn, 'medium');
      finish(move);
    }
  };

  const resign = () => {
    const winner = game.turn === 'w' ? 'b' : 'w';
    setStatus(`${'استسلام'} — ${winner === 'w' ? '♔' : '♚'}`);
    recordResult(winner);
    setGameOver(true);
    setIsRunning(false);
  };

  // ── FEN / PGN export ──────────────────────────────────────────────────
  // Built on the pure chessCore engine (single source of rules truth).
  const currentFen = useCallback((): string => {
    const pos = positionFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    if (!pos) return '';
    // Rebuild the position by replaying the UCI history from the initial
    // array — authoritative and avoids duplicating state mapping.
    let current = pos;
    for (const uci of uciHistory) {
      const next = applyMoveUci(current, uci);
      if (!next) break;
      current = next;
    }
    return positionToFen(current);
  }, [uciHistory]);

  const copyFen = async () => {
    const fen = currentFen();
    if (!fen) return;
    try {
      await navigator.clipboard.writeText(fen);
      setCopyFlash('تم نسخ FEN');
      setTimeout(() => setCopyFlash(null), 1600);
    } catch { /* clipboard unavailable */ }
  };

  const exportPgn = () => {
    if (moveLog.length === 0) return;
    const result =
      gameOver && lastGameWinner === 'draw' ? '1/2-1/2'
        : gameOver && lastGameWinner ? (lastGameWinner === 'w' ? '1-0' : '0-1')
        : '*';
    const date = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const headers = [
      `[Event "SmartHub Chess"]`,
      `[Site "amv.life"]`,
      `[Date "${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}"]`,
      `[White "${gameMode === 'computer' ? (playerColor === 'w' ? 'Player' : `Engine (${aiDifficulty})`) : 'Player 1'}"]`,
      `[Black "${gameMode === 'computer' ? (playerColor === 'b' ? 'Player' : `Engine (${aiDifficulty})`) : 'Player 2'}"]`,
      `[Result "${result}"]`,
      `[TimeControl "${timeControl === 'none' ? '-' : TC[timeControl].seconds + '+' + TC[timeControl].inc}"]`,
    ];
    let body = '';
    moveLog.forEach((san, i) => {
      if (i % 2 === 0) body += `${i / 2 + 1}. `;
      body += `${san} `;
    });
    const pgn = `${headers.join('\n')}\n\n${body.trim()} ${result}\n`;
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smarthub-chess-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
    setCopyFlash('تم تصدير PGN');
    setTimeout(() => setCopyFlash(null), 1600);
  };

  const resetGame = (mode?: GameMode) => {
    clearChessGame();
    const newMode = mode || gameMode;
    setGameMode(newMode);
    setGame(initGameState());
    setSelected(null);
    setLegalMoves([]);
    setStatus('');
    setGameOver(false);
    setGameTimer(0);
    setIsRunning(false);
    setGameStarted(false);
    setHistory([]);
    setLastMove(null);
    setMoveLog([]);
    setUciHistory([]);
    setAiThinking(false);
    setPromotionPending(null);
    setHintMove(null); setHintCount(0);
    setClockW(TC[timeControl].seconds);
    setClockB(TC[timeControl].seconds);
    if (newMode === 'computer') {
      setFlipped(playerColor === 'b');
    }
    setShowModeSelector(false);
  };

  const checkedKing = (() => {
    if (!status) return null;
    const checkStr = t('chess.check');
    const checkmateStr = t('chess.checkmate');
    if (!status.includes(checkStr) && !status.includes(checkmateStr)) return null;
    return findKing(game.board, game.turn);
  })();

  // Evaluation bar (-1..+1 of evaluateBoard, capped)
  const evalScore = useMemo(() => {
    const raw = evaluateBoard(game.board) / 100;
    return Math.max(-10, Math.min(10, raw));
  }, [game.board]);
  const evalPct = ((evalScore + 10) / 20) * 100;

  // ملاحظة: سمات نمط الرقعة ثنائي الأبعاد أُبقيت في الخيارات حفاظاً على
  // تفضيلات المستخدم المخزنة، والمشهد ثلاثي الأبعاد يستخدم هويته البصرية
  // الموحدة (أوبسيديان/عاج/نحاس) بغضّ النظر عنها.

  const pieceValues: Record<PieceType, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  const calcMaterial = (color: Color) => {
    let total = 0;
    game.board.forEach(row => row.forEach(cell => {
      if (cell?.color === color) total += pieceValues[cell.type];
    }));
    return total;
  };
  const whiteMat = calcMaterial('w');
  const blackMat = calcMaterial('b');
  const whiteAdv = whiteMat - blackMat;
  const blackAdv = blackMat - whiteMat;

  const handleThemeChange = (t: BoardTheme) => {
    setBoardTheme(t);
    saveBoardTheme(t);
    setShowThemeSelector(false);
  };

  const aiDiffLabels: Record<AIDifficulty, string> = {
    easy: 'سهل',
    medium: 'متوسط',
    hard: 'صعب',
    master: 'خبير',
  };

  const chessRules = [
    'كل لاعب يحرك قطعة واحدة في دوره',
    'الهدف هو كش ملك الخصم (شاه مات)',
    'البيادق تتحرك للأمام وتأكل قطرياً',
    'القلعة تتحرك أفقياً وعمودياً',
    'الفيل يتحرك قطرياً',
    'الوزير يجمع حركة القلعة والفيل',
    'الحصان يتحرك على شكل حرف L',
  ];

  const chessStats = [
    { label: 'لُعبت', value: stats.gamesPlayed },
    { label: '♔ ' + ('فوز أبيض'), value: stats.whiteWins },
    { label: '♚ ' + ('فوز أسود'), value: stats.blackWins },
    { label: 'تعادل', value: stats.stalemates },
  ];

  const chessOptions = [
    {
      key: 'mode',
      label: 'الوضع',
      choices: [
        { value: 'local', label: 'لاعبان' },
        { value: 'computer', label: 'ضد الحاسوب' },
      ],
      current: gameMode,
      onChange: (v: string) => resetGame(v as GameMode),
    },
    {
      key: 'ai',
      label: 'صعوبة الحاسوب',
      choices: [
        { value: 'easy',   label: aiDiffLabels.easy },
        { value: 'medium', label: aiDiffLabels.medium },
        { value: 'hard',   label: aiDiffLabels.hard },
        { value: 'master', label: aiDiffLabels.master },
      ],
      current: aiDifficulty,
      onChange: (v: string) => setAiDifficulty(v as AIDifficulty),
    },
    {
      key: 'color',
      label: 'لونك',
      choices: [
        { value: 'w', label: 'أبيض' },
        { value: 'b', label: 'أسود' },
      ],
      current: playerColor,
      onChange: (v: string) => { setPlayerColor(v as Color); if (gameMode === 'computer') resetGame('computer'); },
    },
    {
      key: 'tc',
      label: 'الساعة',
      choices: [
        { value: 'none',   label: 'بلا' },
        { value: 'rapid',  label: '10+5' },
        { value: 'blitz',  label: '5+2' },
        { value: 'bullet', label: '1+1' },
      ],
      current: timeControl,
      onChange: (v: string) => {
        const t = v as TimeControl;
        setTimeControl(t); localStorage.setItem('chess-tc', t);
        setClockW(TC[t].seconds); setClockB(TC[t].seconds);
      },
    },
    {
      key: 'theme',
      label: 'نمط الرقعة',
      choices: [
        { value: 'classic', label: 'كلاسيكي' },
        { value: 'wooden', label: 'خشبي' },
        { value: 'midnight', label: 'ليلي' },
        { value: 'emerald', label: 'زمردي' },
      ],
      current: boardTheme,
      onChange: (v: string) => handleThemeChange(v as BoardTheme),
    },
  ];

  const timerDisplay = (
    <div className="flex items-center gap-1 text-mini text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full tabular-nums">
      <Clock className="w-3 h-3" />{formatTimer(gameTimer)}
    </div>
  );

  return (
    <GameShell
      title={t('games.chess')}
      icon={Crown}
      accentColor="hsl(221, 83%, 53%)"
      rules={chessRules}
      stats={chessStats}
      options={chessOptions}
      headerRight={timerDisplay}
    >

      {/* Promotion Dialog */}
      <AnimatePresence>
        {promotionPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-drawer bg-black/50 flex items-center justify-center">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="bg-card rounded-2xl p-4">
              <p className="text-meta font-semibold text-foreground text-center mb-3">
                {'اختر قطعة الترقية'}
              </p>
              <div className="flex gap-3">
                {(['Q', 'R', 'B', 'N'] as PieceType[]).map(pt => (
                  <button key={pt} onClick={() => handlePromotion(pt)}
                    className="w-14 h-14 rounded-xl bg-secondary/80 flex items-center justify-center hover:bg-primary/20 transition-colors active:scale-90"
                    style={{ fontSize: '32px' }}>
                    {PIECE_SVG[game.turn][pt]}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bot personality + opening banner — appears above the board so the
          player always sees who they're playing and what theory is on. */}
      {(activeBot || openingName) && (
        <div className="max-w-[340px] mx-auto px-4 mb-2 flex items-center justify-between gap-2">
          {activeBot ? (
            <div className="flex items-center gap-1.5 text-mini">
              <span className="text-body">{activeBot.emoji}</span>
              <div className="leading-tight">
                <p className="font-bold text-foreground text-micro">{activeBot.ar}</p>
                <p className="text-micro text-muted-foreground">Elo {activeBot.elo}</p>
              </div>
            </div>
          ) : <div />}
          {openingName && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/12 border border-amber-500/25">
              <span className="text-micro font-mono text-amber-300/80">{openingName.eco}</span>
              <span className="text-micro font-bold text-amber-200">{openingName.ar}</span>
            </div>
          )}
        </div>
      )}

      {/* Player bar — Top */}
      <div className="max-w-[340px] mx-auto px-4 mb-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full border-2 border-border flex items-center justify-center ${flipped ? 'bg-white' : 'bg-gray-900'}`}>
              <span className={`text-micro font-bold ${flipped ? 'text-gray-900' : 'text-white'}`}>{flipped ? 'W' : 'B'}</span>
            </div>
            <span className="text-mini font-medium text-foreground">
              {flipped
                ? ('أبيض')
                : ('أسود')}
            </span>
            {(flipped ? whiteAdv < 0 : blackAdv > 0) && <span className="text-micro text-muted-foreground">+{flipped ? -whiteAdv : blackAdv}</span>}
          </div>
          <div className="flex items-center gap-2">
            {timeControl !== 'none' && (
              <div className={`text-micro font-bold tabular-nums px-2 py-0.5 rounded-md ${game.turn === (flipped ? 'w' : 'b') ? 'bg-amber-500/20 text-amber-200' : 'bg-secondary/60 text-foreground/60'}`}>
                {formatTimer(flipped ? clockW : clockB)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Eval bar */}
      <div className="max-w-[340px] mx-auto px-4 mb-1">
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden flex relative">
          <div className="h-full bg-white transition-all duration-300" style={{ width: `${evalPct}%` }} />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-500/60" />
        </div>
        <div className="flex justify-between text-micro text-muted-foreground mt-0.5 tabular-nums">
          <span>{evalScore > 0 ? `+${evalScore.toFixed(1)}` : evalScore.toFixed(1)}</span>
          <span>{'تقييم'}</span>
        </div>
      </div>

      {/* Board — المشهد ثلاثي الأبعاد */}
      <div className="max-w-[340px] mx-auto px-4 relative">
        <AnimatePresence>
          {!gameStarted && !gameOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-sticky rounded-lg bg-black/45 backdrop-blur-[2px] flex items-center justify-center mx-4"
              onClick={() => { setGameStarted(true); setIsRunning(true); }}>
              <div className="flex flex-col items-center gap-3">
                <Play className="w-10 h-10 text-primary stroke-[1.5]" />
                <span className="text-muted-foreground font-medium text-meta">
                  {'اضغط للبدء'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="rounded-lg overflow-hidden relative"
          style={{ aspectRatio: '1 / 1' }}
        >
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/40">
                <span className="text-micro text-muted-foreground animate-pulse">{'تجهيز الرقعة…'}</span>
              </div>
            }
          >
            <Board3D
              board={game.board}
              flipped={flipped}
              selected={selected}
              legalMoves={legalMoves}
              lastMove={lastMove}
              checkedKing={checkedKing}
              hintMove={hintMove}
              interactive={!gameOver && !aiThinking && (gameMode === 'local' || game.turn === playerColor)}
              onSquareTap={handleClick}
              capturedW={game.captured.w}
              capturedB={game.captured.b}
              turn={game.turn}
              defeatedColor={
                gameOver && lastGameWinner && lastGameWinner !== 'draw'
                  ? ((lastGameWinner === 'w' ? 'b' : 'w') as Color)
                  : null
              }
            />
          </Suspense>
        </div>
      </div>

      {/* Player bar — Bottom */}
      <div className="max-w-[340px] mx-auto px-4 mt-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full border-2 border-border flex items-center justify-center ${flipped ? 'bg-gray-900' : 'bg-white'}`}>
              <span className={`text-micro font-bold ${flipped ? 'text-white' : 'text-gray-900'}`}>{flipped ? 'B' : 'W'}</span>
            </div>
            <span className="text-mini font-medium text-foreground">
              {flipped
                ? ('أسود')
                : ('أبيض')}
            </span>
            {(flipped ? blackAdv > 0 : whiteAdv > 0) && <span className="text-micro text-muted-foreground">+{flipped ? blackAdv : whiteAdv}</span>}
          </div>
          <div className="flex items-center gap-2">
            {timeControl !== 'none' && (
              <div className={`text-micro font-bold tabular-nums px-2 py-0.5 rounded-md ${game.turn === (flipped ? 'b' : 'w') ? 'bg-amber-500/20 text-amber-200' : 'bg-secondary/60 text-foreground/60'}`}>
                {formatTimer(flipped ? clockB : clockW)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Turn indicator & Timer */}
      <div className="max-w-sm mx-auto px-4 mt-4">
        <div className="flex items-center justify-center gap-3">
          <div className={`w-3 h-3 rounded-full ${game.turn === 'w' ? 'bg-white border border-border' : 'bg-gray-900'}`} />
          <span className="text-meta font-medium text-foreground">
            {game.turn === 'w'
              ? ('دور الأبيض')
              : ('دور الأسود')}
          </span>
          <div className="flex items-center gap-1 text-mini text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-full tabular-nums">
            <Clock className="w-3 h-3" />{formatTimer(gameTimer)}
          </div>
        </div>

        {status && (
          <motion.div initial={{ y: -5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="text-center mt-2">
            <span className={`text-meta font-semibold ${gameOver ? 'text-primary' : 'text-destructive'}`}>
              {status}
            </span>
          </motion.div>
        )}
      </div>

      {/* Move log */}
      {moveLog.length > 0 && (
        <div className="max-w-sm mx-auto px-4 mt-3">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {moveLog.slice(-8).map((m, i) => {
              const actualIndex = moveLog.length - Math.min(moveLog.length, 8) + i;
              const moveNum = Math.floor(actualIndex / 2) + 1;
              const isWhite = actualIndex % 2 === 0;
              return (
                <span key={i} className="text-micro text-muted-foreground tabular-nums">
                  {isWhite && <span className="text-foreground/40">{moveNum}.</span>}
                  <span className="font-medium text-foreground/70">{m}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-3 mt-5 max-w-sm mx-auto px-4">
        <button onClick={undo} disabled={history.length === 0 || gameOver || aiThinking}
          className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl bg-secondary/70 text-foreground disabled:opacity-25 active:scale-90 transition-all">
          <Undo2 className="w-5 h-5" />
          <span className="text-micro font-medium">{'تراجع'}</span>
        </button>

        <button onClick={() => setFlipped(!flipped)}
          className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl bg-secondary/70 text-foreground active:scale-90 transition-all">
          <RotateCcw className="w-5 h-5" />
          <span className="text-micro font-medium">{'قلب'}</span>
        </button>

        <button onClick={showHint} disabled={gameOver || aiThinking || !gameStarted || hintLoading}
          className="relative flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl bg-amber-500/15 text-amber-300 active:scale-90 transition-all disabled:opacity-25">
          <Lightbulb className={`w-5 h-5 ${hintLoading ? 'animate-pulse' : ''}`} />
          <span className="text-micro font-medium">{'تلميح'}</span>
          {hintCount > 0 && <span className="absolute -top-1 -right-1 text-micro bg-amber-500/30 rounded-full px-1">{hintCount}</span>}
        </button>

        {!gameOver && (
          <button onClick={resign} disabled={aiThinking}
            className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl bg-destructive/10 text-destructive active:scale-90 transition-all disabled:opacity-25">
            <Flag className="w-5 h-5" />
            <span className="text-micro font-medium">{'استسلام'}</span>
          </button>
        )}

        {moveLog.length > 0 && (
          <>
            <button onClick={copyFen} title={'نسخ وضعية اللوحة (FEN)'}
              className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl bg-secondary/70 text-foreground active:scale-90 transition-all">
              <Copy className="w-5 h-5" />
              <span className="text-micro font-medium">FEN</span>
            </button>
            <button onClick={exportPgn} title={'تصدير اللعبة (PGN)'}
              className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl bg-secondary/70 text-foreground active:scale-90 transition-all">
              <Download className="w-5 h-5" />
              <span className="text-micro font-medium">PGN</span>
            </button>
          </>
        )}

        <button onClick={() => resetGame()}
          className="flex flex-col items-center gap-1 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground active:scale-90 transition-all">
          <RotateCcw className="w-5 h-5" />
          <span className="text-micro font-medium">{t('chess.newGame')}</span>
        </button>
      </div>

      {/* Copy/export feedback toast */}
      <AnimatePresence>
        {copyFlash && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-drawer px-4 py-2 rounded-full bg-card border border-border text-micro font-bold text-foreground">
            {copyFlash}
          </motion.div>
        )}
      </AnimatePresence>
      <MatchReportDialog report={matchReport} onClose={() => setMatchReport(null)} day={dayKey()} />
    </GameShell>
  );
}
