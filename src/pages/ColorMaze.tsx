import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Play, Pause, Undo2, Lightbulb, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSfx, vibrate, isMuted, setMuted } from '@/utils/gameFeedback';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

// =============================================================================
// Palettes
// =============================================================================
interface Palette { id: string; ar: string; de: string; colors: string[] }
const PALETTES: Palette[] = [
  { id: 'rainbow', ar: 'قوس قزح', de: 'Regenbogen', colors: [
    'hsl(var(--primary))', 'hsl(200, 75%, 50%)', 'hsl(150, 65%, 45%)', 'hsl(280, 60%, 55%)', 'hsl(30, 80%, 55%)', 'hsl(350, 70%, 55%)',
  ] },
  { id: 'gem', ar: 'أحجار كريمة', de: 'Edelsteine', colors: [
    '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  ] },
  { id: 'mono', ar: 'تدرّج', de: 'Verlauf', colors: [
    '#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
  ] },
  { id: 'fire', ar: 'لهب', de: 'Feuer', colors: [
    '#7f1d1d', '#b91c1c', '#dc2626', '#ea580c', '#f59e0b', '#fbbf24',
  ] },
  { id: 'forest', ar: 'غابة', de: 'Wald', colors: [
    '#064e3b', '#065f46', '#047857', '#10b981', '#34d399', '#a7f3da',
  ] },
];

const GRID_SIZES: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9, expert: 11 };

// =============================================================================
// Maze generation (Hamiltonian path on grid via random DFS)
// =============================================================================
function generateMaze(size: number, paletteLen: number): { grid: number[][]; path: [number, number][] } {
  const grid = Array.from({ length: size }, () => Array(size).fill(-1));
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const path: [number, number][] = [];

  function dfs(r: number, c: number, depth: number): boolean {
    visited[r][c] = true;
    path.push([r, c]);
    if (path.length === size * size) return true;

    const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    if (depth > size * size * 4) return false;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
        if (dfs(nr, nc, depth + 1)) return true;
      }
    }
    visited[r][c] = false;
    path.pop();
    return false;
  }

  const starts: [number, number][] = [[0, 0], [0, size - 1], [size - 1, 0], [size - 1, size - 1]];
  for (const [sr, sc] of starts) { if (dfs(sr, sc, 0)) break; }

  if (path.length < size * size) {
    path.length = 0;
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        path.push(r % 2 === 0 ? [r, c] : [r, size - 1 - c]);
  }

  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    grid[r][c] = i % paletteLen;
  }
  return { grid, path };
}

// Hint: among adjacent unvisited cells, prefer the one whose continuing the path
// has the most remaining valid neighbors (avoids dead-ends).
function bestHint(size: number, painted: Set<string>, pos: [number, number]): [number, number] | null {
  const [r, c] = pos;
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const candidates: { p: [number, number]; degree: number }[] = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
    if (painted.has(`${nr}-${nc}`)) continue;
    // count remaining neighbors (those not painted)
    let deg = 0;
    for (const [dr2, dc2] of dirs) {
      const r2 = nr + dr2, c2 = nc + dc2;
      if (r2 < 0 || r2 >= size || c2 < 0 || c2 >= size) continue;
      if (painted.has(`${r2}-${c2}`)) continue;
      deg += 1;
    }
    candidates.push({ p: [nr, nc], degree: deg });
  }
  if (candidates.length === 0) return null;
  // Warnsdorff's rule: pick the candidate with the fewest onward neighbors
  candidates.sort((a, b) => a.degree - b.degree);
  return candidates[0].p;
}

// =============================================================================
// Stats / Save
// =============================================================================
interface MazeStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: Record<Difficulty, number | null>;
  bestStreak: number;
  currentStreak: number;
  perfectGames: number;
}
function loadStats(): MazeStats {
  try {
    const s = JSON.parse(localStorage.getItem('maze-stats') || '{}');
    return {
      gamesPlayed: 0, gamesWon: 0, perfectGames: 0,
      bestStreak: 0, currentStreak: 0, ...s,
      bestTime: { easy: null, medium: null, hard: null, expert: null, ...(s.bestTime || {}) },
    };
  } catch { return { gamesPlayed: 0, gamesWon: 0, perfectGames: 0, bestTime: { easy: null, medium: null, hard: null, expert: null }, bestStreak: 0, currentStreak: 0 }; }
}
function saveStatsFn(s: MazeStats) { localStorage.setItem('maze-stats', JSON.stringify(s)); }

interface SavedMaze {
  difficulty: Difficulty;
  paletteId: string;
  mazeData: { grid: number[][]; path: [number, number][] };
  painted: string[];
  currentPos: [number, number];
  moveHistory: [number, number][];
  timer: number;
  gameStarted: boolean;
  hintsUsed: number;
}
function saveMazeGame(d: SavedMaze) { localStorage.setItem('maze-game-state', JSON.stringify(d)); }
function loadMazeGame(): SavedMaze | null {
  try { const s = localStorage.getItem('maze-game-state'); return s ? JSON.parse(s) : null; } catch { return null; }
}
function clearMazeGame() { localStorage.removeItem('maze-game-state'); }

// =============================================================================
// Component
// =============================================================================
export default function ColorMazePage() {
  const { dir, language } = useApp();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const saved = useMemo(() => loadMazeGame(), []);

  const [difficulty, setDifficulty] = useState<Difficulty>(saved?.difficulty || 'easy');
  const [paletteId, setPaletteId] = useState(saved?.paletteId || (localStorage.getItem('maze-palette') || 'rainbow'));
  const palette = useMemo(() => PALETTES.find(p => p.id === paletteId) ?? PALETTES[0], [paletteId]);

  const [mazeData, setMazeData] = useState(() => saved?.mazeData || generateMaze(GRID_SIZES['easy'], palette.colors.length));
  const [painted, setPainted] = useState<Set<string>>(() => new Set(saved?.painted || []));
  const [currentPos, setCurrentPos] = useState<[number, number]>(saved?.currentPos || mazeData.path[0]);
  const [moveHistory, setMoveHistory] = useState<[number, number][]>(saved?.moveHistory || [mazeData.path[0]]);
  const [timer, setTimer] = useState(saved?.timer || 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed || 0);
  const [hintCell, setHintCell] = useState<[number, number] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(saved?.gameStarted || false);
  const [isPaused, setIsPaused] = useState(false);
  const [solved, setSolved] = useState(false);
  const [stats, setStats] = useState<MazeStats>(loadStats);
  const [showStats, setShowStats] = useState(false);
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => { localStorage.setItem('maze-palette', paletteId); }, [paletteId]);

  const gridSize = GRID_SIZES[difficulty];
  const totalCells = gridSize * gridSize;

  useEffect(() => {
    if (!isRunning || solved || isPaused) return;
    const iv = setInterval(() => setTimer((t: number) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, solved, isPaused]);

  useEffect(() => {
    if (solved) { clearMazeGame(); return; }
    if (gameStarted) {
      saveMazeGame({ difficulty, paletteId, mazeData, painted: Array.from(painted), currentPos, moveHistory, timer, gameStarted, hintsUsed });
    }
  }, [painted, currentPos, timer, gameStarted, solved, difficulty, mazeData, moveHistory, paletteId, hintsUsed]);

  useEffect(() => {
    if (!saved && mazeData.path.length > 0) {
      const start = mazeData.path[0];
      setPainted(new Set([`${start[0]}-${start[1]}`]));
      setCurrentPos(start);
      setMoveHistory([start]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect stuck
  const stuck = useMemo(() => {
    if (solved || !gameStarted) return false;
    const [r, c] = currentPos;
    const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
      if (!painted.has(`${nr}-${nc}`)) return false;
    }
    return painted.size !== totalCells;
  }, [currentPos, painted, gridSize, solved, gameStarted, totalCells]);

  const handleCell = useCallback((r: number, c: number) => {
    if (isPaused || solved) return;
    if (!gameStarted) { setGameStarted(true); setIsRunning(true); }
    const key = `${r}-${c}`;
    if (painted.has(key)) return;
    const [cr, cc] = currentPos;
    if (Math.abs(r - cr) + Math.abs(c - cc) !== 1) return;
    const newPainted = new Set(painted); newPainted.add(key);
    setPainted(newPainted); setCurrentPos([r, c]);
    setMoveHistory(prev => [...prev, [r, c]]);
    setHintCell(null);
    playSfx('tap'); vibrate(8);
    if (newPainted.size === totalCells) {
      setSolved(true); setIsRunning(false); playSfx('win'); vibrate([60, 60, 120]);
      const s = loadStats();
      s.gamesPlayed += 1; s.gamesWon += 1; s.currentStreak += 1;
      if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
      if (s.bestTime[difficulty] === null || timer < s.bestTime[difficulty]!) s.bestTime[difficulty] = timer;
      if (hintsUsed === 0) s.perfectGames += 1;
      setStats(s); saveStatsFn(s);
    }
  }, [painted, currentPos, isPaused, solved, gameStarted, totalCells, timer, difficulty, hintsUsed]);

  const undo = () => {
    if (moveHistory.length <= 1) return;
    const newHistory = [...moveHistory];
    const removed = newHistory.pop()!;
    const newPainted = new Set(painted);
    newPainted.delete(`${removed[0]}-${removed[1]}`);
    setPainted(newPainted); setCurrentPos(newHistory[newHistory.length - 1]); setMoveHistory(newHistory);
    setHintCell(null);
    playSfx('click');
  };

  const showHint = () => {
    if (solved || !gameStarted || stuck) return;
    const h = bestHint(gridSize, painted, currentPos);
    if (!h) return;
    setHintCell(h); setHintsUsed(n => n + 1);
    playSfx('hint');
    setTimeout(() => setHintCell(null), 2000);
  };

  const newGame = (diff?: Difficulty, p?: Palette) => {
    clearMazeGame();
    const d = diff ?? difficulty;
    const pp = p ?? palette;
    setDifficulty(d); setPaletteId(pp.id);
    const size = GRID_SIZES[d];
    const data = generateMaze(size, pp.colors.length);
    setMazeData(data);
    const start = data.path[0];
    setPainted(new Set([`${start[0]}-${start[1]}`]));
    setCurrentPos(start); setMoveHistory([start]);
    setTimer(0); setIsRunning(false); setGameStarted(false); setIsPaused(false); setSolved(false);
    setHintCell(null); setHintsUsed(0);
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

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6" dir={dir}>
      <div className="flex items-center justify-between mb-1 max-w-[400px] mx-auto">
        <button onClick={() => navigate('/games')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
          <ArrowLeft className={`w-5 h-5 text-foreground stroke-[1.8] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{isAr ? 'متاهة الألوان' : 'Color Maze'}</h1>
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

      {/* Difficulty + Palette */}
      <div className="max-w-[400px] mx-auto mb-2 px-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {(['easy','medium','hard','expert'] as Difficulty[]).map(d => (
              <button key={d} onClick={() => newGame(d)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${difficulty === d ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {diffLabels[d]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={undo} disabled={moveHistory.length <= 1} className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors">
              <Undo2 className="w-4 h-4 text-foreground" />
            </button>
            <span className="text-xs text-muted-foreground">{painted.size}/{totalCells}</span>
            <span className="text-sm text-muted-foreground tabular-nums font-medium">{fmt(timer)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {PALETTES.map(p => (
            <button key={p.id} onClick={() => newGame(undefined, p)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all flex items-center gap-1.5 ${paletteId === p.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <span className="flex">{p.colors.slice(0, 4).map((c, i) => (
                <span key={i} className="w-2 h-2 rounded-full -mr-0.5" style={{ background: c, border: '1px solid rgba(255,255,255,0.2)' }} />
              ))}</span>
              {isAr ? p.ar : p.de}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden max-w-[400px] mx-auto mb-3">
            <div className="rounded-2xl bg-secondary/50 p-4 space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <StatCard value={stats.gamesWon} label={isAr ? 'فوز' : 'Wins'} />
                <StatCard value={stats.bestStreak} label={isAr ? 'سلسلة' : 'Streak'} />
                <StatCard value={stats.perfectGames} label={isAr ? 'مثالية' : 'Perfect'} />
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

      {/* Solved banner */}
      {solved && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center py-3 mb-3 rounded-2xl bg-primary/12 max-w-[400px] mx-auto flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5 text-primary stroke-[1.8]" />
          <span className="text-primary font-bold">{isAr ? 'أحسنت!' : 'Completed!'}</span>
          <span className="text-primary/70 text-sm font-medium">{fmt(timer)}</span>
          {hintsUsed === 0 && <span className="text-amber-400 text-xs">★ {isAr ? 'بلا تلميح' : 'No-Hint'}</span>}
        </motion.div>
      )}

      {/* Stuck banner */}
      {stuck && !solved && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2 mb-3 rounded-2xl bg-rose-500/10 max-w-[400px] mx-auto flex items-center justify-center gap-2">
          <span className="text-rose-300 text-xs">{isAr ? 'لا حركات! تراجع أو ابدأ من جديد' : 'Sackgasse! Rückgängig oder neu starten'}</span>
        </motion.div>
      )}

      {/* Board */}
      <div className="max-w-[400px] mx-auto relative">
        <AnimatePresence>
          {(!gameStarted || isPaused) && !solved && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 rounded-2xl bg-card/95 backdrop-blur-sm flex items-center justify-center"
              onClick={!gameStarted ? startGame : togglePause}>
              <div className="flex flex-col items-center gap-3">
                <Play className="w-10 h-10 text-primary stroke-[1.5]" />
                <span className="text-muted-foreground font-medium text-sm">
                  {!gameStarted ? (isAr ? 'اضغط للبدء' : 'Tap to start') : (isAr ? 'اضغط للمتابعة' : 'Tap to continue')}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-2xl overflow-hidden border border-border/40 p-1.5 bg-secondary/20">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
            {mazeData.grid.map((row: number[], ri: number) => row.map((colorIdx: number, ci: number) => {
              const key = `${ri}-${ci}`;
              const isPaintedCell = painted.has(key);
              const isCurrent = currentPos[0] === ri && currentPos[1] === ci;
              const isAdjacent = !isPaintedCell && Math.abs(ri - currentPos[0]) + Math.abs(ci - currentPos[1]) === 1;
              const isHint = hintCell && hintCell[0] === ri && hintCell[1] === ci;
              return (
                <button
                  key={key}
                  onClick={() => handleCell(ri, ci)}
                  className={`aspect-square rounded-lg transition-all duration-200 relative
                    ${isPaintedCell ? '' : isAdjacent ? 'ring-1 ring-primary/40' : ''}
                    ${isCurrent ? 'ring-2 ring-primary' : ''}
                    ${isHint ? 'ring-2 ring-amber-400 animate-pulse' : ''}
                  `}
                  style={{
                    backgroundColor: isPaintedCell ? palette.colors[colorIdx] : 'hsl(var(--muted))',
                    opacity: isPaintedCell ? 1 : (isAdjacent ? 0.55 : 0.35),
                  }}>
                  {isCurrent && (
                    <motion.div
                      layoutId="maze-cursor"
                      className="absolute inset-1 rounded-md bg-background/30 border border-white/40"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                  )}
                </button>
              );
            }))}
          </div>
        </div>
      </div>

      {/* Hint button */}
      {!solved && gameStarted && !isPaused && (
        <div className="max-w-[400px] mx-auto flex justify-center mt-3">
          <button onClick={showHint} disabled={stuck}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 text-xs font-bold disabled:opacity-30">
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
