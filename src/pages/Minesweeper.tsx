import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Flag, Play, Pause, Bomb, Lightbulb, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSfx, vibrate, isMuted, setMuted } from '@/utils/gameFeedback';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
type CellState = 'hidden' | 'revealed' | 'flagged';

interface Cell {
  mine: boolean;
  adjacent: number;
  state: CellState;
}

interface MineStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: Record<Difficulty, number | null>;
  currentStreak: number;
  bestStreak: number;
  flawless: number;
}

const CONFIGS: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  easy:   { rows: 9,  cols: 9,  mines: 10 },
  medium: { rows: 12, cols: 10, mines: 22 },
  hard:   { rows: 14, cols: 10, mines: 35 },
  expert: { rows: 16, cols: 10, mines: 50 },
};

function loadStats(): MineStats {
  try {
    const s = JSON.parse(localStorage.getItem('mine-stats') || '{}');
    return {
      gamesPlayed: 0, gamesWon: 0, flawless: 0,
      currentStreak: 0, bestStreak: 0, ...s,
      bestTime: { easy: null, medium: null, hard: null, expert: null, ...(s.bestTime || {}) },
    };
  } catch {
    return { gamesPlayed: 0, gamesWon: 0, flawless: 0, bestTime: { easy: null, medium: null, hard: null, expert: null }, currentStreak: 0, bestStreak: 0 };
  }
}
function saveStatsFn(s: MineStats) { localStorage.setItem('mine-stats', JSON.stringify(s)); }

function createBoard(diff: Difficulty, safeR?: number, safeC?: number): Cell[][] {
  const { rows, cols, mines } = CONFIGS[diff];
  const board: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, adjacent: 0, state: 'hidden' as CellState }))
  );
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (board[r][c].mine) continue;
    if (safeR !== undefined && Math.abs(r - safeR) <= 1 && Math.abs(c - safeC!) <= 1) continue;
    board[r][c].mine = true;
    placed++;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
      }
      board[r][c].adjacent = count;
    }
  }
  return board;
}

interface SavedMine {
  difficulty: Difficulty;
  board: Cell[][];
  gameOver: boolean;
  won: boolean;
  timer: number;
  gameStarted: boolean;
  firstClick: boolean;
  hintsUsed: number;
}
function saveMineGame(d: SavedMine) { localStorage.setItem('mine-game-state', JSON.stringify(d)); }
function loadMineGame(): SavedMine | null {
  try { const s = localStorage.getItem('mine-game-state'); return s ? JSON.parse(s) : null; } catch { return null; }
}
function clearMineGame() { localStorage.removeItem('mine-game-state'); }

export default function MinesweeperPage() {
  const { dir, language } = useApp();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const saved = useMemo(() => loadMineGame(), []);

  const [difficulty, setDifficulty] = useState<Difficulty>(saved?.difficulty || 'easy');
  const [board, setBoard] = useState<Cell[][]>(() => saved?.board || createBoard('easy'));
  const [gameOver, setGameOver] = useState(saved?.gameOver || false);
  const [won, setWon] = useState(saved?.won || false);
  const [timer, setTimer] = useState(saved?.timer || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(saved?.gameStarted || false);
  const [isPaused, setIsPaused] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [firstClick, setFirstClick] = useState(saved?.firstClick ?? true);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed || 0);
  const [hintCell, setHintCell] = useState<[number, number] | null>(null);
  const [stats, setStats] = useState<MineStats>(loadStats);
  const [showStats, setShowStats] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const longPressFired = useRef(false);
  const [lastExplosion, setLastExplosion] = useState<[number, number] | null>(null);

  const config = CONFIGS[difficulty];
  const flagCount = board.flat().filter(c => c.state === 'flagged').length;
  const remainingMines = config.mines - flagCount;

  useEffect(() => {
    if (!isRunning || gameOver || isPaused) return;
    const iv = setInterval(() => setTimer((t: number) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, gameOver, isPaused]);

  useEffect(() => {
    if (gameOver || won) { clearMineGame(); return; }
    if (gameStarted) saveMineGame({ difficulty, board, gameOver, won, timer, gameStarted, firstClick, hintsUsed });
  }, [board, timer, gameStarted, gameOver, won, difficulty, firstClick, hintsUsed]);

  const reveal = useCallback((b: Cell[][], r: number, c: number) => {
    if (r < 0 || r >= b.length || c < 0 || c >= b[0].length) return;
    if (b[r][c].state !== 'hidden') return;
    b[r][c] = { ...b[r][c], state: 'revealed' };
    if (b[r][c].adjacent === 0 && !b[r][c].mine) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) reveal(b, r + dr, c + dc);
    }
  }, []);

  const checkWin = (b: Cell[][]) => b.every(row => row.every(c => c.mine ? c.state !== 'revealed' : c.state === 'revealed'));

  const doExplode = (nb: Cell[][], er: number, ec: number) => {
    nb.forEach(row => row.forEach(c => { if (c.mine) c.state = 'revealed'; }));
    setBoard(nb); setGameOver(true); setIsRunning(false); setLastExplosion([er, ec]);
    playSfx('mine'); vibrate([100, 60, 200]);
    const s = loadStats();
    s.gamesPlayed += 1; s.currentStreak = 0;
    setStats(s); saveStatsFn(s);
  };
  const doWin = (nb: Cell[][]) => {
    setBoard(nb); setWon(true); setIsRunning(false);
    playSfx('win'); vibrate([60, 60, 120]);
    const s = loadStats();
    s.gamesPlayed += 1; s.gamesWon += 1; s.currentStreak += 1;
    if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
    if (s.bestTime[difficulty] === null || timer < s.bestTime[difficulty]!) s.bestTime[difficulty] = timer;
    if (hintsUsed === 0) s.flawless += 1;
    setStats(s); saveStatsFn(s);
  };

  // Chord click: reveal all unflagged neighbors when revealed cell's flag count matches adjacent number
  const chord = useCallback((nb: Cell[][], r: number, c: number) => {
    const cell = nb[r][c];
    if (cell.state !== 'revealed' || cell.adjacent === 0 || cell.mine) return false;
    let flagged = 0;
    const candidates: [number, number][] = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= nb.length || nc < 0 || nc >= nb[0].length) continue;
      if (nb[nr][nc].state === 'flagged') flagged++;
      else if (nb[nr][nc].state === 'hidden') candidates.push([nr, nc]);
    }
    if (flagged !== cell.adjacent) return false;
    let triggeredMine: [number, number] | null = null;
    for (const [nr, nc] of candidates) {
      if (nb[nr][nc].mine) { triggeredMine = [nr, nc]; }
      reveal(nb, nr, nc);
    }
    if (triggeredMine) { doExplode(nb, triggeredMine[0], triggeredMine[1]); return true; }
    return true;
  }, [reveal, timer, difficulty, hintsUsed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCell = useCallback((r: number, c: number) => {
    if (gameOver || won || isPaused) return;
    if (longPressFired.current) { longPressFired.current = false; return; }
    if (!gameStarted) { setGameStarted(true); setIsRunning(true); }
    const cell = board[r][c];
    if (flagMode) {
      if (cell.state === 'revealed') return;
      const nb = board.map(row => row.map(c => ({ ...c })));
      nb[r][c] = { ...nb[r][c], state: cell.state === 'flagged' ? 'hidden' : 'flagged' };
      setBoard(nb); playSfx('flag'); vibrate(20);
      return;
    }
    if (cell.state === 'flagged') return;
    // Chord on revealed numbered cell
    if (cell.state === 'revealed' && cell.adjacent > 0 && !cell.mine) {
      const nb = board.map(row => row.map(c => ({ ...c })));
      if (chord(nb, r, c)) {
        setBoard(nb); setHintCell(null);
        playSfx('reveal'); vibrate(15);
        if (!gameOver && checkWin(nb)) doWin(nb);
      }
      return;
    }
    if (cell.state === 'revealed') return;

    let nb: Cell[][];
    if (firstClick) {
      // No-guess generation: regenerate up to 30 times for clean opening
      let candidate = createBoard(difficulty, r, c);
      // Ensure first click reveals at least a 3x3 zero-region for better opening
      let attempts = 0;
      while (candidate[r][c].adjacent !== 0 && attempts < 30) {
        candidate = createBoard(difficulty, r, c);
        attempts++;
      }
      nb = candidate;
      setFirstClick(false);
    } else {
      nb = board.map(row => row.map(c => ({ ...c })));
    }

    if (nb[r][c].mine) { doExplode(nb, r, c); return; }
    reveal(nb, r, c);
    setBoard(nb);
    setHintCell(null);
    playSfx('reveal'); vibrate(10);
    if (checkWin(nb)) doWin(nb);
  }, [board, gameOver, won, isPaused, flagMode, firstClick, difficulty, timer, gameStarted, reveal, chord]); // eslint-disable-line react-hooks/exhaustive-deps

  // Long-press handlers
  const onPointerDown = (r: number, c: number) => {
    longPressFired.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (gameOver || won || isPaused) return;
      const cell = board[r][c];
      if (cell.state === 'revealed') return;
      const nb = board.map(row => row.map(c => ({ ...c })));
      nb[r][c] = { ...nb[r][c], state: cell.state === 'flagged' ? 'hidden' : 'flagged' };
      setBoard(nb);
      longPressFired.current = true;
      playSfx('flag'); vibrate(40);
    }, 350);
  };
  const onPointerUp = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  // Hint: find a safe hidden cell that has at least one fully-deducible revealed neighbor
  const showHint = () => {
    if (gameOver || won || !gameStarted) return;
    // Strategy 1: a cell adjacent to a revealed number whose flags == number → other hidden neighbors safe
    const rows = board.length, cols = board[0].length;
    const safe: [number, number][] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (cell.state !== 'revealed' || cell.adjacent === 0 || cell.mine) continue;
      let flagged = 0; const hidden: [number, number][] = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (board[nr][nc].state === 'flagged') flagged++;
        else if (board[nr][nc].state === 'hidden') hidden.push([nr, nc]);
      }
      if (flagged === cell.adjacent && hidden.length > 0) safe.push(...hidden);
    }
    if (safe.length > 0) {
      const pick = safe[Math.floor(Math.random() * safe.length)];
      setHintCell(pick); setHintsUsed(n => n + 1);
      playSfx('hint');
      setTimeout(() => setHintCell(null), 2500);
      return;
    }
    // Strategy 2: a random hidden cell that's not a mine
    const candidates: [number, number][] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
      if (board[r][c].state === 'hidden' && !board[r][c].mine) candidates.push([r, c]);
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      setHintCell(pick); setHintsUsed(n => n + 1);
      playSfx('hint');
      setTimeout(() => setHintCell(null), 2500);
    }
  };

  const newGame = (diff?: Difficulty) => {
    clearMineGame();
    const d = diff ?? difficulty;
    setDifficulty(d);
    setBoard(createBoard(d));
    setGameOver(false); setWon(false); setTimer(0);
    setIsRunning(false); setGameStarted(false); setIsPaused(false);
    setFlagMode(false); setFirstClick(true); setHintsUsed(0); setHintCell(null); setLastExplosion(null);
  };

  const startGame = () => { setGameStarted(true); setIsRunning(true); };
  const togglePause = () => { if (!gameStarted) { startGame(); return; } setIsPaused(!isPaused); };
  const toggleMuteLocal = () => { setMuted(!muted); setMutedState(!muted); };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const diffLabels: Record<Difficulty, string> = {
    easy:   isAr ? 'سهل' : 'Easy',
    medium: isAr ? 'متوسط' : 'Medium',
    hard:   isAr ? 'صعب' : 'Hard',
    expert: isAr ? 'محترف' : 'Expert',
  };

  const getCellColor = (cell: Cell) => {
    if (cell.state !== 'revealed') return '';
    if (cell.mine) return 'bg-destructive/20 text-destructive';
    const colors = ['', 'text-blue-500', 'text-green-600', 'text-red-500', 'text-purple-600', 'text-amber-700', 'text-cyan-600', 'text-foreground', 'text-muted-foreground'];
    return colors[cell.adjacent] || '';
  };

  // Adaptive cell sizing for expert (10 cols × 16 rows)
  const cellSizeClass = config.cols <= 9 ? 'text-[12px]' : 'text-[11px]';

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6" dir={dir}>
      <div className="flex items-center justify-between mb-1 max-w-[400px] mx-auto">
        <button onClick={() => navigate('/games')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
          <ArrowLeft className={`w-5 h-5 text-foreground stroke-[1.8] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{isAr ? 'كاسحة الألغام' : 'Minesweeper'}</h1>
        <div className="flex gap-1">
          <button onClick={toggleMuteLocal} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            {muted ? <VolumeX className="w-5 h-5 text-foreground stroke-[1.8]" /> : <Volume2 className="w-5 h-5 text-foreground stroke-[1.8]" />}
          </button>
          <button onClick={togglePause} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            {isPaused || !gameStarted ? <Play className="w-5 h-5 text-foreground stroke-[1.8]" /> : <Pause className="w-5 h-5 text-foreground stroke-[1.8]" />}
          </button>
          <button onClick={() => newGame(difficulty)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <RefreshCw className="w-5 h-5 text-foreground stroke-[1.8]" />
          </button>
          <button onClick={() => setShowStats(!showStats)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <Trophy className={`w-5 h-5 stroke-[1.8] ${showStats ? 'text-primary' : 'text-foreground'}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between max-w-[400px] mx-auto mb-3 px-1">
        <div className="flex gap-1.5">
          {(['easy','medium','hard','expert'] as Difficulty[]).map(d => (
            <button key={d} onClick={() => newGame(d)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${difficulty === d ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {diffLabels[d]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setFlagMode(!flagMode)}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${flagMode ? 'bg-amber-500/15 text-amber-400' : 'text-muted-foreground'}`}>
            <Flag className="w-3 h-3" /> {remainingMines}
          </button>
          <span className="text-sm text-muted-foreground tabular-nums font-medium">{fmt(timer)}</span>
        </div>
      </div>

      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden max-w-[400px] mx-auto mb-3">
            <div className="rounded-2xl bg-secondary/50 p-4 space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <StatCard value={stats.gamesWon} label={isAr ? 'فوز' : 'Wins'} />
                <StatCard value={stats.bestStreak} label={isAr ? 'سلسلة' : 'Streak'} />
                <StatCard value={stats.flawless} label={isAr ? 'مثالية' : 'Flawless'} />
                <StatCard value={stats.gamesPlayed} label={isAr ? 'لعبت' : 'Played'} />
              </div>
              {(['easy','medium','hard','expert'] as Difficulty[]).map(d => (
                <div key={d} className="flex items-center justify-between px-2 text-[11px]">
                  <span className="text-muted-foreground">{diffLabels[d]}</span>
                  <span className="text-foreground tabular-nums">{stats.bestTime[d] ? fmt(stats.bestTime[d]!) : '—'}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(gameOver || won) && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className={`text-center py-3 mb-3 rounded-2xl max-w-[400px] mx-auto flex items-center justify-center gap-2 ${won ? 'bg-primary/12' : 'bg-destructive/12'}`}>
          {won ? <Trophy className="w-5 h-5 text-primary stroke-[1.8]" /> : <Bomb className="w-5 h-5 text-destructive stroke-[1.8]" />}
          <span className={`font-bold ${won ? 'text-primary' : 'text-destructive'}`}>
            {won ? (isAr ? 'فزت!' : 'You win!') : (isAr ? 'انفجار!' : 'Boom!')}
          </span>
          <span className={`text-sm font-medium ${won ? 'text-primary/70' : 'text-destructive/70'}`}>{fmt(timer)}</span>
          {won && hintsUsed === 0 && <span className="text-amber-400 text-xs">★</span>}
        </motion.div>
      )}

      <div className="max-w-[400px] mx-auto relative">
        <AnimatePresence>
          {(!gameStarted || isPaused) && !gameOver && !won && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 rounded-2xl bg-card/95 backdrop-blur-sm flex items-center justify-center"
              onClick={!gameStarted ? startGame : togglePause}>
              <div className="flex flex-col items-center gap-3">
                <Play className="w-10 h-10 text-primary stroke-[1.5]" />
                <span className="text-muted-foreground font-medium text-sm">
                  {!gameStarted ? (isAr ? 'اضغط للبدء' : 'Tap to start') : (isAr ? 'اضغط للمتابعة' : 'Tap to continue')}
                </span>
                <span className="text-[10px] text-muted-foreground/70 text-center max-w-[270px]">
                  {isAr ? 'اضغط لكشف، اضغط مطوّلاً للعلم، اضغط على رقم مكتمل لتوسيع تلقائي' : 'Tippen=öffnen, Halten=Flagge, vollständige Zahl=Auto-Erweitern'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-2xl overflow-hidden border border-border/40">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
            {board.map((row, ri) => row.map((cell, ci) => {
              const isHint = hintCell && hintCell[0] === ri && hintCell[1] === ci;
              const isExplosion = lastExplosion && lastExplosion[0] === ri && lastExplosion[1] === ci;
              return (
                <button
                  key={`${ri}-${ci}`}
                  onClick={() => handleCell(ri, ci)}
                  onContextMenu={(e) => { e.preventDefault(); onPointerDown(ri, ci); setTimeout(() => { longPressFired.current = false; }, 100); }}
                  onPointerDown={() => onPointerDown(ri, ci)}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                  className={`aspect-square flex items-center justify-center font-bold border-[0.5px] border-border/20 transition-all ${cellSizeClass}
                    ${cell.state === 'revealed'
                      ? cell.mine ? (isExplosion ? 'bg-destructive/40' : 'bg-destructive/15') : 'bg-background/80'
                      : cell.state === 'flagged' ? 'bg-amber-500/15' : 'bg-secondary/60 hover:bg-secondary active:bg-secondary/80'
                    } ${getCellColor(cell)} ${isHint ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}>
                  {cell.state === 'revealed' && cell.mine && '💣'}
                  {cell.state === 'revealed' && !cell.mine && cell.adjacent > 0 && cell.adjacent}
                  {cell.state === 'flagged' && '🚩'}
                </button>
              );
            }))}
          </div>
        </div>
      </div>

      {!gameOver && !won && gameStarted && !isPaused && (
        <div className="max-w-[400px] mx-auto flex justify-center mt-3">
          <button onClick={showHint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 text-xs font-bold">
            <Lightbulb className="w-3 h-3" /> {isAr ? 'تلميح' : 'Tipp'}
            {hintsUsed > 0 && <span className="opacity-60">×{hintsUsed}</span>}
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center p-2 rounded-xl bg-background/60">
      <div className="text-base font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
