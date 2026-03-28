import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Crown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function GamesPage() {
  const { t, dir } = useApp();
  const navigate = useNavigate();

  const games = [
    { key: 'sudoku', icon: Grid3X3, title: t('games.sudoku'), desc: t('games.sudoku.desc'), path: '/games/sudoku', color: 'bg-primary/10 text-primary' },
    { key: 'chess', icon: Crown, title: t('games.chess'), desc: t('games.chess.desc'), path: '/games/chess', color: 'bg-accent/10 text-accent' },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 max-w-lg mx-auto">
        <motion.div variants={item}>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">{t('games.title')}</h1>
        </motion.div>

        {games.map(game => (
          <motion.button
            key={game.key}
            variants={item}
            onClick={() => navigate(game.path)}
            className="w-full premium-card-elevated p-5 flex items-center gap-4 text-start active:scale-[0.98] transition-transform"
          >
            <div className={`w-14 h-14 rounded-2xl ${game.color} flex items-center justify-center shrink-0`}>
              <game.icon className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg text-foreground">{game.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{game.desc}</p>
            </div>
            <ChevronRight className={`w-5 h-5 text-muted-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
