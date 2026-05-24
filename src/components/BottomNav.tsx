import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

type GroupKey = 'spirit' | 'mind' | 'life';

type Group = {
  key: GroupKey;
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
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);

  // ── Chat unread badge ──────────────────────────────────────────────────
  // The data already lives in postgres so we pull it once and then re-pull
  // on every realtime INSERT/UPDATE. Identical behavior to the previous
  // homepage badge, just lifted to the global nav.
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

  // ── Auto-close behaviors ───────────────────────────────────────────────
  // Close the arc whenever the route changes or Escape is pressed.
  useEffect(() => { setOpenGroup(null); }, [location.pathname]);
  useEffect(() => {
    if (!openGroup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenGroup(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openGroup]);

  // ── Active branch / group resolution ───────────────────────────────────
  const isBranchActive = useCallback((path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
  [location.pathname]);

  const activeBranchByGroup = useMemo(() => {
    const map: Partial<Record<GroupKey, Branch>> = {};
    for (const g of groups) {
      const b = g.branches.find(br => isBranchActive(br.path));
      if (b) map[g.key] = b;
    }
    return map;
  }, [isBranchActive]);

  const activeGroupKey: GroupKey | null =
    (Object.keys(activeBranchByGroup) as GroupKey[])[0] ?? null;

  // Show only on the nine top-level tab routes. On any deeper path the
  // nav vanishes so the focused screen owns the full viewport.
  if (!TAB_PATHS.has(location.pathname)) return null;

  const open = openGroup;
  const openGroupObj = groups.find(g => g.key === open) ?? null;

  // The "you are here" pill rides the active group, but momentarily
  // jumps to whichever group is currently open so the arc reads as a
  // confident preview, not a disconnected popup.
  const pillGroupKey: GroupKey | null = open ?? activeGroupKey;

  return (
    <>
      {/* Soft dim + tap-out scrim. Sits below the nav but above the page
          so the open arc gets visual focus without obscuring the bar. */}
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label={t('nav.close')}
            onClick={() => setOpenGroup(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <nav
        data-bottom-nav
        className="bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-2xl border-t border-border/40"
        dir="ltr"
        style={{
          contain: 'layout style',
          willChange: 'transform',
          transform: 'translateZ(0)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          // Hairline + soft glow instead of a heavy box-shadow.
          boxShadow:
            '0 -1px 0 hsl(var(--border) / 0.4), 0 -10px 28px -12px rgba(0,0,0,0.22)',
        }}
      >
        <div className="relative px-2 pt-2 pb-1.5 flex items-stretch justify-around">
          {groups.map(group => {
            const active = activeGroupKey === group.key;
            const isOpen = open === group.key;
            const groupHasUnread = group.branches.some(b => b.key === 'chat') ? unreadCount : 0;
            const activeBranch = activeBranchByGroup[group.key];

            // When a branch within this group is active, morph the
            // group's icon AND label to that branch's identity. The user
            // sees "Spirit › Diwan" reduced to a single Feather icon
            // labelled "ديوان" — instant, frictionless context.
            const DisplayIcon = activeBranch?.icon ?? group.icon;
            const displayLabelKey = activeBranch?.labelKey ?? group.labelKey;
            const iconMorphKey = activeBranch?.key ?? `g-${group.key}`;

            return (
              <div key={group.key} className="relative flex-1 flex justify-center">
                {/* Arc popup — 3 branches fan upward in a 90° arc */}
                <AnimatePresence>
                  {isOpen && openGroupObj?.key === group.key && (
                    <motion.div
                      key="arc"
                      className="absolute left-1/2 -translate-x-1/2 bottom-1/2 pointer-events-none"
                      style={{ width: 1, height: 1 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {group.branches.map((b, i) => {
                        // Classic fan-menu: 3 circular icons spring out
                        // from the group center along a 90° arc. Order
                        // 135°/90°/45° keeps the active branch (always
                        // index-bound to the data, not the route) in a
                        // predictable position.
                        const angles = [135, 90, 45];
                        const angle = (angles[i] * Math.PI) / 180;
                        const R = 74;
                        const x = Math.cos(angle) * R;
                        const y = -Math.sin(angle) * R;
                        const branchActive = isBranchActive(b.path);
                        const showBadge = b.key === 'chat' && unreadCount > 0;
                        const BIcon = b.icon;

                        return (
                          <motion.div
                            key={b.key}
                            className="absolute pointer-events-none"
                            style={{ left: 0, top: 0 }}
                            initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                            animate={{ x, y, scale: 1, opacity: 1 }}
                            exit={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                            transition={{
                              type: 'spring',
                              stiffness: 340,
                              damping: 22,
                              delay: i * 0.035,
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenGroup(null);
                                navigate(b.path);
                              }}
                              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                              aria-label={t(b.labelKey)}
                              aria-current={branchActive ? 'page' : undefined}
                            >
                              <div className={`relative w-12 h-12 rounded-full flex items-center justify-center border ${
                                branchActive
                                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.55)]'
                                  : 'bg-card text-foreground border-border/40 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.4)]'
                              }`}>
                                <BIcon
                                  className="w-[20px] h-[20px]"
                                  strokeWidth={branchActive ? 2.2 : 1.8}
                                />
                                {showBadge && (
                                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9.5px] font-bold flex items-center justify-center leading-none shadow">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                  </span>
                                )}
                              </div>
                              {/* Floating label under the branch icon */}
                              <span className="absolute top-[52px] px-1.5 py-0.5 rounded-md bg-popover/95 text-popover-foreground text-[10px] font-medium whitespace-nowrap shadow-sm border border-border/40 leading-none">
                                {t(b.labelKey)}
                              </span>
                            </button>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : group.key)}
                  className="relative w-full flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl"
                  aria-label={t(displayLabelKey)}
                  aria-expanded={isOpen}
                  aria-current={active ? 'page' : undefined}
                >
                  {/* M3 sliding active-pill — a single instance shared
                      across all groups via framer's layoutId so it
                      animates between cells on selection. */}
                  {pillGroupKey === group.key && (
                    <motion.div
                      layoutId="bn-active-pill"
                      className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-7 rounded-full bg-primary/15"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      aria-hidden
                    />
                  )}

                  <div
                    className="relative transition-transform duration-200 ease-out"
                    style={{
                      transform: isOpen
                        ? 'translateY(-2px) scale(1.10)'
                        : active ? 'translateY(-1px) scale(1.06)' : 'translateY(0) scale(1)',
                    }}
                  >
                    {/* Group icon morphs to the active branch's icon
                        with a brief spring rotation when the route
                        changes. Adds personality without distraction. */}
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={iconMorphKey}
                        className="block"
                        initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.7, rotate: 10 }}
                        transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
                      >
                        <DisplayIcon
                          className={`relative z-10 w-[22px] h-[22px] mx-auto ${
                            (active || isOpen)
                              ? 'text-primary stroke-[2.2]'
                              : 'text-muted-foreground/70 stroke-[1.7]'
                          }`}
                        />
                      </motion.span>
                    </AnimatePresence>

                    {!isOpen && groupHasUnread > 0 && (
                      <span
                        className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9.5px] font-bold flex items-center justify-center leading-none shadow-sm"
                        aria-label={`${groupHasUnread} ${t('nav.chat')}`}
                      >
                        {groupHasUnread > 99 ? '99+' : groupHasUnread}
                      </span>
                    )}
                  </div>

                  <span
                    className={`relative z-10 text-[10.5px] leading-none transition-opacity duration-200 ${
                      (active || isOpen)
                        ? 'opacity-100 font-semibold text-primary'
                        : 'opacity-70 font-medium text-muted-foreground/70'
                    }`}
                  >
                    {t(displayLabelKey)}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
}
