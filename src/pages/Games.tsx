import React from 'react';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Swords, Gamepad2, Trophy, Brain, Bomb, Palette, PipetteIcon, Dices, Target, Puzzle, Hexagon, Crosshair } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GamesPage() {
  const { t } = useApp();
  const navigate = useNavigate();

  const getStats = (key: string) => {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
  };

  const games = [
    { key: 'sudoku', icon: Grid3X3, title: t('games.sudoku'), desc: t('games.sudoku.desc'), path: '/games/sudoku', wins: getStats('sudoku-stats').gamesWon || 0 },
    { key: 'chess', icon: Swords, title: t('games.chess'), desc: t('games.chess.desc'), path: '/games/chess', wins: getStats('chess-stats').gamesPlayed || 0 },
    { key: 'memory', icon: Brain, title: t('games.memory'), desc: t('games.memory.desc'), path: '/games/memory', wins: getStats('memory-stats').gamesWon || 0 },
    { key: 'minesweeper', icon: Bomb, title: t('games.minesweeper'), desc: t('games.minesweeper.desc'), path: '/games/minesweeper', wins: getStats('mine-stats').gamesWon || 0 },
    { key: 'colormaze', icon: Palette, title: t('games.colormaze'), desc: t('games.colormaze.desc'), path: '/games/colormaze', wins: getStats('maze-stats').gamesWon || 0 },
    { key: 'pipes', icon: PipetteIcon, title: t('games.pipes'), desc: t('games.pipes.desc'), path: '/games/pipes', wins: getStats('pipes-stats').gamesWon || 0 },
    { key: 'dice', icon: Dices, title: t('games.dice'), desc: '', path: '/games/dice', wins: getStats('dice-stats').gamesWon || 0 },
    { key: 'target', icon: Target, title: t('games.target'), desc: '', path: '/games/target', wins: getStats('target-stats').gamesWon || 0 },
    { key: 'puzzle', icon: Puzzle, title: t('games.puzzle'), desc: '', path: '/games/puzzle', wins: getStats('puzzle-stats').gamesWon || 0 },
    { key: 'hex', icon: Hexagon, title: t('games.hex'), desc: '', path: '/games/hex', wins: getStats('hex-stats').gamesWon || 0 },
    { key: 'focus', icon: Crosshair, title: t('games.focus'), desc: '', path: '/games/focus', wins: getStats('focus-stats').gamesWon || 0 },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 pt-14">
      <SEO title="الألعاب — SmartHub" description="مجموعة ألعاب ذهنية: سودوكو، شطرنج، ذاكرة، كاسحة ألغام والمزيد، بتصميم داكن سلس داخل SmartHub." path="/games" />

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

      {/* Uniform grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="px-4 grid grid-cols-2 gap-3"
      >
        {games.map((game, i) => {
          const Icon = game.icon;
          return (
            <motion.button
              key={game.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => navigate(game.path)}
              className="group relative flex flex-col items-start gap-3 rounded-2xl bg-card border border-border/40 p-4 min-h-[128px] active:scale-[0.97] transition-transform text-start"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary stroke-[1.8]" />
              </div>
              <div className="flex-1 w-full">
                <h2 className="font-bold text-[14px] text-foreground leading-tight">{game.title}</h2>
                {game.desc && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">{game.desc}</p>
                )}
              </div>
              {game.wins > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Trophy className="w-3 h-3 text-primary/70" />
                  <span className="font-bold text-foreground">{game.wins}</span>
                  <span>{t('stats.wins')}</span>
                </div>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
