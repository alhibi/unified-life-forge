import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Undo2, Flag, Trophy, Clock, ChevronDown, Settings2, Play } from 'lucide-react';
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
function saveChessStats(s: ChessStats) { localStorage.setItem('chess-stats', JSON.stringify(s)); }

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
}

function saveChessGame(state: SavedChessGame) {
  localStorage.setItem('chess-game-state', JSON.stringify(state));
}
function loadChessGame(): SavedChessGame | null {
  const saved = localStorage.getItem('chess-game-state');
  if (!saved) return null;
  try { return JSON.parse(saved); } catch { return null; }
}
function clearChessGame() { localStorage.removeItem('chess-game-state'); }

// Minimal SVG piece rendering for a cleaner look
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
  return {
    board: initBoard(),
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    moveCount: 0,
    captured: { w: [], b: [] },
  };
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function ChessPage() {
  const { t, dir, language } = useApp();
  const navigate = useNavigate();
  
  const savedChess = React.useMemo(() => loadChessGame(), []);
  
  const [game, setGame] = useState<GameState>(savedChess?.game || initGameState);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [status, setStatus] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [gameTimer, setGameTimer] = useState(savedChess?.gameTimer || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(savedChess?.gameStarted || false);
  const [stats, setStats] = useState<ChessStats>(loadChessStats);
  const [showStats, setShowStats] = useState(false);
  const [history, setHistory] = useState<GameState[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(loadBoardTheme);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [flipped, setFlipped] = useState(savedChess?.flipped || false);
  const [moveLog, setMoveLog] = useState<string[]>(savedChess?.moveLog || []);

  // Auto-save chess game state
  useEffect(() => {
    if (gameOver) {
      clearChessGame();
      return;
    }
    saveChessGame({ game, gameTimer, gameStarted, moveLog, flipped });
  }, [game, gameTimer, gameStarted, moveLog, flipped, gameOver]);

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

  const getMoveNotation = (board: BoardState, sr: number, sc: number, tr: number, tc: number, piece: { type: PieceType; color: Color }, isCapture: boolean): string => {
    if (piece.type === 'K' && Math.abs(tc - sc) === 2) return tc === 6 ? 'O-O' : 'O-O-O';
    const pieceChar = piece.type === 'P' ? '' : piece.type;
    const captureChar = isCapture ? 'x' : '';
    const fromFile = piece.type === 'P' && isCapture ? FILES[sc] : '';
    const target = FILES[tc] + RANKS[tr];
    return `${pieceChar}${fromFile}${captureChar}${target}`;
  };

  const executeMove = useCallback((sr: number, sc: number, tr: number, tc: number) => {
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
      nb[tr][tc] = { type: 'Q', color: piece.color };
    }

    setHistory(prev => [...prev, { ...game }]);
    setLastMove({ from: [sr, sc], to: [tr, tc] });

    const next = game.turn === 'w' ? 'b' : 'w';
    const newGame: GameState = {
      board: nb, turn: next, castling: newCastling,
      enPassant: newEnPassant, moveCount: game.moveCount + 1, captured: newCaptured,
    };

    const check = isInCheck(nb, next);
    const legal = hasAnyLegalMoves(nb, next, newEnPassant, newCastling);

    let finalNotation = notation;
    if (!legal && check) {
      finalNotation += '#';
      setStatus(`${t('chess.checkmate')} ${game.turn === 'w' ? '♔' : '♚'}`);
      recordResult(game.turn);
      setGameOver(true);
      setIsRunning(false);
    } else if (!legal) {
      setStatus(language === 'ar' ? 'تعادل!' : 'Stalemate!');
      recordResult('draw');
      setGameOver(true);
      setIsRunning(false);
    } else if (check) {
      finalNotation += '+';
      setStatus(t('chess.check'));
    } else {
      setStatus('');
    }

    setMoveLog(prev => [...prev, finalNotation]);
    setGame(newGame);
    setSelected(null);
    setLegalMoves([]);
  }, [game, t, language, stats]);

  const handleClick = useCallback((r: number, c: number) => {
    if (gameOver) return;
    if (!gameStarted) {
      setGameStarted(true);
      setIsRunning(true);
    }
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
  }, [game, selected, legalMoves, gameOver, executeMove]);

  const undo = () => {
    if (history.length === 0) return;
    setGame(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
    setMoveLog(prev => prev.slice(0, -1));
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
    setIsRunning(false);
    setGameStarted(false);
    setHistory([]);
    setLastMove(null);
    setMoveLog([]);
  };

  const isLastMoveSquare = (r: number, c: number) =>
    lastMove && ((lastMove.from[0] === r && lastMove.from[1] === c) || (lastMove.to[0] === r && lastMove.to[1] === c));

  const checkedKing = (() => {
    if (!status) return null;
    const checkStr = t('chess.check');
    const checkmateStr = t('chess.checkmate');
    if (!status.includes(checkStr) && !status.includes(checkmateStr)) return null;
    return findKing(game.board, game.turn);
  })();

  const theme = BOARD_THEMES[boardTheme];

  const renderBoard = () => {
    const rows = flipped ? [...Array(8)].map((_, i) => 7 - i) : [...Array(8)].map((_, i) => i);
    const cols = flipped ? [...Array(8)].map((_, i) => 7 - i) : [...Array(8)].map((_, i) => i);

    return rows.map((ri) => cols.map((ci) => {
      const isDark = (ri + ci) % 2 === 1;
      const cell = game.board[ri][ci];
      const isSelected = selected?.[0] === ri && selected?.[1] === ci;
      const isLegal = legalMoves.some(([mr, mc]) => mr === ri && mc === ci);
      const isLast = isLastMoveSquare(ri, ci);
      const isChecked = checkedKing && checkedKing[0] === ri && checkedKing[1] === ci;

      const showFile = (flipped ? ri === 0 : ri === 7);
      const showRank = (flipped ? ci === 7 : ci === 0);

      return (
        <button
          key={`${ri}-${ci}`}
          onClick={() => handleClick(ri, ci)}
          className={`aspect-square relative flex items-center justify-center transition-colors duration-100
            ${isDark ? theme.dark : theme.light}
            ${isSelected ? theme.selected : ''}
            ${isLast && !isSelected ? theme.lastMove : ''}
            ${isChecked ? theme.check : ''}
          `}
        >
          {/* Coordinate labels */}
          {showRank && (
            <span className={`absolute top-0.5 left-0.5 text-[8px] font-medium leading-none pointer-events-none select-none
              ${isDark ? 'text-white/50' : 'text-black/35'}`}>
              {RANKS[ri]}
            </span>
          )}
          {showFile && (
            <span className={`absolute bottom-0.5 right-1 text-[8px] font-medium leading-none pointer-events-none select-none
              ${isDark ? 'text-white/50' : 'text-black/35'}`}>
              {FILES[ci]}
            </span>
          )}

          {/* Legal move dot */}
          {isLegal && !cell && (
            <div className="absolute w-[26%] h-[26%] rounded-full bg-black/20" />
          )}
          {/* Legal capture ring */}
          {isLegal && cell && (
            <div className="absolute inset-[4px] rounded-full ring-[3px] ring-black/20 ring-inset" />
          )}

          {/* Piece */}
          {cell && (
            <motion.span
              className={`relative z-10 select-none leading-none
                ${cell.color === 'w' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]' : 'text-gray-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.2)]'}`}
              style={{ fontSize: 'min(7.5vw, 32px)' }}
              initial={false}
              animate={{ scale: isSelected ? 1.12 : 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              {PIECE_SVG[cell.color][cell.type]}
            </motion.span>
          )}
        </button>
      );
    }));
  };

  // Material advantage calculation
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

  return (
    <div className="min-h-screen bg-background pb-28" dir={dir}>
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-4 py-3 max-w-sm mx-auto">
        <button onClick={() => navigate('/games')}
          className="w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center active:scale-90 transition-transform">
          <ArrowLeft className={`w-4 h-4 text-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>

        <h1 className="text-base font-semibold text-foreground tracking-tight">
          {t('games.chess')}
        </h1>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowThemeSelector(!showThemeSelector)}
            className="w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center active:scale-90 transition-transform">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => setShowStats(!showStats)}
            className="w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center active:scale-90 transition-transform">
            <Trophy className={`w-4 h-4 ${showStats ? 'text-primary' : 'text-muted-foreground'}`} />
          </button>
        </div>
      </div>

      {/* Theme Selector */}
      <AnimatePresence>
        {showThemeSelector && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden max-w-sm mx-auto px-4 mb-3"
          >
            <div className="bg-secondary/50 rounded-2xl p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {language === 'ar' ? 'نمط الرقعة' : 'Board Style'}
              </p>
              <div className="flex gap-2">
                {(Object.keys(BOARD_THEMES) as BoardTheme[]).map(key => (
                  <button key={key} onClick={() => handleThemeChange(key)}
                    className={`flex-1 rounded-xl p-1.5 transition-all ${boardTheme === key ? 'ring-2 ring-primary bg-background' : 'hover:bg-background/50'}`}>
                    <div className="grid grid-cols-2 rounded-md overflow-hidden aspect-square mb-1">
                      <div className={BOARD_THEMES[key].light} />
                      <div className={BOARD_THEMES[key].dark} />
                      <div className={BOARD_THEMES[key].dark} />
                      <div className={BOARD_THEMES[key].light} />
                    </div>
                    <p className="text-[9px] text-center text-foreground capitalize">{key}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden max-w-sm mx-auto px-4 mb-3">
            <div className="bg-secondary/50 rounded-2xl p-4">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: stats.gamesPlayed, l: language === 'ar' ? 'لُعبت' : 'Played' },
                  { v: stats.whiteWins, l: '♔ W' },
                  { v: stats.blackWins, l: '♚ W' },
                  { v: stats.stalemates, l: language === 'ar' ? 'تعادل' : 'Draw' },
                ].map((s, i) => (
                  <div key={i} className="text-center py-2">
                    <div className="text-lg font-bold text-foreground">{s.v}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player bar — Black */}
      <div className="max-w-[340px] mx-auto px-4 mb-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-900 border-2 border-border flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">B</span>
            </div>
            <span className="text-xs font-medium text-foreground">{language === 'ar' ? 'أسود' : 'Black'}</span>
            {blackAdv > 0 && <span className="text-[10px] text-muted-foreground">+{blackAdv}</span>}
          </div>
          <div className="flex gap-0.5 min-h-[18px]">
            {game.captured.b.map((p, i) => <span key={i} className="text-xs opacity-60">{p}</span>)}
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="max-w-[340px] mx-auto px-4 relative">
        {/* Start overlay */}
        <AnimatePresence>
          {!gameStarted && !gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 rounded-lg bg-card/90 backdrop-blur-sm flex items-center justify-center mx-4"
              onClick={() => { setGameStarted(true); setIsRunning(true); }}
            >
              <div className="flex flex-col items-center gap-3">
                <Play className="w-10 h-10 text-primary stroke-[1.5]" />
                <span className="text-muted-foreground font-medium text-sm">
                  {language === 'ar' ? 'اضغط للبدء' : 'Tap to start'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="rounded-lg overflow-hidden shadow-lg">
          <div className="grid grid-cols-8">
            {renderBoard()}
          </div>
        </div>
      </div>

      {/* Player bar — White */}
      <div className="max-w-[340px] mx-auto px-4 mt-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white border-2 border-border flex items-center justify-center">
              <span className="text-[10px] text-gray-900 font-bold">W</span>
            </div>
            <span className="text-xs font-medium text-foreground">{language === 'ar' ? 'أبيض' : 'White'}</span>
            {whiteAdv > 0 && <span className="text-[10px] text-muted-foreground">+{whiteAdv}</span>}
          </div>
          <div className="flex gap-0.5 min-h-[18px]">
            {game.captured.w.map((p, i) => <span key={i} className="text-xs opacity-60">{p}</span>)}
          </div>
        </div>
      </div>

      {/* Turn indicator & Timer */}
      <div className="max-w-sm mx-auto px-4 mt-4">
        <div className="flex items-center justify-center gap-3">
          <div className={`w-3 h-3 rounded-full ${game.turn === 'w' ? 'bg-white border border-border' : 'bg-gray-900'}`} />
          <span className="text-sm font-medium text-foreground">
            {game.turn === 'w' ? (language === 'ar' ? 'دور الأبيض' : "White's turn") : (language === 'ar' ? 'دور الأسود' : "Black's turn")}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-full tabular-nums">
            <Clock className="w-3 h-3" />{formatTimer(gameTimer)}
          </div>
        </div>

        {/* Status message */}
        {status && (
          <motion.div initial={{ y: -5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="text-center mt-2">
            <span className={`text-sm font-semibold ${gameOver ? 'text-primary' : 'text-destructive'}`}>
              {status}
            </span>
          </motion.div>
        )}
      </div>

      {/* Move log (last few moves) */}
      {moveLog.length > 0 && (
        <div className="max-w-sm mx-auto px-4 mt-3">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {moveLog.slice(-8).map((m, i) => {
              const actualIndex = moveLog.length - Math.min(moveLog.length, 8) + i;
              const moveNum = Math.floor(actualIndex / 2) + 1;
              const isWhite = actualIndex % 2 === 0;
              return (
                <span key={i} className="text-[11px] text-muted-foreground tabular-nums">
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
        <button onClick={undo} disabled={history.length === 0 || gameOver}
          className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl bg-secondary/70 text-foreground disabled:opacity-25 active:scale-90 transition-all">
          <Undo2 className="w-5 h-5" />
          <span className="text-[9px] font-medium">{language === 'ar' ? 'تراجع' : 'Undo'}</span>
        </button>

        <button onClick={() => setFlipped(!flipped)}
          className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl bg-secondary/70 text-foreground active:scale-90 transition-all">
          <RotateCcw className="w-5 h-5" />
          <span className="text-[9px] font-medium">{language === 'ar' ? 'قلب' : 'Flip'}</span>
        </button>

        {!gameOver && (
          <button onClick={resign}
            className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl bg-destructive/10 text-destructive active:scale-90 transition-all">
            <Flag className="w-5 h-5" />
            <span className="text-[9px] font-medium">{language === 'ar' ? 'استسلام' : 'Resign'}</span>
          </button>
        )}

        <button onClick={resetGame}
          className="flex flex-col items-center gap-1 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground active:scale-90 transition-all">
          <RotateCcw className="w-5 h-5" />
          <span className="text-[9px] font-medium">{t('chess.newGame')}</span>
        </button>
      </div>
    </div>
  );
}
