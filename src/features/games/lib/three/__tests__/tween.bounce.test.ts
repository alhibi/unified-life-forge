import { describe, expect, it } from 'vitest';

import { easeOutBounce } from '../tween';

describe('easeOutBounce', () => {
  it('يبدأ من الصفر وينتهي عند الواحد', () => {
    expect(easeOutBounce(0)).toBeCloseTo(0, 6);
    expect(easeOutBounce(1)).toBeCloseTo(1, 3);
  });

  it('لا يتجاوز [0,1] أبداً', () => {
    for (let i = 0; i <= 40; i++) {
      const v = easeOutBounce(i / 40);
      expect(v).toBeGreaterThanOrEqual(-0.001);
      expect(v).toBeLessThanOrEqual(1.001);
    }
  });

  it('له ارتدادان على الأقل (قيمتان قريبتان من 1 ثم تنخفضان)', () => {
    // عيّنة كثيفة حول الارتدادات
    let dips = 0;
    let prev = 1;
    for (let i = 1; i <= 100; i++) {
      const v = easeOutBounce(i / 100);
      if (prev > 0.9 && v < prev - 0.02) dips++;
      prev = v;
    }
    expect(dips).toBeGreaterThanOrEqual(2);
  });
});
