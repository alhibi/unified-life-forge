import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { House, Dices, SlidersHorizontal, HandHeart, Feather, MessageCircle, HeartPulse } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

type Tab = {
  key: string;
  path: string;
  icon: typeof House;
  labelKey: string;
};

const tabs: Tab[] = [
  { key: 'settings', path: '/settings', icon: SlidersHorizontal, labelKey: 'nav.settings' },
  { key: 'games', path: '/games', icon: Dices, labelKey: 'nav.games' },
  { key: 'chat', path: '/chat', icon: MessageCircle, labelKey: 'nav.chat' },
  { key: 'home', path: '/', icon: House, labelKey: 'nav.home' },
  { key: 'wellness', path: '/wellness', icon: HeartPulse, labelKey: 'nav.wellness' },
  { key: 'duas', path: '/duas', icon: HandHeart, labelKey: 'nav.duas' },
  { key: 'diwan', path: '/diwan', icon: Feather, labelKey: 'nav.diwan' },
];

// The bottom nav is a *tab bar*, not a global chrome element — it only
// makes sense on the seven top-level tab routes that <PersistentTabs/>
// renders. Sub-pages (game boards, reading view, settings details, the
// auth screen, …) deliberately suppress it so the user has a clear
// "you are deep, hit Back to surface" mental model.
//
// Keeping this list in sync with TAB_PATHS in App.tsx is intentional;
// they describe the same set from two angles.
const TAB_PATHS = new Set<string>([
  '/',
  '/games',
  '/chat',
  '/settings',
  '/duas',
  '/diwan',
  '/wellness',
]);

export default function BottomNav() {
  const { t } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const isVisible = TAB_PATHS.has(location.pathname);

  // Chat unread badge. The data already lives in postgres so we pull it
  // once and then re-pull on every realtime INSERT, identical to the
  // previous homepage badge but available globally now.
  const fetchUnread = useCallback(async () => {
    if (!user) { setUnreadCount(0); return; }
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    if (!convs || convs.length === 0) { setUnreadCount(0); return; }
    const ids = convs.map(c => c.id);
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .neq('sender_id', user.id)
      .eq('read', false);
    setUnreadCount(count || 0);
  }, [user]);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 60_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fetchUnread(), 800);
    };
    const ch = supabase
      .channel('bottomnav-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, debounced)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, debounced)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [user, fetchUnread]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Publish the nav's actual rendered height (which already includes
  // env(safe-area-inset-bottom) since we pad the nav by it) onto the
  // documentElement as `--app-bottom-inset`. Pages and bottom-anchored
  // widgets across the app reserve clearance with `padding-bottom:
  // var(--app-bottom-inset)` so nothing ever hides behind the bar.
  //
  // When the nav is hidden (sub-routes), the variable falls back to
  // just env(safe-area-inset-bottom) so deep pages don't carry a
  // phantom 60+px gutter.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const SAFE_ONLY = 'env(safe-area-inset-bottom, 0px)';

    if (!isVisible) {
      root.style.setProperty('--app-bottom-inset', SAFE_ONLY);
      return;
    }

    const el = navRef.current;
    if (!el) return;
    const update = () => {
      // getBoundingClientRect captures the full painted height,
      // including the safe-area padding-bottom that lives inside the nav.
      root.style.setProperty('--app-bottom-inset', `${el.getBoundingClientRect().height}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('orientationchange', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', update);
    };
  }, [isVisible]);

  // Show only on the seven top-level tab routes. On any deeper path the
  // nav vanishes so the focused screen owns the full viewport.
  if (!isVisible) return null;

  return (
    <nav
      ref={navRef}
      data-bottom-nav
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-2xl border-t border-border/40 shadow-[0_-4px_24px_rgba(0,0,0,0.25)]"
      dir="ltr"
      style={{
        contain: 'layout style',
        willChange: 'transform',
        transform: 'translateZ(0)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="px-1 py-1.5 flex items-center justify-around">
        {tabs.map(tab => {
          const active = isActive(tab.path);
          const showBadge = tab.key === 'chat' && unreadCount > 0;
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-xl"
              aria-label={t(tab.labelKey)}
              aria-current={active ? 'page' : undefined}
            >
              <div
                className="relative transition-transform duration-200 ease-out"
                style={{
                  transform: active ? 'translateY(-2px) scale(1.12)' : 'translateY(0) scale(1)',
                  filter: active ? 'drop-shadow(0 0 6px hsl(var(--primary) / 0.5))' : undefined,
                }}
              >
                <tab.icon className={`relative z-10 w-[20px] h-[20px] ${
                  active ? 'text-primary stroke-[2.2]' : 'text-muted-foreground/70 stroke-[1.5]'
                }`} />
                {showBadge && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9.5px] font-bold flex items-center justify-center leading-none shadow-sm"
                    aria-label={`${unreadCount} ${t('nav.chat')}`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={`relative z-10 text-[9.5px] ${
                active ? 'font-semibold text-primary' : 'font-medium text-muted-foreground/70'
              }`}>
                {t(tab.labelKey)}
              </span>
              {active && (
                <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
