import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, RotateCcw, Timer, Sparkles } from 'lucide-react';

function createSolvedBoard(size: number) { return Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size)); }

function isSolvable(board: number[], size: number) {
  let inversions = 0;
  const filtered = board.filter(n => n !== 0);
  for (let i = 0; i < filtered.length; i++) for (let j = i + 1; j < filtered.length; j++) if (filtered[i] > filtered[j]) inversions++;
  const blankRow = Math.floor(board.indexOf(0) / size);
  if (size % 2 === 0) return (inversions + blankRow) % 2 === 1;
  return inversions % 2 === 0;
}

function isSolved(board: number[], size: number) { return board.every((v, i) => v === (i + 1) % (size * size)); }

function shuffle(size: number): number[] {
  let board: number[];
  do { board = createSolvedBoard(size).sort(() => Math.random() - 0.5); } while (!isSolvable(board, size) || isSolved(board, size));
  return board;
}

export default function PuzzleGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [gridSize, setGridSize] = useState('4');
  const SIZE = parseInt(gridSize);
  const TOTAL = SIZE * SIZE;

  const [board, setBoard] = useState<number[]>(() => shuffle(SIZE));
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => { if (!started || won) return; const i = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(i); }, [started, won]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const correctCount = board.filter((v, i) => v !== 0 && v === (i + 1) % TOTAL).length;
  const progress = (correctCount / (TOTAL - 1)) * 100;
  const savedStats = JSON.parse(localStorage.getItem('puzzle-stats') || '{}');

  const handleTap = useCallback((index: number) => {
    if (won) return;
    const blankIndex = board.indexOf(0);
    const row = Math.floor(index / SIZE), col = index % SIZE;
    const blankRow = Math.floor(blankIndex / SIZE), blankCol = blankIndex % SIZE;
    if (!((Math.abs(row - blankRow) === 1 && col === blankCol) || (Math.abs(col - blankCol) === 1 && row === blankRow))) return;
    if (!started) setStarted(true);
    const newBoard = [...board];
    [newBoard[index], newBoard[blankIndex]] = [newBoard[blankIndex], newBoard[index]];
    setBoard(newBoard); setMoves(m => m + 1);
    if (isSolved(newBoard, SIZE)) {
      setWon(true);
      const stats = { ...savedStats, gamesWon: (savedStats.gamesWon || 0) + 1, bestMoves: Math.min(savedStats.bestMoves || 9999, moves + 1), bestTime: Math.min(savedStats.bestTime || 9999, seconds) };
      localStorage.setItem('puzzle-stats', JSON.stringify(stats));
    }
  }, [board, won, moves, started, seconds, SIZE, TOTAL, savedStats]);

  const reset = (newSize?: number) => {
    const s = newSize || SIZE;
    setBoard(shuffle(s)); setMoves(0); setWon(false); setSeconds(0); setStarted(false);
  };

  const isCorrect = (index: number, value: number) => value !== 0 && value === (index + 1) % TOTAL;

  const rules = isAr
    ? ['اضغط على رقم مجاور للفراغ لتحريكه', 'رتّب الأرقام بالترتيب من 1 إلى ' + (TOTAL - 1), 'الأرقام الخضراء في مكانها الصحيح', 'حاول بأقل عدد حركات وأسرع وقت']
    : ['Tippe auf eine Zahl neben der Lücke', `Ordne 1 bis ${TOTAL - 1} der Reihe nach`, 'Grüne Zahlen sind richtig platziert', 'Versuche mit wenigen Zügen und schnell'];

  const stats = [
    { label: isAr ? 'انتصارات' : 'Siege', value: savedStats.gamesWon || 0 },
    { label: isAr ? 'أفضل حركات' : 'Beste Züge', value: savedStats.bestMoves || '-' },
    { label: isAr ? 'أفضل وقت' : 'Bestzeit', value: savedStats.bestTime ? formatTime(savedStats.bestTime) : '-' },
  ];

  const options = [{
    key: 'size', label: isAr ? 'حجم الشبكة' : 'Gittergröße',
    choices: [{ value: '3', label: '3×3' }, { value: '4', label: '4×4' }, { value: '5', label: '5×5' }],
    current: gridSize, onChange: (v: string) => { setGridSize(v); reset(parseInt(v)); },
  }];

  return (
    <GameShell title={isAr ? 'الأحجية' : 'Puzzle'} icon={Puzzle} accentColor="#10b981" rules={rules} stats={stats} options={options}
      headerRight={
        <button onClick={() => reset()} className="text-emerald-500 active:scale-90 transition-transform"><RotateCcw className="w-4 h-4" /></button>
      }
    >
      {/* Stats bar */}
      <div className="flex justify-between items-center mb-2 px-1">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-emerald-500" /><span className="text-emerald-300 font-bold">{moves}</span></span>
          <span className="flex items-center gap-1"><Timer className="w-3 h-3 text-emerald-600" /><span className="text-emerald-400 font-mono text-xs">{formatTime(seconds)}</span></span>
        </div>
        <span className="text-emerald-700 text-[10px]">{correctCount}/{TOTAL - 1}</span>
      </div>

      <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ background: 'rgba(16,185,129,0.1)' }}>
        <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #059669, #34d399)' }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Board */}
      <div className={`grid gap-1.5 max-w-[340px] mx-auto mb-4`} style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
        {board.map((value, index) => (
          <motion.button key={`t-${index}`} layout transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={() => handleTap(index)} whileTap={value !== 0 ? { scale: 0.88 } : {}}
            className={`aspect-square rounded-xl flex items-center justify-center font-black border transition-all ${SIZE >= 5 ? 'text-sm' : 'text-lg'} ${
              value === 0 ? '' : won
                ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/30'
                : isCorrect(index, value)
                  ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/30'
                  : 'bg-zinc-800/80 text-zinc-200 border-zinc-700/30 hover:border-emerald-600/30'
            }`}>
            {value !== 0 && value}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {won && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-4 p-5 rounded-2xl border border-emerald-800/20" style={{ background: 'rgba(5,150,105,0.08)' }}>
            <p className="text-4xl mb-2">🏆</p>
            <p className="text-xl font-black text-emerald-200 mb-1">{isAr ? 'رائع!' : 'Geschafft!'}</p>
            <p className="text-emerald-600 text-xs mb-4">{moves} {isAr ? 'حركة' : 'Züge'} • {formatTime(seconds)}</p>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => reset()}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl font-black mx-auto text-emerald-950"
              style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}>
              <RotateCcw className="w-4 h-4" /> {isAr ? 'مرة أخرى' : 'Nochmal'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}
