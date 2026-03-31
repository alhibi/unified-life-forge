import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Armchair, Gamepad2, Settings, BookOpen, ScrollText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const tabs = [
  { key: 'settings', path: '/settings', icon: Settings, labelKey: 'nav.settings' },
  { key: 'games', path: '/games', icon: Gamepad2, labelKey: 'nav.games' },
  { key: 'diwan', path: '/diwan', icon: ScrollText, labelKey: 'nav.diwan' },
  { key: 'duas', path: '/duas', icon: BookOpen, labelKey: 'nav.duas' },
  { key: 'home', path: '/', icon: Armchair, labelKey: 'nav.home' },
];

export default function BottomNav() {
  const { t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      dir="ltr"
      style={{ contain: 'layout style', willChange: 'transform', transform: 'translateZ(0)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-3 mb-2.5 rounded-2xl bg-card/70 backdrop-blur-2xl border border-border/30 shadow-[0_-4px_30px_rgba(0,0,0,0.3)] px-1 py-1.5 flex items-center justify-around">
        {tabs.map(tab => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-colors"
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl bg-primary/15 border border-primary/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ willChange: 'transform' }}
                />
              )}
              <tab.icon className={`relative z-10 w-[21px] h-[21px] transition-colors ${
                active ? 'text-primary stroke-[2.2]' : 'text-muted-foreground/70 stroke-[1.5]'
              }`} />
              <span className={`relative z-10 text-[10px] transition-colors ${
                active ? 'font-semibold text-primary' : 'font-medium text-muted-foreground/70'
              }`}>
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
