/**
 * AchievementShelf — a medal case, not a checklist.
 *
 * Earned medals render as minted coins (tier metal), locked ones as dashed
 * silhouettes showing exactly what remains. Sorted earned-first then by
 * closeness, so the shelf reads "what you did / what you nearly did".
 */
import { memo, useMemo, useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Lock } from '@/lib/icons';
import { cn } from '@/lib/utils';

import type { AchievementTier } from '../progression/achievements';
import { ACHIEVEMENT_TIER_LABEL, ACHIEVEMENTS } from '../progression/achievements';
import type { ProgressionState } from '../progression/types';

interface Props {
  state: ProgressionState;
}

const COLLAPSED_COUNT = 6;

const TIER_METAL: Record<AchievementTier, { ring: string; face: string; ink: string }> = {
  bronze: { ring: '#b97f45', face: '#8f5f2e', ink: '#ffe9d2' },
  silver: { ring: '#c9cdd4', face: '#98a0ab', ink: '#ffffff' },
  gold: { ring: '#ecc451', face: '#c9992a', ink: '#fff8dd' },
  platinum: { ring: '#7fc4ec', face: '#3e8fc4', ink: '#eaf7ff' },
};

function MedalCoin({
  tier,
  unlocked,
  progress,
}: {
  tier: AchievementTier;
  unlocked: boolean;
  progress: number;
}) {
  const metal = TIER_METAL[tier];
  if (unlocked) {
    return (
      <span
        aria-hidden
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 32% 28%, ${metal.ring} 0%, ${metal.face} 62%, ${metal.face} 100%)`,
          boxShadow: `inset 0 0 0 2px rgba(255,255,255,.35), inset 0 -3px 6px rgba(0,0,0,.25)`,
        }}
      >
        <span
          className="absolute inset-[3px] rounded-full border border-dashed opacity-50"
          style={{ borderColor: metal.ink }}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground/60"
    >
      <Lock className="h-3.5 w-3.5" />
      {/* Remaining-progress arc hint */}
      {progress > 0 && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(hsl(var(--primary) / 0.55) ${progress * 360}deg, transparent ${progress * 360}deg)`,
            mask: 'radial-gradient(circle, transparent 62%, black 64%)',
            WebkitMask: 'radial-gradient(circle, transparent 62%, black 64%)',
          }}
        />
      )}
    </span>
  );
}

function AchievementShelfImpl({ state }: Props) {
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(() => {
    return ACHIEVEMENTS.map((achievement) => {
      const unlockedOn = state.achievements[achievement.id];
      const progress = unlockedOn ? 1 : (achievement.progress?.(state) ?? 0);
      return { achievement, unlockedOn, progress };
    }).sort((a, b) => {
      if (Boolean(a.unlockedOn) !== Boolean(b.unlockedOn)) return a.unlockedOn ? -1 : 1;
      return b.progress - a.progress;
    });
  }, [state]);

  const unlockedCount = rows.filter((r) => r.unlockedOn).length;
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_COUNT);
  const shelfRatio = rows.length > 0 ? unlockedCount / rows.length : 0;

  return (
    <AppCard as="section" aria-label="الإنجازات" className="relative overflow-hidden">
      <div className="p-0">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-title font-semibold text-foreground">خزانة الإنجازات</h2>
          <p className="text-mini tabular-nums text-muted-foreground" dir="rtl">
            <span dir="ltr">{unlockedCount}</span> من <span dir="ltr">{rows.length}</span>
          </p>
        </header>

        {/* Shelf fill bar */}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" dir="ltr">
          <div
            className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-slow ease-out-expo"
            style={{ transform: `scaleX(${shelfRatio})` }}
            role="progressbar"
            aria-valuenow={Math.round(shelfRatio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="نسبة الإنجازات المفتوحة"
          />
        </div>

        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visible.map(({ achievement, unlockedOn, progress }) => (
            <li
              key={achievement.id}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3 transition-colors',
                unlockedOn ? 'border-primary/40 bg-accent/30' : 'border-border',
              )}
            >
              <MedalCoin tier={achievement.tier} unlocked={Boolean(unlockedOn)} progress={progress} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p
                    className={cn(
                      'truncate text-meta font-bold',
                      unlockedOn ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {achievement.title}
                  </p>
                  <span className="shrink-0 text-micro text-muted-foreground">
                    {ACHIEVEMENT_TIER_LABEL[achievement.tier]}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-mini text-muted-foreground">{achievement.detail}</p>
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
      </div>
    </AppCard>
  );
}

export const AchievementShelf = memo(AchievementShelfImpl);
export default AchievementShelf;
