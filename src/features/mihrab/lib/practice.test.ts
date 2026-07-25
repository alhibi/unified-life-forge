/**
 * Practice-store tests.
 *
 * The store is the only thing in Mihrab that holds user data over time, so its
 * edge cases (day rollover, streak gaps, corrupt storage) are the ones worth
 * pinning down: a bug here silently erases someone's record of their worship.
 */
import { describe, expect, it } from 'vitest';

import { SURAH_INDEX, TOTAL_AYAHS } from '../data/surahIndex';
import {
  addDays,
  applyCommitSunnah,
  applyDhikrCount,
  applyDhikrReset,
  applyDhikrTarget,
  applySetWird,
  applySunnahToggle,
  applyToggleDhikrPinned,
  applyWirdToggle,
  dayKey,
  DEFAULT_STATE,
  HISTORY_DAYS,
  isDayActive,
  parseState,
  type PracticeState,
  selectDayProgress,
  selectDhikrCount,
  selectRecentDays,
  selectStreak,
} from './practice';

const TODAY = '2026-07-25';

function stateWith(overrides: Partial<PracticeState> = {}): PracticeState {
  return { ...DEFAULT_STATE, days: {}, ...overrides };
}

describe('day keys', () => {
  it('uses local time, not UTC', () => {
    // 2026-07-25 23:30 local. A UTC key would roll to the 26th for anyone east
    // of Greenwich and split an evening's dhikr across two days.
    const evening = new Date(2026, 6, 25, 23, 30);
    expect(dayKey(evening)).toBe('2026-07-25');
  });

  it('walks across month and year boundaries', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    // 2028 is a leap year.
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });
});

describe('dhikr counting', () => {
  it('accumulates and never goes below zero', () => {
    let state = stateWith();
    state = applyDhikrCount(state, 'subhan-allah', 1, TODAY);
    state = applyDhikrCount(state, 'subhan-allah', 1, TODAY);
    expect(selectDhikrCount(state, 'subhan-allah', TODAY)).toBe(2);
    state = applyDhikrCount(state, 'subhan-allah', -5, TODAY);
    expect(selectDhikrCount(state, 'subhan-allah', TODAY)).toBe(0);
  });

  it('keeps days independent', () => {
    let state = stateWith();
    state = applyDhikrCount(state, 'istighfar', 10, TODAY);
    state = applyDhikrCount(state, 'istighfar', 3, addDays(TODAY, -1));
    expect(selectDhikrCount(state, 'istighfar', TODAY)).toBe(10);
    expect(selectDhikrCount(state, 'istighfar', addDays(TODAY, -1))).toBe(3);
  });

  it('resets one dhikr without touching the others', () => {
    let state = stateWith();
    state = applyDhikrCount(state, 'subhan-allah', 5, TODAY);
    state = applyDhikrCount(state, 'alhamdulillah', 7, TODAY);
    state = applyDhikrReset(state, 'subhan-allah', TODAY);
    expect(selectDhikrCount(state, 'subhan-allah', TODAY)).toBe(0);
    expect(selectDhikrCount(state, 'alhamdulillah', TODAY)).toBe(7);
  });

  it('clamps targets to a sane range', () => {
    let state = applyDhikrTarget(stateWith(), 'subhan-allah', 0);
    expect(state.dhikrTargets.find((t) => t.id === 'subhan-allah')?.target).toBe(1);
    state = applyDhikrTarget(state, 'subhan-allah', 99_999);
    expect(state.dhikrTargets.find((t) => t.id === 'subhan-allah')?.target).toBe(10_000);
  });

  it('pins and unpins dhikr', () => {
    let state = stateWith({ dhikrTargets: [] });
    state = applyToggleDhikrPinned(state, 'istighfar', 100);
    expect(state.dhikrTargets).toEqual([{ id: 'istighfar', target: 100 }]);
    state = applyToggleDhikrPinned(state, 'istighfar', 100);
    expect(state.dhikrTargets).toEqual([]);
  });
});

describe('day progress', () => {
  it('only counts goals the user actually set', () => {
    // Dhikr targets exist by default; no sunnah committed, no wird set.
    let state = stateWith();
    for (const target of state.dhikrTargets) {
      state = applyDhikrCount(state, target.id, target.target, TODAY);
    }
    const progress = selectDayProgress(state, TODAY);
    // An untouched sunnah list must not cap the ring at a third.
    expect(progress.overall).toBe(1);
    expect(progress.complete).toBe(true);
    expect(progress.wirdSet).toBe(false);
  });

  it('weights dhikr, sunnah and wird equally once all three exist', () => {
    let state = stateWith({ dhikrTargets: [{ id: 'istighfar', target: 10 }] });
    state = applyCommitSunnah(state, 'witr');
    state = applySetWird(state, 4);
    // Only the dhikr goal is met → one of three parts.
    state = applyDhikrCount(state, 'istighfar', 10, TODAY);
    expect(selectDayProgress(state, TODAY).overall).toBeCloseTo(1 / 3, 5);
    state = applySunnahToggle(state, 'witr', TODAY);
    expect(selectDayProgress(state, TODAY).overall).toBeCloseTo(2 / 3, 5);
    state = applyWirdToggle(state, TODAY);
    expect(selectDayProgress(state, TODAY).complete).toBe(true);
  });

  it('reports partial dhikr progress', () => {
    let state = stateWith({ dhikrTargets: [{ id: 'istighfar', target: 100 }] });
    state = applyDhikrCount(state, 'istighfar', 25, TODAY);
    expect(selectDayProgress(state, TODAY).dhikrRatio).toBeCloseTo(0.25, 5);
  });

  it('does not exceed 100% when the user overshoots a target', () => {
    let state = stateWith({ dhikrTargets: [{ id: 'istighfar', target: 10 }] });
    state = applyDhikrCount(state, 'istighfar', 500, TODAY);
    expect(selectDayProgress(state, TODAY).dhikrRatio).toBe(1);
  });
});

describe('streaks', () => {
  it('counts consecutive active days ending today', () => {
    let state = stateWith({ dhikrTargets: [] });
    state = applySetWird(state, 4);
    for (const offset of [0, 1, 2]) {
      state = applyWirdToggle(state, addDays(TODAY, -offset));
    }
    const streak = selectStreak(state, TODAY);
    expect(streak.current).toBe(3);
    expect(streak.best).toBe(3);
    expect(streak.total).toBe(3);
  });

  it('does not break the streak just because today is not done yet', () => {
    let state = stateWith({ dhikrTargets: [] });
    state = applySetWird(state, 4);
    state = applyWirdToggle(state, addDays(TODAY, -1));
    state = applyWirdToggle(state, addDays(TODAY, -2));
    // Nothing recorded for today — the run through yesterday still stands.
    expect(selectStreak(state, TODAY).current).toBe(2);
  });

  it('breaks on a gap and remembers the best run', () => {
    let state = stateWith({ dhikrTargets: [] });
    state = applySetWird(state, 4);
    for (const offset of [0, 1, 4, 5, 6, 7]) {
      state = applyWirdToggle(state, addDays(TODAY, -offset));
    }
    const streak = selectStreak(state, TODAY);
    expect(streak.current).toBe(2);
    expect(streak.best).toBe(4);
    expect(streak.total).toBe(6);
  });

  it('treats a partially met day as active', () => {
    // One ticked sunnah is enough: an all-or-nothing rule punishes a busy day.
    let state = stateWith();
    state = applyCommitSunnah(state, 'witr');
    state = applySunnahToggle(state, 'witr', TODAY);
    expect(isDayActive(state, TODAY)).toBe(true);
  });

  it('does not count a day where dhikr fell short of the target', () => {
    let state = stateWith({ dhikrTargets: [{ id: 'istighfar', target: 100 }] });
    state = applyDhikrCount(state, 'istighfar', 4, TODAY);
    expect(isDayActive(state, TODAY)).toBe(false);
  });
});

describe('history retention', () => {
  it('prunes records older than the retention window', () => {
    let state = stateWith({ dhikrTargets: [] });
    state = applySetWird(state, 4);
    const ancient = addDays(TODAY, -(HISTORY_DAYS + 10));
    state = applyWirdToggle(state, ancient);
    // Any later write triggers the prune.
    state = applyWirdToggle(state, TODAY);
    expect(state.days[ancient]).toBeUndefined();
    expect(state.days[TODAY]).toBeDefined();
  });

  it('returns a full strip even with no data', () => {
    const strip = selectRecentDays(stateWith(), 28, TODAY);
    expect(strip).toHaveLength(28);
    expect(strip[27].key).toBe(TODAY);
    expect(strip.every((d) => d.active === false)).toBe(true);
  });
});

describe('parseState', () => {
  it('falls back to defaults on garbage', () => {
    expect(parseState(null)).toEqual(DEFAULT_STATE);
    expect(parseState('not json')).toEqual(DEFAULT_STATE);
    expect(parseState('[1,2,3]')).toEqual(DEFAULT_STATE);
  });

  it('drops malformed day keys and negative counts', () => {
    const parsed = parseState(
      JSON.stringify({
        days: {
          'not-a-date': { dhikr: { a: 5 } },
          '2026-07-25': { dhikr: { a: -3, b: 7 }, sunnah: { witr: true, x: 'yes' }, wirdDone: true },
        },
        dhikrTargets: [{ id: 'istighfar', target: 100 }, 'junk'],
        committedSunnah: ['witr', 42],
        wird: { pages: 4 },
      }),
    );
    expect(parsed.days['not-a-date']).toBeUndefined();
    expect(parsed.days['2026-07-25'].dhikr).toEqual({ b: 7 });
    expect(parsed.days['2026-07-25'].sunnah).toEqual({ witr: true });
    expect(parsed.dhikrTargets).toEqual([{ id: 'istighfar', target: 100 }]);
    expect(parsed.committedSunnah).toEqual(['witr']);
    expect(parsed.wird).toEqual({ pages: 4 });
  });

  it('clamps an absurd wird', () => {
    expect(parseState(JSON.stringify({ wird: { pages: 9999 } })).wird).toEqual({ pages: 120 });
  });
});

describe('surah index', () => {
  it('has all 114 sūrahs in order', () => {
    expect(SURAH_INDEX).toHaveLength(114);
    SURAH_INDEX.forEach((surah, i) => expect(surah.number).toBe(i + 1));
  });

  it('sums to the standard Kufan ayah count', () => {
    // A typo in any single row moves this total.
    expect(SURAH_INDEX.reduce((acc, s) => acc + s.ayahs, 0)).toBe(TOTAL_AYAHS);
  });

  it('has a non-empty name and a valid place for every sūrah', () => {
    for (const surah of SURAH_INDEX) {
      expect(surah.name.length).toBeGreaterThan(0);
      expect(['makkah', 'madinah']).toContain(surah.place);
      expect(surah.ayahs).toBeGreaterThan(0);
    }
  });
});
