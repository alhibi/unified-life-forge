import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/features/games/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Zap, Brain, Hash, RotateCcw, Target, Layers, TrendingUp } from '@/lib/icons';
import { playSfx, vibrate } from '@/features/games/utils/gameFeedback';

// =============================================================================
// Modes
// =============================================================================
type Mode = 'reaction' | 'choice' | 'stroop' | 'sequence' | 'nback' | 'aim';

interface ModeMeta {
  id: Mode;
  ar: string;
  de: string;
  icon: typeof Crosshair;
}
const MODES: ModeMeta[] = [
  { id: 'reaction', ar: 'ردة فعل', de: 'Reaktion', icon: Zap },
  { id: 'choice', ar: 'اختيار', de: 'Wahl', icon: Crosshair },
  { id: 'stroop', ar: 'ستروب', de: 'Stroop', icon: Brain },
  { id: 'sequence', ar: 'سلسلة', de: 'Sequenz', icon: Hash },
  { id: 'nback', ar: 'N-back', de: 'N-back', icon: Layers },
  { id: 'aim', ar: 'هدف', de: 'Ziel', icon: Target },
];

// =============================================================================
// Difficulty
// =============================================================================
type Difficulty = 'easy' | 'normal' | 'hard';
interface DifficultyMeta {
  prepMin: number; prepMax: number;
  choiceCount: number;
  stroopTrap: number;
  sequenceStart: number;
  nbackN: number;
  aimDuration: number;
  aimTargetRadius: number;
}
const DIFFS: Record<Difficulty, DifficultyMeta> = {
  easy:   { prepMin: 1800, prepMax: 4500, choiceCount: 3, stroopTrap: 0.4, sequenceStart: 3, nbackN: 1, aimDuration: 30, aimTargetRadius: 32 },
  normal: { prepMin: 1300, prepMax: 3700, choiceCount: 4, stroopTrap: 0.65, sequenceStart: 4, nbackN: 2, aimDuration: 25, aimTargetRadius: 24 },
  hard:   { prepMin: 800,  prepMax: 2400, choiceCount: 6, stroopTrap: 0.85, sequenceStart: 5, nbackN: 3, aimDuration: 20, aimTargetRadius: 18 },
};

// =============================================================================
// Colors
// =============================================================================
const COLORS = [
  { id: 'red',    hex: '#ef4444', ar: 'أحمر',  de: 'Rot' },
  { id: 'blue',   hex: '#3b82f6', ar: 'أزرق',  de: 'Blau' },
  { id: 'green',  hex: '#10b981', ar: 'أخضر',  de: 'Grün' },
  { id: 'yellow', hex: '#facc15', ar: 'أصفر',  de: 'Gelb' },
  { id: 'purple', hex: '#a855f7', ar: 'بنفسجي',de: 'Lila' },
  { id: 'pink',   hex: '#ec4899', ar: 'وردي',  de: 'Pink' },
] as const;
type ColorId = typeof COLORS[number]['id'];

// =============================================================================
// Stats
// =============================================================================
interface FocusStats {
  gamesPlayed: number;
  bestAvg: Partial<Record<Mode, number>>;
  bestSequence: number;
  bestNback: { level: number; accuracy: number };
  bestAimScore: number;
  bestAimAccuracy: number;
  totalAccuracy: number;
  totalRounds: number;
  recentReactions: number[]; // last 50 best avgs
}
function loadStats(): FocusStats {
  try {
    const s = JSON.parse(localStorage.getItem('focus-stats') || '{}');
    return {
      gamesPlayed: 0, bestSequence: 0, totalAccuracy: 0, totalRounds: 0,
      bestAimScore: 0, bestAimAccuracy: 0,
      bestNback: { level: 0, accuracy: 0 },
      recentReactions: [],
      ...s,
      bestAvg: s.bestAvg || {},
    };
  } catch {
    return { gamesPlayed: 0, bestAvg: {}, bestSequence: 0, totalAccuracy: 0, totalRounds: 0, bestNback: { level: 0, accuracy: 0 }, bestAimScore: 0, bestAimAccuracy: 0, recentReactions: [] };
  }
}
function saveStatsFn(s: FocusStats) { localStorage.setItem('focus-stats', JSON.stringify(s)); }

// Population percentile estimate based on standard reaction-time data:
// Mean ~270ms, SD ~50ms. Faster = higher percentile.
function reactionPercentile(ms: number): number {
  const mean = 280, sd = 55;
  // z-score: lower ms => more positive z (faster). Use erf approximation.
  const z = (mean - ms) / sd;
  // Standard normal CDF approximation
  const p = 0.5 * (1 + erf(z / Math.SQRT2));
  return Math.max(1, Math.min(99, Math.round(p * 100)));
}
function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

// =============================================================================
// Component
// =============================================================================
export default function FocusGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('focus-mode') as Mode) || 'reaction');
  const [difficulty, setDifficulty] = useState<Difficulty>(() => (localStorage.getItem('focus-diff') as Difficulty) || 'normal');
  const [rounds, setRounds] = useState(() => parseInt(localStorage.getItem('focus-rounds') || '5'));
  const [stats, setStats] = useState<FocusStats>(loadStats);

  useEffect(() => { localStorage.setItem('focus-mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('focus-diff', difficulty); }, [difficulty]);
  useEffect(() => { localStorage.setItem('focus-rounds', String(rounds)); }, [rounds]);

  const refreshStats = () => setStats(loadStats());

  const rules = useMemo(() => {
    if (isAr) {
      switch (mode) {
        case 'reaction': return ['انتظر اللون الأخضر', 'اضغط فور ظهور الإشارة', 'لا تضغط قبل ظهورها', 'الأسرع متوسطاً يفوز'];
        case 'choice':   return ['اضغط الدائرة الموافقة للون المطلوب', 'الدوائر تظهر في أماكن عشوائية', 'الدقة + السرعة كلاهما يُحسبان', 'كل خطأ يكلّفك في الدقة'];
        case 'stroop':   return ['الكلمة قد تُعرض بلون مختلف عن معناها', 'اضغط على اللون الذي يطابق الكلمة (ليس لونها)', 'تدريب يقوّي تركيز الدماغ', 'الخطأ شائع، خذ نفساً'];
        case 'sequence': return ['ستضيء عدة دوائر بالترتيب', 'كرّر التسلسل بنفس الترتيب', 'كل جولة يطول التسلسل', 'خطأ واحد ينهي الجولة'];
        case 'nback':    return [`اضغط "تطابق" إذا كان الموضع نفس الموضع قبل ${DIFFS[difficulty].nbackN} خطوة`, 'اختبار للذاكرة العاملة (تستخدمه ناسا للرواد)', 'لا تضغط إذا لم يطابق', 'دقة عالية = ذاكرة قوية'];
        case 'aim':      return ['اضغط الأهداف بأسرع ما يمكن', 'الأهداف تتقلص وتتحرك', 'دقة أكبر = نقاط أكثر', `${DIFFS[difficulty].aimDuration} ثانية فقط!`];
      }
    } else {
      switch (mode) {
        case 'reaction': return ['Warte auf das grüne Signal', 'Tippe sobald es erscheint', 'Nicht zu früh tippen', 'Bester Durchschnitt zählt'];
        case 'choice':   return ['Tippe den geforderten Farbkreis', 'Kreise erscheinen zufällig', 'Genauigkeit + Speed zählen', 'Fehler senken die Quote'];
        case 'stroop':   return ['Das Wort kann anders gefärbt sein', 'Wähle die Farbe, die das Wort BENENNT', 'Trainiert kognitive Kontrolle', 'Fehler sind normal'];
        case 'sequence': return ['Mehrere Kreise leuchten in Reihenfolge', 'Wiederhole exakt', 'Sequenz wird länger', 'Ein Fehler beendet die Runde'];
        case 'nback':    return [`Tippe "Match" wenn Position gleich wie vor ${DIFFS[difficulty].nbackN} Schritt(en)`, 'Trainiert Arbeitsgedächtnis (NASA-Test)', 'Nichts tippen wenn kein Match', 'Hohe Genauigkeit = starkes Gedächtnis'];
        case 'aim':      return ['Triff die Ziele so schnell wie möglich', 'Ziele schrumpfen und bewegen sich', 'Mehr Genauigkeit = mehr Punkte', `Nur ${DIFFS[difficulty].aimDuration}s!`];
      }
    }
    return [];
  }, [mode, isAr, difficulty]);

  const percentileText = (() => {
    const r = stats.bestAvg.reaction;
    if (!r) return '-';
    const p = reactionPercentile(r);
    return `${p}%`;
  })();

  const statsArr = [
    { label: isAr ? 'مباريات' : 'Spiele', value: stats.gamesPlayed },
    { label: isAr ? 'أفضل ردة فعل' : 'Best Reaktion', value: stats.bestAvg.reaction ? `${stats.bestAvg.reaction}ms` : '-' },
    { label: isAr ? 'النسبة المئوية' : 'Perzentil', value: percentileText },
    { label: isAr ? 'أفضل ستروب' : 'Best Stroop', value: stats.bestAvg.stroop ? `${stats.bestAvg.stroop}ms` : '-' },
    { label: isAr ? 'أطول سلسلة' : 'Längste Seq.', value: stats.bestSequence || 0 },
    { label: isAr ? 'أفضل N-back' : 'Best N-back', value: stats.bestNback.level ? `${stats.bestNback.level}-back · ${stats.bestNback.accuracy}%` : '-' },
    { label: isAr ? 'أفضل Aim' : 'Best Aim', value: stats.bestAimScore || 0 },
    { label: isAr ? 'دقة Aim' : 'Aim Genauigkeit', value: stats.bestAimAccuracy ? `${stats.bestAimAccuracy}%` : '-' },
  ];

  const options = [
    {
      key: 'mode', label: isAr ? 'النمط' : 'Modus',
      choices: MODES.map(m => ({ value: m.id, label: isAr ? m.ar : m.de })),
      current: mode, onChange: (v: string) => setMode(v as Mode),
    },
    {
      key: 'diff', label: isAr ? 'الصعوبة' : 'Schwierigkeit',
      choices: [
        { value: 'easy', label: isAr ? 'سهل' : 'Leicht' },
        { value: 'normal', label: isAr ? 'متوسط' : 'Normal' },
        { value: 'hard', label: isAr ? 'صعب' : 'Schwer' },
      ],
      current: difficulty, onChange: (v: string) => setDifficulty(v as Difficulty),
    },
    ...(mode === 'reaction' || mode === 'choice' || mode === 'stroop' ? [{
      key: 'rounds', label: isAr ? 'عدد الجولات' : 'Runden',
      choices: [{ value: '3', label: '3' }, { value: '5', label: '5' }, { value: '10', label: '10' }, { value: '20', label: '20' }],
      current: String(rounds), onChange: (v: string) => setRounds(parseInt(v)),
    }] : []),
  ];

  return (
    <GameShell title={isAr ? 'التركيز' : 'Fokus'} icon={Crosshair} accentColor="#06b6d4" rules={rules} stats={statsArr} options={options}>
      {mode === 'reaction' && <ReactionMode key="reaction" diff={DIFFS[difficulty]} rounds={rounds} isAr={isAr} onFinish={refreshStats} />}
      {mode === 'choice'   && <ChoiceMode key="choice" diff={DIFFS[difficulty]} rounds={rounds} isAr={isAr} onFinish={refreshStats} />}
      {mode === 'stroop'   && <StroopMode key="stroop" diff={DIFFS[difficulty]} rounds={rounds} isAr={isAr} onFinish={refreshStats} />}
      {mode === 'sequence' && <SequenceMode key="sequence" diff={DIFFS[difficulty]} isAr={isAr} onFinish={refreshStats} />}
      {mode === 'nback'    && <NBackMode key={`nback-${difficulty}`} diff={DIFFS[difficulty]} isAr={isAr} onFinish={refreshStats} />}
      {mode === 'aim'      && <AimMode key={`aim-${difficulty}`} diff={DIFFS[difficulty]} isAr={isAr} onFinish={refreshStats} />}
    </GameShell>
  );
}

// =============================================================================
// REACTION MODE
// =============================================================================
function ReactionMode({ diff, rounds, isAr, onFinish }: { diff: DifficultyMeta; rounds: number; isAr: boolean; onFinish: () => void }) {
  type State = 'idle' | 'waiting' | 'ready' | 'result' | 'tooEarly' | 'done';
  const [state, setState] = useState<State>('idle');
  const [reactionTime, setReactionTime] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const startTime = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const startRound = useCallback(() => {
    setState('waiting');
    const wait = diff.prepMin + Math.random() * (diff.prepMax - diff.prepMin);
    timeoutRef.current = setTimeout(() => {
      startTime.current = Date.now();
      setState('ready');
      playSfx('hint');
    }, wait);
  }, [diff]);

  const handleTap = () => {
    if (state === 'idle') { startRound(); return; }
    if (state === 'done') return;
    if (state === 'waiting') {
      clearTimeout(timeoutRef.current); setState('tooEarly');
      playSfx('wrong'); vibrate(80);
      return;
    }
    if (state === 'ready') {
      const rt = Date.now() - startTime.current;
      setReactionTime(rt);
      const all = [...results, rt];
      setResults(all);
      setRound(r => r + 1);
      playSfx('tap'); vibrate(20);
      if (round + 1 >= rounds) {
        setState('done');
        const avg = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
        const s = loadStats();
        s.gamesPlayed += 1;
        s.bestAvg.reaction = Math.min(s.bestAvg.reaction ?? Infinity, avg);
        s.recentReactions = [...(s.recentReactions || []), avg].slice(-50);
        saveStatsFn(s); onFinish();
        playSfx('win');
      } else {
        setState('result');
      }
    }
    if (state === 'result' || state === 'tooEarly') startRound();
  };

  const reset = () => { setState('idle'); setResults([]); setRound(0); setReactionTime(0); clearTimeout(timeoutRef.current); };

  const avg = results.length ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;

  const getRating = (ms: number) => {
    if (ms < 180) return { text: isAr ? '⚡ خارق' : '⚡ Übermenschlich', color: '#22d3ee' };
    if (ms < 250) return { text: isAr ? '🔥 رائع' : '🔥 Top', color: '#06b6d4' };
    if (ms < 350) return { text: isAr ? '✨ سريع' : '✨ Schnell', color: '#fbbf24' };
    if (ms < 500) return { text: isAr ? '👍 جيد' : '👍 Gut', color: '#94a3b8' };
    return { text: isAr ? '🐢 حاول أسرع' : '🐢 Schneller!', color: '#ef4444' };
  };

  const style = (() => {
    if (state === 'waiting') return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.2)' };
    if (state === 'ready')   return { bg: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.35)' };
    if (state === 'tooEarly')return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)' };
    return { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)' };
  })();

  return (
    <div className="flex flex-col gap-3 items-center">
      <div className="w-full flex justify-between items-center text-xs">
        <span className="text-zinc-500">{round}/{rounds}</span>
        <div className="flex gap-1">
          {Array.from({ length: rounds }).map((_, i) => (
            <div key={i} className={`w-5 h-1 rounded-full ${i < round ? 'bg-cyan-400' : 'bg-white/8'}`} />
          ))}
        </div>
      </div>
      <button onClick={handleTap} className="w-full rounded-3xl flex flex-col items-center justify-center text-center border-2 transition-all duration-300 active:scale-[0.98] relative overflow-hidden"
        style={{ height: '50vh', background: style.bg, borderColor: style.border }}>
        {state === 'idle' && (
          <>
            <Zap className="w-12 h-12 text-cyan-400 mb-3" />
            <p className="text-2xl font-black text-white mb-1">{isAr ? 'اضغط للبدء' : 'Tippe zum Start'}</p>
            <p className="text-xs text-zinc-400">{isAr ? `${rounds} جولات` : `${rounds} Runden`}</p>
          </>
        )}
        {state === 'waiting' && (
          <>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
              className="w-16 h-16 rounded-full bg-red-500/30 mb-3" />
            <p className="text-2xl font-black text-red-400">{isAr ? 'انتظر...' : 'Warten...'}</p>
          </>
        )}
        {state === 'ready' && (
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex flex-col items-center">
            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.25, repeat: Infinity }}
              className="w-20 h-20 rounded-full bg-emerald-400 mb-3 shadow-2xl shadow-emerald-500/40" />
            <p className="text-3xl font-black text-emerald-300">{isAr ? 'الآن!' : 'JETZT!'}</p>
          </motion.div>
        )}
        {state === 'tooEarly' && (
          <>
            <p className="text-4xl mb-2">😅</p>
            <p className="text-xl font-bold text-amber-400 mb-1">{isAr ? 'مبكر جداً!' : 'Zu früh!'}</p>
            <p className="text-xs text-zinc-400">{isAr ? 'اضغط للمحاولة' : 'Tippe nochmal'}</p>
          </>
        )}
        {state === 'result' && (
          <>
            <p className="text-5xl font-black text-cyan-300 mb-1">{reactionTime}ms</p>
            <p className="text-sm font-bold mb-1" style={{ color: getRating(reactionTime).color }}>{getRating(reactionTime).text}</p>
            <p className="text-xs text-zinc-500 mt-2">{isAr ? 'اضغط للجولة التالية' : 'Weiter →'}</p>
          </>
        )}
        {state === 'done' && (
          <>
            <p className="text-4xl mb-1">🏆</p>
            <p className="text-3xl font-black text-cyan-300 mb-1">{avg}ms</p>
            <p className="text-sm font-bold" style={{ color: getRating(avg).color }}>{getRating(avg).text}</p>
            <p className="text-[11px] text-zinc-400 mt-1">{isAr ? 'أسرع من' : 'Schneller als'} {reactionPercentile(avg)}% {isAr ? 'من اللاعبين' : 'der Spieler'}</p>
            <p className="text-[10px] text-zinc-500 mt-3">{isAr ? 'متوسط' : 'Durchschnitt'} · {rounds} {isAr ? 'جولات' : 'Runden'}</p>
          </>
        )}
      </button>
      {state === 'done' && (
        <button onClick={reset} className="px-6 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-bold text-sm flex items-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> {isAr ? 'مرة أخرى' : 'Nochmal'}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// CHOICE MODE
// =============================================================================
function ChoiceMode({ diff, rounds, isAr, onFinish }: { diff: DifficultyMeta; rounds: number; isAr: boolean; onFinish: () => void }) {
  type State = 'idle' | 'showing' | 'result' | 'done';
  const [state, setState] = useState<State>('idle');
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<ColorId>('red');
  const [options, setOptions] = useState<ColorId[]>([]);
  const [results, setResults] = useState<{ time: number; correct: boolean }[]>([]);
  const startTime = useRef(0);

  const nextRound = useCallback(() => {
    const palette = COLORS.slice(0, diff.choiceCount);
    const shuffled = [...palette].sort(() => Math.random() - 0.5);
    setOptions(shuffled.map(c => c.id));
    setTarget(shuffled[Math.floor(Math.random() * shuffled.length)].id);
    startTime.current = Date.now();
    setState('showing');
  }, [diff.choiceCount]);

  const handleTap = (id: ColorId) => {
    if (state !== 'showing') return;
    const dt = Date.now() - startTime.current;
    const correct = id === target;
    setResults(r => [...r, { time: dt, correct }]);
    setRound(r => r + 1);
    playSfx(correct ? 'match' : 'wrong');
    vibrate(correct ? 20 : 80);
    if (round + 1 >= rounds) {
      setState('done');
      const all = [...results, { time: dt, correct }];
      const avg = Math.round(all.reduce((s, r) => s + r.time, 0) / all.length);
      const ok = all.filter(r => r.correct).length;
      const accuracy = Math.round((ok / all.length) * 100);
      const s = loadStats();
      s.gamesPlayed += 1;
      s.bestAvg.choice = Math.min(s.bestAvg.choice ?? Infinity, avg);
      s.totalAccuracy += accuracy; s.totalRounds += 1;
      saveStatsFn(s); onFinish();
      playSfx('win');
    } else {
      setState('result');
      setTimeout(() => nextRound(), 450);
    }
  };

  const reset = () => { setState('idle'); setRound(0); setResults([]); };

  const correctCount = results.filter(r => r.correct).length;
  const accuracy = results.length ? Math.round((correctCount / results.length) * 100) : 0;
  const avgTime = results.length ? Math.round(results.reduce((s, r) => s + r.time, 0) / results.length) : 0;

  if (state === 'idle') {
    return (
      <div className="text-center pt-10">
        <Crosshair className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <p className="text-xl font-black text-white mb-2">{isAr ? 'اضغط اللون المطلوب' : 'Tippe die Zielfarbe'}</p>
        <p className="text-xs text-zinc-400 mb-6">{isAr ? `${diff.choiceCount} ألوان · ${rounds} جولات` : `${diff.choiceCount} Farben · ${rounds} Runden`}</p>
        <button onClick={nextRound} className="px-8 py-3 rounded-2xl font-black text-cyan-950"
          style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)' }}>
          {isAr ? 'ابدأ' : 'Start'}
        </button>
      </div>
    );
  }
  if (state === 'done') {
    return (
      <div className="text-center pt-8">
        <p className="text-5xl mb-2">🏆</p>
        <p className="text-3xl font-black text-cyan-300">{accuracy}%</p>
        <p className="text-xs text-zinc-500 mb-1">{isAr ? 'دقة' : 'Genauigkeit'}</p>
        <p className="text-lg font-bold text-zinc-300">{avgTime}ms <span className="text-xs font-normal text-zinc-500">{isAr ? 'متوسط' : 'Ø Zeit'}</span></p>
        <button onClick={reset} className="mt-6 px-6 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-bold text-sm">{isAr ? 'مرة أخرى' : 'Nochmal'}</button>
      </div>
    );
  }
  const targetColor = COLORS.find(c => c.id === target)!;
  return (
    <div className="flex flex-col items-center gap-5 pt-4">
      <div className="w-full flex justify-between items-center text-xs">
        <span className="text-zinc-500">{round}/{rounds}</span>
        <span className="text-cyan-400 font-bold">{accuracy}%</span>
      </div>
      <div className="text-center">
        <p className="text-xs text-zinc-500 mb-1.5">{isAr ? 'اضغط اللون:' : 'Tippe:'}</p>
        <motion.p key={target} initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="text-3xl font-black"
          style={{ color: targetColor.hex }}>
          {isAr ? targetColor.ar : targetColor.de}
        </motion.p>
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-[340px]">
        {options.map(id => {
          const c = COLORS.find(x => x.id === id)!;
          return (
            <motion.button key={id} onClick={() => handleTap(id)}
              className="w-20 h-20 rounded-2xl border-2 border-white/15 shadow-lg"
              style={{ background: c.hex, boxShadow: `0 6px 24px ${c.hex}44` }} />
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// STROOP MODE
// =============================================================================
function StroopMode({ diff, rounds, isAr, onFinish }: { diff: DifficultyMeta; rounds: number; isAr: boolean; onFinish: () => void }) {
  type State = 'idle' | 'showing' | 'done';
  const [state, setState] = useState<State>('idle');
  const [round, setRound] = useState(0);
  const [wordId, setWordId] = useState<ColorId>('red');
  const [displayHex, setDisplayHex] = useState('#fff');
  const [options, setOptions] = useState<ColorId[]>([]);
  const [results, setResults] = useState<{ time: number; correct: boolean }[]>([]);
  const startTime = useRef(0);

  const nextRound = useCallback(() => {
    const palette = COLORS.slice(0, diff.choiceCount);
    const target = palette[Math.floor(Math.random() * palette.length)];
    const trap = Math.random() < diff.stroopTrap;
    const displayed = trap ? palette[(palette.indexOf(target) + 1 + Math.floor(Math.random() * (palette.length - 1))) % palette.length] : target;
    const shuffled = [...palette].sort(() => Math.random() - 0.5);
    setWordId(target.id);
    setDisplayHex(displayed.hex);
    setOptions(shuffled.map(c => c.id));
    startTime.current = Date.now();
    setState('showing');
  }, [diff.choiceCount, diff.stroopTrap]);

  const handleTap = (id: ColorId) => {
    if (state !== 'showing') return;
    const dt = Date.now() - startTime.current;
    const correct = id === wordId;
    const next = [...results, { time: dt, correct }];
    setResults(next);
    setRound(r => r + 1);
    playSfx(correct ? 'match' : 'wrong');
    vibrate(correct ? 20 : 80);
    if (round + 1 >= rounds) {
      setState('done');
      const avg = Math.round(next.reduce((s, r) => s + r.time, 0) / next.length);
      const s = loadStats();
      s.gamesPlayed += 1;
      s.bestAvg.stroop = Math.min(s.bestAvg.stroop ?? Infinity, avg);
      saveStatsFn(s); onFinish();
      playSfx('win');
    } else {
      setTimeout(() => nextRound(), 350);
    }
  };

  const reset = () => { setState('idle'); setRound(0); setResults([]); };
  const correctCount = results.filter(r => r.correct).length;
  const accuracy = results.length ? Math.round((correctCount / results.length) * 100) : 0;
  const avgTime = results.length ? Math.round(results.reduce((s, r) => s + r.time, 0) / results.length) : 0;

  if (state === 'idle') {
    return (
      <div className="text-center pt-10">
        <Brain className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <p className="text-xl font-black text-white mb-2">{isAr ? 'اختبار ستروب' : 'Stroop-Test'}</p>
        <p className="text-xs text-zinc-400 mb-6 max-w-[300px] mx-auto">{isAr ? 'الكلمة قد تكون بلون مغاير. اختر اللون الذي تعنيه الكلمة، ليس لون النص.' : 'Wähle die Farbe, die das WORT meint — nicht seine Schriftfarbe.'}</p>
        <button onClick={nextRound} className="px-8 py-3 rounded-2xl font-black text-cyan-950"
          style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)' }}>
          {isAr ? 'ابدأ' : 'Start'}
        </button>
      </div>
    );
  }
  if (state === 'done') {
    return (
      <div className="text-center pt-8">
        <p className="text-5xl mb-2">🧠</p>
        <p className="text-3xl font-black text-cyan-300">{accuracy}%</p>
        <p className="text-xs text-zinc-500 mb-1">{isAr ? 'دقة' : 'Genauigkeit'}</p>
        <p className="text-lg font-bold text-zinc-300">{avgTime}ms</p>
        <button onClick={reset} className="mt-6 px-6 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-bold text-sm">{isAr ? 'مرة أخرى' : 'Nochmal'}</button>
      </div>
    );
  }
  const word = COLORS.find(c => c.id === wordId)!;
  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <div className="w-full flex justify-between items-center text-xs">
        <span className="text-zinc-500">{round}/{rounds}</span>
        <span className="text-cyan-400 font-bold">{accuracy}%</span>
      </div>
      <motion.div key={round} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="text-5xl font-black tracking-wider" style={{ color: displayHex }}>
        {(isAr ? word.ar : word.de).toUpperCase()}
      </motion.div>
      <div className="grid grid-cols-3 gap-3 max-w-[340px]">
        {options.map(id => {
          const c = COLORS.find(x => x.id === id)!;
          return (
            <motion.button key={id} onClick={() => handleTap(id)}
              className="px-3 py-3 rounded-2xl border-2 border-white/15 font-bold text-sm bg-white/4"
              style={{ color: c.hex }}>
              {isAr ? c.ar : c.de}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// SEQUENCE MODE (Simon Says)
// =============================================================================
function SequenceMode({ diff, isAr, onFinish }: { diff: DifficultyMeta; isAr: boolean; onFinish: () => void }) {
  type State = 'idle' | 'showing' | 'input' | 'fail' | 'done';
  const [state, setState] = useState<State>('idle');
  const [seq, setSeq] = useState<number[]>([]);
  const [input, setInput] = useState<number[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [level, setLevel] = useState(0);
  const colors = COLORS.slice(0, 4);

  const startGame = useCallback(() => {
    const initial = Array.from({ length: diff.sequenceStart }, () => Math.floor(Math.random() * colors.length));
    setSeq(initial);
    setInput([]); setLevel(diff.sequenceStart);
    setState('showing');
  }, [colors.length, diff.sequenceStart]);

  useEffect(() => {
    if (state !== 'showing') return;
    let i = 0;
    const showNext = () => {
      if (i >= seq.length) {
        setActiveIdx(null);
        setTimeout(() => setState('input'), 300);
        return;
      }
      setActiveIdx(seq[i]);
      playSfx('tap');
      setTimeout(() => { setActiveIdx(null); setTimeout(() => { i++; showNext(); }, 220); }, 460);
    };
    setTimeout(showNext, 500);
  }, [state, seq]);

  const handleTap = (idx: number) => {
    if (state !== 'input') return;
    setActiveIdx(idx);
    setTimeout(() => setActiveIdx(null), 200);
    const newInput = [...input, idx];
    setInput(newInput);
    if (seq[newInput.length - 1] !== idx) {
      playSfx('wrong'); vibrate(120);
      setState('fail');
      const s = loadStats();
      s.gamesPlayed += 1;
      s.bestSequence = Math.max(s.bestSequence, level - 1);
      saveStatsFn(s); onFinish();
      playSfx('lose');
      return;
    }
    playSfx('tap'); vibrate(15);
    if (newInput.length === seq.length) {
      setTimeout(() => {
        const nextSeq = [...seq, Math.floor(Math.random() * colors.length)];
        setSeq(nextSeq); setInput([]); setLevel(l => l + 1); setState('showing');
        playSfx('streak');
      }, 350);
    }
  };

  const reset = () => { setState('idle'); setSeq([]); setInput([]); setLevel(0); };

  if (state === 'idle') {
    return (
      <div className="text-center pt-10">
        <Hash className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <p className="text-xl font-black text-white mb-2">{isAr ? 'تذكُّر السلسلة' : 'Sequenz merken'}</p>
        <p className="text-xs text-zinc-400 mb-6">{isAr ? 'احفظ الترتيب ثم كرّره' : 'Merke dir die Reihenfolge'}</p>
        <button onClick={startGame} className="px-8 py-3 rounded-2xl font-black text-cyan-950"
          style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)' }}>
          {isAr ? 'ابدأ' : 'Start'}
        </button>
      </div>
    );
  }
  if (state === 'fail') {
    return (
      <div className="text-center pt-8">
        <p className="text-5xl mb-2">💔</p>
        <p className="text-2xl font-black text-rose-400 mb-1">{isAr ? 'وصلت إلى' : 'Erreicht'} {level - 1}</p>
        <p className="text-xs text-zinc-500">{isAr ? 'أطول سلسلة هذه المباراة' : 'Längste Sequenz'}</p>
        <button onClick={reset} className="mt-6 px-6 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-bold text-sm">{isAr ? 'مرة أخرى' : 'Nochmal'}</button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-5 pt-4">
      <div className="flex justify-between w-full items-center text-xs">
        <span className="text-zinc-500">{isAr ? 'المستوى' : 'Level'} {level}</span>
        <span className="text-cyan-400 font-bold">{state === 'showing' ? (isAr ? 'انتبه...' : 'Schau...') : (isAr ? 'كرّر!' : 'Wiederhole!')}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {colors.map((c, i) => (
          <motion.button key={c.id} disabled={state !== 'input'} onClick={() => handleTap(i)}
            animate={activeIdx === i ? { scale: 1.08, opacity: 1 } : { scale: 1, opacity: state === 'showing' ? 0.6 : 0.9 }}
            transition={{ duration: 0.2 }}
            className="w-28 h-28 rounded-3xl border-2 border-white/15 shadow-xl"
            style={{ background: c.hex, boxShadow: activeIdx === i ? `0 0 32px ${c.hex}` : `0 4px 16px ${c.hex}44` }} />
        ))}
      </div>
      <p className="text-[10px] text-zinc-400">{seq.length} {isAr ? 'خطوات' : 'Schritte'}</p>
    </div>
  );
}

// =============================================================================
// N-BACK MODE (Working Memory)
// =============================================================================
function NBackMode({ diff, isAr, onFinish }: { diff: DifficultyMeta; isAr: boolean; onFinish: () => void }) {
  type State = 'idle' | 'playing' | 'done';
  const [state, setState] = useState<State>('idle');
  const N = diff.nbackN;
  const TOTAL_TRIALS = 20;
  const [trial, setTrial] = useState(0);
  const [currentPos, setCurrentPos] = useState<number | null>(null);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);
  const [matched, setMatched] = useState<boolean | null>(null);

  // Refs for accurate book-keeping inside trial timers
  const hitsRef = useRef(0);
  const missRef = useRef(0);
  const faRef = useRef(0);
  const respondedRef = useRef(false);
  const expectedMatchRef = useRef(false);

  const trialTimer = useRef<ReturnType<typeof setTimeout>>();

  const start = () => {
    setState('playing'); setTrial(0);
    setCurrentPos(null); setHits(0); setMisses(0); setFalseAlarms(0); setMatched(null);
    hitsRef.current = 0; missRef.current = 0; faRef.current = 0;
    respondedRef.current = false;
    setTimeout(() => runTrial(0, []), 400);
  };

  const runTrial = (t: number, h: number[]) => {
    if (t >= TOTAL_TRIALS) {
      finish();
      return;
    }
    let pos: number;
    if (h.length >= N && Math.random() < 0.33) {
      pos = h[h.length - N];
    } else {
      pos = Math.floor(Math.random() * 9);
    }
    const expectedMatch = h.length >= N && pos === h[h.length - N];
    expectedMatchRef.current = expectedMatch;
    respondedRef.current = false;

    setCurrentPos(pos); setMatched(null);
    playSfx('tick');
    const newH = [...h, pos];
    setTrial(t + 1);

    trialTimer.current = setTimeout(() => {
      // End of trial: if not responded and was a match, that's a miss
      if (!respondedRef.current && expectedMatch) {
        missRef.current += 1;
        setMisses(missRef.current);
      }
      setCurrentPos(null);
      setMatched(null);
      setTimeout(() => runTrial(t + 1, newH), 350);
    }, 2200);
  };

  const finish = () => {
    setState('done');
    const correct = TOTAL_TRIALS - missRef.current - faRef.current;
    const accuracy = Math.round((correct / TOTAL_TRIALS) * 100);
    const s = loadStats();
    s.gamesPlayed += 1;
    if (N > s.bestNback.level || (N === s.bestNback.level && accuracy > s.bestNback.accuracy)) {
      s.bestNback = { level: N, accuracy };
    }
    saveStatsFn(s);
    onFinish();
    if (accuracy >= 80) playSfx('win'); else playSfx('lose');
  };

  const onMatchTap = () => {
    if (state !== 'playing' || respondedRef.current) return;
    respondedRef.current = true;
    if (expectedMatchRef.current) {
      hitsRef.current += 1; setHits(hitsRef.current);
      setMatched(true);
      playSfx('match'); vibrate(20);
    } else {
      faRef.current += 1; setFalseAlarms(faRef.current);
      setMatched(false);
      playSfx('wrong'); vibrate(60);
    }
  };

  useEffect(() => () => { if (trialTimer.current) clearTimeout(trialTimer.current); }, []);

  if (state === 'idle') {
    return (
      <div className="text-center pt-10 max-w-[340px] mx-auto">
        <Layers className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <p className="text-xl font-black text-white mb-2">{N}-back</p>
        <p className="text-xs text-zinc-400 mb-6">
          {isAr ? `سيظهر مربع في 9 مواضع. اضغط "تطابق" إذا كان الموضع نفس الموضع قبل ${N} خطوة. ${TOTAL_TRIALS} محاولة.`
                : `Ein Quadrat erscheint in 9 Positionen. Tippe "Match" wenn die Position gleich wie vor ${N} Schritt(en) ist. ${TOTAL_TRIALS} Versuche.`}
        </p>
        <button onClick={start} className="px-8 py-3 rounded-2xl font-black text-cyan-950"
          style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)' }}>
          {isAr ? 'ابدأ' : 'Start'}
        </button>
      </div>
    );
  }

  if (state === 'done') {
    const correct = TOTAL_TRIALS - misses - falseAlarms;
    const accuracy = Math.round((correct / TOTAL_TRIALS) * 100);
    return (
      <div className="text-center pt-8 max-w-[340px] mx-auto">
        <p className="text-5xl mb-2">🧠</p>
        <p className="text-3xl font-black text-cyan-300 mb-1">{accuracy}%</p>
        <p className="text-xs text-zinc-500 mb-3">{isAr ? `دقة على ${N}-back` : `Genauigkeit ${N}-back`}</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="p-2 rounded-xl bg-emerald-500/10"><p className="text-emerald-300 font-bold text-lg">{hits}</p><p className="text-[10px] text-zinc-500">{isAr ? 'إصابة' : 'Treffer'}</p></div>
          <div className="p-2 rounded-xl bg-amber-500/10"><p className="text-amber-300 font-bold text-lg">{misses}</p><p className="text-[10px] text-zinc-500">{isAr ? 'فات' : 'Verpasst'}</p></div>
          <div className="p-2 rounded-xl bg-rose-500/10"><p className="text-rose-300 font-bold text-lg">{falseAlarms}</p><p className="text-[10px] text-zinc-500">{isAr ? 'خطأ' : 'Falsch'}</p></div>
        </div>
        <button onClick={start} className="mt-5 px-6 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-bold text-sm">{isAr ? 'مرة أخرى' : 'Nochmal'}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-2 max-w-[340px] mx-auto">
      <div className="w-full flex justify-between items-center text-xs">
        <span className="text-cyan-300 font-bold">{N}-back</span>
        <span className="text-zinc-500">{trial}/{TOTAL_TRIALS}</span>
        <div className="flex gap-2">
          <span className="text-emerald-400 text-[10px]">✓{hits}</span>
          <span className="text-amber-400 text-[10px]">⊘{misses}</span>
          <span className="text-rose-400 text-[10px]">✗{falseAlarms}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl border-2 transition-all"
            style={{
              width: 80, height: 80,
              background: currentPos === i ? '#06b6d4' : 'rgba(255,255,255,0.04)',
              borderColor: currentPos === i ? '#22d3ee' : 'rgba(255,255,255,0.06)',
              boxShadow: currentPos === i ? '0 0 24px rgba(6,182,212,0.6)' : 'none',
            }} />
        ))}
      </div>

      <button onClick={onMatchTap} disabled={matched !== null}
        className="mt-6 w-full max-w-[280px] py-4 rounded-2xl font-black text-lg transition-all disabled:opacity-40"
        style={{
          background: matched === true ? 'rgba(16,185,129,0.3)' : matched === false ? 'rgba(244,63,94,0.3)' : 'linear-gradient(135deg, #22d3ee, #06b6d4)',
          color: matched === null ? '#082f49' : '#fff',
          border: `2px solid ${matched === true ? '#10b981' : matched === false ? '#ef4444' : '#22d3ee'}`,
        }}>
        {matched === true ? '✓' : matched === false ? '✗' : (isAr ? 'تطابق' : 'MATCH')}
      </button>
      <p className="text-[10px] text-zinc-400 text-center">
        {isAr ? `هل الموضع نفس الموضع قبل ${N} خطوة؟` : `Position gleich wie vor ${N} Schritt(en)?`}
      </p>
    </div>
  );
}

// =============================================================================
// AIM TRAINER MODE
// =============================================================================
function AimMode({ diff, isAr, onFinish }: { diff: DifficultyMeta; isAr: boolean; onFinish: () => void }) {
  type State = 'idle' | 'playing' | 'done';
  const [state, setState] = useState<State>('idle');
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [missTaps, setMissTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(diff.aimDuration);
  const [target, setTarget] = useState<{ x: number; y: number; r: number; born: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const spawnTarget = useCallback(() => {
    const c = containerRef.current; if (!c) return;
    const w = c.clientWidth; const h = c.clientHeight;
    const r = diff.aimTargetRadius;
    const x = r + Math.random() * (w - 2 * r);
    const y = r + Math.random() * (h - 2 * r);
    setTarget({ x, y, r, born: Date.now() });
  }, [diff.aimTargetRadius]);

  const start = () => {
    setState('playing'); setScore(0); setHits(0); setMissTaps(0); setTimeLeft(diff.aimDuration);
    hitsRef.current = 0; missRef.current = 0; scoreRef.current = 0;
    setTimeout(spawnTarget, 200);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  // Need to use refs because of stale closure in timer
  const hitsRef = useRef(0); const missRef = useRef(0); const scoreRef = useRef(0);
  useEffect(() => { hitsRef.current = hits; }, [hits]);
  useEffect(() => { missRef.current = missTaps; }, [missTaps]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // When timeLeft hits 0, finalize stats with up-to-date refs
  useEffect(() => {
    if (state === 'playing' && timeLeft === 0) {
      setState('done');
      setTarget(null);
      const totalTaps = hitsRef.current + missRef.current;
      const accuracy = totalTaps ? Math.round((hitsRef.current / totalTaps) * 100) : 0;
      const s = loadStats();
      s.gamesPlayed += 1;
      if (scoreRef.current > s.bestAimScore) s.bestAimScore = scoreRef.current;
      if (accuracy > s.bestAimAccuracy) s.bestAimAccuracy = accuracy;
      saveStatsFn(s);
      onFinish();
      playSfx('win');
    }
  }, [timeLeft, state, onFinish]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleAreaClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (state !== 'playing' || !target) return;
    const c = containerRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    let cx: number, cy: number;
    if ('touches' in e && e.touches[0]) { cx = e.touches[0].clientX - rect.left; cy = e.touches[0].clientY - rect.top; }
    else if ('changedTouches' in e && e.changedTouches[0]) { cx = e.changedTouches[0].clientX - rect.left; cy = e.changedTouches[0].clientY - rect.top; }
    else { cx = (e as React.MouseEvent).clientX - rect.left; cy = (e as React.MouseEvent).clientY - rect.top; }
    const dx = cx - target.x, dy = cy - target.y;
    if (Math.sqrt(dx * dx + dy * dy) <= target.r + 6) {
      // hit
      const dt = Date.now() - target.born;
      const speedBonus = Math.max(0, Math.round((1500 - dt) / 30));
      const gained = 100 + speedBonus;
      setScore(s => s + gained);
      setHits(h => h + 1);
      playSfx('match'); vibrate(15);
      spawnTarget();
    } else {
      setMissTaps(m => m + 1);
      setScore(s => Math.max(0, s - 25));
      playSfx('wrong'); vibrate(40);
    }
  };

  if (state === 'idle') {
    return (
      <div className="text-center pt-10">
        <Target className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <p className="text-xl font-black text-white mb-2">{isAr ? 'مدرب التهديف' : 'Aim Trainer'}</p>
        <p className="text-xs text-zinc-400 mb-6">
          {isAr ? `${diff.aimDuration} ثانية، اضغط الأهداف بسرعة ودقة` : `${diff.aimDuration}s, triff Ziele schnell und präzise`}
        </p>
        <button onClick={start} className="px-8 py-3 rounded-2xl font-black text-cyan-950"
          style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)' }}>
          {isAr ? 'ابدأ' : 'Start'}
        </button>
      </div>
    );
  }

  if (state === 'done') {
    const totalTaps = hits + missTaps;
    const accuracy = totalTaps ? Math.round((hits / totalTaps) * 100) : 0;
    return (
      <div className="text-center pt-8">
        <p className="text-5xl mb-2">🎯</p>
        <p className="text-3xl font-black text-cyan-300">{score}</p>
        <p className="text-xs text-zinc-500 mb-3">{isAr ? 'نقطة' : 'Punkte'}</p>
        <div className="grid grid-cols-2 gap-2 max-w-[260px] mx-auto">
          <div className="p-2 rounded-xl bg-emerald-500/10"><p className="text-emerald-300 font-bold text-lg">{hits}</p><p className="text-[10px] text-zinc-500">{isAr ? 'إصابة' : 'Treffer'}</p></div>
          <div className="p-2 rounded-xl bg-cyan-500/10"><p className="text-cyan-300 font-bold text-lg">{accuracy}%</p><p className="text-[10px] text-zinc-500">{isAr ? 'دقة' : 'Genauigkeit'}</p></div>
        </div>
        <button onClick={start} className="mt-5 px-6 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-bold text-sm">{isAr ? 'مرة أخرى' : 'Nochmal'}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <div className="w-full flex justify-between items-center text-xs px-2">
        <span className="text-cyan-300 font-bold tabular-nums">{score}</span>
        <span className={`tabular-nums font-black ${timeLeft <= 5 ? 'text-rose-400' : 'text-zinc-400'}`}>{timeLeft}s</span>
        <span className="text-zinc-500">{hits} {isAr ? 'إصابة' : 'Treffer'}</span>
      </div>

      <div ref={containerRef}
        onMouseDown={handleAreaClick}
        onTouchStart={handleAreaClick}
        className="relative w-full max-w-[400px] rounded-3xl border-2 border-cyan-500/15 overflow-hidden"
        style={{ height: '60vh', background: 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.04) 0%, rgba(0,0,0,0.4) 70%)' }}>
        <AnimatePresence>
          {target && (
            <motion.div
              key={target.born}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: target.x - target.r, top: target.y - target.r,
                width: target.r * 2, height: target.r * 2,
                background: 'radial-gradient(circle, #fbbf24 0%, #f59e0b 50%, #b45309 100%)',
                boxShadow: '0 0 24px rgba(245,158,11,0.6)',
              }}>
              <div className="absolute inset-2 rounded-full border-2 border-white/30" />
              <div className="absolute inset-1/3 rounded-full bg-rose-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
