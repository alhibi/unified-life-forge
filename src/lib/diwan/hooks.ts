// React Query hooks للمكتبة الكبرى. Caching ذكي بالسلوك التالي:
//   - في حال غياب Supabase أو فشل الاستدعاء => fallback للـ localFallback
//   - مفاتيح cache هرميّة: ['diwan', resource, ...params]
//   - staleTime عالٍ (5 دقائق) لأن البيانات أدبية لا تتغيّر كثيرًا

import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  fetchEras,
  fetchLibraryStats,
  fetchPoets,
  fetchPoetBySlug,
  fetchPoetPoems,
  fetchPoem,
  searchPoems,
  searchVerses,
  fetchSimilarPoems,
  fetchSuggestions,
  fetchPoemGlossary,
  type PoemSearchParams,
  type PoetPoemsParams,
  type PoetsListParams,
  type VerseSearchParams,
} from './api';
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
  DiwanSuggestItem,
  DiwanVerseSearchResult,
} from './types';

const STALE = 5 * 60 * 1000;

function withFallback<T>(remote: () => Promise<T>, local: () => T): () => Promise<T> {
  return async () => {
    try {
      const data = await remote();
      // لو رجعت Supabase بمصفوفة فارغة بينما local عنده بيانات — استخدم local
      if (Array.isArray(data) && data.length === 0) {
        const fb = local();
        if (Array.isArray(fb) && fb.length > 0) return fb;
      }
      // لو رجع null/undefined نسقط
      if (data == null) return local();
      // إحصاءات: لو كل القيم 0، استبدل
      if (typeof data === 'object' && 'poets_count' in (data as object)) {
        const stats = data as unknown as DiwanLibraryStats;
        if (stats.poets_count === 0 && stats.poems_count === 0) return local();
      }
      return data;
    } catch (e) {
      console.warn('[diwan] remote failed, fallback to local:', (e as Error).message);
      return local();
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
