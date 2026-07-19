/**
 * اختبار سلامة الـ slugs في `diwanGlossary.ts`.
 *
 * المشكلة المُحتمَلة: لو غُيِّر عنوان قصيدة في `poetryData.ts`، سيتغيّر
 * الـ slug المُولَّد ولن تُطابقه مفاتيح المعجم — سيختفي شرح المفردات
 * بصمت دون رسالة خطأ. هذا الاختبار يحرس العقد بين الملفّين.
 *
 * كل مفتاح في `diwanLocalGlossary` يجب أن يُطابق slug قصيدة موجودة
 * فعلياً في poetryData. الاختبار يُعيد بناء كل الـ slugs ويتحقّق.
 */

import { describe, expect, it } from 'vitest';

import { diwanLocalGlossary } from './diwanGlossary';
import { poetryEras } from './poetryData';

const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
function norm(s: string): string {
  return (s ?? '')
    .replace(TASHKEEL, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim();
}
function poemSlug(poetId: string, title: string): string {
  return `${poetId}-${norm(title).replace(/\s+/g, '-')}`;
}

// نبني فهرس كل slugs قصائد poetryData لمقارنته بمفاتيح المعجم
function buildKnownSlugs(): Set<string> {
  const slugs = new Set<string>();
  for (const era of poetryEras) {
    for (const poet of era.poets) {
      for (const poem of poet.poems) {
        slugs.add(poemSlug(poet.id, poem.title));
      }
    }
  }
  return slugs;
}

describe('diwanGlossary slug integrity', () => {
  const knownSlugs = buildKnownSlugs();

  it('every glossary key matches an existing poem slug in poetryData', () => {
    const glossaryKeys = Object.keys(diwanLocalGlossary);
    const orphans = glossaryKeys.filter((k) => !knownSlugs.has(k));
    if (orphans.length > 0) {
      // رسالة مُفصَّلة لتسهيل التشخيص
      throw new Error(
        `وُجدت ${orphans.length} مفتاح(مفاتيح) في diwanLocalGlossary ` +
          `لا تُطابق أيّ قصيدة في poetryData:\n` +
          orphans.map((k) => `  • ${k}`).join('\n') +
          `\n\nغالباً السبب: عنوان قصيدة تغيّر في poetryData، أو الـ ` +
          `slug في المعجم بُني يدوياً بشكل خاطئ.`,
      );
    }
    expect(orphans).toEqual([]);
  });

  it('entries within each glossary list have non-empty word and meaning', () => {
    for (const [slug, entries] of Object.entries(diwanLocalGlossary)) {
      for (const e of entries) {
        expect(e.word, `slug=${slug}`).toBeTypeOf('string');
        expect(e.word.length, `slug=${slug}`).toBeGreaterThan(0);
        expect(e.meaning, `slug=${slug}`).toBeTypeOf('string');
        expect(e.meaning.length, `slug=${slug}`).toBeGreaterThan(0);
      }
    }
  });

  it('verse_position when set is a non-negative integer', () => {
    for (const [slug, entries] of Object.entries(diwanLocalGlossary)) {
      for (const e of entries) {
        if (e.verse_position !== undefined) {
          expect(Number.isInteger(e.verse_position), `slug=${slug}`).toBe(true);
          expect(e.verse_position, `slug=${slug}`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
