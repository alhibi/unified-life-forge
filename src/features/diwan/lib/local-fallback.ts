// نسخة محلّية تحاكي الـ RPCs اعتمادًا على src/data/poetryData.ts.
// تُستخدم تلقائيًا حين يُغيب Supabase. هكذا تطبق الواجهة لا تنكسر
// لا في وضع التطوير ولا في الـ demo، ويتحوّل التحميل إلى "ضخم" تلقائيًا
// متى توفّرت قاعدة بيانات adab.com.

import { poetryEras } from '@/data/poetryData';
import { poetNodes } from '@/data/literaryConnections';
import { diwanLocalGlossary } from '@/data/diwanGlossary';
import type {
  DiwanEra,
  DiwanGlossaryEntry,
  DiwanLibraryStats,
  DiwanPoemDetail,
  DiwanPoemSearchResult,
  DiwanPoemSummary,
  DiwanPoetSummary,
  DiwanSimilarPoem,
  DiwanSmartSearchItem,
  DiwanSuggestItem,
  DiwanVerse,
  DiwanVerseSearchResult,
} from './types';

// ─── أدوات عربية ──────────────────────────────────────────────────────
const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
function norm(s: string): string {
  return (s ?? '').replace(TASHKEEL, '')
    .replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .toLowerCase().trim();
}

// ─── بناء فهارس مرّة واحدة ────────────────────────────────────────────
interface Idx {
  eras:  DiwanEra[];
  poets: (DiwanPoetSummary & { _eraName: string })[];
  poems: (DiwanPoemSearchResult & { _verses: DiwanVerse[] })[];
  poetsBySlug: Map<string, DiwanPoetSummary>;
  poemsBySlug: Map<string, DiwanPoemDetail>;
}

let _idx: Idx | null = null;
function buildIdx(): Idx {
  if (_idx) return _idx;
  const ERA_META: Record<string, { sort: number; color: string; period: string; start?: number; end?: number }> = {
    jahili:    { sort: 1, color: '#d97706', period: 'قبل 622م',  start: 500,  end: 622 },
    mukhadram: { sort: 2, color: '#059669', period: 'حول 622م',  start: 600,  end: 661 },
    islami:    { sort: 3, color: '#0891b2', period: '622-661م',  start: 622,  end: 661 },
    umawi:     { sort: 4, color: '#7c3aed', period: '661-750م',  start: 661,  end: 750 },
    abbasi:    { sort: 5, color: '#dc2626', period: '750-1258م', start: 750,  end: 1258 },
    andalusi:  { sort: 6, color: '#2563eb', period: '711-1492م', start: 711,  end: 1492 },
  };
  const eras: DiwanEra[] = poetryEras.map(e => ({
    id: e.id,
    name_ar: e.nameAr,
    name_en: e.name,
    period_label: ERA_META[e.id]?.period ?? e.period,
    start_year: ERA_META[e.id]?.start ?? null,
    end_year:   ERA_META[e.id]?.end ?? null,
    color:      ERA_META[e.id]?.color ?? '#6366f1',
    sort_order: ERA_META[e.id]?.sort ?? 99,
    description: null,
  }));
  const nodeById = new Map(poetNodes.map(n => [n.id, n]));

  const poets: (DiwanPoetSummary & { _eraName: string })[] = [];
  const poems: (DiwanPoemSearchResult & { _verses: DiwanVerse[] })[] = [];
  const poetsBySlug = new Map<string, DiwanPoetSummary>();
  const poemsBySlug = new Map<string, DiwanPoemDetail>();

  for (const era of poetryEras) {
    for (const p of era.poets) {
      const node = nodeById.get(p.id);
      const verses_count = p.poems.reduce((s, pm) => s + Math.ceil(pm.verses.length / 2), 0);
      const poetSummary: DiwanPoetSummary & { _eraName: string } = {
        id: p.id,
        slug: p.id,
        era_id: era.id,
        name_ar: p.name,
        title: node?.title ?? null,
        bio: p.bio,
        birth_year: parseInt(node?.birth ?? '', 10) || null,
        death_year: parseInt(node?.death ?? '', 10) || null,
        poems_count: p.poems.length,
        verses_count,
        _eraName: era.nameAr,
      };
      poets.push(poetSummary);
      poetsBySlug.set(p.id, poetSummary);

      for (const pm of p.poems) {
        const verses: DiwanVerse[] = [];
        for (let i = 0; i < pm.verses.length; i += 2) {
          const h1 = pm.verses[i]?.trim();
          const h2 = pm.verses[i + 1]?.trim() ?? null;
          if (h1) verses.push({ position: verses.length, hemistich1: h1, hemistich2: h2 });
        }
        const slug = `${p.id}-${norm(pm.title).replace(/\s+/g, '-')}`;
        const summary: DiwanPoemSearchResult & { _verses: DiwanVerse[] } = {
          id: slug,
          slug,
          title: pm.title,
          opening: verses[0]?.hemistich1 ?? null,
          meter: null,
          rhyme: null,
          kind: null,
          tags: [],
          verses_count: verses.length,
          poet_id: p.id,
          poet_slug: p.id,
          poet_name: p.name,
          era_id: era.id,
          _verses: verses,
        };
        poems.push(summary);
        poemsBySlug.set(slug, {
          id: slug,
          slug,
          title: pm.title,
          opening: verses[0]?.hemistich1 ?? null,
          meter: null,
          rhyme: null,
          kind: null,
          tags: [],
          verses_count: verses.length,
          source_url: null,
          poet_id: p.id,
          poet_slug: p.id,
          poet_name: p.name,
          poet_title: node?.title ?? null,
          era_id: era.id,
          era_name: era.nameAr,
          verses,
        });
      }
    }
  }

  _idx = { eras, poets, poems, poetsBySlug, poemsBySlug };
  return _idx;
}

// ─── واجهات تطابق api.ts ──────────────────────────────────────────────
export function localEras(): DiwanEra[] {
  return buildIdx().eras;
}

export function localStats(): DiwanLibraryStats {
  const i = buildIdx();
  return {
    poets_count:  i.poets.length,
    poems_count:  i.poems.length,
    verses_count: i.poems.reduce((s, p) => s + p._verses.length, 0),
    eras_count:   i.eras.length,
  };
}

export function localPoets(p: { era?: string | null; q?: string | null; page?: number; pageSize?: number } = {}): DiwanPoetSummary[] {
  const i = buildIdx();
  const q = p.q ? norm(p.q) : '';
  let list = i.poets.filter(po =>
    (!p.era || po.era_id === p.era) &&
    (!q || norm(po.name_ar).includes(q) || norm(po.title ?? '').includes(q) || norm(po.bio ?? '').includes(q))
  );
  list = list.sort((a, b) => b.verses_count - a.verses_count || a.name_ar.localeCompare(b.name_ar));
  const page = p.page ?? 0;
  const size = p.pageSize ?? 30;
  return list.slice(page * size, page * size + size);
}

export function localPoetBySlug(slug: string): DiwanPoetSummary | null {
  return buildIdx().poetsBySlug.get(slug) ?? null;
}

export function localPoetPoems(p: { poetSlug: string; q?: string | null; meter?: string | null; rhyme?: string | null; page?: number; pageSize?: number }): DiwanPoemSummary[] {
  const i = buildIdx();
  const q = p.q ? norm(p.q) : '';
  let list = i.poems.filter(pm =>
    pm.poet_slug === p.poetSlug &&
    (!q || norm(pm.title).includes(q) || norm(pm.opening ?? '').includes(q))
  );
  list = list.sort((a, b) => b.verses_count - a.verses_count);
  const page = p.page ?? 0;
  const size = p.pageSize ?? 30;
  return list.slice(page * size, page * size + size);
}

export function localPoem(slug: string): DiwanPoemDetail | null {
  return buildIdx().poemsBySlug.get(slug) ?? null;
}

export function localSearchPoems(p: { q?: string | null; era?: string | null; poet_slug?: string | null; page?: number; pageSize?: number }): DiwanPoemSearchResult[] {
  const i = buildIdx();
  const q = p.q ? norm(p.q) : '';
  let list = i.poems.filter(pm =>
    (!p.era || pm.era_id === p.era) &&
    (!p.poet_slug || pm.poet_slug === p.poet_slug) &&
    (!q ||
      norm(pm.title).includes(q) ||
      norm(pm.opening ?? '').includes(q) ||
      pm._verses.some(v => norm(v.hemistich1).includes(q) || norm(v.hemistich2 ?? '').includes(q)))
  );
  list = list.sort((a, b) => b.verses_count - a.verses_count);
  const page = p.page ?? 0;
  const size = p.pageSize ?? 30;
  return list.slice(page * size, page * size + size).map(({ _verses, ...rest }) => rest);
}

export function localSearchVerses(p: { q: string; era?: string | null; page?: number; pageSize?: number }): DiwanVerseSearchResult[] {
  if (!p.q) return [];
  const i = buildIdx();
  const q = norm(p.q);
  const out: DiwanVerseSearchResult[] = [];
  for (const pm of i.poems) {
    if (p.era && pm.era_id !== p.era) continue;
    for (const v of pm._verses) {
      const text = `${v.hemistich1} ${v.hemistich2 ?? ''}`;
      if (norm(text).includes(q)) {
        out.push({
          verse_id: out.length,
          poem_id: pm.id, poem_slug: pm.slug, poem_title: pm.title,
          poet_id: pm.poet_id, poet_slug: pm.poet_slug, poet_name: pm.poet_name,
          era_id: pm.era_id, position: v.position,
          hemistich1: v.hemistich1, hemistich2: v.hemistich2,
          rank: 1,
        });
      }
    }
  }
  const page = p.page ?? 0;
  const size = p.pageSize ?? 30;
  return out.slice(page * size, page * size + size);
}

// ─── جديد: قصائد مشابهة ────────────────────────────────────────────────
export function localSimilarPoems(poemSlug: string, limit = 6): DiwanSimilarPoem[] {
  const idx = buildIdx();
  const src = idx.poems.find(p => p.slug === poemSlug);
  if (!src) return [];
  const scored = idx.poems
    .filter(p => p.slug !== poemSlug)
    .map(p => {
      let score = 0;
      if (p.era_id && p.era_id === src.era_id) score += 1.5;
      if (p.meter && src.meter && p.meter === src.meter) score += 3;
      if (p.kind && src.kind && p.kind === src.kind) score += 2.5;
      if (p.rhyme && src.rhyme && p.rhyme === src.rhyme) score += 1;
      if (p.poet_slug === src.poet_slug) score += 0.8;
      const shared = (p.tags ?? []).filter(t => (src.tags ?? []).includes(t)).length;
      score += shared * 0.4;
      return { p, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.verses_count - a.p.verses_count)
    .slice(0, Math.max(1, Math.min(limit, 30)));
  return scored.map(({ p, score }) => {
    const { _verses, ...rest } = p;
    void _verses;
    return { ...rest, score };
  });
}

// ─── جديد: اقتراحات أثناء الكتابة ───────────────────────────────────────
export function localSuggest(prefix: string, limit = 8): DiwanSuggestItem[] {
  const q = norm(prefix);
  if (!q || q.length < 1) return [];
  const idx = buildIdx();
  const items: DiwanSuggestItem[] = [];

  for (const po of idx.poets) {
    const n = norm(po.name_ar);
    if (n.startsWith(q) || n.includes(q)) {
      const lifespan =
        po.birth_year && po.death_year
          ? `${po.birth_year}–${po.death_year}م`
          : po.death_year
          ? `ت ${po.death_year}م`
          : po.title;
      items.push({
        kind: 'poet',
        slug: po.slug,
        label: po.name_ar,
        sub: lifespan ?? null,
        rank: (n.startsWith(q) ? 2 : 1) + po.verses_count / 1000,
      });
    }
  }

  for (const pm of idx.poems) {
    const n = norm(pm.title);
    const op = norm(pm.opening ?? '');
    if (n.includes(q) || op.startsWith(q)) {
      items.push({
        kind: 'poem',
        slug: pm.slug,
        label: pm.title,
        sub: pm.poet_name,
        rank: (n.startsWith(q) ? 1.5 : 0.8) + pm.verses_count / 5000,
      });
    }
  }

  return items
    .sort((a, b) => b.rank - a.rank)
    .slice(0, Math.max(1, Math.min(limit, 20)));
}

// ─── جديد: شرح المفردات ────────────────────────────────────────────────
export function localGlossary(poemSlug: string): DiwanGlossaryEntry[] {
  const all = diwanLocalGlossary[poemSlug] ?? [];
  return all.map(g => ({
    word: g.word,
    word_normalized: norm(g.word),
    meaning: g.meaning,
    verse_position: g.verse_position ?? null,
  }));
}

// ─── جديد: بحث موحّد (محلّي) ───────────────────────────────────────────
// يحاكي diwan_smart_search عبر مزج 3 مصادر بأوزان متشابهة:
// poet ×1.5, poem ×1.2, verse ×1.0.
export function localSmartSearch(q: string, limit = 12): DiwanSmartSearchItem[] {
  if (!q || q.trim().length === 0) return [];
  const qn = norm(q);
  const idx = buildIdx();
  const out: DiwanSmartSearchItem[] = [];

  // شعراء
  for (const p of idx.poets) {
    const n = norm(p.name_ar);
    if (n.includes(qn)) {
      out.push({
        kind: 'poet',
        slug: p.slug,
        label: p.name_ar,
        sub: p.title ?? null,
        poem_slug: null,
        poet_slug: p.slug,
        poet_name: p.name_ar,
        era_id: p.era_id,
        rank: (n.startsWith(qn) ? 2 : 1) * 1.5,
      });
    }
  }

  // قصائد
  for (const pm of idx.poems) {
    const n = norm(pm.title);
    if (n.includes(qn)) {
      out.push({
        kind: 'poem',
        slug: pm.slug,
        label: pm.title,
        sub: pm.poet_name,
        poem_slug: null,
        poet_slug: pm.poet_slug,
        poet_name: pm.poet_name,
        era_id: pm.era_id,
        rank: (n.startsWith(qn) ? 1.5 : 1) * 1.2,
      });
    }
  }

  // أبيات
  for (const pm of idx.poems) {
    for (const v of pm._verses) {
      const text = `${v.hemistich1} ${v.hemistich2 ?? ''}`;
      if (norm(text).includes(qn)) {
        out.push({
          kind: 'verse',
          slug: pm.slug,
          label: v.hemistich1,
          sub: v.hemistich2 ?? pm.poet_name,
          poem_slug: pm.slug,
          poet_slug: pm.poet_slug,
          poet_name: pm.poet_name,
          era_id: pm.era_id,
          rank: 0.6,
        });
      }
    }
  }

  return out
    .sort((a, b) => b.rank - a.rank)
    .slice(0, Math.max(1, Math.min(limit, 60)));
}
