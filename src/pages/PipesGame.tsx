import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Play, Pause, Lightbulb, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSfx, vibrate, isMuted, setMuted } from '@/utils/gameFeedback';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
// Directions: 0=top, 1=right, 2=bottom, 3=left
type Pipe = boolean[];

interface PipeStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: Record<Difficulty, number | null>;
  bestMoves: Record<Difficulty, number | null>;
  bestStreak: number;
  currentStreak: number;
  perfectGames: number;
}
function loadStats(): PipeStats {
  try {
    const s = JSON.parse(localStorage.getItem('pipes-stats') || '{}');
    return {
      gamesPlayed: 0, gamesWon: 0, perfectGames: 0,
      bestTime: { easy: null, medium: null, hard: null, expert: null },
      bestMoves: { easy: null, medium: null, hard: null, expert: null },
      bestStreak: 0, currentStreak: 0, ...s,
      bestTime: { easy: null, medium: null, hard: null, expert: null, ...(s.bestTime || {}) },
      bestMoves: { easy: null, medium: null, hard: null, expert: null, ...(s.bestMoves || {}) },
    };
  } catch {
    return { gamesPlayed: 0, gamesWon: 0, perfectGames: 0,
      bestTime: { easy: null, medium: null, hard: null, expert: null },
      bestMoves: { easy: null, medium: null, hard: null, expert: null },
      bestStreak: 0, currentStreak: 0 };
  }
}
function saveStatsFn(s: PipeStats) { localStorage.setItem('pipes-stats', JSON.stringify(s)); }

const GRID_SIZES: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 6, expert: 8 };

// =============================================================================
// Themes
// =============================================================================
interface Theme { id: string; ar: string; de: string; on: string; off: string; glow: string }
const THEMES: Theme[] = [
  { id: 'classic', ar: 'كلاسيكي', de: 'Klassisch', on: 'hsl(var(--primary))', off: 'hsl(var(--muted-foreground))', glow: 'rgba(0,200,255,0.6)' },
  { id: 'cyan', ar: 'سماوي', de: 'Cyan', on: '#06b6d4', off: '#475569', glow: 'rgba(6,182,212,0.7)' },
  { id: 'amber', ar: 'كهرماني', de: 'Bernstein', on: '#f59e0b', off: '#52525b', glow: 'rgba(245,158,11,0.6)' },
  { id: 'rose', ar: 'وردي', de: 'Rosé', on: '#f43f5e', off: '#52525b', glow: 'rgba(244,63,94,0.6)' },
  { id: 'matrix', ar: 'مصفوفة', de: 'Matrix', on: '#22c55e', off: '#16213e', glow: 'rgba(34,197,94,0.7)' },
];

// =============================================================================
// Logic
// =============================================================================
function rotatePipe(pipe: Pipe, times: number): Pipe {
  const p = [...pipe];
  for (let t = 0; t < times; t++) { const last = p.pop()!; p.unshift(last); }
  return p;
}
function generatePuzzle(size: number): { solution: Pipe[][]; puzzle: Pipe[][]; rotations: number[][] } {
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const connections: boolean[][][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [false, false, false, false])
  );
  function dfs(r: number, c: number) {
    visited[r][c] = true;
    const dirs: [number, number, number, number][] = [[-1, 0, 0, 2], [0, 1, 1, 3], [1, 0, 2, 0], [0, -1, 3, 1]];
    for (let i = dirs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [dirs[i], dirs[j]] = [dirs[j], dirs[i]]; }
    for (const [dr, dc, myDir, theirDir] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
        connections[r][c][myDir] = true; connections[nr][nc][theirDir] = true;
        dfs(nr, nc);
      }
    }
  }
  dfs(0, 0);
  const solution = connections.map(row => row.map(c => [...c] as Pipe));
  const rotations: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const puzzle = solution.map((row, r) => row.map((pipe, c) => {
    // Skip empty pipes (cells with no connections — shouldn't happen due to spanning tree but safe)
    if (!pipe.some(Boolean)) { rotations[r][c] = 0; return [...pipe]; }
    const rot = Math.floor(Math.random() * 4);
    rotations[r][c] = rot;
    return rotatePipe(pipe, rot);
  }));
  return { solution, puzzle, rotations };
}
function isConnected(grid: Pipe[][], size: number): boolean {
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const queue: [number, number][] = [[0, 0]];
  visited[0][0] = true;
  let count = 0;
  const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1], OPP = [2, 3, 0, 1];
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    count++;
    for (let d = 0; d < 4; d++) {
      if (!grid[r][c][d]) continue;
      const nr = r + DR[d], nc = c + DC[d];
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (visited[nr][nc]) continue;
      if (!grid[nr][nc][OPP[d]]) continue;
      visited[nr][nc] = true;
      queue.push([nr, nc]);
    }
  }
  return count === size * size;
}
function computeConnected(grid: Pipe[][], size: number): boolean[][] {
  const vis = Array.from({ length: size }, () => Array(size).fill(false));
  const queue: [number, number][] = [[0, 0]];
  vis[0][0] = true;
  const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1], OPP = [2, 3, 0, 1];
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (let d = 0; d < 4; d++) {
      if (!grid[r]?.[c]?.[d]) continue;
      const nr = r + DR[d], nc = c + DC[d];
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (vis[nr][nc]) continue;
      if (!grid[nr]?.[nc]?.[OPP[d]]) continue;
      vis[nr][nc] = true;
      queue.push([nr, nc]);
    }
  }
  return vis;
}
// Hint: pick a connected cell whose rotation would extend the network the most
function bestHint(grid: Pipe[][], size: number, connected: boolean[][]): [number, number] | null {
  let best: { idx: [number, number]; gain: number } | null = null;
  const baseSize = connected.flat().filter(Boolean).length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c].some(Boolean)) continue;
      for (let rot = 1; rot < 4; rot++) {
        const test = grid.map(row => row.map(p => [...p] as Pipe));
        test[r][c] = rotatePipe(test[r][c], rot);
        const conn = computeConnected(test, size);
        const sz = conn.flat().filter(Boolean).length;
        const gain = sz - baseSize;
        if (gain > 0 && (!best || gain > best.gain)) best = { idx: [r, c], gain };
      }
    }
  }
  return best ? best.idx : null;
}

// =============================================================================
// Save
// =============================================================================
interface SavedPipes {
  difficulty: Difficulty;
  themeId: string;
  puzzleData: { solution: Pipe[][]; puzzle: Pipe[][]; rotations: number[][] };
  grid: Pipe[][];
  locked: string[];
  timer: number;
  gameStarted: boolean;
  moves: number;
  hintsUsed: number;
}
function savePipesGame(d: SavedPipes) { localStorage.setItem('pipes-game-state', JSON.stringify(d)); }
function loadPipesGame(): SavedPipes | null {
  try { const s = localStorage.getItem('pipes-game-state'); return s ? JSON.parse(s) : null; } catch { return null; }
}
function clearPipesGame() { localStorage.removeItem('pipes-game-state'); }

// =============================================================================
// Component
// =============================================================================
export default function PipesPage() {
  const { dir, language } = useApp();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const saved = useMemo(() => loadPipesGame(), []);

  const [difficulty, setDifficulty] = useState<Difficulty>(saved?.difficulty || 'easy');
  const [themeId, setThemeId] = useState(saved?.themeId || (localStorage.getItem('pipes-theme') || 'classic'));
  const theme = useMemo(() => THEMES.find(t => t.id === themeId) ?? THEMES[0], [themeId]);
  const [puzzleData, setPuzzleData] = useState(() => saved?.puzzleData || generatePuzzle(GRID_SIZES['easy']));
  const [grid, setGrid] = useState<Pipe[][]>(saved?.grid || puzzleData.puzzle.map((r: Pipe[]) => r.map((p: Pipe) => [...p])));
  const [locked, setLocked] = useState<Set<string>>(() => new Set(saved?.locked || []));
  const [timer, setTimer] = useState(saved?.timer || 0);
  const [moves, setMoves] = useState(saved?.moves || 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed || 0);
  const [hintCell, setHintCell] = useState<[number, number] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(saved?.gameStarted || false);
  const [isPaused, setIsPaused] = useState(false);
  const [solved, setSolved] = useState(false);
  const [stats, setStats] = useState<PipeStats>(loadStats);
  const [showStats, setShowStats] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const [longPressed, setLongPressed] = useState(false);

  const gridSize = GRID_SIZES[difficulty];

  useEffect(() => { localStorage.setItem('pipes-theme', themeId); }, [themeId]);
  useEffect(() => {
    if (!isRunning || solved || isPaused) return;
    const iv = setInterval(() => setTimer((t: number) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, solved, isPaused]);
  useEffect(() => {
    if (solved) { clearPipesGame(); return; }
    if (gameStarted) savePipesGame({ difficulty, themeId, puzzleData, grid, locked: Array.from(locked), timer, gameStarted, moves, hintsUsed });
  }, [grid, locked, timer, gameStarted, solved, difficulty, puzzleData, themeId, moves, hintsUsed]);

  const connected = useMemo(() => computeConnected(grid, gridSize), [grid, gridSize]);

  const handleRotate = useCallback((r: number, c: number) => {
    if (isPaused || solved || longPressed) { setLongPressed(false); return; }
    if (locked.has(`${r}-${c}`)) { playSfx('wrong'); return; }
    if (!gameStarted) { setGameStarted(true); setIsRunning(true); }
    const newGrid = grid.map(row => row.map(p => [...p] as Pipe));
    newGrid[r][c] = rotatePipe(newGrid[r][c], 1);
    setGrid(newGrid); setMoves(m => m + 1); setHintCell(null);
    playSfx('rotate'); vibrate(12);
    if (isConnected(newGrid, gridSize)) {
      setSolved(true); setIsRunning(false); playSfx('win'); vibrate([60, 60, 200]);
      const s = loadStats();
      s.gamesPlayed += 1; s.gamesWon += 1; s.currentStreak += 1;
      if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
      if (s.bestTime[difficulty] === null || timer < s.bestTime[difficulty]!) s.bestTime[difficulty] = timer;
      if (s.bestMoves[difficulty] === null || moves + 1 < s.bestMoves[difficulty]!) s.bestMoves[difficulty] = moves + 1;
      if (hintsUsed === 0) s.perfectGames += 1;
      setStats(s); saveStatsFn(s);
    }
  }, [grid, locked, isPaused, solved, gameStarted, gridSize, timer, difficulty, moves, hintsUsed, longPressed]);

  const handlePointerDown = (r: number, c: number) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      // toggle lock
      const key = `${r}-${c}`;
      const newLocked = new Set(locked);
      if (newLocked.has(key)) newLocked.delete(key); else newLocked.add(key);
      setLocked(newLocked);
      setLongPressed(true);
      playSfx('click'); vibrate(30);
    }, 450);
  };
  const handlePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const showHint = () => {
    if (solved || !gameStarted) return;
    const h = bestHint(grid, gridSize, connected);
    if (!h) return;
    setHintCell(h); setHintsUsed(n => n + 1);
    playSfx('hint');
    setTimeout(() => setHintCell(null), 2200);
  };

  const newGame = (diff?: Difficulty, t?: Theme) => {
    clearPipesGame();
    const d = diff ?? difficulty;
    const th = t ?? theme;
    setDifficulty(d); setThemeId(th.id);
    const size = GRID_SIZES[d];
    const data = generatePuzzle(size);
    setPuzzleData(data);
    setGrid(data.puzzle.map((r: Pipe[]) => r.map((p: Pipe) => [...p])));
    setLocked(new Set()); setTimer(0); setMoves(0); setHintsUsed(0);
    setIsRunning(false); setGameStarted(false); setIsPaused(false); setSolved(false);
    setHintCell(null);
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

  const renderPipe = (pipe: Pipe, isConn: boolean, isLockedCell: boolean, isHintCell: boolean, isSource: boolean) => {
    const color = isConn ? theme.on : theme.off;
    const width = 4;
    const center = 20;
    const lines: React.ReactNode[] = [];
    if (pipe[0]) lines.push(<line key="t" x1={center} y1={0} x2={center} y2={center} stroke={color} strokeWidth={width} strokeLinecap="round" />);
    if (pipe[1]) lines.push(<line key="r" x1={center} y1={center} x2={40} y2={center} stroke={color} strokeWidth={width} strokeLinecap="round" />);
    if (pipe[2]) lines.push(<line key="b" x1={center} y1={center} x2={center} y2={40} stroke={color} strokeWidth={width} strokeLinecap="round" />);
    if (pipe[3]) lines.push(<line key="l" x1={0} y1={center} x2={center} y2={center} stroke={color} strokeWidth={width} strokeLinecap="round" />);
    lines.push(<circle key="c" cx={center} cy={center} r={3} fill={color} />);
    return (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        {/* glow */}
        {isConn && (
          <g style={{ filter: `drop-shadow(0 0 4px ${theme.glow})` }}>{lines}</g>
        )}
        {!isConn && lines}
        {isSource && <circle cx={center} cy={center} r={5.5} fill="none" stroke="#fff" strokeWidth={1.4} opacity={0.7} />}
        {isLockedCell && <circle cx={34} cy={6} r={3.5} fill="#fbbf24" />}
        {isHintCell && (
          <motion.circle cx={center} cy={center} r={14} fill="none" stroke="#fbbf24" strokeWidth={2}
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
        )}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6" dir={dir}>
      <div className="flex items-center justify-between mb-1 max-w-[400px] mx-auto">
        <button onClick={() => navigate('/games')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
          <ArrowLeft className={`w-5 h-5 text-foreground stroke-[1.8] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{isAr ? 'الأنابيب' : 'Pipes'}</h1>
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

      <div className="max-w-[400px] mx-auto mb-3 px-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {(['easy','medium','hard','expert'] as Difficulty[]).map(d => (
              <button key={d} onClick={() => newGame(d)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${difficulty === d ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {diffLabels[d]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">{moves}</span>
            <span className="text-foreground tabular-nums font-medium">{fmt(timer)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {THEMES.map(th => (
            <button key={th.id} onClick={() => { setThemeId(th.id); }}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all flex items-center gap-1.5 ${themeId === th.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: th.on }} />
              {isAr ? th.ar : th.de}
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
                  <span className="text-foreground tabular-nums">{stats.bestTime[d] ? fmt(stats.bestTime[d]!) : '—'} · {stats.bestMoves[d] ?? '—'}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {solved && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center py-3 mb-3 rounded-2xl bg-primary/12 max-w-[400px] mx-auto flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5 text-primary stroke-[1.8]" />
          <span className="text-primary font-bold">{isAr ? 'تدفّق!' : 'Verbunden!'}</span>
          <span className="text-primary/70 text-sm font-medium">{fmt(timer)} · {moves}</span>
          {hintsUsed === 0 && <span className="text-amber-400 text-xs">★</span>}
        </motion.div>
      )}

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
                <span className="text-[10px] text-muted-foreground/70 max-w-[260px] text-center">
                  {isAr ? 'اضغط لتدوير، اضغط مطوّلاً للقفل' : 'Tippen zum Drehen, halten zum Sperren'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-2xl overflow-hidden border border-border/40 p-2 bg-secondary/20">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
            {grid.map((row, ri) => row.map((pipe, ci) => {
              const key = `${ri}-${ci}`;
              const isLocked = locked.has(key);
              const isHintCell = hintCell && hintCell[0] === ri && hintCell[1] === ci;
              const isConn = connected[ri][ci];
              const isSource = ri === 0 && ci === 0;
              return (
                <motion.button
                  key={key}
                  onClick={() => handleRotate(ri, ci)}
                  onPointerDown={() => handlePointerDown(ri, ci)}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  whileTap={{ scale: isLocked ? 1 : 0.9 }}
                  animate={{ rotate: 0 }}
                  className={`aspect-square rounded-lg p-1 transition-all ${
                    isConn ? 'bg-primary/10' : 'bg-secondary/60'
                  } ${isLocked ? 'opacity-90 ring-1 ring-amber-400/50' : ''} ${solved ? '' : 'active:bg-primary/20'}`}>
                  {renderPipe(pipe, isConn, isLocked, !!isHintCell, isSource)}
                </motion.button>
              );
            }))}
          </div>
        </div>
      </div>

      {!solved && gameStarted && !isPaused && (
        <div className="max-w-[400px] mx-auto flex justify-center mt-3 gap-2">
          <button onClick={showHint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 text-xs font-bold">
            <Lightbulb className="w-3 h-3" />{isAr ? 'تلميح' : 'Tipp'}
            {hintsUsed > 0 && <span className="opacity-60">×{hintsUsed}</span>}
          </button>
          <span className="text-[10px] text-muted-foreground self-center">
            🔒 {locked.size} {isAr ? 'مقفل' : 'gesperrt'}
          </span>
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
