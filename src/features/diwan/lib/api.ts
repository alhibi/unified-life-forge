// طبقة API للمكتبة الشعرية الكبرى.
// كلّ الدوال تستدعي RPCs تم تعريفها في
// supabase/migrations/20260519100000_diwan_library.sql.
//
// عند غياب Supabase أو فشل الاستدعاء نسقط بصمت إلى البيانات
// المحلية في src/data/poetryData.ts (راجع `local-fallback.ts`).
//
// ملاحظة: نستخدم `as any` على client للسماح بأسماء جداول/دوال جديدة
// لم تُحدَّث بعد في src/integrations/supabase/types.ts.

import { supabase } from '@/integrations/supabase/client';

import { isSupabaseReady } from './env';
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
  DiwanVerseSearchResult,
  PoemSearchFilters,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

const PAGE_LIMIT = 30;

// ─── Eras ──────────────────────────────────────────────────────────────
export async function fetchEras(): Promise<DiwanEra[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await sb
    .from('diwan_eras')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DiwanEra[];
}

// ─── Library stats ─────────────────────────────────────────────────────
export async function fetchLibraryStats(): Promise<DiwanLibraryStats> {
  if (!isSupabaseReady()) {
    return { poets_count: 0, poems_count: 0, verses_count: 0, eras_count: 0 };
  }
  const { data, error } = await sb.rpc('diwan_library_stats');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? { poets_count: 0, poems_count: 0, verses_count: 0, eras_count: 0 }) as DiwanLibraryStats;
}

// ─── Poets list ────────────────────────────────────────────────────────
export interface PoetsListParams {
  era?: string | null;
  q?: string | null;
  page?: number;        // 0-indexed
  pageSize?: number;
}

export async function fetchPoets(p: PoetsListParams = {}): Promise<DiwanPoetSummary[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await sb.rpc('diwan_list_poets', {
    era:         p.era ?? null,
    q:           p.q ?? null,
    page_limit:  p.pageSize ?? PAGE_LIMIT,
    page_offset: (p.page ?? 0) * (p.pageSize ?? PAGE_LIMIT),
  });
  if (error) throw error;
  return (data ?? []) as DiwanPoetSummary[];
}

// ─── Poet poems ────────────────────────────────────────────────────────
export interface PoetPoemsParams {
  poetSlug: string;
  q?: string | null;
  meter?: string | null;
  rhyme?: string | null;
  page?: number;
  pageSize?: number;
}

export async function fetchPoetPoems(p: PoetPoemsParams): Promise<DiwanPoemSummary[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await sb.rpc('diwan_list_poems_by_poet', {
    poet_slug:   p.poetSlug,
    q:           p.q ?? null,
    meter:       p.meter ?? null,
    rhyme:       p.rhyme ?? null,
    page_limit:  p.pageSize ?? PAGE_LIMIT,
    page_offset: (p.page ?? 0) * (p.pageSize ?? PAGE_LIMIT),
  });
  if (error) throw error;
  return (data ?? []) as DiwanPoemSummary[];
}

// ─── Poem detail ───────────────────────────────────────────────────────
export async function fetchPoem(slug: string): Promise<DiwanPoemDetail | null> {
  if (!isSupabaseReady()) return null;
  const { data, error } = await sb.rpc('diwan_get_poem', { poem_slug: slug });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as DiwanPoemDetail | null;
}

// ─── Poet header ───────────────────────────────────────────────────────
export async function fetchPoetBySlug(slug: string): Promise<DiwanPoetSummary | null> {
  if (!isSupabaseReady()) return null;
  const { data, error } = await sb
    .from('diwan_poets')
    .select('id, slug, era_id, name_ar, title, bio, birth_year, death_year, poems_count, verses_count')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DiwanPoetSummary | null;
}

// ─── Poems search ──────────────────────────────────────────────────────
export interface PoemSearchParams extends PoemSearchFilters {
  page?: number;
  pageSize?: number;
}

export async function searchPoems(p: PoemSearchParams = {}): Promise<DiwanPoemSearchResult[]> {
  if (!isSupabaseReady()) return [];
  const { data, error } = await sb.rpc('diwan_search_poems', {
    q:           p.q ?? null,
    era:         p.era ?? null,
    poet_slug:   p.poet_slug ?? null,
    meter:       p.meter ?? null,
    rhyme:       p.rhyme ?? null,
    kind:        p.kind ?? null,
    tag:         p.tag ?? null,
    page_limit:  p.pageSize ?? PAGE_LIMIT,
    page_offset: (p.page ?? 0) * (p.pageSize ?? PAGE_LIMIT),
  });
  if (error) throw error;
  return (data ?? []) as DiwanPoemSearchResult[];
}

// ─── Verses search (للبحث عن بيت بعينه) ────────────────────────────────
export interface VerseSearchParams {
  q: string;
  era?: string | null;
  page?: number;
  pageSize?: number;
}

export async function searchVerses(p: VerseSearchParams): Promise<DiwanVerseSearchResult[]> {
  if (!isSupabaseReady() || !p.q) return [];
  const { data, error } = await sb.rpc('diwan_search_verses', {
    q:           p.q,
    era:         p.era ?? null,
    page_limit:  p.pageSize ?? PAGE_LIMIT,
    page_offset: (p.page ?? 0) * (p.pageSize ?? PAGE_LIMIT),
  });
  if (error) throw error;
  return (data ?? []) as DiwanVerseSearchResult[];
}

// ─── Favorites (للمستخدمين المسجّلين) ──────────────────────────────────
export async function toggleFavorite(poemId: string): Promise<boolean> {
  if (!isSupabaseReady()) return false;
  const { data: user } = await sb.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) return false;

  const { data: existing } = await sb
    .from('diwan_user_favorites')
    .select('user_id')
    .eq('user_id', userId)
    .eq('poem_id', poemId)
    .maybeSingle();
  if (existing) {
    await sb
      .from('diwan_user_favorites')
      .delete().eq('user_id', userId).eq('poem_id', poemId);
    return false;
  }
  await sb.from('diwan_user_favorites')
    .insert({ user_id: userId, poem_id: poemId });
  return true;
}

export async function fetchFavorites(): Promise<string[]> {
  if (!isSupabaseReady()) return [];
  const { data: user } = await sb.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) return [];
  const { data, error } = await sb
    .from('diwan_user_favorites')
    .select('poem_id')
    .eq('user_id', userId);
  if (error) return [];
  return (data ?? []).map((r: { poem_id: string }) => r.poem_id);
}

/**
 * يُرجع تفاصيل القصائد المفضّلة لكي تُعرض في صفحة LibraryFavorites.
 * ثلاث استدعاءات متتابعة: favorites → poems → poets، لأن PostgREST
 * relational select يحتاج foreign-key مُعرَّف (وهو موجود) لكن TS-types
 * المُولَّدة قديمة. نتجنّب التعقيد بالاستعلامات المتسلسلة.
 *
 * إذا فشل أيّ شيء (لا تسجيل دخول، لا اتصال) نُرجع [] دون رمي.
 */
export async function fetchFavoritePoems(): Promise<DiwanPoemSearchResult[]> {
  if (!isSupabaseReady()) return [];
  const { data: user } = await sb.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) return [];

  // 1) معرّفات القصائد المفضّلة بترتيب الإضافة (الأحدث أولاً)
  const { data: favs, error: favsErr } = await sb
    .from('diwan_user_favorites')
    .select('poem_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (favsErr || !favs || favs.length === 0) return [];

  const orderedIds = favs.map((r: { poem_id: string }) => r.poem_id);

  // 2) تفاصيل القصائد
  const { data: poems, error: poemsErr } = await sb
    .from('diwan_poems')
    .select('id, slug, title, opening, meter, rhyme, kind, tags, verses_count, era_id, poet_id')
    .in('id', orderedIds);
  if (poemsErr || !poems) return [];

  // 3) أسماء الشعراء
  const poetIds = Array.from(new Set(poems.map((p: { poet_id: string }) => p.poet_id)));
  const { data: poets } = await sb
    .from('diwan_poets')
    .select('id, slug, name_ar')
    .in('id', poetIds);
  const poetMap = new Map<string, { id: string; slug: string; name_ar: string }>(
    (poets ?? []).map((p: { id: string; slug: string; name_ar: string }) =>
      [p.id, p] as const,
    ),
  );

  // نُحافظ على ترتيب favorites الأصلي
  const poemMap = new Map(poems.map((p: { id: string }) => [p.id, p] as const));
  const out: DiwanPoemSearchResult[] = [];
  for (const id of orderedIds) {
    const p = poemMap.get(id);
    if (!p) continue;
    const pAny = p as Record<string, unknown> & {
      id: string; slug: string; title: string; opening: string | null;
      meter: string | null; rhyme: string | null; kind: string | null;
      tags: string[] | null; verses_count: number; era_id: string | null;
      poet_id: string;
    };
    const poet = poetMap.get(pAny.poet_id);
    out.push({
      id: pAny.id, slug: pAny.slug, title: pAny.title, opening: pAny.opening,
      meter: pAny.meter, rhyme: pAny.rhyme, kind: pAny.kind,
      tags: pAny.tags ?? [],
      verses_count: pAny.verses_count,
      poet_id: pAny.poet_id,
      poet_slug: poet?.slug ?? '',
      poet_name: poet?.name_ar ?? '—',
      era_id: pAny.era_id,
    });
  }
  return out;
}

// ─── جديد: قصائد مشابهة ────────────────────────────────────────────────
export async function fetchSimilarPoems(poemSlug: string, limit = 6): Promise<DiwanSimilarPoem[]> {
  if (!isSupabaseReady() || !poemSlug) return [];
  const { data, error } = await sb.rpc('diwan_similar_poems', {
    poem_slug: poemSlug,
    page_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as DiwanSimilarPoem[];
}

// ─── جديد: اقتراحات Autocomplete ───────────────────────────────────────
export async function fetchSuggestions(prefix: string, limit = 8): Promise<DiwanSuggestItem[]> {
  if (!isSupabaseReady() || !prefix || prefix.trim().length < 1) return [];
  const { data, error } = await sb.rpc('diwan_suggest', {
    prefix,
    page_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as DiwanSuggestItem[];
}

// ─── جديد: شرح مفردات قصيدة ────────────────────────────────────────────
export async function fetchPoemGlossary(poemSlug: string): Promise<DiwanGlossaryEntry[]> {
  if (!isSupabaseReady() || !poemSlug) return [];
  const { data, error } = await sb.rpc('diwan_poem_glossary', {
    poem_slug: poemSlug,
  });
  if (error) throw error;
  return (data ?? []) as DiwanGlossaryEntry[];
}

// ─── جديد: بحث موحّد (شعراء + قصائد + أبيات) ──────────────────────────
// يُستدعى من شريط بحث "كل شيء". يُرجع مصفوفة بأنواع مختلطة، يفصلها
// المستهلك حسب `kind`.
export async function fetchSmartSearch(q: string, limit = 12): Promise<DiwanSmartSearchItem[]> {
  if (!isSupabaseReady() || !q || q.trim().length === 0) return [];
  const { data, error } = await sb.rpc('diwan_smart_search', {
    q,
    page_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as DiwanSmartSearchItem[];
}
