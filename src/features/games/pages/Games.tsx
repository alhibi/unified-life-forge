/**
 * /games — the arcade hub.
 *
 * The page reads, top to bottom, as one narrative:
 *   من أنت (الرتبة، المستوى، السلسلة، الموسم) → ماذا تفعل اليوم (تحديات
 *   حقيقية قابلة للنقر) → الألعاب الثلاث بهوياتها → الرف الإنجازات.
 *
 * Every number on this page is read from the progression store — the same
 * store the award pipeline writes after every real session. Nothing is
 * estimated, nothing is decorative.
 */
import { motion } from 'framer-motion';
import { useMemo } from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { Gamepad2, Grid3X3, Puzzle, Swords } from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';

import AchievementShelf from '../components/AchievementShelf';
import DailyChallengeList from '../components/DailyChallengeList';
import { GAME_IDENTITY } from '../components/gameIdentity';
import GameMasteryCard from '../components/GameMasteryCard';
import ProfileCard from '../components/ProfileCard';
import { GAMES, TOTAL_MODES } from '../data/modes';
import type { GameId } from '../progression/types';
import { useProgression } from '../progression/useProgression';

const GAME_ICONS: Record<GameId, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  sudoku: Grid3X3,
  chess: Swords,
  memory: Puzzle,
};

export default function GamesPage() {
  const { state, challenges, mastery } = useProgression();

  const subtitle = useMemo(
    () => `${GAMES.length} ألعاب · ${TOTAL_MODES} نمط لعب`,
    [],
  );

  return (
    <div className="min-h-screen bg-background pb-page">
      <SEO
        title="الألعاب — SmartHub"
        description="سودوكو وشطرنج وأزواج الذاكرة، مع نظام مستويات ورتب وإتقان وتحديات يومية وإنجازات."
        path="/games"
      />

      <PageHeader
        hideBack
        icon={
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-foreground">
            <Gamepad2 className="h-5 w-5" />
          </span>
        }
        title="الألعاب"
        subtitle={subtitle}
        className="px-4"
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-2"
      >
        <motion.div variants={item}>
          <ProfileCard state={state} />
        </motion.div>

        <motion.div variants={item}>
          <DailyChallengeList challenges={challenges} />
        </motion.div>

        {GAMES.map((game) => (
          <motion.div key={game.id} variants={item}>
            <GameMasteryCard
              game={game}
              mastery={mastery(game.id)}
              stats={state.mastery[game.id]}
              icon={GAME_ICONS[game.id]}
              identity={GAME_IDENTITY[game.id]}
            />
          </motion.div>
        ))}

        <motion.div variants={item}>
          <AchievementShelf state={state} />
        </motion.div>
      </motion.div>
    </div>
  );
}
