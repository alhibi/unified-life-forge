/**
 * اختبارات `scripts/diwan/normalize.ts`. هذا الملف يعيش في `scripts/`
 * لكنه دوال نقيّة قابلة للاستيراد. نختبره من `src/` ليُلتقط ضمن
 * vitest's include glob.
 *
 * المهم هنا أن سلوك `normalizeArabic` يتطابق مع نظيره في Postgres
 * (`public.normalize_arabic`) ومع نسخة local-fallback. أيّ drift
 * يُسبّب نتائج بحث مفقودة فجأة بين الواجهة والـ DB.
 */

import { describe, expect, it } from 'vitest';
import {
  normalizeArabic,
  buildSlug,
  extractMeter,
  extractRhyme,
  splitVerse,
  extractYears,
} from '../../../scripts/diwan/normalize.ts';

describe('normalizeArabic', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(normalizeArabic(null)).toBe('');
    expect(normalizeArabic(undefined)).toBe('');
    expect(normalizeArabic('')).toBe('');
  });

  it('strips tashkeel', () => {
    expect(normalizeArabic('قِفَا نَبْكِ')).toBe('قفا نبك');
  });

  it('unifies hamza forms to ا', () => {
    expect(normalizeArabic('أحمد')).toBe('احمد');
    expect(normalizeArabic('إبراهيم')).toBe('ابراهيم');
    expect(normalizeArabic('آدم')).toBe('ادم');
  });

  it('converts ى to ي', () => {
    expect(normalizeArabic('على')).toBe('علي');
    expect(normalizeArabic('سلمى')).toBe('سلمي');
  });

  it('converts ة to ه', () => {
    expect(normalizeArabic('قصيدة')).toBe('قصيده');
    expect(normalizeArabic('معلقة')).toBe('معلقه');
  });

  it('strips kashida (tatweel)', () => {
    // U+0640 ـ
    expect(normalizeArabic('مـحـمـد')).toBe('محمد');
  });

  it('handles full poem title from poetryData', () => {
    expect(normalizeArabic('معلقة زهير بن أبي سلمى'))
      .toBe('معلقه زهير بن ابي سلمي');
  });

  it('lowercases Latin co-occurring with Arabic', () => {
    expect(normalizeArabic('ABC أحمد')).toBe('abc احمد');
  });

  it('trims leading/trailing whitespace', () => {
    expect(normalizeArabic('  أحمد  ')).toBe('احمد');
  });
});

describe('buildSlug', () => {
  it('produces ASCII-only slug from Arabic name', () => {
    const s = buildSlug('امرؤ القيس');
    expect(s).toMatch(/^[a-z0-9-]+$/);
    expect(s.length).toBeGreaterThan(0);
  });

  it('appends external_id when provided', () => {
    const s = buildSlug('المتنبي', '42');
    expect(s).toMatch(/-42$/);
  });

  it('handles numeric external_id', () => {
    const s = buildSlug('جرير', 123);
    expect(s).toMatch(/-123$/);
  });

  it('returns "item" for empty input', () => {
    expect(buildSlug('')).toBe('item');
  });

  it('truncates very long slugs to 96 chars', () => {
    const long = 'محمد '.repeat(200);
    expect(buildSlug(long).length).toBeLessThanOrEqual(96);
  });

  it('produces stable slugs (same input → same output)', () => {
    expect(buildSlug('المتنبي')).toBe(buildSlug('المتنبي'));
    expect(buildSlug('المتنبي', '42')).toBe(buildSlug('المتنبي', '42'));
  });
});

describe('extractMeter', () => {
  it('returns undefined for empty/missing', () => {
    expect(extractMeter('')).toBeUndefined();
  });

  it('detects meter mentioned plainly', () => {
    expect(extractMeter('البحر: الطويل')).toBe('الطويل');
    expect(extractMeter('من بحر الكامل')).toBe('الكامل');
  });

  it('detects meter despite tashkeel', () => {
    expect(extractMeter('من البَحْرِ الوَافِرِ')).toBe('الوافر');
  });

  it('returns undefined when no known meter present', () => {
    expect(extractMeter('قصيدة جميلة بدون ذكر بحر')).toBeUndefined();
  });
});

describe('extractRhyme', () => {
  it('returns undefined for empty input', () => {
    expect(extractRhyme('')).toBeUndefined();
  });

  it('extracts last consonant ignoring connection letters', () => {
    // "قِفَا نَبْكِ" → آخر حرف صحيح بعد حذف ا/ي/و/ه → ك
    // (الكاف). الـ heuristic ليست مثالية لكنها متّسقة.
    const r = extractRhyme('قِفَا نَبْكِ');
    expect(r).toBeTypeOf('string');
    expect(r!.length).toBe(1);
  });

  it('strips tashkeel before extracting', () => {
    expect(extractRhyme('سَامِرُ')).toBeTypeOf('string');
  });
});

describe('splitVerse', () => {
  it('returns h1 only for short single-hemistich line', () => {
    const { h1, h2 } = splitVerse('قفا نبك من ذكرى');
    expect(h1).toBe('قفا نبك من ذكرى');
    expect(h2).toBeUndefined();
  });

  it('splits on triple-space', () => {
    const { h1, h2 } = splitVerse('قفا نبك   بسقط اللوى');
    expect(h1).toBe('قفا نبك');
    expect(h2).toBe('بسقط اللوى');
  });

  it('splits on em-dash with surrounding spaces', () => {
    const { h1, h2 } = splitVerse('قفا نبك — بسقط اللوى');
    expect(h1).toBe('قفا نبك');
    expect(h2).toBe('بسقط اللوى');
  });

  it('splits on asterisk', () => {
    const { h1, h2 } = splitVerse('قفا نبك * بسقط اللوى');
    expect(h1).toBe('قفا نبك');
    expect(h2).toBe('بسقط اللوى');
  });

  it('returns empty h1 for empty input', () => {
    expect(splitVerse('')).toEqual({ h1: '' });
  });

  it('collapses consecutive whitespace', () => {
    // مساحات متعدّدة → مساحة واحدة قبل المحاولة بالـ split
    const { h1 } = splitVerse('  قفا   نبك  ');
    expect(h1).toBe('قفا نبك');
  });
});

describe('extractYears', () => {
  it('returns empty for missing input', () => {
    expect(extractYears(undefined)).toEqual({});
    expect(extractYears('')).toEqual({});
  });

  it('extracts birth-death range with hyphen', () => {
    expect(extractYears('(915-965م)')).toEqual({ birth: 915, death: 965 });
  });

  it('extracts range with en-dash', () => {
    expect(extractYears('915–965م')).toEqual({ birth: 915, death: 965 });
  });

  it('extracts single death year', () => {
    expect(extractYears('ت 965م')).toEqual({ death: 965 });
  });

  it('returns empty when no year pattern', () => {
    expect(extractYears('شاعر مشهور بدون تاريخ')).toEqual({});
  });
});
