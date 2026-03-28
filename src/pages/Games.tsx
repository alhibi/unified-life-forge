import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, Crown } from 'lucide-react';

export default function GamesPage() {
  const { t } = useApp();
  const navigate = useNavigate();

  const games = [
    {
      key: 'sudoku',
      icon: Grid3X3,
      title: t('games.sudoku'),
      desc: t('games.sudoku.desc'),
      path: '/games/sudoku',
      gradient: 'gradient-primary',
    },
    {
      key: 'chess',
      icon: Crown,
      title: t('games.chess'),
      desc: t('games.chess.desc'),
      path: '/games/chess',
      gradient: 'gradient-accent',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6">
      <h1 className="text-2xl font-display font-bold text-foreground mb-6 animate-fade-in">
        {t('games.title')}
      </h1>

      <div className="space-y-4 max-w-lg mx-auto">
        {games.map((game, i) => (
          <button
            key={game.key}
            onClick={() => navigate(game.path)}
            className="w-full glass-card-elevated p-5 flex items-center gap-4 text-start hover:scale-[1.02] transition-transform animate-slide-up"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className={`w-14 h-14 rounded-2xl ${game.gradient} flex items-center justify-center shrink-0`}>
              <game.icon className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">{game.title}</h2>
              <p className="text-sm text-muted-foreground">{game.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
