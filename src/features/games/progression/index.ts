/** Public surface of the progression system. */
export {
  type Achievement,
  ACHIEVEMENT_TIER_LABEL,
  ACHIEVEMENTS,
  findAchievement,
  newlyUnlocked,
} from './achievements';
export { awardMatch, currentSeasonId, dayKey, emptyProgression } from './award';
export {
  type Challenge,
  CHALLENGE_KIND_LABEL,
  challengeDelta,
  type ChallengeKind,
  challengesForDay,
} from './challenges';
export {
  getProgression,
  parseProgression,
  refreshProgression,
  reportMatch,
  resetProgression,
  subscribeProgression,
} from './store';
export type {
  ChallengeProgress,
  Difficulty,
  GameId,
  GameMode,
  MasteryState,
  MatchReport,
  MatchResult,
  Outcome,
  ProgressionState,
  SeasonState,
  XpLine,
} from './types';
export { GAME_IDS } from './types';
export { useProgression } from './useProgression';
export {
  DIFFICULTY_MULTIPLIER,
  difficultyLabel,
  emptyMastery,
  levelFromXp,
  levelProgress,
  MASTERY_LABELS,
  MASTERY_THRESHOLDS,
  masteryProgress,
  masteryTier,
  MAX_LEVEL,
  type Rank,
  RANK_TIERS,
  rankForLevel,
  xpForLevel,
  xpToAdvance,
} from './xp';
