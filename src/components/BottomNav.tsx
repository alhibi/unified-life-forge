import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Home, Gamepad2, Settings, BookOpen, ScrollText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const tabs = [
  { key: 'settings', path: '/settings', icon: Settings, labelKey: 'nav.settings' },
  { key: 'games', path: '/games', icon: Gamepad2, labelKey: 'nav.games' },
  { key: 'diwan', path: '/diwan', icon: ScrollText, labelKey: 'nav.diwan' },
  { key: 'duas', path: '/duas', icon: BookOpen, labelKey: 'nav.duas' },
  { key: 'home', path: '/', icon: Home, labelKey: 'nav.home' },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="bg-card/85 backdrop-blur-xl border-t border-border/50 px-2 py-1.5 flex items-center justify-around">
        {tabs.map(tab => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all duration-200"
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-1.5 w-5 h-[3px] rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon className={`w-[22px] h-[22px] transition-all duration-200 ${
                active ? 'text-primary stroke-[2.2]' : 'text-muted-foreground stroke-[1.5]'
              }`} />
              <span className={`text-[10px] transition-all duration-200 ${
                active ? 'font-semibold text-primary' : 'font-medium text-muted-foreground'
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
