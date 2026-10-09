import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import EraPills from '@/features/diwan/components/library/EraPills';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import PoetCard from '@/features/diwan/components/library/PoetCard';
import SearchBar from '@/features/diwan/components/library/SearchBar';
import { useDiwanEras, useDiwanPoets } from '@/features/diwan/lib/hooks';
import type { DiwanPoetSummary } from '@/features/diwan/lib/types';
import { Loader2 } from '@/lib/icons';

const PAGE = 30;

/**
 * صفحة قائمة الشعراء — مصممة بالكامل بنمط "المخطوطة" (Manuscript).
 * تتميز بخلفية حبر دافئة عتيقة، ونظام ألوان شمع الختم العسلي والدموي الكلاسيكي.
 */
export default function LibraryPoetsPage() {
  const [params, setParams] = useSearchParams();
  const era = params.get('era');
  const [q, setQ] = useState<string>(params.get('q') ?? '');
  const [page, setPage] = useState(0);

  const eras  = useDiwanEras();
  const poets = useDiwanPoets({ era, q: q || null, page, pageSize: PAGE });

  // قائمة مُجمَّعة عبر الصفحات
  const [items, setItems] = useState<DiwanPoetSummary[]>([]);
  const [reachedEnd, setReachedEnd] = useState(false);

  // عند تغيير الفلتر/البحث، صفّر كل شيء
  useEffect(() => {
    setPage(0);
    setItems([]);
    setReachedEnd(false);
  }, [era, q]);

  // دمج الصفحة الجديدة مع المُجمَّع (مع منع التكرار)
  useEffect(() => {
    const data = poets.data;
    if (!data) return;
    setItems(prev => {
      if (page === 0) return data;
      const seen = new Set(prev.map(p => p.slug));
      const merged = [...prev];
      for (const p of data) if (!seen.has(p.slug)) merged.push(p);
      return merged;
    });
    if (data.length < PAGE) setReachedEnd(true);
  }, [poets.data, page]);

  const eraLabel = useMemo(() => {
    if (!era) return null;
    return eras.data?.find(e => e.id === era)?.name_ar ?? null;
  }, [era, eras.data]);

  const setEra = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('era', id); else next.delete('era');
    setParams(next, { replace: true });
  };

  const list = items;
  const showLoadMore = !reachedEnd && list.length > 0;

  // تحميل تلقائي عند الاقتراب من النهاية
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!showLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !poets.isFetching) {
          setPage(p => p + 1);
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showLoadMore, poets.isFetching]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-page px-5 pt-14 font-tajawal selection:bg-primary/20 selection:text-foreground">
      <SEO
        title={`${eraLabel ? `شعراء ${eraLabel}` : 'كل الشعراء'} — المكتبة الكبرى`}
        description="تصفّح آلاف الشعراء العرب من مختلف العصور."
        path="/diwan/library/poets"
      />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="mt-1 shrink-0">
            <BackButton fallback="/mihrab" className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-muted-foreground active:scale-95 transition-motion" />
          </div>
          <div className="flex-1 min-w-0">
            {/* عنوان علوي صغير بلون wax */}
            <p className="text-micro font-bold tracking-[0.1em] text-primary uppercase mb-1">
              محراب · الأدب
            </p>
            {/* عنوان رئيسي كبير بخط Amiri */}
            <h1 className="text-hero font-bold tracking-tight text-foreground leading-tight font-amiri">
              {eraLabel ? `شعراء ${eraLabel}` : 'المكتبة الكبرى'}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <p className="text-mini text-muted-foreground">
                {list.length > 0 && `${list.length}${reachedEnd ? '' : '+'} شاعر في هذه النسخة`}
              </p>
              <FallbackBadge />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-5">
          <SearchBar
            value={q}
            placeholder="ابحث باسم شاعر أو لقبه…"
            onChange={setQ}
          />
        </div>

        {/* Era filter */}
        {eras.data && (
          <div className="mb-4">
            <EraPills eras={eras.data} selected={era} onSelect={setEra} />
          </div>
        )}

        {/* List */}
        {poets.isLoading && page === 0 ? (
          <div className="space-y-4 pt-2">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4 py-5 border-b border-border/50">
                <div className="w-[46px] h-[46px] rounded-full bg-foreground/[5%] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-foreground/[8%] rounded w-1/3 animate-pulse" />
                  <div className="h-3 bg-foreground/[5%] rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          /* حالة فارغة مصممة بدقة طبقاً للمواصفات */
          <div className="text-center py-20 flex flex-col items-center justify-center px-4">
            <span className="font-amiri text-hero text-primary mb-4 animate-pulse select-none">
              ✦
            </span>
            <p className="text-muted-foreground text-meta font-medium leading-relaxed max-w-sm">
              {q
                ? 'لا نتائج لبحثك في هذا العصر. جرّب كتابة الاسم بشكل مبسط.'
                : 'لا يوجد شعراء بعد في هذا العصر ضمن هذه النسخة. سيُضافون قريباً.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {list.map((p, i) => <PoetCard key={p.slug} poet={p} index={i} />)}
            {showLoadMore && (
              <>
                <div ref={sentinelRef} aria-hidden className="h-2" />
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={poets.isFetching}
                  className="w-full mt-4 py-3 rounded-[12px] bg-card border border-border text-mini font-semibold text-muted-foreground hover:text-foreground hover:border-muted-foreground active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {poets.isFetching ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> جاري تحميل المزيد من العهد والمدد…</>
                  ) : 'تحميل المزيد من شعراء الدهر'}
                </button>
              </>
            )}
            {reachedEnd && list.length > PAGE && (
              <p className="text-center text-micro text-muted-foreground/70 font-tajawal pt-6 select-none">
                انتهت صحف هذا العصر الأدبي
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
