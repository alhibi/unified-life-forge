import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppList, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import EraPills from '@/features/diwan/components/library/EraPills';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import PoetCard from '@/features/diwan/components/library/PoetCard';
import SearchBar from '@/features/diwan/components/library/SearchBar';
import { useDiwanEras, useDiwanPoets } from '@/features/diwan/lib/hooks';
import type { DiwanPoetSummary } from '@/features/diwan/lib/types';
import { Loader2 } from '@/lib/icons';

const PAGE = 30;

/**
 * صفحة قائمة الشعراء — ترويسة العرض القياسية <PageHeader variant="display">
 * وقائمة <AppList>/<AppRow> واحدة. التراكم عبر الصفحات صار من
 * useInfiniteQuery (لا حالة مجمَّعة ولا effects إعادة ضبط).
 */
export default function LibraryPoetsPage() {
  const [params, setParams] = useSearchParams();
  const era = params.get('era');
  const [q, setQ] = useState<string>(params.get('q') ?? '');

  const eras = useDiwanEras();
  const poets = useDiwanPoets({ era, q: q || null, pageSize: PAGE });

  // قائمة مُجمَّعة من صفحات الاستعلام، مع منع التكرار عبر slug
  const list = useMemo<DiwanPoetSummary[]>(() => {
    const seen = new Set<string>();
    const out: DiwanPoetSummary[] = [];
    for (const page of poets.data?.pages ?? []) {
      for (const p of page) {
        if (!seen.has(p.slug)) {
          seen.add(p.slug);
          out.push(p);
        }
      }
    }
    return out;
  }, [poets.data]);

  const reachedEnd = poets.hasNextPage === false;
  const showLoadMore = poets.hasNextPage === true && list.length > 0;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = poets;

  const eraLabel = useMemo(() => {
    if (!era) return null;
    return eras.data?.find((e) => e.id === era)?.name_ar ?? null;
  }, [era, eras.data]);

  const setEra = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('era', id);
    else next.delete('era');
    setParams(next, { replace: true });
  };

  // تحميل تلقائي عند الاقتراب من النهاية
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!showLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showLoadMore, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <PageShell>
      <SEO
        title={`${eraLabel ? `شعراء ${eraLabel}` : 'كل الشعراء'} — المكتبة الكبرى`}
        description="تصفّح آلاف الشعراء العرب من مختلف العصور."
        path="/diwan/library/poets"
      />

      <PageHeader
        variant="display"
        eyebrow="محراب · الأدب"
        title={eraLabel ? `شعراء ${eraLabel}` : 'المكتبة الكبرى'}
        subtitle={
          list.length > 0 ? `${list.length}${reachedEnd ? '' : '+'} شاعر في هذه النسخة` : undefined
        }
        backFallback="/mihrab"
      >
        <FallbackBadge />
      </PageHeader>

      {/* Search */}
      <SearchBar value={q} placeholder="ابحث باسم شاعر أو لقبه…" onChange={setQ} />

      {/* Era filter */}
      {eras.data && <EraPills eras={eras.data} selected={era} onSelect={setEra} />}

      {/* List */}
      {poets.isLoading ? (
        <div className="space-y-2 pt-1">
          <div className="skeleton h-16 rounded-lg" />
          <div className="skeleton h-16 rounded-lg" />
          <div className="skeleton h-16 rounded-lg" />
          <div className="skeleton h-16 rounded-lg" />
        </div>
      ) : list.length === 0 ? (
        <StateView
          kind={q ? 'search' : 'empty'}
          title={q ? 'لا نتائج لبحثك' : 'لا يوجد شعراء بعد'}
          body={
            q
              ? 'لم نطابق الاسم في هذا العصر ضمن هذه النسخة. جرّب كتابة الاسم بشكل مبسط، أو أزل فلتر العصر.'
              : 'لم يُضَف شعراء لهذا العصر في هذه النسخة بعد. جرّب عصراً آخر أو اختر «الكلّ».'
          }
        />
      ) : (
        <>
          <AppList>
            {list.map((p) => (
              <PoetCard key={p.slug} poet={p} />
            ))}
          </AppList>
          {showLoadMore && (
            <>
              <div ref={sentinelRef} aria-hidden className="h-2" />
              <Button
                variant="secondary"
                className="mt-4 w-full"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    جاري تحميل المزيد من العهد والمدد…
                  </>
                ) : (
                  'تحميل المزيد من شعراء الدهر'
                )}
              </Button>
            </>
          )}
          {reachedEnd && list.length > PAGE && (
            <p className="pt-6 text-center text-micro text-muted-foreground">
              انتهت صحف هذا العصر الأدبي
            </p>
          )}
        </>
      )}
    </PageShell>
  );
}
