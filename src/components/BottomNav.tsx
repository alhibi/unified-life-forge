import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Home, Gamepad2, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { key: 'home', path: '/', icon: Home, labelKey: 'nav.home' },
  { key: 'games', path: '/games', icon: Gamepad2, labelKey: 'nav.games' },
  { key: 'settings', path: '/settings', icon: Settings, labelKey: 'nav.settings' },
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
      <div className="bg-card/80 backdrop-blur-xl border-t border-border mx-0 px-2 py-1.5 flex items-center justify-around">
        {tabs.map(tab => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all duration-200 ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <tab.icon className={`w-[22px] h-[22px] transition-all ${active ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
              <span className={`text-[10px] transition-all ${active ? 'font-semibold' : 'font-medium'}`}>
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
