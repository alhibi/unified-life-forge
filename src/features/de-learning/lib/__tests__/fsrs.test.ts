import { describe, expect, test } from 'vitest';

import { calculateRetrievability, runFsrsMultiDaySimulation,updateFsrs } from '../fsrs';

describe('German Learning Spaced Repetition Engine (FSRS)', () => {
  test('correctly calculates retrievability probability', () => {
    // If we review exactly at stability duration, R should be 90%
    const rAtStability = calculateRetrievability(10, 10);
    expect(rAtStability).toBeCloseTo(0.9, 1);

    // If we wait longer, retrievability should decay
    const rLater = calculateRetrievability(10, 5);
    const rMuchLater = calculateRetrievability(10, 20);
    expect(rLater).toBeGreaterThan(rMuchLater);
  });

  test('updates stability and difficulty correctly for different ratings', () => {
    // Test 'again' rating (lapse)
    const onAgain = updateFsrs(10, 5, 'again', 10);
    expect(onAgain.stability).toBeLessThan(10); // Stability must drop sharply on lapse
    expect(onAgain.difficulty).toBeGreaterThan(5); // Difficulty must increase on failure

    // Test 'good' rating
    const onGood = updateFsrs(2.5, 4, 'good', 3);
    expect(onGood.stability).toBeGreaterThan(2.5); // Stability should expand
    expect(onGood.difficulty).toBeLessThanOrEqual(4); // Difficulty should decrease/stay stable
  });

  test('runs a multi-day review simulation successfully', () => {
    const simulation = runFsrsMultiDaySimulation(1.0, 5.0, [
      { rating: 'good', elapsedDays: 1 },
      { rating: 'good', elapsedDays: 3 },
      { rating: 'easy', elapsedDays: 8 },
      { rating: 'again', elapsedDays: 15 }, // lapse
    ]);

    expect(simulation).toHaveLength(4);
    // After several good reviews, stability should have grown
    expect(simulation[2].stability).toBeGreaterThan(4);
    // After 'again', stability drops sharply
    expect(simulation[3].stability).toBeLessThan(simulation[2].stability);
  });
});
