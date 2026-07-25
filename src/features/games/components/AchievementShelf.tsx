/**
 * AchievementShelf — every achievement, earned or not, with real progress.
 *
 * Locked badges are shown, not hidden: a shelf that only lists what you already
 * have gives you nothing to aim at. Partially-earned badges show their progress
 * bar, which is only possible because each achievement declares a `progress`
 * function alongside its `check`.
 */
import { memo, useMemo, useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Check, Lock } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { ACHIEVEMENT_TIER_LABEL,ACHIEVEMENTS } from '../progression/achievements';
import type { ProgressionState } from '../progression/types';

interface Props {
  state: ProgressionState;
}

const COLLAPSED_COUNT = 6;

function AchievementShelfImpl({ state }: Props) {
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(() => {
    return ACHIEVEMENTS.map((achievement) => {
      const unlockedOn = state.achievements[achievement.id];
      const progress = unlockedOn ? 1 : (achievement.progress?.(state) ?? 0);
      return { achievement, unlockedOn, progress };
    }).sort((a, b) => {
      // Earned first, then whatever is closest to being earned — the shelf reads
      // as "what you did / what you nearly did".
      if (Boolean(a.unlockedOn) !== Boolean(b.unlockedOn)) return a.unlockedOn ? -1 : 1;
      return b.progress - a.progress;
    });
  }, [state]);

  const unlockedCount = rows.filter((r) => r.unlockedOn).length;
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_COUNT);

  return (
    <AppCard as="section" aria-label="الإنجازات">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-title font-semibold text-foreground">الإنجازات</h2>
        <p className="text-mini tabular-nums text-muted-foreground" dir="rtl">
          <span dir="ltr">{unlockedCount}</span> من <span dir="ltr">{rows.length}</span>
        </p>
      </header>

      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visible.map(({ achievement, unlockedOn, progress }) => (
          <li
            key={achievement.id}
            className={cn(
              'rounded-md border p-3',
              unlockedOn ? 'border-primary/60 bg-accent/40' : 'border-border',
            )}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border',
                  unlockedOn
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground',
                )}
                aria-hidden
              >
                {unlockedOn ? <Check className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p
                    className={cn(
                      'truncate text-meta font-semibold',
                      unlockedOn ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {achievement.title}
                  </p>
                  <span className="shrink-0 text-micro text-muted-foreground">
                    {ACHIEVEMENT_TIER_LABEL[achievement.tier]}
                  </span>
                </div>
                <p className="mt-0.5 text-mini text-muted-foreground">{achievement.detail}</p>

                {!unlockedOn && progress > 0 && (
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted" dir="ltr">
                    <span
                      className="block h-full w-full origin-left rounded-full bg-primary transition-transform duration-normal ease-out-expo"
                      style={{ transform: `scaleX(${progress})` }}
                    />
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {rows.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 h-11 w-full rounded-button border border-border text-meta font-semibold text-foreground transition-colors duration-fast hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? 'إخفاء' : `عرض الكل (${rows.length})`}
        </button>
      )}
    </AppCard>
  );
}

export const AchievementShelf = memo(AchievementShelfImpl);
export default AchievementShelf;
