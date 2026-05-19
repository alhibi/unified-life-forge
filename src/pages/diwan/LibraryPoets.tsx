import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import SearchBar from '@/components/diwan/library/SearchBar';
import EraPills from '@/components/diwan/library/EraPills';
import PoetCard from '@/components/diwan/library/PoetCard';
import { useDiwanEras, useDiwanPoets } from '@/lib/diwan/hooks';

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

  // عند تغيير الفلتر، أعد للصفحة الأولى
  React.useEffect(() => { setPage(0); }, [era, q]);

  const eraLabel = useMemo(() => {
    if (!era) return null;
    return eras.data?.find(e => e.id === era)?.name_ar ?? null;
  }, [era, eras.data]);

  const setEra = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('era', id); else next.delete('era');
    setParams(next, { replace: true });
  };

  const list = poets.data ?? [];
  const showLoadMore = list.length === PAGE;

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
              {list.length > 0 && `${list.length}+ شاعر`}
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
          <div className="space-y-2.5">
            {list.map((p, i) => <PoetCard key={p.slug} poet={p} index={i} />)}
            {showLoadMore && (
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={poets.isFetching}
                className="w-full mt-2 py-3 rounded-2xl bg-card border border-border/40 text-[12px] font-semibold text-primary hover:bg-primary/5 active:scale-[0.98] transition disabled:opacity-50"
              >
                {poets.isFetching ? 'يحمّل…' : 'تحميل المزيد'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
