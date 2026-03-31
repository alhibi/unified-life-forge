import React, { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion } from 'framer-motion';
import { Puzzle, RotateCcw, Trophy } from 'lucide-react';

const SIZE = 4;
const TOTAL = SIZE * SIZE;

function createSolvedBoard() {
  return Array.from({ length: TOTAL }, (_, i) => (i + 1) % TOTAL);
}

function isSolvable(board: number[]) {
  let inversions = 0;
  const filtered = board.filter(n => n !== 0);
  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      if (filtered[i] > filtered[j]) inversions++;
    }
  }
  const blankRow = Math.floor(board.indexOf(0) / SIZE);
  if (SIZE % 2 === 0) return (inversions + blankRow) % 2 === 1;
  return inversions % 2 === 0;
}

function shuffle(): number[] {
  let board: number[];
  do {
    board = createSolvedBoard().sort(() => Math.random() - 0.5);
  } while (!isSolvable(board) || isSolved(board));
  return board;
}

function isSolved(board: number[]) {
  return board.every((v, i) => v === (i + 1) % TOTAL);
}

export default function PuzzleGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [board, setBoard] = useState<number[]>(shuffle);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const handleTap = useCallback((index: number) => {
    if (won) return;
    const blankIndex = board.indexOf(0);
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    const blankRow = Math.floor(blankIndex / SIZE);
    const blankCol = blankIndex % SIZE;

    const isAdjacent =
      (Math.abs(row - blankRow) === 1 && col === blankCol) ||
      (Math.abs(col - blankCol) === 1 && row === blankRow);

    if (!isAdjacent) return;

    const newBoard = [...board];
    [newBoard[index], newBoard[blankIndex]] = [newBoard[blankIndex], newBoard[index]];
    setBoard(newBoard);
    setMoves(m => m + 1);

    if (isSolved(newBoard)) {
      setWon(true);
      const stats = JSON.parse(localStorage.getItem('puzzle-stats') || '{}');
      stats.gamesWon = (stats.gamesWon || 0) + 1;
      stats.bestMoves = Math.min(stats.bestMoves || 9999, moves + 1);
      localStorage.setItem('puzzle-stats', JSON.stringify(stats));
    }
  }, [board, won, moves]);

  const reset = () => {
    setBoard(shuffle());
    setMoves(0);
    setWon(false);
  };

  return (
    <div className="min-h-screen bg-background pb-28 pt-4">
      <div className="px-5">
        <BackButton to="/games" />
        <div className="flex items-center gap-3 mt-4 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Puzzle className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{isAr ? 'الأحجية' : 'Puzzle'}</h1>
        </div>

        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">{isAr ? 'الحركات' : 'Züge'}: <span className="font-bold text-foreground">{moves}</span></p>
          <button onClick={reset} className="flex items-center gap-1.5 text-sm text-primary active:scale-95 transition-transform">
            <RotateCcw className="w-4 h-4" /> {isAr ? 'جديد' : 'Neu'}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5 max-w-[340px] mx-auto">
          {board.map((value, index) => (
            <motion.button
              key={index}
              layout
              onClick={() => handleTap(index)}
              whileTap={{ scale: 0.92 }}
              className={`aspect-square rounded-xl flex items-center justify-center text-xl font-bold transition-colors ${
                value === 0
                  ? 'bg-transparent'
                  : won
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-card border border-border/40 text-foreground active:bg-primary/10'
              }`}
            >
              {value !== 0 && value}
            </motion.button>
          ))}
        </div>

        {won && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-8"
          >
            <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
            <p className="text-xl font-bold text-foreground mb-1">{isAr ? '🎉 أحسنت!' : '🎉 Geschafft!'}</p>
            <p className="text-sm text-muted-foreground">{isAr ? `في ${moves} حركة` : `In ${moves} Zügen`}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
