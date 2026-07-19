import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/features/games/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Brain, Zap, Hash, Layers, Target, Award, RotateCcw, ChevronRight, Trophy } from '@/lib/icons';
import { playSfx, vibrate } from '@/features/games/utils/gameFeedback';

// =============================================================================
// Focus Decathlon — five back- micro-tests run in a fixed sequence.
// At the end we combine the per-test scaled scores (mean 100, sd 15 — IQ-style)
// into a single "Cognitive Index" that the player can chase day after day.
//
// Each event is a self-contained minigame implemented inline so the decathlon
// stays an atomic flow: no page changes, no state pollution from the standard
// Focus modes. The events are intentionally short (10-30s each) so the whole
// run takes about 3 minutes.
//
// Events:
//   1. Reaction (5 trials, simple visual go/no-go)
//   2. Stroop   (8 trials, color-word interference)
//   3. Memory   (1 sequence challenge — how long can you remember?)
//   4. N-back   (15 trials, 2-back working memory)
//   5. Aim      (20s, hit moving targets)
// =============================================================================

type EventId = 'reaction' | 'stroop' | 'memory' | 'nback' | 'aim';

interface EventDef {
  id: EventId;
  ar: string;
  de: string;
  emoji: string;
  /** Map raw performance number → scaled IQ-like score (100 = average) */
  scale: (raw: number) => number;
}

// Calibrations are based on rough population norms documented in HumanBenchmark.com
// and Lumosity grade curves. Each scale is a piecewise linear interpolation.
function pwLinear(raw: number, points: { x: number; y: number }[]): number {
  // points must be sorted by x ascending
  if (raw <= points[0].x) return points[0].y;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (raw <= b.x) {
      const t = (raw - a.x) / (b.x - a.x);
      return Math.round(a.y + t * (b.y - a.y));
    }
  }
  return points[points.length - 1].y;
}

const EVENTS: EventDef[] = [
  {
    id: 'reaction', ar: 'ردة الفعل', de: 'Reaktion', emoji: '⚡',
    // raw = average ms (lower better). 200ms → 130, 280ms → 100, 400ms → 70
    scale: (ms) => pwLinear(ms, [
      { x: 150, y: 145 }, { x: 200, y: 130 }, { x: 280, y: 100 },
      { x: 400, y: 70 }, { x: 600, y: 55 }, { x: 800, y: 45 },
    ]),
  },
  {
    id: 'stroop', ar: 'ستروب', de: 'Stroop', emoji: '🧠',
    // raw = (correct/8) * 100 - (avg ms / 10). higher better.
    scale: (raw) => pwLinear(raw, [
      { x: 0, y: 50 }, { x: 50, y: 85 }, { x: 75, y: 115 }, { x: 100, y: 140 },
    ]),
  },
  {
    id: 'memory', ar: 'سلسلة', de: 'Sequenz', emoji: '#️⃣',
    // raw = longest sequence length (typically 5-9 average)
    scale: (n) => pwLinear(n, [
      { x: 3, y: 70 }, { x: 5, y: 95 }, { x: 7, y: 115 }, { x: 9, y: 130 }, { x: 12, y: 145 },
    ]),
  },
  {
    id: 'nback', ar: 'N-back', de: 'N-back', emoji: '📐',
    // raw = % accuracy on 15-trial 2-back
    scale: (acc) => pwLinear(acc, [
      { x: 0, y: 55 }, { x: 50, y: 85 }, { x: 75, y: 105 }, { x: 90, y: 125 }, { x: 100, y: 145 },
    ]),
  },
  {
    id: 'aim', ar: 'التهديف', de: 'Zielen', emoji: '🎯',
    // raw = score (hits * 100 + speed bonuses)
    scale: (s) => pwLinear(s, [
      { x: 0, y: 50 }, { x: 500, y: 85 }, { x: 1000, y: 105 }, { x: 1800, y: 125 }, { x: 3000, y: 145 },
    ]),
  },
];

// =============================================================================
// Persistence
// =============================================================================
interface DecathlonRecord {
  date: string;
  events: { id: EventId; raw: number; scaled: number }[];
  index: number;
}
interface DecathlonSave {
  best: DecathlonRecord | null;
  history: DecathlonRecord[];
}
const KEY = 'focus-decathlon';
function loadSave(): DecathlonSave {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { best: s.best ?? null, history: s.history ?? [] };
  } catch { return { best: null, history: [] }; }
}
import { saveGameProgress, getGameProgress } from '../api';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

function saveSave(s: DecathlonSave) {
  localStorage.setItem(KEY, JSON.stringify(s));
  if (isSupabaseConfigured) {
    saveGameProgress('focus-decathlon', s).catch(console.error);
  }
}

function indexBand(idx: number, isAr: boolean) {
  if (idx >= 130) return isAr ? 'متفوق' : 'Außergewöhnlich';
  if (idx >= 115) return isAr ? 'فوق المتوسط' : 'Überdurchschnitt';
  if (idx >= 90)  return isAr ? 'متوسط' : 'Durchschnitt';
  if (idx >= 75)  return isAr ? 'تحت المتوسط' : 'Unter Durchschnitt';
  return isAr ? 'يحتاج تدريب' : 'Mehr Übung';
}

// =============================================================================
// Component
// =============================================================================
export default function FocusDecathlonPage() {
  const { language } = useApp();
  const isAr = language === 'ar';

  type Phase = 'briefing' | 'event' | 'result';
  const [phase, setPhase] = useState<Phase>('briefing');
  const [eventIdx, setEventIdx] = useState(0);
  const [results, setResults] = useState<{ id: EventId; raw: number; scaled: number }[]>([]);
  const [save, setSave] = useState(loadSave);

  useEffect(() => {
    const syncSave = async () => {
      try {
        const cloudSave = await getGameProgress('focus-decathlon');
        if (cloudSave) {
          localStorage.setItem(KEY, JSON.stringify(cloudSave));
          setSave(prev => ({ ...prev, ...cloudSave }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    syncSave();
  }, []);

  const finalIndex = useMemo(() => {
    if (results.length !== EVENTS.length) return null;
    return Math.round(results.reduce((s, r) => s + r.scaled, 0) / results.length);
  }, [results]);

  // When all events are done, persist the run.
  useEffect(() => {
    if (phase !== 'event' || finalIndex === null) return;
    const rec: DecathlonRecord = {
      date: new Date().toISOString(),
      events: results,
      index: finalIndex,
    };
    const next: DecathlonSave = {
      best: !save.best || rec.index > save.best.index ? rec : save.best,
      history: [rec, ...save.history].slice(0, 20),
    };
    saveSave(next);
    setSave(next);
    playSfx('win'); vibrate([60, 60, 200]);
    setPhase('result');
  }, [finalIndex, phase, results, save]);

  const startDecathlon = () => {
    setResults([]);
    setEventIdx(0);
    setPhase('event');
    playSfx('click'); vibrate(15);
  };

  const onEventComplete = (id: EventId, raw: number) => {
    const scaled = EVENTS.find(e => e.id === id)!.scale(raw);
    const rec = { id, raw, scaled };
    setResults(prev => [...prev, rec]);
    if (eventIdx < EVENTS.length - 1) {
      setEventIdx(i => i + 1);
    }
    // The useEffect above handles final result transition.
  };

  // ---------------------------------------------------------------------------
  // Briefing screen
  // ---------------------------------------------------------------------------
  if (phase === 'briefing') {
    return (
      <GameShell
        title={isAr ? 'العشاري الذهني' : 'Mental-Decathlon'}
        icon={Award}
        accentColor="hsl(142, 71%, 45%)"
        rules={isAr ? [
          '5 محطات متتالية بدون توقف',
          'ردة فعل، ستروب، ذاكرة، N-back، تهديف',
          'كل محطة تُحسب على مقياس IQ (متوسط 100)',
          'النتيجة النهائية = متوسط المحطات',
          'تقريرك سيُحفظ ويُقارن بأفضل أدائك',
        ] : [
          '5 Disziplinen am Stück',
          'Reaktion, Stroop, Sequenz, N-back, Zielen',
          'IQ-Skala pro Disziplin (Mittel = 100)',
          'Gesamt = Durchschnitt der 5',
          'Beste Leistung wird gespeichert',
        ]}
        stats={[
          { label: isAr ? 'أفضل تقييم' : 'Bestleistung', value: save.best?.index ?? '—' },
          { label: isAr ? 'الجلسات' : 'Sessions', value: save.history.length },
          { label: isAr ? 'المستوى' : 'Stufe', value: save.best ? indexBand(save.best.index, isAr) : '—' },
        ]}
        options={[]}
      >
        {/* Event preview */}
        <div className="space-y-2 mb-5">
          {EVENTS.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-3"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center text-xl shrink-0">
                {e.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground">
                  #{i + 1} · {isAr ? e.ar : e.de}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {save.best?.events.find(ev => ev.id === e.id)?.scaled
                    ? `${isAr ? 'أفضل: ' : 'Best: '}${save.best.events.find(ev => ev.id === e.id)?.scaled}`
                    : (isAr ? 'لم يُلعب بعد' : 'Noch ungespielt')}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-cyan-300/60" />
            </motion.div>
          ))}
        </div>

        <button
          onClick={startDecathlon}
          className="w-full py-4 rounded-2xl font-black text-cyan-950 "
          style={{ }}
        >
          <Zap className="w-5 h-5 inline mr-1.5" />
          {isAr ? 'ابدأ العشاري' : 'Decathlon starten'}
        </button>
      </GameShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Active event runner
  // ---------------------------------------------------------------------------
  if (phase === 'event') {
    const current = EVENTS[eventIdx];
    return (
      <GameShell
        title={isAr ? 'العشاري الذهني' : 'Mental-Decathlon'}
        icon={Award}
        accentColor="hsl(142, 71%, 45%)"
        rules={[]}
        stats={[]}
        options={[]}
      >
        {/* Progress strip */}
        <div className="flex items-center gap-1 mb-4 px-1">
          {EVENTS.map((e, i) => (
            <div
              key={e.id}
              className={`h-1 flex-1 rounded-full ${
                i < eventIdx ? 'bg-emerald-400' : i === eventIdx ? 'bg-cyan-400' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
        <p className="text-center text-[10px] text-muted-foreground mb-2 font-mono">
          {isAr ? 'محطة' : 'Etappe'} {eventIdx + 1} / {EVENTS.length} · {current.emoji} {isAr ? current.ar : current.de}
        </p>

        {/* Render the right minigame */}
        <div className="mt-4">
          {current.id === 'reaction' && <ReactionEvent isAr={isAr} onDone={r => onEventComplete('reaction', r)} />}
          {current.id === 'stroop'   && <StroopEvent  isAr={isAr} onDone={r => onEventComplete('stroop', r)} />}
          {current.id === 'memory'   && <MemoryEvent  isAr={isAr} onDone={r => onEventComplete('memory', r)} />}
          {current.id === 'nback'    && <NBackEvent   isAr={isAr} onDone={r => onEventComplete('nback', r)} />}
          {current.id === 'aim'      && <AimEvent     isAr={isAr} onDone={r => onEventComplete('aim', r)} />}
        </div>
      </GameShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Result page
  // ---------------------------------------------------------------------------
  return (
    <GameShell
      title={isAr ? 'العشاري الذهني' : 'Mental-Decathlon'}
      icon={Award}
      accentColor="hsl(142, 71%, 45%)"
      rules={[]}
      stats={[]}
      options={[]}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-cyan-500/30 p-5 text-center mb-4"
      >
        <Trophy className="w-10 h-10 text-amber-300 mx-auto mb-2" />
        <p className="text-[10px] uppercase tracking-wider text-cyan-200/80 font-bold">
          {isAr ? 'مؤشرك المعرفي' : 'Cognitive Index'}
        </p>
        <p className="text-6xl font-black text-cyan-200 my-1 tabular-nums">{finalIndex}</p>
        <p className="text-sm font-bold text-cyan-300">
          {finalIndex !== null && indexBand(finalIndex, isAr)}
        </p>
        {save.best && finalIndex !== null && finalIndex > (save.best.index - 1) && (
          <p className="text-[11px] text-amber-300 mt-1 font-bold">
            ★ {isAr ? 'رقم قياسي شخصي!' : 'Persönlicher Rekord!'}
          </p>
        )}
      </motion.div>

      {/* Per-event breakdown */}
      <div className="space-y-2 mb-4">
        {results.map((r, i) => {
          const def = EVENTS.find(e => e.id === r.id)!;
          const bar = Math.max(0, Math.min(100, ((r.scaled - 50) / 100) * 100));
          const barColor = r.scaled >= 115 ? '#10b981' : r.scaled >= 90 ? '#06b6d4' : '#f59e0b';
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-border/30 bg-card p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <span>{def.emoji}</span>
                  {isAr ? def.ar : def.de}
                </span>
                <span className="text-base font-black tabular-nums" style={{ color: barColor }}>
                  {r.scaled}
                </span>
              </div>
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: barColor }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${bar}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08 + 0.2 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setPhase('briefing')}
          className="flex-1 py-3 rounded-xl bg-white/5 text-foreground font-bold text-sm"
        >
          {isAr ? 'العودة' : 'Zurück'}
        </button>
        <button
          onClick={startDecathlon}
          className="flex-1 py-3 rounded-xl font-black text-cyan-950 text-sm flex items-center justify-center gap-1.5"
          style={{ }}
        >
          <RotateCcw className="w-4 h-4" />
          {isAr ? 'كرّر' : 'Wiederholen'}
        </button>
      </div>
    </GameShell>
  );
}

// =============================================================================
// Inline event implementations. Each is a *minimal* version of the standard
// Focus minigame with a single goal: produce a deterministic raw score.
// =============================================================================

// ---------- Reaction (5 trials, average ms) ----------
function ReactionEvent({ isAr, onDone }: { isAr: boolean; onDone: (raw: number) => void }) {
  type S = 'idle' | 'wait' | 'go' | 'early' | 'result' | 'done';
  const [s, setS] = useState<S>('idle');
  const [trial, setTrial] = useState(0);
  const [last, setLast] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const start = useRef(0);
  const t = useRef<ReturnType<typeof setTimeout>>();
  const TRIALS = 5;

  const next = () => {
    setS('wait');
    const wait = 1200 + Math.random() * 2000;
    t.current = setTimeout(() => {
      start.current = Date.now();
      setS('go');
      playSfx('hint');
    }, wait);
  };

  const tap = () => {
    if (s === 'idle') return next();
    if (s === 'wait') {
      clearTimeout(t.current); setS('early'); playSfx('wrong'); vibrate(60);
      return;
    }
    if (s === 'go') {
      const ms = Date.now() - start.current;
      setLast(ms);
      const all = [...times, ms];
      setTimes(all);
      setTrial(n => n + 1);
      playSfx('tap'); vibrate(15);
      if (trial + 1 >= TRIALS) {
        setS('done');
        const avg = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
        setTimeout(() => onDone(avg), 600);
        return;
      }
      setS('result');
    }
    if (s === 'early' || s === 'result') next();
  };

  return (
    <button
      onClick={tap}
      className="w-full rounded-3xl flex flex-col items-center justify-center text-center border-2 transition-colors"
      style={{
        height: '40vh',
        background: s === 'wait' ? 'rgba(239,68,68,0.10)' : s === 'go' ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.03)',
        borderColor: s === 'wait' ? 'rgba(239,68,68,0.3)' : s === 'go' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)',
      }}
    >
      {s === 'idle' && <p className="text-xl font-black">{isAr ? 'اضغط للبدء' : 'Tippe zum Start'}</p>}
      {s === 'wait' && <p className="text-xl font-black text-rose-400">{isAr ? 'انتظر...' : 'Warten...'}</p>}
      {s === 'go'   && <p className="text-3xl font-black text-emerald-300">{isAr ? 'الآن!' : 'JETZT!'}</p>}
      {s === 'early'&& <p className="text-xl font-bold text-amber-400">{isAr ? 'مبكر!' : 'Zu früh!'}</p>}
      {s === 'result' && (
        <>
          <p className="text-3xl font-black text-cyan-300">{last}ms</p>
          <p className="text-xs text-zinc-500 mt-2">{trial}/{TRIALS}</p>
        </>
      )}
      {s === 'done' && <p className="text-xl font-black text-cyan-300">✓</p>}
    </button>
  );
}

// ---------- Stroop (8 trials, percentage + speed combo) ----------
function StroopEvent({ isAr, onDone }: { isAr: boolean; onDone: (raw: number) => void }) {
  const TRIALS = 8;
  const COLORS = [
    { id: 'red', hex: '#ef4444', ar: 'أحمر', de: 'Rot' },
    { id: 'blue', hex: '#3b82f6', ar: 'أزرق', de: 'Blau' },
    { id: 'green', hex: '#10b981', ar: 'أخضر', de: 'Grün' },
    { id: 'yellow', hex: '#facc15', ar: 'أصفر', de: 'Gelb' },
  ];
  const [trial, setTrial] = useState(0);
  const [wordId, setWordId] = useState(COLORS[0].id);
  const [hex, setHex] = useState('#fff');
  const [start, setStart] = useState(0);
  const [results, setResults] = useState<{ ok: boolean; ms: number }[]>([]);

  const advance = () => {
    const target = COLORS[Math.floor(Math.random() * COLORS.length)];
    const trap = Math.random() < 0.7;
    const display = trap ? COLORS[(COLORS.indexOf(target) + 1 + Math.floor(Math.random() * 3)) % COLORS.length] : target;
    setWordId(target.id);
    setHex(display.hex);
    setStart(Date.now());
  };

  useEffect(() => { advance(); }, []);

  const tap = (id: string) => {
    const ms = Date.now() - start;
    const ok = id === wordId;
    const next = [...results, { ok, ms }];
    setResults(next);
    setTrial(n => n + 1);
    playSfx(ok ? 'match' : 'wrong'); vibrate(ok ? 15 : 60);
    if (trial + 1 >= TRIALS) {
      const correctPct = (next.filter(r => r.ok).length / next.length) * 100;
      const avgMs = next.reduce((s, r) => s + r.ms, 0) / next.length;
      // Score formula: weight accuracy heavily, deduct slow times
      const raw = Math.max(0, correctPct - avgMs / 30);
      setTimeout(() => onDone(raw), 400);
    } else {
      setTimeout(advance, 250);
    }
  };

  const word = COLORS.find(c => c.id === wordId)!;
  return (
    <div className="flex flex-col items-center gap-5 pt-4">
      <p className="text-[10px] text-zinc-500">{trial}/{TRIALS}</p>
      <motion.p
        key={trial} initial={{ scale: 0.85 }} animate={{ scale: 1 }}
        className="text-4xl font-black tracking-wider"
        style={{ color: hex }}
      >
        {(isAr ? word.ar : word.de).toUpperCase()}
      </motion.p>
      <div className="grid grid-cols-2 gap-2 max-w-[280px]">
        {COLORS.map(c => (
          <button
            key={c.id}
            onClick={() => tap(c.id)}
            className="px-3 py-3 rounded-xl border-2 border-white/15 font-bold text-sm bg-white/4"
            style={{ color: c.hex }}
          >
            {isAr ? c.ar : c.de}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Memory (longest sequence) ----------
function MemoryEvent({ isAr, onDone }: { isAr: boolean; onDone: (raw: number) => void }) {
  type S = 'showing' | 'input' | 'fail';
  const [seq, setSeq] = useState<number[]>([]);
  const [input, setInput] = useState<number[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [s, setS] = useState<S>('showing');
  const [level, setLevel] = useState(3);

  // Initialize the first sequence on mount
  useEffect(() => {
    const init = Array.from({ length: 3 }, () => Math.floor(Math.random() * 4));
    setSeq(init); setS('showing');
  }, []);

  // Play the showing animation
  useEffect(() => {
    if (s !== 'showing' || seq.length === 0) return;
    let i = 0;
    const showNext = () => {
      if (i >= seq.length) { setActive(null); setTimeout(() => setS('input'), 250); return; }
      setActive(seq[i]); playSfx('tap');
      setTimeout(() => { setActive(null); setTimeout(() => { i++; showNext(); }, 200); }, 420);
    };
    setTimeout(showNext, 400);
  }, [s, seq]);

  const press = (i: number) => {
    if (s !== 'input') return;
    setActive(i); setTimeout(() => setActive(null), 180);
    const next = [...input, i];
    setInput(next);
    if (seq[next.length - 1] !== i) {
      setS('fail'); playSfx('wrong'); vibrate(80);
      setTimeout(() => onDone(level - 1), 600);
      return;
    }
    if (next.length === seq.length) {
      // Level up
      setTimeout(() => {
        const nextSeq = [...seq, Math.floor(Math.random() * 4)];
        setSeq(nextSeq); setInput([]); setLevel(l => l + 1); setS('showing');
        playSfx('streak');
      }, 350);
    }
  };

  const colors = ['#ef4444', '#3b82f6', '#10b981', '#facc15'];
  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      <p className="text-[10px] text-zinc-500">
        {isAr ? 'المستوى' : 'Level'} {level} · {s === 'showing' ? (isAr ? 'انتبه...' : 'Achten...') : s === 'input' ? (isAr ? 'كرّر' : 'Wiederhole') : ''}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {colors.map((c, i) => (
          <button
            key={i} onClick={() => press(i)} disabled={s !== 'input'}
            className="w-24 h-24 rounded-2xl border-2 border-white/15 transition-all"
            style={{
              background: c,
              opacity: active === i ? 1 : (s === 'showing' ? 0.6 : 0.85),
              transform: active === i ? 'scale(1.1)' : 'scale(1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- N-back (15 trials, accuracy %) ----------
function NBackEvent({ isAr, onDone }: { isAr: boolean; onDone: (raw: number) => void }) {
  const N = 2;
  const TRIALS = 15;
  const [trial, setTrial] = useState(0);
  const [pos, setPos] = useState<number | null>(null);
  const hits = useRef(0);
  const fa = useRef(0);
  const miss = useRef(0);
  const responded = useRef(false);
  const expected = useRef(false);
  const tref = useRef<ReturnType<typeof setTimeout>>();
  const [done, setDone] = useState(false);

  const run = (t: number, h: number[]) => {
    if (t >= TRIALS) {
      const correct = TRIALS - miss.current - fa.current;
      const acc = Math.round((correct / TRIALS) * 100);
      setDone(true);
      setTimeout(() => onDone(acc), 500);
      return;
    }
    let p: number;
    if (h.length >= N && Math.random() < 0.33) p = h[h.length - N];
    else p = Math.floor(Math.random() * 9);
    expected.current = h.length >= N && p === h[h.length - N];
    responded.current = false;
    setPos(p); setTrial(t + 1);
    playSfx('tick');
    const newH = [...h, p];
    tref.current = setTimeout(() => {
      if (!responded.current && expected.current) miss.current += 1;
      setPos(null);
      setTimeout(() => run(t + 1, newH), 280);
    }, 1900);
  };

  useEffect(() => { setTimeout(() => run(0, []), 400); return () => clearTimeout(tref.current); /* eslint-disable-next-line */ }, []);

  const onMatch = () => {
    if (responded.current || done) return;
    responded.current = true;
    if (expected.current) { hits.current += 1; playSfx('match'); vibrate(15); }
    else { fa.current += 1; playSfx('wrong'); vibrate(50); }
  };

  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <p className="text-[10px] text-zinc-500 font-mono">{trial}/{TRIALS} · 2-back</p>
      <div className="grid grid-cols-3 gap-1.5 mt-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border-2 transition-all"
            style={{
              width: 64, height: 64,
              background: pos === i ? '#06b6d4' : 'rgba(255,255,255,0.04)',
              borderColor: pos === i ? '#22d3ee' : 'rgba(255,255,255,0.06)',
            }}
          />
        ))}
      </div>
      <button
        onClick={onMatch} disabled={done}
        className="mt-3 w-full max-w-[240px] py-3 rounded-2xl font-black text-cyan-950 disabled:opacity-50"
        style={{ }}
      >
        {isAr ? 'تطابق' : 'MATCH'}
      </button>
    </div>
  );
}

// ---------- Aim (20s, score) ----------
function AimEvent({ isAr, onDone }: { isAr: boolean; onDone: (raw: number) => void }) {
  const DURATION = 20;
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [missTaps, setMissTaps] = useState(0);
  const [time, setTime] = useState(DURATION);
  const [target, setTarget] = useState<{ x: number; y: number; r: number; born: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const scoreRef = useRef(0);
  const finished = useRef(false);

  useEffect(() => { scoreRef.current = score; }, [score]);

  // Spawn first target
  useEffect(() => {
    spawn();
    const id = setInterval(() => {
      setTime(t => {
        if (t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, []);

  // End when timer hits 0
  useEffect(() => {
    if (time === 0 && !finished.current) {
      finished.current = true;
      setTarget(null);
      setTimeout(() => onDone(scoreRef.current), 400);
    }
  }, [time, onDone]);

  const spawn = () => {
    const c = ref.current; if (!c) return;
    const w = c.clientWidth, h = c.clientHeight;
    const r = 22;
    const x = r + Math.random() * (w - 2 * r);
    const y = r + Math.random() * (h - 2 * r);
    setTarget({ x, y, r, born: Date.now() });
  };

  const click = (e: React.MouseEvent | React.TouchEvent) => {
    if (!target || finished.current) return;
    const c = ref.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    let cx: number, cy: number;
    if ('touches' in e && e.touches[0]) { cx = e.touches[0].clientX - rect.left; cy = e.touches[0].clientY - rect.top; }
    else if ('changedTouches' in e && e.changedTouches[0]) { cx = e.changedTouches[0].clientX - rect.left; cy = e.changedTouches[0].clientY - rect.top; }
    else { cx = (e as React.MouseEvent).clientX - rect.left; cy = (e as React.MouseEvent).clientY - rect.top; }
    const dx = cx - target.x, dy = cy - target.y;
    if (Math.sqrt(dx * dx + dy * dy) <= target.r + 6) {
      const dt = Date.now() - target.born;
      const speedBonus = Math.max(0, Math.round((1500 - dt) / 30));
      setScore(s => s + 100 + speedBonus);
      setHits(h => h + 1);
      playSfx('match'); vibrate(15);
      spawn();
    } else {
      setMissTaps(m => m + 1);
      setScore(s => Math.max(0, s - 25));
      playSfx('wrong'); vibrate(40);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      <div className="w-full flex justify-between text-xs px-2">
        <span className="text-cyan-300 font-bold tabular-nums">{score}</span>
        <span className={`font-black tabular-nums ${time <= 5 ? 'text-rose-400' : 'text-zinc-400'}`}>{time}s</span>
        <span className="text-zinc-500">{hits} ✓</span>
      </div>
      <div
        ref={ref}
        onMouseDown={click} onTouchStart={click}
        className="relative w-full max-w-[400px] rounded-3xl border-2 border-cyan-500/15 overflow-hidden"
        style={{ height: '50vh', }}
      >
        <AnimatePresence>
          {target && (
            <motion.div
              key={target.born}
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: target.x - target.r, top: target.y - target.r,
                width: target.r * 2, height: target.r * 2,
                
                
              }}
            >
              <div className="absolute inset-1/3 rounded-full bg-rose-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
