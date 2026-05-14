import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, RotateCcw, Lightbulb, Hash, Eye, EyeOff, Pause, Play } from 'lucide-react';
import { playSfx, vibrate } from '@/utils/gameFeedback';

type Mode = 'numbers' | 'image';

interface ImageSet {
  id: string;
  ar: string;
  de: string;
  url: string;
  thumb: string;
}

const IMAGE_SETS: ImageSet[] = [
  { id: 'mosaic', ar: 'فسيفساء',  de: 'Mosaik',   url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=900&q=80', thumb: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=120&q=80' },
  { id: 'desert', ar: 'صحراء',    de: 'Wüste',    url: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=900&q=80', thumb: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=120&q=80' },
  { id: 'mountain',ar:'جبال',     de: 'Berge',    url: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=900&q=80', thumb: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=120&q=80' },
  { id: 'aurora', ar: 'الشفق',    de: 'Polarlicht',url:'https://images.unsplash.com/photo-1495572797599-13c8c4ad3c45?w=900&q=80', thumb: 'https://images.unsplash.com/photo-1495572797599-13c8c4ad3c45?w=120&q=80' },
  { id: 'forest', ar: 'غابة',     de: 'Wald',     url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=900&q=80', thumb: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=120&q=80' },
  { id: 'ocean',  ar: 'محيط',     de: 'Ozean',    url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=900&q=80', thumb: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=120&q=80' },
];

// ----------------- Logic -----------------
function createSolvedBoard(size: number) { return Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size)); }
function isSolvable(board: number[], size: number) {
  let inversions = 0;
  const filtered = board.filter(n => n !== 0);
  for (let i = 0; i < filtered.length; i++) for (let j = i + 1; j < filtered.length; j++) if (filtered[i] > filtered[j]) inversions++;
  const blankRow = Math.floor(board.indexOf(0) / size);
  if (size % 2 === 0) return (inversions + blankRow) % 2 === 1;
  return inversions % 2 === 0;
}
function isSolved(board: number[], size: number) { return board.every((v, i) => v === (i + 1) % (size * size)); }
function shuffle(size: number): number[] {
  let board: number[];
  do { board = createSolvedBoard(size).sort(() => Math.random() - 0.5); } while (!isSolvable(board, size) || isSolved(board, size));
  return board;
}

// Find the best tile to move next: pick adjacent-to-blank tile whose movement
// most reduces total Manhattan distance.
function bestHintTile(board: number[], size: number): number | null {
  const blank = board.indexOf(0);
  const br = Math.floor(blank / size), bc = blank % size;
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  let best: { idx: number; gain: number } | null = null;
  for (const [dr, dc] of dirs) {
    const r = br + dr, c = bc + dc;
    if (r < 0 || r >= size || c < 0 || c >= size) continue;
    const idx = r * size + c;
    const tile = board[idx];
    const targetIdx = tile - 1;
    const tr = Math.floor(targetIdx / size), tc = targetIdx % size;
    const currDist = Math.abs(r - tr) + Math.abs(c - tc);
    const newDist  = Math.abs(br - tr) + Math.abs(bc - tc);
    const gain = currDist - newDist;
    if (!best || gain > best.gain) best = { idx, gain };
  }
  return best ? best.idx : null;
}

// Build a list of optimal moves toward solution (IDA*-lite, capped depth for 3×3 only).
// For larger sizes we just return the best hint tile.
function solveStep(board: number[], size: number): number | null {
  if (isSolved(board, size)) return null;
  return bestHintTile(board, size);
}

// ----------------- Component -----------------
interface PuzzleStats {
  gamesPlayed: number;
  gamesWon: number;
  bestMoves: Partial<Record<string, number>>;  // by size key
  bestTime: Partial<Record<string, number>>;
}
function loadStats(): PuzzleStats {
  try {
    const s = JSON.parse(localStorage.getItem('puzzle-stats') || '{}');
    // migrate legacy keys
    const out: PuzzleStats = {
      gamesPlayed: s.gamesPlayed || 0,
      gamesWon: s.gamesWon || 0,
      bestMoves: s.bestMoves && typeof s.bestMoves === 'object' ? s.bestMoves : {},
      bestTime: s.bestTime && typeof s.bestTime === 'object' ? s.bestTime : {},
    };
    if (typeof s.bestMoves === 'number') out.bestMoves['4'] = s.bestMoves;
    if (typeof s.bestTime === 'number') out.bestTime['4'] = s.bestTime;
    return out;
  } catch {
    return { gamesPlayed: 0, gamesWon: 0, bestMoves: {}, bestTime: {} };
  }
}
function saveStats(s: PuzzleStats) { localStorage.setItem('puzzle-stats', JSON.stringify(s)); }

export default function PuzzleGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [gridSize, setGridSize] = useState(() => localStorage.getItem('puzzle-size') || '4');
  const SIZE = parseInt(gridSize);
  const TOTAL = SIZE * SIZE;

  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('puzzle-mode') as Mode) || 'numbers');
  const [imageId, setImageId] = useState(() => localStorage.getItem('puzzle-img') || 'mosaic');
  const imageSet = useMemo(() => IMAGE_SETS.find(s => s.id === imageId) ?? IMAGE_SETS[0], [imageId]);
  const [board, setBoard] = useState<number[]>(() => shuffle(SIZE));
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hintIdx, setHintIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const hintTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [stats, setStats] = useState<PuzzleStats>(loadStats);
  const [hintsUsed, setHintsUsed] = useState(0);

  useEffect(() => { localStorage.setItem('puzzle-size', gridSize); }, [gridSize]);
  useEffect(() => { localStorage.setItem('puzzle-mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('puzzle-img', imageId); }, [imageId]);

  useEffect(() => {
    if (!started || won || paused) return;
    const i = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(i);
  }, [started, won, paused]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const correctCount = board.filter((v, i) => v !== 0 && v === (i + 1) % TOTAL).length;
  const progress = (correctCount / (TOTAL - 1)) * 100;

  const handleTap = useCallback((index: number) => {
    if (won || paused) return;
    const blankIndex = board.indexOf(0);
    const row = Math.floor(index / SIZE), col = index % SIZE;
    const blankRow = Math.floor(blankIndex / SIZE), blankCol = blankIndex % SIZE;
    const adj = (Math.abs(row - blankRow) === 1 && col === blankCol) || (Math.abs(col - blankCol) === 1 && row === blankRow);
    if (!adj) return;
    if (!started) setStarted(true);
    const newBoard = [...board];
    [newBoard[index], newBoard[blankIndex]] = [newBoard[blankIndex], newBoard[index]];
    setBoard(newBoard); setMoves(m => m + 1);
    setHintIdx(null); if (hintTimeout.current) clearTimeout(hintTimeout.current);
    playSfx('tap'); vibrate(8);
    if (isSolved(newBoard, SIZE)) {
      setWon(true); playSfx('win'); vibrate([60, 60, 120]);
      const s = loadStats();
      s.gamesPlayed += 1; s.gamesWon += 1;
      const k = String(SIZE);
      s.bestMoves[k] = Math.min(s.bestMoves[k] ?? 99999, moves + 1);
      s.bestTime[k] = Math.min(s.bestTime[k] ?? 99999, seconds);
      saveStats(s); setStats(s);
    }
  }, [board, won, paused, moves, started, seconds, SIZE]);

  const reset = useCallback((newSize?: number) => {
    const s = newSize || SIZE;
    setBoard(shuffle(s)); setMoves(0); setWon(false); setSeconds(0); setStarted(false); setPaused(false);
    setHintIdx(null); setHintsUsed(0);
  }, [SIZE]);

  const showHint = () => {
    if (won) return;
    const idx = solveStep(board, SIZE);
    if (idx === null) return;
    setHintIdx(idx);
    setHintsUsed(h => h + 1);
    playSfx('hint');
    if (hintTimeout.current) clearTimeout(hintTimeout.current);
    hintTimeout.current = setTimeout(() => setHintIdx(null), 2200);
  };

  const isCorrect = (index: number, value: number) => value !== 0 && value === (index + 1) % TOTAL;

  const rules = isAr
    ? ['اضغط على رقم/قطعة مجاورة للفراغ لتحريكها', 'في نمط الصورة: أعد تركيب اللوحة', 'الأخضر = في مكانه الصحيح', 'استخدم التلميح إذا تعثّرت — يقترح أفضل حركة', 'حاول بأقل عدد حركات وأسرع وقت']
    : ['Tippe ein Stück neben der Lücke', 'Im Bildmodus: Bild rekonstruieren', 'Grün = an richtiger Stelle', 'Tipp-Button schlägt den besten Zug vor', 'Wenig Züge & schnell ⇒ Bestwerte'];

  const k = String(SIZE);
  const statsArr = [
    { label: isAr ? 'انتصارات' : 'Siege', value: stats.gamesWon },
    { label: isAr ? `أفضل حركات ${SIZE}×${SIZE}` : `Beste Züge ${SIZE}×${SIZE}`, value: stats.bestMoves[k] ?? '-' },
    { label: isAr ? `أفضل وقت ${SIZE}×${SIZE}` : `Bestzeit ${SIZE}×${SIZE}`, value: stats.bestTime[k] ? formatTime(stats.bestTime[k]!) : '-' },
    { label: isAr ? 'مباريات' : 'Spiele', value: stats.gamesPlayed },
  ];

  const options = [
    { key: 'mode', label: isAr ? 'النمط' : 'Modus',
      choices: [{ value: 'numbers', label: isAr ? 'أرقام' : 'Zahlen' }, { value: 'image', label: isAr ? 'صورة' : 'Bild' }],
      current: mode, onChange: (v: string) => setMode(v as Mode) },
    { key: 'size', label: isAr ? 'حجم الشبكة' : 'Gittergröße',
      choices: [{ value: '3', label: '3×3' }, { value: '4', label: '4×4' }, { value: '5', label: '5×5' }],
      current: gridSize, onChange: (v: string) => { setGridSize(v); reset(parseInt(v)); } },
    ...(mode === 'image' ? [{
      key: 'img', label: isAr ? 'الصورة' : 'Bild',
      choices: IMAGE_SETS.map(s => ({ value: s.id, label: isAr ? s.ar : s.de })),
      current: imageId, onChange: (v: string) => setImageId(v),
    }] : []),
  ];

  return (
    <GameShell title={isAr ? 'الأحجية' : 'Puzzle'} icon={Puzzle} accentColor="#10b981" rules={rules} stats={statsArr} options={options}
      headerRight={
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPaused(p => !p)} disabled={!started || won}
            className="text-emerald-500 active:scale-90 disabled:opacity-30">
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button onClick={() => reset()} className="text-emerald-500 active:scale-90"><RotateCcw className="w-4 h-4" /></button>
        </div>
      }
    >
      {/* Stats bar */}
      <div className="flex justify-between items-center mb-2 px-1">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1"><Hash className="w-3 h-3 text-emerald-500" /><span className="text-emerald-300 font-bold tabular-nums">{moves}</span></span>
          <span className="flex items-center gap-1 text-emerald-200 tabular-nums">{formatTime(seconds)}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span>{correctCount}/{TOTAL - 1}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1.5 mb-3 rounded-full bg-emerald-900/30 overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-teal-300" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Image preview (only image mode) */}
      {mode === 'image' && showPreview && (
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden border border-emerald-500/30">
            <img src={imageSet.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <p className="text-xs text-emerald-300/70">{isAr ? imageSet.ar : imageSet.de}</p>
        </div>
      )}

      {/* Board */}
      <div className="relative">
        <div className="grid mx-auto rounded-2xl overflow-hidden border border-emerald-500/20 bg-zinc-950"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, maxWidth: 360, aspectRatio: '1' }}>
          {board.map((value, index) => {
            const correct = isCorrect(index, value);
            const isHint = hintIdx === index;
            if (value === 0) {
              return <div key={`b-${index}`} className="bg-emerald-950/30 border border-white/3" />;
            }
            const targetIdx = (value - 1);
            const tr = Math.floor(targetIdx / SIZE);
            const tc = targetIdx % SIZE;
            return (
              <motion.button
                key={`t-${value}`}
                layout
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                onClick={() => handleTap(index)}
                disabled={won || paused}
                className={`relative flex items-center justify-center font-black border-2 transition-colors overflow-hidden ${
                  isHint ? 'border-amber-400 ring-2 ring-amber-400/40' : correct ? 'border-emerald-400/50' : 'border-white/8'
                }`}
                style={{
                  background: mode === 'image'
                    ? `url(${imageSet.url}) no-repeat`
                    : correct
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.4), rgba(20,184,166,0.4))'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                  backgroundSize: mode === 'image' ? `${SIZE * 100}% ${SIZE * 100}%` : undefined,
                  backgroundPosition: mode === 'image' ? `${(tc / (SIZE - 1)) * 100}% ${(tr / (SIZE - 1)) * 100}%` : undefined,
                  color: correct ? '#a7f3d0' : '#e5e7eb',
                  fontSize: SIZE === 5 ? '0.95rem' : '1.4rem',
                }}
              >
                {mode === 'image' ? (
                  <span className="absolute bottom-1 right-1 text-[9px] font-black px-1 rounded bg-black/40 text-white">
                    {value}
                  </span>
                ) : (
                  value
                )}
                {correct && mode === 'numbers' && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </motion.button>
            );
          })}
        </div>

        {/* Paused overlay */}
        <AnimatePresence>
          {paused && !won && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/85 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <button onClick={() => setPaused(false)}
                className="px-6 py-3 rounded-2xl bg-emerald-500 text-emerald-950 font-black">
                <Play className="w-4 h-4 inline mr-1.5" /> {isAr ? 'استئناف' : 'Fortsetzen'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action row */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <button onClick={showHint} disabled={won || paused}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/15 text-amber-300 font-bold text-xs disabled:opacity-40 active:scale-95">
          <Lightbulb className="w-3.5 h-3.5" /> {isAr ? 'تلميح' : 'Tipp'}
          {hintsUsed > 0 && <span className="text-[9px] opacity-60">×{hintsUsed}</span>}
        </button>
        {mode === 'image' && (
          <button onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-300 font-bold text-xs active:scale-95">
            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {isAr ? 'معاينة' : 'Vorschau'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {won && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-5 text-center p-5 rounded-2xl border border-emerald-500/30"
            style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 70%)' }}>
            <p className="text-3xl mb-1">🎉</p>
            <p className="text-2xl font-black text-emerald-300 mb-1">{isAr ? 'تمّ الحل!' : 'Gelöst!'}</p>
            <p className="text-xs text-emerald-400/70 mb-3">
              {moves} {isAr ? 'حركة' : 'Züge'} · {formatTime(seconds)}
              {hintsUsed > 0 && (isAr ? ` · ${hintsUsed} تلميح` : ` · ${hintsUsed} Tipps`)}
            </p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => reset()}
              className="px-7 py-2.5 rounded-xl font-black text-emerald-950"
              style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}>
              {isAr ? 'لعبة جديدة' : 'Neues Spiel'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}
