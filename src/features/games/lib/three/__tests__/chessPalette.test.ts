import { describe, expect, it } from 'vitest';

import {
  assertPaletteIntegrity,
  CHESS_PALETTE,
  PALETTE_SIZE,
  paletteColor,
} from '../chessPalette';

describe('chessPalette', () => {
  it('كل القيم سداسية صالحة بلا #', () => {
    const res = assertPaletteIntegrity();
    expect(res.ok).toBe(true);
    expect(res.badKeys).toEqual([]);
  });

  it('لوحة غير فارغة ومقاربة للحجم المتوقع', () => {
    expect(PALETTE_SIZE).toBeGreaterThanOrEqual(20);
    expect(PALETTE_SIZE).toBeLessThan(60);
  });

  it('الألوان الحرجة مميزة عن بعضها', () => {
    const keys = ['ivory', 'obsidian', 'bronze', 'check', 'squareLight', 'squareDark'] as const;
    const set = new Set(keys.map((k) => CHESS_PALETTE[k]));
    expect(set.size).toBe(keys.length);
  });

  it('paletteColor يضيف # فقط', () => {
    expect(paletteColor('void')).toBe('#05060A');
  });
});
