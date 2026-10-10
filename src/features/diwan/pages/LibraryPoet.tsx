import { AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppList, PageShell, Section, Stat, StatGrid } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import PoemCard from '@/features/diwan/components/library/PoemCard';
import SearchBar from '@/features/diwan/components/library/SearchBar';
import PoetTimeline from '@/features/diwan/components/PoetTimeline';
import { poetTimelines } from '@/features/diwan/data/poetTimelines';
import { useDiwanEras, useDiwanPoet, useDiwanPoetPoems } from '@/features/diwan/lib/hooks';
import type { DiwanPoemSummary } from '@/features/diwan/lib/types';
import { Clock, Loader2, Network } from '@/lib/icons';

const PAGE = 30;

/**
 * صفحة بروفايل الشاعر — ترويسة <PageHeader> قياسية باسم الشاعر،
 * وشريحة «ختم» رائدة داخل البطاقة، وإحصاءات <StatGrid>، وقائمة
 * القصائد <AppList>. التراكم عبر الصفحات من useInfiniteQuery.
 */
export default function LibraryPoetPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);

  const poet = useDiwanPoet(slug);
  const eras = useDiwanEras();
  const poems = useDiwanPoetPoems({
    poetSlug: slug ?? '',
    q: q || null,
    pageSize: PAGE,
  });

  // قائمة مُجمَّعة من صفحات الاستعلام، مع منع التكرار عبر slug
  const items = useMemo<DiwanPoemSummary[]>(() => {
    const seen = new Set<string>();
    const out: DiwanPoemSummary[] = [];
    for (const page of poems.data?.pages ?? []) {
      for (const pm of page) {
        if (!seen.has(pm.slug)) {
          seen.add(pm.slug);
          out.push(pm);
        }
      }
    }
    return out;
  }, [poems.data]);

  const reachedEnd = poems.hasNextPage === false;
  const showLoadMore = poems.hasNextPage === true && items.length > 0;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = poems;

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

  const p = poet.data;
  const hasTimeline = !!(slug && poetTimelines[slug]);
  const lifespan =
    p?.birth_year && p?.death_year
      ? `${p.birth_year}–${p.death_year}م`
      : p?.death_year
        ? `ت ${p.death_year}م`
        : null;

  const firstLetter = p?.name_ar ? p.name_ar.trim().charAt(0) : 'ش';

  const eraName = useMemo(() => {
    if (!p) return null;
    return p.era_id ? (eras.data?.find((e) => e.id === p.era_id)?.name_ar ?? null) : null;
  }, [p, eras.data]);

  const subtitle = [lifespan, eraName ? `عصر ${eraName}` : null].filter(Boolean).join(' · ');

  if (poet.isLoading) {
    return (
      <PageShell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="font-tajawal text-mini text-muted-foreground">جاري فتح مخطوطة الشاعر…</p>
        </div>
      </PageShell>
    );
  }

  if (!p) {
    return (
      <PageShell>
        <PageHeader title="المكتبة الكبرى" backFallback="/mihrab" />
        <StateView
          kind="search"
          title="لم يُعثر على هذا الشاعر"
          body="قد يكون الرابط قديماً أو الشاعر غير مُدرج في هذه النسخة من دواوين العرب."
          action={{ label: 'تصفّح قائمة الشعراء', onClick: () => navigate('/diwan/library/poets') }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SEO
        title={`${p.name_ar} — قصائده وسيرته`}
        description={p.bio ?? ''}
        path={`/diwan/library/poet/${p.slug}`}
      />

      <PageHeader
        title={p.name_ar}
        subtitle={subtitle || undefined}
        right={<FallbackBadge />}
        backFallback="/mihrab"
      />

      {/* Profile Card / Bio Container */}
      <div className="flex flex-col items-center gap-3 text-center">
        {/* ختم الشاعر في المنتصف */}
        <span
          className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-primary"
          aria-hidden
        >
          <span className="select-none font-amiri text-hero font-bold leading-none text-primary-foreground">
            {firstLetter}
          </span>
        </span>

        {p.title && (
          <span className="inline-block whitespace-nowrap rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-tajawal text-micro text-primary">
            {p.title}
          </span>
        )}

        {/* فقرة سيرة كاملة */}
        {p.bio && (
          <p className="max-w-md whitespace-pre-line px-1 font-tajawal text-mini leading-[1.9] text-muted-foreground">
            {p.bio}
          </p>
        )}
      </div>

      {/* إحصاءات الشاعر */}
      <StatGrid cols={2}>
        <Stat value={p.poems_count} label="قصائد مأثورة" />
        <Stat value={p.verses_count} label="بيت شعر" />
      </StatGrid>

      {/* أزرار السيرة الزمنية والعلاقات */}
      <div className="flex items-center justify-center gap-2">
        {hasTimeline && (
          <Button
            variant={showTimeline ? 'default' : 'secondary'}
            size="sm"
            aria-pressed={showTimeline}
            onClick={() => setShowTimeline((s) => !s)}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden />
            السيرة الزمنية
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/diwan/library/search?graph=${slug}`)}
        >
          <Network className="h-3.5 w-3.5" aria-hidden />
          علاقاته الأدبية
        </Button>
      </div>

      {/* Timeline */}
      <AnimatePresence>
        {showTimeline && hasTimeline && slug && (
          <PoetTimeline
            poetId={slug}
            poetName={p.name_ar}
            onClose={() => setShowTimeline(false)}
          />
        )}
      </AnimatePresence>

      {/* Search poems */}
      <SearchBar value={q} placeholder="ابحث في قصائده وملاحمه…" onChange={setQ} />

      {/* Poems */}
      <Section label="قصائده وديوانه">
        {poems.isLoading ? (
          <div className="space-y-2 pt-1">
            <div className="skeleton h-14 rounded-lg" />
            <div className="skeleton h-14 rounded-lg" />
            <div className="skeleton h-14 rounded-lg" />
          </div>
        ) : items.length === 0 ? (
          <StateView
            compact
            kind={q ? 'search' : 'empty'}
            title={q ? 'لا قصائد مطابقة' : 'لا قصائد محفوظة بعد'}
            body={
              q
                ? 'لم نطابق بحثك في هذا الديوان. جرّب كلمة أقصر أو جزءاً من عنوان القصيدة.'
                : 'لم تُنسخ قصائد هذا الشاعر في هذه النسخة بعد. جرّب شاعراً آخر من القائمة.'
            }
          />
        ) : (
          <>
            <AppList>
              {items.map((pm) => (
                <PoemCard key={pm.slug} poem={pm} />
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
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> جاري فتح المزيد
                      من الرقوق…
                    </>
                  ) : (
                    'تحميل المزيد من قصائده'
                  )}
                </Button>
              </>
            )}
            {reachedEnd && items.length > PAGE && (
              <p className="pt-4 text-center text-micro text-muted-foreground">
                انتهى ديوان الشاعر في هذه النسخة
              </p>
            )}
          </>
        )}
      </Section>
    </PageShell>
  );
}
