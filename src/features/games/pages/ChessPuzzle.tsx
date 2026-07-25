import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/features/games/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, Check, X, RotateCcw, ArrowRight, Sparkles, Lightbulb } from '@/lib/icons';
import { playSfx, vibrate } from '@/features/games/utils/gameFeedback';
import {
  PUZZLES,
  ChessPuzzle,
  PuzzleTheme,
  fenToBoard,
  fenSideToMove,
  moveFromUci,
  uciFromMove,
  PuzzlePiece,
  PuzzleBoard,
} from '@/features/games/data/chessPuzzles';

// =============================================================================
// Helpers
// =============================================================================
const PIECE_GLYPH: Record<PuzzlePiece['color'], Record<PuzzlePiece['type'], string>> = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};

function cloneBoard(b: PuzzleBoard): PuzzleBoard {
  return b.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

function inBounds(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

// Generate raw moves (no king-safety filtering needed for puzzle UX, since
// the user only chooses from solution set). We still filter by side to give
// useful highlights.
function getRawMoves(board: PuzzleBoard, r: number, c: number): [number, number][] {
  const piece = board[r][c]; if (!piece) return [];
  const moves: [number, number][] = [];
  const enemy = piece.color === 'w' ? 'b' : 'w';
  const slide = (dr: number, dc: number) => {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (board[nr][nc]) { if (board[nr][nc]!.color === enemy) moves.push([nr, nc]); break; }
      moves.push([nr, nc]); nr += dr; nc += dc;
    }
  };
  switch (piece.type) {
    case 'P': {
      const dir = piece.color === 'w' ? -1 : 1;
      const startRow = piece.color === 'w' ? 6 : 1;
      if (inBounds(r + dir, c) && !board[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === startRow && !board[r + 2 * dir][c]) moves.push([r + 2 * dir, c]);
      }
      for (const dc of [-1, 1]) {
        if (inBounds(r + dir, c + dc) && board[r + dir][c + dc]?.color === enemy) {
          moves.push([r + dir, c + dc]);
        }
      }
      break;
    }
    case 'N':
      for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc]?.color !== piece.color) moves.push([nr, nc]);
      }
      break;
    case 'B': for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr, dc); break;
    case 'R': for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc); break;
    case 'Q': for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) slide(dr, dc); break;
    case 'K':
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc]?.color !== piece.color) moves.push([nr, nc]);
      }
      break;
  }
  return moves;
}

function applyMove(board: PuzzleBoard, from: [number, number], to: [number, number], promotion?: string): PuzzleBoard {
  const nb = cloneBoard(board);
  const piece = nb[from[0]][from[1]]!;
  nb[to[0]][to[1]] = nb[from[0]][from[1]];
  nb[from[0]][from[1]] = null;
  if (piece.type === 'P' && (to[0] === 0 || to[0] === 7)) {
    nb[to[0]][to[1]] = { type: (promotion?.toUpperCase() as PuzzlePiece['type']) || 'Q', color: piece.color };
  }
  return nb;
}

// =============================================================================
// Stats
// =============================================================================
interface PuzzleStats {
  solved: number;
  attempted: number;
  rating: number;
  bestStreak: number;
  currentStreak: number;
  solvedIds: string[];
  hintsUsed: number;
  themesSolved: Record<PuzzleTheme, number>;
}
const DEFAULT: PuzzleStats = {
  solved: 0, attempted: 0, rating: 800, bestStreak: 0, currentStreak: 0,
  solvedIds: [], hintsUsed: 0,
  themesSolved: { mateIn1: 0, mateIn2: 0, fork: 0, pin: 0, skewer: 0, discovery: 0, doubleAttack: 0, sacrifice: 0, trap: 0 },
};
function loadStats(): PuzzleStats {
  try {
    const s = JSON.parse(localStorage.getItem('chess-puzzle-stats') || '{}');
    return {
      ...DEFAULT, ...s,
      solvedIds: Array.isArray(s.solvedIds) ? s.solvedIds : [],
      themesSolved: { ...DEFAULT.themesSolved, ...(s.themesSolved || {}) },
    };
  } catch { return { ...DEFAULT }; }
}
import { saveGameProgress, getGameProgress } from '../api';

function saveStatsFn(s: PuzzleStats) {
  localStorage.setItem('chess-puzzle-stats', JSON.stringify(s));
  saveGameProgress('chess-puzzle', s).catch(console.error);
}

// Glicko-lite: rating moves toward puzzle.rating depending on result.
function updateRating(current: number, puzzleRating: number, solved: boolean): number {
  const k = 32;
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - current) / 400));
  const score = solved ? 1 : 0;
  return Math.round(current + k * (score - expected));
}

// Pick next puzzle: prefer ones close to current rating not yet solved
function pickNextPuzzle(stats: PuzzleStats, theme: PuzzleTheme | 'all'): ChessPuzzle {
  let pool = PUZZLES;
  if (theme !== 'all') pool = pool.filter(p => p.theme === theme);
  if (pool.length === 0) pool = PUZZLES;
  const unsolved = pool.filter(p => !stats.solvedIds.includes(p.id));
  const candidates = unsolved.length > 0 ? unsolved : pool;
  // Sort by distance to current rating
  candidates.sort((a, b) => Math.abs(a.rating - stats.rating) - Math.abs(b.rating - stats.rating));
  // Pick from top 4 randomly to avoid determinism
  const top = candidates.slice(0, Math.min(4, candidates.length));
  return top[Math.floor(Math.random() * top.length)];
}

// =============================================================================
// Component
// =============================================================================
export default function ChessPuzzlePage() {
  const { } = useApp();
  const [stats, setStats] = useState<PuzzleStats>(loadStats);

  useEffect(() => {
    const syncStats = async () => {
      try {
        const cloudStats = await getGameProgress('chess-puzzle');
        if (cloudStats) {
          localStorage.setItem('chess-puzzle-stats', JSON.stringify(cloudStats));
          setStats(prev => ({ ...prev, ...cloudStats }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    syncStats();
  }, []);

  const [theme, setTheme] = useState<PuzzleTheme | 'all'>(() => (localStorage.getItem('chess-puzzle-theme') as PuzzleTheme | 'all') || 'all');
  useEffect(() => { localStorage.setItem('chess-puzzle-theme', theme); }, [theme]);

  const [puzzle, setPuzzle] = useState<ChessPuzzle>(() => pickNextPuzzle(loadStats(), 'all'));
  const [board, setBoard] = useState<PuzzleBoard>(() => fenToBoard(puzzle.fen));
  const [moveIdx, setMoveIdx] = useState(0); // index into puzzle.solution to play next
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legal, setLegal] = useState<[number, number][]>([]);
  const [status, setStatus] = useState<'thinking' | 'correct' | 'wrong' | 'solved' | 'hint'>('thinking');
  const [hintHighlight, setHintHighlight] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [showWrongFeedback, setShowWrongFeedback] = useState(false);

  const playerSide = useMemo(() => {
    // Solution[0] is opponent's move → after that, it's user's turn.
    const stm = fenSideToMove(puzzle.fen);
    return stm === 'w' ? 'b' : 'w';
  }, [puzzle.fen]);

  const flipped = playerSide === 'b';

  // Auto-play the first move (opponent setup) after a short delay
  useEffect(() => {
    if (moveIdx === 0 && puzzle.solution.length > 0) {
      const first = puzzle.solution[0];
      const m = moveFromUci(first);
      setTimeout(() => {
        setBoard(b => applyMove(b, m.from, m.to, m.promotion));
        setLastMove({ from: m.from, to: m.to });
        setMoveIdx(1);
        playSfx('move');
      }, 600);
    }
  }, [puzzle, moveIdx]);

  const loadPuzzle = useCallback((p: ChessPuzzle) => {
    setPuzzle(p);
    setBoard(fenToBoard(p.fen));
    setMoveIdx(0); setSelected(null); setLegal([]);
    setStatus('thinking'); setHintHighlight(null); setShowSolution(false);
    setLastMove(null); setShowWrongFeedback(false);
  }, []);

  const nextPuzzle = useCallback(() => {
    const s = loadStats();
    setStats(s);
    loadPuzzle(pickNextPuzzle(s, theme));
  }, [loadPuzzle, theme]);

  const restart = () => loadPuzzle(puzzle);

  const handleClick = useCallback((r: number, c: number) => {
    if (status === 'solved' || showSolution) return;
    if (moveIdx === 0) return; // wait for opponent's setup
    const piece = board[r][c];

    if (selected) {
      const [sr, sc] = selected;
      const isLegalSquare = legal.some(([mr, mc]) => mr === r && mc === c);
      if (isLegalSquare) {
        const fromTo = uciFromMove([sr, sc], [r, c], (board[sr][sc]?.type === 'P' && (r === 0 || r === 7) ? 'q' : undefined));
        const expected = puzzle.solution[moveIdx];
        if (fromTo === expected) {
          // Correct move
          const newBoard = applyMove(board, [sr, sc], [r, c], 'q');
          setBoard(newBoard);
          setLastMove({ from: [sr, sc], to: [r, c] });
          setSelected(null); setLegal([]);
          playSfx('match'); vibrate(20);
          if (moveIdx + 1 >= puzzle.solution.length) {
            // Solved!
            setStatus('solved');
            playSfx('win'); vibrate([60, 60, 200]);
            const s = loadStats();
            const wasNew = !s.solvedIds.includes(puzzle.id);
            if (wasNew) {
              s.solved += 1;
              s.solvedIds.push(puzzle.id);
              s.themesSolved[puzzle.theme] = (s.themesSolved[puzzle.theme] || 0) + 1;
            }
            s.attempted += 1;
            s.rating = updateRating(s.rating, puzzle.rating, true);
            s.currentStreak += 1;
            if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
            saveStatsFn(s); setStats(s);
          } else {
            // Auto-play opponent's reply
            setStatus('correct');
            const userMoveIdx = moveIdx; // capture
            setMoveIdx(userMoveIdx + 1);
            setTimeout(() => {
              const next = puzzle.solution[userMoveIdx + 1];
              if (next) {
                const m = moveFromUci(next);
                setBoard(prev => applyMove(prev, m.from, m.to, m.promotion));
                setLastMove({ from: m.from, to: m.to });
                playSfx('move');
                setMoveIdx(userMoveIdx + 2);
                setStatus('thinking');
              }
            }, 700);
          }
          return;
        } else {
          // Wrong
          playSfx('wrong'); vibrate(80);
          setStatus('wrong');
          setShowWrongFeedback(true);
          const s = loadStats();
          if (s.currentStreak > 0) {
            s.currentStreak = 0; saveStatsFn(s); setStats(s);
          }
          setTimeout(() => { setShowWrongFeedback(false); setStatus('thinking'); }, 1200);
          setSelected(null); setLegal([]);
          return;
        }
      }
      // Clicked another own piece → reselect
      if (piece && piece.color === playerSide) {
        setSelected([r, c]);
        setLegal(getRawMoves(board, r, c));
        return;
      }
      setSelected(null); setLegal([]);
      return;
    }

    if (piece && piece.color === playerSide) {
      setSelected([r, c]);
      setLegal(getRawMoves(board, r, c));
      playSfx('click');
    }
  }, [board, selected, legal, moveIdx, puzzle, playerSide, status, showSolution]);

  const useHint = () => {
    if (status !== 'thinking' || moveIdx >= puzzle.solution.length) return;
    const expected = puzzle.solution[moveIdx];
    const m = moveFromUci(expected);
    setHintHighlight({ from: m.from, to: m.to });
    setStatus('hint');
    const s = loadStats();
    s.hintsUsed += 1;
    if (s.currentStreak > 0) s.currentStreak = 0;
    s.rating = Math.max(400, s.rating - 8);
    saveStatsFn(s); setStats(s);
    playSfx('hint');
    setTimeout(() => { setHintHighlight(null); setStatus('thinking'); }, 2500);
  };

  const giveUp = () => {
    setShowSolution(true);
    const s = loadStats();
    s.attempted += 1;
    s.currentStreak = 0;
    s.rating = updateRating(s.rating, puzzle.rating, false);
    saveStatsFn(s); setStats(s);
    // Animate full solution
    let idx = moveIdx;
    let workingBoard = board;
    const playNext = () => {
      if (idx >= puzzle.solution.length) return;
      const m = moveFromUci(puzzle.solution[idx]);
      workingBoard = applyMove(workingBoard, m.from, m.to, m.promotion);
      setBoard(workingBoard);
      setLastMove({ from: m.from, to: m.to });
      playSfx('move');
      idx++;
      setTimeout(playNext, 700);
    };
    setTimeout(playNext, 400);
  };

  // Theme labels
  const themeLabels: Record<PuzzleTheme | 'all', { ar: string; }> = {
    all: { ar: 'الكل', },
    mateIn1: { ar: 'مات في 1', },
    mateIn2: { ar: 'مات في 2', },
    fork: { ar: 'شوكة', },
    pin: { ar: 'تثبيت', },
    skewer: { ar: 'سيخ', },
    discovery: { ar: 'هجوم مكشوف', },
    doubleAttack: { ar: 'هجوم مزدوج', },
    sacrifice: { ar: 'تضحية', },
    trap: { ar: 'فخ', },
  };

  const rules = [
    'حُل اللغز بإيجاد أفضل نقلة',
    'النقلة الصحيحة تستمر في الحل، الخطأ يعيدك',
    'استخدم تلميحاً إذا احتجت (يُخفض تقييمك قليلاً)',
    'تقييمك يتحرك حسب صعوبة الألغاز التي تحلها',
    'الألغاز تتنوع: مات سريع، شوكات، تضحيات، تثبيت...',
  ];

  const totalSolved = Object.values(stats.themesSolved).reduce((a, b) => a + b, 0);
  const statsArr = [
    { label: 'تقييم', value: stats.rating },
    { label: 'محلولة', value: stats.solved },
    { label: 'سلسلة', value: stats.currentStreak },
    { label: 'أفضل سلسلة', value: stats.bestStreak },
    { label: 'مات في 1', value: stats.themesSolved.mateIn1 || 0 },
    { label: 'شوكات', value: stats.themesSolved.fork || 0 },
    { label: 'تضحيات', value: stats.themesSolved.sacrifice || 0 },
    { label: 'تلميحات', value: stats.hintsUsed },
  ];

  const themes: (PuzzleTheme | 'all')[] = ['all', 'mateIn1', 'mateIn2', 'fork', 'pin', 'skewer', 'discovery', 'sacrifice'];
  const options = [{
    key: 'theme', label: 'الموضوع',
    choices: themes.map(t => ({ value: t, label: themeLabels[t].ar })),
    current: theme,
    onChange: (v: string) => { const t = v as PuzzleTheme | 'all'; setTheme(t); loadPuzzle(pickNextPuzzle(loadStats(), t)); },
  }];

  // Render board with flipping
  const rows = flipped ? Array.from({ length: 8 }, (_, i) => 7 - i) : Array.from({ length: 8 }, (_, i) => i);
  const cols = flipped ? Array.from({ length: 8 }, (_, i) => 7 - i) : Array.from({ length: 8 }, (_, i) => i);

  return (
    <GameShell
      title={'ألغاز الشطرنج'}
      icon={Puzzle}
      accentColor="hsl(45, 93%, 47%)"
      rules={rules}
      stats={statsArr}
      options={options}
    >
      {/* Puzzle header */}
      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{themeLabels[puzzle.theme].ar}</span>
            <span className="text-[10px] text-zinc-500">{puzzle.rating}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              status === 'solved' ? 'bg-emerald-500/20 text-emerald-300' :
              status === 'wrong' || showWrongFeedback ? 'bg-rose-500/20 text-rose-300' :
              status === 'hint' ? 'bg-amber-500/20 text-amber-300' :
              'bg-purple-500/20 text-purple-300'
            }`}>
              {status === 'solved' ? ('✓ تم') :
                showWrongFeedback ? ('✗ خطأ') :
                status === 'hint' ? ('تلميح') :
                moveIdx === 0 ? ('انتظر...') : ('دورك')}
            </span>
          </div>
        </div>
        <p className="text-xs text-zinc-300">
          {playerSide === 'w' ? ('الأبيض يلعب') : ('الأسود يلعب')}
        </p>
      </div>

      {/* Board */}
      <div className="max-w-[340px] mx-auto px-2 relative">
        <div className="rounded-lg overflow-hidden">
          <div className="grid grid-cols-8">
            {rows.map(ri => cols.map(ci => {
              const isDark = (ri + ci) % 2 === 1;
              const cell = board[ri][ci];
              const isSel = selected && selected[0] === ri && selected[1] === ci;
              const isLegalSq = legal.some(([mr, mc]) => mr === ri && mc === ci);
              const isHint = hintHighlight && (
                (hintHighlight.from[0] === ri && hintHighlight.from[1] === ci) ||
                (hintHighlight.to[0] === ri && hintHighlight.to[1] === ci)
              );
              const isLast = lastMove && (
                (lastMove.from[0] === ri && lastMove.from[1] === ci) ||
                (lastMove.to[0] === ri && lastMove.to[1] === ci)
              );
              return (
                <button
                  key={`${ri}-${ci}`}
                  onClick={() => handleClick(ri, ci)}
                  className="aspect-square relative flex items-center justify-center transition-colors"
                  style={{
                    background: isSel
                      ? '#a855f7'
                      : isHint
                        ? 'rgba(245,158,11,0.5)'
                        : isLast
                          ? 'rgba(168,85,247,0.25)'
                          : isDark ? 'hsl(265, 25%, 38%)' : 'hsl(265, 18%, 78%)',
                  }}>
                  {isLegalSq && !cell && (
                    <div className="absolute w-[26%] h-[26%] rounded-full bg-black/25" />
                  )}
                  {isLegalSq && cell && (
                    <div className="absolute inset-[4px] rounded-full ring-[3px] ring-black/25 ring-inset" />
                  )}
                  {isHint && (
                    <motion.div className="absolute inset-0 ring-2 ring-amber-400/80 rounded"
                      animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} />
                  )}
                  {cell && (
                    <span className={`relative z-raised select-none leading-none ${cell.color === 'w' ? 'text-white ' : 'text-gray-900'}`}
                      style={{ fontSize: 'min(7vw, 30px)' }}>
                      {PIECE_GLYPH[cell.color][cell.type]}
                    </span>
                  )}
                </button>
              );
            }))}
          </div>
        </div>

        {/* Wrong feedback overlay */}
        <AnimatePresence>
          {showWrongFeedback && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-header flex items-center justify-center pointer-events-none">
              <div className="px-4 py-2 rounded-xl bg-card border border-destructive">
                <X className="w-8 h-8 text-rose-300 mx-auto" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status / Solved */}
      <AnimatePresence>
        {status === 'solved' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-[340px] mx-auto mt-4 text-center p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
            <Sparkles className="w-7 h-7 text-emerald-300 mx-auto mb-1" />
            <p className="text-emerald-300 font-black text-lg mb-0.5">{'حللت اللغز!'}</p>
            <p className="text-[11px] text-zinc-400">
              {'تقييم'}: <span className="text-white font-bold">{stats.rating}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {showSolution && status !== 'solved' && (
        <div className="max-w-[340px] mx-auto mt-4 text-center p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-amber-300 font-bold text-sm">
            {'الحل: '}
            <span className="font-mono">{puzzle.solution.join(' ')}</span>
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">{puzzle.ar}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-2 mt-5 max-w-[340px] mx-auto">
        <button onClick={useHint} disabled={status === 'solved' || showSolution || moveIdx === 0}
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl bg-amber-500/15 text-amber-300 active:scale-90 disabled:opacity-30">
          <Lightbulb className="w-4 h-4" />
          <span className="text-[10px] font-bold">{'تلميح'}</span>
        </button>
        <button onClick={restart}
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl bg-purple-500/15 text-purple-300 active:scale-90">
          <RotateCcw className="w-4 h-4" />
          <span className="text-[10px] font-bold">{'إعادة'}</span>
        </button>
        <button onClick={giveUp} disabled={status === 'solved' || showSolution}
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl bg-zinc-500/15 text-zinc-300 active:scale-90 disabled:opacity-30">
          <Check className="w-4 h-4" />
          <span className="text-[10px] font-bold">{'الحل'}</span>
        </button>
        <button onClick={nextPuzzle}
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl bg-purple-500 text-white active:scale-90">
          <ArrowRight className="w-4 h-4" />
          <span className="text-[10px] font-bold">{'التالي'}</span>
        </button>
      </div>

      {/* Theme breakdown */}
      <div className="max-w-[340px] mx-auto mt-6">
        <p className="text-[11px] text-zinc-500 mb-2 px-1">{'إحصاءات الموضوع'}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(themeLabels) as (PuzzleTheme | 'all')[]).filter(t => t !== 'all').map(t => (
            <div key={t} className="rounded-lg p-2 bg-white/4 border border-white/5 text-center">
              <p className="text-[10px] text-zinc-500 mb-0.5">{themeLabels[t].ar}</p>
              <p className="text-sm font-bold text-purple-300 tabular-nums">{stats.themesSolved[t as PuzzleTheme] || 0}</p>
            </div>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
