import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, RotateCcw, Zap, Eye } from 'lucide-react';

type GameState = 'idle' | 'waiting' | 'ready' | 'result' | 'tooEarly';

export default function FocusGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [state, setState] = useState<GameState>('idle');
  const [reactionTime, setReactionTime] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const startTime = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const maxRounds = 5;

  const startRound = useCallback(() => {
    setState('waiting');
    const delay = 1500 + Math.random() * 3500;
    timeoutRef.current = setTimeout(() => {
      startTime.current = Date.now();
      setState('ready');
    }, delay);
  }, []);

  const handleTap = useCallback(() => {
    if (state === 'waiting') {
      clearTimeout(timeoutRef.current);
      setState('tooEarly');
      return;
    }
    if (state === 'ready') {
      const rt = Date.now() - startTime.current;
      setReactionTime(rt);
      setResults(prev => [...prev, rt]);
      setRound(r => r + 1);
      setState('result');

      if (round + 1 >= maxRounds) {
        const allResults = [...results, rt];
        const avg = Math.round(allResults.reduce((a, b) => a + b, 0) / allResults.length);
        const stats = JSON.parse(localStorage.getItem('focus-stats') || '{}');
        stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
        stats.bestAvg = Math.min(stats.bestAvg || 9999, avg);
        localStorage.setItem('focus-stats', JSON.stringify(stats));
      }
    }
    if (state === 'idle') startRound();
  }, [state, round, results, startRound]);

  const nextRound = () => { if (round < maxRounds) startRound(); };

  const reset = () => {
    setState('idle'); setResults([]); setRound(0); setReactionTime(0);
    clearTimeout(timeoutRef.current);
  };

  const avg = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
  const bestAvg = JSON.parse(localStorage.getItem('focus-stats') || '{}').bestAvg || 0;

  const getGradient = () => {
    if (state === 'waiting') return 'linear-gradient(180deg, #1a0000 0%, #3d0000 50%, #1a0000 100%)';
    if (state === 'ready') return 'linear-gradient(180deg, #001a00 0%, #003d00 50%, #001a00 100%)';
    if (state === 'tooEarly') return 'linear-gradient(180deg, #1a1500 0%, #3d2e00 50%, #1a1500 100%)';
    return 'linear-gradient(180deg, #000a1a 0%, #001a3d 50%, #000a1a 100%)';
  };

  const getRating = (ms: number) => {
    if (ms < 180) return { text: isAr ? '⚡ خارق!' : '⚡ Unmenschlich!', color: '#00ff88' };
    if (ms < 250) return { text: isAr ? '🔥 مذهل!' : '🔥 Unglaublich!', color: '#00fff5' };
    if (ms < 350) return { text: isAr ? '✨ سريع!' : '✨ Schnell!', color: '#fbbf24' };
    if (ms < 500) return { text: isAr ? '👍 جيد' : '👍 Gut', color: '#94a3b8' };
    return { text: isAr ? '🐢 حاول أسرع' : '🐢 Schneller!', color: '#ef4444' };
  };

  const getBarWidth = (ms: number) => Math.max(5, Math.min(100, 100 - (ms / 8)));

  return (
    <div className="min-h-screen pb-28 pt-4 transition-all duration-500" style={{ background: getGradient() }}>
      <div className="px-5">
        <BackButton to="/games" />

        {/* Title */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Eye className="w-5 h-5 text-cyan-400" />
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400">
              {isAr ? 'التركيز' : 'Fokus'}
            </h1>
          </div>
          {round > 0 && (
            <div className="flex justify-center gap-1.5 mt-2">
              {Array.from({ length: maxRounds }).map((_, i) => (
                <div key={i} className={`w-8 h-1 rounded-full ${i < round ? 'bg-cyan-400' : 'bg-white/10'}`} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Main Area */}
        <button
          onClick={handleTap}
          className="w-full rounded-3xl flex flex-col items-center justify-center transition-all duration-500 active:scale-[0.98] border overflow-hidden relative"
          style={{
            height: '50vh',
            borderColor: state === 'ready' ? 'rgba(0,255,136,0.3)' : state === 'waiting' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
            background: state === 'ready'
              ? 'radial-gradient(circle at 50% 50%, rgba(0,255,136,0.15) 0%, transparent 70%)'
              : state === 'waiting'
                ? 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.1) 0%, transparent 70%)'
                : 'rgba(255,255,255,0.02)',
          }}
        >
          {/* Scan lines effect */}
          <div className="absolute inset-0 pointer-events-none opacity-10" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
          }} />

          {state === 'idle' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                <Zap className="w-16 h-16 text-cyan-400/50 mx-auto mb-4" />
              </motion.div>
              <p className="text-cyan-400/60 text-lg font-bold">{isAr ? 'اضغط للبدء' : 'Tippen zum Starten'}</p>
              <p className="text-cyan-700/40 text-xs mt-2">{isAr ? 'اختبر سرعة ردة فعلك' : 'Teste deine Reaktionszeit'}</p>
            </motion.div>
          )}

          {state === 'waiting' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
              <p className="text-red-400 text-2xl font-black">{isAr ? '... انتظر' : '... Warten'}</p>
            </motion.div>
          )}

          {state === 'ready' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.15 }}>
              <p className="text-green-400 text-4xl font-black">{isAr ? 'الآن!' : 'JETZT!'}</p>
            </motion.div>
          )}

          {state === 'tooEarly' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-amber-400 text-2xl font-black mb-2">⚡</p>
              <p className="text-amber-400 text-lg font-bold">{isAr ? 'مبكر جداً!' : 'Zu früh!'}</p>
            </motion.div>
          )}
        </button>

        {/* Results */}
        <AnimatePresence mode="wait">
          {state === 'result' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
              <div className="text-center mb-4">
                <motion.p initial={{ scale: 2 }} animate={{ scale: 1 }} className="text-5xl font-black text-white mb-1">
                  {reactionTime}<span className="text-lg text-zinc-500">ms</span>
                </motion.p>
                <p className="font-bold" style={{ color: getRating(reactionTime).color }}>{getRating(reactionTime).text}</p>
              </div>

              {/* History bars */}
              <div className="space-y-2 mb-6">
                {results.map((rt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600 w-4">{i + 1}</span>
                    <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${getBarWidth(rt)}%` }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${getRating(rt).color}, transparent)` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 w-12 text-end">{rt}ms</span>
                  </div>
                ))}
              </div>

              {round < maxRounds ? (
                <motion.button whileTap={{ scale: 0.9 }} onClick={nextRound} className="w-full py-3 rounded-2xl border border-cyan-500/30 text-cyan-400 font-bold active:bg-cyan-500/10">
                  {isAr ? 'الجولة التالية' : 'Nächste Runde'}
                </motion.button>
              ) : (
                <div className="text-center">
                  <p className="text-lg text-white font-black mb-1">{isAr ? `المتوسط: ${avg}ms` : `Durchschnitt: ${avg}ms`}</p>
                  {bestAvg > 0 && bestAvg < avg && <p className="text-xs text-zinc-600 mb-1">{isAr ? `أفضل: ${bestAvg}ms` : `Bester: ${bestAvg}ms`}</p>}
                  {(bestAvg === 0 || avg <= bestAvg) && <p className="text-cyan-400 text-sm font-bold mb-3">⭐ {isAr ? 'رقم قياسي!' : 'Neuer Rekord!'}</p>}
                  <motion.button whileTap={{ scale: 0.9 }} onClick={reset}
                    className="flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-black mx-auto"
                    style={{ background: 'linear-gradient(135deg, #00fff5, #8b5cf6)' }}
                  >
                    <RotateCcw className="w-5 h-5" /> {isAr ? 'مرة أخرى' : 'Nochmal'}
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {state === 'tooEarly' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-6">
              <motion.button whileTap={{ scale: 0.9 }} onClick={startRound} className="px-8 py-3 rounded-2xl border border-amber-500/30 text-amber-400 font-bold">
                {isAr ? 'حاول مجدداً' : 'Nochmal'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
