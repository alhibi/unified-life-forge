import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, RotateCcw, Trophy, Timer, Sparkles } from 'lucide-react';

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

// Tile color based on position correctness
function getTileStyle(value: number, index: number, won: boolean) {
  if (value === 0) return '';
  const correct = value === (index + 1) % TOTAL;
  if (won) return 'bg-gradient-to-br from-emerald-600/80 to-emerald-800/80 text-emerald-100 border-emerald-500/40 shadow-lg shadow-emerald-500/10';
  if (correct) return 'bg-gradient-to-br from-emerald-900/60 to-emerald-950/60 text-emerald-300 border-emerald-700/40';
  return 'bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-200 border-zinc-700/40 hover:border-emerald-600/40 hover:from-zinc-700 hover:to-zinc-800';
}

export default function PuzzleGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [board, setBoard] = useState<number[]>(shuffle);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal'>('normal');

  // Timer
  useEffect(() => {
    if (!started || won) return;
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [started, won]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Count correct tiles
  const correctCount = board.filter((v, i) => v !== 0 && v === (i + 1) % TOTAL).length;
  const progress = (correctCount / (TOTAL - 1)) * 100;

  const handleTap = useCallback((index: number) => {
    if (won) return;
    const blankIndex = board.indexOf(0);
    const row = Math.floor(index / SIZE), col = index % SIZE;
    const blankRow = Math.floor(blankIndex / SIZE), blankCol = blankIndex % SIZE;
    const isAdjacent = (Math.abs(row - blankRow) === 1 && col === blankCol) || (Math.abs(col - blankCol) === 1 && row === blankRow);
    if (!isAdjacent) return;

    if (!started) setStarted(true);

    const newBoard = [...board];
    [newBoard[index], newBoard[blankIndex]] = [newBoard[blankIndex], newBoard[index]];
    setBoard(newBoard);
    setMoves(m => m + 1);

    if (isSolved(newBoard)) {
      setWon(true);
      const stats = JSON.parse(localStorage.getItem('puzzle-stats') || '{}');
      stats.gamesWon = (stats.gamesWon || 0) + 1;
      stats.bestMoves = Math.min(stats.bestMoves || 9999, moves + 1);
      stats.bestTime = Math.min(stats.bestTime || 9999, seconds);
      localStorage.setItem('puzzle-stats', JSON.stringify(stats));
    }
  }, [board, won, moves, started, seconds]);

  const reset = () => {
    setBoard(shuffle()); setMoves(0); setWon(false);
    setSeconds(0); setStarted(false);
  };

  const stats = JSON.parse(localStorage.getItem('puzzle-stats') || '{}');

  return (
    <div className="min-h-screen pb-28 pt-4" style={{ background: 'linear-gradient(180deg, #0a0f0a 0%, #111a11 40%, #0a0f0a 100%)' }}>
      <div className="px-5">
        <BackButton to="/games" />

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-4 mb-5">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-500 mb-1">
            {isAr ? '🧩 الأحجية' : '🧩 Puzzle'}
          </h1>
          <p className="text-emerald-700/50 text-xs">{isAr ? 'رتّب الأرقام من 1 إلى 15' : 'Ordne die Zahlen von 1 bis 15'}</p>
        </motion.div>

        {/* Stats bar */}
        <div className="flex justify-between items-center mb-3 px-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-300 font-bold">{moves}</span>
              <span className="text-emerald-700 text-xs">{isAr ? 'حركة' : 'Züge'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Timer className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-400 font-mono text-xs">{formatTime(seconds)}</span>
            </div>
          </div>
          <button onClick={reset} className="flex items-center gap-1 text-sm text-emerald-500 active:scale-95">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-emerald-950 mb-5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #059669, #10b981, #34d399)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Board */}
        <div className="grid grid-cols-4 gap-2 max-w-[340px] mx-auto mb-6">
          {board.map((value, index) => (
            <motion.button
              key={`tile-${index}`}
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={() => handleTap(index)}
              whileTap={value !== 0 ? { scale: 0.88 } : {}}
              className={`aspect-square rounded-2xl flex items-center justify-center text-xl font-black border transition-all duration-150 ${getTileStyle(value, index, won)}`}
            >
              {value !== 0 && (
                <motion.span
                  key={`${value}-${index}`}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                >
                  {value}
                </motion.span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Hint: correct tiles */}
        {!won && started && (
          <p className="text-center text-emerald-700 text-xs mb-4">
            {isAr ? `✓ ${correctCount} من ${TOTAL - 1} في مكانها الصحيح` : `✓ ${correctCount} von ${TOTAL - 1} richtig platziert`}
          </p>
        )}

        {/* Win */}
        <AnimatePresence>
          {won && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="text-center mt-4 p-6 rounded-3xl border border-emerald-800/30"
              style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.15), rgba(16,185,129,0.05))' }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 5, -5, 0] }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-5xl mb-3"
              >
                🏆
              </motion.div>
              <p className="text-2xl font-black text-emerald-200 mb-2">{isAr ? 'رائع!' : 'Geschafft!'}</p>
              <div className="flex justify-center gap-6 text-sm mb-4">
                <div>
                  <p className="text-emerald-500 font-bold">{moves}</p>
                  <p className="text-emerald-800 text-[10px]">{isAr ? 'حركة' : 'Züge'}</p>
                </div>
                <div>
                  <p className="text-emerald-500 font-bold">{formatTime(seconds)}</p>
                  <p className="text-emerald-800 text-[10px]">{isAr ? 'الوقت' : 'Zeit'}</p>
                </div>
              </div>
              {stats.bestMoves && (
                <p className="text-emerald-700 text-[10px] mb-3">
                  {isAr ? `أفضل: ${stats.bestMoves} حركة • ${stats.bestTime ? formatTime(stats.bestTime) : ''}` : `Bester: ${stats.bestMoves} Züge`}
                </p>
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={reset}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl font-black mx-auto text-emerald-950"
                style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}
              >
                <RotateCcw className="w-5 h-5" /> {isAr ? 'مرة أخرى' : 'Nochmal'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
