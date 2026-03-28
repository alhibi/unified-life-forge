import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Swords, ChevronRight, Gamepad2, Trophy, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function GamesPage() {
  const { t, dir } = useApp();
  const navigate = useNavigate();

  const sudokuStats = (() => {
    try {
      const s = JSON.parse(localStorage.getItem('sudoku-stats') || '{}');
      return { wins: s.gamesWon || 0, streak: s.bestStreak || 0 };
    } catch { return { wins: 0, streak: 0 }; }
  })();

  const chessStats = (() => {
    try {
      const s = JSON.parse(localStorage.getItem('chess-stats') || '{}');
      return { played: s.gamesPlayed || 0, moves: s.totalMoves || 0 };
    } catch { return { played: 0, moves: 0 }; }
  })();

  const games = [
    {
      key: 'sudoku',
      icon: Grid3X3,
      title: t('games.sudoku'),
      desc: t('games.sudoku.desc'),
      path: '/games/sudoku',
      iconBg: 'bg-blue-500/12 dark:bg-blue-400/15',
      iconColor: 'text-blue-600 dark:text-blue-400',
      stats: sudokuStats.wins > 0 ? [
        { icon: Trophy, value: sudokuStats.wins, label: t('stats.wins') },
        { icon: Star, value: sudokuStats.streak, label: t('stats.streak') },
      ] : null,
    },
    {
      key: 'chess',
      icon: Swords,
      title: t('games.chess'),
      desc: t('games.chess.desc'),
      path: '/games/chess',
      iconBg: 'bg-amber-500/12 dark:bg-amber-400/15',
      iconColor: 'text-amber-600 dark:text-amber-400',
      stats: chessStats.played > 0 ? [
        { icon: Gamepad2, value: chessStats.played, label: t('stats.played') },
        { icon: Star, value: chessStats.moves, label: t('stats.moves') },
      ] : null,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 max-w-lg mx-auto">
        <motion.div variants={item} className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">{t('games.title')}</h1>
        </motion.div>

        {games.map(game => (
          <motion.button
            key={game.key}
            variants={item}
            onClick={() => navigate(game.path)}
            className="w-full premium-card-elevated p-4 flex items-center gap-4 text-start active:scale-[0.98] transition-transform"
          >
            <div className={`w-14 h-14 rounded-2xl ${game.iconBg} flex items-center justify-center shrink-0`}>
              <game.icon className={`w-6 h-6 ${game.iconColor} stroke-[1.8]`} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-[16px] text-foreground">{game.title}</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{game.desc}</p>
              {game.stats && (
                <div className="flex gap-3 mt-2">
                  {game.stats.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <s.icon className="w-3 h-3" />
                      <span className="font-semibold text-foreground">{s.value}</span>
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground/50 shrink-0 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
