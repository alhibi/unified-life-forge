import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Lightbulb, Clock, Eraser, PenLine, Trophy, Undo2, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Board = (number | null)[][];
type Difficulty = 'easy' | 'medium' | 'hard';

interface SudokuStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: Record<Difficulty, number | null>;
  averageTime: Record<Difficulty, { total: number; count: number }>;
  currentStreak: number;
  bestStreak: number;
}

function loadStats(): SudokuStats {
  const saved = localStorage.getItem('sudoku-stats');
  if (saved) {
    const s = JSON.parse(saved);
    if (!s.averageTime) s.averageTime = { easy: { total: 0, count: 0 }, medium: { total: 0, count: 0 }, hard: { total: 0, count: 0 } };
    return s;
  }
  return {
    gamesPlayed: 0, gamesWon: 0,
    bestTime: { easy: null, medium: null, hard: null },
    averageTime: { easy: { total: 0, count: 0 }, medium: { total: 0, count: 0 }, hard: { total: 0, count: 0 } },
    currentStreak: 0, bestStreak: 0,
  };
}
function saveStats(stats: SudokuStats) { localStorage.setItem('sudoku-stats', JSON.stringify(stats)); }

function generateSolvedBoard(): number[][] {
  const board: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  function isValid(b: number[][], r: number, c: number, n: number) {
    for (let i = 0; i < 9; i++) if (b[r][i] === n || b[i][c] === n) return false;
    const sr = Math.floor(r / 3) * 3, sc = Math.floor(c / 3) * 3;
    for (let i = sr; i < sr + 3; i++) for (let j = sc; j < sc + 3; j++) if (b[i][j] === n) return false;
    return true;
  }
  function solve(b: number[][]): boolean {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const n of nums) { if (isValid(b, r, c, n)) { b[r][c] = n; if (solve(b)) return true; b[r][c] = 0; } }
        return false;
      }
    }
    return true;
  }
  solve(board);
  return board;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function createPuzzle(difficulty: Difficulty) {
  const solution = generateSolvedBoard();
  const puzzle: Board = solution.map(r => [...r]);
  const removals = difficulty === 'easy' ? 35 : difficulty === 'medium' ? 45 : 55;
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));
  for (let i = 0; i < removals && i < cells.length; i++) {
    puzzle[Math.floor(cells[i] / 9)][cells[i] % 9] = null;
  }
  return { puzzle, solution };
}

export default function SudokuPage() {
  const { t, dir, language } = useApp();
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameData, setGameData] = useState(() => createPuzzle('easy'));
  const [board, setBoard] = useState<Board>(() => gameData.puzzle.map(r => [...r]));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [notes, setNotes] = useState<Set<string>[][]>(() =>
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>()))
  );
  const [noteMode, setNoteMode] = useState(false);
  const [stats, setStats] = useState<SudokuStats>(loadStats);
  const [showStats, setShowStats] = useState(false);
  const [history, setHistory] = useState<{ board: Board; errors: Set<string> }[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const maxHints = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 3 : 1;

  const original = useMemo(() => {
    const s = new Set<string>();
    gameData.puzzle.forEach((r, ri) => r.forEach((v, ci) => { if (v !== null) s.add(`${ri}-${ci}`); }));
    return s;
  }, [gameData]);

  useEffect(() => {
    if (!isRunning || solved || isPaused) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, solved, isPaused]);

  const recordWin = (time: number, diff: Difficulty) => {
    const s = { ...stats };
    s.gamesPlayed++;
    s.gamesWon++;
    s.currentStreak++;
    if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
    if (s.bestTime[diff] === null || time < s.bestTime[diff]!) s.bestTime[diff] = time;
    s.averageTime[diff].total += time;
    s.averageTime[diff].count++;
    setStats(s);
    saveStats(s);
  };

  const newGame = (diff: Difficulty) => {
    setDifficulty(diff);
    const data = createPuzzle(diff);
    setGameData(data);
    setBoard(data.puzzle.map(r => [...r]));
    setSelected(null); setErrors(new Set()); setSolved(false); setTimer(0); setIsRunning(true); setIsPaused(false);
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>())));
    setNoteMode(false); setHistory([]); setHintsUsed(0); setSelectedNumber(null);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleCellClick = (r: number, c: number) => {
    if (isPaused || solved) return;
    setSelected([r, c]);
    // If a number is already in this cell, highlight that number
    if (board[r][c] !== null) {
      setSelectedNumber(board[r][c]);
    }
  };

  const handleNumberInput = useCallback((num: number) => {
    if (solved || isPaused) return;

    // Toggle selected number for highlighting
    if (selectedNumber === num) {
      setSelectedNumber(null);
    } else {
      setSelectedNumber(num);
    }

    if (!selected) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;

    if (noteMode) {
      const nn = notes.map(row => row.map(s => new Set(s)));
      const k = num.toString();
      if (nn[r][c].has(k)) nn[r][c].delete(k); else nn[r][c].add(k);
      setNotes(nn); return;
    }

    setHistory(prev => [...prev, { board: board.map(row => [...row]), errors: new Set(errors) }]);
    const nb = board.map(row => [...row]);
    nb[r][c] = num;
    setBoard(nb);

    // Auto-clear notes in same row, col, box
    const nn = notes.map(row => row.map(s => new Set(s)));
    nn[r][c].clear();
    const k = num.toString();
    for (let i = 0; i < 9; i++) { nn[r][i].delete(k); nn[i][c].delete(k); }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = br; i < br + 3; i++) for (let j = bc; j < bc + 3; j++) nn[i][j].delete(k);
    setNotes(nn);

    const ne = new Set<string>();
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++)
      if (nb[i][j] !== null && nb[i][j] !== gameData.solution[i][j]) ne.add(`${i}-${j}`);
    setErrors(ne);
    if (ne.size === 0 && nb.every(row => row.every(cell => cell !== null))) {
      setSolved(true); setIsRunning(false);
      recordWin(timer, difficulty);
    }
  }, [selected, solved, isPaused, original, noteMode, notes, board, errors, gameData, timer, difficulty, stats, selectedNumber]);

  const handleErase = () => {
    if (!selected || isPaused) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;
    setHistory(prev => [...prev, { board: board.map(row => [...row]), errors: new Set(errors) }]);
    const nb = board.map(row => [...row]); nb[r][c] = null; setBoard(nb);
    const ne = new Set(errors); ne.delete(`${r}-${c}`); setErrors(ne);
    // Also clear notes
    const nn = notes.map(row => row.map(s => new Set(s)));
    nn[r][c].clear();
    setNotes(nn);
  };

  const handleHint = () => {
    if (!selected || hintsUsed >= maxHints || isPaused) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;
    if (board[r][c] === gameData.solution[r][c]) return;
    setHistory(prev => [...prev, { board: board.map(row => [...row]), errors: new Set(errors) }]);
    const nb = board.map(row => [...row]); nb[r][c] = gameData.solution[r][c]; setBoard(nb);
    const ne = new Set(errors); ne.delete(`${r}-${c}`); setErrors(ne);
    setHintsUsed(h => h + 1);
    if (ne.size === 0 && nb.every(row => row.every(cell => cell !== null))) {
      setSolved(true); setIsRunning(false);
      recordWin(timer, difficulty);
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || isPaused) return;
    const prev = history[history.length - 1];
    setBoard(prev.board);
    setErrors(prev.errors);
    setHistory(h => h.slice(0, -1));
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const getHighlight = (r: number, c: number) => {
    if (!selected) {
      // Highlight matching numbers when a number is selected from pad
      if (selectedNumber !== null && board[r][c] === selectedNumber) return 'bg-primary/12';
      return '';
    }
    const [sr, sc] = selected;
    if (r === sr && c === sc) return 'bg-primary/20 ring-2 ring-inset ring-primary/50';
    if (r === sr || c === sc) return 'bg-primary/6';
    if (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3)) return 'bg-primary/6';
    if (board[r][c] !== null && board[sr][sc] !== null && board[r][c] === board[sr][sc]) return 'bg-primary/10';
    return '';
  };

  // Count remaining numbers
  const numberCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let n = 1; n <= 9; n++) {
      let count = 0;
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board[r][c] === n) count++;
      counts[n] = 9 - count; // remaining
    }
    return counts;
  }, [board]);

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const diffLabels: Record<Difficulty, string> = {
    easy: t('sudoku.easy'),
    medium: t('sudoku.medium'),
    hard: t('sudoku.hard'),
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6">
      {/* Header — LibreSudoku style */}
      <div className="flex items-center justify-between mb-1 max-w-[360px] mx-auto">
        <button onClick={() => navigate('/games')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-90">
          <ArrowLeft className={`w-5 h-5 text-foreground stroke-[1.8] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={togglePause} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            {isPaused ? <Play className="w-5 h-5 text-foreground stroke-[1.8]" /> : <Pause className="w-5 h-5 text-foreground stroke-[1.8]" />}
          </button>
          <button onClick={() => newGame(difficulty)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <RefreshCw className="w-5 h-5 text-foreground stroke-[1.8]" />
          </button>
          <button onClick={() => setShowStats(!showStats)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <Trophy className={`w-5 h-5 stroke-[1.8] ${showStats ? 'text-primary' : 'text-foreground'}`} />
          </button>
        </div>
      </div>

      {/* Difficulty & Timer row */}
      <div className="flex items-center justify-between max-w-[360px] mx-auto mb-3 px-1">
        <div className="flex gap-1.5">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
            <button key={d} onClick={() => newGame(d)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                difficulty === d
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >{diffLabels[d]}</button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground tabular-nums font-medium">{formatTimer(timer)}</span>
      </div>

      {/* Stats Panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden max-w-[360px] mx-auto mb-3"
          >
            <div className="rounded-2xl bg-secondary/50 p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-xl bg-background/60">
                  <div className="text-lg font-bold text-foreground">{stats.gamesWon}</div>
                  <div className="text-[10px] text-muted-foreground">{t('stats.wins')}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-background/60">
                  <div className="text-lg font-bold text-foreground">{winRate}%</div>
                  <div className="text-[10px] text-muted-foreground">{t('stats.winRate')}</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-background/60">
                  <div className="text-lg font-bold text-primary">{stats.bestStreak}</div>
                  <div className="text-[10px] text-muted-foreground">{t('stats.streak')}</div>
                </div>
              </div>
              <div className="space-y-1">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => {
                  const avg = stats.averageTime[d]?.count > 0 ? Math.round(stats.averageTime[d].total / stats.averageTime[d].count) : null;
                  return (
                    <div key={d} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px]">
                      <span className="text-muted-foreground font-medium">{diffLabels[d]}</span>
                      <div className="flex gap-4">
                        <span className="text-foreground tabular-nums">
                          {language === 'ar' ? 'أفضل' : 'Best'}: {stats.bestTime[d] !== null ? formatTimer(stats.bestTime[d]!) : '—'}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {language === 'ar' ? 'متوسط' : 'Avg'}: {avg !== null ? formatTimer(avg) : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win banner */}
      {solved && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center py-3 mb-3 rounded-2xl bg-primary/12 max-w-[360px] mx-auto flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5 text-primary stroke-[1.8]" />
          <span className="text-primary font-bold">{t('sudoku.solved')}</span>
          <span className="text-primary/70 text-sm font-medium">{formatTimer(timer)}</span>
        </motion.div>
      )}

      {/* Board — LibreSudoku style */}
      <div className="max-w-[360px] mx-auto mb-4 relative">
        {/* Pause overlay */}
        <AnimatePresence>
          {isPaused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 rounded-2xl bg-card/95 backdrop-blur-sm flex items-center justify-center"
              onClick={togglePause}
            >
              <div className="flex flex-col items-center gap-3">
                <Play className="w-10 h-10 text-primary stroke-[1.5]" />
                <span className="text-muted-foreground font-medium text-sm">
                  {language === 'ar' ? 'اضغط للمتابعة' : 'Tap to continue'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-2xl overflow-hidden border border-border/40">
          <div className="grid grid-cols-9">
            {board.map((row, ri) => row.map((cell, ci) => {
              const isOrig = original.has(`${ri}-${ci}`);
              const hasError = errors.has(`${ri}-${ci}`);
              const cellNotes = notes[ri][ci];
              const isSelected = selected?.[0] === ri && selected?.[1] === ci;
              // Thick borders for 3x3 boxes
              const borderR = ci % 3 === 2 && ci !== 8 ? 'border-e-[2px] border-e-foreground/15' : 'border-e border-e-border/30';
              const borderB = ri % 3 === 2 && ri !== 8 ? 'border-b-[2px] border-b-foreground/15' : 'border-b border-b-border/30';

              return (
                <button key={`${ri}-${ci}`} onClick={() => handleCellClick(ri, ci)}
                  className={`aspect-square flex items-center justify-center relative transition-colors duration-100
                    ${borderR} ${borderB}
                    ${getHighlight(ri, ci)}
                    ${!solved && !isPaused ? 'cursor-pointer active:bg-primary/15' : ''}
                  `}
                >
                  {cell !== null ? (
                    <span className={`text-[15px] font-semibold select-none ${
                      isOrig
                        ? 'text-foreground'
                        : hasError
                          ? 'text-destructive'
                          : 'text-primary'
                    }`}>
                      {cell}
                    </span>
                  ) : cellNotes.size > 0 ? (
                    <div className="grid grid-cols-3 gap-0 text-[6px] text-muted-foreground/70 leading-none w-full h-full p-[2px]">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <span key={n} className="flex items-center justify-center font-medium">
                          {cellNotes.has(n.toString()) ? n : ''}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            }))}
          </div>
        </div>
      </div>

      {/* Number pad — LibreSudoku style: numbers with remaining count below */}
      <div className="max-w-[360px] mx-auto space-y-3">
        <div className="grid grid-cols-9 gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
            const remaining = numberCounts[n];
            const isComplete = remaining <= 0;
            const isActive = selectedNumber === n;
            return (
              <button key={n} onClick={() => handleNumberInput(n)} disabled={isComplete}
                className={`flex flex-col items-center justify-center py-2 rounded-2xl transition-all active:scale-90 ${
                  isComplete
                    ? 'opacity-20 cursor-not-allowed'
                    : isActive
                      ? 'bg-primary/20 text-primary'
                      : 'text-foreground hover:bg-secondary'
                }`}>
                <span className="text-[18px] font-bold leading-none">{n}</span>
                <span className={`text-[9px] mt-0.5 leading-none font-medium ${
                  isComplete ? 'text-muted-foreground/30' : 'text-muted-foreground/60'
                }`}>
                  {remaining}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tool buttons — LibreSudoku style: icon-only row */}
        <div className="flex justify-center gap-3">
          <button onClick={handleUndo} disabled={history.length === 0}
            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-20 active:scale-90"
            title={language === 'ar' ? 'تراجع' : 'Undo'}
          >
            <Undo2 className="w-5 h-5 text-foreground stroke-[1.8]" />
          </button>
          <button onClick={handleHint} disabled={hintsUsed >= maxHints}
            className="relative w-12 h-12 rounded-full flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-20 active:scale-90"
            title={language === 'ar' ? 'تلميح' : 'Hint'}
          >
            <Lightbulb className="w-5 h-5 text-foreground stroke-[1.8]" />
            {hintsUsed < maxHints && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary/15 text-primary text-[8px] font-bold flex items-center justify-center">
                {maxHints - hintsUsed}
              </span>
            )}
          </button>
          <button onClick={() => setNoteMode(!noteMode)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
              noteMode ? 'bg-primary/15 text-primary' : 'hover:bg-secondary text-foreground'
            }`}
            title={language === 'ar' ? 'ملاحظات' : 'Notes'}
          >
            <PenLine className="w-5 h-5 stroke-[1.8]" />
          </button>
          <button onClick={handleErase}
            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-90"
            title={language === 'ar' ? 'مسح' : 'Erase'}
          >
            <Eraser className="w-5 h-5 text-foreground stroke-[1.8]" />
          </button>
        </div>
      </div>
    </div>
  );
}
