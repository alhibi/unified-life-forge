import { afterEach, describe, expect, it } from 'vitest';

import { conserveLevel, isConserving, isDataSaving, pollInterval } from '../conserve';

/**
 * These tests pin the *policy*, not the implementation: the whole point of
 * conserve.ts is that one place decides how much background work is allowed, so
 * the interesting assertions are about the numbers a poller receives.
 */

function setAttr(name: 'data-battery-saver' | 'data-data-saver', value: boolean | null) {
  if (value === null) document.documentElement.removeAttribute(name);
  else document.documentElement.setAttribute(name, String(value));
}

afterEach(() => {
  setAttr('data-battery-saver', null);
  setAttr('data-data-saver', null);
});

describe('conserve policy', () => {
  it('is off on a healthy device, and a poller gets exactly the interval it asked for', () => {
    expect(conserveLevel()).toBe('off');
    expect(isConserving()).toBe(false);
    expect(pollInterval(30_000)).toBe(30_000);
    expect(pollInterval(30_000, true)).toBe(30_000);
  });

  it('stretches intervals when the user turns on battery saving', () => {
    setAttr('data-battery-saver', true);
    expect(conserveLevel()).toBe('soft');
    expect(pollInterval(30_000)).toBe(90_000);
  });

  it('treats data saving as a reason to back off too', () => {
    setAttr('data-data-saver', true);
    expect(isDataSaving()).toBe(true);
    expect(conserveLevel()).toBe('soft');
  });

  it('suspends optional work entirely — but never essential work — at the hard level', () => {
    setAttr('data-battery-saver', true);
    setAttr('data-data-saver', true);
    expect(conserveLevel()).toBe('hard');
    // Optional work stops completely...
    expect(pollInterval(30_000, true)).toBeNull();
    // ...while essential work only slows down, so nothing ever looks frozen.
    expect(pollInterval(30_000)).toBe(180_000);
  });

  it('never returns null for essential work, at any level', () => {
    for (const [battery, data] of [
      [false, false],
      [true, false],
      [false, true],
      [true, true],
    ] as const) {
      setAttr('data-battery-saver', battery);
      setAttr('data-data-saver', data);
      expect(pollInterval(10_000, false)).not.toBeNull();
    }
  });
});
