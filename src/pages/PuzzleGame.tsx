import React, { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, RotateCcw, Trophy, Sparkles } from 'lucide-react';

const SIZE = 4;
const TOTAL = SIZE * SIZE;

function createSolvedBoard() { return Array.from({ length: TOTAL }, (_, i) => (i + 1) % TOTAL); }

function isSolvable(board: number[]) {
  let inversions = 0;
  const filtered = board.filter(n => n !== 0);
  for (let i = 0; i < filtered.length; i++)
    for (let j = i + 1; j < filtered.length; j++)
      if (filtered[i] > filtered[j]) inversions++;
  const blankRow = Math.floor(board.indexOf(0) / SIZE);
  return (inversions + blankRow) % 2 === 1;
}

function isSolved(board: number[]) { return board.every((v, i) => v === (i + 1) % TOTAL); }

function shuffle(): number[] {
  let board: number[];
  do { board = createSolvedBoard().sort(() => Math.random() - 0.5); } while (!isSolvable(board) || isSolved(board));
  return board;
}

// Soft zen palette
const ZEN_COLORS = [
  'from-teal-100 to-cyan-50', 'from-sky-100 to-blue-50', 'from-violet-100 to-purple-50',
  'from-rose-100 to-pink-50', 'from-amber-100 to-yellow-50', 'from-emerald-100 to-green-50',
];

export default function PuzzleGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [board, setBoard] = useState<number[]>(shuffle);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [lastMoved, setLastMoved] = useState<number | null>(null);

  const handleTap = useCallback((index: number) => {
    if (won) return;
    const blankIndex = board.indexOf(0);
    const row = Math.floor(index / SIZE), col = index % SIZE;
    const blankRow = Math.floor(blankIndex / SIZE), blankCol = blankIndex % SIZE;
    const isAdjacent = (Math.abs(row - blankRow) === 1 && col === blankCol) || (Math.abs(col - blankCol) === 1 && row === blankRow);
    if (!isAdjacent) return;

    const newBoard = [...board];
    [newBoard[index], newBoard[blankIndex]] = [newBoard[blankIndex], newBoard[index]];
    setBoard(newBoard);
    setMoves(m => m + 1);
    setLastMoved(index);

    if (isSolved(newBoard)) {
      setWon(true);
      const stats = JSON.parse(localStorage.getItem('puzzle-stats') || '{}');
      stats.gamesWon = (stats.gamesWon || 0) + 1;
      stats.bestMoves = Math.min(stats.bestMoves || 9999, moves + 1);
      localStorage.setItem('puzzle-stats', JSON.stringify(stats));
    }
  }, [board, won, moves]);

  const reset = () => { setBoard(shuffle()); setMoves(0); setWon(false); setLastMoved(null); };

  // Check if a tile is in its correct position
  const isCorrect = (index: number, value: number) => value !== 0 && value === (index + 1) % TOTAL;

  return (
    <div className="min-h-screen pb-28 pt-4" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 30%, #f0f9ff 100%)' }}>
      <div className="px-5">
        <BackButton to="/games" />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-4 mb-6">
          <h1 className="text-3xl font-black text-emerald-800 mb-1">
            {isAr ? '🧩 الأحجية' : '🧩 Puzzle'}
          </h1>
          <p className="text-emerald-600/50 text-xs">{isAr ? 'رتّب الأرقام بهدوء' : 'Ordne die Zahlen in Ruhe'}</p>
        </motion.div>

        {/* Stats bar */}
        <div className="flex justify-between items-center mb-5 px-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-700 font-semibold">{moves} {isAr ? 'حركة' : 'Züge'}</span>
          </div>
          <button onClick={reset} className="flex items-center gap-1 text-sm text-emerald-500 active:scale-95">
            <RotateCcw className="w-4 h-4" /> {isAr ? 'جديد' : 'Neu'}
          </button>
        </div>

        {/* Board */}
        <div className="grid grid-cols-4 gap-2 max-w-[330px] mx-auto">
          {board.map((value, index) => {
            const correct = isCorrect(index, value);
            return (
              <motion.button
                key={`${index}-${value}`}
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onClick={() => handleTap(index)}
                whileTap={value !== 0 ? { scale: 0.9 } : {}}
                className={`aspect-square rounded-2xl flex items-center justify-center text-xl font-black transition-all duration-200 ${
                  value === 0
                    ? ''
                    : won
                      ? 'bg-gradient-to-br from-emerald-200 to-teal-100 text-emerald-700 shadow-md shadow-emerald-200/50 border border-emerald-300/50'
                      : correct
                        ? 'bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-600 shadow-sm border border-emerald-200/50'
                        : 'bg-white text-slate-700 shadow-sm border border-slate-200/60 hover:shadow-md hover:border-emerald-300/50'
                }`}
              >
                {value !== 0 && value}
              </motion.button>
            );
          })}
        </div>

        {/* Win */}
        <AnimatePresence>
          {won && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-10"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-5xl mb-3"
              >
                🌸
              </motion.div>
              <p className="text-2xl font-black text-emerald-700 mb-1">{isAr ? 'رائع!' : 'Wunderbar!'}</p>
              <p className="text-emerald-500 text-sm">{isAr ? `${moves} حركة فقط` : `Nur ${moves} Züge`}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
