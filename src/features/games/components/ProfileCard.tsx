/**
 * ProfileCard — the player's standing at a glance.
 *
 * Replaces the hub's old "overall progress strip", which showed three unrelated
 * numbers summed across incompatible games (total wins + the Memory level +
 * the chess-puzzle rating) and had no notion of a level, a rank or a season.
 */
import { memo } from 'react';

import ProgressRing from '@/components/ProgressRing';
import { AppCard } from '@/components/ui/app-shell';
import { Flame, Trophy } from '@/lib/icons';
import { cn } from '@/lib/utils';

import type { ProgressionState } from '../progression/types';
import { levelProgress,type Rank } from '../progression/xp';

interface Props {
  state: ProgressionState;
  level: ReturnType<typeof levelProgress>;
  rank: Rank;
}

const SEASON_FORMAT = new Intl.DateTimeFormat('ar', { month: 'long', year: 'numeric' });

function seasonLabel(id: string): string {
  const [year, month] = id.split('-').map(Number);
  if (!year || !month) return id;
  return SEASON_FORMAT.format(new Date(year, month - 1, 1));
}

function ProfileCardImpl({ state, level, rank }: Props) {
  const winRate = state.matches > 0 ? Math.round((state.wins / state.matches) * 100) : 0;
  const unlocked = Object.keys(state.achievements).length;

  return (
    <AppCard as="section" aria-label="ملف اللاعب">
      <div className="flex items-start gap-4">
        <ProgressRing
          progress={level.ratio}
          size={76}
          thickness={4}
          label={`المستوى ${level.level}`}
        >
          <span className="flex flex-col items-center leading-none">
            <span className="text-title font-semibold tabular-nums text-foreground" dir="ltr">
              {level.level}
            </span>
            <span className="mt-0.5 text-micro text-muted-foreground">مستوى</span>
          </span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          {/* The heading already carries the tier name, so the kicker states the
              lifetime total instead of repeating it. */}
          <p className="text-micro font-semibold uppercase tracking-[0.16em] text-muted-foreground" dir="rtl">
            <span dir="ltr">{state.xp}</span> نقطة إجمالية
          </p>
          <h2 className="mt-0.5 text-title font-semibold text-foreground">{rank.label}</h2>
          <p className="mt-1 text-mini tabular-nums text-muted-foreground" dir="rtl">
            {level.atMax ? (
              'بلغت أعلى مستوى'
            ) : (
              <>
                <span dir="ltr">{level.xpInLevel}</span> / <span dir="ltr">{level.xpForLevel}</span> نقطة للمستوى
                القادم
              </>
            )}
          </p>

          {/* scaleX, never width — a width animation relayouts the row. */}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" dir="ltr">
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

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="الجولات" value={state.matches} />
        <Stat label="نسبة الفوز" value={`${winRate}%`} />
        <Stat
          label="التتابع"
          value={state.streak.current}
          icon={state.streak.current > 0 ? Flame : undefined}
        />
        <Stat label="الإنجازات" value={unlocked} icon={unlocked > 0 ? Trophy : undefined} />
      </dl>

      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <p className="text-mini text-muted-foreground">موسم {seasonLabel(state.season.id)}</p>
        <p className="text-mini tabular-nums text-foreground" dir="rtl">
          <span dir="ltr">{state.season.xp}</span> نقطة · <span dir="ltr">{state.season.matches}</span> جولة
        </p>
      </div>
    </AppCard>
  );
}

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
    <div className={cn('rounded-md border border-border p-2.5 text-center')}>
      <dt className="text-micro uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center justify-center gap-1 text-body font-semibold tabular-nums text-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
        <span dir="ltr">{value}</span>
      </dd>
    </div>
  );
}

export const ProfileCard = memo(ProfileCardImpl);
export default ProfileCard;
