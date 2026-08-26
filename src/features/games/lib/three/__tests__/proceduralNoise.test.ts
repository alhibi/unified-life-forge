import { describe, expect, it } from 'vitest';

import { bakeFbmTexture, bakeWoodGrain, makeRng } from '../proceduralNoise';

describe('proceduralNoise', () => {
  it('RNG حتمي عبر البذور', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
    const c = makeRng(43);
    let differs = false;
    const a2 = makeRng(42);
    for (let i = 0; i < 20; i++) if (a2() !== c()) differs = true;
    expect(differs).toBe(true);
  });

  it('خبز fBm يعطي تبايناً حقيقياً (ليس رقاقة رمادية مسطحة)', () => {
    const { data } = bakeFbmTexture(32, 7, { octaves: 4 });
    let min = 255;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    expect(max - min).toBeGreaterThan(24); // تباين ملموس للخشونة
    // ألفا معبأة بالكامل
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255);
  });

  it('عروق الخشب ممتدة أفقياً (تباين أفقي > عمودي على نطاق عيّنة)', () => {
    const size = 64;
    const { data } = bakeWoodGrain(size, 11, { stretch: 4 });
    // تفاوت على خط أفقي واحد مقابل عمود واحد
    const rangeRow = (row: number) => {
      let mn = 255;
      let mx = 0;
      for (let x = 0; x < size; x++) {
        const v = data[(row * size + x) * 4];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      return mx - mn;
    };
    const rangeCol = (col: number) => {
      let mn = 255;
      let mx = 0;
      for (let y = 0; y < size; y++) {
        const v = data[(y * size + col) * 4];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      return mx - mn;
    };
    // متوسط المدى الأفقي عبر عدة صفوف مقابل العمودي عبر عدة أعمدة
    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const rows = [8, 16, 32, 48].map(rangeRow);
    const cols = [8, 16, 32, 48].map(rangeCol);
    expect(avg(rows)).toBeGreaterThan(avg(cols) * 0.9); // اتجاهية واضحة
  });

  it('بذور مختلفة تعطي حقولاً مختلفة', () => {
    const a = bakeFbmTexture(16, 1).data;
    const b = bakeFbmTexture(16, 2).data;
    let same = true;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { same = false; break; }
    expect(same).toBe(false);
  });
});
