import React, { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion } from 'framer-motion';
import { Hexagon, RotateCcw, Trophy } from 'lucide-react';

const HEX_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];
const GRID_SIZE = 5;

function generateBoard() {
  const board: number[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    board.push([]);
    for (let c = 0; c < GRID_SIZE; c++) {
      board[r].push(Math.floor(Math.random() * 4));
    }
  }
  return board;
}

function floodFill(board: number[][], targetColor: number, newColor: number): number[][] {
  if (targetColor === newColor) return board;
  const newBoard = board.map(r => [...r]);
  const visited = new Set<string>();
  const queue: [number, number][] = [[0, 0]];
  visited.add('0,0');

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    newBoard[r][c] = newColor;
    const neighbors = [
      [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
      r % 2 === 0 ? [r - 1, c - 1] : [r - 1, c + 1],
      r % 2 === 0 ? [r + 1, c - 1] : [r + 1, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited.has(key)) {
        if (newBoard[nr][nc] === targetColor || newBoard[nr][nc] === newColor) {
          visited.add(key);
          queue.push([nr, nc]);
        }
      }
    }
  }
  return newBoard;
}

function isAllSame(board: number[][]) {
  const c = board[0][0];
  return board.every(row => row.every(cell => cell === c));
}

export default function HexGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [board, setBoard] = useState(generateBoard);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const maxMoves = 20;

  const pickColor = useCallback((colorIdx: number) => {
    if (won || moves >= maxMoves) return;
    if (colorIdx === board[0][0]) return;
    const newBoard = floodFill(board, board[0][0], colorIdx);
    setBoard(newBoard);
    setMoves(m => m + 1);
    if (isAllSame(newBoard)) {
      setWon(true);
      const stats = JSON.parse(localStorage.getItem('hex-stats') || '{}');
      stats.gamesWon = (stats.gamesWon || 0) + 1;
      stats.bestMoves = Math.min(stats.bestMoves || 999, moves + 1);
      localStorage.setItem('hex-stats', JSON.stringify(stats));
    }
  }, [board, moves, won]);

  const reset = () => { setBoard(generateBoard()); setMoves(0); setWon(false); };

  return (
    <div className="min-h-screen bg-background pb-28 pt-4">
      <div className="px-5">
        <BackButton to="/games" label={isAr ? 'الألعاب' : 'Spiele'} />
        <div className="flex items-center gap-3 mt-4 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Hexagon className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{isAr ? 'السداسي' : 'Hex'}</h1>
        </div>

        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">{isAr ? 'الحركات' : 'Züge'}: <span className="font-bold text-foreground">{moves}/{maxMoves}</span></p>
          <button onClick={reset} className="flex items-center gap-1.5 text-sm text-primary active:scale-95">
            <RotateCcw className="w-4 h-4" /> {isAr ? 'جديد' : 'Neu'}
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-3 text-center">
          {isAr ? 'اختر لوناً لملء الشبكة من الزاوية' : 'Wähle eine Farbe, um das Feld von der Ecke zu füllen'}
        </p>

        {/* Hex Grid */}
        <div className="flex flex-col items-center gap-1 mb-6">
          {board.map((row, r) => (
            <div key={r} className="flex gap-1" style={{ marginInlineStart: r % 2 === 1 ? 18 : 0 }}>
              {row.map((cell, c) => (
                <div
                  key={c}
                  className="w-14 h-12 rounded-lg transition-colors duration-200"
                  style={{ backgroundColor: HEX_COLORS[cell] }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Color picker */}
        <div className="flex justify-center gap-3 mb-4">
          {HEX_COLORS.slice(0, 4).map((color, i) => (
            <button
              key={i}
              onClick={() => pickColor(i)}
              disabled={won || moves >= maxMoves}
              className={`w-12 h-12 rounded-xl border-2 active:scale-90 transition-transform ${
                board[0][0] === i ? 'border-foreground ring-2 ring-foreground/20 scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {won && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-4">
            <Trophy className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{isAr ? '🎉 فزت!' : '🎉 Gewonnen!'}</p>
            <p className="text-sm text-muted-foreground">{isAr ? `في ${moves} حركة` : `In ${moves} Zügen`}</p>
          </motion.div>
        )}

        {!won && moves >= maxMoves && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4">
            <p className="text-lg font-bold text-foreground mb-2">{isAr ? 'انتهت الحركات!' : 'Keine Züge mehr!'}</p>
            <button onClick={reset} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold active:scale-95">
              {isAr ? 'حاول مجدداً' : 'Nochmal'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
