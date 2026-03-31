import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, RotateCcw, Zap, Eye } from 'lucide-react';

type State = 'idle' | 'waiting' | 'ready' | 'result' | 'tooEarly';

export default function FocusGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [state, setState] = useState<State>('idle');
  const [reactionTime, setReactionTime] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState('5');
  const startTime = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const maxRounds = parseInt(totalRounds);

  const savedStats = JSON.parse(localStorage.getItem('focus-stats') || '{}');

  const startRound = useCallback(() => {
    setState('waiting');
    timeoutRef.current = setTimeout(() => { startTime.current = Date.now(); setState('ready'); }, 1500 + Math.random() * 3500);
  }, []);

  const handleTap = useCallback(() => {
    if (state === 'waiting') { clearTimeout(timeoutRef.current); setState('tooEarly'); return; }
    if (state === 'ready') {
      const rt = Date.now() - startTime.current;
      setReactionTime(rt); setResults(prev => [...prev, rt]); setRound(r => r + 1); setState('result');
      if (round + 1 >= maxRounds) {
        const all = [...results, rt];
        const avg = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
        const stats = { ...savedStats, gamesPlayed: (savedStats.gamesPlayed || 0) + 1, bestAvg: Math.min(savedStats.bestAvg || 9999, avg) };
        localStorage.setItem('focus-stats', JSON.stringify(stats));
      }
    }
    if (state === 'idle') startRound();
  }, [state, round, results, startRound, maxRounds, savedStats]);

  const reset = () => { setState('idle'); setResults([]); setRound(0); setReactionTime(0); clearTimeout(timeoutRef.current); };
  const avg = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;

  const getRating = (ms: number) => {
    if (ms < 180) return { text: isAr ? '⚡ خارق!' : '⚡ Unmenschlich!', color: '#00ff88' };
    if (ms < 250) return { text: isAr ? '🔥 مذهل!' : '🔥 Unglaublich!', color: '#00fff5' };
    if (ms < 350) return { text: isAr ? '✨ سريع!' : '✨ Schnell!', color: '#fbbf24' };
    if (ms < 500) return { text: isAr ? '👍 جيد' : '👍 Gut', color: '#94a3b8' };
    return { text: isAr ? '🐢 حاول أسرع' : '🐢 Schneller!', color: '#ef4444' };
  };

  const rules = isAr
    ? ['انتظر حتى يتحول اللون للأخضر', 'اضغط فوراً عند ظهور "الآن!"', 'لا تضغط مبكراً (أثناء اللون الأحمر)', 'أفضل متوسط ردة فعل يُحفظ تلقائياً']
    : ['Warte bis die Farbe grün wird', 'Tippe sofort wenn "JETZT!" erscheint', 'Nicht zu früh tippen (bei Rot)', 'Der beste Durchschnitt wird gespeichert'];

  const stats = [
    { label: isAr ? 'مباريات' : 'Spiele', value: savedStats.gamesPlayed || 0 },
    { label: isAr ? 'أفضل متوسط' : 'Bester Ø', value: savedStats.bestAvg ? `${savedStats.bestAvg}ms` : '-' },
  ];

  const options = [{
    key: 'rounds', label: isAr ? 'عدد الجولات' : 'Runden',
    choices: [{ value: '3', label: '3' }, { value: '5', label: '5' }, { value: '10', label: '10' }],
    current: totalRounds, onChange: (v: string) => { setTotalRounds(v); reset(); },
  }];

  const getAreaStyle = () => {
    if (state === 'waiting') return { bg: 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)', border: 'rgba(239,68,68,0.15)' };
    if (state === 'ready') return { bg: 'radial-gradient(circle, rgba(0,255,136,0.15) 0%, transparent 70%)', border: 'rgba(0,255,136,0.25)' };
    if (state === 'tooEarly') return { bg: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)', border: 'rgba(245,158,11,0.15)' };
    return { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.05)' };
  };

  const areaStyle = getAreaStyle();

  return (
    <GameShell title={isAr ? 'التركيز' : 'Fokus'} icon={Crosshair} accentColor="#06b6d4" rules={rules} stats={stats} options={options}
      headerRight={round > 0 ? (
        <div className="flex gap-1">
          {Array.from({ length: maxRounds }).map((_, i) => (
            <div key={i} className={`w-6 h-1 rounded-full ${i < round ? 'bg-cyan-400' : 'bg-white/8'}`} />
          ))}
        </div>
      ) : undefined}
    >
      {/* Main tap area */}
      <button onClick={handleTap}
        className="w-full rounded-2xl flex flex-col items-center justify-center transition-all duration-500 active:scale-[0.98] border overflow-hidden relative"
        style={{ height: '46vh', background: areaStyle.bg, borderColor: areaStyle.border }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }} />
        {state === 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity }}>
              <Zap className="w-14 h-14 text-cyan-400/40 mx-auto mb-3" />
            </motion.div>
            <p className="text-cyan-400/50 font-bold">{isAr ? 'اضغط للبدء' : 'Tippen zum Starten'}</p>
          </motion.div>
        )}
        {state === 'waiting' && <motion.p animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="text-red-400 text-xl font-black">{isAr ? '... انتظر' : '... Warten'}</motion.p>}
        {state === 'ready' && <motion.p initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.12 }} className="text-green-400 text-3xl font-black">{isAr ? 'الآن!' : 'JETZT!'}</motion.p>}
        {state === 'tooEarly' && <p className="text-amber-400 text-lg font-black">⚡ {isAr ? 'مبكر جداً!' : 'Zu früh!'}</p>}
      </button>

      {/* Results */}
      <AnimatePresence mode="wait">
        {state === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5">
            <div className="text-center mb-4">
              <motion.p initial={{ scale: 1.8 }} animate={{ scale: 1 }} className="text-4xl font-black text-white">{reactionTime}<span className="text-sm text-zinc-500">ms</span></motion.p>
              <p className="font-bold text-sm" style={{ color: getRating(reactionTime).color }}>{getRating(reactionTime).text}</p>
            </div>
            <div className="space-y-1.5 mb-5">
              {results.map((rt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-600 w-3">{i + 1}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(5, 100 - rt / 8)}%` }} className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${getRating(rt).color}, transparent)` }} />
                  </div>
                  <span className="text-[10px] text-zinc-500 w-12 text-end">{rt}ms</span>
                </div>
              ))}
            </div>
            {round < maxRounds ? (
              <button onClick={() => startRound()} className="w-full py-3 rounded-2xl border border-cyan-500/20 text-cyan-400 font-bold text-sm active:bg-cyan-500/5">
                {isAr ? 'الجولة التالية' : 'Nächste Runde'}
              </button>
            ) : (
              <div className="text-center">
                <p className="text-white font-black mb-1">{isAr ? `المتوسط: ${avg}ms` : `Ø ${avg}ms`}</p>
                {(savedStats.bestAvg === undefined || avg <= savedStats.bestAvg) && <p className="text-cyan-400 text-sm font-bold mb-3">⭐ {isAr ? 'رقم قياسي!' : 'Neuer Rekord!'}</p>}
                <motion.button whileTap={{ scale: 0.9 }} onClick={reset} className="flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-black mx-auto" style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)' }}>
                  <RotateCcw className="w-4 h-4" /> {isAr ? 'مرة أخرى' : 'Nochmal'}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
        {state === 'tooEarly' && (
          <motion.div key="early" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-5">
            <button onClick={startRound} className="px-8 py-3 rounded-2xl border border-amber-500/20 text-amber-400 font-bold text-sm">
              {isAr ? 'حاول مجدداً' : 'Nochmal'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}
