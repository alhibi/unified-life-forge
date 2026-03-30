import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Play, Pause, Undo2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Difficulty = 'easy' | 'medium' | 'hard';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(200, 70%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(280, 60%, 55%)',
  'hsl(30, 80%, 55%)',
  'hsl(350, 70%, 55%)',
];

interface MazeStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: Record<Difficulty, number | null>;
  bestStreak: number;
  currentStreak: number;
}

function loadStats(): MazeStats {
  const s = localStorage.getItem('maze-stats');
  return s ? JSON.parse(s) : { gamesPlayed: 0, gamesWon: 0, bestTime: { easy: null, medium: null, hard: null }, bestStreak: 0, currentStreak: 0 };
}
function saveStatsFn(s: MazeStats) { localStorage.setItem('maze-stats', JSON.stringify(s)); }

const GRID_SIZES: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9 };

function generateMaze(size: number): { grid: number[][]; path: [number, number][] } {
  // Create a grid where each cell gets a color index
  // Generate a path that visits every cell exactly once (Hamiltonian-ish)
  const grid = Array.from({ length: size }, () => Array(size).fill(-1));
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const path: [number, number][] = [];

  // Use DFS to create a path visiting all cells
  function dfs(r: number, c: number): boolean {
    visited[r][c] = true;
    path.push([r, c]);
    if (path.length === size * size) return true;

    const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    // Shuffle directions
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }

    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
        if (dfs(nr, nc)) return true;
      }
    }

    visited[r][c] = false;
    path.pop();
    return false;
  }

  // Try from random corners
  const starts: [number, number][] = [[0, 0], [0, size - 1], [size - 1, 0], [size - 1, size - 1]];
  for (const [sr, sc] of starts) {
    if (dfs(sr, sc)) break;
  }

  // If no Hamiltonian path found, use simpler approach
  if (path.length < size * size) {
    path.length = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        path.push(r % 2 === 0 ? [r, c] : [r, size - 1 - c]);
      }
    }
  }

  // Assign color indices along the path
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    grid[r][c] = i % COLORS.length;
  }

  return { grid, path };
}

function saveMazeGame(data: any) { localStorage.setItem('maze-game-state', JSON.stringify(data)); }
function loadMazeGame(): any { const s = localStorage.getItem('maze-game-state'); return s ? JSON.parse(s) : null; }
function clearMazeGame() { localStorage.removeItem('maze-game-state'); }

export default function ColorMazePage() {
  const { dir, language } = useApp();
  const navigate = useNavigate();
  const saved = useMemo(() => loadMazeGame(), []);

  const [difficulty, setDifficulty] = useState<Difficulty>(saved?.difficulty || 'easy');
  const [mazeData, setMazeData] = useState(() => saved?.mazeData || generateMaze(GRID_SIZES['easy']));
  const [painted, setPainted] = useState<Set<string>>(() => new Set(saved?.painted || []));
  const [currentPos, setCurrentPos] = useState<[number, number]>(saved?.currentPos || mazeData.path[0]);
  const [moveHistory, setMoveHistory] = useState<[number, number][]>(saved?.moveHistory || [mazeData.path[0]]);
  const [timer, setTimer] = useState(saved?.timer || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(saved?.gameStarted || false);
  const [isPaused, setIsPaused] = useState(false);
  const [solved, setSolved] = useState(false);
  const [stats, setStats] = useState<MazeStats>(loadStats);
  const [showStats, setShowStats] = useState(false);

  const gridSize = GRID_SIZES[difficulty];
  const totalCells = gridSize * gridSize;

  useEffect(() => {
    if (!isRunning || solved || isPaused) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, solved, isPaused]);

  useEffect(() => {
    if (solved) { clearMazeGame(); return; }
    if (gameStarted) {
      saveMazeGame({ difficulty, mazeData, painted: Array.from(painted), currentPos, moveHistory, timer, gameStarted });
    }
  }, [painted, currentPos, timer, gameStarted, solved, difficulty, mazeData, moveHistory]);

  // Initialize painted with starting position
  useEffect(() => {
    if (!saved && mazeData.path.length > 0) {
      const start = mazeData.path[0];
      setPainted(new Set([`${start[0]}-${start[1]}`]));
      setCurrentPos(start);
      setMoveHistory([start]);
    }
  }, []);

  const handleCell = useCallback((r: number, c: number) => {
    if (isPaused || solved) return;
    if (!gameStarted) { setGameStarted(true); setIsRunning(true); }

    const key = `${r}-${c}`;
    if (painted.has(key)) return;

    // Check adjacency
    const [cr, cc] = currentPos;
    if (Math.abs(r - cr) + Math.abs(c - cc) !== 1) return;

    const newPainted = new Set(painted);
    newPainted.add(key);
    setPainted(newPainted);
    setCurrentPos([r, c]);
    setMoveHistory(prev => [...prev, [r, c]]);

    if (newPainted.size === totalCells) {
      setSolved(true);
      setIsRunning(false);
      const s = { ...stats, gamesPlayed: stats.gamesPlayed + 1, gamesWon: stats.gamesWon + 1 };
      s.currentStreak++;
      if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
      if (s.bestTime[difficulty] === null || timer < s.bestTime[difficulty]!) s.bestTime[difficulty] = timer;
      setStats(s);
      saveStatsFn(s);
    }
  }, [painted, currentPos, isPaused, solved, gameStarted, totalCells, stats, timer, difficulty]);

  const undo = () => {
    if (moveHistory.length <= 1) return;
    const newHistory = [...moveHistory];
    const removed = newHistory.pop()!;
    const newPainted = new Set(painted);
    newPainted.delete(`${removed[0]}-${removed[1]}`);
    setPainted(newPainted);
    setCurrentPos(newHistory[newHistory.length - 1]);
    setMoveHistory(newHistory);
  };

  const newGame = (diff: Difficulty) => {
    clearMazeGame();
    setDifficulty(diff);
    const size = GRID_SIZES[diff];
    const data = generateMaze(size);
    setMazeData(data);
    const start = data.path[0];
    setPainted(new Set([`${start[0]}-${start[1]}`]));
    setCurrentPos(start);
    setMoveHistory([start]);
    setTimer(0); setIsRunning(false); setGameStarted(false); setIsPaused(false); setSolved(false);
  };

  const startGame = () => { setGameStarted(true); setIsRunning(true); };
  const togglePause = () => {
    if (!gameStarted) { startGame(); return; }
    setIsPaused(!isPaused);
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const diffLabels: Record<Difficulty, string> = {
    easy: language === 'ar' ? 'سهل' : 'Easy',
    medium: language === 'ar' ? 'متوسط' : 'Medium',
    hard: language === 'ar' ? 'صعب' : 'Hard',
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6" dir={dir}>
      <div className="flex items-center justify-between mb-1 max-w-[360px] mx-auto">
        <button onClick={() => navigate('/games')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
          <ArrowLeft className={`w-5 h-5 text-foreground stroke-[1.8] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{language === 'ar' ? 'متاهة الألوان' : 'Color Maze'}</h1>
        <div className="flex gap-1">
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

      <div className="flex items-center justify-between max-w-[360px] mx-auto mb-3 px-1">
        <div className="flex gap-1.5">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
            <button key={d} onClick={() => newGame(d)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${difficulty === d ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >{diffLabels[d]}</button>
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

      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden max-w-[360px] mx-auto mb-3">
            <div className="rounded-2xl bg-secondary/50 p-4 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {[{ v: stats.gamesWon, l: language === 'ar' ? 'فوز' : 'Wins' }, { v: stats.bestStreak, l: language === 'ar' ? 'سلسلة' : 'Streak' }, { v: stats.gamesPlayed, l: language === 'ar' ? 'لعبت' : 'Played' }].map((s, i) => (
                  <div key={i} className="text-center p-2 rounded-xl bg-background/60">
                    <div className="text-lg font-bold text-foreground">{s.v}</div>
                    <div className="text-[10px] text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {solved && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center py-3 mb-3 rounded-2xl bg-primary/12 max-w-[360px] mx-auto flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5 text-primary stroke-[1.8]" />
          <span className="text-primary font-bold">{language === 'ar' ? 'أحسنت!' : 'Completed!'}</span>
          <span className="text-primary/70 text-sm font-medium">{fmt(timer)}</span>
        </motion.div>
      )}

      <div className="max-w-[360px] mx-auto relative">
        <AnimatePresence>
          {(!gameStarted || isPaused) && !solved && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 rounded-2xl bg-card/95 backdrop-blur-sm flex items-center justify-center"
              onClick={!gameStarted ? startGame : togglePause}>
              <div className="flex flex-col items-center gap-3">
                <Play className="w-10 h-10 text-primary stroke-[1.5]" />
                <span className="text-muted-foreground font-medium text-sm">
                  {!gameStarted ? (language === 'ar' ? 'اضغط للبدء' : 'Tap to start') : (language === 'ar' ? 'اضغط للمتابعة' : 'Tap to continue')}
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

              return (
                <button
                  key={key}
                  onClick={() => handleCell(ri, ci)}
                  className={`aspect-square rounded-lg transition-all duration-200 relative
                    ${isPaintedCell ? '' : isAdjacent ? 'ring-2 ring-primary/40' : ''}
                    ${isCurrent ? 'ring-2 ring-primary' : ''}
                  `}
                  style={{
                    backgroundColor: isPaintedCell ? COLORS[colorIdx] : 'hsl(var(--muted))',
                    opacity: isPaintedCell ? 1 : 0.4,
                  }}
                >
                  {isCurrent && (
                    <motion.div
                      layoutId="maze-cursor"
                      className="absolute inset-1 rounded-md bg-background/40"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              );
            }))}
          </div>
        </div>
      </div>
    </div>
  );
}
