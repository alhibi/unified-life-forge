import { describe, expect, it } from 'vitest';

import { getAllPieceTypes, getPieceSpec, PIECE_HEIGHTS, PIECE_RADII } from '../pieceGeometry';

describe('pieceGeometry', () => {
  it('كل الأنواع الستة لها مواصفة صالحة', () => {
    for (const t of getAllPieceTypes()) {
      const spec = getPieceSpec(t);
      expect(spec.profile.length).toBeGreaterThan(4);
      expect(spec.height).toBeGreaterThan(0.3);
    }
  });

  it('ترتيب القطع بالطول: الملك > الوزير > الفيل ≈ الحصان > الرخّ > البيدق', () => {
    // (الرخّ أقصر من الحصان في طرازنا المتناسب مع العرض)
    expect(PIECE_HEIGHTS.K).toBeGreaterThan(PIECE_HEIGHTS.Q);
    expect(PIECE_HEIGHTS.Q).toBeGreaterThan(PIECE_HEIGHTS.B);
    expect(PIECE_HEIGHTS.B).toBeGreaterThan(PIECE_HEIGHTS.R);
    expect(PIECE_HEIGHTS.R).toBeLessThan(PIECE_HEIGHTS.N);
    expect(PIECE_HEIGHTS.N).toBeGreaterThan(PIECE_HEIGHTS.P);
  });

  it('الملفات تبدأ من القاع وتنغلق عند القمة', () => {
    for (const t of getAllPieceTypes()) {
      const spec = getPieceSpec(t);
      expect(spec.profile[0].y).toBeCloseTo(0, 5);
      expect(spec.profile[spec.profile.length - 1].r).toBeLessThanOrEqual(0.01);
    }
  });

  it('لا نصف قطر يتجاوز حد القطعة المعلن', () => {
    for (const t of getAllPieceTypes()) {
      const spec = getPieceSpec(t);
      const maxR = Math.max(...spec.profile.map((p) => p.r));
      expect(maxR).toBeLessThanOrEqual(PIECE_RADII[t] + 0.06); // هامش الأطواق
    }
  });

  it('الحصان يحمل رأساً مبثوقاً والرخّ يحمل أبراجاً والوزير خرزات', () => {
    const knight = getPieceSpec('N');
    expect(knight.extras.some((e) => e.kind === 'extrude')).toBe(true);

    const rook = getPieceSpec('R');
    const merlons = rook.extras.filter((e) => e.kind === 'box');
    expect(merlons.length).toBe(5);
    // الأبراج موزعة حول المحور
    const angles = new Set(
      merlons.map((m) => m.kind === 'box' && Math.atan2(m.pos[0], m.pos[2]).toFixed(2)),
    );
    expect(angles.size).toBe(5);

    const queen = getPieceSpec('Q');
    expect(queen.extras.filter((e) => e.kind === 'sphere').length).toBe(8);

    const king = getPieceSpec('K');
    expect(king.extras.length).toBeGreaterThanOrEqual(2); // صليب عمودي + أفقي
  });

  it('الصورة الظلية للحصان منطقية (الأذنان أعلى نقطة وقرب المنتصف)', () => {
    const knight = getPieceSpec('N');
    const head = knight.extras.find((e) => e.kind === 'extrude');
    if (!head || head.kind !== 'extrude') throw new Error('رأس الحصان مفقود');
    const ys = head.outline.map(([, y]) => y);
    expect(Math.min(...ys)).toBeCloseTo(0, 5); // يبدأ من قاعدة الرقبة
    const topIdx = ys.indexOf(Math.max(...ys));
    expect(Math.abs(head.outline[topIdx][0])).toBeLessThan(0.08); // الأذنان قرب المحور
    // عرض الرأس معقول (لا يتجاوز نصف المربع)
    const xs = head.outline.map(([x]) => x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.5);
  });
});
