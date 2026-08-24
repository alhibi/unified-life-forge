import { beforeEach,describe, expect, it } from 'vitest';

import { SURGE_TOKENS } from '../types';
import { useGermanClubStore } from '../useGermanClubStore';

describe('Surge & Momentum System', () => {
  beforeEach(() => {
    useGermanClubStore.getState().resetMomentum();
  });

  it('enforces exact surge color hex values', () => {
    expect(SURGE_TOKENS.surgeCobalt).toBe('#2D6FF2');
    expect(SURGE_TOKENS.surgeEmberHot).toBe('#FF7A29');
  });

  it('increments session momentum accurately capped at 100', () => {
    const store = useGermanClubStore.getState();
    expect(store.sessionMomentum).toBe(0);

    store.incrementMomentum(25);
    expect(useGermanClubStore.getState().sessionMomentum).toBe(25);

    store.incrementMomentum(90);
    expect(useGermanClubStore.getState().sessionMomentum).toBe(100);
  });

  it('cools session momentum down gradually capped at 0', () => {
    const store = useGermanClubStore.getState();
    store.incrementMomentum(50);
    expect(useGermanClubStore.getState().sessionMomentum).toBe(50);

    store.coolMomentum(20);
    expect(useGermanClubStore.getState().sessionMomentum).toBe(30);

    store.coolMomentum(50);
    expect(useGermanClubStore.getState().sessionMomentum).toBe(0);
  });

  it('tracks animated mastery IDs so shelf ember animation runs only once per mastery event', () => {
    const store = useGermanClubStore.getState();
    const shelfId = 'shelf-test-123';

    expect(useGermanClubStore.getState().animatedMasteryIds.has(shelfId)).toBe(false);

    store.markShelfAnimated(shelfId);
    expect(useGermanClubStore.getState().animatedMasteryIds.has(shelfId)).toBe(true);
  });
});
