import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Feather, Network, Clock, ScrollText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import SearchBar from '@/components/diwan/library/SearchBar';
import PoemCard from '@/components/diwan/library/PoemCard';
import PoetTimeline from '@/components/diwan/PoetTimeline';
import FallbackBadge from '@/components/diwan/library/FallbackBadge';
import { useDiwanPoet, useDiwanPoetPoems } from '@/lib/diwan/hooks';
import { poetTimelines } from '@/data/poetTimelines';
import type { DiwanPoemSummary } from '@/lib/diwan/types';

const PAGE = 30;

/**
 * صفحة شاعر مفرد. تعرض البطاقة التعريفية + قصائده مع بحث + pagination.
 * تستفيد من PoetTimeline القديم تلقائيًا لو وُجد ID مطابق في
 * poetTimelines (للحفاظ على ميزات الديوان الأصلية).
 */
export default function LibraryPoetPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [showTimeline, setShowTimeline] = useState(false);

  const poet  = useDiwanPoet(slug);
  const poems = useDiwanPoetPoems({
    poetSlug: slug ?? '', q: q || null, page, pageSize: PAGE,
  });

  // قائمة مُجمَّعة عبر الصفحات (نفس نمط LibraryPoets) — قبل هذا الإصلاح
  // كان "تحميل المزيد" يستبدل الصفحة الحالية بدلاً من الإلحاق، فيرى
  // المستخدم 30 قصيدة كحدّ أقصى رغم وجود المزيد.
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

  if (poet.isLoading) {
    return (
      <div className="min-h-screen bg-background pt-14 px-5">
        <div className="skeleton h-10 w-40 mb-4" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  if (!poet.data) {
    return (
      <div className="min-h-screen bg-background pt-14 px-5 text-center">
        <BackButton fallback="/mihrab" />
        <p className="text-muted-foreground mt-8">لم يُعثر على هذا الشاعر.</p>
      </div>
    );
  }

  const p = poet.data;
  const hasTimeline = !!(slug && poetTimelines[slug]);
  const lifespan = p.birth_year && p.death_year
    ? `${p.birth_year}–${p.death_year}م`
    : p.death_year ? `ت ${p.death_year}م` : null;

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO
        title={`${p.name_ar} — قصائده وسيرته`}
        description={p.bio ?? ''}
        path={`/diwan/library/poet/${p.slug}`}
      />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <BackButton fallback="/mihrab" />
          <div className="flex-1 min-w-0">
            <h1
              className="text-[20px] font-bold text-foreground truncate"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              {p.name_ar}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {p.title && (
                <p className="text-[11px] text-primary">{p.title}</p>
              )}
              <FallbackBadge />
            </div>
          </div>
        </div>

        {/* Bio Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border/40 p-4 mb-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Feather className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2
                className="font-bold text-[16px] text-foreground"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                {p.name_ar}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                {lifespan && <span>{lifespan}</span>}
                {p.poems_count > 0 && (
                  <>
                    {lifespan && <span>·</span>}
                    <span>{p.poems_count} قصيدة</span>
                  </>
                )}
                {p.verses_count > 0 && (
                  <>
                    <span>·</span>
                    <span>{p.verses_count} بيت</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {p.bio && (
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              {p.bio}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
            {hasTimeline && (
              <button
                onClick={() => setShowTimeline(s => !s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  showTimeline
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                السيرة الزمنية
              </button>
            )}
            <button
              onClick={() => navigate(`/diwan/library/search?graph=${slug}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
            >
              <Network className="w-3.5 h-3.5" />
              علاقاته الأدبية
            </button>
          </div>
        </motion.div>

        {/* Timeline */}
        <AnimatePresence>
          {showTimeline && hasTimeline && slug && (
            <div className="mb-4">
              <PoetTimeline
                poetId={slug}
                poetName={p.name_ar}
                onClose={() => setShowTimeline(false)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Search poems */}
        <div className="mb-3">
          <SearchBar
            value={q}
            placeholder="ابحث في قصائده…"
            onChange={setQ}
          />
        </div>

        {/* Poems heading */}
        <h3 className="text-[13px] font-bold text-foreground mb-2 flex items-center gap-1.5">
          <ScrollText className="w-3.5 h-3.5 text-primary" />
          القصائد
        </h3>

        {poems.isLoading && page === 0 ? (
          <div className="space-y-2.5">
            {[0,1,2].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-[12px]">
            {q ? 'لا قصائد مطابقة.' : 'لا قصائد متاحة بعد.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((pm, i) => <PoemCard key={pm.slug} poem={pm} index={i} />)}
            {showLoadMore && (
              <>
                <div ref={sentinelRef} aria-hidden className="h-1" />
                <button
                  onClick={() => setPage(pg => pg + 1)}
                  disabled={poems.isFetching}
                  className="w-full mt-2 py-3 rounded-2xl bg-card border border-border/40 text-[12px] font-semibold text-primary hover:bg-primary/5 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {poems.isFetching ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> يحمّل…</>
                  ) : 'تحميل المزيد'}
                </button>
              </>
            )}
            {reachedEnd && items.length > PAGE && (
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
