import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, RotateCcw, Timer } from 'lucide-react';

interface TargetItem {
  id: number;
  x: number;
  y: number;
  size: number;
}

export default function TargetGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [missed, setMissed] = useState(0);
  const nextId = useRef(0);
  const areaRef = useRef<HTMLDivElement>(null);

  const spawnTarget = useCallback(() => {
    const size = 36 + Math.random() * 24;
    const x = 10 + Math.random() * 70;
    const y = 10 + Math.random() * 70;
    const t: TargetItem = { id: nextId.current++, x, y, size };
    setTargets(prev => [...prev, t]);
    setTimeout(() => {
      setTargets(prev => {
        if (prev.find(p => p.id === t.id)) {
          setMissed(m => m + 1);
          return prev.filter(p => p.id !== t.id);
        }
        return prev;
      });
    }, 1500 - Math.min(score * 20, 800));
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
    const spawnRate = Math.max(400, 1000 - score * 30);
    const interval = setInterval(spawnTarget, spawnRate);
    return () => clearInterval(interval);
  }, [gameState, spawnTarget, score]);

  const hitTarget = (id: number) => {
    setTargets(prev => prev.filter(t => t.id !== id));
    setScore(s => s + 1);
  };

  const start = () => {
    setScore(0);
    setMissed(0);
    setTimeLeft(30);
    setTargets([]);
    setGameState('playing');
  };

  const bestScore = JSON.parse(localStorage.getItem('target-stats') || '{}').bestScore || 0;

  return (
    <div className="min-h-screen bg-background pb-28 pt-4">
      <div className="px-5">
        <BackButton to="/games" />
        <div className="flex items-center gap-3 mt-4 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{isAr ? 'التصويب' : 'Zielschießen'}</h1>
        </div>

        {gameState === 'idle' && (
          <div className="text-center py-16">
            <Target className="w-16 h-16 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">{isAr ? 'اضغط على الأهداف قبل أن تختفي!' : 'Triff die Ziele bevor sie verschwinden!'}</p>
            {bestScore > 0 && <p className="text-sm text-muted-foreground mb-4">{isAr ? `أفضل نتيجة: ${bestScore}` : `Bestleistung: ${bestScore}`}</p>}
            <button onClick={start} className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-lg active:scale-95 transition-transform">
              {isAr ? '🎯 ابدأ' : '🎯 Start'}
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <Target className="w-4 h-4 text-primary" /> {score}
              </div>
              <div className="flex items-center gap-2 text-foreground font-bold">
                <Timer className="w-4 h-4 text-muted-foreground" /> {timeLeft}s
              </div>
            </div>
            <div
              ref={areaRef}
              className="relative w-full rounded-2xl bg-card border border-border/40 overflow-hidden"
              style={{ height: '60vh' }}
            >
              <AnimatePresence>
                {targets.map(t => (
                  <motion.button
                    key={t.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => hitTarget(t.id)}
                    className="absolute rounded-full bg-destructive/90 border-2 border-destructive flex items-center justify-center active:scale-75 transition-transform"
                    style={{
                      width: t.size,
                      height: t.size,
                      left: `${t.x}%`,
                      top: `${t.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-background" />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {gameState === 'ended' && (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">🎯</p>
            <h2 className="text-3xl font-bold text-foreground mb-2">{score}</h2>
            <p className="text-muted-foreground mb-1">{isAr ? 'إصابات' : 'Treffer'}</p>
            <p className="text-sm text-muted-foreground mb-6">{isAr ? `فاتك: ${missed}` : `Verpasst: ${missed}`}</p>
            {score > bestScore && score > 0 && (
              <p className="text-primary font-bold mb-4">🏆 {isAr ? 'رقم قياسي جديد!' : 'Neuer Rekord!'}</p>
            )}
            <button onClick={start} className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-bold mx-auto active:scale-95 transition-transform">
              <RotateCcw className="w-5 h-5" /> {isAr ? 'مرة أخرى' : 'Nochmal'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
