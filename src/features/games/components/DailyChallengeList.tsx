/**
 * DailyChallengeList — today's three challenges, as a grouped quest list.
 *
 * System pass: the identity wash gradient and the dashed "coin rim" are gone.
 * The quests are now <AppList> + <AppRow> like every other list in the app —
 * the XP coin stays as the leading plate (game identity via the documented
 * data-palette key), the kind chip sits inline with the title, and the
 * progress track rides in the subtitle slot. Routing behavior unchanged:
 * each row still deep-links into the mode that satisfies it.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppList, AppRow } from '@/components/ui/app-shell';
import { Check, Sparkles } from '@/lib/icons';
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
    <section aria-label="تحديات اليوم">
      <header className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 className="type-section text-foreground">تحديات اليوم</h2>
        <p className="text-mini tabular-nums text-muted-foreground" dir="rtl">
          {allDone && <Sparkles className="me-1 inline h-3.5 w-3.5 text-primary" aria-hidden />}
          <span dir="ltr">{done}</span> من <span dir="ltr">{challenges.length}</span>
        </p>
      </header>

      <AppList>
        {challenges.map(({ definition, progress, completed }) => {
          const ratio = Math.min(1, progress / definition.target);
          const identity = GAME_IDENTITY[definition.game as GameId];
          return (
            <AppRow
              key={definition.id}
              onClick={() => navigate(routeFor(definition))}
              disabled={completed}
              chevron={!completed}
              leading={
                <span
                  aria-hidden
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-micro font-bold tabular-nums',
                    completed && 'border-primary bg-primary text-primary-foreground',
                  )}
                  style={
                    completed
                      ? undefined
                      : {
                          borderColor: identity.line,
                          background: identity.tint,
                          color: identity.accent,
                        }
                  }
                >
                  <AnimatePresence initial={false} mode="wait">
                    {completed ? (
                      <motion.span
                        key="done"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: -30 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={
                          reduce ? { duration: 0.08 } : { type: 'spring', stiffness: 520, damping: 22 }
                        }
                      >
                        <Check className="h-5 w-5" />
                      </motion.span>
                    ) : (
                      <motion.span key="xp" initial={false} dir="ltr">
                        +{definition.xp}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              }
              title={
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn('truncate', completed && 'text-muted-foreground line-through')}>
                    {definition.title}
                  </span>
                  <span
                    className="shrink-0 rounded-sm px-1.5 py-px text-micro font-medium"
                    style={{ background: identity.tint, color: identity.accent }}
                  >
                    {CHALLENGE_KIND_LABEL[definition.kind]}
                  </span>
                </span>
              }
              subtitle={
                <>
                  <span className="block truncate">{definition.detail}</span>
                  {definition.target > 1 && !completed && (
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted" dir="ltr">
                      <span
                        className="block h-full w-full origin-left rounded-full transition-transform duration-normal ease-out-expo"
                        style={{ transform: `scaleX(${ratio})`, background: identity.accent }}
                      />
                    </span>
                  )}
                  {definition.target > 1 && completed && (
                    <span
                      className="mt-1 block h-1 w-full rounded-full"
                      style={{ background: identity.tint }}
                    />
                  )}
                </>
              }
            />
          );
        })}
      </AppList>

      <p className="mt-3 px-1 text-micro text-muted-foreground">
        تتجدّد التحديات كل يوم عند منتصف الليل، وهي واحدة لكل لعبة.
      </p>
    </section>
  );
}

export const DailyChallengeList = memo(DailyChallengeListImpl);
export default DailyChallengeList;
