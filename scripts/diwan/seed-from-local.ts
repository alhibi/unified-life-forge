/**
 * Seed: يحوّل بيانات src/data/poetryData.ts الموجودة إلى JSONL
 * في scripts/diwan/out/ — أي يمكن لـ ingest.ts ابتلاعها كأنّها أتت من scrape.
 *
 * استخدام:
 *   npx tsx scripts/diwan/seed-from-local.ts
 *
 * الفائدة:
 *   - تشغيل المكتبة الكبرى UI فورًا بدون شبكة
 *   - بيانات أساس تتلاحم لاحقًا مع scrape كامل
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildSlug, extractMeter, extractRhyme } from './normalize.ts';
import type { RawEra, RawPoem, RawPoet, RawVerse } from './types.ts';
// استيراد البيانات المحلّية
import { poetryEras } from '../../src/features/diwan/data/poetryData.ts';
import { poetNodes } from '../../src/features/diwan/data/literaryConnections.ts';

const OUT = path.resolve(process.cwd(), 'scripts/diwan/out');
fs.mkdirSync(OUT, { recursive: true });

function writeJsonl(name: string, rows: unknown[]): void {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, rows.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  console.log(`✓ ${name}: ${rows.length}`);
}

// ─── Eras ───
const ERA_PERIODS: Record<string, { period: string; start?: number; end?: number; color: string; sort: number }> = {
  jahili:    { period: 'قبل 622م',   start: 500,  end: 622,  color: '#d97706', sort: 1 },
  mukhadram: { period: 'حول 622م',    start: 600,  end: 661,  color: '#059669', sort: 2 },
  islami:    { period: '622-661م',    start: 622,  end: 661,  color: '#0891b2', sort: 3 },
  umawi:     { period: '661-750م',    start: 661,  end: 750,  color: '#7c3aed', sort: 4 },
  abbasi:    { period: '750-1258م',   start: 750,  end: 1258, color: '#dc2626', sort: 5 },
  andalusi:  { period: '711-1492م',   start: 711,  end: 1492, color: '#2563eb', sort: 6 },
};

const eras: RawEra[] = poetryEras.map(e => {
  const meta = ERA_PERIODS[e.id] ?? { period: e.period, color: '#6366f1', sort: 99 };
  return {
    id: e.id,
    name_ar: e.nameAr,
    name_en: e.name,
    period_label: meta.period,
    start_year: meta.start,
    end_year: meta.end,
    color: meta.color,
    sort_order: meta.sort,
  };
});

// ─── Poets ───
const nodeById = new Map(poetNodes.map(n => [n.id, n]));

const poets: RawPoet[] = [];
for (const era of poetryEras) {
  for (const p of era.poets) {
    const node = nodeById.get(p.id);
    poets.push({
      slug:        p.id,                               // نستخدم نفس id ليكون مستقرًا
      external_id: undefined,
      source:      'seed',
      era_id:      era.id,
      name_ar:     p.name,
      title:       node?.title,
      bio:         p.bio,
      birth_year:  parseInt(node?.birth ?? '', 10) || undefined,
      death_year:  parseInt(node?.death ?? '', 10) || undefined,
    });
  }
}

// ─── Poems + Verses ───
const poems: RawPoem[] = [];
for (const era of poetryEras) {
  for (const p of era.poets) {
    for (const poem of p.poems) {
      const verses: RawVerse[] = [];
      for (let i = 0; i < poem.verses.length; i += 2) {
        const h1 = poem.verses[i]?.trim();
        const h2 = poem.verses[i + 1]?.trim();
        if (!h1) continue;
        verses.push({ position: verses.length, hemistich1: h1, hemistich2: h2 });
      }
      const meter = extractMeter(poem.title);
      const rhyme = extractRhyme(verses[verses.length - 1]?.hemistich2 ?? verses[verses.length - 1]?.hemistich1 ?? '');
      poems.push({
        slug:      buildSlug(poem.title, p.id),
        source:    'seed',
        poet_slug: p.id,
        era_id:    era.id,
        title:     poem.title,
        meter,
        rhyme,
        opening:   verses[0]?.hemistich1,
        verses,
      });
    }
  }
}

writeJsonl('eras.jsonl',       eras);
writeJsonl('poets.jsonl',      poets);
writeJsonl('poems_full.jsonl', poems);

// ملفّ تأكيد
const stats = {
  generated_at: new Date().toISOString(),
  eras: eras.length,
  poets: poets.length,
  poems: poems.length,
  verses: poems.reduce((s, p) => s + p.verses.length, 0),
};
fs.writeFileSync(path.join(OUT, 'seed-stats.json'), JSON.stringify(stats, null, 2));
console.log('\nSummary:', stats);
