import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, RotateCcw, Timer, Crosshair, Zap } from 'lucide-react';

interface TargetItem { id: number; x: number; y: number; size: number; type: 'normal' | 'bonus' | 'fast' }

export default function TargetGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [missed, setMissed] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextId = useRef(0);
  const rippleId = useRef(0);

  const spawnTarget = useCallback(() => {
    const rand = Math.random();
    const type: TargetItem['type'] = rand > 0.85 ? 'bonus' : rand > 0.7 ? 'fast' : 'normal';
    const size = type === 'bonus' ? 50 : type === 'fast' ? 30 : 40;
    const x = 8 + Math.random() * 75;
    const y = 8 + Math.random() * 75;
    const t: TargetItem = { id: nextId.current++, x, y, size, type };
    setTargets(prev => [...prev, t]);
    const lifetime = type === 'fast' ? 800 : type === 'bonus' ? 2000 : 1500 - Math.min(score * 15, 700);
    setTimeout(() => {
      setTargets(prev => {
        if (prev.find(p => p.id === t.id)) {
          setMissed(m => m + 1);
          setCombo(0);
          return prev.filter(p => p.id !== t.id);
        }
        return prev;
      });
    }, lifetime);
  }, [score]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setGameState('ended');
          clearInterval(interval);
          const stats = JSON.parse(localStorage.getItem('target-stats') || '{}');
          stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
          stats.bestScore = Math.max(stats.bestScore || 0, score);
          localStorage.setItem('target-stats', JSON.stringify(stats));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, score]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const rate = Math.max(350, 900 - score * 20);
    const interval = setInterval(spawnTarget, rate);
    return () => clearInterval(interval);
  }, [gameState, spawnTarget, score]);

  const hitTarget = (t: TargetItem, e: React.MouseEvent | React.TouchEvent) => {
    setTargets(prev => prev.filter(p => p.id !== t.id));
    const points = t.type === 'bonus' ? 3 : t.type === 'fast' ? 5 : 1;
    const newCombo = combo + 1;
    setCombo(newCombo);
    const comboMultiplier = newCombo >= 5 ? 2 : 1;
    setScore(s => s + points * comboMultiplier);

    // Ripple effect
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setRipples(prev => [...prev, { id: rippleId.current++, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }]);
    setTimeout(() => setRipples(prev => prev.slice(1)), 500);
  };

  const start = () => {
    setScore(0); setMissed(0); setCombo(0); setTimeLeft(30); setTargets([]); setGameState('playing');
  };

  const bestScore = JSON.parse(localStorage.getItem('target-stats') || '{}').bestScore || 0;
  const urgency = timeLeft <= 10;

  return (
    <div className="min-h-screen pb-28 pt-4" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 40%, #0f0f1a 100%)' }}>
      <div className="px-5">
        <BackButton to="/games" />

        {gameState === 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-20">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 rounded-full border-4 border-red-500/30 flex items-center justify-center mx-auto mb-6"
              style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)' }}
            >
              <Crosshair className="w-12 h-12 text-red-500" />
            </motion.div>
            <h1 className="text-3xl font-black text-white mb-2">{isAr ? 'التصويب' : 'Zielschießen'}</h1>
            <p className="text-red-400/60 text-sm mb-2">{isAr ? 'صوّب واضغط قبل أن تختفي!' : 'Triff bevor sie verschwinden!'}</p>
            <div className="flex gap-4 justify-center text-[10px] text-zinc-500 mb-6">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> {isAr ? 'عادي ×1' : 'Normal ×1'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> {isAr ? 'ذهبي ×3' : 'Gold ×3'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> {isAr ? 'سريع ×5' : 'Schnell ×5'}</span>
            </div>
            {bestScore > 0 && <p className="text-zinc-600 text-xs mb-4">{isAr ? `الرقم القياسي: ${bestScore}` : `Rekord: ${bestScore}`}</p>}
            <motion.button whileTap={{ scale: 0.9 }} onClick={start} className="px-10 py-4 rounded-2xl font-black text-lg text-white bg-red-600 hover:bg-red-500">
              {isAr ? '🎯 ابدأ المهمة' : '🎯 Mission starten'}
            </motion.button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <>
            <div className="flex justify-between items-center mb-3 mt-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-red-400" />
                <span className="text-white font-bold text-lg">{score}</span>
                {combo >= 3 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-amber-400 text-xs font-bold">
                    ×{combo >= 5 ? '2' : combo} COMBO
                  </motion.span>
                )}
              </div>
              <div className={`flex items-center gap-2 font-mono font-bold text-lg ${urgency ? 'text-red-400 animate-pulse' : 'text-zinc-400'}`}>
                <Timer className="w-4 h-4" /> {timeLeft}
              </div>
            </div>

            <div
              className="relative w-full rounded-2xl overflow-hidden border"
              style={{
                height: '62vh',
                background: 'radial-gradient(circle at 50% 50%, rgba(30,30,50,1) 0%, rgba(10,10,20,1) 100%)',
                borderColor: urgency ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)',
              }}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }} />

              {/* Scope lines */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-px bg-red-500/10" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-full w-px bg-red-500/10" />
              </div>

              <AnimatePresence>
                {targets.map(t => {
                  const color = t.type === 'bonus' ? 'bg-amber-400' : t.type === 'fast' ? 'bg-cyan-400' : 'bg-red-500';
                  const glow = t.type === 'bonus' ? 'shadow-amber-400/50' : t.type === 'fast' ? 'shadow-cyan-400/50' : 'shadow-red-500/40';
                  return (
                    <motion.button
                      key={t.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                      exit={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={(e) => hitTarget(t, e)}
                      className={`absolute rounded-full ${color} shadow-lg ${glow} active:scale-75 transition-transform`}
                      style={{
                        width: t.size, height: t.size,
                        left: `${t.x}%`, top: `${t.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div className="absolute inset-1 rounded-full border border-white/30" />
                      <div className="absolute inset-[35%] rounded-full bg-white/40" />
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}

        {gameState === 'ended' && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-12">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="text-6xl mb-4"
            >
              {score > bestScore && score > 0 ? '🏆' : '🎯'}
            </motion.div>
            <h2 className="text-5xl font-black text-white mb-2">{score}</h2>
            <p className="text-zinc-500 mb-1">{isAr ? `إصابات • فاتك ${missed}` : `Treffer • ${missed} verpasst`}</p>
            <p className="text-zinc-600 text-sm mb-6">
              {isAr ? `الدقة: ${score + missed > 0 ? Math.round(score / (score + missed) * 100) : 0}%` : `Genauigkeit: ${score + missed > 0 ? Math.round(score / (score + missed) * 100) : 0}%`}
            </p>
            {score > bestScore && score > 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-amber-400 font-bold mb-4">
                ⭐ {isAr ? 'رقم قياسي جديد!' : 'Neuer Rekord!'}
              </motion.p>
            )}
            <motion.button whileTap={{ scale: 0.9 }} onClick={start} className="flex items-center gap-2 px-10 py-4 rounded-2xl bg-red-600 text-white font-black mx-auto">
              <RotateCcw className="w-5 h-5" /> {isAr ? 'مرة أخرى' : 'Nochmal'}
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
