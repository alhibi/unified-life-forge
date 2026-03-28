import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Lightbulb, Clock, Eraser, PenLine, Trophy, Undo2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Board = (number | null)[][];
type Difficulty = 'easy' | 'medium' | 'hard';

interface SudokuStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: Record<Difficulty, number | null>;
  currentStreak: number;
  bestStreak: number;
}

function loadStats(): SudokuStats {
  const saved = localStorage.getItem('sudoku-stats');
  return saved ? JSON.parse(saved) : {
    gamesPlayed: 0, gamesWon: 0,
    bestTime: { easy: null, medium: null, hard: null },
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
  const [notes, setNotes] = useState<Set<string>[][]>(() =>
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>()))
  );
  const [noteMode, setNoteMode] = useState(false);
  const [stats, setStats] = useState<SudokuStats>(loadStats);
  const [showStats, setShowStats] = useState(false);
  const [history, setHistory] = useState<{ board: Board; errors: Set<string> }[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const maxHints = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 3 : 1;

  const original = useMemo(() => {
    const s = new Set<string>();
    gameData.puzzle.forEach((r, ri) => r.forEach((v, ci) => { if (v !== null) s.add(`${ri}-${ci}`); }));
    return s;
  }, [gameData]);

  useEffect(() => {
    if (!isRunning || solved) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, solved]);

  const recordWin = (time: number, diff: Difficulty) => {
    const s = { ...stats };
    s.gamesPlayed++;
    s.gamesWon++;
    s.currentStreak++;
    if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
    if (s.bestTime[diff] === null || time < s.bestTime[diff]!) s.bestTime[diff] = time;
    setStats(s);
    saveStats(s);
  };

  const newGame = (diff: Difficulty) => {
    setDifficulty(diff);
    const data = createPuzzle(diff);
    setGameData(data);
    setBoard(data.puzzle.map(r => [...r]));
    setSelected(null); setErrors(new Set()); setSolved(false); setTimer(0); setIsRunning(true);
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<string>())));
    setNoteMode(false); setHistory([]); setHintsUsed(0);
  };

  const handleCellClick = (r: number, c: number) => { if (!original.has(`${r}-${c}`)) setSelected([r, c]); else setSelected([r, c]); };

  const handleNumberInput = useCallback((num: number) => {
    if (!selected || solved) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;
    if (noteMode) {
      const nn = notes.map(row => row.map(s => new Set(s)));
      const k = num.toString();
      if (nn[r][c].has(k)) nn[r][c].delete(k); else nn[r][c].add(k);
      setNotes(nn); return;
    }
    // Save history for undo
    setHistory(prev => [...prev, { board: board.map(row => [...row]), errors: new Set(errors) }]);
    const nb = board.map(row => [...row]);
    nb[r][c] = num;
    setBoard(nb);
    // Clear notes for this cell
    const nn = notes.map(row => row.map(s => new Set(s)));
    nn[r][c].clear();
    setNotes(nn);

    const ne = new Set<string>();
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++)
      if (nb[i][j] !== null && nb[i][j] !== gameData.solution[i][j]) ne.add(`${i}-${j}`);
    setErrors(ne);
    if (ne.size === 0 && nb.every(row => row.every(cell => cell !== null))) {
      setSolved(true); setIsRunning(false);
      recordWin(timer, difficulty);
    }
  }, [selected, solved, original, noteMode, notes, board, errors, gameData, timer, difficulty, stats]);

  const handleErase = () => {
    if (!selected) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;
    setHistory(prev => [...prev, { board: board.map(row => [...row]), errors: new Set(errors) }]);
    const nb = board.map(row => [...row]); nb[r][c] = null; setBoard(nb);
    errors.delete(`${r}-${c}`); setErrors(new Set(errors));
  };

  const handleHint = () => {
    if (!selected || hintsUsed >= maxHints) return;
    const [r, c] = selected;
    if (original.has(`${r}-${c}`)) return;
    setHistory(prev => [...prev, { board: board.map(row => [...row]), errors: new Set(errors) }]);
    const nb = board.map(row => [...row]); nb[r][c] = gameData.solution[r][c]; setBoard(nb);
    errors.delete(`${r}-${c}`); setErrors(new Set(errors));
    setHintsUsed(h => h + 1);
    // Check win
    const ne = new Set<string>();
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++)
      if (nb[i][j] !== null && nb[i][j] !== gameData.solution[i][j]) ne.add(`${i}-${j}`);
    if (ne.size === 0 && nb.every(row => row.every(cell => cell !== null))) {
      setSolved(true); setIsRunning(false);
      recordWin(timer, difficulty);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setBoard(prev.board);
    setErrors(prev.errors);
    setHistory(h => h.slice(0, -1));
  };

  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const getHighlight = (r: number, c: number) => {
    if (!selected) return '';
    const [sr, sc] = selected;
    if (r === sr && c === sc) return 'ring-2 ring-primary bg-primary/15';
    if (r === sr || c === sc) return 'bg-primary/5';
    if (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3)) return 'bg-primary/5';
    if (board[r][c] !== null && board[sr][sc] !== null && board[r][c] === board[sr][sc]) return 'bg-primary/8';
    return '';
  };

  // Count remaining numbers
  const numberCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let n = 1; n <= 9; n++) {
      let count = 0;
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board[r][c] === n) count++;
      counts[n] = count;
    }
    return counts;
  }, [board]);

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 max-w-sm mx-auto">
        <button onClick={() => navigate('/games')} className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center active:scale-90 transition-transform">
          <ArrowLeft className={`w-4.5 h-4.5 text-foreground stroke-[1.8] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-xl font-bold text-foreground flex-1">{t('games.sudoku')}</h1>
        <button onClick={() => setShowStats(!showStats)} className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
          <Trophy className={`w-4.5 h-4.5 stroke-[1.8] ${showStats ? 'text-primary' : 'text-muted-foreground'}`} />
        </button>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-2xl tabular-nums">
          <Clock className="w-3.5 h-3.5 stroke-[1.8]" />{formatTimer(timer)}
        </div>
      </div>

      {/* Stats Panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden max-w-sm mx-auto mb-4"
          >
            <div className="premium-card-elevated p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary stroke-[1.8]" />{t('stats.title')}
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="text-center p-2.5 rounded-xl bg-secondary/60">
                  <div className="text-xl font-bold text-foreground">{stats.gamesWon}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t('stats.wins')}</div>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-secondary/60">
                  <div className="text-xl font-bold text-foreground">{winRate}%</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t('stats.winRate')}</div>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-secondary/60">
                  <div className="text-xl font-bold text-primary">{stats.bestStreak}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t('stats.streak')}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                  <div key={d} className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/40 text-xs">
                    <span className="text-muted-foreground">{t(`sudoku.${d}`)} {t('stats.best')}</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {stats.bestTime[d] !== null ? formatTimer(stats.bestTime[d]!) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Difficulty */}
      <div className="flex gap-2 mb-4 justify-center">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
          <button key={d} onClick={() => newGame(d)}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${
              difficulty === d ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-secondary-foreground'
            }`}
          >{t(`sudoku.${d}`)}</button>
        ))}
      </div>

      {solved && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center py-3 mb-3 rounded-2xl bg-primary/10 text-primary font-bold max-w-sm mx-auto flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5 stroke-[1.8]" />
          {t('sudoku.solved')} — {formatTimer(timer)}
        </motion.div>
      )}

      {/* Board */}
      <div className="max-w-[340px] mx-auto mb-4">
        <div className="premium-card-intense p-2">
          <div className="grid grid-cols-9">
            {board.map((row, ri) => row.map((cell, ci) => {
              const isOrig = original.has(`${ri}-${ci}`);
              const hasError = errors.has(`${ri}-${ci}`);
              const cellNotes = notes[ri][ci];
              return (
                <button key={`${ri}-${ci}`} onClick={() => handleCellClick(ri, ci)}
                  className={`aspect-square flex items-center justify-center text-[14px] font-semibold relative transition-colors
                    ${ci % 3 === 2 && ci !== 8 ? 'border-e-2 border-e-primary/20' : 'border-e border-e-border/50'}
                    ${ri % 3 === 2 && ri !== 8 ? 'border-b-2 border-b-primary/20' : 'border-b border-b-border/50'}
                    ${isOrig ? 'text-foreground font-bold' : hasError ? 'text-destructive' : 'text-primary'}
                    ${getHighlight(ri, ci)}
                    ${!isOrig && !solved ? 'cursor-pointer' : ''}
                  `}
                >
                  {cell !== null ? cell : cellNotes.size > 0 ? (
                    <div className="grid grid-cols-3 gap-0 text-[5px] text-muted-foreground leading-none w-full h-full p-0.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <span key={n} className="flex items-center justify-center">{cellNotes.has(n.toString()) ? n : ''}</span>
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
      <div className="max-w-[340px] mx-auto space-y-3">
        <div className="grid grid-cols-9 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
            const isComplete = numberCounts[n] >= 9;
            return (
              <button key={n} onClick={() => handleNumberInput(n)} disabled={isComplete}
                className={`aspect-square rounded-xl font-bold text-base transition-all active:scale-90 ${
                  isComplete
                    ? 'bg-secondary/40 text-muted-foreground/30 cursor-not-allowed'
                    : 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'
                }`}>
                {n}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 justify-center flex-wrap">
          <button onClick={handleUndo} disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium disabled:opacity-30 active:scale-95 transition-all">
            <Undo2 className="w-4 h-4 stroke-[1.8]" />
          </button>
          <button onClick={handleErase} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium active:scale-95 transition-all">
            <Eraser className="w-4 h-4 stroke-[1.8]" />
          </button>
          <button onClick={() => setNoteMode(!noteMode)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
              noteMode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          ><PenLine className="w-4 h-4 stroke-[1.8]" />{language === 'ar' ? 'ملاحظات' : 'Notes'}</button>
          <button onClick={handleHint} disabled={hintsUsed >= maxHints}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium disabled:opacity-30 active:scale-95 transition-all">
            <Lightbulb className="w-4 h-4 stroke-[1.8]" />
            <span className="text-[10px] text-muted-foreground">{maxHints - hintsUsed}</span>
          </button>
        </div>
        <div className="flex justify-center">
          <button onClick={() => newGame(difficulty)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:scale-95 transition-transform">
            <RefreshCw className="w-4 h-4 stroke-[1.8]" />{t('sudoku.new')}
          </button>
        </div>
      </div>
    </div>
  );
}
