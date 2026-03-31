import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Trophy, RotateCcw, Crown, Flame } from 'lucide-react';

const DICE_DOTS: Record<number, number[][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

function DiceFace({ value, color = 'gold' }: { value: number; color?: string }) {
  const dots = DICE_DOTS[value] || [];
  const dotColor = color === 'gold' ? 'bg-amber-900' : 'bg-red-200';
  const bgColor = color === 'gold'
    ? 'bg-gradient-to-br from-amber-100 via-amber-50 to-yellow-100 shadow-lg shadow-amber-500/20 border-amber-300'
    : 'bg-gradient-to-br from-red-900 via-red-800 to-red-950 shadow-lg shadow-red-500/20 border-red-700';

  return (
    <div className={`w-20 h-20 rounded-2xl border-2 ${bgColor} grid grid-rows-3 grid-cols-3 p-2.5 gap-0`}>
      {[0,1,2].map(r => [0,1,2].map(c => {
        const hasDot = dots.some(([dr,dc]) => dr === r && dc === c);
        return (
          <div key={`${r}-${c}`} className="flex items-center justify-center">
            {hasDot && <div className={`w-3 h-3 rounded-full ${dotColor}`} />}
          </div>
        );
      }))}
    </div>
  );
}

export default function DiceGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [playerDice, setPlayerDice] = useState(1);
  const [computerDice, setComputerDice] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [score, setScore] = useState({ player: 0, computer: 0 });
  const [round, setRound] = useState(0);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showFlame, setShowFlame] = useState(false);
  const maxRounds = 10;

  const rollDice = useCallback(() => {
    if (rolling || gameOver) return;
    setRolling(true);
    setMessage('');

    let count = 0;
    const interval = setInterval(() => {
      setPlayerDice(Math.ceil(Math.random() * 6));
      setComputerDice(Math.ceil(Math.random() * 6));
      count++;
      if (count >= 15) {
        clearInterval(interval);
        const pRoll = Math.ceil(Math.random() * 6);
        const cRoll = Math.ceil(Math.random() * 6);
        setPlayerDice(pRoll);
        setComputerDice(cRoll);
        setRolling(false);

        const newRound = round + 1;
        setRound(newRound);

        const newScore = { ...score };
        if (pRoll > cRoll) {
          newScore.player++;
          const newStreak = streak + 1;
          setStreak(newStreak);
          if (newStreak >= 3) setShowFlame(true);
          setMessage(isAr ? '🎉 فزت!' : '🎉 Gewonnen!');
        } else if (cRoll > pRoll) {
          newScore.computer++;
          setStreak(0);
          setShowFlame(false);
          setMessage(isAr ? '💀 الخصم فاز' : '💀 Gegner gewinnt');
        } else {
          setMessage(isAr ? '🤝 تعادل' : '🤝 Unentschieden');
        }
        setScore(newScore);

        if (newRound >= maxRounds) {
          setGameOver(true);
          const stats = JSON.parse(localStorage.getItem('dice-stats') || '{}');
          stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
          if (newScore.player > newScore.computer) {
            stats.gamesWon = (stats.gamesWon || 0) + 1;
            setMessage(isAr ? '👑 أنت البطل!' : '👑 Du bist der Champion!');
          } else if (newScore.computer > newScore.player) {
            setMessage(isAr ? '😞 حظاً أوفر' : '😞 Mehr Glück nächstes Mal');
          } else {
            setMessage(isAr ? '🤝 تعادل كامل!' : '🤝 Unentschieden!');
          }
          localStorage.setItem('dice-stats', JSON.stringify(stats));
        }
      }
    }, 60);
  }, [rolling, gameOver, round, score, isAr, streak]);

  const reset = () => {
    setPlayerDice(1); setComputerDice(1);
    setScore({ player: 0, computer: 0 });
    setRound(0); setMessage(''); setGameOver(false);
    setStreak(0); setShowFlame(false);
  };

  return (
    <div className="min-h-screen pb-28 pt-4" style={{ background: 'linear-gradient(180deg, #1a0f00 0%, #2d1810 40%, #1a0f00 100%)' }}>
      <div className="px-5">
        <BackButton to="/games" />

        {/* Casino Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-4 mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            {showFlame && <Flame className="w-5 h-5 text-orange-400 animate-pulse" />}
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
              {isAr ? '🎲 النرد' : '🎲 Würfel'}
            </h1>
            {showFlame && <Flame className="w-5 h-5 text-orange-400 animate-pulse" />}
          </div>
          <p className="text-amber-600/60 text-xs">{isAr ? 'الجولة' : 'Runde'} {round}/{maxRounds}</p>
        </motion.div>

        {/* Score Board */}
        <div className="flex justify-between items-center rounded-2xl p-4 mb-8 border border-amber-900/30" style={{ background: 'linear-gradient(135deg, rgba(120,53,15,0.3), rgba(146,64,14,0.1))' }}>
          <div className="text-center flex-1">
            <p className="text-[10px] uppercase tracking-widest text-amber-500/60 mb-1">{isAr ? 'أنت' : 'Du'}</p>
            <motion.p key={score.player} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-4xl font-black text-amber-300">{score.player}</motion.p>
          </div>
          <div className="w-px h-12 bg-amber-800/30" />
          <div className="text-center px-6">
            <p className="text-amber-700/50 text-lg font-bold">VS</p>
          </div>
          <div className="w-px h-12 bg-amber-800/30" />
          <div className="text-center flex-1">
            <p className="text-[10px] uppercase tracking-widest text-red-500/60 mb-1">{isAr ? 'الخصم' : 'Gegner'}</p>
            <motion.p key={score.computer} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-4xl font-black text-red-400">{score.computer}</motion.p>
          </div>
        </div>

        {/* Dice Area */}
        <div className="flex justify-center gap-12 mb-8">
          <motion.div
            animate={rolling ? { rotateZ: [0, 15, -15, 10, -10, 0], y: [0, -20, 0] } : {}}
            transition={{ duration: 0.3, repeat: rolling ? Infinity : 0 }}
            className="flex flex-col items-center gap-3"
          >
            <DiceFace value={playerDice} color="gold" />
            <p className="text-[10px] uppercase tracking-widest text-amber-500/60">{isAr ? 'أنت' : 'Du'}</p>
          </motion.div>
          <motion.div
            animate={rolling ? { rotateZ: [0, -15, 15, -10, 10, 0], y: [0, -20, 0] } : {}}
            transition={{ duration: 0.3, repeat: rolling ? Infinity : 0 }}
            className="flex flex-col items-center gap-3"
          >
            <DiceFace value={computerDice} color="red" />
            <p className="text-[10px] uppercase tracking-widest text-red-500/60">{isAr ? 'الخصم' : 'Gegner'}</p>
          </motion.div>
        </div>

        {/* Message */}
        <AnimatePresence mode="wait">
          {message && (
            <motion.p
              key={message}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-xl font-black text-amber-200 mb-6"
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Streak */}
        {streak >= 2 && !gameOver && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-amber-500 text-sm mb-4">
            🔥 {isAr ? `سلسلة ${streak} انتصارات!` : `${streak}er Serie!`}
          </motion.p>
        )}

        {/* Action */}
        <div className="flex justify-center">
          {!gameOver ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={rollDice}
              disabled={rolling}
              className="px-10 py-4 rounded-2xl font-black text-lg text-amber-950 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)' }}
            >
              {rolling ? (isAr ? '🎲 ...' : '🎲 ...') : (isAr ? '🎲 ارمي' : '🎲 Würfeln')}
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={reset}
              className="flex items-center gap-2 px-10 py-4 rounded-2xl font-black text-lg text-amber-950"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)' }}
            >
              <RotateCcw className="w-5 h-5" /> {isAr ? 'جديد' : 'Neu'}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
