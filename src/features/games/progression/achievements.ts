/**
 * Achievements.
 *
 * The app previously had achievements in exactly one game (Memory, 10 hardcoded
 * badges checked inline against its own stats blob). Nothing existed for chess or
 * sudoku, and nothing crossed games.
 *
 * Each achievement here is a pure predicate over the shared progression state, so
 * adding one is data, not logic, and every one of them is *earnable* — there are
 * no "coming soon" entries.
 */
import type { GameId, ProgressionState } from './types';
import { masteryTier } from './xp';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  tier: AchievementTier;
  /** Which game it belongs to, or 'meta' for cross-game achievements. */
  scope: GameId | 'meta';
  /** True when earned. Must be a pure function of state. */
  check: (state: ProgressionState) => boolean;
  /** Optional 0..1 progress so the UI can show a partially-earned badge. */
  progress?: (state: ProgressionState) => number;
}

const ratio = (value: number, target: number) => Math.max(0, Math.min(1, value / target));

function wins(state: ProgressionState, game: GameId): number {
  return state.mastery[game]?.wins ?? 0;
}

function played(state: ProgressionState, game: GameId): number {
  return state.mastery[game]?.played ?? 0;
}

function modesPlayed(state: ProgressionState, game: GameId): number {
  return state.mastery[game]?.modesPlayed.length ?? 0;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  /* ── meta ── */
  {
    id: 'first-steps',
    title: 'الخطوة الأولى',
    detail: 'أكمل أول جولة في أي لعبة.',
    tier: 'bronze',
    scope: 'meta',
    check: (s) => s.matches >= 1,
    progress: (s) => ratio(s.matches, 1),
  },
  {
    id: 'triathlete',
    title: 'الثلاثية',
    detail: 'فُز مرة واحدة على الأقل في كل لعبة من الثلاث.',
    tier: 'silver',
    scope: 'meta',
    check: (s) => wins(s, 'sudoku') >= 1 && wins(s, 'chess') >= 1 && wins(s, 'memory') >= 1,
    progress: (s) =>
      ratio([wins(s, 'sudoku'), wins(s, 'chess'), wins(s, 'memory')].filter((w) => w >= 1).length, 3),
  },
  {
    id: 'level-10',
    title: 'المستوى العاشر',
    detail: 'ابلغ المستوى ١٠.',
    tier: 'silver',
    scope: 'meta',
    check: (s) => s.xp >= 4_500,
    progress: (s) => ratio(s.xp, 4_500),
  },
  {
    id: 'level-25',
    title: 'ربع القرن',
    detail: 'ابلغ المستوى ٢٥.',
    tier: 'gold',
    scope: 'meta',
    check: (s) => s.xp >= 15_500,
    progress: (s) => ratio(s.xp, 15_500),
  },
  {
    id: 'streak-7',
    title: 'أسبوع كامل',
    detail: 'العب سبعة أيام متتابعة.',
    tier: 'silver',
    scope: 'meta',
    check: (s) => s.streak.best >= 7,
    progress: (s) => ratio(s.streak.best, 7),
  },
  {
    id: 'streak-30',
    title: 'شهر بلا انقطاع',
    detail: 'العب ثلاثين يوماً متتابعاً.',
    tier: 'platinum',
    scope: 'meta',
    check: (s) => s.streak.best >= 30,
    progress: (s) => ratio(s.streak.best, 30),
  },
  {
    id: 'centurion',
    title: 'المئة',
    detail: 'أكمل مئة جولة.',
    tier: 'gold',
    scope: 'meta',
    check: (s) => s.matches >= 100,
    progress: (s) => ratio(s.matches, 100),
  },
  {
    id: 'explorer',
    title: 'المستكشف',
    detail: 'جرّب عشرة أنماط لعب مختلفة.',
    tier: 'gold',
    scope: 'meta',
    check: (s) => modesPlayed(s, 'sudoku') + modesPlayed(s, 'chess') + modesPlayed(s, 'memory') >= 10,
    progress: (s) =>
      ratio(modesPlayed(s, 'sudoku') + modesPlayed(s, 'chess') + modesPlayed(s, 'memory'), 10),
  },

  /* ── sudoku ── */
  {
    id: 'sudoku-first',
    title: 'أول شبكة',
    detail: 'أكمل لوحة سودوكو.',
    tier: 'bronze',
    scope: 'sudoku',
    check: (s) => wins(s, 'sudoku') >= 1,
    progress: (s) => ratio(wins(s, 'sudoku'), 1),
  },
  {
    id: 'sudoku-25',
    title: 'خمس وعشرون شبكة',
    detail: 'أكمل ٢٥ لوحة سودوكو.',
    tier: 'silver',
    scope: 'sudoku',
    check: (s) => wins(s, 'sudoku') >= 25,
    progress: (s) => ratio(wins(s, 'sudoku'), 25),
  },
  {
    id: 'sudoku-mastery-3',
    title: 'سودوكو ذهبي',
    detail: 'ابلغ الرتبة الذهبية في سودوكو.',
    tier: 'gold',
    scope: 'sudoku',
    check: (s) => masteryTier(s.mastery.sudoku?.xp ?? 0) >= 3,
    progress: (s) => ratio(s.mastery.sudoku?.xp ?? 0, 2400),
  },
  {
    id: 'sudoku-flawless',
    title: 'بلا خطأ',
    detail: 'أكمل نمط «بلا أخطاء» مرة واحدة.',
    tier: 'gold',
    scope: 'sudoku',
    check: (s) => (s.mastery.sudoku?.records['sudoku-flawless'] ?? 0) > 0,
  },

  /* ── chess ── */
  {
    id: 'chess-first',
    title: 'أول انتصار',
    detail: 'اربح مباراة شطرنج.',
    tier: 'bronze',
    scope: 'chess',
    check: (s) => wins(s, 'chess') >= 1,
    progress: (s) => ratio(wins(s, 'chess'), 1),
  },
  {
    id: 'chess-10',
    title: 'عشر مباريات',
    detail: 'العب عشر مباريات شطرنج.',
    tier: 'bronze',
    scope: 'chess',
    check: (s) => played(s, 'chess') >= 10,
    progress: (s) => ratio(played(s, 'chess'), 10),
  },
  {
    id: 'chess-puzzles',
    title: 'حلّال الألغاز',
    detail: 'حلّ ٢٥ لغزاً شطرنجياً.',
    tier: 'silver',
    scope: 'chess',
    check: (s) => (s.mastery.chess?.records['chess-puzzles'] ?? 0) >= 25,
    progress: (s) => ratio(s.mastery.chess?.records['chess-puzzles'] ?? 0, 25),
  },
  {
    id: 'chess-mastery-3',
    title: 'شطرنج ذهبي',
    detail: 'ابلغ الرتبة الذهبية في الشطرنج.',
    tier: 'gold',
    scope: 'chess',
    check: (s) => masteryTier(s.mastery.chess?.xp ?? 0) >= 3,
    progress: (s) => ratio(s.mastery.chess?.xp ?? 0, 2400),
  },

  /* ── memory ── */
  {
    id: 'memory-first',
    title: 'أول مطابقة',
    detail: 'أكمل لوحة أزواج.',
    tier: 'bronze',
    scope: 'memory',
    check: (s) => wins(s, 'memory') >= 1,
    progress: (s) => ratio(wins(s, 'memory'), 1),
  },
  {
    id: 'memory-endless-10',
    title: 'ذاكرة بلا نهاية',
    detail: 'ابلغ الجولة العاشرة في النمط اللانهائي.',
    tier: 'silver',
    scope: 'memory',
    check: (s) => (s.mastery.memory?.records['memory-endless'] ?? 0) >= 10,
    progress: (s) => ratio(s.mastery.memory?.records['memory-endless'] ?? 0, 10),
  },
  {
    id: 'memory-50',
    title: 'خمسون لوحة',
    detail: 'أكمل ٥٠ لوحة أزواج.',
    tier: 'gold',
    scope: 'memory',
    check: (s) => wins(s, 'memory') >= 50,
    progress: (s) => ratio(wins(s, 'memory'), 50),
  },
  {
    id: 'memory-mastery-3',
    title: 'ذاكرة ذهبية',
    detail: 'ابلغ الرتبة الذهبية في أزواج الذاكرة.',
    tier: 'gold',
    scope: 'memory',
    check: (s) => masteryTier(s.mastery.memory?.xp ?? 0) >= 3,
    progress: (s) => ratio(s.mastery.memory?.xp ?? 0, 2400),
  },
] as const;

export function findAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Ids that are satisfied by `state` but not yet recorded as unlocked. */
export function newlyUnlocked(state: ProgressionState): string[] {
  return ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && a.check(state)).map((a) => a.id);
}

export const ACHIEVEMENT_TIER_LABEL: Record<AchievementTier, string> = {
  bronze: 'برونزي',
  silver: 'فضّي',
  gold: 'ذهبي',
  platinum: 'بلاتيني',
};
