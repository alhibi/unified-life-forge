import React, { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import GameShell from '@/components/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, RotateCcw, Flame } from 'lucide-react';

const DICE_DOTS: Record<number, number[][]> = {
  1: [[1,1]], 2: [[0,0],[2,2]], 3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]], 5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

function DiceFace({ value, color = 'gold' }: { value: number; color?: string }) {
  const dots = DICE_DOTS[value] || [];
  const isGold = color === 'gold';
  return (
    <div className={`w-[72px] h-[72px] rounded-2xl border-2 grid grid-rows-3 grid-cols-3 p-2 gap-0 ${
      isGold ? 'bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-300 shadow-lg shadow-amber-500/20'
        : 'bg-gradient-to-br from-red-900 to-red-950 border-red-700 shadow-lg shadow-red-500/20'
    }`}>
      {[0,1,2].map(r => [0,1,2].map(c => (
        <div key={`${r}-${c}`} className="flex items-center justify-center">
          {dots.some(([dr,dc]) => dr === r && dc === c) && (
            <div className={`w-2.5 h-2.5 rounded-full ${isGold ? 'bg-amber-900' : 'bg-red-200'}`} />
          )}
        </div>
      )))}
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
  const [maxRounds, setMaxRounds] = useState('10');

  const totalRounds = parseInt(maxRounds);
  const savedStats = JSON.parse(localStorage.getItem('dice-stats') || '{}');

  const rollDice = useCallback(() => {
    if (rolling || gameOver) return;
    setRolling(true); setMessage('');
    let count = 0;
    const interval = setInterval(() => {
      setPlayerDice(Math.ceil(Math.random() * 6));
      setComputerDice(Math.ceil(Math.random() * 6));
      count++;
      if (count >= 14) {
        clearInterval(interval);
        const pR = Math.ceil(Math.random() * 6), cR = Math.ceil(Math.random() * 6);
        setPlayerDice(pR); setComputerDice(cR); setRolling(false);
        const newRound = round + 1; setRound(newRound);
        const ns = { ...score };
        if (pR > cR) { ns.player++; setStreak(s => s + 1); setMessage(isAr ? '🎉 فزت!' : '🎉 Gewonnen!'); }
        else if (cR > pR) { ns.computer++; setStreak(0); setMessage(isAr ? '💀 الخصم فاز' : '💀 Gegner gewinnt'); }
        else setMessage(isAr ? '🤝 تعادل' : '🤝 Unentschieden');
        setScore(ns);
        if (newRound >= totalRounds) {
          setGameOver(true);
          const stats = { ...savedStats, gamesPlayed: (savedStats.gamesPlayed || 0) + 1 };
          if (ns.player > ns.computer) { stats.gamesWon = (stats.gamesWon || 0) + 1; setMessage(isAr ? '👑 أنت البطل!' : '👑 Champion!'); }
          else if (ns.computer > ns.player) setMessage(isAr ? '😞 حظاً أوفر' : '😞 Nächstes Mal');
          else setMessage(isAr ? '🤝 تعادل!' : '🤝 Unentschieden!');
          localStorage.setItem('dice-stats', JSON.stringify(stats));
        }
      }
    }, 55);
  }, [rolling, gameOver, round, score, isAr, streak, totalRounds, savedStats]);

  const reset = () => {
    setPlayerDice(1); setComputerDice(1); setScore({ player: 0, computer: 0 });
    setRound(0); setMessage(''); setGameOver(false); setStreak(0);
  };

  const rules = isAr
    ? ['كل جولة يرمي اللاعب والخصم نرداً واحداً', 'صاحب الرقم الأعلى يفوز بالجولة', 'من يجمع جولات أكثر يفوز باللعبة', 'سلسلة الانتصارات المتتالية تظهر بجانب النتيجة']
    : ['Jede Runde würfeln Spieler und Gegner', 'Die höhere Zahl gewinnt die Runde', 'Wer mehr Runden gewinnt, gewinnt das Spiel', 'Siegesserie wird neben der Punktzahl angezeigt'];

  const stats = [
    { label: isAr ? 'مباريات' : 'Spiele', value: savedStats.gamesPlayed || 0 },
    { label: isAr ? 'انتصارات' : 'Siege', value: savedStats.gamesWon || 0 },
    { label: isAr ? 'نسبة الفوز' : 'Siegquote', value: savedStats.gamesPlayed > 0 ? `${Math.round(((savedStats.gamesWon || 0) / savedStats.gamesPlayed) * 100)}%` : '-' },
  ];

  const options = [
    {
      key: 'rounds', label: isAr ? 'عدد الجولات' : 'Rundenanzahl',
      choices: [
        { value: '5', label: '5' }, { value: '10', label: '10' }, { value: '15', label: '15' },
      ],
      current: maxRounds, onChange: (v: string) => { setMaxRounds(v); reset(); },
    },
  ];

  return (
    <GameShell title={isAr ? 'النرد' : 'Würfel'} icon={Dices} accentColor="#f59e0b" rules={rules} stats={stats} options={options}
      headerRight={<span className="text-xs text-zinc-600">{round}/{totalRounds}</span>}
    >
      {/* Score */}
      <div className="flex justify-between items-center rounded-2xl p-4 mb-6 border border-amber-900/20" style={{ background: 'rgba(120,53,15,0.12)' }}>
        <div className="text-center flex-1">
          <p className="text-[10px] uppercase tracking-widest text-amber-500/50 mb-0.5">{isAr ? 'أنت' : 'Du'}</p>
          <motion.p key={score.player} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="text-3xl font-black text-amber-300">{score.player}</motion.p>
        </div>
        <div className="text-amber-800/40 font-bold">VS</div>
        <div className="text-center flex-1">
          <p className="text-[10px] uppercase tracking-widest text-red-500/50 mb-0.5">{isAr ? 'الخصم' : 'Gegner'}</p>
          <motion.p key={score.computer} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="text-3xl font-black text-red-400">{score.computer}</motion.p>
        </div>
      </div>

      {/* Dice */}
      <div className="flex justify-center gap-10 mb-6">
        <motion.div animate={rolling ? { rotateZ: [0, 15, -15, 0], y: [0, -15, 0] } : {}} transition={{ duration: 0.25, repeat: rolling ? Infinity : 0 }} className="flex flex-col items-center gap-2">
          <DiceFace value={playerDice} color="gold" />
        </motion.div>
        <motion.div animate={rolling ? { rotateZ: [0, -15, 15, 0], y: [0, -15, 0] } : {}} transition={{ duration: 0.25, repeat: rolling ? Infinity : 0 }} className="flex flex-col items-center gap-2">
          <DiceFace value={computerDice} color="red" />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {message && (
          <motion.p key={message} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center text-lg font-black text-amber-200 mb-4">
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      {streak >= 2 && !gameOver && (
        <p className="text-center text-amber-500/70 text-xs mb-3 flex items-center justify-center gap-1">
          <Flame className="w-3.5 h-3.5" /> {isAr ? `سلسلة ${streak}` : `${streak}er Serie`}
        </p>
      )}

      <div className="flex justify-center">
        {!gameOver ? (
          <motion.button whileTap={{ scale: 0.9 }} onClick={rollDice} disabled={rolling}
            className="px-10 py-3.5 rounded-2xl font-black text-amber-950 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)' }}>
            {rolling ? '🎲 ...' : (isAr ? '🎲 ارمي' : '🎲 Würfeln')}
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: 0.9 }} onClick={reset}
            className="flex items-center gap-2 px-10 py-3.5 rounded-2xl font-black text-amber-950"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)' }}>
            <RotateCcw className="w-4 h-4" /> {isAr ? 'جديد' : 'Neu'}
          </motion.button>
        )}
      </div>
    </GameShell>
  );
}
