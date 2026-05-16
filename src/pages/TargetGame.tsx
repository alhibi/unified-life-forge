import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Crosshair, Activity, Zap, MousePointer, Layers } from 'lucide-react';
import { playSfx, vibrate } from '@/utils/gameFeedback';

// ============================================================================
// Modes
// ============================================================================
type Mode = 'flick' | 'tracking' | 'multi' | 'reflex' | 'precision';
const MODES: { id: Mode; ar: string; de: string; icon: typeof Target }[] = [
  { id: 'flick',     ar: 'Flick', de: 'Flick',         icon: Crosshair },
  { id: 'tracking',  ar: 'تتبّع', de: 'Tracking',      icon: Activity },
  { id: 'multi',     ar: 'متعدد', de: 'Multi',         icon: Layers },
  { id: 'reflex',    ar: 'انعكاس', de: 'Reflex',       icon: Zap },
  { id: 'precision', ar: 'دقة',   de: 'Präzision',    icon: MousePointer },
];

type Difficulty = 'easy' | 'normal' | 'hard' | 'insane';

// ============================================================================
// Stats
// ============================================================================
interface TargetStats {
  gamesPlayed: number;
  bestScore: Partial<Record<Mode, number>>;
  bestAccuracy: Partial<Record<Mode, number>>;
  bestHpm: Partial<Record<Mode, number>>;
  totalHits: number;
}
function loadStats(): TargetStats {
  try {
    const s = JSON.parse(localStorage.getItem('target-stats') || '{}');
    return { gamesPlayed: 0, totalHits: 0, ...s,
      bestScore: s.bestScore || {}, bestAccuracy: s.bestAccuracy || {}, bestHpm: s.bestHpm || {} };
  } catch {
    return { gamesPlayed: 0, bestScore: {}, bestAccuracy: {}, bestHpm: {}, totalHits: 0 };
  }
}
function saveStatsFn(s: TargetStats) { localStorage.setItem('target-stats', JSON.stringify(s)); }

// ============================================================================
// Targets
// ============================================================================
interface TargetItem {
  id: number;
  x: number;
  y: number;
  size: number;
  type: 'normal' | 'bonus' | 'fast' | 'tiny';
  vx?: number; vy?: number;       // tracking mode
  born: number;
  ttl: number;
}

// ============================================================================
// Main
// ============================================================================
export default function TargetGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('target-mode') as Mode) || 'flick');
  const [difficulty, setDifficulty] = useState<Difficulty>(() => (localStorage.getItem('target-diff') as Difficulty) || 'normal');
  const [duration, setDuration] = useState(() => parseInt(localStorage.getItem('target-dur') || '30'));
  const [stats, setStats] = useState<TargetStats>(loadStats);

  useEffect(() => { localStorage.setItem('target-mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('target-diff', difficulty); }, [difficulty]);
  useEffect(() => { localStorage.setItem('target-dur', String(duration)); }, [duration]);

  const refresh = () => setStats(loadStats());

  const rules = useMemo(() => {
    if (isAr) {
      switch (mode) {
        case 'flick':     return ['اضرب الهدف فور ظهوره — كل ضربة تستدعي هدفًا جديدًا', 'الذهبي ×3 نقاط، السريع ×5، الصغير ×8', 'الكومبو ×5+ يضاعف النقاط', 'الدقة (Accuracy) تُحفظ في الإحصاءات'];
        case 'tracking':  return ['الهدف يتحرك بسرعة — اتبعه بإصبعك أو الفأرة', 'الوقت "على الهدف" يُحسب نقاطًا', 'الإيقاع يتسارع تدريجيًا', 'لا توجد عقوبة على ترك الهدف لحظة'];
        case 'multi':     return ['تظهر عدة أهداف معًا — اضرب الكل قبل الانتهاء', 'أهداف فائتة تكسر الكومبو وتؤثر الدقة', 'الصعوبة الأعلى = أهداف أكثر وأصغر', 'مثالي لتدريب الانتباه المتعدد'];
        case 'reflex':    return ['الأهداف تومض لجزء من الثانية ثم تختفي', 'تدريب على سرعة الانعكاس', 'وقت الظهور يقصر مع الصعوبة', 'الفوات يكلف نقاطًا'];
        case 'precision': return ['أهداف صغيرة جدًا — اضربها بدقة', 'لا توجد ضغوط وقت — الوقت لتقييم اتساق الإصابة', 'الدقة هي المقياس الأهم', 'يقيس ثبات الإصبع/الفأرة'];
      }
    } else {
      switch (mode) {
        case 'flick':     return ['Triff sofort beim Erscheinen — neuer Spawn pro Treffer', 'Gold ×3 · Schnell ×5 · Klein ×8', 'Combo ×5+ verdoppelt', 'Accuracy wird gespeichert'];
        case 'tracking':  return ['Folge dem bewegten Ziel mit Finger/Maus', 'Punkte für "auf dem Ziel"-Zeit', 'Tempo steigt allmählich', 'Kein Verlust beim Verlassen'];
        case 'multi':     return ['Mehrere Ziele gleichzeitig — alle treffen', 'Verpasste senken Combo und Quote', 'Höhere Schwierigkeit = mehr & kleinere', 'Übt geteilte Aufmerksamkeit'];
        case 'reflex':    return ['Ziele blinken kurz und verschwinden', 'Reines Reaktionstraining', 'Sichtbarkeit sinkt mit Stufe', 'Verpasste kosten Punkte'];
        case 'precision': return ['Sehr kleine Ziele präzise treffen', 'Kein Zeitdruck — Test der Konstanz', 'Accuracy ist primär', 'Misst Hand-Steady'];
      }
    }
    return [];
  }, [mode, isAr]);

  const statsArr = [
    { label: isAr ? 'مباريات' : 'Spiele', value: stats.gamesPlayed },
    { label: isAr ? 'أفضل نتيجة' : 'Bestleistung', value: stats.bestScore[mode] ?? 0 },
    { label: isAr ? 'أعلى دقة' : 'Top Quote', value: stats.bestAccuracy[mode] ? `${stats.bestAccuracy[mode]}%` : '-' },
    { label: isAr ? 'إصابات/د' : 'Treffer/min', value: stats.bestHpm[mode] ?? 0 },
  ];

  const options = [
    { key: 'mode', label: isAr ? 'النمط' : 'Modus',
      choices: MODES.map(m => ({ value: m.id, label: isAr ? m.ar : m.de })),
      current: mode, onChange: (v: string) => setMode(v as Mode) },
    { key: 'diff', label: isAr ? 'الصعوبة' : 'Schwierigkeit',
      choices: [
        { value: 'easy', label: isAr ? 'سهل' : 'Leicht' },
        { value: 'normal', label: isAr ? 'متوسط' : 'Normal' },
        { value: 'hard', label: isAr ? 'صعب' : 'Schwer' },
        { value: 'insane', label: isAr ? 'مدمّر' : 'Insane' },
      ], current: difficulty, onChange: (v: string) => setDifficulty(v as Difficulty) },
    { key: 'dur', label: isAr ? 'المدة' : 'Dauer',
      choices: [{ value: '15', label: '15s' }, { value: '30', label: '30s' }, { value: '60', label: '60s' }, { value: '120', label: '2m' }],
      current: String(duration), onChange: (v: string) => setDuration(parseInt(v)) },
  ];

  return (
    <GameShell title={isAr ? 'التصويب' : 'Zielschießen'} icon={Target} accentColor="#ef4444" rules={rules} stats={statsArr} options={options}>
      <Arena mode={mode} difficulty={difficulty} duration={duration} isAr={isAr} onFinish={refresh} />
    </GameShell>
  );
}

// ============================================================================
// Arena
// ============================================================================
interface ArenaProps {
  mode: Mode;
  difficulty: Difficulty;
  duration: number;
  isAr: boolean;
  onFinish: () => void;
}
function Arena({ mode, difficulty, duration, isAr, onFinish }: ArenaProps) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'idle' | 'play' | 'end'>('idle');
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [trackingHit, setTrackingHit] = useState(false);

  // sizing helpers
  const arenaSize = useRef({ w: 320, h: 360 });

  // Update arena size after mount and on resize
  useEffect(() => {
    if (!arenaRef.current) return;
    const measure = () => {
      const r = arenaRef.current!.getBoundingClientRect();
      arenaSize.current = { w: r.width, h: r.height };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(arenaRef.current);
    return () => ro.disconnect();
  }, []);

  const params = useMemo(() => {
    const D = { easy: 0.6, normal: 1, hard: 1.5, insane: 2.2 }[difficulty];
    switch (mode) {
      case 'flick':     return { sizeBase: 56 / D, ttl: 1400 / D, simulMax: 1, spawnMs: 100, vel: 0 };
      case 'tracking':  return { sizeBase: 48 / D, ttl: 999999, simulMax: 1, spawnMs: 0, vel: 0.15 + D * 0.06 };
      case 'multi':     return { sizeBase: 44 / D, ttl: 2000 / D, simulMax: 2 + Math.floor(D * 2), spawnMs: 240, vel: 0 };
      case 'reflex':    return { sizeBase: 60 / D, ttl: 700 / D, simulMax: 1, spawnMs: 380, vel: 0 };
      case 'precision': return { sizeBase: 24 / D, ttl: 999999, simulMax: 5, spawnMs: 240, vel: 0 };
    }
  }, [mode, difficulty]);

  const reset = useCallback(() => {
    setTargets([]); setScore(0); setHits(0); setMisses(0);
    setCombo(0); setBestCombo(0); setTimeLeft(duration); setTrackingHit(false);
  }, [duration]);

  const start = useCallback(() => { reset(); setPhase('play'); }, [reset]);

  // Spawn loop
  const idCounter = useRef(0);
  const spawnTarget = useCallback(() => {
    setTargets(prev => {
      if (prev.length >= params.simulMax) return prev;
      const size = params.sizeBase + Math.random() * (params.sizeBase * 0.35);
      const { w, h } = arenaSize.current;
      const margin = size / 2 + 8;
      const x = margin + Math.random() * (w - margin * 2);
      const y = margin + Math.random() * (h - margin * 2);
      let type: TargetItem['type'] = 'normal';
      if (mode === 'flick' || mode === 'multi') {
        const r = Math.random();
        if (r > 0.92) type = 'tiny';
        else if (r > 0.82) type = 'bonus';
        else if (r > 0.7) type = 'fast';
      }
      const t: TargetItem = {
        id: idCounter.current++, x, y, size: type === 'tiny' ? size * 0.55 : type === 'fast' ? size * 0.75 : size,
        type, born: performance.now(), ttl: params.ttl,
        vx: mode === 'tracking' ? (Math.random() < 0.5 ? -1 : 1) * params.vel : 0,
        vy: mode === 'tracking' ? (Math.random() < 0.5 ? -1 : 1) * params.vel : 0,
      };
      return [...prev, t];
    });
  }, [mode, params]);

  // Game timer
  useEffect(() => {
    if (phase !== 'play') return;
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(iv); finishGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Spawn timer
  useEffect(() => {
    if (phase !== 'play') return;
    if (params.spawnMs <= 0) {
      // tracking mode spawns one target
      if (targets.length === 0) spawnTarget();
      return;
    }
    const iv = setInterval(spawnTarget, params.spawnMs);
    return () => clearInterval(iv);
  }, [phase, spawnTarget, params.spawnMs, targets.length]);

  // Tracking animation + TTL expiration
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== 'play') return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last; last = now;
      setTargets(prev => {
        const { w, h } = arenaSize.current;
        const next: TargetItem[] = [];
        let missedCount = 0;
        for (const t of prev) {
          if (mode === 'tracking' && t.vx !== undefined && t.vy !== undefined) {
            let nx = t.x + t.vx * dt;
            let ny = t.y + t.vy * dt;
            let nvx = t.vx, nvy = t.vy;
            const margin = t.size / 2 + 4;
            if (nx < margin) { nx = margin; nvx = -nvx; }
            if (nx > w - margin) { nx = w - margin; nvx = -nvx; }
            if (ny < margin) { ny = margin; nvy = -nvy; }
            if (ny > h - margin) { ny = h - margin; nvy = -nvy; }
            next.push({ ...t, x: nx, y: ny, vx: nvx, vy: nvy });
          } else if (now - t.born >= t.ttl) {
            missedCount++;
          } else {
            next.push(t);
          }
        }
        if (missedCount > 0) {
          setMisses(m => m + missedCount);
          setCombo(0);
          playSfx('wrong'); vibrate(30);
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, mode]);

  // Tracking continuous score
  useEffect(() => {
    if (phase !== 'play' || mode !== 'tracking') return;
    const iv = setInterval(() => {
      if (trackingHit) {
        setScore(s => s + 1);
        setHits(h => h + 1);
      }
    }, 80);
    return () => clearInterval(iv);
  }, [phase, mode, trackingHit]);

  const finishGame = useCallback(() => {
    setPhase('end');
    const totalShots = hits + misses;
    const accuracy = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 0;
    const hpm = duration > 0 ? Math.round((hits / duration) * 60) : 0;
    const s = loadStats();
    s.gamesPlayed += 1;
    s.totalHits += hits;
    s.bestScore[mode] = Math.max(s.bestScore[mode] ?? 0, score);
    s.bestAccuracy[mode] = Math.max(s.bestAccuracy[mode] ?? 0, accuracy);
    s.bestHpm[mode] = Math.max(s.bestHpm[mode] ?? 0, hpm);
    saveStatsFn(s);
    onFinish();
    playSfx('win');
  }, [hits, misses, duration, mode, score, onFinish]);

  // Handle target hit
  const hitTarget = (t: TargetItem) => {
    setTargets(prev => prev.filter(x => x.id !== t.id));
    setHits(h => h + 1);
    const points = t.type === 'tiny' ? 8 : t.type === 'fast' ? 5 : t.type === 'bonus' ? 3 : 1;
    const newCombo = combo + 1;
    setCombo(newCombo);
    setBestCombo(b => Math.max(b, newCombo));
    setScore(s => s + points * (newCombo >= 5 ? 2 : 1));
    playSfx('match'); vibrate(15);
  };

  // Empty arena tap registers as miss (flick/multi/reflex/precision)
  const onArenaTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== 'play' || mode === 'tracking') return;
    // ignore taps that hit a child via stopPropagation
    if ((e.target as HTMLElement).dataset.targetEl) return;
    setMisses(m => m + 1);
    setCombo(0);
    playSfx('wrong');
  };

  // Tracking: detect "over target"
  const onArenaMove = (e: React.PointerEvent) => {
    if (phase !== 'play' || mode !== 'tracking' || targets.length === 0) return;
    const rect = arenaRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const t = targets[0];
    const dx = px - t.x, dy = py - t.y;
    const over = Math.sqrt(dx * dx + dy * dy) <= t.size / 2;
    setTrackingHit(over);
  };
  const onArenaLeave = () => setTrackingHit(false);

  const totalShots = hits + misses;
  const accuracy = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 0;

  if (phase === 'idle') {
    return (
      <div className="text-center pt-10">
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}
          className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.18) 0%, transparent 70%)' }}>
          <Crosshair className="w-12 h-12 text-rose-400" />
        </motion.div>
        <p className="text-2xl font-black text-white mb-1">{MODES.find(m => m.id === mode)?.[isAr ? 'ar' : 'de']}</p>
        <p className="text-xs text-zinc-500 mb-6">{isAr ? `${duration} ثانية` : `${duration} Sekunden`}</p>
        <motion.button whileTap={{ scale: 0.93 }} onClick={start}
          className="px-10 py-3.5 rounded-2xl font-black text-white shadow-lg shadow-rose-500/30"
          style={{ background: 'linear-gradient(135deg, #f87171, #ef4444)' }}>
          🎯 {isAr ? 'ابدأ' : 'Start'}
        </motion.button>
      </div>
    );
  }

  if (phase === 'end') {
    const hpm = duration > 0 ? Math.round((hits / duration) * 60) : 0;
    return (
      <div className="text-center pt-6">
        <p className="text-5xl mb-2">🏆</p>
        <p className="text-4xl font-black text-rose-300 mb-1">{score}</p>
        <p className="text-xs text-zinc-500 mb-4">{isAr ? 'نقطة' : 'Punkte'}</p>
        <div className="grid grid-cols-2 gap-3 mb-6 max-w-[300px] mx-auto">
          <div className="rounded-2xl bg-white/4 p-3">
            <p className="text-xl font-black text-emerald-400">{accuracy}%</p>
            <p className="text-[10px] text-zinc-500">{isAr ? 'دقة' : 'Genauigkeit'}</p>
          </div>
          <div className="rounded-2xl bg-white/4 p-3">
            <p className="text-xl font-black text-amber-400">{hits}</p>
            <p className="text-[10px] text-zinc-500">{isAr ? 'إصابات' : 'Treffer'}</p>
          </div>
          <div className="rounded-2xl bg-white/4 p-3">
            <p className="text-xl font-black text-sky-400">{hpm}</p>
            <p className="text-[10px] text-zinc-500">{isAr ? 'إصابات/دقيقة' : 'Treffer/min'}</p>
          </div>
          <div className="rounded-2xl bg-white/4 p-3">
            <p className="text-xl font-black text-fuchsia-400">×{bestCombo}</p>
            <p className="text-[10px] text-zinc-500">{isAr ? 'أعلى كومبو' : 'Top Combo'}</p>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.93 }} onClick={start}
          className="px-8 py-3 rounded-2xl font-black text-white shadow-lg shadow-rose-500/30"
          style={{ background: 'linear-gradient(135deg, #f87171, #ef4444)' }}>
          {isAr ? 'مرة أخرى' : 'Nochmal'}
        </motion.button>
      </div>
    );
  }

  // PLAY
  return (
    <div>
      {/* HUD */}
      <div className="flex justify-between items-center mb-2 px-1">
        <div className="flex items-center gap-3">
          <div className="text-rose-400 font-black text-xl tabular-nums">{score}</div>
          <div className="text-xs text-zinc-500">{accuracy}%</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {combo >= 3 && <span className="text-amber-400 font-bold">×{combo}</span>}
          <span className={`tabular-nums font-bold ${timeLeft <= 5 ? 'text-rose-400' : 'text-zinc-300'}`}>{timeLeft}s</span>
        </div>
      </div>
      <div className="h-1 mb-2 rounded-full bg-white/4 overflow-hidden">
        <motion.div className="h-full bg-rose-500" animate={{ width: `${(timeLeft / duration) * 100}%` }} />
      </div>
      <div
        ref={arenaRef}
        onClick={onArenaTap}
        onPointerMove={onArenaMove}
        onPointerLeave={onArenaLeave}
        className="relative rounded-2xl overflow-hidden border border-rose-500/15 select-none"
        style={{ height: '52vh', minHeight: 320, background: 'radial-gradient(circle at 50% 35%, rgba(244,63,94,0.12) 0%, rgba(0,0,0,0.4) 70%)', cursor: mode === 'tracking' ? 'none' : 'crosshair' }}
      >
        {/* Crosshair grid */}
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(244,63,94,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(244,63,94,0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <AnimatePresence>
          {targets.map(t => (
            <motion.button
              key={t.id}
              data-target-el="1"
              onClick={(e) => { e.stopPropagation(); hitTarget(t); }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="absolute rounded-full border-2"
              style={{
                left: t.x - t.size / 2,
                top: t.y - t.size / 2,
                width: t.size,
                height: t.size,
                background: t.type === 'bonus'
                  ? 'radial-gradient(circle, #fde047 0%, #f59e0b 70%)'
                  : t.type === 'fast'
                    ? 'radial-gradient(circle, #38bdf8 0%, #2563eb 70%)'
                    : t.type === 'tiny'
                      ? 'radial-gradient(circle, #f0abfc 0%, #a21caf 70%)'
                      : 'radial-gradient(circle, #fca5a5 0%, #dc2626 70%)',
                borderColor: 'rgba(255,255,255,0.4)',
                boxShadow: `0 0 20px ${t.type === 'bonus' ? '#fbbf24' : t.type === 'fast' ? '#3b82f6' : t.type === 'tiny' ? '#c026d3' : '#ef4444'}88`,
              }}
            >
              <div className="absolute inset-2 rounded-full border border-white/30" />
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Tracking cursor halo */}
        {mode === 'tracking' && trackingHit && (
          <div className="absolute inset-0 pointer-events-none ring-4 ring-emerald-400/40 rounded-2xl animate-pulse" />
        )}

        {/* Idle hint */}
        {targets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
            {isAr ? '...انتظر الأهداف...' : '...spawn...'}
          </div>
        )}
      </div>
    </div>
  );
}
