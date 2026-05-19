/**
 * adab.com scraper — مرحلتان مفصولتان:
 *   1) fetch: تحميل HTML ثلاثيّ المستويات (عصور → شعراء → قصائد) إلى cache/
 *   2) parse: قراءة الـ cache واستخراج JSONL إلى out/
 *
 * يعمل تحت Node 20+. لا يحتاج dependencies — يستخدم fetch المدمج
 * ومحلّل HTML بسيط بـ regex (كافٍ لصفحات الموقع التقليدية).
 *
 * استخدام:
 *   node --experimental-strip-types scripts/diwan/scrape-adab.ts fetch  --eras
 *   node --experimental-strip-types scripts/diwan/scrape-adab.ts fetch  --poets-of=jahili
 *   node --experimental-strip-types scripts/diwan/scrape-adab.ts fetch  --poems-of=mutanabbi
 *   node --experimental-strip-types scripts/diwan/scrape-adab.ts fetch  --all
 *   node --experimental-strip-types scripts/diwan/scrape-adab.ts parse  --all
 *
 * أو عبر npx tsx scripts/diwan/scrape-adab.ts ...
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { buildSlug, extractMeter, extractRhyme, extractYears, splitVerse } from './normalize.ts';
import type { RawEra, RawPoet, RawPoem, RawVerse } from './types.ts';

// ─── إعدادات قابلة للتعديل ──────────────────────────────────────────────
const CONFIG = {
  baseUrl: 'https://www.adab.com',
  // قد يحتاج التعديل لو غيّر الموقع البنية:
  paths: {
    home:        '/modules.php?name=Sh3er',
    eraPage:     (eraId: string)             => `/modules.php?name=Sh3er&doaction=cat&cat=${eraId}`,
    poetPage:    (poetId: string, page = 0)  =>
      `/modules.php?name=Sh3er&doaction=getsh3er&shid=${poetId}` + (page ? `&page=${page}` : ''),
    poemPage:    (poetId: string, qid: string) =>
      `/modules.php?name=Sh3er&doaction=getalsh3er&shid=${poetId}&qid=${qid}`,
  },
  cacheDir:   path.resolve(process.cwd(), 'scripts/diwan/cache'),
  outDir:     path.resolve(process.cwd(), 'scripts/diwan/out'),
  rateMs:     1500,                          // delay between requests
  maxRetries: 4,
  userAgent:  'Mozilla/5.0 (Compatible; ULF-Diwan-Scraper/1.0; +respectful)',
};

// ─── أدوات ملفّات ───────────────────────────────────────────────────────
function ensureDir(p: string): void { fs.mkdirSync(p, { recursive: true }); }

function readText(p: string): string | null {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function appendJsonl(file: string, obj: unknown): void {
  ensureDir(path.dirname(file));
  fs.appendFileSync(file, JSON.stringify(obj) + '\n', 'utf8');
}

function readJsonl<T>(file: string): T[] {
  const txt = readText(file);
  if (!txt) return [];
  return txt.split('\n').filter(Boolean).map(l => JSON.parse(l) as T);
}

// ─── جلب HTTP مع retry + rate limit ────────────────────────────────────
async function fetchWithRetry(url: string, attempt = 1): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      CONFIG.userAgent,
        'Accept':          'text/html,application/xhtml+xml',
        'Accept-Language': 'ar,en;q=0.9',
      },
    });
    if (!res.ok) {
      if (res.status === 404) throw new Error(`404 ${url}`);
      throw new Error(`HTTP ${res.status} ${url}`);
    }
    // adab.com بترميز windows-1256 أحيانًا؛ ندع المتصفّح يتعامل
    const buf = await res.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(buf);
    // detect heuristically: لو فيه كثير من الرموز الغريبة جرّب 1256
    if ((text.match(/Ã|Ø|Ù/g) ?? []).length > 50) {
      try { text = new TextDecoder('windows-1256').decode(buf); } catch {}
    }
    return text;
  } catch (e) {
    if (attempt >= CONFIG.maxRetries) throw e;
    const wait = 2 ** attempt * 1000;
    console.warn(`  ↩ retry ${attempt}/${CONFIG.maxRetries} in ${wait}ms (${(e as Error).message})`);
    await sleep(wait);
    return fetchWithRetry(url, attempt + 1);
  }
}

async function fetchPage(slug: string, fullUrl: string): Promise<string> {
  const cacheFile = path.join(CONFIG.cacheDir, `${slug}.html`);
  const cached    = readText(cacheFile);
  if (cached) return cached;

  console.log(`  ↓ ${fullUrl}`);
  const html = await fetchWithRetry(fullUrl);
  ensureDir(path.dirname(cacheFile));
  fs.writeFileSync(cacheFile, html, 'utf8');
  await sleep(CONFIG.rateMs);
  return html;
}

// ─── محلّل HTML بسيط بـ regex ───────────────────────────────────────────
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(s: string): string {
  return decodeEntities(
    s.replace(/<br\s*\/?>/gi, '\n')
     .replace(/<\/p>/gi, '\n')
     .replace(/<[^>]+>/g, '')
  ).replace(/\u00a0/g, ' ');
}

function findAll(re: RegExp, text: string): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) out.push(m);
  return out;
}

// ─── العصور (Eras) ─────────────────────────────────────────────────────
const DEFAULT_ERAS: RawEra[] = [
  { id: 'jahili',    name_ar: 'العصر الجاهلي',     period_label: 'قبل 622م',        sort_order: 1, color: '#d97706', start_year: -100, end_year: 622 },
  { id: 'mukhadram', name_ar: 'العصر المخضرم',     period_label: 'حول 622م',         sort_order: 2, color: '#059669', start_year: 600, end_year: 661 },
  { id: 'islami',    name_ar: 'العصر الإسلامي',    period_label: '622-661م',         sort_order: 3, color: '#0891b2', start_year: 622, end_year: 661 },
  { id: 'umawi',     name_ar: 'العصر الأموي',      period_label: '661-750م',         sort_order: 4, color: '#7c3aed', start_year: 661, end_year: 750 },
  { id: 'abbasi',    name_ar: 'العصر العباسي',     period_label: '750-1258م',        sort_order: 5, color: '#dc2626', start_year: 750, end_year: 1258 },
  { id: 'andalusi',  name_ar: 'العصر الأندلسي',    period_label: '711-1492م',        sort_order: 6, color: '#2563eb', start_year: 711, end_year: 1492 },
  { id: 'ayyubi',    name_ar: 'العصر الأيوبي',     period_label: '1171-1250م',       sort_order: 7, color: '#0d9488', start_year: 1171, end_year: 1250 },
  { id: 'mamluki',   name_ar: 'العصر المملوكي',    period_label: '1250-1517م',       sort_order: 8, color: '#9333ea', start_year: 1250, end_year: 1517 },
  { id: 'othmani',   name_ar: 'العصر العثماني',    period_label: '1517-1924م',       sort_order: 9, color: '#b45309', start_year: 1517, end_year: 1924 },
  { id: 'hadith',    name_ar: 'العصر الحديث',      period_label: 'بعد 1900م',        sort_order: 10, color: '#0ea5e9', start_year: 1900 },
];

/** ربط معرّف الموقع (cat=N) بمعرّف العصر عندنا. يُحدَّث يدويًا
 *  بعد فحص الصفحة الأولى. هذا fallback افتراضي. */
const ADAB_CAT_TO_ERA: Record<string, string> = {
  '1': 'jahili',
  '2': 'mukhadram',
  '3': 'islami',
  '4': 'umawi',
  '5': 'abbasi',
  '6': 'andalusi',
  '7': 'ayyubi',
  '8': 'mamluki',
  '9': 'othmani',
  '10': 'hadith',
};

function fetchOrParseEras(): RawEra[] {
  // adab.com لا تعرض العصور كصفحة مستقلة منظّمة، فنستخدم القائمة المعدّة
  // ونحدّث external_id من إعداد الكود بعد أوّل فحص.
  return DEFAULT_ERAS.map(e => ({
    ...e,
    external_id: Object.entries(ADAB_CAT_TO_ERA).find(([_, v]) => v === e.id)?.[0],
  }));
}

// ─── الشعراء داخل عصر ───────────────────────────────────────────────────
async function fetchPoetsOfEra(eraId: string): Promise<RawPoet[]> {
  const era = DEFAULT_ERAS.find(e => e.id === eraId);
  if (!era) throw new Error(`Unknown era ${eraId}`);
  const cat = Object.entries(ADAB_CAT_TO_ERA).find(([_, v]) => v === eraId)?.[0];
  if (!cat) throw new Error(`No external_id mapping for era ${eraId}`);

  const html = await fetchPage(`era-${eraId}`, CONFIG.baseUrl + CONFIG.paths.eraPage(cat));
  return parsePoetsFromEraHtml(html, eraId);
}

function parsePoetsFromEraHtml(html: string, eraId: string): RawPoet[] {
  // البنية النموذجية: روابط لها shid=NUMBER ويظهر اسم الشاعر بين <a>...</a>
  const re = /<a[^>]*?shid=(\d+)[^"']*['"][^>]*>([^<]+)<\/a>/g;
  const seen = new Set<string>();
  const poets: RawPoet[] = [];

  for (const m of findAll(re, html)) {
    const externalId = m[1];
    const nameAr = decodeEntities(m[2]).trim();
    if (!nameAr || nameAr.length < 2) continue;
    const key = externalId;
    if (seen.has(key)) continue;
    seen.add(key);

    poets.push({
      slug:        buildSlug(nameAr, externalId),
      external_id: externalId,
      source:      'adab',
      source_url:  CONFIG.baseUrl + CONFIG.paths.poetPage(externalId),
      era_id:      eraId,
      name_ar:     nameAr,
    });
  }
  return poets;
}

// ─── قصائد الشاعر ───────────────────────────────────────────────────────
async function fetchPoemsOfPoet(poet: RawPoet): Promise<RawPoem[]> {
  if (!poet.external_id) return [];
  const slug = `poet-${poet.external_id}`;
  const html = await fetchPage(slug, CONFIG.baseUrl + CONFIG.paths.poetPage(poet.external_id));
  return parsePoemsListFromPoetHtml(html, poet);
}

function parsePoemsListFromPoetHtml(html: string, poet: RawPoet): RawPoem[] {
  const re = /<a[^>]*?qid=(\d+)[^"']*['"][^>]*>([^<]+)<\/a>/g;
  const seen = new Set<string>();
  const poems: RawPoem[] = [];
  for (const m of findAll(re, html)) {
    const externalId = m[1];
    const title = decodeEntities(m[2]).trim();
    if (!title || title.length < 2) continue;
    if (seen.has(externalId)) continue;
    seen.add(externalId);

    poems.push({
      slug:        buildSlug(title, `${poet.external_id}-${externalId}`),
      external_id: `${poet.external_id}-${externalId}`,
      source:      'adab',
      source_url:  CONFIG.baseUrl + CONFIG.paths.poemPage(poet.external_id!, externalId),
      poet_slug:   poet.slug,
      era_id:      poet.era_id,
      title,
      verses:      [],
    });
  }
  return poems;
}

// ─── محتوى قصيدة ───────────────────────────────────────────────────────
async function fetchPoemContent(poem: RawPoem, poet: RawPoet): Promise<RawPoem | null> {
  if (!poem.external_id || !poet.external_id) return null;
  const externalQid = poem.external_id.split('-').pop()!;
  const html = await fetchPage(
    `poem-${poet.external_id}-${externalQid}`,
    CONFIG.baseUrl + CONFIG.paths.poemPage(poet.external_id, externalQid),
  );
  return parsePoemHtml(html, poem);
}

function parsePoemHtml(html: string, poem: RawPoem): RawPoem | null {
  // جرّب أن نجد الجدول/الـ div الذي يحوي الأبيات: نمط شائع <td class="...">صدر</td><td>عجز</td>
  // أو سطور <p>صدر &nbsp;&nbsp;&nbsp;عجز</p>
  const verses: RawVerse[] = [];

  // نمط 1: زوج <td>...</td><td>...</td>
  const td = /<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
  let pos = 0;
  for (const m of findAll(td, html)) {
    const h1 = stripTags(m[1]).trim();
    const h2 = stripTags(m[2]).trim();
    if (!h1 || !h2) continue;
    if (h1.length > 200 || h2.length > 200) continue;       // ليس بيت شعر
    if (/[<>]/.test(h1) || /[<>]/.test(h2)) continue;
    verses.push({ position: pos++, hemistich1: h1, hemistich2: h2 });
  }

  // نمط 2: <p> فيها صدر ثم فراغات ثم عجز
  if (verses.length < 4) {
    const ps = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    pos = 0;
    const accum: RawVerse[] = [];
    for (const m of findAll(ps, html)) {
      const text = stripTags(m[1]).trim();
      if (!text) continue;
      const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (line.length < 8 || line.length > 220) continue;
        const { h1, h2 } = splitVerse(line);
        if (h1) accum.push({ position: pos++, hemistich1: h1, hemistich2: h2 });
      }
    }
    if (accum.length > verses.length) verses.splice(0, verses.length, ...accum);
  }

  if (verses.length === 0) return null;

  poem.verses = verses;
  poem.opening = verses[0]?.hemistich1;
  poem.meter = extractMeter(html);
  poem.rhyme = extractRhyme(verses[verses.length - 1]?.hemistich2 ?? verses[verses.length - 1]?.hemistich1 ?? '');

  // محاولة استخراج بيانات إضافية من رأس الصفحة
  const yearsM = html.match(/\((\d{2,4})\s*[-–]\s*(\d{2,4})\)/);
  if (yearsM) {
    const y = extractYears(yearsM[0]);
    // نحفظها في tags لأنها بيانات الشاعر لا القصيدة
    poem.tags ??= [];
    if (y.birth) poem.tags.push(`poet_birth:${y.birth}`);
    if (y.death) poem.tags.push(`poet_death:${y.death}`);
  }
  return poem;
}

// ─── واجهة سطر الأوامر ─────────────────────────────────────────────────
async function cmdFetchAll(): Promise<void> {
  ensureDir(CONFIG.outDir);
  const erasFile  = path.join(CONFIG.outDir, 'eras.jsonl');
  const poetsFile = path.join(CONFIG.outDir, 'poets.jsonl');
  const poemsFile = path.join(CONFIG.outDir, 'poems.jsonl');

  // 1) eras
  fs.writeFileSync(erasFile, '');
  const eras = fetchOrParseEras();
  for (const e of eras) appendJsonl(erasFile, e);
  console.log(`✓ eras: ${eras.length}`);

  // 2) poets per era
  fs.writeFileSync(poetsFile, '');
  const poets: RawPoet[] = [];
  for (const era of eras) {
    if (!era.external_id) { console.log(`  · skip ${era.id} (no cat)`); continue; }
    try {
      const list = await fetchPoetsOfEra(era.id);
      for (const p of list) appendJsonl(poetsFile, p);
      poets.push(...list);
      console.log(`✓ era=${era.id}: ${list.length} poets`);
    } catch (e) {
      console.warn(`  ✗ era=${era.id}: ${(e as Error).message}`);
    }
  }
  console.log(`✓ total poets: ${poets.length}`);

  // 3) poems per poet (titles فقط، المحتوى لاحقًا)
  fs.writeFileSync(poemsFile, '');
  let totalPoems = 0;
  for (const poet of poets) {
    try {
      const list = await fetchPoemsOfPoet(poet);
      for (const pm of list) appendJsonl(poemsFile, pm);
      totalPoems += list.length;
      console.log(`  · ${poet.name_ar}: ${list.length} poems`);
    } catch (e) {
      console.warn(`  ✗ ${poet.name_ar}: ${(e as Error).message}`);
    }
  }
  console.log(`✓ total poems (titles): ${totalPoems}`);

  // 4) poem contents
  const poemList = readJsonl<RawPoem>(poemsFile);
  const poetById = new Map(poets.map(p => [p.slug, p]));
  const fullFile = path.join(CONFIG.outDir, 'poems_full.jsonl');
  fs.writeFileSync(fullFile, '');
  let done = 0;
  for (const poem of poemList) {
    const poet = poetById.get(poem.poet_slug);
    if (!poet) continue;
    try {
      const filled = await fetchPoemContent(poem, poet);
      if (filled && filled.verses.length > 0) {
        appendJsonl(fullFile, filled);
        done++;
        if (done % 100 === 0) console.log(`  · ${done}/${poemList.length} poems with text`);
      }
    } catch (e) {
      console.warn(`  ✗ poem ${poem.slug}: ${(e as Error).message}`);
    }
  }
  console.log(`✓ poems_full.jsonl: ${done} poems with content`);
}

async function cmdParseAll(): Promise<void> {
  // مرحلة الـ parse تعمل من الـ cache ولا تحتاج إنترنت
  // (مفيد لإعادة الـ parse بعد تعديل selectors)
  await cmdFetchAll();
}

// ─── main ──────────────────────────────────────────────────────────────
const [, , command, ...args] = process.argv;

(async () => {
  try {
    ensureDir(CONFIG.cacheDir);
    ensureDir(CONFIG.outDir);

    switch (command) {
      case 'fetch':
      case 'parse':
        if (args.includes('--all')) {
          await cmdFetchAll();
        } else if (args.find(a => a.startsWith('--poets-of='))) {
          const eraId = args.find(a => a.startsWith('--poets-of='))!.split('=')[1];
          const list = await fetchPoetsOfEra(eraId);
          for (const p of list) console.log(p.slug, '|', p.name_ar);
          console.log(`Total: ${list.length}`);
        } else if (args.includes('--eras')) {
          for (const e of fetchOrParseEras()) console.log(e.id, '|', e.name_ar);
        } else {
          console.log('Use: fetch --all | --eras | --poets-of=jahili');
        }
        break;
      default:
        console.log('Usage:');
        console.log('  scrape-adab.ts fetch --all');
        console.log('  scrape-adab.ts fetch --eras');
        console.log('  scrape-adab.ts fetch --poets-of=<eraId>');
    }
  } catch (e) {
    console.error('FATAL:', e);
    process.exit(1);
  }
})();
