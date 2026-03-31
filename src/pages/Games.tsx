import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Swords, Gamepad2, Trophy, Star, Brain, Bomb, Palette, PipetteIcon, Dices, Target, Puzzle, Layers, Hexagon, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
function UpcomingGameButton({ icon: Icon, title, language }: { icon: any; title: string; language: string }) {
  const [showSoon, setShowSoon] = useState(false);
  return (
    <button
      onClick={() => { setShowSoon(true); setTimeout(() => setShowSoon(false), 1200); }}
      className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl bg-card/60 border border-border/30 active:scale-95 transition-transform relative"
    >
      <Icon className="w-5 h-5 text-muted-foreground/60 stroke-[1.8]" />
      <span className="text-[11px] font-medium text-muted-foreground truncate w-full text-center transition-all duration-300">
        {showSoon ? (language === 'ar' ? 'قريباً' : 'Soon') : title}
      </span>
    </button>
  );
}

export default function GamesPage() {
  const { t, dir, language } = useApp();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const getStats = (key: string) => {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
  };

  const sudokuStats = getStats('sudoku-stats');
  const chessStats = getStats('chess-stats');
  const memoryStats = getStats('memory-stats');
  const mineStats = getStats('mine-stats');
  const mazeStats = getStats('maze-stats');
  const pipesStats = getStats('pipes-stats');
  const diceStats = getStats('dice-stats');
  const targetStats = getStats('target-stats');
  const puzzleStats = getStats('puzzle-stats');
  const stackStats = getStats('stack-stats');
  const hexStats = getStats('hex-stats');
  const focusStats = getStats('focus-stats');

  const games = [
    {
      key: 'sudoku', icon: Grid3X3,
      title: t('games.sudoku'), desc: t('games.sudoku.desc'),
      path: '/games/sudoku',
      stats: sudokuStats.gamesWon > 0 ? [
        { icon: Trophy, value: sudokuStats.gamesWon, label: t('stats.wins') },
        { icon: Star, value: sudokuStats.bestStreak, label: t('stats.streak') },
      ] : null,
    },
    {
      key: 'chess', icon: Swords,
      title: t('games.chess'), desc: t('games.chess.desc'),
      path: '/games/chess',
      stats: chessStats.gamesPlayed > 0 ? [
        { icon: Gamepad2, value: chessStats.gamesPlayed, label: t('stats.played') },
        { icon: Star, value: chessStats.totalMoves, label: t('stats.moves') },
      ] : null,
    },
    {
      key: 'memory', icon: Brain,
      title: t('games.memory'), desc: t('games.memory.desc'),
      path: '/games/memory',
      stats: memoryStats.gamesWon > 0 ? [
        { icon: Trophy, value: memoryStats.gamesWon, label: t('stats.wins') },
        { icon: Star, value: memoryStats.bestStreak, label: t('stats.streak') },
      ] : null,
    },
    {
      key: 'minesweeper', icon: Bomb,
      title: t('games.minesweeper'), desc: t('games.minesweeper.desc'),
      path: '/games/minesweeper',
      stats: mineStats.gamesWon > 0 ? [
        { icon: Trophy, value: mineStats.gamesWon, label: t('stats.wins') },
        { icon: Gamepad2, value: mineStats.gamesPlayed, label: t('stats.played') },
      ] : null,
    },
    {
      key: 'colormaze', icon: Palette,
      title: t('games.colormaze'), desc: t('games.colormaze.desc'),
      path: '/games/colormaze',
      stats: mazeStats.gamesWon > 0 ? [
        { icon: Trophy, value: mazeStats.gamesWon, label: t('stats.wins') },
        { icon: Star, value: mazeStats.bestStreak, label: t('stats.streak') },
      ] : null,
    },
    {
      key: 'pipes', icon: PipetteIcon,
      title: t('games.pipes'), desc: t('games.pipes.desc'),
      path: '/games/pipes',
      stats: pipesStats.gamesWon > 0 ? [
        { icon: Trophy, value: pipesStats.gamesWon, label: t('stats.wins') },
        { icon: Star, value: pipesStats.bestStreak, label: t('stats.streak') },
      ] : null,
    },
    {
      key: 'dice', icon: Dices,
      title: t('games.dice'), desc: t('games.dice.desc'),
      path: '/games/dice',
      stats: diceStats.gamesPlayed > 0 ? [
        { icon: Trophy, value: diceStats.gamesWon || 0, label: t('stats.wins') },
        { icon: Gamepad2, value: diceStats.gamesPlayed, label: t('stats.played') },
      ] : null,
    },
    {
      key: 'target', icon: Target,
      title: t('games.target'), desc: t('games.target.desc'),
      path: '/games/target',
      stats: targetStats.bestScore > 0 ? [
        { icon: Star, value: targetStats.bestScore, label: t('stats.best') },
        { icon: Gamepad2, value: targetStats.gamesPlayed, label: t('stats.played') },
      ] : null,
    },
    {
      key: 'puzzle', icon: Puzzle,
      title: t('games.puzzle'), desc: t('games.puzzle.desc'),
      path: '/games/puzzle',
      stats: puzzleStats.gamesWon > 0 ? [
        { icon: Trophy, value: puzzleStats.gamesWon, label: t('stats.wins') },
        { icon: Star, value: puzzleStats.bestMoves, label: t('stats.best') },
      ] : null,
    },
    {
      key: 'stack', icon: Layers,
      title: t('games.stack'), desc: t('games.stack.desc'),
      path: '/games/stack',
      stats: stackStats.bestScore > 0 ? [
        { icon: Star, value: stackStats.bestScore, label: t('stats.best') },
        { icon: Gamepad2, value: stackStats.gamesPlayed, label: t('stats.played') },
      ] : null,
    },
    {
      key: 'hex', icon: Hexagon,
      title: t('games.hex'), desc: t('games.hex.desc'),
      path: '/games/hex',
      stats: hexStats.gamesWon > 0 ? [
        { icon: Trophy, value: hexStats.gamesWon, label: t('stats.wins') },
        { icon: Star, value: hexStats.bestMoves, label: t('stats.best') },
      ] : null,
    },
    {
      key: 'focus', icon: Crosshair,
      title: t('games.focus'), desc: t('games.focus.desc'),
      path: '/games/focus',
      stats: focusStats.bestAvg > 0 ? [
        { icon: Star, value: `${focusStats.bestAvg}ms`, label: t('stats.best') },
        { icon: Gamepad2, value: focusStats.gamesPlayed, label: t('stats.played') },
      ] : null,
    },
  ];

  // Snap-based scroll tracking
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardWidth = el.offsetWidth * 0.72 + 16; // card width + gap
      const scrollPos = el.scrollLeft;
      const idx = Math.round(scrollPos / cardWidth);
      setActiveIndex(Math.max(0, Math.min(idx, games.length - 1)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [games.length]);

  return (
    <div className="min-h-screen bg-background pb-28 pt-14">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 mb-6 px-5"
      >
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Gamepad2 className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">{t('games.title')}</h1>
      </motion.div>

      {/* Carousel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-5 pb-6 scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
          dir="ltr"
        >
          {games.map((game, i) => {
            const Icon = game.icon;
            return (
              <motion.button
                key={game.key}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => navigate(game.path)}
                className="snap-center shrink-0 flex flex-col items-center justify-between rounded-3xl bg-card border border-border/40 p-6 text-center active:scale-[0.96] transition-transform"
                style={{ width: '72vw', maxWidth: '320px', minHeight: '260px' }}
              >
                {/* Icon */}
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
                  <Icon className="w-9 h-9 text-primary stroke-[1.5]" />
                </div>

                {/* Title & desc */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <h2 className="font-bold text-[20px] text-foreground mb-1.5">{game.title}</h2>
                  <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[200px]">{game.desc}</p>
                </div>

                {/* Stats */}
                {game.stats && (
                  <div className="flex gap-4 mt-4 pt-4 border-t border-border/30 w-full justify-center">
                    {game.stats.map((s, si) => (
                      <div key={si} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <s.icon className="w-3.5 h-3.5 text-primary/70" />
                        <span className="font-bold text-foreground">{s.value}</span>
                        <span>{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-1">
          {games.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-6 h-2 bg-primary'
                  : 'w-2 h-2 bg-muted-foreground/25'
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Upcoming games grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="px-5 mt-8"
      >
        <h2 className="text-[14px] font-semibold text-muted-foreground mb-3">{language === 'ar' ? 'المزيد' : 'More'}</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'dice', icon: Dices, title: language === 'ar' ? 'النرد' : 'Dice' },
            { key: 'target', icon: Target, title: language === 'ar' ? 'التصويب' : 'Target' },
            { key: 'puzzle', icon: Puzzle, title: language === 'ar' ? 'الأحجية' : 'Puzzle' },
            { key: 'stack', icon: Layers, title: language === 'ar' ? 'التكديس' : 'Stack' },
            { key: 'hex', icon: Hexagon, title: language === 'ar' ? 'السداسي' : 'Hex' },
            { key: 'aim', icon: Crosshair, title: language === 'ar' ? 'التركيز' : 'Focus' },
          ].map((g) => (
            <UpcomingGameButton key={g.key} icon={g.icon} title={g.title} language={language} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
