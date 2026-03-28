import React, { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';

type Color = 'w' | 'b';
type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
type Piece = { type: PieceType; color: Color } | null;
type BoardState = Piece[][];

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

function inBounds(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function getRawMoves(board: BoardState, r: number, c: number): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: [number, number][] = [];
  const { type, color } = piece;
  const enemy = color === 'w' ? 'b' : 'w';

  const addSlide = (dr: number, dc: number) => {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (board[nr][nc]) {
        if (board[nr][nc]!.color === enemy) moves.push([nr, nc]);
        break;
      }
      moves.push([nr, nc]);
      nr += dr; nc += dc;
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
        if (inBounds(r + dir, c + dc) && board[r + dir][c + dc]?.color === enemy) {
          moves.push([r + dir, c + dc]);
        }
      }
      break;
    }
    case 'N':
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc]?.color !== color) moves.push([nr, nc]);
      }
      break;
    case 'B': for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) addSlide(dr, dc); break;
    case 'R': for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) addSlide(dr, dc); break;
    case 'Q':
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) addSlide(dr, dc);
      break;
    case 'K':
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc]?.color !== color) moves.push([nr, nc]);
      }
      break;
  }
  return moves;
}

function findKing(board: BoardState, color: Color): [number, number] {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === 'K' && board[r][c]?.color === color) return [r, c];
  return [0, 0];
}

function isInCheck(board: BoardState, color: Color): boolean {
  const [kr, kc] = findKing(board, color);
  const enemy = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === enemy) {
        if (getRawMoves(board, r, c).some(([mr, mc]) => mr === kr && mc === kc)) return true;
      }
  return false;
}

function getLegalMoves(board: BoardState, r: number, c: number): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  return getRawMoves(board, r, c).filter(([tr, tc]) => {
    const nb = board.map(row => [...row]);
    nb[tr][tc] = nb[r][c];
    nb[r][c] = null;
    return !isInCheck(nb, piece.color);
  });
}

function hasAnyLegalMoves(board: BoardState, color: Color): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === color && getLegalMoves(board, r, c).length > 0) return true;
  return false;
}

export default function ChessPage() {
  const { t } = useApp();
  const navigate = useNavigate();
  const [board, setBoard] = useState<BoardState>(initBoard);
  const [turn, setTurn] = useState<Color>('w');
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<[number, number][]>([]);
  const [captured, setCaptured] = useState<{ w: string[]; b: string[] }>({ w: [], b: [] });
  const [status, setStatus] = useState<string>('');

  const handleClick = useCallback((r: number, c: number) => {
    if (status.includes('♚') || status.includes('♔')) return; // game over

    const piece = board[r][c];

    if (selected) {
      const [sr, sc] = selected;
      const isLegal = legalMoves.some(([mr, mc]) => mr === r && mc === c);

      if (isLegal) {
        const newBoard = board.map(row => [...row]);
        const captured_piece = newBoard[r][c];
        newBoard[r][c] = newBoard[sr][sc];
        // Pawn promotion
        if (newBoard[r][c]?.type === 'P' && (r === 0 || r === 7)) {
          newBoard[r][c] = { type: 'Q', color: newBoard[r][c]!.color };
        }
        newBoard[sr][sc] = null;

        if (captured_piece) {
          setCaptured(prev => ({
            ...prev,
            [turn]: [...prev[turn], PIECE_SYMBOLS[captured_piece.color][captured_piece.type]],
          }));
        }

        setBoard(newBoard);
        const nextTurn = turn === 'w' ? 'b' : 'w';

        const inCheck = isInCheck(newBoard, nextTurn);
        const hasLegal = hasAnyLegalMoves(newBoard, nextTurn);

        if (!hasLegal) {
          if (inCheck) {
            setStatus(`${t('chess.checkmate')} ${turn === 'w' ? '♔' : '♚'}`);
          } else {
            setStatus('Stalemate!');
          }
        } else if (inCheck) {
          setStatus(t('chess.check'));
        } else {
          setStatus('');
        }

        setTurn(nextTurn);
        setSelected(null);
        setLegalMoves([]);
        return;
      }

      // Select different own piece
      if (piece?.color === turn) {
        setSelected([r, c]);
        setLegalMoves(getLegalMoves(board, r, c));
        return;
      }

      setSelected(null);
      setLegalMoves([]);
      return;
    }

    // First selection
    if (piece?.color === turn) {
      setSelected([r, c]);
      setLegalMoves(getLegalMoves(board, r, c));
    }
  }, [board, selected, legalMoves, turn, status, t]);

  const resetGame = () => {
    setBoard(initBoard());
    setTurn('w');
    setSelected(null);
    setLegalMoves([]);
    setCaptured({ w: [], b: [] });
    setStatus('');
  };

  const isLegalTarget = (r: number, c: number) => legalMoves.some(([mr, mc]) => mr === r && mc === c);

  return (
    <div className="min-h-screen bg-background pb-24 px-3 pt-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/games')} className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-display font-bold text-foreground flex-1">{t('games.chess')}</h1>
        <button onClick={resetGame} className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
          <RefreshCw className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Turn & Status */}
      <div className="text-center mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          {t('chess.turn')}: {turn === 'w' ? `${t('chess.white')} ♔` : `${t('chess.black')} ♚`}
        </span>
        {status && (
          <div className="text-primary font-bold text-lg animate-scale-in mt-1">{status}</div>
        )}
      </div>

      {/* Captured pieces - black */}
      <div className="flex justify-center gap-1 mb-2 min-h-[24px]">
        {captured.w.map((p, i) => <span key={i} className="text-lg">{p}</span>)}
      </div>

      {/* Board */}
      <div className="max-w-sm mx-auto mb-2">
        <div className="glass-card-elevated p-1.5 rounded-xl">
          <div className="grid grid-cols-8">
            {board.map((row, ri) =>
              row.map((cell, ci) => {
                const isDark = (ri + ci) % 2 === 1;
                const isSelected = selected?.[0] === ri && selected?.[1] === ci;
                const isLegal = isLegalTarget(ri, ci);

                return (
                  <button
                    key={`${ri}-${ci}`}
                    onClick={() => handleClick(ri, ci)}
                    className={`
                      aspect-square flex items-center justify-center text-2xl sm:text-3xl relative transition-all
                      ${isDark ? 'bg-primary/20' : 'bg-secondary/50'}
                      ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/30' : ''}
                      ${cell?.color === turn && !isSelected ? 'cursor-pointer' : ''}
                    `}
                  >
                    {isLegal && !cell && (
                      <div className="absolute w-3 h-3 rounded-full bg-primary/40" />
                    )}
                    {isLegal && cell && (
                      <div className="absolute inset-0 ring-2 ring-primary/50 ring-inset rounded-sm" />
                    )}
                    {cell && (
                      <span className={`relative z-10 drop-shadow-sm ${cell.color === 'w' ? '' : ''}`}>
                        {PIECE_SYMBOLS[cell.color][cell.type]}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Captured pieces - white */}
      <div className="flex justify-center gap-1 mt-2 min-h-[24px]">
        {captured.b.map((p, i) => <span key={i} className="text-lg">{p}</span>)}
      </div>

      <div className="flex justify-center mt-4">
        <button onClick={resetGame} className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium text-sm">
          <RefreshCw className="w-4 h-4 inline-block me-1" /> {t('chess.newGame')}
        </button>
      </div>
    </div>
  );
}
