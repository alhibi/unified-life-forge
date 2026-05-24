import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
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

// Three top-level groups. Tapping a group reveals a horizontal pill
// above the bar with the group's three branches.
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
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);

  // ── Auto-close behaviors ───────────────────────────────────────────────
  // Close the popup whenever the route changes or Escape is pressed.
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
  // jumps to whichever group is currently open so the popup reads as a
  // confident preview, not a disconnected layer.
  const pillGroupKey: GroupKey | null = open ?? activeGroupKey;

  return (
    <>
      {/* Soft dim + tap-out scrim. Sits below the nav but above the page
          so the open popup gets visual focus without obscuring the bar. */}
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

      {/* ── Branch popup ───────────────────────────────────────────────────
          A horizontal pill above the bar with the group's three branches
          as icon-over-label tiles. Rendered as a fixed sibling of <nav>
          (not a child) so the nav's contain/transform/backdrop-filter
          stack can't clip or distort it, and so it inherits the page's
          natural direction (RTL for Arabic). All colors come from the
          design-token palette so the popup looks like part of the app
          in both light and dark themes. */}
      <AnimatePresence>
        {open && openGroupObj && (
          <motion.div
            key={`pop-${openGroupObj.key}`}
            className="fixed left-1/2 -translate-x-1/2 z-[55] pointer-events-none px-4"
            // Lift the popup well clear of the nav so there's no visual
            // collision with the bar's chrome or its active-tab pill.
            // 96px ≈ nav height (~62px) + safe-area + a generous gap.
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
            initial={{ opacity: 0, y: 14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div
              className="pointer-events-auto flex items-stretch gap-1 p-1.5 rounded-full bg-popover border border-border"
              style={{
                // Token-based shadow — adapts naturally to dark mode by
                // keying off --foreground instead of hard-coded black.
                boxShadow:
                  '0 10px 28px -10px hsl(var(--foreground) / 0.20), 0 2px 8px -3px hsl(var(--foreground) / 0.10)',
              }}
            >
              {openGroupObj.branches.map((b, i) => {
                const branchActive = isBranchActive(b.path);
                const showBadge = b.key === 'chat' && unreadCount > 0;
                const BIcon = b.icon;

                return (
                  <motion.button
                    key={b.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenGroup(null);
                      navigate(b.path);
                    }}
                    // Active state mirrors the bottom-nav's sliding pill:
                    // primary/15 background + primary text. Same visual
                    // language across the whole nav surface.
                    className={`relative flex flex-col items-center justify-center gap-1.5 px-5 py-2.5 rounded-full min-w-[84px] transition-colors ${
                      branchActive
                        ? 'bg-primary/15'
                        : 'hover:bg-muted/60 active:bg-muted/80'
                    }`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 + i * 0.04, duration: 0.18 }}
                    aria-label={t(b.labelKey)}
                    aria-current={branchActive ? 'page' : undefined}
                  >
                    <div className="relative">
                      <BIcon
                        className={`w-[22px] h-[22px] ${
                          branchActive ? 'text-primary' : 'text-muted-foreground'
                        }`}
                        strokeWidth={branchActive ? 2.2 : 1.8}
                      />
                      {showBadge && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9.5px] font-bold flex items-center justify-center leading-none shadow-sm">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] leading-none whitespace-nowrap ${
                        branchActive
                          ? 'font-semibold text-primary'
                          : 'font-medium text-muted-foreground'
                      }`}
                    >
                      {t(b.labelKey)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        data-bottom-nav
        className="bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-2xl border-t border-border/40"
        dir="ltr"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          // Hairline + soft glow instead of a heavy box-shadow.
          boxShadow:
            '0 -1px 0 hsl(var(--border) / 0.4), 0 -10px 28px -12px hsl(var(--foreground) / 0.18)',
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
