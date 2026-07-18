import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Grid3X3, Lightbulb, Clock, Eraser, PenLine, Trophy, Undo2, Pause, Play, Calendar, Sparkles, X, Zap, Brain } from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from '@/features/games/components/GameShell';
import { playSfx, vibrate } from '@/features/games/utils/gameFeedback';
import { nextHint, SolverHint, TECHNIQUE_LABELS } from '@/features/games/utils/sudokuSolver';

type Board = (number | null)[][];
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
type Variant = 'classic' | 'x' | 'mini';

interface SudokuStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: Record<Difficulty, number | null>;
  averageTime: Record<Difficulty, { total: number; count: number }>;
  currentStreak: number;
  bestStreak: number;
  flawless: number;
  dailyDone: string[];
  variantWins: Record<Variant, number>;
  totalHints: number;
  noErrors: number; // count of games solved without any wrong placement
}

function loadStats(): SudokuStats {
  const def: SudokuStats = {
    gamesPlayed: 0, gamesWon: 0,
    bestTime: { easy: null, medium: null, hard: null, expert: null },
    averageTime: { easy: { total: 0, count: 0 }, medium: { total: 0, count: 0 }, hard: { total: 0, count: 0 }, expert: { total: 0, count: 0 } },
    currentStreak: 0, bestStreak: 0, flawless: 0, dailyDone: [],
    variantWins: { classic: 0, x: 0, mini: 0 },
    totalHints: 0, noErrors: 0,
  };
  try {
    const s = JSON.parse(localStorage.getItem('sudoku-stats') || '{}');
    return {
      ...def, ...s,
      bestTime: { ...def.bestTime, ...(s.bestTime || {}) },
      averageTime: { ...def.averageTime, ...(s.averageTime || {}) },
      dailyDone: Array.isArray(s.dailyDone) ? s.dailyDone : [],
      variantWins: { ...def.variantWins, ...(s.variantWins || {}) },
    };
  } catch { return def; }
}
function saveStats(stats: SudokuStats) { localStorage.setItem('sudoku-stats', JSON.stringify(stats)); }

interface SavedSudokuGame {
  difficulty: Difficulty;
  variant: Variant;
  gameData: { puzzle: Board; solution: number[][] };
  board: Board;
  timer: number;
  hintsUsed: number;
  solved: boolean;
  gameStarted: boolean;
  errors: string[];
  notes: string[][][];
  errorCount: number;
}

function saveGameState(state: SavedSudokuGame) { localStorage.setItem('sudoku-game-state', JSON.stringify(state)); }
function loadGameState(): SavedSudokuGame | null {
  const saved = localStorage.getItem('sudoku-game-state');
  if (!saved) return null;
  try { return JSON.parse(saved); } catch { return null; }
}
function clearGameState() { localStorage.removeItem('sudoku-game-state'); }

// ============================================================================
// PRNG + helpers
// ============================================================================
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
function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ============================================================================
// X-Sudoku validity (extra constraint: both diagonals must contain 1-9)
// ============================================================================
function onMainDiag(r: number, c: number) { return r === c; }
function onAntiDiag(r: number, c: number) { return r + c === 8; }

function isValidPlacement(b: number[][], r: number, c: number, n: number, variant: Variant): boolean {
  // Row + column
  for (let i = 0; i < 9; i++) if (b[r][i] === n || b[i][c] === n) return false;
  // 3×3 box
  const sr = Math.floor(r / 3) * 3, sc = Math.floor(c / 3) * 3;
  for (let i = sr; i < sr + 3; i++) for (let j = sc; j < sc + 3; j++) if (b[i][j] === n) return false;
  // Diagonals (X-Sudoku)
  if (variant === 'x') {
    if (onMainDiag(r, c)) {
      for (let i = 0; i < 9; i++) if (b[i][i] === n) return false;
    }
    if (onAntiDiag(r, c)) {
      for (let i = 0; i < 9; i++) if (b[i][8 - i] === n) return false;
    }
  }
  return true;
}

function generateSolvedBoard(rng: () => number, variant: Variant): number[][] {
  const board: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  function solve(b: number[][]): boolean {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (b[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
        for (const n of nums) {
          if (isValidPlacement(b, r, c, n, variant)) {
            b[r][c] = n;
            if (solve(b)) return true;
            b[r][c] = 0;
          }
        }
        return false;
      }
    }
    return true;
  }
  solve(board);
  return board;
}

function createPuzzle(difficulty: Difficulty, variant: Variant, seed?: string) {
  const rng = seed ? mulberry32(hashString(seed)) : Math.random;
  const solution = generateSolvedBoard(rng, variant);
  const puzzle: Board = solution.map(r => [...r]);
  // X-sudoku is intrinsically more constrained → fewer removals needed
  let removals = difficulty === 'easy' ? 35 : difficulty === 'medium' ? 45 : difficulty === 'hard' ? 52 : 58;
  if (variant === 'x') removals = Math.min(removals + 4, 60);
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i), rng);
  for (let i = 0; i < removals && i < cells.length; i++) {
    puzzle[Math.floor(cells[i] / 9)][cells[i] % 9] = null;
  }
  return { puzzle, solution };
}

// Daily challenge
function todayKey(): string { const d = new Date(); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`; }

// ============================================================================
// Conflict detection
// ============================================================================
function findConflicts(board: Board, variant: Variant): Set<string> {
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
      // X-diagonals
      if (variant === 'x') {
        if (onMainDiag(r, c)) {
          for (let i = 0; i < 9; i++) if ((i !== r || i !== c) && board[i][i] === v && (i !== r)) { out.add(`${r}-${c}`); out.add(`${i}-${i}`); }
        }
        if (onAntiDiag(r, c)) {
          for (let i = 0; i < 9; i++) if (board[i][8 - i] === v && (i !== r)) { out.add(`${r}-${c}`); out.add(`${i}-${8-i}`); }
        }
      }
    }
  }
  return out;
}

// Compute legal candidates for a given empty cell (for auto-pencil-marks)
function legalCandidates(board: Board, r: number, c: number, variant: Variant): Set<string> {
  const out = new Set<string>();
  if (board[r][c] !== null) return out;
  const tmp = board.map(row => row.map(x => (x ?? 0))) as number[][];
  for (let n = 1; n <= 9; n++) {
    if (isValidPlacement(tmp, r, c, n, variant)) out.add(String(n));
  }
  return out;
}

// ============================================================================
// Component
// ============================================================================
export default function SudokuPage() {
  const { t, language } = useApp();
  const isAr = language === 'ar';

  const savedGame = useMemo(() => loadGameState(), []);

  const [difficulty, setDifficulty] = useState<Difficulty>(savedGame?.difficulty || 'easy');
  const [variant, setVariant] = useState<Variant>(savedGame?.variant || 'classic');
  const [gameData, setGameData] = useState(() => savedGame?.gameData || createPuzzle('easy', 'classic'));
  const [board, setBoard] = useState<Board>(() => savedGame?.board || gameData.puzzle.map(r => [...r]));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(() => new Set(savedGame?.errors || []));
  const [errorCount, setErrorCount] = useState(savedGame?.errorCount ?? 0);
  const [solved, setSolved] = useState(savedGame?.solved || false);
  const [timer, setTimer] = useState(savedGame?.timer || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(savedGame?.gameStarted || false);
  const [notes, setNotes] = useState<Set<string>[][]>(() => {
    if (savedGame?.notes) return savedGame.notes.map(row => row.map(cell => new Set(cell)));
    return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>()));
  });
  const [noteMode, setNoteMode] = useState(false);
  const [stats, setStats] = useState<SudokuStats>(loadStats);
  const [history, setHistory] = useState<{ board: Board; errors: Set<string>; notes: Set<string>[][] }[]>([]);
  const [hintsUsed, setHintsUsed] = useState(savedGame?.hintsUsed || 0);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [autoNotes, setAutoNotes] = useState(false);
  const maxHints = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 3 : difficulty === 'hard' ? 2 : 1;
  const [isDaily, setIsDaily] = useState<boolean>(() => localStorage.getItem('sudoku-is-daily') === 'true' && stats.dailyDone[stats.dailyDone.length - 1] !== todayKey());

  const original = useMemo(() => {
    const s = new Set<string>();
    gameData.puzzle.forEach((r, ri) => r.forEach((v, ci) => { if (v !== null) s.add(`${ri}-${ci}`); }));
    return s;
  }, [gameData]);

  // Auto-save
  useEffect(() => {
    if (solved) { clearGameState(); return; }
    saveGameState({
      difficulty, variant, gameData, board, timer, hintsUsed, solved, gameStarted,
      errors: Array.from(errors), errorCount,
      notes: notes.map(row => row.map(cell => Array.from(cell))),
    });
  }, [board, timer, errors, hintsUsed, solved, gameStarted, difficulty, variant, gameData, notes, errorCount]);

  useEffect(() => {
    if (!isRunning || solved || isPaused) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, solved, isPaused]);

  const recordWin = (time: number, diff: Difficulty, var_: Variant, errs: number, hints: number) => {
    const s = { ...stats };
    s.gamesPlayed++; s.gamesWon++;
    s.currentStreak++;
    if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
    if (s.bestTime[diff] === null || time < s.bestTime[diff]!) s.bestTime[diff] = time;
    s.averageTime[diff].total += time;
    s.averageTime[diff].count++;
    s.variantWins[var_] = (s.variantWins[var_] || 0) + 1;
    s.totalHints = (s.totalHints || 0) + hints;
    if (hints === 0 && errs === 0) s.flawless = (s.flawless || 0) + 1;
    if (errs === 0) s.noErrors = (s.noErrors || 0) + 1;
    if (isDaily) {
      const k = todayKey();
      if (!s.dailyDone.includes(k)) s.dailyDone = [...s.dailyDone, k];
    }
    setStats(s); saveStats(s);
    playSfx('win'); vibrate([60, 60, 200]);
  };

  const newGame = (diff: Difficulty, var_: Variant = variant, daily = false) => {
    clearGameState();
    setDifficulty(diff);
    setVariant(var_);
    setIsDaily(daily);
    localStorage.setItem('sudoku-is-daily', String(daily));
    const data = daily ? createPuzzle(diff, var_, `daily-${todayKey()}-${diff}-${var_}`) : createPuzzle(diff, var_);
    setGameData(data);
    setBoard(data.puzzle.map(r => [...r]));
    setSelected(null); setErrors(new Set()); setErrorCount(0); setSolved(false); setTimer(0);
    setIsRunning(false); setIsPaused(false); setGameStarted(false);
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>())));
    setNoteMode(false); setHistory([]); setHintsUsed(0); setSelectedNumber(null); setAutoNotes(false);
  };

  const startGame = () => { setGameStarted(true); setIsRunning(true); setIsPaused(false); };
  const togglePause = () => { if (!gameStarted) { startGame(); return; } setIsPaused(!isPaused); };

  // Smart auto-pencil-marks: fill notes for every empty cell with legal candidates
  const fillAutoNotes = () => {
    const newNotes: Set<string>[][] = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>()));
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) newNotes[r][c] = legalCandidates(board, r, c, variant);
    }
    setHistory(prev => [...prev, snapshot()]);
    setNotes(newNotes);
    setAutoNotes(true);
    playSfx('hint');
  };

  const clearAutoNotes = () => {
    setHistory(prev => [...prev, snapshot()]);
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>())));
    setAutoNotes(false);
    playSfx('click');
  };

  const snapshot = () => ({
    board: board.map(row => [...row]),
    errors: new Set(errors),
    notes: notes.map(row => row.map(cell => new Set(cell))),
  });

  const handleCellClick = (r: number, c: number) => {
    if (isPaused || solved) return;
    setSelected([r, c]);
    if (board[r][c] !== null) setSelectedNumber(board[r][c]);
  };

  const handleNumberInput = useCallback((num: number) => {
    if (solved || isPaused) return;
    if (selectedNumber === num) setSelectedNumber(null);
    else setSelectedNumber(num);

    if (!selected) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;

    if (noteMode) {
      const nn = notes.map(row => row.map(s => new Set(s)));
      const k = num.toString();
      if (nn[r][c].has(k)) nn[r][c].delete(k); else nn[r][c].add(k);
      setNotes(nn); return;
    }

    setHistory(prev => [...prev, snapshot()]);
    const nb = board.map(row => [...row]);
    nb[r][c] = num;
    setBoard(nb);
    const correct = num === gameData.solution[r][c];
    if (correct) { playSfx('place'); vibrate(15); }
    else { playSfx('wrong'); vibrate(40); setErrorCount(e => e + 1); }

    // Auto-clear notes in same row, col, box (and diag for X-sudoku)
    const nn = notes.map(row => row.map(s => new Set(s)));
    nn[r][c].clear();
    const k = num.toString();
    for (let i = 0; i < 9; i++) { nn[r][i].delete(k); nn[i][c].delete(k); }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = br; i < br + 3; i++) for (let j = bc; j < bc + 3; j++) nn[i][j].delete(k);
    if (variant === 'x') {
      if (onMainDiag(r, c)) for (let i = 0; i < 9; i++) nn[i][i].delete(k);
      if (onAntiDiag(r, c)) for (let i = 0; i < 9; i++) nn[i][8 - i].delete(k);
    }
    setNotes(nn);

    // Refresh errors
    const ne = new Set<string>();
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++)
      if (nb[i][j] !== null && nb[i][j] !== gameData.solution[i][j]) ne.add(`${i}-${j}`);
    setErrors(ne);
    if (ne.size === 0 && nb.every(row => row.every(cell => cell !== null))) {
      setSolved(true); setIsRunning(false);
      recordWin(timer, difficulty, variant, errorCount + (correct ? 0 : 1), hintsUsed);
    }
  }, [selected, solved, isPaused, original, noteMode, notes, board, errors, gameData, timer, difficulty, variant, errorCount, hintsUsed, selectedNumber]);

  const handleErase = () => {
    if (!selected || isPaused) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;
    setHistory(prev => [...prev, snapshot()]);
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
    setHistory(prev => [...prev, snapshot()]);
    const nb = board.map(row => [...row]); nb[r][c] = gameData.solution[r][c]; setBoard(nb);
    const ne = new Set(errors); ne.delete(`${r}-${c}`); setErrors(ne);
    setHintsUsed(h => h + 1);
    playSfx('hint'); vibrate(20);
    if (ne.size === 0 && nb.every(row => row.every(cell => cell !== null))) {
      setSolved(true); setIsRunning(false);
      recordWin(timer, difficulty, variant, errorCount, hintsUsed + 1);
    }
  };

  // Smart Hint: surfaces the next solving technique that applies to the current
  // board state. Unlike the regular hint, it never reveals a digit unprompted —
  // the player can choose to apply or just learn from it. So it doesn't burn
  // hint credit; instead we increment `smartHintsViewed` for the stats panel.
  const [smartHint, setSmartHint] = useState<SolverHint | null>(null);
  const [smartHintsViewed, setSmartHintsViewed] = useState(0);

  const handleSmartHint = () => {
    if (isPaused || solved) return;
    const hint = nextHint(board);
    if (!hint) {
      // No logical move available — board may be inconsistent or only
      // solvable by guessing. Fall back to telling the user gently.
      setSmartHint({
        technique: 'guess',
        placements: [], eliminations: [], highlights: [],
        explanationAr: 'لم أعثر على حركة منطقية. تأكد من عدم وجود خطأ.',
        explanationDe: 'Kein logischer Zug gefunden. Prüfe auf Fehler.',
      });
      playSfx('wrong'); vibrate(40);
      return;
    }
    setSmartHint(hint);
    setSmartHintsViewed(n => n + 1);
    playSfx('hint'); vibrate(20);
  };

  const applySmartHint = () => {
    if (!smartHint) return;
    setHistory(prev => [...prev, snapshot()]);
    if (smartHint.placements.length > 0) {
      const nb = board.map(row => [...row]);
      for (const p of smartHint.placements) nb[p.r][p.c] = p.value;
      setBoard(nb);
      // Refresh errors after placement
      const ne = new Set<string>();
      for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
        if (nb[i][j] !== null && nb[i][j] !== gameData.solution[i][j]) ne.add(`${i}-${j}`);
      }
      setErrors(ne);
      playSfx('place'); vibrate(20);
      if (ne.size === 0 && nb.every(row => row.every(cell => cell !== null))) {
        setSolved(true); setIsRunning(false);
        recordWin(timer, difficulty, variant, errorCount, hintsUsed);
      }
    } else if (smartHint.eliminations.length > 0) {
      // Apply the candidate eliminations into pencil marks.
      const nn = notes.map(row => row.map(s => new Set(s)));
      for (const e of smartHint.eliminations) nn[e.r][e.c].delete(String(e.value));
      setNotes(nn);
      playSfx('click');
    }
    setSmartHint(null);
  };

  const handleUndo = () => {
    if (history.length === 0 || isPaused) return;
    const prev = history[history.length - 1];
    setBoard(prev.board);
    setErrors(prev.errors);
    setNotes(prev.notes);
    setHistory(h => h.slice(0, -1));
    playSfx('click');
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const conflicts = useMemo(() => findConflicts(board, variant), [board, variant]);

  const getHighlight = (r: number, c: number) => {
    // Smart-hint highlights take precedence so the player can see the
    // technique illustrated. Placement target glows green, eliminated
    // cells glow rose, and supporting evidence cells glow purple.
    if (smartHint) {
      const isPlacement = smartHint.placements.some(p => p.r === r && p.c === c);
      const isElim      = smartHint.eliminations.some(e => e.r === r && e.c === c);
      const isHighlight = smartHint.highlights.some(h => h.r === r && h.c === c);
      if (isPlacement) return 'bg-emerald-500/30 ring-2 ring-inset ring-emerald-400';
      if (isElim)      return 'bg-rose-500/15 ring-1 ring-inset ring-rose-400/50';
      if (isHighlight) return 'bg-purple-500/15 ring-1 ring-inset ring-purple-400/40';
    }
    if (conflicts.has(`${r}-${c}`)) return 'bg-rose-500/15 ring-1 ring-inset ring-rose-400/40';
    if (!selected) {
      if (selectedNumber !== null && board[r][c] === selectedNumber) return 'bg-primary/12';
      return '';
    }
    const [sr, sc] = selected;
    if (r === sr && c === sc) return 'bg-primary/20 ring-2 ring-inset ring-primary/50';
    if (r === sr || c === sc) return 'bg-primary/6';
    if (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3)) return 'bg-primary/6';
    if (variant === 'x') {
      if (onMainDiag(sr, sc) && onMainDiag(r, c)) return 'bg-purple-500/8';
      if (onAntiDiag(sr, sc) && onAntiDiag(r, c)) return 'bg-purple-500/8';
    }
    if (board[r][c] !== null && board[sr][sc] !== null && board[r][c] === board[sr][sc]) return 'bg-primary/10';
    return '';
  };

  const numberCounts = useMemo(() => {
    const c: Record<number, number> = {};
    for (let n = 1; n <= 9; n++) {
      let count = 0;
      for (let r = 0; r < 9; r++) for (let cc = 0; cc < 9; cc++) if (board[r][cc] === n) count++;
      c[n] = 9 - count;
    }
    return c;
  }, [board]);

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  const diffLabels: Record<Difficulty, string> = {
    easy: t('sudoku.easy'),
    medium: t('sudoku.medium'),
    hard: t('sudoku.hard'),
    expert: isAr ? 'محترف' : 'Experte',
  };
  const variantLabels: Record<Variant, { ar: string; de: string }> = {
    classic: { ar: 'كلاسيكي', de: 'Klassisch' },
    x: { ar: 'X-سودوكو', de: 'X-Sudoku' },
    mini: { ar: 'مصغّر 6×6', de: 'Mini 6×6' },
  };

  const sudokuRules = isAr ? [
    'املأ الشبكة بالأرقام من 1 إلى 9',
    'كل صف وعمود ومربع 3×3 يحتوي 1-9 بدون تكرار',
    variant === 'x' ? 'X-سودوكو: القطران الكبيران أيضاً يحتويان 1-9' : 'استخدم الملاحظات للأرقام المحتملة',
    'علامات تلقائية تساعدك (للصعب فقط)',
    'أخطاء أقل + بدون تلميحات = إتقان',
  ] : [
    'Fülle das Gitter mit 1-9',
    'Jede Reihe, Spalte und 3×3-Box enthält 1-9 ohne Wiederholung',
    variant === 'x' ? 'X-Sudoku: Beide Diagonalen enthalten auch 1-9' : 'Notizen helfen bei Kandidaten',
    'Auto-Notizen für Fortgeschrittene',
    'Weniger Fehler + ohne Tipps = "Perfekt"',
  ];

  const sudokuStats = [
    { label: isAr ? 'فوز' : 'Siege', value: stats.gamesWon },
    { label: isAr ? 'نسبة الفوز' : 'Siegquote', value: `${winRate}%` },
    { label: isAr ? 'أفضل سلسلة' : 'Beste Serie', value: stats.bestStreak },
    { label: isAr ? 'أفضل وقت' : 'Bestzeit', value: stats.bestTime[difficulty] !== null ? formatTimer(stats.bestTime[difficulty]!) : '—' },
    { label: isAr ? 'X-سودوكو' : 'X-Sudoku', value: stats.variantWins.x || 0 },
    { label: isAr ? 'بلا أخطاء' : 'Fehlerfrei', value: stats.noErrors || 0 },
    { label: isAr ? 'إتقان' : 'Perfekt', value: stats.flawless || 0 },
    { label: isAr ? 'يومية' : 'Daily', value: stats.dailyDone.length || 0 },
  ];

  const todayDone = stats.dailyDone.includes(todayKey());
  const sudokuOptions = [
    {
      key: 'variant', label: isAr ? 'النمط' : 'Variante',
      choices: [
        { value: 'classic', label: variantLabels.classic[isAr ? 'ar' : 'de'] },
        { value: 'x', label: variantLabels.x[isAr ? 'ar' : 'de'] },
      ],
      current: variant,
      onChange: (v: string) => newGame(difficulty, v as Variant),
    },
    {
      key: 'difficulty', label: isAr ? 'الصعوبة' : 'Schwierigkeit',
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
      key: 'daily', label: isAr ? 'تحدّي اليوم' : 'Tageschallenge',
      choices: [
        { value: 'no', label: isAr ? 'عادي' : 'Normal' },
        { value: 'yes', label: todayDone ? (isAr ? 'تم اليوم' : 'Heute fertig') : (isAr ? 'ابدأ اليوم' : 'Heute starten') },
      ],
      current: isDaily ? 'yes' : 'no',
      onChange: (v: string) => { if (v === 'yes' && !todayDone) newGame(difficulty, variant, true); else newGame(difficulty, variant, false); },
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
      {errorCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full">
          <X className="w-3 h-3" />{errorCount}
        </div>
      )}
    </div>
  );

  return (
    <GameShell
      title={t('games.sudoku')}
      icon={Grid3X3}
      accentColor="hsl(199, 89%, 48%)"
      rules={sudokuRules}
      stats={sudokuStats}
      options={sudokuOptions}
      headerRight={timerDisplay}
    >
      {/* Variant + Daily banner */}
      {variant === 'x' && !solved && (
        <div className="text-center py-1.5 mb-2 rounded-2xl bg-purple-500/10 max-w-[360px] mx-auto flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-300" />
          <span className="text-purple-200 font-bold text-[11px]">X-Sudoku</span>
          <span className="text-purple-200/60 text-[10px]">{isAr ? 'القطران 1-9 أيضاً' : 'Diagonalen 1-9'}</span>
        </div>
      )}
      {isDaily && !solved && (
        <div className="text-center py-2 mb-2 rounded-2xl bg-amber-500/10 max-w-[360px] mx-auto flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4 text-amber-300" />
          <span className="text-amber-200 font-bold text-xs">{isAr ? 'تحدّي اليوم' : 'Tageschallenge'}</span>
          <span className="text-amber-200/60 text-xs tabular-nums">{todayKey()}</span>
        </div>
      )}

      {solved && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center py-3 mb-3 rounded-2xl bg-primary/12 max-w-[360px] mx-auto flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5 text-primary stroke-[1.8]" />
          <span className="text-primary font-bold">{t('sudoku.solved')}</span>
          <span className="text-primary/70 text-sm font-medium">{formatTimer(timer)}</span>
          {hintsUsed === 0 && errorCount === 0 && <span className="text-amber-400 text-xs">★ {isAr ? 'إتقان' : 'Perfekt'}</span>}
        </motion.div>
      )}

      {/* Board */}
      <div className="max-w-[360px] mx-auto mb-4 relative">
        <AnimatePresence>
          {(!gameStarted || isPaused) && !solved && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 rounded-2xl bg-card/95 backdrop-blur-sm flex items-center justify-center"
              onClick={!gameStarted ? startGame : togglePause}
            >
              <div className="flex flex-col items-center gap-3">
                <Play className="w-10 h-10 text-primary stroke-[1.5]" />
                <span className="text-muted-foreground font-medium text-sm">
                  {!gameStarted ? (isAr ? 'اضغط للبدء' : 'Tippe zum Starten') : (isAr ? 'اضغط للمتابعة' : 'Tippe zum Fortsetzen')}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-2xl overflow-hidden border border-border/40 relative">
          {/* X-Sudoku diagonal overlay */}
          {variant === 'x' && (
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-10" preserveAspectRatio="none" viewBox="0 0 9 9">
              <line x1="0" y1="0" x2="9" y2="9" stroke="#a855f7" strokeWidth="0.04" strokeDasharray="0.2,0.15" opacity="0.45" />
              <line x1="9" y1="0" x2="0" y2="9" stroke="#a855f7" strokeWidth="0.04" strokeDasharray="0.2,0.15" opacity="0.45" />
            </svg>
          )}

          <div className="grid grid-cols-9">
            {board.map((row, ri) => row.map((cell, ci) => {
              const isOrig = original.has(`${ri}-${ci}`);
              const hasError = errors.has(`${ri}-${ci}`);
              const cellNotes = notes[ri][ci];
              const borderR = ci % 3 === 2 && ci !== 8 ? 'border-e-[2px] border-e-foreground/15' : 'border-e border-e-border/30';
              const borderB = ri % 3 === 2 && ri !== 8 ? 'border-b-[2px] border-b-foreground/15' : 'border-b border-b-border/30';

              return (
                <button key={`${ri}-${ci}`} onClick={() => handleCellClick(ri, ci)}
                  className={`aspect-square flex items-center justify-center relative transition-colors duration-100
                    ${borderR} ${borderB} ${getHighlight(ri, ci)}
                    ${!solved && !isPaused ? 'cursor-pointer active:bg-primary/15' : ''}`}
                >
                  {cell !== null ? (
                    <span className={`text-[15px] font-semibold select-none ${
                      isOrig ? 'text-foreground' : hasError ? 'text-destructive' : 'text-primary'
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

      {/* Number pad */}
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

        {/* Tool row */}
        <div className="flex justify-center gap-2">
          <button onClick={handleUndo} disabled={history.length === 0}
            title={isAr ? 'تراجع' : 'Rückgängig'}
            className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-20 active:scale-90">
            <Undo2 className="w-5 h-5 text-foreground stroke-[1.8]" />
          </button>
          <button onClick={handleHint} disabled={hintsUsed >= maxHints}
            title={isAr ? 'تلميح' : 'Tipp'}
            className="relative w-11 h-11 rounded-full flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-20 active:scale-90">
            <Lightbulb className="w-5 h-5 text-foreground stroke-[1.8]" />
            {hintsUsed < maxHints && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary/15 text-primary text-[8px] font-bold flex items-center justify-center">
                {maxHints - hintsUsed}
              </span>
            )}
          </button>
          <button onClick={() => setNoteMode(!noteMode)}
            title={isAr ? 'ملاحظات' : 'Notizen'}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
              noteMode ? 'bg-primary/15 text-primary' : 'hover:bg-secondary text-foreground'
            }`}>
            <PenLine className="w-5 h-5 stroke-[1.8]" />
          </button>
          <button onClick={handleSmartHint}
            title={isAr ? 'تلميح ذكي' : 'Schlauer Tipp'}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 transition-colors active:scale-90">
            <Brain className="w-5 h-5 stroke-[1.8]" />
          </button>
          <button onClick={autoNotes ? clearAutoNotes : fillAutoNotes}
            title={isAr ? 'علامات تلقائية' : 'Auto-Notizen'}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
              autoNotes ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-secondary text-foreground'
            }`}>
            <Zap className="w-5 h-5 stroke-[1.8]" />
          </button>
          <button onClick={handleErase}
            title={isAr ? 'مسح' : 'Löschen'}
            className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-90">
            <Eraser className="w-5 h-5 text-foreground stroke-[1.8]" />
          </button>
        </div>
      </div>

      {/* Smart Hint dialog: explains the next applicable solving technique
          using the same logical solver an expert uses internally. The user
          can then choose to apply it or just learn from it. */}
      <AnimatePresence>
        {smartHint && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setSmartHint(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-purple-500/30 bg-card p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-purple-300" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-purple-300/80 font-bold">
                    {isAr ? 'تقنية الحل' : 'Lösungstechnik'}
                  </p>
                  <h3 className="text-base font-black text-foreground">
                    {isAr ? TECHNIQUE_LABELS[smartHint.technique].ar : TECHNIQUE_LABELS[smartHint.technique].de}
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <span key={i} className={`w-1.5 h-1 rounded-full ${
                        i < TECHNIQUE_LABELS[smartHint.technique].difficulty
                          ? 'bg-purple-400' : 'bg-zinc-700'
                      }`} />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-sm text-foreground/90 leading-relaxed mb-4">
                {isAr ? smartHint.explanationAr : smartHint.explanationDe}
              </p>

              {/* Effect summary */}
              {smartHint.placements.length > 0 && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-2.5 mb-3 text-[11px]">
                  <p className="font-bold text-emerald-300 mb-0.5">
                    {isAr ? 'سيضع الرقم:' : 'Zahl setzen:'}
                  </p>
                  {smartHint.placements.map((p, i) => (
                    <p key={i} className="text-emerald-200/90 font-mono">
                      ({p.r + 1}, {p.c + 1}) ← <b>{p.value}</b>
                    </p>
                  ))}
                </div>
              )}
              {smartHint.eliminations.length > 0 && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-2.5 mb-3 text-[11px]">
                  <p className="font-bold text-rose-300 mb-0.5">
                    {isAr ? `سيلغي ${smartHint.eliminations.length} مرشحاً` : `Streicht ${smartHint.eliminations.length} Kandidaten`}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSmartHint(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-foreground font-bold text-sm"
                >
                  {isAr ? 'فهمت' : 'Verstanden'}
                </button>
                {(smartHint.placements.length > 0 || smartHint.eliminations.length > 0) && (
                  <button
                    onClick={applySmartHint}
                    className="flex-1 py-2.5 rounded-xl font-black text-purple-950 text-sm"
                    style={{ }}
                  >
                    {isAr ? 'طبّقها' : 'Anwenden'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}
