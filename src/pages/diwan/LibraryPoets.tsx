import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import SearchBar from '@/components/diwan/library/SearchBar';
import EraPills from '@/components/diwan/library/EraPills';
import PoetCard from '@/components/diwan/library/PoetCard';
import { useDiwanEras, useDiwanPoets } from '@/lib/diwan/hooks';
import type { DiwanPoetSummary } from '@/lib/diwan/types';

const PAGE = 30;

/**
 * صفحة قائمة الشعراء — مع فلترة بالعصر، بحث نصي، pagination
 * عبر زر "تحميل المزيد".
 */
export default function LibraryPoetsPage() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO
        title={`${eraLabel ? `شعراء ${eraLabel}` : 'كل الشعراء'} — المكتبة الكبرى`}
        description="تصفّح آلاف الشعراء العرب من مختلف العصور."
        path="/diwan/library/poets"
      />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <BackButton onClick={() => navigate('/diwan/library')} />
          <div className="flex-1">
            <h1 className="text-[20px] font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {eraLabel ? `شعراء ${eraLabel}` : 'كل الشعراء'}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {list.length > 0 && `${list.length}${reachedEnd ? '' : '+'} شاعر`}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-3">
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
          <div className="space-y-2.5">
            {[0,1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-[13px]">
            {q ? 'لا نتائج لبحثك. جرّب اسمًا آخر.' : 'لا توجد بيانات حاليًا.'}
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((p, i) => <PoetCard key={p.slug} poet={p} index={i} />)}
            {showLoadMore && (
              <>
                <div ref={sentinelRef} aria-hidden className="h-1" />
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={poets.isFetching}
                  className="w-full mt-1 py-2.5 rounded-xl bg-card/60 border border-border/30 text-[11.5px] font-semibold text-primary/90 hover:bg-primary/5 active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {poets.isFetching ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> يحمّل…</>
                  ) : 'تحميل المزيد'}
                </button>
              </>
            )}
            {reachedEnd && list.length > PAGE && (
              <p className="text-center text-[10.5px] text-muted-foreground/70 pt-2">
                وصلت إلى نهاية القائمة
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
