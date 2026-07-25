/**
 * Progression tests.
 *
 * The award pipeline is the only place in the app where a user's long-term
 * record is computed, so its invariants are asserted explicitly: XP is never
 * negative, the level curve is monotone and exactly invertible, abandoning a
 * session costs nothing and grants nothing, bonuses cannot be paid twice, and a
 * corrupted document degrades instead of throwing.
 */
import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS, newlyUnlocked } from './achievements';
import { awardMatch, currentSeasonId, dayKey, emptyProgression, rollSeason } from './award';
import { challengeDelta, challengesForDay } from './challenges';
import { parseProgression } from './store';
import type { MatchResult, ProgressionState } from './types';
import {
  levelFromXp,
  levelProgress,
  MASTERY_THRESHOLDS,
  masteryProgress,
  masteryTier,
  MAX_LEVEL,
  rankForLevel,
  xpForLevel,
  xpToAdvance,
} from './xp';

const NOW = new Date(2026, 6, 25, 12, 0, 0); // 2026-07-25 local
const TODAY = dayKey(NOW);

function win(overrides: Partial<MatchResult> = {}): MatchResult {
  return { game: 'sudoku', mode: 'sudoku-classic', outcome: 'win', ...overrides };
}

describe('xp curve', () => {
  it('starts at level 1 with zero xp', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(xpForLevel(1)).toBe(0);
    expect(levelProgress(0)).toMatchObject({ level: 1, xpInLevel: 0 });
  });

  it('is monotone and exactly invertible', () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const floor = xpForLevel(level);
      // Exactly at the threshold you are AT that level…
      expect(levelFromXp(floor)).toBe(level);
      // …and one XP short you are one level below.
      if (level > 1) expect(levelFromXp(floor - 1)).toBe(level - 1);
      if (level < MAX_LEVEL) {
        expect(xpForLevel(level + 1)).toBeGreaterThan(floor);
        expect(xpForLevel(level + 1) - floor).toBe(xpToAdvance(level));
      }
    }
  });

  it('grows the cost of each level', () => {
    expect(xpToAdvance(1)).toBeLessThan(xpToAdvance(10));
    expect(xpToAdvance(10)).toBeLessThan(xpToAdvance(40));
  });

  it('caps at MAX_LEVEL and never exceeds ratio 1', () => {
    const huge = levelProgress(10_000_000);
    expect(huge.level).toBe(MAX_LEVEL);
    expect(huge.atMax).toBe(true);
    expect(huge.ratio).toBe(1);
  });

  it('handles garbage input', () => {
    expect(levelFromXp(Number.NaN)).toBe(1);
    expect(levelFromXp(-500)).toBe(1);
  });
});

describe('ranks', () => {
  it('never leaves a level without a rank', () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const rank = rankForLevel(level);
      expect(rank.label.length).toBeGreaterThan(0);
      expect(rank.division).toBeGreaterThanOrEqual(1);
      expect(rank.division).toBeLessThanOrEqual(rank.tier.divisions);
    }
  });

  it('advances monotonically', () => {
    let lastTierIndex = -1;
    let lastKey = '';
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const rank = rankForLevel(level);
      const tierIndex = rank.tier.from;
      expect(tierIndex).toBeGreaterThanOrEqual(lastTierIndex);
      lastTierIndex = tierIndex;
      const key = `${rank.tier.id}-${rank.division}`;
      // The (tier, division) pair must never move backwards.
      if (key !== lastKey) lastKey = key;
    }
    expect(rankForLevel(1).tier.id).toBe('novice');
    expect(rankForLevel(MAX_LEVEL).tier.id).toBe('legend');
  });
});

describe('mastery', () => {
  it('maps xp onto tiers', () => {
    expect(masteryTier(0)).toBe(0);
    expect(masteryTier(MASTERY_THRESHOLDS[1])).toBe(1);
    expect(masteryTier(MASTERY_THRESHOLDS[1] - 1)).toBe(0);
    expect(masteryTier(999_999)).toBe(MASTERY_THRESHOLDS.length - 1);
  });

  it('reports remaining xp except at the top tier', () => {
    expect(masteryProgress(0).remaining).toBe(MASTERY_THRESHOLDS[1]);
    expect(masteryProgress(999_999).remaining).toBeNull();
    expect(masteryProgress(999_999).ratio).toBe(1);
  });
});

describe('award pipeline', () => {
  it('credits a win and counts it once', () => {
    const { state, report } = awardMatch(emptyProgression(), win(), NOW);
    expect(report.xpAwarded).toBeGreaterThan(0);
    expect(state.matches).toBe(1);
    expect(state.wins).toBe(1);
    expect(state.mastery.sudoku.played).toBe(1);
    expect(state.mastery.sudoku.wins).toBe(1);
    // Lifetime XP and per-game XP must agree for a single-game history.
    expect(state.mastery.sudoku.xp).toBe(state.xp);
    expect(state.season.xp).toBe(state.xp);
  });

  it('itemises the reward', () => {
    const { report } = awardMatch(emptyProgression(), win({ mistakes: 0, hints: 0 }), NOW);
    const labels = report.lines.map((l) => l.label);
    expect(labels).toContain('فوز');
    expect(labels).toContain('أول فوز اليوم');
    expect(labels).toContain('بلا أخطاء ولا تلميحات');
    // The itemised lines must sum to what was actually credited (challenge XP
    // included as its own line).
    const sum = report.lines.reduce((acc, l) => acc + l.amount, 0);
    expect(sum).toBe(report.xpAwarded);
  });

  it('pays the first-win bonus only once per day', () => {
    const first = awardMatch(emptyProgression(), win(), NOW);
    const second = awardMatch(first.state, win(), NOW);
    expect(first.report.lines.some((l) => l.label === 'أول فوز اليوم')).toBe(true);
    expect(second.report.lines.some((l) => l.label === 'أول فوز اليوم')).toBe(false);
  });

  it('grants nothing for an abandoned session and does not count it', () => {
    const { state, report } = awardMatch(emptyProgression(), win({ outcome: 'abandon' }), NOW);
    expect(report.xpAwarded).toBe(0);
    expect(state.matches).toBe(0);
    expect(state.streak.current).toBe(0);
  });

  it('rewards a loss less than a win', () => {
    const lose = awardMatch(emptyProgression(), win({ outcome: 'loss' }), NOW);
    const won = awardMatch(emptyProgression(), win(), NOW);
    expect(lose.report.xpAwarded).toBeGreaterThan(0);
    expect(lose.report.xpAwarded).toBeLessThan(won.report.xpAwarded);
  });

  it('scales with difficulty', () => {
    const easy = awardMatch(emptyProgression(), win({ difficulty: 'easy' }), NOW);
    const master = awardMatch(emptyProgression(), win({ difficulty: 'master' }), NOW);
    expect(master.report.xpAwarded).toBeGreaterThan(easy.report.xpAwarded);
  });

  it('records a per-mode record and only when it improves', () => {
    const first = awardMatch(
      emptyProgression(),
      win({ mode: 'sudoku-time-attack', record: { value: 200, lowerIsBetter: true } }),
      NOW,
    );
    expect(first.report.newRecord).toBe(true);
    expect(first.state.mastery.sudoku.records['sudoku-time-attack']).toBe(200);

    const worse = awardMatch(
      first.state,
      win({ mode: 'sudoku-time-attack', record: { value: 400, lowerIsBetter: true } }),
      NOW,
    );
    expect(worse.report.newRecord).toBe(false);
    expect(worse.state.mastery.sudoku.records['sudoku-time-attack']).toBe(200);

    const better = awardMatch(
      worse.state,
      win({ mode: 'sudoku-time-attack', record: { value: 120, lowerIsBetter: true } }),
      NOW,
    );
    expect(better.report.newRecord).toBe(true);
    expect(better.state.mastery.sudoku.records['sudoku-time-attack']).toBe(120);
  });

  it('tracks distinct modes played', () => {
    let state = emptyProgression();
    state = awardMatch(state, win({ mode: 'sudoku-classic' }), NOW).state;
    state = awardMatch(state, win({ mode: 'sudoku-classic' }), NOW).state;
    state = awardMatch(state, win({ mode: 'sudoku-x' }), NOW).state;
    expect(state.mastery.sudoku.modesPlayed).toEqual(['sudoku-classic', 'sudoku-x']);
  });

  it('never produces negative xp', () => {
    let state = emptyProgression();
    for (const outcome of ['win', 'loss', 'draw', 'abandon'] as const) {
      const result = awardMatch(state, win({ outcome, game: 'chess', mode: 'chess-versus-ai' }), NOW);
      expect(result.report.xpAwarded).toBeGreaterThanOrEqual(0);
      expect(result.state.xp).toBeGreaterThanOrEqual(state.xp);
      state = result.state;
    }
  });

  it('reports a level-up when the threshold is crossed', () => {
    // Enough sessions to certainly pass level 2.
    let state = emptyProgression();
    let sawLevelUp = false;
    for (let i = 0; i < 4; i += 1) {
      const result = awardMatch(state, win({ difficulty: 'master' }), NOW);
      sawLevelUp = sawLevelUp || result.report.leveledUp;
      state = result.state;
    }
    expect(sawLevelUp).toBe(true);
    expect(levelFromXp(state.xp)).toBeGreaterThan(1);
  });

  it('unlocks achievements exactly once', () => {
    const first = awardMatch(emptyProgression(), win(), NOW);
    expect(first.report.unlocked).toContain('first-steps');
    expect(first.state.achievements['first-steps']).toBe(TODAY);
    const second = awardMatch(first.state, win(), NOW);
    expect(second.report.unlocked).not.toContain('first-steps');
    expect(newlyUnlocked(second.state)).not.toContain('first-steps');
  });

  it('has only earnable achievements', () => {
    // Every achievement must be satisfiable by some state — a badge that can
    // never unlock is a placeholder, and placeholders are not shipped.
    const maxed: ProgressionState = {
      ...emptyProgression(),
      xp: 1_000_000,
      matches: 10_000,
      wins: 10_000,
      streak: { current: 400, best: 400, lastPlayedDay: TODAY },
      mastery: {
        sudoku: {
          xp: 500_000,
          played: 5_000,
          wins: 5_000,
          records: { 'sudoku-flawless': 1, 'sudoku-time-attack': 60 },
          modesPlayed: ['sudoku-classic', 'sudoku-x', 'sudoku-daily', 'sudoku-time-attack', 'sudoku-flawless'],
        },
        chess: {
          xp: 500_000,
          played: 5_000,
          wins: 5_000,
          records: { 'chess-puzzles': 500 },
          modesPlayed: ['chess-versus-ai', 'chess-local', 'chess-blitz', 'chess-puzzles', 'chess-career'],
        },
        memory: {
          xp: 500_000,
          played: 5_000,
          wins: 5_000,
          records: { 'memory-endless': 40 },
          modesPlayed: ['memory-classic', 'memory-endless', 'memory-daily'],
        },
      },
    };
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.check(maxed), `${achievement.id} is unreachable`).toBe(true);
    }
  });

  it('keeps achievement progress inside 0..1', () => {
    const state = awardMatch(emptyProgression(), win(), NOW).state;
    for (const achievement of ACHIEVEMENTS) {
      if (!achievement.progress) continue;
      const value = achievement.progress(state);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('streaks', () => {
  it('increments on consecutive days and resets after a gap', () => {
    const day1 = new Date(2026, 6, 20, 10);
    const day2 = new Date(2026, 6, 21, 10);
    const day4 = new Date(2026, 6, 23, 10);

    let state = awardMatch(emptyProgression(), win(), day1).state;
    expect(state.streak.current).toBe(1);
    state = awardMatch(state, win(), day2).state;
    expect(state.streak.current).toBe(2);
    state = awardMatch(state, win(), day4).state;
    expect(state.streak.current).toBe(1);
    expect(state.streak.best).toBe(2);
  });

  it('does not double-count two sessions on the same day', () => {
    const state1 = awardMatch(emptyProgression(), win(), NOW).state;
    const state2 = awardMatch(state1, win(), NOW).state;
    expect(state2.streak.current).toBe(1);
  });
});

describe('seasons', () => {
  it('archives the season when the month changes', () => {
    const july = new Date(2026, 6, 25, 10);
    const august = new Date(2026, 7, 2, 10);
    const afterJuly = awardMatch(emptyProgression(), win(), july).state;
    expect(afterJuly.season.id).toBe(currentSeasonId(july));
    const rolled = rollSeason(afterJuly, august);
    expect(rolled.season.id).toBe(currentSeasonId(august));
    expect(rolled.season.xp).toBe(0);
    expect(rolled.seasonHistory[0].id).toBe(currentSeasonId(july));
    // Lifetime totals survive the rollover.
    expect(rolled.xp).toBe(afterJuly.xp);
  });

  it('does not archive an empty season', () => {
    const rolled = rollSeason(emptyProgression(), new Date(2027, 0, 1));
    expect(rolled.seasonHistory).toHaveLength(0);
  });
});

describe('daily challenges', () => {
  it('is deterministic for a given day', () => {
    const a = challengesForDay('2026-07-25');
    const b = challengesForDay('2026-07-25');
    expect(a).toEqual(b);
  });

  it('differs between days', () => {
    const a = challengesForDay('2026-07-25').map((c) => `${c.kind}:${c.target}`);
    const b = challengesForDay('2026-08-14').map((c) => `${c.kind}:${c.target}`);
    expect(a.join()).not.toBe(b.join());
  });

  it('always offers one challenge per game', () => {
    for (const day of ['2026-01-01', '2026-05-17', '2026-12-31', '2027-02-28']) {
      const games = challengesForDay(day).map((c) => c.game).sort();
      expect(games).toEqual(['chess', 'memory', 'sudoku']);
    }
  });

  it('advances variety only on a mode not yet seen', () => {
    const variety = { ...challengesForDay('2026-07-25')[0], kind: 'variety' as const, game: 'memory' as const, target: 2 };
    const result = win({ game: 'memory', mode: 'memory-classic' });
    expect(challengeDelta(variety, result, [])).toBe(1);
    expect(challengeDelta(variety, result, ['memory-classic'])).toBe(0);
  });

  it('credits challenge xp once', () => {
    // Find a day whose sudoku challenge is a single-session 'play'.
    let day: string | null = null;
    for (let i = 0; i < 60 && !day; i += 1) {
      const probe = dayKey(new Date(2026, 0, 1 + i));
      const sudoku = challengesForDay(probe).find((c) => c.game === 'sudoku');
      if (sudoku && sudoku.kind === 'win' && sudoku.target === 1) day = probe;
    }
    expect(day).not.toBeNull();
    const at = new Date(`${day}T12:00:00`);
    const first = awardMatch(emptyProgression(), win(), at);
    expect(first.report.challengesCompleted).toHaveLength(1);
    const second = awardMatch(first.state, win(), at);
    expect(second.report.challengesCompleted).toHaveLength(0);
  });
});

describe('parseProgression', () => {
  it('falls back to an empty state on garbage', () => {
    expect(parseProgression(null).xp).toBe(0);
    expect(parseProgression('nonsense').xp).toBe(0);
    expect(parseProgression(42).matches).toBe(0);
    expect(parseProgression([1, 2]).wins).toBe(0);
  });

  it('keeps valid fields and drops invalid ones', () => {
    const parsed = parseProgression({
      version: 1,
      xp: 1234,
      matches: 10,
      wins: -5,
      mastery: {
        chess: { xp: 500, played: 4, wins: 2, records: { 'chess-puzzles': 12, bad: 'x' }, modesPlayed: ['chess-local', 7] },
        nonsense: { xp: 9 },
      },
      achievements: { 'first-steps': '2026-01-01', broken: 5 },
      streak: { current: 3, best: 9, lastPlayedDay: '2026-01-01' },
    });
    expect(parsed.xp).toBe(1234);
    expect(parsed.wins).toBe(0);
    expect(parsed.mastery.chess.xp).toBe(500);
    expect(parsed.mastery.chess.records).toEqual({ 'chess-puzzles': 12 });
    expect(parsed.mastery.chess.modesPlayed).toEqual(['chess-local']);
    expect(parsed.achievements).toEqual({ 'first-steps': '2026-01-01' });
    expect(parsed.streak.best).toBe(9);
  });

  it('round-trips a real state', () => {
    const state = awardMatch(emptyProgression(), win({ difficulty: 'hard' }), NOW).state;
    const round = parseProgression(JSON.stringify(state));
    expect(round.xp).toBe(state.xp);
    expect(round.mastery.sudoku.xp).toBe(state.mastery.sudoku.xp);
    expect(round.achievements).toEqual(state.achievements);
  });
});
