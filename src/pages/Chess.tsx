import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Clock, Undo2, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Color = 'w' | 'b';
type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
type Piece = { type: PieceType; color: Color } | null;
type BoardState = Piece[][];
type Square = [number, number];

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
}

function loadChessStats(): ChessStats {
  const saved = localStorage.getItem('chess-stats');
  return saved ? JSON.parse(saved) : { gamesPlayed: 0, whiteWins: 0, blackWins: 0, stalemates: 0, totalMoves: 0 };
}
function saveChessStats(s: ChessStats) { localStorage.setItem('chess-stats', JSON.stringify(s)); }

const PIECE_SYMBOLS: Record<Color, Record<PieceType, string>> = {
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
          // En passant
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

function isInCheck(board: BoardState, color: Color): boolean {
  const [kr, kc] = findKing(board, color);
  const enemy = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (board[r][c]?.color === enemy && getRawMoves(board, r, c, null).some(([mr, mc]) => mr === kr && mc === kc))
      return true;
  return false;
}

function isSquareAttacked(board: BoardState, sr: number, sc: number, byColor: Color): boolean {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (board[r][c]?.color === byColor && getRawMoves(board, r, c, null).some(([mr, mc]) => mr === sr && mc === sc))
      return true;
  return false;
}

function getCastlingMoves(board: BoardState, color: Color, castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }): Square[] {
  const moves: Square[] = [];
  const row = color === 'w' ? 7 : 0;
  const enemy = color === 'w' ? 'b' : 'w';

  if (isInCheck(board, color)) return moves;

  // King-side
  const canKingSide = color === 'w' ? castling.wK : castling.bK;
  if (canKingSide && !board[row][5] && !board[row][6] && board[row][7]?.type === 'R' && board[row][7]?.color === color) {
    if (!isSquareAttacked(board, row, 5, enemy) && !isSquareAttacked(board, row, 6, enemy)) {
      moves.push([row, 6]);
    }
  }

  // Queen-side
  const canQueenSide = color === 'w' ? castling.wQ : castling.bQ;
  if (canQueenSide && !board[row][3] && !board[row][2] && !board[row][1] && board[row][0]?.type === 'R' && board[row][0]?.color === color) {
    if (!isSquareAttacked(board, row, 3, enemy) && !isSquareAttacked(board, row, 2, enemy)) {
      moves.push([row, 2]);
    }
  }

  return moves;
}

function getLegalMoves(board: BoardState, r: number, c: number, enPassant: Square | null, castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }): Square[] {
  const piece = board[r][c];
  if (!piece) return [];
  let moves = getRawMoves(board, r, c, enPassant).filter(([tr, tc]) => {
    const nb = cloneBoard(board);
    // Handle en passant capture
    if (piece.type === 'P' && enPassant && tr === enPassant[0] && tc === enPassant[1]) {
      const capturedRow = piece.color === 'w' ? tr + 1 : tr - 1;
      nb[capturedRow][tc] = null;
    }
    nb[tr][tc] = nb[r][c];
    nb[r][c] = null;
    return !isInCheck(nb, piece.color);
  });

  // Add castling moves for king
  if (piece.type === 'K') {
    moves = [...moves, ...getCastlingMoves(board, piece.color, castling)];
  }

  return moves;
}

function hasAnyLegalMoves(board: BoardState, color: Color, enPassant: Square | null, castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }): boolean {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (board[r][c]?.color === color && getLegalMoves(board, r, c, enPassant, castling).length > 0) return true;
  return false;
}

function initGameState(): GameState {
  return {
    board: initBoard(),
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    moveCount: 0,
    captured: { w: [], b: [] },
  };
}

export default function ChessPage() {
  const { t, dir, language } = useApp();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameState>(initGameState);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [status, setStatus] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [gameTimer, setGameTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [stats, setStats] = useState<ChessStats>(loadChessStats);
  const [showStats, setShowStats] = useState(false);
  const [history, setHistory] = useState<GameState[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [promotionPending, setPromotionPending] = useState<{ row: number; col: number; color: Color } | null>(null);

  useEffect(() => {
    if (!isRunning || gameOver) return;
    const iv = setInterval(() => setGameTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, gameOver]);

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const recordResult = (winner: 'w' | 'b' | 'draw') => {
    const s = { ...stats, gamesPlayed: stats.gamesPlayed + 1, totalMoves: stats.totalMoves + game.moveCount };
    if (winner === 'w') s.whiteWins++;
    else if (winner === 'b') s.blackWins++;
    else s.stalemates++;
    setStats(s);
    saveChessStats(s);
  };

  const executeMove = useCallback((sr: number, sc: number, tr: number, tc: number) => {
    const nb = cloneBoard(game.board);
    const piece = nb[sr][sc]!;
    const newCastling = { ...game.castling };
    let newEnPassant: Square | null = null;
    const newCaptured = { w: [...game.captured.w], b: [...game.captured.b] };

    // Handle en passant capture
    if (piece.type === 'P' && game.enPassant && tr === game.enPassant[0] && tc === game.enPassant[1]) {
      const capturedRow = piece.color === 'w' ? tr + 1 : tr - 1;
      const cp = nb[capturedRow][tc];
      if (cp) newCaptured[game.turn].push(PIECE_SYMBOLS[cp.color][cp.type]);
      nb[capturedRow][tc] = null;
    }

    // Capture
    const targetPiece = nb[tr][tc];
    if (targetPiece) newCaptured[game.turn].push(PIECE_SYMBOLS[targetPiece.color][targetPiece.type]);

    // Castling move
    if (piece.type === 'K' && Math.abs(tc - sc) === 2) {
      const row = sr;
      if (tc === 6) { nb[row][5] = nb[row][7]; nb[row][7] = null; } // King-side
      if (tc === 2) { nb[row][3] = nb[row][0]; nb[row][0] = null; } // Queen-side
    }

    nb[tr][tc] = nb[sr][sc];
    nb[sr][sc] = null;

    // Pawn double move → set en passant
    if (piece.type === 'P' && Math.abs(tr - sr) === 2) {
      newEnPassant = [(sr + tr) / 2, sc];
    }

    // Update castling rights
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
    // Rook captured
    if (tr === 7 && tc === 7) newCastling.wK = false;
    if (tr === 7 && tc === 0) newCastling.wQ = false;
    if (tr === 0 && tc === 7) newCastling.bK = false;
    if (tr === 0 && tc === 0) newCastling.bQ = false;

    // Check for pawn promotion
    if (piece.type === 'P' && (tr === 0 || tr === 7)) {
      nb[tr][tc] = { type: 'Q', color: piece.color }; // Auto-promote to queen
    }

    setHistory(prev => [...prev, { ...game }]);
    setLastMove({ from: [sr, sc], to: [tr, tc] });

    const next = game.turn === 'w' ? 'b' : 'w';
    const newGame: GameState = {
      board: nb,
      turn: next,
      castling: newCastling,
      enPassant: newEnPassant,
      moveCount: game.moveCount + 1,
      captured: newCaptured,
    };

    const check = isInCheck(nb, next);
    const legal = hasAnyLegalMoves(nb, next, newEnPassant, newCastling);

    if (!legal) {
      if (check) {
        setStatus(`${t('chess.checkmate')} ${game.turn === 'w' ? '♔' : '♚'}`);
        recordResult(game.turn);
      } else {
        setStatus(language === 'ar' ? 'تعادل!' : 'Stalemate!');
        recordResult('draw');
      }
      setGameOver(true);
      setIsRunning(false);
    } else if (check) {
      setStatus(t('chess.check'));
    } else {
      setStatus('');
    }

    setGame(newGame);
    setSelected(null);
    setLegalMoves([]);
  }, [game, t, language, stats]);

  const handleClick = useCallback((r: number, c: number) => {
    if (gameOver || promotionPending) return;
    const piece = game.board[r][c];

    if (selected) {
      const [sr, sc] = selected;
      if (legalMoves.some(([mr, mc]) => mr === r && mc === c)) {
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
  }, [game, selected, legalMoves, gameOver, promotionPending, executeMove]);

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setGame(prev);
    setHistory(h => h.slice(0, -1));
    setSelected(null);
    setLegalMoves([]);
    setStatus('');
    setGameOver(false);
    setIsRunning(true);
    setLastMove(null);
  };

  const resign = () => {
    const winner = game.turn === 'w' ? 'b' : 'w';
    setStatus(`${language === 'ar' ? 'استسلام' : 'Resigned'} — ${winner === 'w' ? '♔' : '♚'}`);
    recordResult(winner);
    setGameOver(true);
    setIsRunning(false);
  };

  const resetGame = () => {
    setGame(initGameState());
    setSelected(null);
    setLegalMoves([]);
    setStatus('');
    setGameOver(false);
    setGameTimer(0);
    setIsRunning(true);
    setHistory([]);
    setLastMove(null);
    setPromotionPending(null);
  };

  const isLastMoveSquare = (r: number, c: number) =>
    lastMove && ((lastMove.from[0] === r && lastMove.from[1] === c) || (lastMove.to[0] === r && lastMove.to[1] === c));

  const checkedKing = (() => {
    if (!status.includes(t('chess.check')) && !status.includes(t('chess.checkmate'))) return null;
    const color = game.turn;
    return findKing(game.board, color);
  })();

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 max-w-sm mx-auto">
        <button onClick={() => navigate('/games')} className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center active:scale-90 transition-transform">
          <ArrowLeft className={`w-4.5 h-4.5 text-foreground stroke-[1.8] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-xl font-bold text-foreground flex-1">{t('games.chess')}</h1>
        <button onClick={() => setShowStats(!showStats)} className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
          <Trophy className={`w-4.5 h-4.5 stroke-[1.8] ${showStats ? 'text-primary' : 'text-muted-foreground'}`} />
        </button>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-2xl tabular-nums">
          <Clock className="w-3.5 h-3.5 stroke-[1.8]" />{formatTimer(gameTimer)}
        </div>
      </div>

      {/* Stats Panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden max-w-sm mx-auto mb-4"
          >
            <div className="premium-card-elevated p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary stroke-[1.8]" />{t('stats.title')}
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { v: stats.gamesPlayed, l: t('stats.played') },
                  { v: stats.totalMoves, l: t('stats.moves') },
                  { v: stats.whiteWins, l: `♔ ${t('stats.wins')}` },
                  { v: stats.blackWins, l: `♚ ${t('stats.wins')}` },
                ].map((s, i) => (
                  <div key={i} className="text-center p-2.5 rounded-xl bg-secondary/60">
                    <div className="text-xl font-bold text-foreground">{s.v}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn & status */}
      <div className="text-center mb-3 max-w-sm mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-secondary/60 text-sm">
          <span className="text-lg">{game.turn === 'w' ? '♔' : '♚'}</span>
          <span className="font-medium text-foreground">
            {game.turn === 'w' ? t('chess.white') : t('chess.black')}
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{game.moveCount}</span>
        </div>
        {status && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-primary font-bold text-base mt-2">{status}</motion.div>
        )}
      </div>

      {/* Black captured */}
      <div className="flex justify-center gap-0.5 mb-1.5 min-h-[22px] max-w-sm mx-auto">
        {game.captured.b.map((p, i) => <span key={i} className="text-base opacity-70">{p}</span>)}
      </div>

      {/* Board */}
      <div className="max-w-[340px] mx-auto mb-1.5">
        <div className="premium-card-intense p-1.5">
          <div className="grid grid-cols-8 rounded-lg overflow-hidden">
            {game.board.map((row, ri) => row.map((cell, ci) => {
              const isDark = (ri + ci) % 2 === 1;
              const isSelected = selected?.[0] === ri && selected?.[1] === ci;
              const isLegal = legalMoves.some(([mr, mc]) => mr === ri && mc === ci);
              const isLast = isLastMoveSquare(ri, ci);
              const isChecked = checkedKing && checkedKing[0] === ri && checkedKing[1] === ci;

              return (
                <button key={`${ri}-${ci}`} onClick={() => handleClick(ri, ci)}
                  className={`aspect-square flex items-center justify-center text-[26px] relative transition-all duration-150
                    ${isDark ? 'bg-primary/10' : 'bg-card'}
                    ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/25' : ''}
                    ${isLast && !isSelected ? 'bg-primary/8' : ''}
                    ${isChecked ? 'bg-destructive/20' : ''}
                  `}
                >
                  {isLegal && !cell && <div className="absolute w-3 h-3 rounded-full bg-primary/30" />}
                  {isLegal && cell && <div className="absolute inset-0.5 rounded-sm ring-2 ring-primary/40 ring-inset" />}
                  {cell && (
                    <motion.span
                      className="relative z-10 select-none"
                      initial={false}
                      animate={{ scale: isSelected ? 1.15 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      {PIECE_SYMBOLS[cell.color][cell.type]}
                    </motion.span>
                  )}
                </button>
              );
            }))}
          </div>
        </div>
      </div>

      {/* White captured */}
      <div className="flex justify-center gap-0.5 mt-1.5 min-h-[22px] max-w-sm mx-auto">
        {game.captured.w.map((p, i) => <span key={i} className="text-base opacity-70">{p}</span>)}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 mt-5 max-w-sm mx-auto flex-wrap">
        <button onClick={undo} disabled={history.length === 0 || gameOver}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium disabled:opacity-30 active:scale-95 transition-all">
          <Undo2 className="w-4 h-4 stroke-[1.8]" />{language === 'ar' ? 'تراجع' : 'Undo'}
        </button>
        {!gameOver && (
          <button onClick={resign}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium active:scale-95 transition-all">
            <Flag className="w-4 h-4 stroke-[1.8]" />{language === 'ar' ? 'استسلام' : 'Resign'}
          </button>
        )}
        <button onClick={resetGame}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-95 transition-all">
          <RefreshCw className="w-4 h-4 stroke-[1.8]" />{t('chess.newGame')}
        </button>
      </div>
    </div>
  );
}
