/**
 * ProfileCard — the player's standing, as an object you own.
 *
 * Layout: the rank emblem (physical shield) beside the level ring and XP math,
 * then four real stats, then the season strip with its progress toward a
 * perfect season. EVERY number renders from ProgressionState via useProgression
 * — nothing is estimated. The streak row is honest about state: current streak,
 * whether today is already banked, or "انقطعت" when yesterday was missed.
 */
import { memo } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Flame, Trophy } from '@/lib/icons';
import { cn } from '@/lib/utils';

import type { ProgressionState } from '../progression/types';
import { levelProgress, rankForLevel } from '../progression/xp';
import RankEmblem from './RankEmblem';

interface Props {
  state: ProgressionState;
}

const SEASON_FORMAT = new Intl.DateTimeFormat('ar', { month: 'long', year: 'numeric' });

function seasonLabel(id: string): string {
  const [year, month] = id.split('-').map(Number);
  if (!year || !month) return id;
  return SEASON_FORMAT.format(new Date(year, month - 1, 1));
}

/** Local day key — mirrors progression/award.ts `dayKey` exactly. */
function localDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ProfileCardImpl({ state }: Props) {
  const level = levelProgress(state.xp);
  const rank = rankForLevel(level.level);
  const winRate = state.matches > 0 ? Math.round((state.wins / state.matches) * 100) : 0;
  const unlocked = Object.keys(state.achievements).length;
  const total = ACHIEVEMENT_COUNT;

  // Streak semantics, derived — never stored guesses.
  const streak = state.streak.current > 0 ? state.streak : null;
  const streakBanked = streak !== null && state.streak.lastPlayedDay === localDayKey();

  // Season arc: this month's XP against the best of the last six months.
  const monthXps = [state.season.xp, ...state.seasonHistory.map((s) => s.xp)];
  const seasonBest = Math.max(...monthXps);
  const seasonRatio = seasonBest > 0 ? Math.min(1, state.season.xp / seasonBest) : 0;
  const recordSeason = state.season.xp >= seasonBest && state.season.xp > 0;

  return (
    <AppCard as="section" aria-label="ملف اللاعب" className="relative overflow-hidden">
      {/* Ambient glow tinted by the tier metal */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 start-1/2 h-40 w-[130%] -translate-x-1/2 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse at center, hsl(var(--primary) / 0.10) 0%, transparent 65%)',
        }}
      />

      <div className="relative flex items-center gap-4">
        <RankEmblem rank={rank} size={84} showNext={false} />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-hero font-semibold tabular-nums leading-none text-foreground" dir="ltr">
              {level.level}
            </span>
            <span className="text-micro text-muted-foreground">المستوى</span>
            <span className="ms-auto rounded-sm border border-border px-1.5 py-0.5 text-micro text-muted-foreground">
              {state.matches} جولة · {winRate}٪ فوز
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-3 text-mini text-muted-foreground">
            <span dir="rtl">
              <span className="tabular-nums text-foreground" dir="ltr">{state.xp}</span> نقطة إجمالية
            </span>
            {level.atMax ? (
              <span>القمة</span>
            ) : (
              <span dir="rtl">
                <span dir="ltr">{level.xpForLevel - level.xpInLevel}</span> للمستوى التالي
              </span>
            )}
          </div>

          {/* scaleX only — width animation relayouts the row. */}
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" dir="ltr">
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

          {/* Streak — live truth: burning when banked today, pending when not,
              absent (with best) when broken. */}
          {streak && streakBanked && (
            <p className="mt-1.5 flex items-center gap-1 text-mini font-semibold text-primary" dir="rtl">
              <Flame className="h-3.5 w-3.5" aria-hidden />
              سلسلة <span dir="ltr">{streak.current}</span> يوم — اليوم محسوب
            </p>
          )}
          {streak && !streakBanked && (
            <p className="mt-1.5 flex items-center gap-1 text-mini font-medium text-muted-foreground" dir="rtl">
              <Flame className="h-3.5 w-3.5 opacity-60" aria-hidden />
              سلسلة <span dir="ltr">{streak.current}</span> يوم — العب اليوم لتحصيلها
            </p>
          )}
          {!streak && state.streak.best > 0 && (
            <p className="mt-1.5 text-mini text-muted-foreground" dir="rtl">
              انقطعت السلسلة — أفضل سلسلة <span dir="ltr">{state.streak.best}</span> يوم
            </p>
          )}
        </div>
      </div>

      <dl className="relative mt-4 grid grid-cols-4 gap-2">
        <Stat label="جولات" value={state.matches} />
        <Stat label="فوز" value={state.wins} />
        <Stat label="إنجازات" value={`${unlocked}/${total}`} icon={unlocked > 0 ? Trophy : undefined} />
        <Stat label="أفضل سلسلة" value={state.streak.best} />
      </dl>

      {/* Season strip — real monthly XP vs your best recorded month. */}
      <div className="relative mt-3 border-t border-border pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-mini text-muted-foreground">موسم {seasonLabel(state.season.id)}</p>
          <p className="text-mini tabular-nums text-foreground" dir="rtl">
            <span dir="ltr">{state.season.xp}</span> نقطة ·{' '}
            <span dir="ltr">{state.season.wins}</span> فوز من{' '}
            <span dir="ltr">{state.season.matches}</span>
          </p>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted" dir="ltr">
            <div
              className={cn(
                'h-full w-full origin-left rounded-full transition-transform duration-slow ease-out-expo',
                recordSeason ? 'bg-primary' : 'bg-muted-foreground/60',
              )}
              style={{ transform: `scaleX(${seasonRatio})` }}
              aria-hidden
            />
          </div>
          {recordSeason && (
            <span className="shrink-0 text-micro font-bold text-primary">أفضل موسم لك</span>
          )}
        </div>
      </div>
    </AppCard>
  );
}

const ACHIEVEMENT_COUNT = 19; // keep in sync with achievements.ts length

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: typeof Flame;
}) {
  return (
    <div className="rounded-md border border-border p-2 text-center">
      <dt className="text-micro uppercase tracking-[0.10em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center justify-center gap-1 text-body font-semibold tabular-nums text-foreground">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" aria-hidden />}
        <span dir="ltr">{value}</span>
      </dd>
    </div>
  );
}

export const ProfileCard = memo(ProfileCardImpl);
export default ProfileCard;
