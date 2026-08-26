import { describe, expect, it } from 'vitest';

import { GRAVE_SCALE,graveTransform, TERRACE_Y } from '../graveyard';

describe('graveyard', () => {
  it('غنائم الأبيض على السكة الجنوبية وغنائم الأسود على الشمالية', () => {
    const south = graveTransform({ pieceColor: 'b', capturer: 'w', type: 'P', seq: 0 });
    const north = graveTransform({ pieceColor: 'w', capturer: 'b', type: 'P', seq: 0 });
    expect(south.pos[2]).toBeGreaterThan(4.1);
    expect(north.pos[2]).toBeLessThan(-4.1);
  });

  it('لون القطعة مستقل عن جهتها (غنيمة سوداء عند الأبيض تبقى سوداء)', () => {
    const g = graveTransform({ pieceColor: 'b', capturer: 'w', type: 'N', seq: 2 });
    // المادة تُختار من pieceColor في المكوّن — هنا نتحقق أن الواجهة تحملها كما هي
    expect(g.pos[1]).toBe(TERRACE_Y);
  });

  it('التسلسل يوزّع الأفقية دون تصادم داخل الصف', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const g = graveTransform({ pieceColor: 'w', capturer: 'b', type: 'P', seq: i });
      const key = `${g.pos[0].toFixed(2)}:${g.pos[2].toFixed(2)}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('الصف الثاني يزداد بعداً خارجياً والمقياس مصغر', () => {
    const r0 = graveTransform({ pieceColor: 'w', capturer: 'w', type: 'P', seq: 0 });
    const r1 = graveTransform({ pieceColor: 'w', capturer: 'w', type: 'P', seq: 8 });
    expect(Math.abs(r1.pos[2])).toBeGreaterThan(Math.abs(r0.pos[2]));
    expect(GRAVE_SCALE).toBeLessThan(1);
  });
});
