import React, { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Trophy, RotateCcw } from 'lucide-react';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function DiceGame() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [dice, setDice] = useState([0, 0]);
  const [rolling, setRolling] = useState(false);
  const [score, setScore] = useState({ player: 0, computer: 0 });
  const [round, setRound] = useState(0);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const maxRounds = 10;

  const rollDice = useCallback(() => {
    if (rolling || gameOver) return;
    setRolling(true);
    setMessage('');

    let count = 0;
    const interval = setInterval(() => {
      setDice([Math.floor(Math.random() * 6), Math.floor(Math.random() * 6)]);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        const playerRoll = Math.floor(Math.random() * 6);
        const computerRoll = Math.floor(Math.random() * 6);
        setDice([playerRoll, computerRoll]);
        setRolling(false);

        const newRound = round + 1;
        setRound(newRound);

        const newScore = { ...score };
        if (playerRoll > computerRoll) {
          newScore.player++;
          setMessage(isAr ? '🎉 فزت بهذه الجولة!' : '🎉 Du gewinnst diese Runde!');
        } else if (computerRoll > playerRoll) {
          newScore.computer++;
          setMessage(isAr ? '😤 الخصم فاز!' : '😤 Gegner gewinnt!');
        } else {
          setMessage(isAr ? '🤝 تعادل!' : '🤝 Unentschieden!');
        }
        setScore(newScore);

        if (newRound >= maxRounds) {
          setGameOver(true);
          if (newScore.player > newScore.computer) {
            setMessage(isAr ? '🏆 فزت باللعبة!' : '🏆 Du hast gewonnen!');
            const stats = JSON.parse(localStorage.getItem('dice-stats') || '{}');
            stats.gamesWon = (stats.gamesWon || 0) + 1;
            stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
            localStorage.setItem('dice-stats', JSON.stringify(stats));
          } else if (newScore.computer > newScore.player) {
            setMessage(isAr ? '😞 خسرت اللعبة' : '😞 Du hast verloren');
            const stats = JSON.parse(localStorage.getItem('dice-stats') || '{}');
            stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
            localStorage.setItem('dice-stats', JSON.stringify(stats));
          } else {
            setMessage(isAr ? '🤝 تعادل كامل!' : '🤝 Komplett unentschieden!');
          }
        }
      }
    }, 80);
  }, [rolling, gameOver, round, score, isAr]);

  const reset = () => {
    setDice([0, 0]);
    setScore({ player: 0, computer: 0 });
    setRound(0);
    setMessage('');
    setGameOver(false);
  };

  return (
    <div className="min-h-screen bg-background pb-28 pt-4">
      <div className="px-5">
        <BackButton to="/games" label={isAr ? 'الألعاب' : 'Spiele'} />
        <div className="flex items-center gap-3 mt-4 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Dices className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{isAr ? 'النرد' : 'Würfel'}</h1>
        </div>

        {/* Score */}
        <div className="flex justify-between items-center bg-card border border-border/40 rounded-2xl p-4 mb-6">
          <div className="text-center flex-1">
            <p className="text-xs text-muted-foreground mb-1">{isAr ? 'أنت' : 'Du'}</p>
            <p className="text-3xl font-bold text-primary">{score.player}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-xs text-muted-foreground mb-1">{isAr ? 'الجولة' : 'Runde'}</p>
            <p className="text-lg font-bold text-foreground">{round}/{maxRounds}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-muted-foreground mb-1">{isAr ? 'الخصم' : 'Gegner'}</p>
            <p className="text-3xl font-bold text-destructive">{score.computer}</p>
          </div>
        </div>

        {/* Dice display */}
        <div className="flex justify-center gap-10 mb-8">
          <div className="text-center">
            <motion.div
              animate={rolling ? { rotate: [0, 360], scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3, repeat: rolling ? Infinity : 0 }}
              className="text-7xl mb-2"
            >
              {DICE_FACES[dice[0]]}
            </motion.div>
            <p className="text-xs text-muted-foreground">{isAr ? 'أنت' : 'Du'}</p>
          </div>
          <div className="text-center">
            <motion.div
              animate={rolling ? { rotate: [0, -360], scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3, repeat: rolling ? Infinity : 0 }}
              className="text-7xl mb-2"
            >
              {DICE_FACES[dice[1]]}
            </motion.div>
            <p className="text-xs text-muted-foreground">{isAr ? 'الخصم' : 'Gegner'}</p>
          </div>
        </div>

        {/* Message */}
        <AnimatePresence mode="wait">
          {message && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-lg font-bold text-foreground mb-6"
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          {!gameOver ? (
            <button
              onClick={rollDice}
              disabled={rolling}
              className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-lg active:scale-95 transition-transform disabled:opacity-50"
            >
              {rolling ? (isAr ? 'جاري الرمي...' : 'Würfeln...') : (isAr ? '🎲 ارمي النرد' : '🎲 Würfeln')}
            </button>
          ) : (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-lg active:scale-95 transition-transform"
            >
              <RotateCcw className="w-5 h-5" />
              {isAr ? 'لعبة جديدة' : 'Neues Spiel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
