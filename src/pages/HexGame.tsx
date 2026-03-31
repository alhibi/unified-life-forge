import React, { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion } from 'framer-motion';
import { Hexagon, RotateCcw, Trophy, Leaf } from 'lucide-react';

const GRID_SIZE = 5;
const PALETTE = [
  { bg: '#2d5016', label: '🌿' },
  { bg: '#1e3a5f', label: '💧' },
  { bg: '#8b4513', label: '🪵' },
  { bg: '#b8860b', label: '🌻' },
];

function generateBoard() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => Math.floor(Math.random() * PALETTE.length))
  );
}

function floodFill(board: number[][], targetColor: number, newColor: number): { board: number[][]; count: number } {
  if (targetColor === newColor) return { board, count: 0 };
  const newBoard = board.map(r => [...r]);
  const visited = new Set<string>();
  const queue: [number, number][] = [[0, 0]];
  visited.add('0,0');
  let count = 0;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    newBoard[r][c] = newColor;
    count++;
    const neighbors: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
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
  return { board: newBoard, count };
}

function countOwned(board: number[][]): number {
  const color = board[0][0];
  const visited = new Set<string>();
  const queue: [number, number][] = [[0, 0]];
  visited.add('0,0');
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]] as [number,number][]) {
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited.has(key) && board[nr][nc] === color) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return visited.size;
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
  const maxMoves = 22;

  const owned = countOwned(board);
  const total = GRID_SIZE * GRID_SIZE;
  const progress = (owned / total) * 100;

  const pickColor = useCallback((colorIdx: number) => {
    if (won || moves >= maxMoves) return;
    if (colorIdx === board[0][0]) return;
    const { board: newBoard } = floodFill(board, board[0][0], colorIdx);
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
    <div className="min-h-screen pb-28 pt-4" style={{ background: 'linear-gradient(180deg, #0f1a0a 0%, #1a2e0a 30%, #0f1a0a 100%)' }}>
      <div className="px-5">
        <BackButton to="/games" />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-4 mb-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Leaf className="w-5 h-5 text-green-500" />
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-500">
              {isAr ? 'السداسي' : 'Hex'}
            </h1>
            <Leaf className="w-5 h-5 text-green-500 scale-x-[-1]" />
          </div>
          <p className="text-green-700/50 text-xs">{isAr ? 'لوّن الأرض بلون واحد' : 'Färbe das Land in einer Farbe'}</p>
        </motion.div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="flex-1 h-2 rounded-full bg-green-950 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #22c55e, #10b981)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs text-green-500 font-bold w-10 text-end">{Math.round(progress)}%</span>
        </div>

        <div className="flex justify-between items-center mb-4 px-1">
          <span className="text-sm text-green-600 font-semibold">{moves}/{maxMoves}</span>
          <button onClick={reset} className="flex items-center gap-1 text-sm text-green-500 active:scale-95">
            <RotateCcw className="w-4 h-4" /> {isAr ? 'جديد' : 'Neu'}
          </button>
        </div>

        {/* Grid */}
        <div className="flex flex-col items-center gap-1.5 mb-8">
          {board.map((row, r) => (
            <div key={r} className="flex gap-1.5">
              {row.map((cell, c) => {
                const isOwned = (() => {
                  // Quick check: is this cell part of the owned region?
                  const targetColor = board[0][0];
                  if (cell !== targetColor) return false;
                  // Simple BFS from 0,0
                  const visited = new Set<string>();
                  const queue: [number, number][] = [[0, 0]];
                  visited.add('0,0');
                  while (queue.length > 0) {
                    const [qr, qc] = queue.shift()!;
                    if (qr === r && qc === c) return true;
                    for (const [nr, nc] of [[qr-1,qc],[qr+1,qc],[qr,qc-1],[qr,qc+1]] as [number,number][]) {
                      const key = `${nr},${nc}`;
                      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited.has(key) && board[nr][nc] === targetColor) {
                        visited.add(key);
                        queue.push([nr, nc]);
                      }
                    }
                  }
                  return false;
                })();

                return (
                  <motion.div
                    key={c}
                    layout
                    className="w-14 h-12 rounded-xl transition-colors duration-300 border"
                    style={{
                      backgroundColor: PALETTE[cell].bg,
                      borderColor: isOwned ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.05)',
                      boxShadow: isOwned ? `0 0 12px ${PALETTE[cell].bg}60` : 'none',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Color picker */}
        <div className="flex justify-center gap-4 mb-4">
          {PALETTE.map((p, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.85 }}
              onClick={() => pickColor(i)}
              disabled={won || moves >= maxMoves}
              className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-xl transition-all ${
                board[0][0] === i ? 'border-green-400 ring-2 ring-green-400/30 scale-110' : 'border-transparent opacity-80'
              }`}
              style={{ backgroundColor: p.bg }}
            >
              {p.label}
            </motion.button>
          ))}
        </div>

        {won && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center mt-6">
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 0.6, repeat: 3 }} className="text-5xl mb-3">🌿</motion.div>
            <p className="text-2xl font-black text-green-300">{isAr ? 'الأرض لك!' : 'Das Land gehört dir!'}</p>
            <p className="text-green-600 text-sm">{isAr ? `في ${moves} خطوة` : `In ${moves} Schritten`}</p>
          </motion.div>
        )}

        {!won && moves >= maxMoves && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-6">
            <p className="text-xl font-bold text-red-400 mb-3">{isAr ? 'انتهت الخطوات!' : 'Keine Züge mehr!'}</p>
            <motion.button whileTap={{ scale: 0.9 }} onClick={reset} className="px-8 py-3 rounded-xl bg-green-600 text-white font-bold">
              {isAr ? 'حاول مجدداً' : 'Nochmal'}
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
