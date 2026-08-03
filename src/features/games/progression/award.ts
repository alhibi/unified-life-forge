/**
 * The award pipeline — pure. Given a state and a match, return the next state
 * plus a human-readable report of exactly where the XP came from.
 *
 * Being pure and itemised is the point. The previous implementation mutated a
 * per-game stats blob inline inside each game's win handler with magic numbers
 * (`s.xp += 25 + level * 5`), which meant the reward could not be explained to
 * the player, could not be tested, and differed per game for no reason.
 */
import { newlyUnlocked } from './achievements';
import {
  type Challenge,
  challengeDelta,
  challengesForDay,
  emptyChallengeProgress,
} from './challenges';
import type {
  Difficulty,
  GameId,
  GameMode,
  MatchReport,
  MatchResult,
  ProgressionState,
  XpLine,
} from './types';
import { DIFFICULTY_MULTIPLIER, emptyMastery, levelFromXp, masteryTier } from './xp';

/* ── base rewards ───────────────────────────────────────────────────── */

/**
 * Base XP per outcome, per game. Chess pays more than memory per session
 * because a chess game is an order of magnitude longer; the numbers are tuned so
 * that roughly equal TIME spent yields roughly equal XP, which is the only fair
 * basis for a shared level.
 */
const BASE_XP: Record<GameId, { win: number; draw: number; loss: number }> = {
  sudoku: { win: 70, draw: 0, loss: 12 },
  chess: { win: 95, draw: 45, loss: 20 },
  memory: { win: 55, draw: 0, loss: 10 },
};

/** Modes that are richer than their game's default session get a nudge. */
const MODE_BONUS: Partial<Record<GameMode, number>> = {
  'sudoku-flawless': 30,
  'sudoku-time-attack': 20,
  'sudoku-daily': 25,
  'chess-career': 40,
  'chess-puzzles': 10,
  'chess-blitz': 15,
  'memory-endless': 20,
  'memory-adventure': 25,
  'memory-daily': 20,
  'memory-versus': 15,
};

/** Target durations (seconds) used for the speed bonus, per game. */
const SPEED_TARGET_SECONDS: Record<GameId, number> = {
  sudoku: 420,
  chess: 600,
  memory: 150,
};

const FIRST_WIN_BONUS = 60;
const FLAWLESS_MULTIPLIER = 1.25;
const RECORD_BONUS = 40;
const STREAK_BONUS_PER_DAY = 6;
const STREAK_BONUS_CAP_DAYS = 10;

/* ── helpers ────────────────────────────────────────────────────────── */

export function emptyProgression(): ProgressionState {
  return {
    version: 1,
    xp: 0,
    matches: 0,
    wins: 0,
    mastery: { sudoku: emptyMastery(), chess: emptyMastery(), memory: emptyMastery() },
    season: { id: currentSeasonId(), xp: 0, matches: 0, wins: 0 },
    seasonHistory: [],
    achievements: {},
    streak: { current: 0, best: 0, lastPlayedDay: null },
    challenges: null,
    firstWinDays: [],
  };
}

/** Local day key — must match the rest of the app (never UTC). */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Seasons are calendar months in local time. */
export function currentSeasonId(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return dayKey(date);
}

/** Roll the season over when the month changes, archiving the old one. */
export function rollSeason(state: ProgressionState, now = new Date()): ProgressionState {
  const id = currentSeasonId(now);
  if (state.season.id === id) return state;
  const archived = state.season.matches > 0 ? [state.season, ...state.seasonHistory].slice(0, 6) : state.seasonHistory;
  return { ...state, season: { id, xp: 0, matches: 0, wins: 0 }, seasonHistory: archived };
}

/** Ensure today's challenge sheet exists (and discard yesterday's). */
export function ensureChallenges(state: ProgressionState, today = dayKey()): ProgressionState {
  if (state.challenges?.day === today) return state;
  return { ...state, challenges: { day: today, items: emptyChallengeProgress(today) } };
}

function updateStreak(state: ProgressionState, today: string): ProgressionState['streak'] {
  const { streak } = state;
  if (streak.lastPlayedDay === today) return streak;
  const continued = streak.lastPlayedDay === previousDay(today);
  const current = continued ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), lastPlayedDay: today };
}

/* ── the pipeline ───────────────────────────────────────────────────── */

export interface AwardOutcome {
  state: ProgressionState;
  report: MatchReport;
}

export function awardMatch(
  input: ProgressionState,
  result: MatchResult,
  now: Date = new Date(),
): AwardOutcome {
  const today = dayKey(now);

  // 1 — housekeeping before anything is credited.
  let state = rollSeason(input, now);
  state = ensureChallenges(state, today);

  const levelBefore = levelFromXp(state.xp);
  const masteryBefore = masteryTier(state.mastery[result.game]?.xp ?? 0);

  const lines: XpLine[] = [];

  // 2 — base reward.
  const base = BASE_XP[result.game];
  const outcomeXp =
    result.outcome === 'win'
      ? base.win
      : result.outcome === 'draw'
        ? base.draw
        : result.outcome === 'loss'
          ? base.loss
          : 0;

  if (result.outcome === 'abandon') {
    // Abandoning is not a session: nothing is credited, nothing is counted, and
    // the streak is untouched. Only the challenge sheet housekeeping persists.
    return {
      state,
      report: {
        lines: [],
        xpAwarded: 0,
        levelBefore,
        levelAfter: levelBefore,
        leveledUp: false,
        unlocked: [],
        challengesCompleted: [],
        newRecord: false,
        masteryTierBefore: masteryBefore,
        masteryTierAfter: masteryBefore,
      },
    };
  }

  const outcomeLabel =
    result.outcome === 'win' ? 'فوز' : result.outcome === 'draw' ? 'تعادل' : 'مشاركة';
  if (outcomeXp > 0) lines.push({ label: outcomeLabel, amount: outcomeXp });

  const modeBonus = MODE_BONUS[result.mode] ?? 0;
  if (modeBonus > 0 && result.outcome === 'win') {
    lines.push({ label: 'نمط متقدّم', amount: modeBonus });
  }

  // 3 — flat bonuses.
  const isFirstWinToday =
    result.outcome === 'win' && !state.firstWinDays.includes(today);
  if (isFirstWinToday) lines.push({ label: 'أول فوز اليوم', amount: FIRST_WIN_BONUS });

  const streakAfter = updateStreak(state, today);
  const streakDays = Math.min(STREAK_BONUS_CAP_DAYS, streakAfter.current);
  const streakBonus = streakDays > 1 ? streakDays * STREAK_BONUS_PER_DAY : 0;
  if (streakBonus > 0) lines.push({ label: `تتابع ${streakDays} أيام`, amount: streakBonus });

  // Speed bonus: up to +40% of the base for finishing well inside the target.
  if (result.outcome === 'win' && result.durationMs && result.durationMs > 0) {
    const target = SPEED_TARGET_SECONDS[result.game] * 1000;
    if (result.durationMs < target) {
      const share = 1 - result.durationMs / target;
      const speedBonus = Math.round(outcomeXp * 0.4 * share);
      if (speedBonus > 0) lines.push({ label: 'سرعة الإنجاز', amount: speedBonus });
    }
  }

  // New per-mode record.
  const mastery = state.mastery[result.game] ?? emptyMastery();
  let newRecord = false;
  let nextRecords = mastery.records;
  if (result.record && Number.isFinite(result.record.value)) {
    const previous = mastery.records[result.mode];
    const lowerIsBetter = result.record.lowerIsBetter === true;
    const better =
      previous === undefined
        ? true
        : lowerIsBetter
          ? result.record.value < previous
          : result.record.value > previous;
    if (better) {
      newRecord = true;
      nextRecords = { ...mastery.records, [result.mode]: result.record.value };
      lines.push({ label: 'رقم قياسي جديد', amount: RECORD_BONUS });
    }
  }

  const flatTotal = lines.reduce((acc, line) => acc + line.amount, 0);

  // 4 — multipliers, applied to the flat subtotal.
  let multiplied = flatTotal;
  const difficulty: Difficulty | undefined = result.difficulty;
  if (difficulty && DIFFICULTY_MULTIPLIER[difficulty] !== 1) {
    const factor = DIFFICULTY_MULTIPLIER[difficulty];
    const delta = Math.round(multiplied * (factor - 1));
    multiplied += delta;
    lines.push({ label: 'معامل الصعوبة', amount: delta, multiplier: factor });
  }

  const flawless =
    result.outcome === 'win' && (result.mistakes ?? 0) === 0 && (result.hints ?? 0) === 0;
  if (flawless) {
    const delta = Math.round(multiplied * (FLAWLESS_MULTIPLIER - 1));
    multiplied += delta;
    lines.push({ label: 'بلا أخطاء ولا تلميحات', amount: delta, multiplier: FLAWLESS_MULTIPLIER });
  }

  // 5 — challenges. Evaluated against the sheet BEFORE this match is folded in.
  const sheet = state.challenges!;
  const definitions = challengesForDay(sheet.day);
  const challengesCompleted: string[] = [];
  let challengeXp = 0;

  const nextItems = sheet.items.map((item) => {
    const definition = definitions.find((c) => c.id === item.id);
    if (!definition || item.claimed) return item;

    const delta = challengeDelta(definition, result, item.modes ?? []);
    // `variety` records WHICH modes were seen, not just how many, so replaying
    // one mode cannot advance it.
    const modes =
      definition.kind === 'variety' && definition.game === result.game
        ? (item.modes ?? []).includes(result.mode)
          ? item.modes
          : [...(item.modes ?? []), result.mode]
        : item.modes;

    if (delta === 0) return modes === item.modes ? item : { ...item, modes };

    const progress = Math.min(definition.target, item.progress + delta);
    const completed = progress >= definition.target;
    if (completed && !item.completed) {
      challengesCompleted.push(definition.id);
      challengeXp += definition.xp;
      return { ...item, progress, completed: true, claimed: true, modes };
    }
    return { ...item, progress, completed, modes };
  });

  if (challengeXp > 0) lines.push({ label: 'تحديات اليوم', amount: challengeXp });

  const xpAwarded = Math.max(0, multiplied + challengeXp);

  // 6 — fold everything in.
  const won = result.outcome === 'win';
  const nextMastery = {
    ...state.mastery,
    [result.game]: {
      xp: mastery.xp + xpAwarded,
      played: mastery.played + 1,
      wins: mastery.wins + (won ? 1 : 0),
      records: nextRecords,
      modesPlayed: mastery.modesPlayed.includes(result.mode)
        ? mastery.modesPlayed
        : [...mastery.modesPlayed, result.mode],
    },
  };

  let next: ProgressionState = {
    ...state,
    xp: state.xp + xpAwarded,
    matches: state.matches + 1,
    wins: state.wins + (won ? 1 : 0),
    mastery: nextMastery,
    season: {
      ...state.season,
      xp: state.season.xp + xpAwarded,
      matches: state.season.matches + 1,
      wins: state.season.wins + (won ? 1 : 0),
    },
    streak: streakAfter,
    challenges: { day: sheet.day, items: nextItems },
    // Keep a short window of days: only "today" is ever queried, but a couple
    // of days of slack makes the value legible while debugging.
    firstWinDays: isFirstWinToday ? [today, ...state.firstWinDays].slice(0, 7) : state.firstWinDays,
  };

  // 7 — achievements are evaluated last, against the final state.
  const unlocked = newlyUnlocked(next);
  if (unlocked.length > 0) {
    const stamped = { ...next.achievements };
    for (const id of unlocked) stamped[id] = today;
    next = { ...next, achievements: stamped };
  }

  const levelAfter = levelFromXp(next.xp);

  return {
    state: next,
    report: {
      lines,
      xpAwarded,
      levelBefore,
      levelAfter,
      leveledUp: levelAfter > levelBefore,
      unlocked,
      challengesCompleted,
      newRecord,
      masteryTierBefore: masteryBefore,
      masteryTierAfter: masteryTier(next.mastery[result.game].xp),
    },
  };
}

export type { Challenge };
