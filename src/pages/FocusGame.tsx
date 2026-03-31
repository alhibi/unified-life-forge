import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, RotateCcw, Zap } from 'lucide-react';

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
    const delay = 1500 + Math.random() * 3000;
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
    if (state === 'idle') {
      startRound();
    }
  }, [state, round, results, startRound]);

  const nextRound = () => {
    if (round >= maxRounds) {
      // Show final results
      return;
    }
    startRound();
  };

  const reset = () => {
    setState('idle');
    setResults([]);
    setRound(0);
    setReactionTime(0);
    clearTimeout(timeoutRef.current);
  };

  const avg = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
  const bestAvg = JSON.parse(localStorage.getItem('focus-stats') || '{}').bestAvg || 0;

  const getColor = () => {
    if (state === 'waiting') return 'bg-destructive';
    if (state === 'ready') return 'bg-green-500';
    if (state === 'tooEarly') return 'bg-amber-500';
    return 'bg-card';
  };

  const getMessage = () => {
    if (state === 'idle') return isAr ? 'اضغط للبدء' : 'Tippen zum Starten';
    if (state === 'waiting') return isAr ? '... انتظر اللون الأخضر' : '... Warte auf Grün';
    if (state === 'ready') return isAr ? '! اضغط الآن' : '! Jetzt tippen';
    if (state === 'tooEarly') return isAr ? '⚡ مبكر جداً!' : '⚡ Zu früh!';
    return '';
  };

  const getRating = (ms: number) => {
    if (ms < 200) return isAr ? '⚡ خارق!' : '⚡ Unglaublich!';
    if (ms < 300) return isAr ? '🔥 سريع جداً!' : '🔥 Sehr schnell!';
    if (ms < 400) return isAr ? '👍 جيد' : '👍 Gut';
    return isAr ? '🐢 حاول أسرع' : '🐢 Versuch schneller';
  };

  return (
    <div className="min-h-screen bg-background pb-28 pt-4">
      <div className="px-5">
        <BackButton to="/games" label={isAr ? 'الألعاب' : 'Spiele'} />
        <div className="flex items-center gap-3 mt-4 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{isAr ? 'التركيز' : 'Fokus'}</h1>
          {round > 0 && <span className="ms-auto text-sm text-muted-foreground">{round}/{maxRounds}</span>}
        </div>

        {/* Main tap area */}
        <button
          onClick={handleTap}
          className={`w-full rounded-2xl flex flex-col items-center justify-center transition-colors duration-200 active:scale-[0.98] ${getColor()}`}
          style={{ height: '45vh' }}
        >
          <p className="text-xl font-bold text-white">{getMessage()}</p>
        </button>

        {/* Result */}
        <AnimatePresence mode="wait">
          {state === 'result' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center mt-6"
            >
              <p className="text-4xl font-bold text-foreground mb-1">{reactionTime}<span className="text-lg text-muted-foreground">ms</span></p>
              <p className="text-sm text-muted-foreground mb-4">{getRating(reactionTime)}</p>

              {round < maxRounds ? (
                <button onClick={nextRound} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-95 transition-transform">
                  {isAr ? 'الجولة التالية' : 'Nächste Runde'}
                </button>
              ) : (
                <div>
                  <p className="text-lg font-bold text-primary mb-1">{isAr ? `المتوسط: ${avg}ms` : `Durchschnitt: ${avg}ms`}</p>
                  {bestAvg > 0 && <p className="text-xs text-muted-foreground mb-3">{isAr ? `أفضل متوسط: ${bestAvg}ms` : `Bester Durchschnitt: ${bestAvg}ms`}</p>}
                  <button onClick={reset} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold mx-auto active:scale-95">
                    <RotateCcw className="w-5 h-5" /> {isAr ? 'مرة أخرى' : 'Nochmal'}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {state === 'tooEarly' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-6">
              <button onClick={startRound} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-95">
                {isAr ? 'حاول مجدداً' : 'Nochmal'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
