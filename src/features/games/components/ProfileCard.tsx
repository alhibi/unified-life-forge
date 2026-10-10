/**
 * ProfileCard — the player's stage.
 *
 * Hero surface of the arcade: the rank emblem, the level with its exact XP
 * math, a progress bar, the last-seven-days win dots, and a season sparkline
 * rendered from the REAL monthly history the award pipeline archives.
 *
 * System pass: the ambient identity gradients, film grain and the emblem
 * halo were removed (design-system §0 bans decorative gradients, noise and
 * glow in UI chrome). Identity is carried by the emblem itself, the primary
 * accent and the data-bearing marks — tone and hairlines only.
 *
 * Honesty contract: every glyph traces back to ProgressionState —
 *   • win dots        ← firstWinDays + streak.lastPlayedDay
 *   • sparkline       ← season.xp + seasonHistory[].xp
 *   • streak copy     ← derived from lastPlayedDay vs today (banked/pending/broken)
 * Nothing is estimated; empty states say so.
 */
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { memo, useEffect } from 'react';

import { AppCard, Stat, StatGrid } from '@/components/ui/app-shell';
import { Flame } from '@/lib/icons';
import { EASE_OUT_QUAD } from '@/lib/motion';
import { cn } from '@/lib/utils';

import { ACHIEVEMENTS } from '../progression/achievements';
import type { ProgressionState } from '../progression/types';
import { levelProgress, rankForLevel } from '../progression/xp';
import RankEmblem from './RankEmblem';

interface Props {
  state: ProgressionState;
}

/** Local day key — mirrors progression/award.ts `dayKey`. */
function localDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ProfileCardImpl({ state }: Props) {
  const reduce = useReducedMotion();
  const level = levelProgress(state.xp);
  const rank = rankForLevel(level.level);
  const winRate = state.matches > 0 ? Math.round((state.wins / state.matches) * 100) : 0;
  const unlocked = Object.keys(state.achievements).length;

  // Count-up for the lifetime XP — a fast, one-shot settle, not a gimmick loop.
  const xpMotion = useMotionValue(reduce ? state.xp : Math.min(state.xp, state.xp * 0.4));
  const xpText = useTransform(xpMotion, (v) => Math.round(v).toLocaleString('en-US'));
  useEffect(() => {
    if (reduce) return;
    const controls = animate(xpMotion, state.xp, {
      duration: 0.9,
      ease: [...EASE_OUT_QUAD],
    });
    return () => controls.stop();
  }, [state.xp, reduce, xpMotion]);

  // ── Win dots: the real last seven local days ──
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = localDayKey(d);
    const active = state.firstWinDays.includes(key) || state.streak.lastPlayedDay === key;
    return { key, active, isToday: i === 6 };
  });

  // ── Season sparkline: chronological, current month highlighted ──
  const seasonBars = [
    ...state.seasonHistory.map((s) => ({ id: s.id, xp: s.xp })),
    { id: state.season.id, xp: state.season.xp },
  ].slice(-6);
  const seasonMax = Math.max(1, ...seasonBars.map((b) => b.xp));

  // ── Streak truth ──
  const streak = state.streak.current > 0 ? state.streak : null;
  const streakBanked = streak !== null && state.streak.lastPlayedDay === localDayKey();

  const monthShort = (id: string) => {
    const [y, m] = id.split('-').map(Number);
    if (!y || !m) return id;
    return new Date(y, m - 1).toLocaleDateString('ar', { month: 'short' });
  };

  return (
    <AppCard as="section" aria-label="ملف اللاعب" className="relative overflow-hidden">
      <div className="relative p-5">
        {/* ── Identity row ── */}
        <div className="flex items-center gap-4">
          <RankEmblem rank={rank} size={92} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-micro text-muted-foreground">المستوى</span>
              <span
                className="text-display font-bold leading-none tabular-nums text-foreground"
                dir="ltr"
              >
                {level.level}
              </span>
            </div>

            {/* Division pips echo the shield notches */}
            <div className="mt-1.5 flex items-center gap-1" aria-hidden>
              {Array.from({ length: rank.tier.divisions }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 w-4 rounded-full',
                    i < rank.division ? 'bg-primary' : 'bg-muted-foreground/25',
                  )}
                />
              ))}
              <span className="ms-1 text-micro font-bold text-foreground">{rank.label}</span>
            </div>

            <p className="mt-2 flex items-baseline gap-1.5 text-mini text-muted-foreground">
              <motion.span className="text-body font-bold tabular-nums text-foreground" dir="ltr">
                {xpText}
              </motion.span>
              نقطة إجمالية
              {!level.atMax && (
                <span className="ms-auto tabular-nums" dir="rtl">
                  متبقٍ <span dir="ltr">{level.xpForLevel - level.xpInLevel}</span> للمستوى التالي
                </span>
              )}
            </p>

            {/* XP progress — scaleX only, no decorative shimmer */}
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted/70" dir="ltr">
              <div
                className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-slow ease-out-expo"
                style={{ transform: `scaleX(${level.ratio})` }}
                role="progressbar"
                aria-valuenow={Math.round(level.ratio * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="التقدّم في المستوى الحالي"
              />
            </div>
          </div>
        </div>

        {/* ── Facts strip — the canonical stat grid ── */}
        <StatGrid cols={4} className="mt-4 border-t border-border pt-3">
          <Stat value={state.matches} label="جولات" />
          <Stat value={`${winRate}٪`} label="نسبة الفوز" />
          <Stat value={`${unlocked}/${ACHIEVEMENTS.length}`} label="إنجازات" />
          <Stat value={state.streak.best} label="أفضل سلسلة" />
        </StatGrid>

        {/* ── Activity: week dots + streak sentence + season sparkline ── */}
        <div className="mt-3 flex items-end justify-between gap-4 border-t border-border pt-3.5">
          <div className="min-w-0">
            <p className="text-micro text-muted-foreground">آخر ٧ أيام</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              {weekDays.map((d) => (
                <span
                  key={d.key}
                  title={d.key}
                  aria-label={`${d.key}${d.active ? ' — يوم فوز' : ''}`}
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    d.active ? 'bg-primary' : 'bg-muted-foreground/25',
                    d.isToday && !d.active && 'ring-1 ring-primary/50',
                  )}
                />
              ))}
              {streak && (
                <span
                  className={cn(
                    'ms-2 flex items-center gap-1 text-mini font-bold',
                    streakBanked ? 'text-primary' : 'text-muted-foreground',
                  )}
                  dir="rtl"
                >
                  <Flame className="h-3.5 w-3.5" aria-hidden />
                  {streakBanked ? `اليوم محسوب · ${streak.current}` : `${streak.current} — العب اليوم`}
                </span>
              )}
              {!streak && state.streak.best > 0 && (
                <span className="ms-2 text-mini text-muted-foreground" dir="rtl">
                  انقطعت · الأفضل <span dir="ltr">{state.streak.best}</span>
                </span>
              )}
            </div>
          </div>

          {/* Season arc — data only: bar height encodes real monthly XP */}
          <div className="shrink-0 text-end">
            <p className="text-micro text-muted-foreground">مسار الموسم</p>
            <div className="mt-1 flex h-10 items-end justify-end gap-1" dir="ltr">
              {seasonBars.map((b, i) => (
                <span
                  key={b.id}
                  title={`${monthShort(b.id)}: ${b.xp}`}
                  className={cn(
                    'w-3 origin-bottom rounded-t-sm transition-transform duration-slow ease-out-expo',
                    i === seasonBars.length - 1 ? 'bg-primary' : 'bg-primary/35',
                  )}
                  style={{ transform: `scaleY(${Math.max(0.08, b.xp / seasonMax)})`, height: 40 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppCard>
  );
}

export const ProfileCard = memo(ProfileCardImpl);
export default ProfileCard;
