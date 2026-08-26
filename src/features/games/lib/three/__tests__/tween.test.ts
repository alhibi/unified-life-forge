import { describe, expect, it } from 'vitest';

import {
  arcLift,
  easeInOutCubic,
  easeOutBack,
  pulseDecay,
  slideDuration,
} from '../tween';

describe('tween', () => {
  it('easing يحترم النهايات', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBeCloseTo(1, 10);
    expect(easeOutBack(1)).toBeCloseTo(1, 10);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
  });

  it('pulseDecay يخفت مع الزمن', () => {
    expect(Math.abs(pulseDecay(0.05))).toBeGreaterThan(Math.abs(pulseDecay(0.8)));
    expect(pulseDecay(2)).toBeLessThan(0.02);
  });

  it('مدة الانزلاق تنمو مع المسافة وتتشبع', () => {
    expect(slideDuration(1)).toBeGreaterThan(200);
    expect(slideDuration(7)).toBeGreaterThan(slideDuration(3));
    // التشبع عند +240ms
    expect(slideDuration(7)).toBeLessThanOrEqual(slideDuration(6) + 40);
  });

  it('رفع القوس صفري عند الطرفين وأقصى في المنتصف', () => {
    const h = 0.3;
    expect(arcLift(0, h)).toBeCloseTo(0, 10);
    expect(arcLift(1, h)).toBeCloseTo(0, 10);
    expect(arcLift(0.5, h)).toBeCloseTo(h, 10);
  });
});
