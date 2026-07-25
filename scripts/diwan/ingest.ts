/**
 * Ingestion: يقرأ ملفات JSONL من scripts/diwan/out/ ويُحمِّلها إلى
 * Supabase باستخدام service role key. UPSERT بـ batches آمنة، مع
 * إعادة احتساب العدّادات بعد الانتهاء.
 *
 * متطلبات:
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY في البيئة
 *   - npm i -D @supabase/supabase-js tsx
 *
 * استخدام:
 *   npx tsx scripts/diwan/ingest.ts
 *   npx tsx scripts/diwan/ingest.ts --only=poets
 *   npx tsx scripts/diwan/ingest.ts --truncate   (يحذف كل البيانات أوّلًا)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { RawEra, RawPoem, RawPoet } from './types.ts';

const OUT_DIR = path.resolve(process.cwd(), 'scripts/diwan/out');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── أدوات ─────────────────────────────────────────────────────────────
function readJsonl<T>(file: string): T[] {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n').filter(Boolean).map(line => JSON.parse(line) as T);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsert<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  conflict: string,
  batchSize = 500,
): Promise<void> {
  if (rows.length === 0) return;
  let done = 0;
  for (const batch of chunk(rows, batchSize)) {
    const { error } = await sb.from(table).upsert(batch, { onConflict: conflict });
    if (error) {
      console.error(`upsert ${table}:`, error.message, '— first row keys:', Object.keys(batch[0] ?? {}));
      throw error;
    }
    done += batch.length;
    process.stdout.write(`\r  · ${table}: ${done}/${rows.length}`);
  }
  process.stdout.write('\n');
}

// ─── خطوات الـ ingest ──────────────────────────────────────────────────
async function ingestEras(): Promise<void> {
  const file = path.join(OUT_DIR, 'eras.jsonl');
  const rows = readJsonl<RawEra>(file);
  if (rows.length === 0) { console.log('· eras: لا ملفّ، تجاوز'); return; }
  console.log(`✦ eras: ${rows.length}`);
  await upsert('diwan_eras', rows.map(e => ({
    id: e.id,
    name_ar: e.name_ar,
    name_en: e.name_en ?? null,
    period_label: e.period_label ?? null,
    start_year: e.start_year ?? null,
    end_year: e.end_year ?? null,
    color: e.color ?? null,
    sort_order: e.sort_order,
    description: e.description ?? null,
  })), 'id');
}

async function ingestPoets(): Promise<Map<string, string>> {
  const file = path.join(OUT_DIR, 'poets.jsonl');
  const rows = readJsonl<RawPoet>(file);
  if (rows.length === 0) { console.log('· poets: لا ملفّ، تجاوز'); return new Map(); }
  console.log(`✦ poets: ${rows.length}`);
  await upsert('diwan_poets', rows.map(p => ({
    slug: p.slug,
    external_id: p.external_id ?? null,
    source: p.source,
    source_url: p.source_url ?? null,
    era_id: p.era_id ?? null,
    name_ar: p.name_ar,
    name_en: p.name_en ?? null,
    title: p.title ?? null,
    bio: p.bio ?? null,
    birth_year: p.birth_year ?? null,
    death_year: p.death_year ?? null,
    birth_city: p.birth_city ?? null,
    death_city: p.death_city ?? null,
    image_url: p.image_url ?? null,
  })), 'slug');

  // اِجلب slug→id mapping
  const map = new Map<string, string>();
  const slugs = rows.map(r => r.slug);
  for (const part of chunk(slugs, 500)) {
    const { data, error } = await sb
      .from('diwan_poets').select('id, slug').in('slug', part);
    if (error) throw error;
    for (const r of data ?? []) map.set(r.slug as string, r.id as string);
  }
  return map;
}

async function ingestPoems(poetMap: Map<string, string>): Promise<Map<string, string>> {
  const file = path.join(OUT_DIR, 'poems_full.jsonl');
  const rows = readJsonl<RawPoem>(file);
  if (rows.length === 0) {
    // fallback: poems.jsonl بلا أبيات (titles فقط)
    const titlesOnly = readJsonl<RawPoem>(path.join(OUT_DIR, 'poems.jsonl'));
    if (titlesOnly.length === 0) { console.log('· poems: لا ملفّ، تجاوز'); return new Map(); }
    console.log(`! poems_full.jsonl غير موجود — أُحمّل العناوين فقط (${titlesOnly.length})`);
    return ingestPoemRows(titlesOnly, poetMap);
  }
  console.log(`✦ poems: ${rows.length}`);
  return ingestPoemRows(rows, poetMap);
}

async function ingestPoemRows(
  rows: RawPoem[],
  poetMap: Map<string, string>,
): Promise<Map<string, string>> {
  // اربط poet_slug → poet_id
  const ready = rows
    .map(p => {
      const pid = poetMap.get(p.poet_slug);
      if (!pid) return null;
      const fullText = (p.verses ?? [])
        .map(v => `${v.hemistich1} ${v.hemistich2 ?? ''}`).join(' ');
      return {
        slug: p.slug,
        external_id: p.external_id ?? null,
        source: p.source,
        source_url: p.source_url ?? null,
        poet_id: pid,
        era_id: p.era_id ?? null,
        title: p.title,
        kind: p.kind ?? null,
        meter: p.meter ?? null,
        rhyme: p.rhyme ?? null,
        opening: p.opening ?? p.verses?.[0]?.hemistich1 ?? null,
        verses_count: p.verses?.length ?? 0,
        full_text: fullText || null,
        tags: p.tags ?? [],
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  await upsert('diwan_poems', ready, 'slug');

  // mapping slug→id
  const out = new Map<string, string>();
  const slugs = ready.map(r => r.slug);
  for (const part of chunk(slugs, 500)) {
    const { data, error } = await sb
      .from('diwan_poems').select('id, slug').in('slug', part);
    if (error) throw error;
    for (const r of data ?? []) out.set(r.slug as string, r.id as string);
  }
  return out;
}

async function ingestVerses(
  poetMap: Map<string, string>,
  poemMap: Map<string, string>,
): Promise<void> {
  const file = path.join(OUT_DIR, 'poems_full.jsonl');
  const rows = readJsonl<RawPoem>(file);
  if (rows.length === 0) { console.log('· verses: لا ملفّ poems_full.jsonl، تجاوز'); return; }

  let total = 0;
  const versesBatch: Array<{
    poem_id: string; poet_id: string;
    position: number; hemistich1: string; hemistich2: string | null;
  }> = [];

  for (const poem of rows) {
    const pmId = poemMap.get(poem.slug);
    const ptId = poetMap.get(poem.poet_slug);
    if (!pmId || !ptId) continue;
    for (const v of poem.verses ?? []) {
      if (!v.hemistich1) continue;
      versesBatch.push({
        poem_id: pmId, poet_id: ptId,
        position: v.position,
        hemistich1: v.hemistich1,
        hemistich2: v.hemistich2 ?? null,
      });
    }
  }
  total = versesBatch.length;
  console.log(`✦ verses: ${total}`);

  // نحذف أولًا الأبيات القديمة لهذه القصائد لتجنّب تكرار النصّ بعد re-scrape
  const poemIds = Array.from(new Set(versesBatch.map(v => v.poem_id)));
  for (const part of chunk(poemIds, 200)) {
    const { error } = await sb.from('diwan_verses').delete().in('poem_id', part);
    if (error) throw error;
  }

  // ثم insert جديد (لا upsert — الـ pk تسلسلي)
  for (const batch of chunk(versesBatch, 1000)) {
    const { error } = await sb.from('diwan_verses').insert(batch);
    if (error) {
      console.error('insert verses:', error.message);
      throw error;
    }
    process.stdout.write(`\r  · verses inserted: ${batch.length} / batch`);
  }
  process.stdout.write('\n');
}

async function recountAll(): Promise<void> {
  console.log('✦ recount poems/poets…');
  const { data: poets, error } = await sb.from('diwan_poets').select('id');
  if (error) throw error;
  const ids = (poets ?? []).map(p => p.id as string);
  for (const id of ids) {
    await sb.rpc('diwan_recount_poet' as never, { p_poet_id: id } as never);
  }
}

async function truncateAll(): Promise<void> {
  console.log('✦ TRUNCATE all diwan_* (keep eras)');
  // ترتيب الحذف يحترم الـ FK
  await sb.from('diwan_user_favorites').delete().gte('created_at', '2000-01-01');
  await sb.from('diwan_verses').delete().gte('id', 0);
  await sb.from('diwan_poems').delete().gte('created_at', '2000-01-01');
  await sb.from('diwan_poets').delete().gte('created_at', '2000-01-01');
}

// ─── main ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const only = args.find(a => a.startsWith('--only='))?.split('=')[1];
const wantTruncate = args.includes('--truncate');

(async () => {
  try {
    if (wantTruncate) await truncateAll();

    if (!only || only === 'eras')   await ingestEras();
    let poetMap = new Map<string, string>();
    if (!only || only === 'poets'  || only === 'poems' || only === 'verses') {
      poetMap = await ingestPoets();
    }
    let poemMap = new Map<string, string>();
    if (!only || only === 'poems' || only === 'verses') {
      poemMap = await ingestPoems(poetMap);
    }
    if (!only || only === 'verses') await ingestVerses(poetMap, poemMap);
    if (!only || only === 'recount') await recountAll();

    console.log('\n✓ done');
  } catch (e) {
    console.error('FATAL:', e);
    process.exit(1);
  }
})();
