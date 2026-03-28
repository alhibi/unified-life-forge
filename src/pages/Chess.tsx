import React, { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const backRow: PieceType[] = ['R','N','B','Q','K','B','N','R'];
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
  const piece = board[r][c]; if (!piece) return [];
  const moves: [number, number][] = [];
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
      const dir = color === 'w' ? -1 : 1; const startRow = color === 'w' ? 6 : 1;
      if (inBounds(r+dir, c) && !board[r+dir][c]) { moves.push([r+dir, c]); if (r === startRow && !board[r+2*dir][c]) moves.push([r+2*dir, c]); }
      for (const dc of [-1,1]) if (inBounds(r+dir, c+dc) && board[r+dir][c+dc]?.color === enemy) moves.push([r+dir, c+dc]);
      break;
    }
    case 'N': for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) { const nr=r+dr,nc=c+dc; if(inBounds(nr,nc)&&board[nr][nc]?.color!==color) moves.push([nr,nc]); } break;
    case 'B': for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) addSlide(dr,dc); break;
    case 'R': for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) addSlide(dr,dc); break;
    case 'Q': for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) addSlide(dr,dc); break;
    case 'K': for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) { const nr=r+dr,nc=c+dc; if(inBounds(nr,nc)&&board[nr][nc]?.color!==color) moves.push([nr,nc]); } break;
  }
  return moves;
}

function findKing(board: BoardState, color: Color): [number, number] {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c]?.type === 'K' && board[r][c]?.color === color) return [r, c];
  return [0, 0];
}

function isInCheck(board: BoardState, color: Color): boolean {
  const [kr, kc] = findKing(board, color); const enemy = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (board[r][c]?.color === enemy && getRawMoves(board, r, c).some(([mr, mc]) => mr === kr && mc === kc)) return true;
  return false;
}

function getLegalMoves(board: BoardState, r: number, c: number): [number, number][] {
  const piece = board[r][c]; if (!piece) return [];
  return getRawMoves(board, r, c).filter(([tr, tc]) => {
    const nb = board.map(row => [...row]); nb[tr][tc] = nb[r][c]; nb[r][c] = null;
    return !isInCheck(nb, piece.color);
  });
}

function hasAnyLegalMoves(board: BoardState, color: Color): boolean {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (board[r][c]?.color === color && getLegalMoves(board, r, c).length > 0) return true;
  return false;
}

export default function ChessPage() {
  const { t, dir } = useApp();
  const navigate = useNavigate();
  const [board, setBoard] = useState<BoardState>(initBoard);
  const [turn, setTurn] = useState<Color>('w');
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<[number, number][]>([]);
  const [captured, setCaptured] = useState<{ w: string[]; b: string[] }>({ w: [], b: [] });
  const [status, setStatus] = useState('');

  const handleClick = useCallback((r: number, c: number) => {
    if (status.includes('♚') || status.includes('♔')) return;
    const piece = board[r][c];
    if (selected) {
      const [sr, sc] = selected;
      if (legalMoves.some(([mr, mc]) => mr === r && mc === c)) {
        const nb = board.map(row => [...row]);
        const cp = nb[r][c];
        nb[r][c] = nb[sr][sc];
        if (nb[r][c]?.type === 'P' && (r === 0 || r === 7)) nb[r][c] = { type: 'Q', color: nb[r][c]!.color };
        nb[sr][sc] = null;
        if (cp) setCaptured(prev => ({ ...prev, [turn]: [...prev[turn], PIECE_SYMBOLS[cp.color][cp.type]] }));
        setBoard(nb);
        const next = turn === 'w' ? 'b' : 'w';
        const check = isInCheck(nb, next); const legal = hasAnyLegalMoves(nb, next);
        if (!legal) setStatus(check ? `${t('chess.checkmate')} ${turn === 'w' ? '♔' : '♚'}` : 'Stalemate!');
        else if (check) setStatus(t('chess.check'));
        else setStatus('');
        setTurn(next); setSelected(null); setLegalMoves([]); return;
      }
      if (piece?.color === turn) { setSelected([r, c]); setLegalMoves(getLegalMoves(board, r, c)); return; }
      setSelected(null); setLegalMoves([]); return;
    }
    if (piece?.color === turn) { setSelected([r, c]); setLegalMoves(getLegalMoves(board, r, c)); }
  }, [board, selected, legalMoves, turn, status, t]);

  const resetGame = () => {
    setBoard(initBoard()); setTurn('w'); setSelected(null); setLegalMoves([]);
    setCaptured({ w: [], b: [] }); setStatus('');
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6">
      <div className="flex items-center gap-3 mb-5 max-w-sm mx-auto">
        <button onClick={() => navigate('/games')} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className={`w-4 h-4 text-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-xl font-bold text-foreground flex-1">{t('games.chess')}</h1>
        <button onClick={resetGame} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-foreground" />
        </button>
      </div>

      <div className="text-center mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          {t('chess.turn')}: {turn === 'w' ? `${t('chess.white')} ♔` : `${t('chess.black')} ♚`}
        </span>
        {status && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-primary font-bold text-lg mt-1">{status}</motion.div>
        )}
      </div>

      <div className="flex justify-center gap-1 mb-2 min-h-[24px]">
        {captured.w.map((p, i) => <span key={i} className="text-lg">{p}</span>)}
      </div>

      <div className="max-w-[340px] mx-auto mb-2">
        <div className="premium-card-intense p-1.5">
          <div className="grid grid-cols-8 rounded-lg overflow-hidden">
            {board.map((row, ri) => row.map((cell, ci) => {
              const isDark = (ri + ci) % 2 === 1;
              const isSelected = selected?.[0] === ri && selected?.[1] === ci;
              const isLegal = legalMoves.some(([mr, mc]) => mr === ri && mc === ci);
              return (
                <button key={`${ri}-${ci}`} onClick={() => handleClick(ri, ci)}
                  className={`aspect-square flex items-center justify-center text-[26px] relative transition-all
                    ${isDark ? 'bg-primary/12' : 'bg-card'}
                    ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/25' : ''}
                  `}
                >
                  {isLegal && !cell && <div className="absolute w-2.5 h-2.5 rounded-full bg-primary/35" />}
                  {isLegal && cell && <div className="absolute inset-0 ring-2 ring-primary/40 ring-inset" />}
                  {cell && <span className="relative z-10">{PIECE_SYMBOLS[cell.color][cell.type]}</span>}
                </button>
              );
            }))}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-1 mt-2 min-h-[24px]">
        {captured.b.map((p, i) => <span key={i} className="text-lg">{p}</span>)}
      </div>

      <div className="flex justify-center mt-5">
        <button onClick={resetGame} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm active:scale-95 transition-transform">
          <RefreshCw className="w-4 h-4" />{t('chess.newGame')}
        </button>
      </div>
    </div>
  );
}
