import { describe, expect, it } from 'vitest';

import { describeOutcome } from '../scoutOutcome';

describe('describeOutcome — honest copy per situation', () => {
  it('celebrates a clean run', () => {
    const got = describeOutcome({ filed: 12, total: 14, failed: 0, duplicates: 0 });
    expect(got.tone).toBe('success');
    expect(got.text).toContain('12');
  });

  it('acknowledges duplicates alongside new finds', () => {
    const got = describeOutcome({ filed: 5, total: 9, failed: 0, duplicates: 4 });
    expect(got.tone).toBe('success');
    expect(got.text).toContain('5');
    expect(got.text).toContain('4');
  });

  it('admits partial failure instead of faking success', () => {
    const got = describeOutcome({ filed: 3, total: 8, failed: 5, duplicates: 0 });
    expect(got.text).toContain('تعذر إكمال 5');
  });

  it('tells the truth when everything was already known', () => {
    const got = describeOutcome({ filed: 0, total: 7, failed: 0, duplicates: 7 });
    expect(got.tone).toBe('info');
    expect(got.text).toContain('مسبقاً');
  });

  it('suggests another attempt when nothing landed', () => {
    const got = describeOutcome({ filed: 0, total: 6, failed: 6, duplicates: 0 });
    expect(got.tone).toBe('info');
    expect(got.text).toContain('عمقاً أعلى');
  });
});
