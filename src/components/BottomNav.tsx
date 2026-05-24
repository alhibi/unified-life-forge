import React, { useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import {
  House, Dices, SlidersHorizontal, HandHeart, Feather, MessageCircle,
  HeartPulse,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

type Tab = {
  key: string;
  path: string;
  icon: typeof House;
  labelKey: string;
};

// Single-row layout. In RTL the array renders right → left, so the first
// entry sits on the far right. The user-facing spec is:
//   right side  : ديوان، أدعية، عافية
//   middle      : الرئيسية
//   left side   : دردشة، ألعاب، إعدادات
const tabs: Tab[] = [
  { key: 'diwan',    path: '/diwan',    icon: Feather,           labelKey: 'nav.diwan' },
  { key: 'duas',     path: '/duas',     icon: HandHeart,         labelKey: 'nav.duas' },
  { key: 'wellness', path: '/wellness', icon: HeartPulse,        labelKey: 'nav.wellness' },
  { key: 'home',     path: '/',         icon: House,             labelKey: 'nav.home' },
  { key: 'chat',     path: '/chat',     icon: MessageCircle,     labelKey: 'nav.chat' },
  { key: 'games',    path: '/games',    icon: Dices,             labelKey: 'nav.games' },
  { key: 'settings', path: '/settings', icon: SlidersHorizontal, labelKey: 'nav.settings' },
];

// Show the bar only on these top-level destinations. Deeper sub-pages
// (game boards, reading articles, settings details, auth, …) hide it so
// the user has a clear "you are deep, hit Back to surface" model.
const TAB_PATHS = new Set<string>(tabs.map(t => t.path));

export default function BottomNav() {
  const { t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();

  const isActive = useCallback(
    (path: string) =>
      path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
    [location.pathname],
  );

  if (!TAB_PATHS.has(location.pathname)) return null;

  return (
    <nav
      data-bottom-nav
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-2xl border-t border-border/40"
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow:
          '0 -1px 0 hsl(var(--border) / 0.4), 0 -10px 28px -12px rgba(0,0,0,0.22)',
      }}
    >
      <div className="px-1 pt-1.5 pb-1.5 flex items-stretch justify-around">
        {tabs.map(tab => {
          const active = isActive(tab.path);
          const Icon = tab.icon;
          const showBadge = tab.key === 'chat' && unreadCount > 0;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.path)}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-2xl"
              aria-label={t(tab.labelKey)}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <span
                  className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-7 rounded-full bg-primary/15"
                  aria-hidden
                />
              )}

              <div className="relative">
                <Icon
                  className={`relative z-10 w-[22px] h-[22px] mx-auto transition-transform duration-200 ${
                    active
                      ? 'text-primary stroke-[2.2] -translate-y-[1px] scale-[1.06]'
                      : 'text-muted-foreground/70 stroke-[1.7]'
                  }`}
                />
                {showBadge && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9.5px] font-bold flex items-center justify-center leading-none shadow-sm"
                    aria-label={`${unreadCount} ${t('nav.chat')}`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>

              <span
                className={`relative z-10 text-[10.5px] leading-none transition-opacity duration-200 ${
                  active
                    ? 'opacity-100 font-semibold text-primary'
                    : 'opacity-70 font-medium text-muted-foreground/70'
                }`}
              >
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
