import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Swords, ChevronRight, Gamepad2, Trophy, Star, Brain, Bomb, Palette, PipetteIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function GamesPage() {
  const { t, dir, language } = useApp();
  const navigate = useNavigate();

  const getStats = (key: string) => {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
  };

  const sudokuStats = getStats('sudoku-stats');
  const chessStats = getStats('chess-stats');
  const memoryStats = getStats('memory-stats');
  const mineStats = getStats('mine-stats');
  const mazeStats = getStats('maze-stats');
  const pipesStats = getStats('pipes-stats');

  const games = [
    {
      key: 'sudoku',
      icon: Grid3X3,
      title: t('games.sudoku'),
      desc: t('games.sudoku.desc'),
      path: '/games/sudoku',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      stats: sudokuStats.gamesWon > 0 ? [
        { icon: Trophy, value: sudokuStats.gamesWon, label: t('stats.wins') },
        { icon: Star, value: sudokuStats.bestStreak, label: t('stats.streak') },
      ] : null,
    },
    {
      key: 'chess',
      icon: Swords,
      title: t('games.chess'),
      desc: t('games.chess.desc'),
      path: '/games/chess',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      stats: chessStats.gamesPlayed > 0 ? [
        { icon: Gamepad2, value: chessStats.gamesPlayed, label: t('stats.played') },
        { icon: Star, value: chessStats.totalMoves, label: t('stats.moves') },
      ] : null,
    },
    {
      key: 'memory',
      icon: Brain,
      title: t('games.memory'),
      desc: t('games.memory.desc'),
      path: '/games/memory',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      stats: memoryStats.gamesWon > 0 ? [
        { icon: Trophy, value: memoryStats.gamesWon, label: t('stats.wins') },
        { icon: Star, value: memoryStats.bestStreak, label: t('stats.streak') },
      ] : null,
    },
    {
      key: 'minesweeper',
      icon: Bomb,
      title: t('games.minesweeper'),
      desc: t('games.minesweeper.desc'),
      path: '/games/minesweeper',
      iconBg: 'bg-red-500/12 dark:bg-red-400/15',
      iconColor: 'text-red-600 dark:text-red-400',
      stats: mineStats.gamesWon > 0 ? [
        { icon: Trophy, value: mineStats.gamesWon, label: t('stats.wins') },
        { icon: Gamepad2, value: mineStats.gamesPlayed, label: t('stats.played') },
      ] : null,
    },
    {
      key: 'colormaze',
      icon: Palette,
      title: t('games.colormaze'),
      desc: t('games.colormaze.desc'),
      path: '/games/colormaze',
      iconBg: 'bg-emerald-500/12 dark:bg-emerald-400/15',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      stats: mazeStats.gamesWon > 0 ? [
        { icon: Trophy, value: mazeStats.gamesWon, label: t('stats.wins') },
        { icon: Star, value: mazeStats.bestStreak, label: t('stats.streak') },
      ] : null,
    },
    {
      key: 'pipes',
      icon: PipetteIcon,
      title: t('games.pipes'),
      desc: t('games.pipes.desc'),
      path: '/games/pipes',
      iconBg: 'bg-cyan-500/12 dark:bg-cyan-400/15',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      stats: pipesStats.gamesWon > 0 ? [
        { icon: Trophy, value: pipesStats.gamesWon, label: t('stats.wins') },
        { icon: Star, value: pipesStats.bestStreak, label: t('stats.streak') },
      ] : null,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3 max-w-lg mx-auto">
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
            className="w-full bg-card border border-border/40 rounded-2xl p-4 flex items-center gap-4 text-start active:scale-[0.98] transition-transform"
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
