import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/components/GameShell';
import { motion } from 'framer-motion';
import { Crosshair, Zap, Brain, Hash, RotateCcw } from 'lucide-react';
import { playSfx, vibrate } from '@/utils/gameFeedback';

// ---------- Modes ----------
type Mode = 'reaction' | 'choice' | 'stroop' | 'sequence';

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
];

// ---------- Difficulty ----------
type Difficulty = 'easy' | 'normal' | 'hard';
interface DifficultyMeta {
  prepMin: number; prepMax: number;  // for reaction mode
  choiceCount: number;               // for choice/stroop
  stroopTrap: number;                // 0..1 prob word!=color
  sequenceStart: number;             // starting length
}
const DIFFS: Record<Difficulty, DifficultyMeta> = {
  easy:   { prepMin: 1800, prepMax: 4500, choiceCount: 3, stroopTrap: 0.4, sequenceStart: 3 },
  normal: { prepMin: 1300, prepMax: 3700, choiceCount: 4, stroopTrap: 0.65, sequenceStart: 4 },
  hard:   { prepMin: 800,  prepMax: 2400, choiceCount: 6, stroopTrap: 0.85, sequenceStart: 5 },
};

// ---------- Colors ----------
const COLORS = [
  { id: 'red',    hex: '#ef4444', ar: 'أحمر',  de: 'Rot' },
  { id: 'blue',   hex: '#3b82f6', ar: 'أزرق',  de: 'Blau' },
  { id: 'green',  hex: '#10b981', ar: 'أخضر',  de: 'Grün' },
  { id: 'yellow', hex: '#facc15', ar: 'أصفر',  de: 'Gelb' },
  { id: 'purple', hex: '#a855f7', ar: 'بنفسجي',de: 'Lila' },
  { id: 'pink',   hex: '#ec4899', ar: 'وردي',  de: 'Pink' },
] as const;
type ColorId = typeof COLORS[number]['id'];

// ---------- Stats ----------
interface FocusStats {
  gamesPlayed: number;
  bestAvg: Partial<Record<Mode, number>>;
  bestSequence: number;
  totalAccuracy: number;
  totalRounds: number;
}
function loadStats(): FocusStats {
  try {
    const s = JSON.parse(localStorage.getItem('focus-stats') || '{}');
    return { gamesPlayed: 0, bestAvg: {}, bestSequence: 0, totalAccuracy: 0, totalRounds: 0, ...s, bestAvg: s.bestAvg || {} };
  } catch {
    return { gamesPlayed: 0, bestAvg: {}, bestSequence: 0, totalAccuracy: 0, totalRounds: 0 };
  }
}
function saveStatsFn(s: FocusStats) { localStorage.setItem('focus-stats', JSON.stringify(s)); }

// ---------- Component ----------
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
        case 'choice': return ['اضغط على الدائرة الموافقة للون المطلوب', 'الدوائر تظهر في أماكن عشوائية', 'الدقة + السرعة كلاهما يُحسبان', 'كل خطأ يكلّفك في الدقة'];
        case 'stroop': return ['الكلمة قد تُعرض بلون مختلف عن معناها', 'اضغط على اللون الذي يطابق الكلمة (ليس لونها)', 'تدريب يقوّي تركيز الدماغ', 'الخطأ شائع، خذ نفساً'];
        case 'sequence': return ['ستضيء عدة دوائر بالترتيب', 'كرّر التسلسل بنفس الترتيب', 'كل جولة يطول التسلسل', 'خطأ واحد ينهي الجولة'];
      }
    } else {
      switch (mode) {
        case 'reaction': return ['Warte auf das grüne Signal', 'Tippe sobald es erscheint', 'Nicht zu früh tippen', 'Bester Durchschnitt zählt'];
        case 'choice': return ['Tippe den geforderten Farbkreis', 'Kreise erscheinen zufällig', 'Genauigkeit und Speed zählen', 'Jeder Fehler senkt die Quote'];
        case 'stroop': return ['Das Wort kann anders gefärbt sein', 'Wähle die Farbe, die das Wort BENENNT (nicht seine Farbe)', 'Trainiert kognitive Kontrolle', 'Fehler sind normal'];
        case 'sequence': return ['Mehrere Kreise leuchten in Reihenfolge', 'Wiederhole exakt', 'Sequenz wird länger', 'Ein Fehler beendet die Runde'];
      }
    }
    return [];
  }, [mode, isAr]);

  const statsArr = [
    { label: isAr ? 'مباريات' : 'Spiele', value: stats.gamesPlayed },
    { label: isAr ? 'أفضل ردة فعل' : 'Best Reaktion', value: stats.bestAvg.reaction ? `${stats.bestAvg.reaction}ms` : '-' },
    { label: isAr ? 'أفضل ستروب' : 'Best Stroop', value: stats.bestAvg.stroop ? `${stats.bestAvg.stroop}ms` : '-' },
    { label: isAr ? 'أطول سلسلة' : 'Längste Seq.', value: stats.bestSequence || 0 },
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
    {
      key: 'rounds', label: isAr ? 'عدد الجولات' : 'Runden',
      choices: [{ value: '3', label: '3' }, { value: '5', label: '5' }, { value: '10', label: '10' }, { value: '20', label: '20' }],
      current: String(rounds), onChange: (v: string) => setRounds(parseInt(v)),
    },
  ];

  return (
    <GameShell title={isAr ? 'التركيز' : 'Fokus'} icon={Crosshair} accentColor="#06b6d4" rules={rules} stats={statsArr} options={options}>
      {mode === 'reaction' && <ReactionMode key="reaction" diff={DIFFS[difficulty]} rounds={rounds} isAr={isAr} onFinish={refreshStats} />}
      {mode === 'choice' && <ChoiceMode key="choice" diff={DIFFS[difficulty]} rounds={rounds} isAr={isAr} onFinish={refreshStats} />}
      {mode === 'stroop' && <StroopMode key="stroop" diff={DIFFS[difficulty]} rounds={rounds} isAr={isAr} onFinish={refreshStats} />}
      {mode === 'sequence' && <SequenceMode key="sequence" diff={DIFFS[difficulty]} isAr={isAr} onFinish={refreshStats} />}
    </GameShell>
  );
}

// =========================================================================
// REACTION MODE
// =========================================================================
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
        <div className="absolute inset-0 opacity-5"
          style={{ background: 'radial-gradient(circle at 50% 50%, white 0%, transparent 60%)' }} />
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

// =========================================================================
// CHOICE MODE
// =========================================================================
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
      const avg = Math.round((results.reduce((s, r) => s + r.time, 0) + dt) / (results.length + 1));
      const ok = results.filter(r => r.correct).length + (correct ? 1 : 0);
      const accuracy = Math.round((ok / (results.length + 1)) * 100);
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

  useEffect(() => { if (state === 'idle' && round === 0 && results.length === 0) return; /* nothing */ }, [state, round, results]);

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
            <motion.button key={id} whileTap={{ scale: 0.88 }} onClick={() => handleTap(id)}
              className="w-20 h-20 rounded-2xl border-2 border-white/15 shadow-lg"
              style={{ background: c.hex, boxShadow: `0 6px 24px ${c.hex}44` }} />
          );
        })}
      </div>
    </div>
  );
}

// =========================================================================
// STROOP MODE
// =========================================================================
// Choose the color whose NAME matches the displayed word.
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
            <motion.button key={id} whileTap={{ scale: 0.88 }} onClick={() => handleTap(id)}
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

// =========================================================================
// SEQUENCE MODE (Simon Says)
// =========================================================================
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
      // extend by one
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
      <p className="text-[10px] text-zinc-600">{seq.length} {isAr ? 'خطوات' : 'Schritte'}</p>
    </div>
  );
}
