import { describe, expect, it } from 'vitest';

import { widgetSpans } from './widgetSpans';

/** Columns occupied in a 2-column grid must never leave a half-empty row. */
const filled = (spans: boolean[]) => spans.reduce((sum, wide) => sum + (wide ? 2 : 1), 0) % 2 === 0;

describe('widgetSpans', () => {
  it('leads each group of five with a wide widget', () => {
    expect(widgetSpans(5)).toEqual([true, false, false, false, false]);
  });
  it('widens the last widget when the trailing squares are odd', () => {
    expect(widgetSpans(4)).toEqual([true, false, false, true]);
    expect(widgetSpans(2)).toEqual([true, true]);
  });
  it('keeps ten widgets as two complete groups', () => {
    expect(widgetSpans(10)).toEqual([true, false, false, false, false, true, false, false, false, false]);
  });
  it('never leaves an empty half row for 1–20 widgets', () => {
    for (let count = 1; count <= 20; count += 1) expect(filled(widgetSpans(count))).toBe(true);
  });
});
