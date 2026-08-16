import { describe, expect, it } from 'vitest';

import {
  AR_ROWS,
  caretDelta,
  EASTERN_NUMBER_ROW,
  EN_ROWS,
  HARAKAT,
  isRtlLayout,
  WESTERN_NUMBER_ROW,
} from '../lib/layouts';

describe('Soft Keyboard Layout & Direction Engine', () => {
  it('defines Arabic letter rows in correct LTR visual array sequence', () => {
    // Row 1: ض ص ث ق ف غ ع ه خ ح ج د
    expect(AR_ROWS[0][0].ch).toBe('ض');
    expect(AR_ROWS[0][AR_ROWS[0].length - 1].ch).toBe('د');
    expect(AR_ROWS[0].length).toBe(12);

    // Row 2: ش س ي ب ل ا ت ن م ك ط
    expect(AR_ROWS[1][0].ch).toBe('ش');
    expect(AR_ROWS[1][AR_ROWS[1].length - 1].ch).toBe('ط');
    expect(AR_ROWS[1].length).toBe(11);

    // Row 3: ئ ء ؤ ر لا ى ة و ز ظ
    expect(AR_ROWS[2][0].ch).toBe('ئ');
    expect(AR_ROWS[2][AR_ROWS[2].length - 1].ch).toBe('ظ');
    expect(AR_ROWS[2].length).toBe(10);
  });

  it('identifies RTL vs LTR layouts accurately', () => {
    expect(isRtlLayout('ar')).toBe(true);
    expect(isRtlLayout('harakat')).toBe(true);
    expect(isRtlLayout('islamic')).toBe(true);

    expect(isRtlLayout('en')).toBe(false);
    expect(isRtlLayout('num')).toBe(false);
    expect(isRtlLayout('sym')).toBe(false);
    expect(isRtlLayout('math')).toBe(false);
  });

  it('calculates correct caret deltas for RTL text navigation', () => {
    // In RTL text, moving visually RIGHT moves towards the start of string (index - 1)
    expect(caretDelta('ar', 'right')).toBe(-1);
    // In RTL text, moving visually LEFT moves towards the end of string (index + 1)
    expect(caretDelta('ar', 'left')).toBe(1);

    // Same for harakat
    expect(caretDelta('harakat', 'right')).toBe(-1);
    expect(caretDelta('harakat', 'left')).toBe(1);
  });

  it('calculates correct caret deltas for LTR text navigation', () => {
    // In LTR text, moving visually RIGHT moves towards end of string (index + 1)
    expect(caretDelta('en', 'right')).toBe(1);
    // In LTR text, moving visually LEFT moves towards start of string (index - 1)
    expect(caretDelta('en', 'left')).toBe(-1);

    expect(caretDelta('num', 'right')).toBe(1);
    expect(caretDelta('num', 'left')).toBe(-1);
  });

  it('defines Western and Eastern number rows with correct alts', () => {
    expect(WESTERN_NUMBER_ROW[0].ch).toBe('1');
    expect(WESTERN_NUMBER_ROW[0].alt).toBe('١');
    expect(WESTERN_NUMBER_ROW[9].ch).toBe('0');
    expect(WESTERN_NUMBER_ROW[9].alt).toBe('٠');

    expect(EASTERN_NUMBER_ROW[0].ch).toBe('١');
    expect(EASTERN_NUMBER_ROW[0].alt).toBe('1');
    expect(EASTERN_NUMBER_ROW[9].ch).toBe('٠');
    expect(EASTERN_NUMBER_ROW[9].alt).toBe('0');
  });

  it('provides comprehensive Tashkeel harakat list', () => {
    expect(HARAKAT.length).toBe(12);
    expect(HARAKAT[0].ch).toBe('\u064E'); // fatha
    expect(HARAKAT[7].ch).toBe('\u0651'); // shadda
  });
});
