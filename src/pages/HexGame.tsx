import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, RotateCcw, Lightbulb, Undo2 } from 'lucide-react';
import { playSfx, vibrate } from '@/utils/gameFeedback';

// ============================================================================
// Palettes
// ============================================================================
interface Palette { id: string; ar: string; de: string; colors: { bg: string; label: string }[] }
const PALETTES: Palette[] = [
  { id: 'nature', ar: '🌿 طبيعة', de: '🌿 Natur', colors: [
    { bg: '#2d5016', label: '🌿' }, { bg: '#1e3a5f', label: '💧' }, { bg: '#8b4513', label: '🪵' }, { bg: '#b8860b', label: '🌻' },
  ] },
  { id: 'neon', ar: '🔴 كلاسيك', de: '🔴 Klassisch', colors: [
    { bg: '#dc2626', label: '🔴' }, { bg: '#2563eb', label: '🔵' }, { bg: '#16a34a', label: '🟢' }, { bg: '#ca8a04', label: '🟡' }, { bg: '#a855f7', label: '🟣' },
  ] },
  { id: 'ocean', ar: '🌊 محيط', de: '🌊 Ozean', colors: [
    { bg: '#0e7490', label: '🌊' }, { bg: '#1d4ed8', label: '🐋' }, { bg: '#0f766e', label: '🐢' }, { bg: '#7c3aed', label: '🪸' },
  ] },
  { id: 'sunset', ar: '🌅 غروب', de: '🌅 Sonnenuntergang', colors: [
    { bg: '#f97316', label: '🌅' }, { bg: '#e11d48', label: '🌺' }, { bg: '#a21caf', label: '🌌' }, { bg: '#fbbf24', label: '☀️' }, { bg: '#6b21a8', label: '🌙' },
  ] },
  { id: 'pastel', ar: '🌸 باستيل', de: '🌸 Pastell', colors: [
    { bg: '#f9a8d4', label: '🌸' }, { bg: '#a5b4fc', label: '🦋' }, { bg: '#86efac', label: '🍀' }, { bg: '#fde68a', label: '🐥' },
  ] },
];

// ============================================================================
// Logic
// ============================================================================
// HEX coordinates: offset (even-r) — even rows have cols 0..size, odd rows offset by 0.5.
// Adjacency in even-r: (r,c)'s neighbors are
// (r-1, c-(r%2==0 ? 1 : 0)), (r-1, c+(r%2==0 ? 0 : 1)),
// (r,   c-1), (r,   c+1),
// (r+1, c-(r%2==0 ? 1 : 0)), (r+1, c+(r%2==0 ? 0 : 1))
function hexNeighbors(r: number, c: number): [number, number][] {
  const even = r % 2 === 0;
  return even
    ? [[r-1, c-1], [r-1, c], [r, c-1], [r, c+1], [r+1, c-1], [r+1, c]]
    : [[r-1, c], [r-1, c+1], [r, c-1], [r, c+1], [r+1, c], [r+1, c+1]];
}
function squareNeighbors(r: number, c: number): [number, number][] {
  return [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
}
type GridType = 'hex' | 'square';

function neighborsFor(type: GridType, r: number, c: number): [number, number][] {
  return type === 'hex' ? hexNeighbors(r, c) : squareNeighbors(r, c);
}

function generateBoard(size: number, paletteLen: number) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => Math.floor(Math.random() * paletteLen)));
}

function floodFill(board: number[][], target: number, newC: number, size: number, type: GridType): number[][] {
  if (target === newC) return board;
  const b = board.map(r => [...r]);
  const visited = new Set<string>();
  const q: [number, number][] = [[0, 0]]; visited.add('0,0');
  while (q.length) {
    const [r, c] = q.shift()!; b[r][c] = newC;
    for (const [nr, nc] of neighborsFor(type, r, c)) {
      const k = `${nr},${nc}`;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited.has(k) && (b[nr][nc] === target || b[nr][nc] === newC)) { visited.add(k); q.push([nr, nc]); }
    }
  }
  return b;
}

function countOwned(board: number[][], size: number, type: GridType) {
  const color = board[0][0]; const visited = new Set<string>(); const q: [number, number][] = [[0, 0]]; visited.add('0,0');
  while (q.length) {
    const [r, c] = q.shift()!;
    for (const [nr, nc] of neighborsFor(type, r, c)) {
      const k = `${nr},${nc}`;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited.has(k) && board[nr][nc] === color) { visited.add(k); q.push([nr, nc]); }
    }
  }
  return visited.size;
}
function isAllSame(board: number[][]) { const c = board[0][0]; return board.every(row => row.every(cell => cell === c)); }

// Hint: try each color, pick the one that captures most cells.
function bestColorHint(board: number[][], size: number, type: GridType, paletteLen: number): number {
  let bestIdx = 0, bestGain = -1;
  const current = board[0][0];
  for (let i = 0; i < paletteLen; i++) {
    if (i === current) continue;
    const nb = floodFill(board, current, i, size, type);
    const gain = countOwned(nb, size, type);
    if (gain > bestGain) { bestGain = gain; bestIdx = i; }
  }
  return bestIdx;
}

// ============================================================================
// Stats
// ============================================================================
interface HexStats {
  gamesPlayed: number;
  gamesWon: number;
  bestMoves: Partial<Record<string, number>>;
  perfectGames: number;
  totalCells: number;
}
function loadStats(): HexStats {
  try {
    const s = JSON.parse(localStorage.getItem('hex-stats') || '{}');
    return { gamesPlayed: 0, gamesWon: 0, perfectGames: 0, totalCells: 0, ...s,
      bestMoves: s.bestMoves && typeof s.bestMoves === 'object' ? s.bestMoves : {} };
  } catch { return { gamesPlayed: 0, gamesWon: 0, bestMoves: {}, perfectGames: 0, totalCells: 0 }; }
}
function saveStats(s: HexStats) { localStorage.setItem('hex-stats', JSON.stringify(s)); }

// ============================================================================
// Component
// ============================================================================
export default function HexGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [gridSize, setGridSize] = useState(() => localStorage.getItem('hex-size') || '5');
  const [paletteId, setPaletteId] = useState(() => localStorage.getItem('hex-palette') || 'nature');
  const [type, setType] = useState<GridType>(() => (localStorage.getItem('hex-type') as GridType) || 'hex');

  const SIZE = parseInt(gridSize);
  const palette = useMemo(() => PALETTES.find(p => p.id === paletteId) ?? PALETTES[0], [paletteId]);
  const maxMoves = SIZE === 4 ? 14 : SIZE === 5 ? 22 : 28;

  const [board, setBoard] = useState(() => generateBoard(SIZE, palette.colors.length));
  const [history, setHistory] = useState<number[][][]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [hintIdx, setHintIdx] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [stats, setStats] = useState<HexStats>(loadStats);

  useEffect(() => { localStorage.setItem('hex-size', gridSize); }, [gridSize]);
  useEffect(() => { localStorage.setItem('hex-palette', paletteId); }, [paletteId]);
  useEffect(() => { localStorage.setItem('hex-type', type); }, [type]);

  const owned = countOwned(board, SIZE, type);
  const total = SIZE * SIZE;
  const progress = (owned / total) * 100;

  const pickColor = useCallback((idx: number) => {
    if (won || moves >= maxMoves || idx === board[0][0]) return;
    const nb = floodFill(board, board[0][0], idx, SIZE, type);
    setHistory(h => [...h, board]);
    setBoard(nb);
    setMoves(m => m + 1);
    setHintIdx(null);
    playSfx('flip');
    vibrate(15);
    if (isAllSame(nb)) {
      setWon(true);
      playSfx('win'); vibrate([60, 60, 120]);
      const s = loadStats();
      s.gamesPlayed += 1; s.gamesWon += 1;
      s.totalCells += total;
      const newMoves = moves + 1;
      const k = `${SIZE}-${type}-${palette.id}`;
      s.bestMoves[k] = Math.min(s.bestMoves[k] ?? 999, newMoves);
      const par = SIZE * (palette.colors.length - 1);
      if (newMoves <= par * 0.7) s.perfectGames += 1;
      saveStats(s); setStats(s);
    }
  }, [board, moves, won, SIZE, type, maxMoves, palette, total]);

  const undo = () => {
    if (history.length === 0 || won) return;
    const last = history[history.length - 1];
    setBoard(last); setHistory(h => h.slice(0, -1)); setMoves(m => Math.max(0, m - 1));
    playSfx('click');
  };

  const showHint = () => {
    if (won || moves >= maxMoves) return;
    const idx = bestColorHint(board, SIZE, type, palette.colors.length);
    setHintIdx(idx);
    setHintsUsed(h => h + 1);
    playSfx('hint');
    setTimeout(() => setHintIdx(null), 1800);
  };

  const reset = useCallback((opts?: { size?: number; paletteId?: string; type?: GridType }) => {
    const s = opts?.size ?? SIZE;
    const pid = opts?.paletteId ?? paletteId;
    const p = PALETTES.find(x => x.id === pid) ?? PALETTES[0];
    setBoard(generateBoard(s, p.colors.length));
    setMoves(0); setWon(false); setHistory([]); setHintIdx(null); setHintsUsed(0);
  }, [SIZE, paletteId]);

  // re-generate when grid type changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reset(); }, [type]);

  const rules = isAr
    ? ['اختر لوناً من الأزرار السفلية لتلوين منطقتك', 'المربعات المجاورة بنفس اللون تنضم لمنطقتك', 'لوّن الشبكة كاملة قبل نفاد الخطوات', 'استخدم التراجع أو التلميح عند التعثّر', 'الإكمال بعدد قليل من الحركات = لعبة مثالية']
    : ['Wähle eine Farbe um deinen Bereich zu färben', 'Gleichfarbige Nachbarn schließen sich an', 'Färbe alles vor Ablauf der Züge', 'Rückgängig oder Tipp verfügbar', 'Wenige Züge = perfektes Spiel'];

  const statsArr = [
    { label: isAr ? 'انتصارات' : 'Siege', value: stats.gamesWon },
    { label: isAr ? 'مباريات' : 'Spiele', value: stats.gamesPlayed },
    { label: isAr ? 'ألعاب مثالية' : 'Perfekt', value: stats.perfectGames },
    { label: isAr ? `أفضل ${SIZE}×${SIZE}` : `Best ${SIZE}×${SIZE}`, value: stats.bestMoves[`${SIZE}-${type}-${palette.id}`] ?? '-' },
  ];

  const options = [
    { key: 'type', label: isAr ? 'نوع الشبكة' : 'Gittertyp',
      choices: [{ value: 'hex', label: isAr ? '⬡ سداسي' : '⬡ Hex' }, { value: 'square', label: isAr ? '◻ مربعات' : '◻ Quadrate' }],
      current: type, onChange: (v: string) => setType(v as GridType) },
    { key: 'size', label: isAr ? 'حجم الشبكة' : 'Gittergröße',
      choices: [{ value: '4', label: '4×4' }, { value: '5', label: '5×5' }, { value: '6', label: '6×6' }, { value: '7', label: '7×7' }],
      current: gridSize, onChange: (v: string) => { setGridSize(v); reset({ size: parseInt(v) }); } },
    { key: 'palette', label: isAr ? 'لوحة الألوان' : 'Farbpalette',
      choices: PALETTES.map(p => ({ value: p.id, label: isAr ? p.ar : p.de })),
      current: paletteId, onChange: (v: string) => { setPaletteId(v); reset({ paletteId: v }); } },
  ];

  return (
    <GameShell title={isAr ? 'السداسي' : 'Hex'} icon={Hexagon} accentColor="#22c55e" rules={rules} stats={statsArr} options={options}
      headerRight={
        <div className="flex items-center gap-1.5">
          <button onClick={undo} disabled={history.length === 0 || won}
            className="text-emerald-500 active:scale-90 disabled:opacity-30">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={() => reset()} className="text-emerald-500 active:scale-90"><RotateCcw className="w-4 h-4" /></button>
        </div>
      }
    >
      {/* Progress */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(34,197,94,0.1)' }}>
          <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #22c55e, #4ade80)' }}
            animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
        <span className="text-[10px] text-emerald-400 font-bold tabular-nums">{Math.round(progress)}%</span>
      </div>
      <div className="flex justify-between items-center mb-4 px-1 text-xs">
        <span className="text-emerald-300 font-semibold">{moves}/{maxMoves}</span>
        <span className="text-zinc-500">{owned}/{total} {isAr ? 'خلية' : 'Zellen'}</span>
      </div>

      {/* Board */}
      <Board board={board} type={type} palette={palette} SIZE={SIZE} />

      {/* Color picker */}
      <div className="flex justify-center gap-2.5 mt-5 mb-3 flex-wrap">
        {palette.colors.map((p, i) => {
          const isActive = board[0][0] === i;
          const isHint = hintIdx === i;
          return (
            <motion.button key={i}  onClick={() => pickColor(i)}
              disabled={won || moves >= maxMoves || isActive}
              animate={isHint ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 0.6, repeat: isHint ? Infinity : 0 }}
              className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-lg transition-all ${
                isActive ? 'border-amber-400 ring-2 ring-amber-400/30' : isHint ? 'border-amber-300 shadow-lg shadow-amber-500/40' : 'border-white/15'
              }`}
              style={{ backgroundColor: p.bg, opacity: isActive ? 0.5 : 1 }}>
              {p.label}
            </motion.button>
          );
        })}
      </div>

      {/* Hint button */}
      <div className="flex justify-center">
        <button onClick={showHint} disabled={won || moves >= maxMoves}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 text-xs font-bold disabled:opacity-30">
          <Lightbulb className="w-3 h-3" />{isAr ? 'تلميح' : 'Tipp'}
          {hintsUsed > 0 && <span className="opacity-60 text-[9px]">×{hintsUsed}</span>}
        </button>
      </div>

      <AnimatePresence>
        {won && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="text-center mt-4 p-5 rounded-2xl border border-emerald-500/30"
            style={{ background: 'rgba(34,197,94,0.1)' }}>
            <p className="text-4xl mb-2">🌿</p>
            <p className="text-xl font-black text-emerald-200">{isAr ? 'الأرض لك!' : 'Gewonnen!'}</p>
            <p className="text-emerald-400/70 text-xs mb-3">
              {moves} {isAr ? 'خطوة' : 'Schritte'}
              {hintsUsed > 0 && (isAr ? ` · ${hintsUsed} تلميح` : ` · ${hintsUsed} Tipps`)}
            </p>
            <motion.button  onClick={() => reset()}
              className="px-7 py-2.5 rounded-2xl font-black text-emerald-950"
              style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)' }}>
              {isAr ? 'مرة أخرى' : 'Nochmal'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {!won && moves >= maxMoves && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4">
          <p className="text-lg font-bold text-rose-400 mb-3">{isAr ? 'انتهت الخطوات!' : 'Keine Züge mehr!'}</p>
          <motion.button  onClick={() => reset()}
            className="px-7 py-2.5 rounded-xl bg-emerald-600 text-white font-bold">
            {isAr ? 'حاول مجدداً' : 'Nochmal'}
          </motion.button>
        </motion.div>
      )}
    </GameShell>
  );
}

// ============================================================================
// Board (SVG for hex, grid for square)
// ============================================================================
function Board({ board, type, palette, SIZE }: { board: number[][]; type: GridType; palette: Palette; SIZE: number }) {
  if (type === 'square') {
    return (
      <div className="flex flex-col items-center gap-1.5 mb-2">
        {board.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            {row.map((cell, c) => (
              <motion.div key={c}
                animate={{ backgroundColor: palette.colors[cell].bg }}
                transition={{ duration: 0.3 }}
                className={`rounded-xl border ${SIZE <= 4 ? 'w-16 h-14' : SIZE <= 5 ? 'w-13 h-12' : SIZE <= 6 ? 'w-11 h-10' : 'w-9 h-8'}`}
                style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        ))}
      </div>
    );
  }
  // hex grid: each hex is HEX_W wide, HEX_H tall; row pitch = HEX_H*0.75; odd rows offset by HEX_W/2
  const HEX_W = SIZE <= 4 ? 56 : SIZE <= 5 ? 50 : SIZE <= 6 ? 42 : 36;
  const HEX_H = HEX_W * 1.155; // pointy-top hex
  const rowPitch = HEX_H * 0.78;
  const totalW = HEX_W * SIZE + HEX_W / 2 + 6;
  const totalH = rowPitch * (SIZE - 1) + HEX_H + 6;
  return (
    <div className="flex justify-center mb-2">
      <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const offsetX = (r % 2) * (HEX_W / 2);
            const cx = c * HEX_W + HEX_W / 2 + offsetX + 3;
            const cy = r * rowPitch + HEX_H / 2 + 3;
            const w = HEX_W / 2, h = HEX_H / 2;
            const pts = `${cx},${cy - h} ${cx + w},${cy - h / 2} ${cx + w},${cy + h / 2} ${cx},${cy + h} ${cx - w},${cy + h / 2} ${cx - w},${cy - h / 2}`;
            return (
              <motion.polygon key={`${r}-${c}`} points={pts}
                animate={{ fill: palette.colors[cell].bg }}
                transition={{ duration: 0.3 }}
                stroke="rgba(0,0,0,0.25)" strokeWidth={1.2} />
            );
          })
        )}
        {/* anchor marker at (0,0) */}
        <circle cx={HEX_W / 2 + 3} cy={HEX_H / 2 + 3} r={3.5} fill="rgba(255,255,255,0.6)" />
      </svg>
    </div>
  );
}
