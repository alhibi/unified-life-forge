import { describe, expect, it } from 'vitest';

import type { DailyContribution } from '../types';
import {
  analyzeWeeklyRhythm,
  assessStreakRisk,
  buildStreakSnapshot,
  countConsecutiveDays,
  findLongestRun,
  getModuleLabelAr,
} from './streakEngine';
import { toLocalDateISO } from './visitTracker';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function isoDaysAgo(days: number, now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return toLocalDateISO(d);
}

function makeCell(
  dateISO: string,
  breakdown: Partial<Record<string, number>>
): DailyContribution {
  const d = new Date(`${dateISO}T00:00:00`);
  const total = Object.values(breakdown).reduce<number>((a, b) => a + (b || 0), 0);
  return {
    dateISO,
    dateFormattedAr: dateISO,
    count: total,
    intensity: (total === 0 ? 0 : total >= 10 ? 4 : total >= 6 ? 3 : total >= 3 ? 2 : 1) as
      | 0
      | 1
      | 2
      | 3
      | 4,
    dayOfWeek: d.getDay(),
    weekIndex: 0,
    monthIndex: d.getMonth(),
    breakdown: breakdown as DailyContribution['breakdown'],
  };
}


/** Builds a continuous run of active cells ending at the given offsets. */
function cellsForActiveDays(
  activeOffsetsAgo: number[],
  windowSize = 30
): DailyContribution[] {
  const cells: DailyContribution[] = [];
  for (let off = windowSize - 1; off >= 0; off--) {
    cells.push(makeCell(isoDaysAgo(off), {}));
  }
  for (const off of activeOffsetsAgo) {
    const target = isoDaysAgo(off);
    const cell = cells.find((c) => c.dateISO === target)!;
    cell.breakdown = { visits: 2 };
    cell.count = 2;
    cell.intensity = 1;
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/* countConsecutiveDays                                                */
/* ------------------------------------------------------------------ */

describe('countConsecutiveDays', () => {
  it('counts a simple consecutive run ending today', () => {
    const set = new Set([isoDaysAgo(0), isoDaysAgo(1), isoDaysAgo(2)]);
    expect(countConsecutiveDays(set, isoDaysAgo(0), true)).toBe(3);
  });

  it('applies grace when today is missing but yesterday is active', () => {
    const set = new Set([isoDaysAgo(1), isoDaysAgo(2)]);
    expect(countConsecutiveDays(set, isoDaysAgo(0), true)).toBe(2);
    expect(countConsecutiveDays(set, isoDaysAgo(0), false)).toBe(0);
  });

  it('breaks after one fully missed day', () => {
    const set = new Set([isoDaysAgo(0), isoDaysAgo(2), isoDaysAgo(3)]);
    expect(countConsecutiveDays(set, isoDaysAgo(0), false)).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* findLongestRun                                                      */
/* ------------------------------------------------------------------ */

describe('findLongestRun', () => {
  it('finds the longest historical run even if broken today', () => {
    const set = new Set([
      isoDaysAgo(10),
      isoDaysAgo(9),
      isoDaysAgo(8),
      isoDaysAgo(7),
      isoDaysAgo(8 + 30),
      isoDaysAgo(8 + 31),
    ]);
    expect(findLongestRun(set)).toBe(4);
  });

  it('returns zero for an empty set and one for a single day', () => {
    expect(findLongestRun(new Set())).toBe(0);
    expect(findLongestRun(new Set([isoDaysAgo(5)]))).toBe(1);
  });

  it('handles month boundaries correctly (Jan 31 → Feb 1)', () => {
    expect(findLongestRun(new Set(['2026-01-31', '2026-02-01']))).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/* assessStreakRisk                                                    */
/* ------------------------------------------------------------------ */

describe('assessStreakRisk', () => {
  it('is safe when today already has activity', () => {
    const set = new Set([isoDaysAgo(0), isoDaysAgo(1)]);
    const risk = assessStreakRisk(set, new Date());
    expect(risk.level).toBe('safe');
    expect(risk.atRiskToday).toBe(false);
  });

  it('is critical late in the evening when today is empty but yesterday was active', () => {
    const now = new Date();
    now.setHours(21, 30, 0, 0);
    const set = new Set([isoDaysAgo(1), isoDaysAgo(2)]);
    const risk = assessStreakRisk(set, now);
    expect(risk.level).toBe('critical');
    expect(risk.atRiskToday).toBe(true);
  });

  it('is warning during the day when the chain is alive via yesterday', () => {
    const now = new Date();
    now.setHours(14, 0, 0, 0);
    const set = new Set([isoDaysAgo(1)]);
    const risk = assessStreakRisk(set, now);
    expect(risk.level).toBe('warning');
    expect(risk.atRiskToday).toBe(true);
  });

  it('is frozen before 5am while yesterday still holds the chain', () => {
    const now = new Date();
    now.setHours(2, 0, 0, 0);
    const set = new Set([isoDaysAgo(1)]);
    const risk = assessStreakRisk(set, now);
    expect(risk.level).toBe('frozen');
    expect(risk.atRiskToday).toBe(true);
  });

  it('is safe-with-message when no live chain exists at all', () => {
    const now = new Date();
    now.setHours(15, 0, 0, 0);
    const set = new Set([isoDaysAgo(5)]);
    const risk = assessStreakRisk(set, now);
    expect(risk.level).toBe('safe');
    expect(risk.atRiskToday).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* analyzeWeeklyRhythm                                                 */
/* ------------------------------------------------------------------ */

describe('analyzeWeeklyRhythm', () => {
  it('identifies strongest and weakest weekdays', () => {
    // Build 4 weeks where Sunday always has heavy load and Tuesday none.
    const cells: DailyContribution[] = [];
    for (let week = 0; week < 4; week++) {
      for (let dow = 0; dow < 7; dow++) {
        const d = new Date();
        d.setDate(d.getDate() - (week * 7 + dow));
        const iso = toLocalDateISO(d);
        const count = d.getDay() === 0 ? 12 : d.getDay() === 2 ? 0 : 3;
        cells.push(makeCell(iso, { visits: count }));
      }
    }
    const rhythm = analyzeWeeklyRhythm(cells);
    expect(rhythm.strongestDayNameAr).toBe('الأحد');
    expect(rhythm.weakestDayNameAr).toBe('الثلاثاء');
    expect(rhythm.averagesByDayOfWeek[0]).toBeGreaterThan(
      rhythm.averagesByDayOfWeek[2]
    );
  });
});

/* ------------------------------------------------------------------ */
/* buildStreakSnapshot                                                 */
/* ------------------------------------------------------------------ */

describe('buildStreakSnapshot', () => {
  it('unifies streaks across modules and computes per-module data', () => {
    // Active yesterday & day-before with two different modules per day.
    const cells: DailyContribution[] = [
      makeCell(isoDaysAgo(2), { german: 3, fitness: 2 }),
      makeCell(isoDaysAgo(1), { german: 1 }),
      makeCell(isoDaysAgo(0), {}), // today: not yet active
    ];
    const snap = buildStreakSnapshot(cells);

    expect(snap.unified.currentStreakDays).toBe(2); // grace for today
    expect(snap.unified.risk.atRiskToday).toBe(true);

    const german = snap.modules.find((m) => m.category === 'german')!;
    expect(german.currentStreakDays).toBe(2); // active both yesterday & -2
    expect(german.activeDaysCount).toBe(2);
    expect(german.totalContributions).toBe(4);

    const fitness = snap.modules.find((m) => m.category === 'fitness')!;
    expect(fitness.currentStreakDays).toBe(0); // last fitness day (-2) no longer connects
    expect(fitness.activeDaysCount).toBe(1);
    expect(fitness.longestStreakDays).toBe(1); // historical run preserved
  });

  it('resolves next milestone correctly across thresholds', () => {
    const offsets: number[] = [];
    for (let i = 1; i <= 7; i++) offsets.push(i); // 7-day chain ending yesterday
    const snap = buildStreakSnapshot(cellsForActiveDays(offsets));

    expect(snap.unified.currentStreakDays).toBe(7);
    expect(snap.unified.nextMilestone?.days).toBe(14);
    expect(snap.unified.nextMilestone?.labelAr).toContain('عقد النية');
  });

  it('returns null milestone beyond the final threshold', () => {
    const offsets: number[] = [];
    for (let i = 1; i <= 400; i++) offsets.push(i);
    const snap = buildStreakSnapshot(cellsForActiveDays(offsets, 410));
    expect(snap.unified.currentStreakDays).toBe(400);
    expect(snap.unified.nextMilestone).toBeNull(); // past 365 → all milestones done
  });

  it('detects the best (golden) day', () => {
    const cells: DailyContribution[] = [
      makeCell(isoDaysAgo(3), { visits: 1 }),
      makeCell(isoDaysAgo(2), { german: 5, fitness: 5, diwan: 2 }),
      makeCell(isoDaysAgo(1), { visits: 2 }),
    ];
    const snap = buildStreakSnapshot(cells);
    expect(snap.bestDay?.dateISO).toBe(isoDaysAgo(2));
    expect(snap.bestDay?.count).toBe(12);
  });

  it('handles a completely empty history gracefully', () => {
    const snap = buildStreakSnapshot([]);
    expect(snap.unified.currentStreakDays).toBe(0);
    expect(snap.unified.nextMilestone?.days).toBe(3);
    expect(snap.bestDay).toBeNull();
    expect(snap.lastActiveDateISO).toBeNull();
  });

  it('labels every module in Arabic without gaps', () => {
    const snap = buildStreakSnapshot([]);
    for (const m of snap.modules) {
      expect(getModuleLabelAr(m.category)).toBeTruthy();
      expect(getModuleLabelAr(m.category)).not.toBe('نشاطات');
    }
  });
});
