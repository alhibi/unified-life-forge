import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Lightbulb, Clock, Eraser, PenLine, Trophy, Undo2, Pause, Play, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from '@/components/GameShell';
import { playSfx, vibrate } from '@/utils/gameFeedback';

type Board = (number | null)[][];
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

interface SudokuStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: Record<Difficulty, number | null>;
  averageTime: Record<Difficulty, { total: number; count: number }>;
  currentStreak: number;
  bestStreak: number;
  flawless: number;
  dailyDone: string[];
}

function loadStats(): SudokuStats {
  const def: SudokuStats = {
    gamesPlayed: 0, gamesWon: 0,
    bestTime: { easy: null, medium: null, hard: null, expert: null },
    averageTime: { easy: { total: 0, count: 0 }, medium: { total: 0, count: 0 }, hard: { total: 0, count: 0 }, expert: { total: 0, count: 0 } },
    currentStreak: 0, bestStreak: 0, flawless: 0, dailyDone: [],
  };
  try {
    const s = JSON.parse(localStorage.getItem('sudoku-stats') || '{}');
    return {
      ...def, ...s,
      bestTime: { ...def.bestTime, ...(s.bestTime || {}) },
      averageTime: { ...def.averageTime, ...(s.averageTime || {}) },
      dailyDone: Array.isArray(s.dailyDone) ? s.dailyDone : [],
    };
  } catch { return def; }
}
function saveStats(stats: SudokuStats) { localStorage.setItem('sudoku-stats', JSON.stringify(stats)); }

interface SavedSudokuGame {
  difficulty: Difficulty;
  gameData: { puzzle: Board; solution: number[][] };
  board: Board;
  timer: number;
  hintsUsed: number;
  solved: boolean;
  gameStarted: boolean;
  errors: string[];
  notes: string[][][];
}

function saveGameState(state: SavedSudokuGame) {
  localStorage.setItem('sudoku-game-state', JSON.stringify(state));
}

function loadGameState(): SavedSudokuGame | null {
  const saved = localStorage.getItem('sudoku-game-state');
  if (!saved) return null;
  try { return JSON.parse(saved); } catch { return null; }
}

function clearGameState() {
  localStorage.removeItem('sudoku-game-state');
}

// Mulberry32: tiny, fast, deterministic 32-bit PRNG
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function generateSolvedBoard(rng: () => number = Math.random): number[][] {
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
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
        for (const n of nums) { if (isValid(b, r, c, n)) { b[r][c] = n; if (solve(b)) return true; b[r][c] = 0; } }
        return false;
      }
    }
    return true;
  }
  solve(board);
  return board;
}

function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function createPuzzle(difficulty: Difficulty, seed?: string) {
  const rng = seed ? mulberry32(hashString(seed)) : Math.random;
  const solution = generateSolvedBoard(rng);
  const puzzle: Board = solution.map(r => [...r]);
  const removals = difficulty === 'easy' ? 35 : difficulty === 'medium' ? 45 : difficulty === 'hard' ? 52 : 58;
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i), rng);
  for (let i = 0; i < removals && i < cells.length; i++) {
    puzzle[Math.floor(cells[i] / 9)][cells[i] % 9] = null;
  }
  return { puzzle, solution };
}

// Daily challenge: seeded by date — UTC for global consistency
function todayKey(): string { const d = new Date(); return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`; }

// Live conflict detection: returns set of cells whose value clashes with another cell in same row/col/box
function findConflicts(board: Board): Set<string> {
  const out = new Set<string>();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = board[r][c]; if (v === null) continue;
      for (let i = 0; i < 9; i++) {
        if (i !== c && board[r][i] === v) { out.add(`${r}-${c}`); out.add(`${r}-${i}`); }
        if (i !== r && board[i][c] === v) { out.add(`${r}-${c}`); out.add(`${i}-${c}`); }
      }
      const sr = Math.floor(r / 3) * 3, sc = Math.floor(c / 3) * 3;
      for (let i = sr; i < sr + 3; i++) for (let j = sc; j < sc + 3; j++) {
        if ((i !== r || j !== c) && board[i][j] === v) { out.add(`${r}-${c}`); out.add(`${i}-${j}`); }
      }
    }
  }
  return out;
}

export default function SudokuPage() {
  const { t, dir, language } = useApp();
  const navigate = useNavigate();
  
  const savedGame = useMemo(() => loadGameState(), []);
  
  const [difficulty, setDifficulty] = useState<Difficulty>(savedGame?.difficulty || 'easy');
  const [gameData, setGameData] = useState(() => savedGame?.gameData || createPuzzle('easy'));
  const [board, setBoard] = useState<Board>(() => savedGame?.board || gameData.puzzle.map(r => [...r]));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(() => new Set(savedGame?.errors || []));
  const [solved, setSolved] = useState(savedGame?.solved || false);
  const [timer, setTimer] = useState(savedGame?.timer || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(savedGame?.gameStarted || false);
  const [notes, setNotes] = useState<Set<string>[][]>(() => {
    if (savedGame?.notes) {
      return savedGame.notes.map(row => row.map(cell => new Set(cell)));
    }
    return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>()));
  });
  const [noteMode, setNoteMode] = useState(false);
  const [stats, setStats] = useState<SudokuStats>(loadStats);
  const [showStats, setShowStats] = useState(false);
  const [history, setHistory] = useState<{ board: Board; errors: Set<string> }[]>([]);
  const [hintsUsed, setHintsUsed] = useState(savedGame?.hintsUsed || 0);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const maxHints = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 3 : difficulty === 'hard' ? 2 : 1;
  const [isDaily, setIsDaily] = useState<boolean>(() => localStorage.getItem('sudoku-is-daily') === 'true' && stats.dailyDone[stats.dailyDone.length - 1] !== todayKey());

  const original = useMemo(() => {
    const s = new Set<string>();
    gameData.puzzle.forEach((r, ri) => r.forEach((v, ci) => { if (v !== null) s.add(`${ri}-${ci}`); }));
    return s;
  }, [gameData]);

  // Auto-save game state
  useEffect(() => {
    if (solved) {
      clearGameState();
      return;
    }
    saveGameState({
      difficulty,
      gameData,
      board,
      timer,
      hintsUsed,
      solved,
      gameStarted,
      errors: Array.from(errors),
      notes: notes.map(row => row.map(cell => Array.from(cell))),
    });
  }, [board, timer, errors, hintsUsed, solved, gameStarted, difficulty, gameData, notes]);

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
    if (hintsUsed === 0) s.flawless = (s.flawless || 0) + 1;
    if (isDaily) {
      const k = todayKey();
      if (!s.dailyDone.includes(k)) s.dailyDone = [...s.dailyDone, k];
    }
    setStats(s);
    saveStats(s);
    playSfx('win'); vibrate([60, 60, 200]);
  };

  const newGame = (diff: Difficulty, daily = false) => {
    clearGameState();
    setDifficulty(diff);
    setIsDaily(daily);
    localStorage.setItem('sudoku-is-daily', String(daily));
    const data = daily ? createPuzzle(diff, `daily-${todayKey()}-${diff}`) : createPuzzle(diff);
    setGameData(data);
    setBoard(data.puzzle.map(r => [...r]));
    setSelected(null); setErrors(new Set()); setSolved(false); setTimer(0); setIsRunning(false); setIsPaused(false); setGameStarted(false);
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>())));
    setNoteMode(false); setHistory([]); setHintsUsed(0); setSelectedNumber(null);
  };

  const startGame = () => {
    setGameStarted(true);
    setIsRunning(true);
    setIsPaused(false);
  };

  const togglePause = () => {
    if (!gameStarted) {
      startGame();
      return;
    }
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
    if (num === gameData.solution[r][c]) { playSfx('place'); vibrate(15); }
    else { playSfx('wrong'); vibrate(40); }

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
    const nn = notes.map(row => row.map(s => new Set(s)));
    nn[r][c].clear();
    setNotes(nn);
    playSfx('click');
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
    playSfx('hint'); vibrate(20);
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
    playSfx('click');
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Live conflicts: same number clashing in row/col/box
  const conflicts = useMemo(() => findConflicts(board), [board]);

  const getHighlight = (r: number, c: number) => {
    if (conflicts.has(`${r}-${c}`)) return 'bg-rose-500/15 ring-1 ring-inset ring-rose-400/40';
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
    expert: isAr ? 'محترف' : 'Expert',
  };

  const isAr = language === 'ar';

  const sudokuRules = isAr ? [
    'املأ الشبكة بالأرقام من 1 إلى 9',
    'كل صف يجب أن يحتوي على الأرقام 1-9 بدون تكرار',
    'كل عمود يجب أن يحتوي على الأرقام 1-9 بدون تكرار',
    'كل مربع 3×3 يجب أن يحتوي على الأرقام 1-9 بدون تكرار',
    'استخدم التلميحات والملاحظات لمساعدتك',
  ] : [
    'Fill the grid with numbers 1 to 9',
    'Each row must contain 1-9 without repeating',
    'Each column must contain 1-9 without repeating',
    'Each 3×3 box must contain 1-9 without repeating',
    'Use hints and notes to help you',
  ];

  const sudokuStats = [
    { label: isAr ? 'فوز' : 'Wins', value: stats.gamesWon },
    { label: isAr ? 'نسبة الفوز' : 'Win Rate', value: `${winRate}%` },
    { label: isAr ? 'أفضل سلسلة' : 'Best Streak', value: stats.bestStreak },
    { label: isAr ? 'أفضل وقت' : 'Best Time', value: stats.bestTime[difficulty] !== null ? formatTimer(stats.bestTime[difficulty]!) : '—' },
  ];

  const todayDone = stats.dailyDone.includes(todayKey());
  const sudokuOptions = [
    {
      key: 'difficulty',
      label: isAr ? 'المستوى' : 'Difficulty',
      choices: [
        { value: 'easy', label: diffLabels.easy },
        { value: 'medium', label: diffLabels.medium },
        { value: 'hard', label: diffLabels.hard },
        { value: 'expert', label: diffLabels.expert },
      ],
      current: difficulty,
      onChange: (v: string) => newGame(v as Difficulty),
    },
    {
      key: 'daily',
      label: isAr ? 'تحدّي اليوم' : 'Daily challenge',
      choices: [
        { value: 'no', label: isAr ? 'عادي' : 'Normal' },
        { value: 'yes', label: todayDone ? (isAr ? 'تم اليوم' : 'Today done') : (isAr ? 'ابدأ اليوم' : 'Start today') },
      ],
      current: isDaily ? 'yes' : 'no',
      onChange: (v: string) => { if (v === 'yes' && !todayDone) newGame(difficulty, true); else newGame(difficulty, false); },
    },
  ];

  const timerDisplay = (
    <div className="flex items-center gap-2">
      <button onClick={togglePause} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 active:scale-90 transition-transform">
        {isPaused ? <Play className="w-3.5 h-3.5 text-zinc-400" /> : <Pause className="w-3.5 h-3.5 text-zinc-400" />}
      </button>
      <div className="flex items-center gap-1 text-xs text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full tabular-nums">
        <Clock className="w-3 h-3" />{formatTimer(timer)}
      </div>
    </div>
  );

  return (
    <GameShell
      title={t('games.sudoku')}
      icon={Grid3X3}
      accentColor="#3b82f6"
      rules={sudokuRules}
      stats={sudokuStats}
      options={sudokuOptions}
      headerRight={timerDisplay}
    >

      {/* Daily banner */}
      {isDaily && !solved && (
        <div className="text-center py-2 mb-2 rounded-2xl bg-amber-500/10 max-w-[360px] mx-auto flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4 text-amber-300" />
          <span className="text-amber-200 font-bold text-xs">{isAr ? 'تحدّي اليوم' : 'Daily Challenge'}</span>
          <span className="text-amber-200/60 text-xs tabular-nums">{todayKey()}</span>
        </div>
      )}

      {/* Win banner */}
      {solved && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center py-3 mb-3 rounded-2xl bg-primary/12 max-w-[360px] mx-auto flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5 text-primary stroke-[1.8]" />
          <span className="text-primary font-bold">{t('sudoku.solved')}</span>
          <span className="text-primary/70 text-sm font-medium">{formatTimer(timer)}</span>
          {hintsUsed === 0 && <span className="text-amber-400 text-xs">★</span>}
        </motion.div>
      )}

      {/* Board — LibreSudoku style */}
      <div className="max-w-[360px] mx-auto mb-4 relative">
        {/* Start / Pause overlay */}
        <AnimatePresence>
          {(!gameStarted || isPaused) && !solved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 rounded-2xl bg-card/95 backdrop-blur-sm flex items-center justify-center"
              onClick={!gameStarted ? startGame : togglePause}
            >
              <div className="flex flex-col items-center gap-3">
                <Play className="w-10 h-10 text-primary stroke-[1.5]" />
                <span className="text-muted-foreground font-medium text-sm">
                  {!gameStarted
                    ? (language === 'ar' ? 'اضغط للبدء' : 'Tap to start')
                    : (language === 'ar' ? 'اضغط للمتابعة' : 'Tap to continue')
                  }
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
    </GameShell>
  );
}
