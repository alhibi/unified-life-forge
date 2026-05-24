import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  House, Dices, SlidersHorizontal, HandHeart, Feather, MessageCircle,
  HeartPulse, Newspaper, Moon, Heart, Brain, Sparkles,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

type Branch = {
  key: string;
  path: string;
  icon: typeof House;
  labelKey: string;
};

type Group = {
  key: 'spirit' | 'mind' | 'life';
  labelKey: string;
  icon: typeof House;
  branches: Branch[];
};

// Three top-level groups. Tapping a group opens a 3-icon arc above it.
const groups: Group[] = [
  {
    key: 'spirit', labelKey: 'nav.spirit', icon: Heart,
    branches: [
      { key: 'duas',   path: '/duas',                  icon: HandHeart, labelKey: 'nav.duas' },
      { key: 'diwan',  path: '/diwan',                 icon: Feather,   labelKey: 'nav.diwan' },
      { key: 'sunnah', path: '/section/timed-sunnah',  icon: Moon,      labelKey: 'nav.sunnah' },
    ],
  },
  {
    key: 'mind', labelKey: 'nav.mind', icon: Brain,
    branches: [
      { key: 'games',   path: '/games',   icon: Dices,         labelKey: 'nav.games' },
      { key: 'reading', path: '/reading', icon: Newspaper,     labelKey: 'nav.reading' },
      { key: 'chat',    path: '/chat',    icon: MessageCircle, labelKey: 'nav.chat' },
    ],
  },
  {
    key: 'life', labelKey: 'nav.life', icon: Sparkles,
    branches: [
      { key: 'home',     path: '/',         icon: House,             labelKey: 'nav.home' },
      { key: 'wellness', path: '/wellness', icon: HeartPulse,        labelKey: 'nav.wellness' },
      { key: 'settings', path: '/settings', icon: SlidersHorizontal, labelKey: 'nav.settings' },
    ],
  },
];

// The bottom nav is visible on every "branch destination" (the 9 routes
// reachable from the three groups). Deeper sub-pages (game boards,
// reading articles, settings details, auth screen, …) suppress it so the
// user has a clear "you are deep, hit Back to surface" mental model.
const TAB_PATHS = new Set<string>([
  '/', '/games', '/chat', '/settings', '/duas', '/diwan',
  '/wellness', '/reading', '/section/timed-sunnah',
]);

export default function BottomNav() {
  const { t } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [openGroup, setOpenGroup] = useState<Group['key'] | null>(null);

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

  // Close the arc whenever the route changes.
  useEffect(() => { setOpenGroup(null); }, [location.pathname]);

  const isBranchActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const activeGroupKey: Group['key'] | null =
    groups.find(g => g.branches.some(b => isBranchActive(b.path)))?.key ?? null;

  // Show only on the seven top-level tab routes. On any deeper path the
  // nav vanishes so the focused screen owns the full viewport.
  if (!TAB_PATHS.has(location.pathname)) return null;

  const open = openGroup;
  const openGroupObj = groups.find(g => g.key === open) ?? null;

  return (
    <>
    {/* Tap-outside scrim to close the arc */}
    {open && (
      <button
        type="button"
        aria-label="close"
        onClick={() => setOpenGroup(null)}
        className="fixed inset-0 z-40 bg-transparent"
      />
    )}
    <nav
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
      <div className="relative px-1.5 py-1.5 flex items-stretch justify-around">
        {groups.map(group => {
          const active = activeGroupKey === group.key;
          const isOpen = open === group.key;
          const groupUnread = group.branches.some(b => b.key === 'chat') ? unreadCount : 0;
          const Icon = group.icon;
          return (
            <div key={group.key} className="relative flex-1 flex justify-center">
              {/* Arc popup — 3 branches fan upward in a 180° arc */}
              {isOpen && openGroupObj?.key === group.key && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-1/2 pointer-events-none"
                  style={{ width: 1, height: 1 }}
                >
                  {group.branches.map((b, i) => {
                    // Classic fan-menu: 3 circular icons spring out from
                    // the button center. 60° spread keeps the arc inside
                    // narrow viewports even for edge groups.
                    const angles = [135, 90, 45];
                    const angle = (angles[i] * Math.PI) / 180;
                    const R = 70;
                    const x = Math.cos(angle) * R;
                    const y = -Math.sin(angle) * R;
                    const branchActive = isBranchActive(b.path);
                    const showBadge = b.key === 'chat' && unreadCount > 0;
                    const BIcon = b.icon;
                    return (
                      <button
                        key={b.key}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenGroup(null);
                          navigate(b.path);
                        }}
                        className="pointer-events-auto absolute"
                        style={{
                          left: 0,
                          top: 0,
                          ['--tx' as any]: `${x}px`,
                          ['--ty' as any]: `${y}px`,
                          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                          animation: `fanIn 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                          animationDelay: `${i * 45}ms`,
                        }}
                        aria-label={t(b.labelKey)}
                      >
                        <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-[0_10px_28px_rgba(0,0,0,0.45)] border border-border/40 ${
                          branchActive ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
                        }`}>
                          <BIcon className="w-[20px] h-[20px]" strokeWidth={branchActive ? 2.2 : 1.8} />
                          {showBadge && (
                            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9.5px] font-bold flex items-center justify-center leading-none shadow">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setOpenGroup(isOpen ? null : group.key)}
                className="relative w-full flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl"
                aria-label={t(group.labelKey)}
                aria-expanded={isOpen}
                aria-current={active ? 'page' : undefined}
              >
                <div
                  className="relative transition-transform duration-200 ease-out"
                  style={{
                    transform: isOpen
                      ? 'translateY(-3px) scale(1.15)'
                      : active ? 'translateY(-2px) scale(1.12)' : 'translateY(0) scale(1)',
                    filter: (active || isOpen) ? 'drop-shadow(0 0 6px hsl(var(--primary) / 0.5))' : undefined,
                  }}
                >
                  <Icon className={`relative z-10 w-[22px] h-[22px] mx-auto ${
                    (active || isOpen) ? 'text-primary stroke-[2.2]' : 'text-muted-foreground/70 stroke-[1.6]'
                  }`} />
                  {!isOpen && groupUnread > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9.5px] font-bold flex items-center justify-center leading-none shadow-sm"
                      aria-label={`${groupUnread} ${t('nav.chat')}`}
                    >
                      {groupUnread > 99 ? '99+' : groupUnread}
                    </span>
                  )}
                </div>
                <span className={`relative z-10 text-[10.5px] leading-none ${
                  (active || isOpen) ? 'font-semibold text-primary' : 'font-medium text-muted-foreground/70'
                }`}>
                  {t(group.labelKey)}
                </span>
                {active && !isOpen && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </nav>
    </>
  );
}
