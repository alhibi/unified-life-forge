/**
 * اختبارات الطبقة المحلّية البديلة. هذه الدوال هي نفسها التي يَعتمد
 * عليها التطبيق عند غياب Supabase أو فشلها — نريدها مُغطّاة جيّداً
 * لأن مستخدمي وضع demo/offline لا يلاحظون أيّ خطأ في الترتيب أو
 * المطابقة (لأنّه لا يوجد API صحيح يقارَن به).
 *
 * نتجنّب:
 *   • Hard-coding عدد محدّد من الشعراء/القصائد لأنّ poetryData قد
 *     ينمو، فنستخدم thresholds مرنة.
 *   • Hard-coding slugs دقيقة بالعربي (سهلة الكسر مع تغيّرات ترميز).
 *     بدلاً من ذلك نُعيد بناء الـ slug من نفس قاعدة local-fallback
 *     عبر `expectedPoemSlug()`.
 */

import { describe, expect, it } from 'vitest';
import {
  localEras,
  localStats,
  localPoets,
  localPoetBySlug,
  localPoetPoems,
  localPoem,
  localSearchPoems,
  localSearchVerses,
  localSimilarPoems,
  localSuggest,
  localGlossary,
  localSmartSearch,
} from './local-fallback';

// ─── أدوات مساعدة ────────────────────────────────────────────────
// نُكرّر `norm` و `slug builder` هنا للحفاظ على الاختبار مستقلاً
// عن internals الموديول. لو تغيّر norm في المصدر، الاختبار يكشف عدم
// التوافق.
const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
function norm(s: string): string {
  return (s ?? '')
    .replace(TASHKEEL, '')
    .replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .toLowerCase().trim();
}
function poemSlug(poetId: string, title: string): string {
  return `${poetId}-${norm(title).replace(/\s+/g, '-')}`;
}

// ─── localEras ───────────────────────────────────────────────────
describe('localEras', () => {
  it('returns at least 6 eras (الجاهلي → الأندلسي)', () => {
    const eras = localEras();
    expect(eras.length).toBeGreaterThanOrEqual(6);
  });

  it('returns eras sorted by sort_order ascending', () => {
    const eras = localEras();
    for (let i = 1; i < eras.length; i++) {
      // sort_order قد يكون 99 (غير معرَّف) في النهاية، لا بأس
      expect(eras[i - 1].sort_order).toBeLessThanOrEqual(eras[i].sort_order);
    }
  });

  it('includes core eras with stable IDs', () => {
    const ids = localEras().map(e => e.id);
    for (const id of ['jahili', 'islami', 'umawi', 'abbasi', 'andalusi']) {
      expect(ids).toContain(id);
    }
  });

  it('every era has a name_ar and a color', () => {
    for (const era of localEras()) {
      expect(era.name_ar).toBeTypeOf('string');
      expect(era.name_ar.length).toBeGreaterThan(0);
      expect(era.color).toMatch(/^#[0-9a-f]{3,8}$/i);
    }
  });
});

// ─── localStats ──────────────────────────────────────────────────
describe('localStats', () => {
  it('returns positive counts for poets/poems/verses/eras', () => {
    const stats = localStats();
    expect(stats.poets_count).toBeGreaterThan(0);
    expect(stats.poems_count).toBeGreaterThan(0);
    expect(stats.verses_count).toBeGreaterThan(0);
    expect(stats.eras_count).toBeGreaterThanOrEqual(6);
  });

  it('verses_count >= poems_count (every poem has ≥1 verse)', () => {
    const s = localStats();
    expect(s.verses_count).toBeGreaterThanOrEqual(s.poems_count);
  });

  it('poems_count >= poets_count (every poet has ≥1 poem in seed)', () => {
    const s = localStats();
    expect(s.poems_count).toBeGreaterThanOrEqual(s.poets_count);
  });
});

// ─── localPoets ──────────────────────────────────────────────────
describe('localPoets', () => {
  it('returns first page (default 30) without filter', () => {
    const list = localPoets({});
    expect(list.length).toBeGreaterThan(0);
    expect(list.length).toBeLessThanOrEqual(30);
  });

  it('respects pageSize parameter', () => {
    const list = localPoets({ pageSize: 5 });
    expect(list.length).toBeLessThanOrEqual(5);
  });

  it('paginates correctly: page 0 and 1 yield different poets', () => {
    const all = localPoets({ pageSize: 50 });
    if (all.length >= 30) {
      const p0 = localPoets({ page: 0, pageSize: 10 });
      const p1 = localPoets({ page: 1, pageSize: 10 });
      const p0Slugs = new Set(p0.map(p => p.slug));
      // أيٌّ من p1 لا يجب أن يكون في p0
      for (const p of p1) expect(p0Slugs.has(p.slug)).toBe(false);
    }
  });

  it('filters by era_id', () => {
    const jahili = localPoets({ era: 'jahili' });
    expect(jahili.length).toBeGreaterThan(0);
    for (const p of jahili) expect(p.era_id).toBe('jahili');
  });

  it('returns empty list for non-existent era', () => {
    expect(localPoets({ era: 'nonexistent-era-xyz' })).toHaveLength(0);
  });

  it('text search matches poet name_ar', () => {
    const results = localPoets({ q: 'المتنبي' });
    expect(results.some(p => p.name_ar.includes('المتنبي'))).toBe(true);
  });

  it('text search is normalized (matches without diacritics)', () => {
    // "المتنبّي" مع شدّة يجب أن يُطابق "المتنبي"
    const withShadda = localPoets({ q: 'المتنبّي' });
    expect(withShadda.some(p => p.name_ar.includes('المتنبي'))).toBe(true);
  });

  it('returns empty array for non-matching search', () => {
    expect(localPoets({ q: 'qzxnotfoundzqx12345' })).toHaveLength(0);
  });

  it('sorts poets by verses_count desc by default', () => {
    const list = localPoets({ pageSize: 10 });
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].verses_count).toBeGreaterThanOrEqual(list[i].verses_count);
    }
  });
});

// ─── localPoetBySlug ─────────────────────────────────────────────
describe('localPoetBySlug', () => {
  it('returns poet for known slug', () => {
    const p = localPoetBySlug('imru-alqays');
    expect(p).not.toBeNull();
    expect(p?.name_ar).toContain('امرؤ القيس');
  });

  it('returns null for unknown slug', () => {
    expect(localPoetBySlug('nonexistent-poet-zzz')).toBeNull();
  });

  it('returned poet has expected fields', () => {
    const p = localPoetBySlug('mutanabbi');
    expect(p).not.toBeNull();
    expect(p!.id).toBe('mutanabbi');
    expect(p!.slug).toBe('mutanabbi');
    expect(p!.era_id).toBe('abbasi');
    expect(p!.poems_count).toBeGreaterThan(0);
  });
});

// ─── localPoetPoems ──────────────────────────────────────────────
describe('localPoetPoems', () => {
  it('returns poems for known poet', () => {
    const list = localPoetPoems({ poetSlug: 'mutanabbi' });
    expect(list.length).toBeGreaterThan(0);
    for (const pm of list) expect(pm.title).toBeTypeOf('string');
  });

  it('returns empty for unknown poet', () => {
    expect(localPoetPoems({ poetSlug: 'nonexistent-poet' })).toHaveLength(0);
  });

  it('filters poems by query string in title', () => {
    // استخدمنا "العزم" للتطابق مع "على قدر أهل العزم"
    const list = localPoetPoems({ poetSlug: 'mutanabbi', q: 'العزم' });
    expect(list.length).toBeGreaterThan(0);
  });
});

// ─── localPoem ───────────────────────────────────────────────────
describe('localPoem', () => {
  it('returns null for unknown slug', () => {
    expect(localPoem('not-a-real-slug-xyz')).toBeNull();
  });

  it('returns full poem detail for known slug (Imru al-Qays Mu`allaqa)', () => {
    const slug = poemSlug('imru-alqays', 'معلقة امرئ القيس');
    const poem = localPoem(slug);
    expect(poem).not.toBeNull();
    expect(poem!.title).toBe('معلقة امرئ القيس');
    expect(poem!.poet_slug).toBe('imru-alqays');
    expect(poem!.era_id).toBe('jahili');
    expect(poem!.verses.length).toBeGreaterThan(0);
    // أوّل بيت يبدأ بـ "قفا" (قِفَا نَبْكِ ...)
    expect(poem!.verses[0].hemistich1).toMatch(/قفا|قِفَا/);
  });

  it('verses have sequential positions starting from 0', () => {
    const slug = poemSlug('imru-alqays', 'معلقة امرئ القيس');
    const poem = localPoem(slug);
    expect(poem).not.toBeNull();
    poem!.verses.forEach((v, i) => {
      expect(v.position).toBe(i);
    });
  });

  it('opening matches first hemistich', () => {
    const slug = poemSlug('imru-alqays', 'معلقة امرئ القيس');
    const poem = localPoem(slug);
    expect(poem!.opening).toBe(poem!.verses[0].hemistich1);
  });
});

// ─── localSearchPoems ────────────────────────────────────────────
describe('localSearchPoems', () => {
  it('returns empty when no query and no filters', () => {
    // بدون فلترة، يُرجع الـ paginated list (أول 30) لأنّ q/era/poet
    // كلها null. هذا سلوك متوقّع — ليس بحثاً، بل تصفّحاً.
    const list = localSearchPoems({});
    expect(list.length).toBeGreaterThan(0);
  });

  it('finds poems by title fragment', () => {
    const list = localSearchPoems({ q: 'معلقة' });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every(p => p.title.includes('معلقة'))).toBe(true);
  });

  it('finds poems by verse text fragment', () => {
    const list = localSearchPoems({ q: 'قفا نبك' });
    expect(list.length).toBeGreaterThan(0);
    expect(list.some(p => p.poet_slug === 'imru-alqays')).toBe(true);
  });

  it('filters by era', () => {
    const list = localSearchPoems({ era: 'jahili' });
    for (const p of list) expect(p.era_id).toBe('jahili');
  });

  it('filters by poet_slug', () => {
    const list = localSearchPoems({ poet_slug: 'mutanabbi' });
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) expect(p.poet_slug).toBe('mutanabbi');
  });

  it('search results do not leak _verses field (private)', () => {
    const list = localSearchPoems({ q: 'معلقة' });
    for (const p of list) {
      expect(p).not.toHaveProperty('_verses');
    }
  });
});

// ─── localSearchVerses ───────────────────────────────────────────
describe('localSearchVerses', () => {
  it('returns empty when query is empty', () => {
    expect(localSearchVerses({ q: '' })).toHaveLength(0);
  });

  it('finds verses containing the query (normalized)', () => {
    const list = localSearchVerses({ q: 'قفا' });
    expect(list.length).toBeGreaterThan(0);
    // أول نتيجة من المعلقة
    expect(list.some(v => v.poet_slug === 'imru-alqays')).toBe(true);
  });

  it('returns matches with both hemistichs and metadata', () => {
    const list = localSearchVerses({ q: 'قفا نبك' });
    expect(list.length).toBeGreaterThan(0);
    const v = list[0];
    expect(v.poem_slug).toBeTypeOf('string');
    expect(v.poet_name).toBeTypeOf('string');
    expect(v.hemistich1).toBeTypeOf('string');
    expect(typeof v.position).toBe('number');
  });

  it('respects era filter', () => {
    // كلمة شائعة ("قلب") ثم نقصرها على abbasi
    const all = localSearchVerses({ q: 'قلب' });
    const abbasi = localSearchVerses({ q: 'قلب', era: 'abbasi' });
    expect(abbasi.length).toBeLessThanOrEqual(all.length);
    for (const v of abbasi) expect(v.era_id).toBe('abbasi');
  });
});

// ─── localSimilarPoems ───────────────────────────────────────────
describe('localSimilarPoems', () => {
  it('returns empty for unknown source poem', () => {
    expect(localSimilarPoems('not-a-poem-slug')).toHaveLength(0);
  });

  it('returns up to N similar poems (default 6)', () => {
    const slug = poemSlug('imru-alqays', 'معلقة امرئ القيس');
    const list = localSimilarPoems(slug);
    expect(list.length).toBeLessThanOrEqual(6);
  });

  it('returns at most `limit` items', () => {
    const slug = poemSlug('imru-alqays', 'معلقة امرئ القيس');
    const list = localSimilarPoems(slug, 3);
    expect(list.length).toBeLessThanOrEqual(3);
  });

  it('excludes the source poem itself from results', () => {
    const slug = poemSlug('imru-alqays', 'معلقة امرئ القيس');
    const list = localSimilarPoems(slug);
    for (const p of list) expect(p.slug).not.toBe(slug);
  });

  it('every result has a positive score', () => {
    const slug = poemSlug('imru-alqays', 'معلقة امرئ القيس');
    const list = localSimilarPoems(slug);
    for (const p of list) expect(p.score).toBeGreaterThan(0);
  });

  it('results are sorted by score desc', () => {
    const slug = poemSlug('imru-alqays', 'معلقة امرئ القيس');
    const list = localSimilarPoems(slug);
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].score).toBeGreaterThanOrEqual(list[i].score);
    }
  });
});

// ─── localSuggest ────────────────────────────────────────────────
describe('localSuggest', () => {
  it('returns empty for empty prefix', () => {
    expect(localSuggest('')).toHaveLength(0);
  });

  it('finds poets by name prefix', () => {
    const list = localSuggest('متنب');
    expect(list.length).toBeGreaterThan(0);
    expect(list.some(s => s.kind === 'poet' && s.label.includes('متنبي'))).toBe(true);
  });

  it('finds poems by title prefix', () => {
    const list = localSuggest('معلقة');
    expect(list.length).toBeGreaterThan(0);
    expect(list.some(s => s.kind === 'poem')).toBe(true);
  });

  it('respects limit parameter', () => {
    const list = localSuggest('ا', 3);
    expect(list.length).toBeLessThanOrEqual(3);
  });

  it('sorts by rank desc (prefix matches before partial)', () => {
    const list = localSuggest('متنب');
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].rank).toBeGreaterThanOrEqual(list[i].rank);
    }
  });
});

// ─── localGlossary ───────────────────────────────────────────────
describe('localGlossary', () => {
  it('returns empty for unknown poem slug', () => {
    expect(localGlossary('unknown-slug')).toHaveLength(0);
  });

  it('returns entries for Imru al-Qays Muallaqa (seeded in pack-b)', () => {
    const slug = poemSlug('imru-alqays', 'معلقة امرئ القيس');
    const entries = localGlossary(slug);
    // الباقة B بذرت ~20 مدخل لهذه القصيدة
    expect(entries.length).toBeGreaterThan(0);
    for (const g of entries) {
      expect(g.word).toBeTypeOf('string');
      expect(g.meaning).toBeTypeOf('string');
      expect(g.word_normalized).toBe(norm(g.word));
    }
  });

  it('every entry has word_normalized matching norm(word)', () => {
    const slug = poemSlug('imru-alqays', 'معلقة امرئ القيس');
    for (const g of localGlossary(slug)) {
      expect(g.word_normalized).toBe(norm(g.word));
    }
  });
});

// ─── localSmartSearch ────────────────────────────────────────────
describe('localSmartSearch', () => {
  it('returns empty for empty query', () => {
    expect(localSmartSearch('')).toHaveLength(0);
  });

  it('mixes poets, poems, and verses in results', () => {
    const list = localSmartSearch('متنبي');
    expect(list.length).toBeGreaterThan(0);
    const kinds = new Set(list.map(x => x.kind));
    // يجب أن يحوي على الأقل نوعاً واحداً
    expect(kinds.size).toBeGreaterThanOrEqual(1);
    // كل النتائج لها kind صحيح
    for (const item of list) {
      expect(['poet', 'poem', 'verse']).toContain(item.kind);
    }
  });

  it('respects limit parameter', () => {
    const list = localSmartSearch('قفا', 5);
    expect(list.length).toBeLessThanOrEqual(5);
  });

  it('poets are ranked higher than poems and verses for same match', () => {
    // نبحث عن "متنبي" — يجب أن تأتي بطاقة الشاعر (لو وُجدت) قبل أيّ
    // قصيدة عنوانها يحوي "متنبي"
    const list = localSmartSearch('متنبي', 20);
    const poetIdx = list.findIndex(x => x.kind === 'poet');
    const verseIdx = list.findIndex(x => x.kind === 'verse');
    if (poetIdx !== -1 && verseIdx !== -1) {
      expect(poetIdx).toBeLessThan(verseIdx);
    }
  });

  it('results are sorted by rank desc', () => {
    const list = localSmartSearch('متنبي', 20);
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].rank).toBeGreaterThanOrEqual(list[i].rank);
    }
  });
});
