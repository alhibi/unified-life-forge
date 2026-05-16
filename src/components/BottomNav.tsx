import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { House, Dices, SlidersHorizontal, HandHeart, Feather, MessageCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

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
  { key: 'duas', path: '/duas', icon: HandHeart, labelKey: 'nav.duas' },
  { key: 'diwan', path: '/diwan', icon: Feather, labelKey: 'nav.diwan' },
];

// Hide the persistent bottom nav while the user is reading a Diwan poem or
// drafting voice notes inside the chat composer in landscape — adding more
// routes here keeps the surface area minimal.
const HIDE_ON_PATHS: RegExp[] = [
  /^\/auth$/,
];

export default function BottomNav() {
  const { t } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

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
    const ch = supabase
      .channel('bottomnav-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchUnread]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  if (HIDE_ON_PATHS.some(re => re.test(location.pathname))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      dir="ltr"
      style={{ contain: 'layout style', willChange: 'transform', transform: 'translateZ(0)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-2 mb-2 rounded-2xl bg-card/70 backdrop-blur-2xl border border-border/30 shadow-[0_-4px_30px_rgba(0,0,0,0.3)] px-1 py-1.5 flex items-center justify-around">
        {tabs.map(tab => {
          const active = isActive(tab.path);
          const showBadge = tab.key === 'chat' && unreadCount > 0;
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl"
              aria-label={t(tab.labelKey)}
              aria-current={active ? 'page' : undefined}
            >
              <motion.div
                animate={active ? { y: -2, scale: 1.12 } : { y: 0, scale: 1 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={active ? { filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.5))' } : {}}
                className="relative"
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
              </motion.div>
              <span className={`relative z-10 text-[9.5px] ${
                active ? 'font-semibold text-primary' : 'font-medium text-muted-foreground/70'
              }`}>
                {t(tab.labelKey)}
              </span>
              {active && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
