/**
 * Daily challenges.
 *
 * Three challenges per day, derived DETERMINISTICALLY from the date. That matters
 * for two reasons: the set survives a reload without being stored, and two
 * devices belonging to the same person show the same challenges without any
 * server round trip. A random draw would have needed both persistence and sync.
 *
 * The generator is a 32-bit xorshift seeded from the date string — small, fast,
 * and stable across engines (Math.random is neither seedable nor reproducible).
 */
import type { ChallengeProgress, GameId, GameMode, MatchResult } from './types';

export type ChallengeKind =
  /** Finish N sessions of a given game. */
  | 'play'
  /** Win N sessions of a given game. */
  | 'win'
  /** Win once with zero mistakes. */
  | 'flawless'
  /** Win at hard difficulty or above. */
  | 'hard'
  /** Play N different modes of a game today. */
  | 'variety'
  /** Finish a session inside a time budget (seconds). */
  | 'speed';

export interface Challenge {
  id: string;
  kind: ChallengeKind;
  game: GameId;
  /** Count / seconds, depending on `kind`. */
  target: number;
  xp: number;
  title: string;
  detail: string;
}

const GAME_LABEL: Record<GameId, string> = {
  sudoku: 'سودوكو',
  chess: 'الشطرنج',
  memory: 'أزواج الذاكرة',
};

/** Deterministic PRNG: xorshift32. */
function makeRng(seed: number): () => number {
  let state = seed | 0;
  if (state === 0) state = 0x1a2b3c4d;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    // >>> 0 keeps it unsigned; / 2^32 maps to [0, 1).
    return (state >>> 0) / 4_294_967_296;
  };
}

function hashDay(day: string): number {
  let hash = 2166136261;
  for (let i = 0; i < day.length; i += 1) {
    hash ^= day.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}

interface Template {
  kind: ChallengeKind;
  /** Candidate targets; one is drawn. */
  targets: number[];
  /** XP per unit of target, used to keep rewards proportional to effort. */
  xpPerTarget: number;
  title: (game: GameId, target: number) => string;
  detail: (game: GameId, target: number) => string;
}

const TEMPLATES: readonly Template[] = [
  {
    kind: 'play',
    targets: [2, 3],
    xpPerTarget: 30,
    title: (game, target) => `${target} جولات في ${GAME_LABEL[game]}`,
    detail: (game, target) => `أكمل ${target} جولات اليوم في ${GAME_LABEL[game]}.`,
  },
  {
    kind: 'win',
    targets: [1, 2],
    xpPerTarget: 55,
    title: (game, target) => `${target} انتصار في ${GAME_LABEL[game]}`,
    detail: (game, target) => `احصد ${target} انتصاراً اليوم في ${GAME_LABEL[game]}.`,
  },
  {
    kind: 'flawless',
    targets: [1],
    xpPerTarget: 90,
    title: (game) => `فوز نظيف في ${GAME_LABEL[game]}`,
    detail: (game) => `اربح جولة في ${GAME_LABEL[game]} دون أي خطأ أو تلميح.`,
  },
  {
    kind: 'hard',
    targets: [1],
    xpPerTarget: 80,
    title: (game) => `تحدٍّ صعب في ${GAME_LABEL[game]}`,
    detail: (game) => `اربح جولة في ${GAME_LABEL[game]} على مستوى صعب أو أعلى.`,
  },
  {
    kind: 'variety',
    targets: [2],
    xpPerTarget: 60,
    title: (game, target) => `${target} أنماط في ${GAME_LABEL[game]}`,
    detail: (game, target) => `العب ${target} أنماط مختلفة اليوم في ${GAME_LABEL[game]}.`,
  },
  {
    kind: 'speed',
    targets: [180, 300],
    xpPerTarget: 0.4,
    title: (game, target) => `${GAME_LABEL[game]} في ${Math.round(target / 60)} دقائق`,
    detail: (game, target) =>
      `أكمل جولة في ${GAME_LABEL[game]} في أقل من ${Math.round(target / 60)} دقائق.`,
  },
];

const GAMES: readonly GameId[] = ['sudoku', 'chess', 'memory'];

/**
 * The three challenges for `day` (a `YYYY-MM-DD` local day key).
 * Always one per game, so no game is ever locked out of the daily reward.
 */
export function challengesForDay(day: string): Challenge[] {
  const rng = makeRng(hashDay(day));
  // Rotate which game gets which template slot so the same game is not always
  // handed the "flawless" chore.
  const offset = Math.floor(rng() * TEMPLATES.length);

  return GAMES.map((game, index) => {
    const template = TEMPLATES[(offset + index * 2) % TEMPLATES.length];
    const target = template.targets[Math.floor(rng() * template.targets.length)];
    const xp = Math.max(30, Math.round(template.xpPerTarget * target));
    return {
      id: `${day}-${game}-${template.kind}`,
      kind: template.kind,
      game,
      target,
      xp,
      title: template.title(game, target),
      detail: template.detail(game, target),
    };
  });
}

export function emptyChallengeProgress(day: string): ChallengeProgress[] {
  return challengesForDay(day).map((c) => ({ id: c.id, progress: 0, completed: false, claimed: false }));
}

/**
 * How much a single match advances a challenge.
 * Returns 0 when the match is irrelevant.
 *
 * `modesToday` is the set of modes already played today for that game, used by
 * the `variety` kind — it is passed in rather than read from state so this stays
 * a pure function.
 */
export function challengeDelta(
  challenge: Challenge,
  result: MatchResult,
  modesToday: readonly GameMode[],
): number {
  if (result.game !== challenge.game) return 0;
  // An abandoned session never counts toward anything.
  if (result.outcome === 'abandon') return 0;

  switch (challenge.kind) {
    case 'play':
      return 1;
    case 'win':
      return result.outcome === 'win' ? 1 : 0;
    case 'flawless':
      return result.outcome === 'win' && (result.mistakes ?? 0) === 0 && (result.hints ?? 0) === 0 ? 1 : 0;
    case 'hard': {
      if (result.outcome !== 'win') return 0;
      const hard = result.difficulty === 'hard' || result.difficulty === 'expert' || result.difficulty === 'master';
      return hard ? 1 : 0;
    }
    case 'variety': {
      // Counts distinct modes: only a mode not yet played today advances it.
      return modesToday.includes(result.mode) ? 0 : 1;
    }
    case 'speed': {
      if (result.outcome !== 'win' || result.durationMs === undefined) return 0;
      return result.durationMs <= challenge.target * 1000 ? 1 : 0;
    }
  }
}

export const CHALLENGE_KIND_LABEL: Record<ChallengeKind, string> = {
  play: 'مشاركة',
  win: 'انتصار',
  flawless: 'إتقان',
  hard: 'صعوبة',
  variety: 'تنويع',
  speed: 'سرعة',
};
