import React, { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/components/GameShell';
import { motion } from 'framer-motion';
import { Hexagon, RotateCcw } from 'lucide-react';

const PALETTES: Record<string, { bg: string; label: string }[]> = {
  nature: [{ bg: '#2d5016', label: '🌿' }, { bg: '#1e3a5f', label: '💧' }, { bg: '#8b4513', label: '🪵' }, { bg: '#b8860b', label: '🌻' }],
  neon: [{ bg: '#dc2626', label: '🔴' }, { bg: '#2563eb', label: '🔵' }, { bg: '#16a34a', label: '🟢' }, { bg: '#ca8a04', label: '🟡' }],
  ocean: [{ bg: '#0e7490', label: '🌊' }, { bg: '#1d4ed8', label: '🐋' }, { bg: '#0f766e', label: '🐢' }, { bg: '#7c3aed', label: '🪸' }],
};

function generateBoard(size: number, paletteLen: number) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => Math.floor(Math.random() * paletteLen)));
}

function floodFill(board: number[][], target: number, newC: number, size: number): number[][] {
  if (target === newC) return board;
  const b = board.map(r => [...r]);
  const visited = new Set<string>();
  const q: [number, number][] = [[0, 0]]; visited.add('0,0');
  while (q.length) {
    const [r, c] = q.shift()!; b[r][c] = newC;
    for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]] as [number,number][]) {
      const k = `${nr},${nc}`;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited.has(k) && (b[nr][nc] === target || b[nr][nc] === newC)) { visited.add(k); q.push([nr, nc]); }
    }
  }
  return b;
}

function countOwned(board: number[][], size: number) {
  const color = board[0][0]; const visited = new Set<string>(); const q: [number, number][] = [[0, 0]]; visited.add('0,0');
  while (q.length) {
    const [r, c] = q.shift()!;
    for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]] as [number,number][]) {
      const k = `${nr},${nc}`;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited.has(k) && board[nr][nc] === color) { visited.add(k); q.push([nr, nc]); }
    }
  }
  return visited.size;
}

function isAllSame(board: number[][]) { const c = board[0][0]; return board.every(row => row.every(cell => cell === c)); }

export default function HexGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [gridSize, setGridSize] = useState('5');
  const [paletteName, setPaletteName] = useState('nature');
  const SIZE = parseInt(gridSize);
  const palette = PALETTES[paletteName];
  const maxMoves = SIZE === 4 ? 16 : SIZE === 5 ? 22 : 30;

  const [board, setBoard] = useState(() => generateBoard(SIZE, palette.length));
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const owned = countOwned(board, SIZE);
  const total = SIZE * SIZE;
  const progress = (owned / total) * 100;
  const savedStats = JSON.parse(localStorage.getItem('hex-stats') || '{}');

  const pickColor = useCallback((idx: number) => {
    if (won || moves >= maxMoves || idx === board[0][0]) return;
    const nb = floodFill(board, board[0][0], idx, SIZE);
    setBoard(nb); setMoves(m => m + 1);
    if (isAllSame(nb)) {
      setWon(true);
      const stats = { ...savedStats, gamesWon: (savedStats.gamesWon || 0) + 1, bestMoves: Math.min(savedStats.bestMoves || 999, moves + 1) };
      localStorage.setItem('hex-stats', JSON.stringify(stats));
    }
  }, [board, moves, won, SIZE, maxMoves, savedStats]);

  const reset = (newSize?: number, newPalette?: string) => {
    const s = newSize || SIZE;
    const p = PALETTES[newPalette || paletteName];
    setBoard(generateBoard(s, p.length)); setMoves(0); setWon(false);
  };

  const rules = isAr
    ? ['اختر لوناً من الأزرار السفلية', 'منطقتك (من الزاوية) تتلون باللون الجديد', 'المربعات المجاورة بنفس اللون تنضم لمنطقتك', 'لوّن الشبكة كاملة قبل نفاد الخطوات']
    : ['Wähle eine Farbe von unten', 'Dein Bereich (von der Ecke) wird neu gefärbt', 'Angrenzende gleichfarbige Felder schließen sich an', 'Färbe alles vor Ablauf der Züge'];

  const stats = [
    { label: isAr ? 'انتصارات' : 'Siege', value: savedStats.gamesWon || 0 },
    { label: isAr ? 'أفضل خطوات' : 'Beste Züge', value: savedStats.bestMoves || '-' },
  ];

  const options = [
    { key: 'size', label: isAr ? 'حجم الشبكة' : 'Gittergröße',
      choices: [{ value: '4', label: '4×4' }, { value: '5', label: '5×5' }, { value: '6', label: '6×6' }],
      current: gridSize, onChange: (v: string) => { setGridSize(v); reset(parseInt(v)); } },
    { key: 'palette', label: isAr ? 'نمط الألوان' : 'Farbstil',
      choices: [{ value: 'nature', label: isAr ? '🌿 طبيعة' : '🌿 Natur' }, { value: 'neon', label: isAr ? '🔴 كلاسيك' : '🔴 Klassisch' }, { value: 'ocean', label: isAr ? '🌊 محيط' : '🌊 Ozean' }],
      current: paletteName, onChange: (v: string) => { setPaletteName(v); reset(undefined, v); } },
  ];

  // Cell size based on grid
  const cellSize = SIZE <= 4 ? 'w-16 h-14' : SIZE <= 5 ? 'w-14 h-12' : 'w-11 h-10';

  return (
    <GameShell title={isAr ? 'السداسي' : 'Hex'} icon={Hexagon} accentColor="#22c55e" rules={rules} stats={stats} options={options}
      headerRight={<button onClick={() => reset()} className="text-green-500 active:scale-90"><RotateCcw className="w-4 h-4" /></button>}
    >
      {/* Progress */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(34,197,94,0.1)' }}>
          <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #22c55e, #4ade80)' }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
        <span className="text-[10px] text-green-500 font-bold">{Math.round(progress)}%</span>
      </div>

      <div className="flex justify-between items-center mb-4 px-1">
        <span className="text-sm text-green-600 font-semibold">{moves}/{maxMoves}</span>
        <span className="text-[10px] text-zinc-600">{owned}/{total} {isAr ? 'خلية' : 'Zellen'}</span>
      </div>

      {/* Grid */}
      <div className="flex flex-col items-center gap-1.5 mb-6">
        {board.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            {row.map((cell, c) => (
              <div key={c} className={`${cellSize} rounded-xl transition-colors duration-200 border`}
                style={{ backgroundColor: palette[cell].bg, borderColor: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        ))}
      </div>

      {/* Color picker */}
      <div className="flex justify-center gap-3 mb-4">
        {palette.map((p, i) => (
          <motion.button key={i} whileTap={{ scale: 0.85 }} onClick={() => pickColor(i)} disabled={won || moves >= maxMoves}
            className={`w-13 h-13 rounded-2xl border-2 flex items-center justify-center text-lg transition-all ${
              board[0][0] === i ? 'border-green-400 ring-2 ring-green-400/20 scale-110' : 'border-transparent opacity-75'
            }`} style={{ backgroundColor: p.bg }}>
            {p.label}
          </motion.button>
        ))}
      </div>

      {won && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mt-4 p-5 rounded-2xl border border-green-800/20" style={{ background: 'rgba(34,197,94,0.08)' }}>
          <p className="text-4xl mb-2">🌿</p>
          <p className="text-xl font-black text-green-200">{isAr ? 'الأرض لك!' : 'Gewonnen!'}</p>
          <p className="text-green-600 text-xs mb-4">{moves} {isAr ? 'خطوة' : 'Schritte'}</p>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => reset()} className="px-8 py-3 rounded-2xl font-black text-green-950" style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)' }}>
            {isAr ? 'مرة أخرى' : 'Nochmal'}
          </motion.button>
        </motion.div>
      )}

      {!won && moves >= maxMoves && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4">
          <p className="text-lg font-bold text-red-400 mb-3">{isAr ? 'انتهت الخطوات!' : 'Keine Züge mehr!'}</p>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => reset()} className="px-8 py-3 rounded-xl bg-green-600 text-white font-bold">
            {isAr ? 'حاول مجدداً' : 'Nochmal'}
          </motion.button>
        </motion.div>
      )}
    </GameShell>
  );
}
