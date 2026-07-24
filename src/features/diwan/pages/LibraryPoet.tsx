import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, Network, Loader2 } from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import SearchBar from '@/features/diwan/components/library/SearchBar';
import PoemCard from '@/features/diwan/components/library/PoemCard';
import PoetTimeline from '@/features/diwan/components/PoetTimeline';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import { useDiwanPoet, useDiwanPoetPoems, useDiwanEras } from '@/features/diwan/lib/hooks';
import { poetTimelines } from '@/features/diwan/data/poetTimelines';
import type { DiwanPoemSummary } from '@/features/diwan/lib/types';

const PAGE = 30;

/**
 * صفحة بروفايل الشاعر — مصممة بالكامل بنمط "المخطوطة" (Manuscript).
 * تعرض سيرة الشاعر مع ختم شمع كبير، وتفاصيل إحصاءاته، وقائمة قصائده الأنيقة.
 */
export default function LibraryPoetPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [showTimeline, setShowTimeline] = useState(false);

  const poet  = useDiwanPoet(slug);
  const eras  = useDiwanEras();
  const poems = useDiwanPoetPoems({
    poetSlug: slug ?? '', q: q || null, page, pageSize: PAGE,
  });

  // قائمة مُجمَّعة عبر الصفحات
  const [items, setItems] = useState<DiwanPoemSummary[]>([]);
  const [reachedEnd, setReachedEnd] = useState(false);

  // عند تغيّر البحث أو الشاعر، صفّر كل شيء
  useEffect(() => {
    setPage(0);
    setItems([]);
    setReachedEnd(false);
  }, [q, slug]);

  // دمج صفحة جديدة مع المُجمَّع، مع منع التكرار عبر slug
  useEffect(() => {
    const data = poems.data;
    if (!data) return;
    setItems(prev => {
      if (page === 0) return data;
      const seen = new Set(prev.map(p => p.slug));
      const merged = [...prev];
      for (const p of data) if (!seen.has(p.slug)) merged.push(p);
      return merged;
    });
    if (data.length < PAGE) setReachedEnd(true);
  }, [poems.data, page]);

  // تحميل تلقائي عند الاقتراب من النهاية
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const showLoadMore = !reachedEnd && items.length > 0;
  useEffect(() => {
    if (!showLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !poems.isFetching) {
          setPage(p => p + 1);
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showLoadMore, poems.isFetching]);

  const p = poet.data;
  const hasTimeline = !!(slug && poetTimelines[slug]);
  const lifespan = p?.birth_year && p?.death_year
    ? `${p.birth_year}–${p.death_year}م`
    : p?.death_year ? `ت ${p.death_year}م` : null;

  const firstLetter = p?.name_ar ? p.name_ar.trim().charAt(0) : 'ش';

  const eraName = useMemo(() => {
    if (!p) return null;
    return p.era_id ? eras.data?.find(e => e.id === p.era_id)?.name_ar ?? null : null;
  }, [p, eras.data]);

  if (poet.isLoading) {
    return (
      <div className="min-h-screen bg-background pt-14 px-5 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-[13px] text-muted-foreground font-tajawal">جاري فتح مخطوطة الشاعر…</p>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen bg-background pt-14 px-5 text-center">
        <BackButton fallback="/mihrab" />
        <p className="text-muted-foreground mt-8 font-tajawal">لم يُعثر على هذا الشاعر في دواوين العرب.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-28 px-5 pt-14 font-tajawal selection:bg-primary/20 selection:text-primary-foreground">
      <SEO
        title={`${p.name_ar} — قصائده وسيرته`}
        description={p.bio ?? ''}
        path={`/diwan/library/poet/${p.slug}`}
      />
      <div className="max-w-lg mx-auto">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-6">
          <BackButton fallback="/mihrab" className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary active:scale-95 transition-all" />
          <FallbackBadge />
        </div>

        {/* Profile Card / Bio Container */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {/* ختم شمع كبير في المنتصف */}
          <div
            className="w-[78px] h-[78px] rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'hsl(var(--primary))',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <span className="font-amiri font-bold text-[32px] text-primary-foreground leading-none select-none">
              {firstLetter}
            </span>
          </div>

          {/* اسم الشاعر وعنوانه وتاريخ حياته */}
          <h2
            className="text-[26px] font-bold text-foreground text-center leading-tight mb-2"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            {p.name_ar}
          </h2>

          {p.title && (
            <div className="text-center mb-3">
              <span className="inline-block text-[11px] font-tajawal text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                {p.title}
              </span>
            </div>
          )}

          <p className="text-center text-[12px] text-muted-foreground font-tajawal mb-4 select-none">
            {lifespan && <span>{lifespan}</span>}
            {lifespan && eraName && <span className="mx-1.5 opacity-40">·</span>}
            {eraName && <span>عصر {eraName}</span>}
          </p>

          {/* فقرة سيرة كاملة */}
          {p.bio && (
            <p className="text-[13px] leading-[1.9] text-muted-foreground text-center max-w-md mx-auto mb-6 px-1 whitespace-pre-line">
              {p.bio}
            </p>
          )}

          {/* صف إحصائيات ثلاثي مفصول بخطوط رفيعة */}
          <div className="grid grid-cols-3 border-y border-border/60 py-4 mb-6">
            <div className="text-center">
              <p className="font-amiri text-[22px] font-bold text-primary leading-none mb-1 select-all">
                {p.poems_count}
              </p>
              <p className="text-[11px] text-muted-foreground font-tajawal select-none">
                قصائد مأثورة
              </p>
            </div>
            <div className="text-center border-r border-border/60">
              <p className="font-amiri text-[22px] font-bold text-primary leading-none mb-1 select-all">
                {p.verses_count}
              </p>
              <p className="text-[11px] text-muted-foreground font-tajawal select-none">
                بيت شعر
              </p>
            </div>
            <div className="text-center border-r border-border/60 flex flex-col justify-center items-center">
              <p className="font-amiri text-[15px] font-bold text-primary leading-snug mb-1 truncate max-w-full px-1">
                {eraName || 'قديم'}
              </p>
              <p className="text-[11px] text-muted-foreground font-tajawal select-none">
                العصر الأدبي
              </p>
            </div>
          </div>

          {/* أزرار السيرة الزمنية والعلاقات */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {hasTimeline && (
              <button
                onClick={() => setShowTimeline(s => !s)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-bold transition-all ${
                  showTimeline
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-card text-muted-foreground border border-border hover:text-foreground'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                السيرة الزمنية
              </button>
            )}
            <button
              onClick={() => navigate(`/diwan/library/search?graph=${slug}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-bold bg-card text-muted-foreground border border-border hover:text-foreground transition-all"
            >
              <Network className="w-3.5 h-3.5" />
              علاقاته الأدبية
            </button>
          </div>
        </motion.div>

        {/* Timeline */}
        <AnimatePresence>
          {showTimeline && hasTimeline && slug && (
            <div className="mb-6">
              <PoetTimeline
                poetId={slug}
                poetName={p.name_ar}
                onClose={() => setShowTimeline(false)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Search poems */}
        <div className="mb-5">
          <SearchBar
            value={q}
            placeholder="ابحث في قصائده وملاحمه…"
            onChange={setQ}
          />
        </div>

        {/* Poems Heading */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-[10px] text-primary" aria-hidden="true">◆</span>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground font-tajawal">
            قصائده وديوانه
          </h3>
        </div>

        {poems.isLoading && page === 0 ? (
          <div className="space-y-4 pt-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="py-4 border-b border-border/60">
                <div className="h-4 bg-muted/40 rounded w-1/4 animate-pulse mb-2" />
                <div className="h-3 bg-muted/30 rounded w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-[12.5px] font-tajawal">
            {q ? 'لا قصائد مطابقة في هذا المخطوط.' : 'لا قصائد محفوظة لهذا الشاعر بعد.'}
          </div>
        ) : (
          <div className="flex flex-col">
            {items.map((pm, i) => <PoemCard key={pm.slug} poem={pm} index={i} />)}
            {showLoadMore && (
              <>
                <div ref={sentinelRef} aria-hidden className="h-2" />
                <button
                  onClick={() => setPage(pg => pg + 1)}
                  disabled={poems.isFetching}
                  className="w-full mt-4 py-3 rounded-lg bg-card border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {poems.isFetching ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> جاري فتح المزيد من الرقوق…</>
                  ) : 'تحميل المزيد من قصائده'}
                </button>
              </>
            )}
            {reachedEnd && items.length > PAGE && (
              <p className="text-center text-[11px] text-muted-foreground font-tajawal pt-6 select-none">
                انتهى ديوان الشاعر في هذه النسخة
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
