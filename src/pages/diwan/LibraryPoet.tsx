import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Feather, Network, Clock, ScrollText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import SearchBar from '@/components/diwan/library/SearchBar';
import PoemCard from '@/components/diwan/library/PoemCard';
import PoetTimeline from '@/components/diwan/PoetTimeline';
import { useDiwanPoet, useDiwanPoetPoems } from '@/lib/diwan/hooks';
import { poetTimelines } from '@/data/poetTimelines';

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

  React.useEffect(() => { setPage(0); }, [q]);

  const list = poems.data ?? [];
  const hasTimeline = !!(slug && poetTimelines[slug]);
  const showLoadMore = list.length === PAGE;

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
        <BackButton onClick={() => navigate('/diwan/library/poets')} />
        <p className="text-muted-foreground mt-8">لم يُعثر على هذا الشاعر.</p>
      </div>
    );
  }

  const p = poet.data;
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
          <BackButton onClick={() => navigate(-1)} />
          <div className="flex-1 min-w-0">
            <h1
              className="text-[20px] font-bold text-foreground truncate"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              {p.name_ar}
            </h1>
            {p.title && (
              <p className="text-[11px] text-primary mt-0.5">{p.title}</p>
            )}
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
              onClick={() => navigate(`/diwan?graph=${slug}`)}
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
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-[12px]">
            {q ? 'لا قصائد مطابقة.' : 'لا قصائد متاحة بعد.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map((pm, i) => <PoemCard key={pm.slug} poem={pm} index={i} />)}
            {showLoadMore && (
              <button
                onClick={() => setPage(pg => pg + 1)}
                disabled={poems.isFetching}
                className="w-full mt-2 py-3 rounded-2xl bg-card border border-border/40 text-[12px] font-semibold text-primary hover:bg-primary/5 active:scale-[0.98] transition disabled:opacity-50"
              >
                {poems.isFetching ? 'يحمّل…' : 'تحميل المزيد'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
