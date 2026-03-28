import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Difficulty = 'easy' | 'medium' | 'hard';
// Directions: 0=top, 1=right, 2=bottom, 3=left
type Pipe = boolean[]; // [top, right, bottom, left]

interface PipeStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: Record<Difficulty, number | null>;
  bestStreak: number;
  currentStreak: number;
}

function loadStats(): PipeStats {
  const s = localStorage.getItem('pipes-stats');
  return s ? JSON.parse(s) : { gamesPlayed: 0, gamesWon: 0, bestTime: { easy: null, medium: null, hard: null }, bestStreak: 0, currentStreak: 0 };
}
function saveStatsFn(s: PipeStats) { localStorage.setItem('pipes-stats', JSON.stringify(s)); }

const GRID_SIZES: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 6 };

function rotatePipe(pipe: Pipe, times: number): Pipe {
  const p = [...pipe];
  for (let t = 0; t < times; t++) {
    const last = p.pop()!;
    p.unshift(last);
  }
  return p;
}

function generatePuzzle(size: number): { solution: Pipe[][]; puzzle: Pipe[][] } {
  // Generate a connected grid using spanning tree
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const connections: boolean[][][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [false, false, false, false]) // top, right, bottom, left
  );

  // DFS to create spanning tree
  function dfs(r: number, c: number) {
    visited[r][c] = true;
    const dirs: [number, number, number, number][] = [[- 1, 0, 0, 2], [0, 1, 1, 3], [1, 0, 2, 0], [0, -1, 3, 1]];
    // Shuffle
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const [dr, dc, myDir, theirDir] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
        connections[r][c][myDir] = true;
        connections[nr][nc][theirDir] = true;
        dfs(nr, nc);
      }
    }
  }

  dfs(0, 0);

  const solution = connections.map(row => row.map(c => [...c] as Pipe));

  // Randomly rotate each pipe to create the puzzle
  const puzzle = solution.map(row =>
    row.map(pipe => {
      const rotations = Math.floor(Math.random() * 4);
      return rotatePipe(pipe, rotations);
    })
  );

  return { solution, puzzle };
}

function isConnected(grid: Pipe[][], size: number): boolean {
  // Check if all pipes form a connected network
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const queue: [number, number][] = [[0, 0]];
  visited[0][0] = true;
  let count = 0;

  const DR = [-1, 0, 1, 0];
  const DC = [0, 1, 0, -1];
  const OPP = [2, 3, 0, 1];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    count++;
    for (let d = 0; d < 4; d++) {
      if (!grid[r][c][d]) continue;
      const nr = r + DR[d], nc = c + DC[d];
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (visited[nr][nc]) continue;
      if (!grid[nr][nc][OPP[d]]) continue; // other pipe must connect back
      visited[nr][nc] = true;
      queue.push([nr, nc]);
    }
  }
  return count === size * size;
}

function savePipesGame(data: any) { localStorage.setItem('pipes-game-state', JSON.stringify(data)); }
function loadPipesGame(): any { const s = localStorage.getItem('pipes-game-state'); return s ? JSON.parse(s) : null; }
function clearPipesGame() { localStorage.removeItem('pipes-game-state'); }

export default function PipesPage() {
  const { dir, language } = useApp();
  const navigate = useNavigate();
  const saved = useMemo(() => loadPipesGame(), []);

  const [difficulty, setDifficulty] = useState<Difficulty>(saved?.difficulty || 'easy');
  const [puzzleData, setPuzzleData] = useState(() => saved?.puzzleData || generatePuzzle(GRID_SIZES['easy']));
  const [grid, setGrid] = useState<Pipe[][]>(saved?.grid || puzzleData.puzzle.map((r: Pipe[]) => r.map((p: Pipe) => [...p])));
  const [timer, setTimer] = useState(saved?.timer || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(saved?.gameStarted || false);
  const [isPaused, setIsPaused] = useState(false);
  const [solved, setSolved] = useState(false);
  const [stats, setStats] = useState<PipeStats>(loadStats);
  const [showStats, setShowStats] = useState(false);

  const gridSize = GRID_SIZES[difficulty];

  useEffect(() => {
    if (!isRunning || solved || isPaused) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, solved, isPaused]);

  useEffect(() => {
    if (solved) { clearPipesGame(); return; }
    if (gameStarted) savePipesGame({ difficulty, puzzleData, grid, timer, gameStarted });
  }, [grid, timer, gameStarted, solved, difficulty, puzzleData]);

  const connected = useMemo(() => {
    // Determine which cells are connected to (0,0)
    const vis = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
    const queue: [number, number][] = [[0, 0]];
    vis[0][0] = true;
    const DR = [-1, 0, 1, 0];
    const DC = [0, 1, 0, -1];
    const OPP = [2, 3, 0, 1];
    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      for (let d = 0; d < 4; d++) {
        if (!grid[r]?.[c]?.[d]) continue;
        const nr = r + DR[d], nc = c + DC[d];
        if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
        if (vis[nr][nc]) continue;
        if (!grid[nr]?.[nc]?.[OPP[d]]) continue;
        vis[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
    return vis;
  }, [grid, gridSize]);

  const handleRotate = useCallback((r: number, c: number) => {
    if (isPaused || solved) return;
    if (!gameStarted) { setGameStarted(true); setIsRunning(true); }

    const newGrid = grid.map(row => row.map(p => [...p] as Pipe));
    newGrid[r][c] = rotatePipe(newGrid[r][c], 1);
    setGrid(newGrid);

    if (isConnected(newGrid, gridSize)) {
      setSolved(true);
      setIsRunning(false);
      const s = { ...stats, gamesPlayed: stats.gamesPlayed + 1, gamesWon: stats.gamesWon + 1 };
      s.currentStreak++;
      if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
      if (s.bestTime[difficulty] === null || timer < s.bestTime[difficulty]!) s.bestTime[difficulty] = timer;
      setStats(s);
      saveStatsFn(s);
    }
  }, [grid, isPaused, solved, gameStarted, gridSize, stats, timer, difficulty]);

  const newGame = (diff: Difficulty) => {
    clearPipesGame();
    setDifficulty(diff);
    const size = GRID_SIZES[diff];
    const data = generatePuzzle(size);
    setPuzzleData(data);
    setGrid(data.puzzle.map((r: Pipe[]) => r.map((p: Pipe) => [...p])));
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

  // Draw pipe SVG
  const renderPipe = (pipe: Pipe, isConn: boolean) => {
    const color = isConn ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
    const width = 4;
    const center = 20;
    const lines: React.ReactNode[] = [];

    if (pipe[0]) lines.push(<line key="t" x1={center} y1={0} x2={center} y2={center} stroke={color} strokeWidth={width} strokeLinecap="round" />);
    if (pipe[1]) lines.push(<line key="r" x1={center} y1={center} x2={40} y2={center} stroke={color} strokeWidth={width} strokeLinecap="round" />);
    if (pipe[2]) lines.push(<line key="b" x1={center} y1={center} x2={center} y2={40} stroke={color} strokeWidth={width} strokeLinecap="round" />);
    if (pipe[3]) lines.push(<line key="l" x1={0} y1={center} x2={center} y2={center} stroke={color} strokeWidth={width} strokeLinecap="round" />);

    // Center dot
    lines.push(<circle key="c" cx={center} cy={center} r={3} fill={color} />);

    return (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        {lines}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6" dir={dir}>
      <div className="flex items-center justify-between mb-1 max-w-[360px] mx-auto">
        <button onClick={() => navigate('/games')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
          <ArrowLeft className={`w-5 h-5 text-foreground stroke-[1.8] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{language === 'ar' ? 'الأنابيب' : 'Pipes'}</h1>
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
        <span className="text-sm text-muted-foreground tabular-nums font-medium">{fmt(timer)}</span>
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
          <span className="text-primary font-bold">{language === 'ar' ? 'أحسنت!' : 'Connected!'}</span>
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

        <div className="rounded-2xl overflow-hidden border border-border/40 p-2 bg-secondary/20">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
            {grid.map((row, ri) => row.map((pipe, ci) => (
              <motion.button
                key={`${ri}-${ci}`}
                onClick={() => handleRotate(ri, ci)}
                whileTap={{ scale: 0.9 }}
                className={`aspect-square rounded-lg p-1 transition-all ${
                  connected[ri][ci] ? 'bg-primary/10' : 'bg-secondary/60'
                } ${solved ? '' : 'active:bg-primary/20'}`}
              >
                {renderPipe(pipe, connected[ri][ci])}
              </motion.button>
            )))}
          </div>
        </div>
      </div>
    </div>
  );
}
