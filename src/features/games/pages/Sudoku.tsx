import { AnimatePresence,motion } from 'framer-motion';
import React, { useCallback,useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useApp } from '@/contexts/AppContext';
import GameShell from '@/features/games/components/GameShell';
import { playSfx, vibrate } from '@/features/games/utils/gameFeedback';
import {
  findConflicts as gridConflicts,
  generatePuzzle,
  legalCandidates,
  type SudokuDifficulty,
  type SudokuVariant,
} from '@/features/games/utils/sudokuGenerate';
import { nextHint, SolverHint, TECHNIQUE_LABELS } from '@/features/games/utils/sudokuSolver';
import { Brain,Calendar, Clock, Eraser, Grid3X3, Lightbulb, Pause, PenLine, Play, Sparkles, Trophy, Undo2, X, Zap } from '@/lib/icons';

type Board = (number | null)[][];
type Difficulty = SudokuDifficulty;
type Variant = SudokuVariant;

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
import { getGameProgress,saveGameProgress } from '../api';
import MatchReportDialog from '../components/MatchReportDialog';
import { dayKey, type GameMode, type MatchReport, reportMatch } from '../progression';

function saveStats(stats: SudokuStats) {
  localStorage.setItem('sudoku-stats', JSON.stringify(stats));
  saveGameProgress('sudoku', stats).catch(console.error);
}

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

function saveGameState(state: SavedSudokuGame) {
  localStorage.setItem('sudoku-game-state', JSON.stringify(state));
  saveGameProgress('sudoku-game-state', state).catch(console.error);
}
function loadGameState(): SavedSudokuGame | null {
  const saved = localStorage.getItem('sudoku-game-state');
  if (!saved) return null;
  try { return JSON.parse(saved); } catch { return null; }
}
function clearGameState() {
  localStorage.removeItem('sudoku-game-state');
  saveGameProgress('sudoku-game-state', {}).catch(console.error);
}

// ============================================================================
// Conflict detection → delegated to utils/sudokuGenerate.ts (gridConflicts).
// ============================================================================
function todayKey(): string { const d = new Date(); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`; }
function onMainDiag(r: number, c: number) { return r === c; }
function onAntiDiag(r: number, c: number) { return r + c === 8; }


// ============================================================================
// Component
// ============================================================================
export default function SudokuPage() {
  const { t, } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven mode: /games/sudoku?mode=x|classic|daily&difficulty=hard.
  // The hub's mode cards link here; the page honors the deep link once on
  // mount (user choices afterwards win).
  const initialMode = useMemo(() => {
    const m = searchParams.get('mode');
    return m === 'x' || m === 'classic' || m === 'mini' || m === 'daily' ? m : null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const initialDifficulty = useMemo(() => {
    const d = searchParams.get('difficulty');
    return d === 'easy' || d === 'medium' || d === 'hard' || d === 'expert' ? d : null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const savedGame = useMemo(() => loadGameState(), []);

  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty || savedGame?.difficulty || 'easy');
  const [variant, setVariant] = useState<Variant>(initialMode === 'x' ? 'x' : initialMode === 'mini' ? 'mini' : savedGame?.variant || 'classic');
  const [gameData, setGameData] = useState(() => {
    if (savedGame) return savedGame.gameData;
    const gen = generatePuzzle(initialDifficulty || 'easy', initialMode === 'x' ? 'x' : initialMode === 'mini' ? 'mini' : 'classic', undefined);
    return gen;
  });
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
  // Post-session reward screen. The game used to grant progress silently.
  const [matchReport, setMatchReport] = useState<MatchReport | null>(null);

  useEffect(() => {
    const syncStats = async () => {
      try {
        const cloudStats = await getGameProgress('sudoku');
        if (cloudStats) {
          localStorage.setItem('sudoku-stats', JSON.stringify(cloudStats));
          setStats(prev => ({ ...prev, ...cloudStats }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    syncStats();
  }, []);

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

    // Feed the shared progression spine. `mini` is a smaller board rather than a
    // distinct ruleset, so it reports as classic.
    const mode: GameMode = isDaily ? 'sudoku-daily' : var_ === 'x' ? 'sudoku-x' : 'sudoku-classic';
    setMatchReport(
      reportMatch({
        game: 'sudoku',
        mode,
        outcome: 'win',
        difficulty: diff,
        durationMs: time * 1000,
        mistakes: errs,
        hints,
        // The record for a sudoku mode is the fastest clean solve.
        record: { value: time, lowerIsBetter: true },
      }),
    );
  };

  const newGame = (diff: Difficulty, var_: Variant = variant, daily = false) => {
    clearGameState();
    setDifficulty(diff);
    setVariant(var_);
    setIsDaily(daily);
    localStorage.setItem('sudoku-is-daily', String(daily));
    const data = daily
      ? generatePuzzle(diff, var_, `daily-${todayKey()}-${diff}-${var_}`)
      : generatePuzzle(diff, var_);
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
      if (board[r][c] === null) {
        const cands = legalCandidates(board, r, c, variant);
        newNotes[r][c] = new Set([...cands].map(String));
      }
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

  // Keyboard play: arrows move the selection, 1-9 place (or pencil-mark with
  // the note toggle), Backspace/Delete/Erase clears, N toggles notes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isPaused || solved || !gameStarted) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const move = (dr: number, dc: number) => {
        setSelected(prev => {
          const base = prev ?? [variant === 'mini' ? 5 : 8, 0];
          const nr = Math.min(variant === 'mini' ? 5 : 8, Math.max(0, base[0] + dr));
          const nc = Math.min(variant === 'mini' ? 5 : 8, Math.max(0, base[1] + dc));
          return [nr, nc];
        });
        e.preventDefault();
      };
      switch (e.key) {
        case 'ArrowUp': move(-1, 0); break;
        case 'ArrowDown': move(1, 0); break;
        case 'ArrowLeft': move(0, -1); break;
        case 'ArrowRight': move(0, 1); break;
        case 'Backspace': case 'Delete': handleErase(); break;
        case 'n': case 'N': setNoteMode(m => !m); break;
        default: {
          if (/^[1-9]$/.test(e.key)) {
            handleNumberInput(Number(e.key));
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, solved, gameStarted, variant, handleNumberInput]);

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const conflicts = useMemo(() => gridConflicts(board, variant), [board, variant]);

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
    const digits = variant === 'mini' ? 6 : 9;
    for (let n = 1; n <= digits; n++) {
      let count = 0;
      for (let r = 0; r <= (variant === 'mini' ? 5 : 8); r++) for (let cc = 0; cc <= (variant === 'mini' ? 5 : 8); cc++) if (board[r][cc] === n) count++;
      c[n] = digits - count;
    }
    return c;
  }, [board, variant]);

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  const diffLabels: Record<Difficulty, string> = {
    easy: t('sudoku.easy'),
    medium: t('sudoku.medium'),
    hard: t('sudoku.hard'),
    expert: 'محترف',
  };
  const variantLabels: Record<Variant, { ar: string; }> = {
    classic: { ar: 'كلاسيكي', },
    x: { ar: 'X-سودوكو', },
    mini: { ar: 'مصغّر 6×6', },
  };

  const sudokuRules = [
    'املأ الشبكة بالأرقام من 1 إلى 9',
    'كل صف وعمود ومربع 3×3 يحتوي 1-9 بدون تكرار',
    variant === 'x' ? 'X-سودوكو: القطران الكبيران أيضاً يحتويان 1-9' : 'استخدم الملاحظات للأرقام المحتملة',
    'علامات تلقائية تساعدك (للصعب فقط)',
    'أخطاء أقل + بدون تلميحات = إتقان',
  ];

  const sudokuStats = [
    { label: 'فوز', value: stats.gamesWon },
    { label: 'نسبة الفوز', value: `${winRate}%` },
    { label: 'أفضل سلسلة', value: stats.bestStreak },
    { label: 'أفضل وقت', value: stats.bestTime[difficulty] !== null ? formatTimer(stats.bestTime[difficulty]!) : '—' },
    { label: 'X-سودوكو', value: stats.variantWins.x || 0 },
    { label: 'بلا أخطاء', value: stats.noErrors || 0 },
    { label: 'إتقان', value: stats.flawless || 0 },
    { label: 'يومية', value: stats.dailyDone.length || 0 },
  ];

  const todayDone = stats.dailyDone.includes(todayKey());
  const sudokuOptions = [
    {
      key: 'variant', label: 'النمط',
      choices: [
        { value: 'classic', label: variantLabels.classic['ar'] },
        { value: 'x', label: variantLabels.x['ar'] },
      ],
      current: variant,
      onChange: (v: string) => newGame(difficulty, v as Variant),
    },
    {
      key: 'difficulty', label: 'الصعوبة',
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
      key: 'daily', label: 'تحدّي اليوم',
      choices: [
        { value: 'no', label: 'عادي' },
        { value: 'yes', label: todayDone ? ('تم اليوم') : ('ابدأ اليوم') },
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
      <div className="flex items-center gap-1 text-mini text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full tabular-nums">
        <Clock className="w-3 h-3" />{formatTimer(timer)}
      </div>
      {errorCount > 0 && (
        <div className="flex items-center gap-1 text-mini text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full">
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
          <span className="text-purple-200 font-bold text-micro">X-Sudoku</span>
          <span className="text-purple-200/60 text-micro">{'القطران 1-9 أيضاً'}</span>
        </div>
      )}
      {isDaily && !solved && (
        <div className="text-center py-2 mb-2 rounded-2xl bg-amber-500/10 max-w-[360px] mx-auto flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4 text-amber-300" />
          <span className="text-amber-200 font-bold text-mini">{'تحدّي اليوم'}</span>
          <span className="text-amber-200/60 text-mini tabular-nums">{todayKey()}</span>
        </div>
      )}

      {solved && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center py-3 mb-3 rounded-2xl bg-primary/12 max-w-[360px] mx-auto flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5 text-primary stroke-[1.8]" />
          <span className="text-primary font-bold">{t('sudoku.solved')}</span>
          <span className="text-primary/70 text-meta font-medium">{formatTimer(timer)}</span>
          {hintsUsed === 0 && errorCount === 0 && <span className="text-amber-400 text-mini">★ {'إتقان'}</span>}
        </motion.div>
      )}

      {/* Board */}
      <div className="max-w-[360px] mx-auto mb-4 relative">
        <AnimatePresence>
          {(!gameStarted || isPaused) && !solved && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-sticky rounded-2xl bg-card flex items-center justify-center"
              onClick={!gameStarted ? startGame : togglePause}
            >
              <div className="flex flex-col items-center gap-3">
                <Play className="w-10 h-10 text-primary stroke-[1.5]" />
                <span className="text-muted-foreground font-medium text-meta">
                  {!gameStarted ? ('اضغط للبدء') : ('اضغط للمتابعة')}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-2xl overflow-hidden border border-border/40 relative">
          {/* X-Sudoku diagonal overlay */}
          {variant === 'x' && (
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-raised" preserveAspectRatio="none" viewBox="0 0 9 9">
              <line x1="0" y1="0" x2="9" y2="9" stroke="#a855f7" strokeWidth="0.04" strokeDasharray="0.2,0.15" opacity="0.45" />
              <line x1="9" y1="0" x2="0" y2="9" stroke="#a855f7" strokeWidth="0.04" strokeDasharray="0.2,0.15" opacity="0.45" />
            </svg>
          )}

          <div className={`grid ${variant === 'mini' ? 'grid-cols-6' : 'grid-cols-9'}`}>
            {board.map((row, ri) => row.map((cell, ci) => {
              const isOrig = original.has(`${ri}-${ci}`);
              const hasError = errors.has(`${ri}-${ci}`);
              const cellNotes = notes[ri][ci];
              const boxW = variant === 'mini' ? 3 : 3;
              const last = variant === 'mini' ? 5 : 8;
              // Mini 6×6 boxes are 2 rows × 3 cols; classic is 3×3.
              const thickCol = variant === 'mini'
                ? (ci % 3 === 2 && ci !== last)
                : (ci % 3 === 2 && ci !== last);
              const thickRow = variant === 'mini'
                ? (ri % 2 === 1 && ri !== last)
                : (ri % 3 === 2 && ri !== last);
              const borderR = thickCol ? 'border-e-[2px] border-e-foreground/15' : 'border-e border-e-border/30';
              const borderB = thickRow ? 'border-b-[2px] border-b-foreground/15' : 'border-b border-b-border/30';

              return (
                <button key={`${ri}-${ci}`} onClick={() => handleCellClick(ri, ci)}
                  className={`aspect-square flex items-center justify-center relative transition-colors duration-100
                    ${borderR} ${borderB} ${getHighlight(ri, ci)}
                    ${!solved && !isPaused ? 'cursor-pointer active:bg-primary/15' : ''}`}
                >
                  {cell !== null ? (
                    <span className={`text-meta font-semibold select-none ${
                      isOrig ? 'text-foreground' : hasError ? 'text-destructive' : 'text-primary'
                    }`}>
                      {cell}
                    </span>
                  ) : cellNotes.size > 0 ? (
                    <div className={`grid gap-0 text-micro text-muted-foreground/70 leading-none w-full h-full p-[2px] ${variant === 'mini' ? 'grid-cols-3' : 'grid-cols-3'}`}>
                      {(variant === 'mini' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7, 8, 9]).map(n => (
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
        <div className={`grid gap-1 ${variant === 'mini' ? 'grid-cols-6' : 'grid-cols-9'}`}>
          {(variant === 'mini' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7, 8, 9]).map(n => {
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
                <span className="text-lead font-bold leading-none">{n}</span>
                <span className={`text-micro mt-0.5 leading-none font-medium ${
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
            title={'تراجع'}
            className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-20 active:scale-90">
            <Undo2 className="w-5 h-5 text-foreground stroke-[1.8]" />
          </button>
          <button onClick={handleHint} disabled={hintsUsed >= maxHints}
            title={'تلميح'}
            className="relative w-11 h-11 rounded-full flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-20 active:scale-90">
            <Lightbulb className="w-5 h-5 text-foreground stroke-[1.8]" />
            {hintsUsed < maxHints && (
              <span className="absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-primary/15 text-primary text-micro font-bold flex items-center justify-center">
                {maxHints - hintsUsed}
              </span>
            )}
          </button>
          <button onClick={() => setNoteMode(!noteMode)}
            title={'ملاحظات'}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
              noteMode ? 'bg-primary/15 text-primary' : 'hover:bg-secondary text-foreground'
            }`}>
            <PenLine className="w-5 h-5 stroke-[1.8]" />
          </button>
          <button onClick={handleSmartHint}
            title={'تلميح ذكي'}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 transition-colors active:scale-90">
            <Brain className="w-5 h-5 stroke-[1.8]" />
          </button>
          <button onClick={autoNotes ? clearAutoNotes : fillAutoNotes}
            title={'علامات تلقائية'}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
              autoNotes ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-secondary text-foreground'
            }`}>
            <Zap className="w-5 h-5 stroke-[1.8]" />
          </button>
          <button onClick={handleErase}
            title={'مسح'}
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
            className="fixed inset-0 z-drawer bg-black/70 flex items-end sm:items-center justify-center p-4"
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
                  <p className="text-micro uppercase tracking-wider text-purple-300/80 font-bold">
                    {'تقنية الحل'}
                  </p>
                  <h3 className="text-body font-black text-foreground">
                    {TECHNIQUE_LABELS[smartHint.technique].ar}
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

              <p className="text-meta text-foreground/90 leading-relaxed mb-4">
                {smartHint.explanationAr}
              </p>

              {/* Effect summary */}
              {smartHint.placements.length > 0 && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-2.5 mb-3 text-micro">
                  <p className="font-bold text-emerald-300 mb-0.5">
                    {'سيضع الرقم:'}
                  </p>
                  {smartHint.placements.map((p, i) => (
                    <p key={i} className="text-emerald-200/90 font-mono">
                      ({p.r + 1}, {p.c + 1}) ← <b>{p.value}</b>
                    </p>
                  ))}
                </div>
              )}
              {smartHint.eliminations.length > 0 && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-2.5 mb-3 text-micro">
                  <p className="font-bold text-rose-300 mb-0.5">
                    {`سيلغي ${smartHint.eliminations.length} مرشحاً`}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSmartHint(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-foreground font-bold text-meta"
                >
                  {'فهمت'}
                </button>
                {(smartHint.placements.length > 0 || smartHint.eliminations.length > 0) && (
                  <button
                    onClick={applySmartHint}
                    className="flex-1 py-2.5 rounded-xl font-black text-purple-950 text-meta"
                    style={{ }}
                  >
                    {'طبّقها'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <MatchReportDialog report={matchReport} onClose={() => setMatchReport(null)} day={dayKey()} />
    </GameShell>
  );
}
