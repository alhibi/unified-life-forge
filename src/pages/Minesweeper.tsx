import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Flag, Play, Pause, Bomb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Difficulty = 'easy' | 'medium' | 'hard';
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
}

const CONFIGS: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  easy: { rows: 8, cols: 8, mines: 10 },
  medium: { rows: 10, cols: 10, mines: 20 },
  hard: { rows: 12, cols: 10, mines: 35 },
};

function loadStats(): MineStats {
  const s = localStorage.getItem('mine-stats');
  return s ? JSON.parse(s) : { gamesPlayed: 0, gamesWon: 0, bestTime: { easy: null, medium: null, hard: null }, currentStreak: 0, bestStreak: 0 };
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

function saveMineGame(data: any) { localStorage.setItem('mine-game-state', JSON.stringify(data)); }
function loadMineGame(): any { const s = localStorage.getItem('mine-game-state'); return s ? JSON.parse(s) : null; }
function clearMineGame() { localStorage.removeItem('mine-game-state'); }

export default function MinesweeperPage() {
  const { dir, language } = useApp();
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
  const [stats, setStats] = useState<MineStats>(loadStats);
  const [showStats, setShowStats] = useState(false);

  const config = CONFIGS[difficulty];
  const flagCount = board.flat().filter(c => c.state === 'flagged').length;

  useEffect(() => {
    if (!isRunning || gameOver || isPaused) return;
    const iv = setInterval(() => setTimer((t: number) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isRunning, gameOver, isPaused]);

  useEffect(() => {
    if (gameOver || won) { clearMineGame(); return; }
    if (gameStarted) saveMineGame({ difficulty, board, gameOver, won, timer, gameStarted, firstClick });
  }, [board, timer, gameStarted, gameOver, won, difficulty, firstClick]);

  const reveal = useCallback((b: Cell[][], r: number, c: number) => {
    if (r < 0 || r >= b.length || c < 0 || c >= b[0].length) return;
    if (b[r][c].state !== 'hidden') return;
    b[r][c] = { ...b[r][c], state: 'revealed' };
    if (b[r][c].adjacent === 0 && !b[r][c].mine) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) reveal(b, r + dr, c + dc);
    }
  }, []);

  const checkWin = (b: Cell[][]) => {
    return b.every(row => row.every(c => c.mine ? c.state !== 'revealed' : c.state === 'revealed'));
  };

  const handleCell = useCallback((r: number, c: number) => {
    if (gameOver || won || isPaused) return;
    if (!gameStarted) { setGameStarted(true); setIsRunning(true); }

    const cell = board[r][c];

    if (flagMode) {
      if (cell.state === 'revealed') return;
      const nb = board.map(row => row.map(c => ({ ...c })));
      nb[r][c] = { ...nb[r][c], state: cell.state === 'flagged' ? 'hidden' : 'flagged' };
      setBoard(nb);
      return;
    }

    if (cell.state === 'flagged') return;
    if (cell.state === 'revealed') return;

    let nb: Cell[][];
    if (firstClick) {
      nb = createBoard(difficulty, r, c);
      setFirstClick(false);
    } else {
      nb = board.map(row => row.map(c => ({ ...c })));
    }

    if (nb[r][c].mine) {
      // Game over - reveal all mines
      nb.forEach(row => row.forEach(c => { if (c.mine) c.state = 'revealed'; }));
      setBoard(nb);
      setGameOver(true);
      setIsRunning(false);
      const s = { ...stats, gamesPlayed: stats.gamesPlayed + 1, currentStreak: 0 };
      setStats(s);
      saveStatsFn(s);
      return;
    }

    reveal(nb, r, c);
    setBoard(nb);

    if (checkWin(nb)) {
      setWon(true);
      setIsRunning(false);
      const s = { ...stats, gamesPlayed: stats.gamesPlayed + 1, gamesWon: stats.gamesWon + 1 };
      s.currentStreak++;
      if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
      if (s.bestTime[difficulty] === null || timer < s.bestTime[difficulty]!) s.bestTime[difficulty] = timer;
      setStats(s);
      saveStatsFn(s);
    }
  }, [board, gameOver, won, isPaused, flagMode, firstClick, difficulty, stats, timer, gameStarted, reveal]);

  const handleLongPress = useCallback((r: number, c: number) => {
    if (gameOver || won || isPaused) return;
    const cell = board[r][c];
    if (cell.state === 'revealed') return;
    const nb = board.map(row => row.map(c => ({ ...c })));
    nb[r][c] = { ...nb[r][c], state: cell.state === 'flagged' ? 'hidden' : 'flagged' };
    setBoard(nb);
  }, [board, gameOver, won, isPaused]);

  const newGame = (diff: Difficulty) => {
    clearMineGame();
    setDifficulty(diff);
    setBoard(createBoard(diff));
    setGameOver(false); setWon(false); setTimer(0);
    setIsRunning(false); setGameStarted(false); setIsPaused(false);
    setFlagMode(false); setFirstClick(true);
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

  const getCellColor = (cell: Cell) => {
    if (cell.state !== 'revealed') return '';
    if (cell.mine) return 'bg-destructive/20 text-destructive';
    const colors = ['', 'text-blue-500', 'text-green-600', 'text-red-500', 'text-purple-600', 'text-amber-700', 'text-cyan-600', 'text-foreground', 'text-muted-foreground'];
    return colors[cell.adjacent] || '';
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6" dir={dir}>
      <div className="flex items-center justify-between mb-1 max-w-[360px] mx-auto">
        <button onClick={() => navigate('/games')} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
          <ArrowLeft className={`w-5 h-5 text-foreground stroke-[1.8] ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{language === 'ar' ? 'كاسحة الألغام' : 'Minesweeper'}</h1>
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
          <button onClick={() => setFlagMode(!flagMode)}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${flagMode ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>
            <Flag className="w-3 h-3" /> {config.mines - flagCount}
          </button>
          <span className="text-sm text-muted-foreground tabular-nums font-medium">{fmt(timer)}</span>
        </div>
      </div>

      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden max-w-[360px] mx-auto mb-3">
            <div className="rounded-2xl bg-secondary/50 p-4 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: stats.gamesWon, l: language === 'ar' ? 'فوز' : 'Wins' },
                  { v: stats.bestStreak, l: language === 'ar' ? 'سلسلة' : 'Streak' },
                  { v: stats.gamesPlayed, l: language === 'ar' ? 'لعبت' : 'Played' },
                ].map((s, i) => (
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

      {(gameOver || won) && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className={`text-center py-3 mb-3 rounded-2xl max-w-[360px] mx-auto flex items-center justify-center gap-2 ${won ? 'bg-primary/12' : 'bg-destructive/12'}`}>
          {won ? <Trophy className="w-5 h-5 text-primary stroke-[1.8]" /> : <Bomb className="w-5 h-5 text-destructive stroke-[1.8]" />}
          <span className={`font-bold ${won ? 'text-primary' : 'text-destructive'}`}>
            {won ? (language === 'ar' ? 'فزت!' : 'You win!') : (language === 'ar' ? 'انفجار!' : 'Boom!')}
          </span>
          <span className={`text-sm font-medium ${won ? 'text-primary/70' : 'text-destructive/70'}`}>{fmt(timer)}</span>
        </motion.div>
      )}

      <div className="max-w-[360px] mx-auto relative">
        <AnimatePresence>
          {(!gameStarted || isPaused) && !gameOver && !won && (
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

        <div className="rounded-2xl overflow-hidden border border-border/40">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
            {board.map((row, ri) => row.map((cell, ci) => (
              <button
                key={`${ri}-${ci}`}
                onClick={() => handleCell(ri, ci)}
                onContextMenu={(e) => { e.preventDefault(); handleLongPress(ri, ci); }}
                className={`aspect-square flex items-center justify-center text-[11px] font-bold border-[0.5px] border-border/20 transition-colors
                  ${cell.state === 'revealed'
                    ? cell.mine ? 'bg-destructive/15' : 'bg-background/80'
                    : cell.state === 'flagged' ? 'bg-amber-500/10' : 'bg-secondary/60 hover:bg-secondary active:bg-secondary/80'
                  } ${getCellColor(cell)}`}
              >
                {cell.state === 'revealed' && cell.mine && '💣'}
                {cell.state === 'revealed' && !cell.mine && cell.adjacent > 0 && cell.adjacent}
                {cell.state === 'flagged' && '🚩'}
              </button>
            )))}
          </div>
        </div>
      </div>
    </div>
  );
}
