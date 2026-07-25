// React Query hooks للمكتبة الكبرى. Caching ذكي بالسلوك التالي:
//   - في حال غياب Supabase أو فشل الاستدعاء => fallback للـ localFallback
//   - مفاتيح cache هرميّة: ['diwan', resource, ...params]
//   - staleTime عالٍ (5 دقائق) لأن البيانات أدبية لا تتغيّر كثيرًا
//   - يُصدر حالة المصدر (demo/offline/none) إلى fallback-status لعرض
//     badge شفّاف للمستخدم (راجع DiwanFallbackBadge).

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  fetchEras,
  fetchFavoritePoems,
  fetchFavorites,
  fetchLibraryStats,
  fetchPoem,
  fetchPoemGlossary,
  fetchPoetBySlug,
  fetchPoetPoems,
  fetchPoets,
  fetchSimilarPoems,
  fetchSmartSearch,
  fetchSuggestions,
  type PoemSearchParams,
  type PoetPoemsParams,
  type PoetsListParams,
  searchPoems,
  searchVerses,
  toggleFavorite,
  type VerseSearchParams,
} from './api';
import { isSupabaseReady } from './env';
import { notifyFallback, notifyRemoteOk } from './fallback-status';
import {
  localEras,
  localGlossary,
  localPoem,
  localPoetBySlug,
  localPoetPoems,
  localPoets,
  localSearchPoems,
  localSearchVerses,
  localSimilarPoems,
  localSmartSearch,
  localStats,
  localSuggest,
} from './local-fallback';
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
} from './types';

const STALE = 5 * 60 * 1000;

/**
 * `local` may be async: the seed corpus behind the local fallback is fetched
 * from `public/data/diwan-poetry.json` on first use rather than bundled, so
 * every `local*()` helper returns a promise. This matters for cost, not just
 * tidiness — the corpus is now only downloaded when this fallback actually
 * runs, so a populated Supabase never pays for it.
 */
function withFallback<T>(
  remote: () => Promise<T>,
  local: () => T | Promise<T>,
): () => Promise<T> {
  return async () => {
    // Supabase غير مكوّن → سقوط متعمَّد على البيانات المحلية (وضع
    // تجريبي). لا نحاول استدعاء remote لأنّ client يعيد لنا أخطاء HTTP
    // 401 على placeholder URL.
    if (!isSupabaseReady()) {
      notifyFallback('demo');
      return await local();
    }
    try {
      const data = await remote();
      // لو رجعت Supabase بمصفوفة فارغة بينما local عنده بيانات — استخدم local.
      // هذا لا يُعتبر "offline" بل "demo": Supabase تعمل لكنها لم تُملأ بعد.
      if (Array.isArray(data) && data.length === 0) {
        const fb = await local();
        if (Array.isArray(fb) && fb.length > 0) {
          notifyFallback('demo');
          return fb;
        }
      }
      // لو رجع null/undefined نسقط
      if (data == null) {
        notifyFallback('demo');
        return await local();
      }
      // إحصاءات: لو كل القيم 0، استبدل
      if (typeof data === 'object' && 'poets_count' in (data as object)) {
        const stats = data as unknown as DiwanLibraryStats;
        if (stats.poets_count === 0 && stats.poems_count === 0) {
          notifyFallback('demo');
          return await local();
        }
      }
      notifyRemoteOk();
      return data;
    } catch (e) {
      console.warn('[diwan] remote failed, fallback to local:', (e as Error).message);
      notifyFallback('offline');
      return await local();
    }
  };
}

// ─── Eras ──────────────────────────────────────────────────────────────
export function useDiwanEras(): UseQueryResult<DiwanEra[]> {
  return useQuery({
    queryKey: ['diwan', 'eras'],
    queryFn: withFallback(fetchEras, localEras),
    staleTime: STALE,
  });
}

// ─── Library stats ─────────────────────────────────────────────────────
export function useDiwanStats(): UseQueryResult<DiwanLibraryStats> {
  return useQuery({
    queryKey: ['diwan', 'stats'],
    queryFn: withFallback(fetchLibraryStats, localStats),
    staleTime: STALE,
  });
}

// ─── Poets list ────────────────────────────────────────────────────────
export function useDiwanPoets(p: PoetsListParams = {}): UseQueryResult<DiwanPoetSummary[]> {
  return useQuery({
    queryKey: ['diwan', 'poets', p],
    queryFn: withFallback(() => fetchPoets(p), () => localPoets(p)),
    staleTime: STALE,
  });
}

// ─── Poet detail (header) ──────────────────────────────────────────────
export function useDiwanPoet(slug?: string): UseQueryResult<DiwanPoetSummary | null> {
  return useQuery({
    queryKey: ['diwan', 'poet', slug],
    queryFn: withFallback(
      () => fetchPoetBySlug(slug!),
      () => localPoetBySlug(slug!),
    ),
    enabled: !!slug,
    staleTime: STALE,
  });
}

// ─── Poet poems ────────────────────────────────────────────────────────
export function useDiwanPoetPoems(p: PoetPoemsParams): UseQueryResult<DiwanPoemSummary[]> {
  return useQuery({
    queryKey: ['diwan', 'poet-poems', p],
    queryFn: withFallback(() => fetchPoetPoems(p), () => localPoetPoems(p)),
    enabled: !!p.poetSlug,
    staleTime: STALE,
  });
}

// ─── Poem detail ───────────────────────────────────────────────────────
export function useDiwanPoem(slug?: string): UseQueryResult<DiwanPoemDetail | null> {
  return useQuery({
    queryKey: ['diwan', 'poem', slug],
    queryFn: withFallback(
      () => fetchPoem(slug!),
      () => localPoem(slug!),
    ),
    enabled: !!slug,
    staleTime: STALE,
  });
}

// ─── Search poems ──────────────────────────────────────────────────────
export function useDiwanSearchPoems(p: PoemSearchParams): UseQueryResult<DiwanPoemSearchResult[]> {
  return useQuery({
    queryKey: ['diwan', 'search-poems', p],
    queryFn: withFallback(() => searchPoems(p), () => localSearchPoems(p)),
    staleTime: STALE,
  });
}

// ─── Search verses ─────────────────────────────────────────────────────
export function useDiwanSearchVerses(p: VerseSearchParams): UseQueryResult<DiwanVerseSearchResult[]> {
  return useQuery({
    queryKey: ['diwan', 'search-verses', p],
    queryFn: withFallback(() => searchVerses(p), () => localSearchVerses(p)),
    enabled: !!p.q,
    staleTime: STALE,
  });
}

// ─── جديد: قصائد مشابهة ────────────────────────────────────────────────
export function useDiwanSimilarPoems(slug?: string, limit = 6): UseQueryResult<DiwanSimilarPoem[]> {
  return useQuery({
    queryKey: ['diwan', 'similar', slug, limit],
    queryFn: withFallback(
      () => fetchSimilarPoems(slug!, limit),
      () => localSimilarPoems(slug!, limit),
    ),
    enabled: !!slug,
    staleTime: STALE,
  });
}

// ─── جديد: اقتراحات Autocomplete ───────────────────────────────────────
export function useDiwanSuggest(prefix: string, limit = 8): UseQueryResult<DiwanSuggestItem[]> {
  return useQuery({
    queryKey: ['diwan', 'suggest', prefix, limit],
    queryFn: withFallback(
      () => fetchSuggestions(prefix, limit),
      () => localSuggest(prefix, limit),
    ),
    enabled: prefix.trim().length >= 1,
    staleTime: 30_000,
  });
}

// ─── جديد: شرح مفردات القصيدة ──────────────────────────────────────────
export function useDiwanGlossary(slug?: string): UseQueryResult<DiwanGlossaryEntry[]> {
  return useQuery({
    queryKey: ['diwan', 'glossary', slug],
    queryFn: withFallback(
      () => fetchPoemGlossary(slug!),
      () => localGlossary(slug!),
    ),
    enabled: !!slug,
    staleTime: STALE,
  });
}

// ─── جديد: بحث موحّد (شعراء + قصائد + أبيات) ─────────────────────────
// نقطة دخول مستقبلية لشريط Universal Search. تُغلِّف diwan_smart_search
// مع fallback محلّي يحاكي السلوك على بيانات poetryData.ts.
export function useDiwanSmartSearch(q: string, limit = 12): UseQueryResult<DiwanSmartSearchItem[]> {
  return useQuery({
    queryKey: ['diwan', 'smart-search', q, limit],
    queryFn: withFallback(
      () => fetchSmartSearch(q, limit),
      () => localSmartSearch(q, limit),
    ),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });
}

// ─── Prefetch helpers (للأداء عند hover/touch على البطاقة) ────────────
export function useDiwanPrefetch() {
  const qc = useQueryClient();
  const prefetchPoem = useCallback(
    (slug: string) => {
      qc.prefetchQuery({
        queryKey: ['diwan', 'poem', slug],
        queryFn: withFallback(() => fetchPoem(slug), () => localPoem(slug)),
        staleTime: STALE,
      });
    },
    [qc],
  );
  const prefetchPoet = useCallback(
    (slug: string) => {
      qc.prefetchQuery({
        queryKey: ['diwan', 'poet', slug],
        queryFn: withFallback(() => fetchPoetBySlug(slug), () => localPoetBySlug(slug)),
        staleTime: STALE,
      });
    },
    [qc],
  );
  return { prefetchPoem, prefetchPoet };
}



// ─── Favorites ─────────────────────────────────────────────────────────
// مفتاح مشترك واحد لكل بيانات المفضّلة (IDs + Poems) لإعادة جلب
// متزامنة بعد toggle.
const FAVS_KEYS = {
  ids: ['diwan', 'favorites', 'ids'] as const,
  poems: ['diwan', 'favorites', 'poems'] as const,
};

/**
 * مجموعة معرّفات القصائد المفضّلة. خفيف وسريع — يكفي لرسم الأيقونة
 * المملوءة على بطاقات القصائد.
 *
 * `staleTime: 0` متعمَّد: المفضّلة تتغيّر بتفاعل المستخدم، فنريد
 * إعادة الجلب الفوري بعد كل toggle.
 */
export function useDiwanFavoriteIds(): UseQueryResult<Set<string>> {
  return useQuery({
    queryKey: FAVS_KEYS.ids,
    queryFn: async () => new Set(await fetchFavorites()),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * تفاصيل القصائد المفضّلة كاملة، لعرضها في صفحة LibraryFavorites.
 * staleTime أعلى لأن الصفحة تعرض ما هو ثابت بين الـ toggles.
 */
export function useDiwanFavoritePoems(): UseQueryResult<DiwanPoemSearchResult[]> {
  return useQuery({
    queryKey: FAVS_KEYS.poems,
    queryFn: fetchFavoritePoems,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation لتبديل حالة المفضّلة. يُحدّث optimistic للـ ids set ويبطل
 * كاش القائمة الكاملة بعد النجاح. يتقبّل (poemId, currentlyFav) ويعيد
 * (newFavState, poemId) عند الإكمال.
 */
export function useDiwanToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (poemId: string) => {
      const newState = await toggleFavorite(poemId);
      return { poemId, isFavorite: newState };
    },
    // Optimistic update على Set الـ ids حتى لا يومض القلب.
    onMutate: async (poemId) => {
      await qc.cancelQueries({ queryKey: FAVS_KEYS.ids });
      const prev = qc.getQueryData<Set<string>>(FAVS_KEYS.ids);
      if (prev) {
        const next = new Set(prev);
        if (next.has(poemId)) next.delete(poemId);
        else next.add(poemId);
        qc.setQueryData(FAVS_KEYS.ids, next);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // تراجع عند الفشل
      if (ctx?.prev) qc.setQueryData(FAVS_KEYS.ids, ctx.prev);
    },
    onSuccess: () => {
      // قائمة التفاصيل قد تكون فقدت/كسبت عنصراً
      qc.invalidateQueries({ queryKey: FAVS_KEYS.poems });
    },
  });
}
