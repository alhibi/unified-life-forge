/**
 * GameMasteryCard — an immersive game plate, not a list row.
 *
 * Design: the game's identity accent (one hue from the shared data palette —
 * a documented colour key), mastery as a segmented strip (each segment = one
 * tier), and modes as a tappable chip-cloud — visible at a glance instead of
 * hidden behind a disclosure. Records and coverage come from MasteryState;
 * unplayed games say "لم تُلاعب بعد" honestly.
 *
 * System pass: the identity wash gradient, film grain, corner watermark and
 * the gradient CTA with its glow shadow were removed (design-system §0 bans
 * decorative gradients, noise and shadows). Identity survives in tinted
 * plates, hairlines and the accent itself; the CTA is the canonical Button.
 */
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppCard, IconChip } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Star } from '@/lib/icons';
import { prefetchRoute } from '@/lib/routePrefetch';
import { cn } from '@/lib/utils';

import type { GameDef } from '../data/modes';
import type { MasteryState } from '../progression/types';
import { MASTERY_THRESHOLDS, type MasteryProgress } from '../progression/xp';
import type { GameIdentity } from './gameIdentity';

interface Props {
  game: GameDef;
  mastery: MasteryProgress;
  stats: MasteryState;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  identity: GameIdentity;
}

const MAX_TIER = MASTERY_THRESHOLDS.length - 1;

function GameMasteryCardImpl({ game, mastery, stats, icon: Icon }: Props) {
  const navigate = useNavigate();

  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : null;
  const playedModes = stats.modesPlayed.length;
  const totalModes = game.modes.length;
  const bestRecord = Object.values(stats.records).length
    ? Math.max(...Object.values(stats.records))
    : null;

  return (
    <AppCard tone={game.id === 'sudoku' ? 4 : game.id === 'chess' ? 6 : 5} as="section" aria-label={game.label} className="relative overflow-hidden">
      <div className="relative">
        {/* Header */}
        <div className="flex items-start gap-3">
          <IconChip
            className="widget-icon-well"
            aria-hidden
          >
            <Icon className="h-5 w-5" />
          </IconChip>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-title text-foreground">{game.label}</h2>
              <span
                className="widget-icon-well shrink-0 rounded-full px-2 py-0.5 text-micro font-bold"
              >
                {mastery.label}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-mini text-muted-foreground">{game.tagline}</p>
          </div>

          {/* Segmented mastery strip — one segment per earned tier */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div
              className="flex items-center gap-1"
              dir="ltr"
              aria-label={`رتبة الإتقان ${mastery.tier} من ${MAX_TIER}`}
            >
              {MASTERY_THRESHOLDS.slice(1).map((_, i) => {
                const tierNum = i + 1;
                const filled = tierNum <= mastery.tier;
                return (
                  <span
                    key={tierNum}
                    className={cn('h-3 w-1.5 rounded-full border border-foreground transition-colors', filled && 'bg-foreground')}
                    aria-hidden
                  />
                );
              })}
              <Star
                className={cn(
                  'ms-0.5 h-3.5 w-3.5',
                  mastery.tier >= MAX_TIER ? '' : 'text-muted-foreground-subtle',
                )}
                fill={mastery.tier >= MAX_TIER ? 'currentColor' : undefined}
                aria-hidden
              />
            </div>
            <span className="text-micro tabular-nums text-muted-foreground" dir="rtl">
              {playedModes}/{totalModes} أنماط
            </span>
          </div>
        </div>

        {/* Facts row */}
        <div className="mt-3 flex items-center gap-3 text-mini">
          {stats.played === 0 ? (
            <span className="font-medium text-muted-foreground">لم تُلاعب بعد</span>
          ) : (
            <>
              <span className="tabular-nums text-muted-foreground" dir="rtl">
                <span className="font-bold text-foreground" dir="ltr">
                  {stats.wins}
                </span>{' '}
                فوز · <span className="text-foreground">{winRate}٪</span>
              </span>
              {bestRecord !== null && (
                <span className="tabular-nums text-muted-foreground" dir="rtl">
                  أفضل رقم{' '}
                  <span className="font-bold text-foreground" dir="ltr">
                    {bestRecord}
                  </span>
                </span>
              )}
            </>
          )}
          {mastery.remaining !== null && stats.played > 0 && (
            <span
              className="ms-auto hidden items-center gap-1 tabular-nums text-muted-foreground xs:flex sm:flex"
              dir="rtl"
            >
              <span dir="ltr">{mastery.remaining}</span> للرتبة القادمة
            </span>
          )}
        </div>

        {/* Mode chips — always visible, scrollable on one line */}
        <div
          className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hide"
          role="list"
          aria-label={`أنماط ${game.label}`}
        >
          {game.modes.map((mode) => {
            const played = stats.modesPlayed.includes(mode.id);
            return (
              <button
                key={mode.id}
                type="button"
                role="listitem"
                title={`${mode.detail}${mode.recordLabel && stats.records[mode.id] !== undefined ? ` — ${mode.recordLabel}: ${stats.records[mode.id]}` : ''}`}
                onClick={() => navigate(mode.path)}
                onMouseEnter={() => prefetchRoute(mode.path)}
                className={cn(
                  'widget-icon-well flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 py-2 text-mini font-bold',
                  'transition-motion hover:bg-interactive-hover',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                {!played && (
                  <span aria-hidden className="opacity-70">
                    ✦
                  </span>
                )}
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* CTA — the canonical button, identical across every game */}
        <Button
          type="button"
          onClick={() => navigate(game.path)}
          onMouseEnter={() => prefetchRoute(game.path)}
          className="mt-3 w-full"
        >
          <span>ادخل الملعب</span>
          <span className="flex items-center gap-1 text-micro font-bold opacity-80" dir="rtl">
            {totalModes} أنماط
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </span>
        </Button>
      </div>
    </AppCard>
  );
}

export const GameMasteryCard = memo(GameMasteryCardImpl);
export default GameMasteryCard;
