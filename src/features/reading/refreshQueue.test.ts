import { describe, expect, it } from 'vitest';

import { backoffDelay, planRefresh, pruneState, recordOutcomes } from './refreshQueue';
import type { FeedSource } from './types';

const feed = (url: string, enabled = true): FeedSource =>
  ({ url, name: url, enabled }) as FeedSource;

describe('refreshQueue', () => {
  it('backs off 5m, 10m, 20m and caps at 6h', () => {
    expect(backoffDelay(1)).toBe(5 * 60_000);
    expect(backoffDelay(2)).toBe(10 * 60_000);
    expect(backoffDelay(3)).toBe(20 * 60_000);
    expect(backoffDelay(20)).toBe(6 * 60 * 60_000);
  });

  it('defers a failing source in background runs but not on a user pull', () => {
    const state = recordOutcomes({}, [{ url: 'b', ok: false }], 1000);
    const feeds = [feed('a'), feed('b'), feed('c', false)];
    const bg = planRefresh(feeds, state, 2000);
    expect(bg.due.map((f) => f.url)).toEqual(['a']);
    expect(bg.deferred.map((d) => d.feed.url)).toEqual(['b']);
    expect(planRefresh(feeds, state, 2000, true).due.map((f) => f.url)).toEqual(['a', 'b']);
  });

  it('retries a source once its delay has elapsed, healthy ones first', () => {
    const state = recordOutcomes({}, [{ url: 'a', ok: false }], 0);
    const plan = planRefresh([feed('a'), feed('b')], state, 5 * 60_000);
    expect(plan.due.map((f) => f.url)).toEqual(['b', 'a']);
  });

  it('clears the streak on success and prunes removed sources', () => {
    let state = recordOutcomes({}, [{ url: 'a', ok: false }, { url: 'x', ok: false }], 0);
    state = recordOutcomes(state, [{ url: 'a', ok: true }], 1);
    expect(state.a).toBeUndefined();
    expect(Object.keys(pruneState(state, [feed('a')]))).toEqual([]);
  });
});
