import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assessStreakRisk,
  buildStreakSnapshot,
  countConsecutiveDays,
} from '../lib/streakEngine';
import type { DailyContribution } from '../types';

/* ------------------------------------------------------------------ */
/* Integration: the full pipeline the store relies on                  */
/* ------------------------------------------------------------------ */

function isoDaysAgo(days: number, now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function makeCell(dateISO: string, breakdown: Record<string, number>): DailyContribution {
  const d = new Date(`${dateISO}T00:00:00`);
  const total = Object.values(breakdown).reduce<number>((a, b) => a + (b || 0), 0);
  return {
    dateISO,
    dateFormattedAr: dateISO,
    count: total,
    intensity: (total === 0 ? 0 : total >= 10 ? 4 : total >= 6 ? 3 : total >= 3 ? 2 : 1) as
      | 0 | 1 | 2 | 3 | 4,
    dayOfWeek: d.getDay(),
    weekIndex: 0,
    monthIndex: d.getMonth(),
    breakdown: breakdown as DailyContribution['breakdown'],
  };
}

describe('streak integration pipeline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 22, 12, 0, 0)); // Aug 22 2026 noon
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('store pipeline: visit today extends a live streak immediately', () => {
    // Chain: 3 active days ending yesterday. Before today's visit → grace keeps 3.
    const cells = [
      makeCell(isoDaysAgo(3), { german: 2 }),
      makeCell(isoDaysAgo(2), { visits: 1 }),
      makeCell(isoDaysAgo(1), { fitness: 1, diwan: 1 }),
      makeCell(isoDaysAgo(0), {}), // today empty
    ];
    let snap = buildStreakSnapshot(cells);
    expect(snap.unified.currentStreakDays).toBe(3);
    expect(snap.unified.risk.level).toBe('warning');

    // Simulate invalidation after a new visit lands today.
    cells.push(makeCell(isoDaysAgo(0), { visits: 1 }));
    snap = buildStreakSnapshot(cells);
    expect(snap.unified.currentStreakDays).toBe(4);
    expect(snap.unified.risk.level).toBe('safe');
    expect(snap.unified.risk.atRiskToday).toBe(false);
  });

  it('midnight boundary: streak survives into the new day until the day truly ends', () => {
    // Active yesterday only; at 23:59 tonight it's critical; at 00:01 frozen.
    const cells = [makeCell(isoDaysAgo(1), { visits: 1 })];
    const snap = buildStreakSnapshot(cells);
    expect(snap.unified.currentStreakDays).toBe(1);

    const lateNight = new Date(2026, 7, 22, 21, 30, 0);
    expect(assessStreakRisk(new Set([isoDaysAgo(1)]), lateNight).level).toBe('critical');

    const justAfterMidnight = new Date(2026, 7, 22, 0, 30, 0);
    // At 00:30 on the 22nd, "yesterday" is the 21st which is inactive in this set…
    // but the engine anchors to *now*, so build from the fresh perspective:
    const freshCells = [makeCell(isoDaysAgo(1, justAfterMidnight), { visits: 1 })];
    const freshActive = new Set(freshCells.map((c) => c.dateISO));
    expect(assessStreakRisk(freshActive, justAfterMidnight).level).toBe('frozen');
  });

  it('eternal flame badge math: 30-day chain completes, 29 falls one short', () => {
    const progressFor = (days: number) => Math.min(100, Math.round((days / 30) * 100));
    expect(progressFor(30)).toBe(100);
    expect(progressFor(29)).toBe(97);
    expect(progressFor(0)).toBe(0);

    const milestoneLabel = (d: number) =>
      `${Math.min(30, d)}/30 يوماً متتالياً`;
    expect(milestoneLabel(12)).toBe('12/30 يوماً متتالياً');
    expect(milestoneLabel(45)).toBe('30/30 يوماً متتالياً');
  });

  it('grace semantics never overcount: broken chains report zero current', () => {
    const cells = [
      makeCell(isoDaysAgo(5), { visits: 2 }),
      makeCell(isoDaysAgo(4), { visits: 2 }),
      // gap: -3..-1 inactive
      makeCell(isoDaysAgo(0), {}),
    ];
    const snap = buildStreakSnapshot(cells);
    expect(snap.unified.currentStreakDays).toBe(0);
    expect(snap.unified.longestStreakDays).toBe(2); // history preserved
    expect(countConsecutiveDays(
      new Set([isoDaysAgo(5), isoDaysAgo(4)]),
      isoDaysAgo(0),
      true
    )).toBe(0);
  });
});
