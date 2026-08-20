import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/ui/app-shell';
import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { BookOpen, ShieldAlert, Sparkles } from '@/lib/icons';
import { useGermanClubStore } from '../useGermanClubStore';
import { GERMAN_CLUB_TOKENS, GermanShelf } from '../types';
import { ShelfCard } from '../components/ShelfCard';
import { SessionMomentumLine } from '../components/SessionMomentumLine';
import { GenerationModal } from '../components/GenerationModal';

export const GermanClubHome: React.FC = () => {
  const navigate = useNavigate();
  const {
    shelves,
    isLoadingShelves,
    fetchShelves,
    masteredShelfIds,
    animatedMasteryIds,
    markShelfAnimated,
    checkShelfMastery,
  } = useGermanClubStore();

  const [selectedFurnaceShelf, setSelectedFurnaceShelf] = useState<GermanShelf | null>(null);

  useEffect(() => {
    fetchShelves();
    checkShelfMastery();
  }, [fetchShelves, checkShelfMastery]);

  return (
    <PageShell centered={false} flush>
      <SessionMomentumLine />
      <SEO
        title="النادي الألماني (Der Club) — مكتبة المواقف الواقعية"
        description="مساحة القراءة الخاصة باللغة الألمانية مرتبة حسب المواقف اليومية بألوان الأجناس ونظام القواعد الذكي."
        path="/german-club"
      />

      <div
        className="min-h-screen pb-20 transition-colors"
        style={{ backgroundColor: GERMAN_CLUB_TOKENS.paper, color: GERMAN_CLUB_TOKENS.ink }}
      >
        {/* Sticky App Bar Header */}
        <div className="app-sticky-header z-30 px-4 py-3 flex items-center justify-between border-b border-stone-300/60">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-base font-bold text-stone-900 tracking-tight leading-none">
                النادي الألماني
              </h1>
              <span className="text-[0.625rem] font-mono font-bold text-[#17324D] tracking-widest uppercase">
                DER CLUB — AMV
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/german-club/dictionary')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#17324D]/30 bg-[#17324D] text-white hover:bg-[#17324D]/90 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              القاموس الشامل
            </button>

            <button
              type="button"
              onClick={() => navigate('/german-club/grammar')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-stone-300/80 text-stone-700 hover:bg-stone-200/60 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#17324D]" />
              زاوية القواعد
            </button>

            <button
              type="button"
              onClick={() => navigate('/german-club/review')}
              className="p-1.5 rounded-xl border border-stone-300/80 text-stone-600 hover:bg-stone-200/60 transition-colors"
              title="مراجعة المحتوى"
            >
              <ShieldAlert className="w-4 h-4 text-amber-700" />
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden border-b border-stone-300/80 px-4 py-8 sm:py-12 bg-gradient-to-b from-stone-200/80 via-stone-100 to-transparent">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#17324D]/10 text-[#17324D] border border-[#17324D]/20 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>مكتبة القراءة المجانية والمتاحة للجميع</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#17181C] tracking-tight leading-tight">
              تعلم الألمانية بأسلوب <span className="text-[#17324D]">المواقف الحية</span>
            </h2>

            <p className="text-xs sm:text-base text-stone-600 max-w-xl mx-auto leading-relaxed">
              رفوف مرتبة بالحالات اليومية — من طلب القهوة إلى مواقف العمل والقطارات.
              مع توضيح أجناس الأسماء بالألوان وتفكيك الأفعال المنفصلة حركةً.
            </p>
          </div>
        </div>

        {/* Gender Color Code Legend */}
        <div className="max-w-4xl mx-auto px-4 py-4 my-2">
          <div className="p-3.5 rounded-2xl border border-stone-300/60 bg-stone-100/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-stone-700 flex items-center gap-1.5">
              <span>رمزية ألوان أجناس الأسماء:</span>
            </span>
            <div className="flex items-center gap-4 flex-wrap font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3E6E9E] shadow-xs" />
                <span>Der (مذكر)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A15A6B] shadow-xs" />
                <span>Die (مؤنث)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6B6558] shadow-xs" />
                <span>Das (محايد)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Shelf Wall */}
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-[#17181C]">
              رفوف المواقف اليومية ({shelves.length})
            </h3>
            <span className="text-xs text-stone-500">اختر الرف لبدء القراءة</span>
          </div>

          {isLoadingShelves ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 rounded-2xl bg-stone-200/60 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {shelves.map((shelf) => (
                <ShelfCard
                  key={shelf.id}
                  shelf={shelf}
                  isMastered={masteredShelfIds.has(shelf.id)}
                  hasBeenAnimated={animatedMasteryIds.has(shelf.id)}
                  onMasteryAnimationComplete={markShelfAnimated}
                  onOpenFurnace={(s, e) => {
                    e.stopPropagation();
                    setSelectedFurnaceShelf(s);
                  }}
                  onClick={() => navigate(`/german-club/shelf/${shelf.slug}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Furnace Generation Modal when triggered from home shelf cards */}
        {selectedFurnaceShelf && (
          <GenerationModal
            shelfId={selectedFurnaceShelf.id}
            shelfTitleAr={selectedFurnaceShelf.title_ar}
            shelfTitleDe={selectedFurnaceShelf.title_de}
            currentEntryCount={0}
            targetCount={selectedFurnaceShelf.target_entry_count || 25}
            isOpen={Boolean(selectedFurnaceShelf)}
            onClose={() => setSelectedFurnaceShelf(null)}
          />
        )}
      </div>
    </PageShell>
  );
};

export default GermanClubHome;
