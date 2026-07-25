/**
 * GameMasteryCard — one game, its mastery tier, and every mode it offers.
 *
 * The old hub card showed a game name, up to four decorative mode strings and a
 * raw win count. Modes were not addressable and mastery did not exist. Here each
 * mode is a real entry point with its own record, and the mastery bar states
 * exactly how much XP is left to the next tier.
 */
import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppCard } from '@/components/ui/app-shell';
import { ChevronDown, ChevronLeft, Star } from '@/lib/icons';
import { prefetchRoute } from '@/lib/routePrefetch';
import { cn } from '@/lib/utils';

import type { GameDef } from '../data/modes';
import type { MasteryState } from '../progression/types';
import { MASTERY_THRESHOLDS, type MasteryProgress } from '../progression/xp';

interface Props {
  game: GameDef;
  mastery: MasteryProgress;
  stats: MasteryState;
  icon: React.ComponentType<{ className?: string }>;
}

const MAX_TIER = MASTERY_THRESHOLDS.length - 1;

function GameMasteryCardImpl({ game, mastery, stats, icon: Icon }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  return (
    <AppCard as="section" aria-label={game.label}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h2 className="truncate text-title font-semibold text-foreground">{game.label}</h2>
            <span className="shrink-0 text-mini text-muted-foreground">{mastery.label}</span>
          </div>
          <p className="mt-0.5 text-mini text-muted-foreground">{game.tagline}</p>
        </div>

        {/* Mastery stars — the tier, encoded so it is readable without the label. */}
        <div className="flex shrink-0 items-center gap-0.5" aria-label={`رتبة الإتقان ${mastery.tier} من ${MAX_TIER}`}>
          {Array.from({ length: MAX_TIER }, (_, i) => (
            <Star
              key={i}
              className={cn('h-3 w-3', i < mastery.tier ? 'text-primary' : 'text-muted-foreground/35')}
              fill={i < mastery.tier ? 'currentColor' : undefined}
              aria-hidden
            />
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" dir="ltr">
          <div
            className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-slow ease-out-expo"
            style={{ transform: `scaleX(${mastery.ratio})` }}
            role="progressbar"
            aria-valuenow={Math.round(mastery.ratio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`التقدّم نحو رتبة الإتقان القادمة في ${game.label}`}
          />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3 text-mini text-muted-foreground">
          <span dir="rtl">
            <span className="tabular-nums" dir="ltr">
              {stats.wins}
            </span>{' '}
            فوز من{' '}
            <span className="tabular-nums" dir="ltr">
              {stats.played}
            </span>{' '}
            جولة
          </span>
          <span className="tabular-nums" dir="rtl">
            {mastery.remaining === null ? (
              'أعلى رتبة'
            ) : (
              <>
                <span dir="ltr">{mastery.remaining}</span> نقطة للرتبة القادمة
              </>
            )}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(game.path)}
          onMouseEnter={() => prefetchRoute(game.path)}
          className="flex h-11 flex-1 items-center justify-between rounded-button bg-primary px-4 text-meta font-semibold text-primary-foreground transition-transform duration-normal ease-out-expo hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>العب</span>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex h-11 items-center gap-1.5 rounded-button border border-border px-3 text-meta font-semibold text-foreground transition-colors duration-fast hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="tabular-nums" dir="ltr">
            {game.modes.length}
          </span>
          أنماط
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-normal ease-out-expo', expanded && 'rotate-180')}
            aria-hidden
          />
        </button>
      </div>

      {/* Mode list. Rendered/unrendered rather than height-animated: animating
          height forces layout, which the design system forbids. */}
      {expanded && (
        <ul className="mt-3 space-y-2 border-t border-border pt-3">
          {game.modes.map((mode) => {
            const record = stats.records[mode.id];
            return (
              <li key={mode.id}>
                <button
                  type="button"
                  onClick={() => navigate(mode.path)}
                  onMouseEnter={() => prefetchRoute(mode.path)}
                  className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-start transition-[transform,background-color] duration-normal ease-out-expo hover:-translate-y-0.5 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-meta font-semibold text-foreground">{mode.label}</span>
                      {mode.flagship && (
                        <span className="shrink-0 rounded-sm border border-primary/50 px-1.5 text-micro text-foreground">
                          موسّع
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-mini text-muted-foreground">{mode.detail}</span>
                    {record !== undefined && mode.recordLabel && (
                      <span className="mt-1 block text-micro tabular-nums text-muted-foreground" dir="rtl">
                        {mode.recordLabel}: <span dir="ltr">{record}</span>
                      </span>
                    )}
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </AppCard>
  );
}

export const GameMasteryCard = memo(GameMasteryCardImpl);
export default GameMasteryCard;
