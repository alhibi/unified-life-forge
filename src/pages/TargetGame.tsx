import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, RotateCcw, Timer, Crosshair } from 'lucide-react';

interface TargetItem { id: number; x: number; y: number; size: number; type: 'normal' | 'bonus' | 'fast' }

export default function TargetGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [duration, setDuration] = useState('30');
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [missed, setMissed] = useState(0);
  const nextId = useRef(0);

  const totalTime = parseInt(duration);
  const savedStats = JSON.parse(localStorage.getItem('target-stats') || '{}');

  const spawnTarget = useCallback(() => {
    const rand = Math.random();
    const type: TargetItem['type'] = rand > 0.85 ? 'bonus' : rand > 0.7 ? 'fast' : 'normal';
    const size = type === 'bonus' ? 48 : type === 'fast' ? 28 : 38;
    const t: TargetItem = { id: nextId.current++, x: 8 + Math.random() * 75, y: 8 + Math.random() * 75, size, type };
    setTargets(prev => [...prev, t]);
    const lifetime = type === 'fast' ? 700 : type === 'bonus' ? 2000 : 1400 - Math.min(score * 15, 700);
    setTimeout(() => {
      setTargets(prev => { if (prev.find(p => p.id === t.id)) { setMissed(m => m + 1); setCombo(0); return prev.filter(p => p.id !== t.id); } return prev; });
    }, lifetime);
  }, [score]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setGameState('ended'); clearInterval(interval);
          const stats = { ...savedStats, gamesPlayed: (savedStats.gamesPlayed || 0) + 1, bestScore: Math.max(savedStats.bestScore || 0, score) };
          localStorage.setItem('target-stats', JSON.stringify(stats)); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, score, savedStats]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const rate = Math.max(350, 900 - score * 20);
    const interval = setInterval(spawnTarget, rate);
    return () => clearInterval(interval);
  }, [gameState, spawnTarget, score]);

  const hitTarget = (t: TargetItem) => {
    setTargets(prev => prev.filter(p => p.id !== t.id));
    const points = t.type === 'bonus' ? 3 : t.type === 'fast' ? 5 : 1;
    const newCombo = combo + 1;
    setCombo(newCombo);
    setScore(s => s + points * (newCombo >= 5 ? 2 : 1));
  };

  const start = () => { setScore(0); setMissed(0); setCombo(0); setTimeLeft(totalTime); setTargets([]); setGameState('playing'); };
  const urgency = timeLeft <= 10;

  const rules = isAr
    ? ['اضغط على الأهداف قبل أن تختفي', '🔴 عادي = نقطة واحدة', '🟡 ذهبي = 3 نقاط', '🔵 سريع = 5 نقاط (يختفي بسرعة!)', 'الكومبو ×5+ يضاعف النقاط']
    : ['Triff Ziele bevor sie verschwinden', '🔴 Normal = 1 Punkt', '🟡 Gold = 3 Punkte', '🔵 Schnell = 5 Punkte (verschwindet schnell!)', 'Combo ×5+ verdoppelt Punkte'];

  const stats = [
    { label: isAr ? 'مباريات' : 'Spiele', value: savedStats.gamesPlayed || 0 },
    { label: isAr ? 'أفضل نتيجة' : 'Bestleistung', value: savedStats.bestScore || 0 },
  ];

  const options = [{
    key: 'duration', label: isAr ? 'مدة اللعب' : 'Spieldauer',
    choices: [{ value: '15', label: '15s' }, { value: '30', label: '30s' }, { value: '60', label: '60s' }],
    current: duration, onChange: (v: string) => setDuration(v),
  }];

  return (
    <GameShell title={isAr ? 'التصويب' : 'Zielschießen'} icon={Target} accentColor="#ef4444" rules={rules} stats={stats} options={options}>
      {gameState === 'idle' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-16">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 rounded-full border-2 border-red-500/20 flex items-center justify-center mx-auto mb-5"
            style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)' }}>
            <Crosshair className="w-10 h-10 text-red-500" />
          </motion.div>
          <p className="text-zinc-500 text-sm mb-5">{isAr ? 'صوّب واضغط!' : 'Zielen und tippen!'}</p>
          <motion.button whileTap={{ scale: 0.9 }} onClick={start} className="px-10 py-3.5 rounded-2xl font-black text-white bg-red-600">
            {isAr ? '🎯 ابدأ' : '🎯 Start'}
          </motion.button>
        </motion.div>
      )}

      {gameState === 'playing' && (
        <>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-red-400" />
              <span className="text-white font-bold">{score}</span>
              {combo >= 3 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-amber-400 text-[10px] font-bold">×{combo >= 5 ? '2' : combo}</motion.span>}
            </div>
            <div className={`flex items-center gap-1.5 font-mono font-bold ${urgency ? 'text-red-400 animate-pulse' : 'text-zinc-400'}`}>
              <Timer className="w-3.5 h-3.5" /> {timeLeft}
            </div>
          </div>
          <div className="relative w-full rounded-2xl overflow-hidden border"
            style={{ height: '58vh', background: 'radial-gradient(circle, rgba(20,20,30,1), rgba(8,8,15,1))', borderColor: urgency ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)' }}>
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <AnimatePresence>
              {targets.map(t => {
                const color = t.type === 'bonus' ? 'bg-amber-400 shadow-amber-400/40' : t.type === 'fast' ? 'bg-cyan-400 shadow-cyan-400/40' : 'bg-red-500 shadow-red-500/30';
                return (
                  <motion.button key={t.id} initial={{ scale: 0 }} animate={{ scale: [0, 1.15, 1] }} exit={{ scale: 2, opacity: 0 }} transition={{ duration: 0.12 }}
                    onClick={() => hitTarget(t)} className={`absolute rounded-full ${color} shadow-lg active:scale-75`}
                    style={{ width: t.size, height: t.size, left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%,-50%)' }}>
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-10">
          <p className="text-5xl font-black text-white mb-2">{score}</p>
          <p className="text-zinc-600 text-sm mb-1">{isAr ? `الدقة: ${score + missed > 0 ? Math.round(score / (score + missed) * 100) : 0}%` : `Genauigkeit: ${score + missed > 0 ? Math.round(score / (score + missed) * 100) : 0}%`}</p>
          {score > (savedStats.bestScore || 0) && score > 0 && <p className="text-amber-400 font-bold text-sm mb-4">⭐ {isAr ? 'رقم قياسي!' : 'Neuer Rekord!'}</p>}
          <motion.button whileTap={{ scale: 0.9 }} onClick={start} className="flex items-center gap-2 px-10 py-3.5 rounded-2xl bg-red-600 text-white font-black mx-auto">
            <RotateCcw className="w-4 h-4" /> {isAr ? 'مرة أخرى' : 'Nochmal'}
          </motion.button>
        </motion.div>
      )}
    </GameShell>
  );
}
