/**
 * DailyChallengeList — today's three challenges, as a compact quest strip.
 *
 * Redesign: rows became quest tiles — a big XP coin on the right (RTL-first),
 * kind chip, and a hairline progress track. Completed quests collapse to a
 * satisfied state with a drawn check. Routing behavior unchanged: each tile
 * still deep-links into the mode that satisfies it.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppCard } from '@/components/ui/app-shell';
import { Check, ChevronLeft, Sparkles } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { GAMES } from '../data/modes';
import { type Challenge, CHALLENGE_KIND_LABEL } from '../progression/challenges';
import type { GameId } from '../progression/types';
import { GAME_IDENTITY } from './gameIdentity';

interface Row {
  definition: Challenge;
  progress: number;
  completed: boolean;
}

interface Props {
  challenges: Row[];
}

/** Where a challenge should send the player. */
function routeFor(challenge: Challenge): string {
  const game = GAMES.find((g) => g.id === challenge.game);
  if (!game) return '/games';
  if (challenge.kind === 'variety') return game.path;
  // Speed and flawless challenges have purpose-built modes in Sudoku.
  if (challenge.game === 'sudoku' && challenge.kind === 'flawless') {
    return game.modes.find((m) => m.id === 'sudoku-flawless')?.path ?? game.path;
  }
  if (challenge.game === 'sudoku' && challenge.kind === 'speed') {
    return game.modes.find((m) => m.id === 'sudoku-time-attack')?.path ?? game.path;
  }
  return game.path;
}

function DailyChallengeListImpl({ challenges }: Props) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  if (challenges.length === 0) return null;

  const done = challenges.filter((c) => c.completed).length;
  const allDone = done === challenges.length;

  return (
    <AppCard as="section" aria-label="تحديات اليوم" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(110% 80% at 90% -20%, hsl(var(--primary) / 0.10) 0%, transparent 55%)',
        }}
      />

      <div className="relative">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-title font-semibold text-foreground">تحديات اليوم</h2>
          <p className="text-mini tabular-nums text-muted-foreground" dir="rtl">
            {allDone && <Sparkles className="me-1 inline h-3.5 w-3.5 text-primary" aria-hidden />}
            <span dir="ltr">{done}</span> من <span dir="ltr">{challenges.length}</span>
          </p>
        </header>

        <ul className="mt-3 space-y-2">
          {challenges.map(({ definition, progress, completed }) => {
            const ratio = Math.min(1, progress / definition.target);
            const identity = GAME_IDENTITY[definition.game as GameId];
            return (
              <li key={definition.id}>
                <button
                  type="button"
                  onClick={() => navigate(routeFor(definition))}
                  disabled={completed}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl border p-3 text-start',
                    'transition-[transform,border-color,background-color] duration-normal ease-out-expo',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    completed
                      ? 'border-primary/50 bg-accent/40'
                      : 'border-border hover:-translate-y-0.5 hover:bg-muted/40',
                  )}
                >
                  {/* XP coin */}
                  <span
                    aria-label={completed ? 'مكتمل' : `${definition.xp} نقطة`}
                    className={cn(
                      'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-micro font-black tabular-nums',
                      completed ? 'border-primary bg-primary text-primary-foreground' : '',
                    )}
                    style={
                      completed
                        ? undefined
                        : { borderColor: identity.line, background: identity.tint, color: identity.accent }
                    }
                    aria-hidden
                  >
                    <AnimatePresence initial={false} mode="wait">
                      {completed ? (
                        <motion.span
                          key="done"
                          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: -30 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          transition={reduce ? { duration: 0.08 } : { type: 'spring', stiffness: 520, damping: 22 }}
                        >
                          <Check className="h-5 w-5" />
                        </motion.span>
                      ) : (
                        <motion.span key="xp" initial={false} dir="ltr">
                          +{definition.xp}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {/* Coin inner rim */}
                    {!completed && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-[3px] rounded-full border border-dashed opacity-45"
                        style={{ borderColor: identity.accent }}
                      />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'truncate text-meta font-bold',
                          completed ? 'text-muted-foreground line-through' : 'text-foreground',
                        )}
                      >
                        {definition.title}
                      </span>
                      <span
                        className="shrink-0 rounded-sm px-1.5 py-px text-micro"
                        style={{ background: identity.tint, color: identity.accent }}
                      >
                        {CHALLENGE_KIND_LABEL[definition.kind]}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-mini text-muted-foreground">
                      {definition.detail}
                    </span>

                    {definition.target > 1 && !completed ? (
                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted" dir="ltr">
                        <span
                          className="block h-full w-full origin-left rounded-full transition-transform duration-normal ease-out-expo"
                          style={{ transform: `scaleX(${ratio})`, background: identity.accent }}
                        />
                      </span>
                    ) : definition.target > 1 && completed ? (
                      <span className="mt-1 block h-1 w-full rounded-full" style={{ background: identity.tint }} />
                    ) : null}
                  </span>

                  {!completed && (
                    <ChevronLeft
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-normal group-hover:-translate-x-0.5 rtl:rotate-180"
                      aria-hidden
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-micro text-muted-foreground">
          تتجدّد التحديات كل يوم عند منتصف الليل، وهي واحدة لكل لعبة.
        </p>
      </div>
    </AppCard>
  );
}

export const DailyChallengeList = memo(DailyChallengeListImpl);
export default DailyChallengeList;
