/**
 * DailyChallengeList — today's three challenges.
 *
 * New surface: the app had no daily objectives at all, so there was no reason to
 * open the games tab on a given day rather than any other. Each row is tappable
 * and routes straight into a mode that can satisfy it, because a challenge you
 * have to go hunting for is a chore.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppCard } from '@/components/ui/app-shell';
import { Check, ChevronLeft } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { GAMES } from '../data/modes';
import { type Challenge,CHALLENGE_KIND_LABEL } from '../progression/challenges';

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

  return (
    <AppCard as="section" aria-label="تحديات اليوم">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-title font-semibold text-foreground">تحديات اليوم</h2>
        <p className="text-mini tabular-nums text-muted-foreground" dir="rtl">
          <span dir="ltr">{done}</span> من <span dir="ltr">{challenges.length}</span>
        </p>
      </header>

      <ul className="mt-3 space-y-2">
        {challenges.map(({ definition, progress, completed }) => {
          const ratio = Math.min(1, progress / definition.target);
          return (
            <li key={definition.id}>
              <button
                type="button"
                onClick={() => navigate(routeFor(definition))}
                disabled={completed}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md border p-3 text-start',
                  'transition-[transform,border-color,background-color] duration-normal ease-out-expo',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  completed
                    ? 'border-primary/60 bg-accent/40'
                    : 'border-border hover:-translate-y-0.5 hover:bg-muted/50',
                )}
              >
                <span
                  aria-label={completed ? 'مكتمل' : `${definition.xp} نقطة`}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border text-micro font-bold',
                    completed
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground',
                  )}
                  aria-hidden
                >
                  <AnimatePresence initial={false} mode="wait">
                    {completed ? (
                      <motion.span
                        key="done"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={reduce ? { duration: 0.08 } : { type: 'spring', stiffness: 620, damping: 26 }}
                      >
                        <Check className="h-4 w-4" />
                      </motion.span>
                    ) : (
                      <motion.span key="xp" initial={false} className="tabular-nums" dir="ltr">
                        +{definition.xp}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'truncate text-meta font-semibold',
                        completed ? 'text-muted-foreground line-through' : 'text-foreground',
                      )}
                    >
                      {definition.title}
                    </span>
                    <span className="shrink-0 rounded-sm border border-border px-1.5 text-micro text-muted-foreground">
                      {CHALLENGE_KIND_LABEL[definition.kind]}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-mini text-muted-foreground">{definition.detail}</span>

                  {definition.target > 1 && !completed && (
                    <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted" dir="ltr">
                      <span
                        className="block h-full w-full origin-left rounded-full bg-primary transition-transform duration-normal ease-out-expo"
                        style={{ transform: `scaleX(${ratio})` }}
                      />
                    </span>
                  )}
                </span>

                {!completed && (
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-micro text-muted-foreground">
        تتجدّد التحديات كل يوم عند منتصف الليل، وهي واحدة لكل لعبة.
      </p>
    </AppCard>
  );
}

export const DailyChallengeList = memo(DailyChallengeListImpl);
export default DailyChallengeList;
