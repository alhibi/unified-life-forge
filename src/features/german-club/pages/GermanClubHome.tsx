import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/ui/app-shell';
import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { BookOpen, CheckCircle, Crown, Lock, ShieldAlert, Sparkles } from '@/lib/icons';
import { useGermanClubStore } from '../useGermanClubStore';
import { GERMAN_CLUB_TOKENS } from '../types';
import { ShelfCard } from '../components/ShelfCard';

export const GermanClubHome: React.FC = () => {
  const navigate = useNavigate();
  const {
    shelves,
    isEntitled,
    isLoadingShelves,
    fetchShelves,
    checkEntitlement,
  } = useGermanClubStore();

  useEffect(() => {
    fetchShelves();
    checkEntitlement();
  }, [fetchShelves, checkEntitlement]);

  return (
    <PageShell centered={false} flush>
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
              <span>مكتبة القراءة الخاصة بالألمانية</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#17181C] tracking-tight leading-tight">
              تعلم الألمانية بأسلوب <span className="text-[#17324D]">المواقف الحية</span>
            </h2>

            <p className="text-xs sm:text-base text-stone-600 max-w-xl mx-auto leading-relaxed">
              رفوف مرتبة بالحالات اليومية — من طلب القهوة إلى مواقف العمل والقطارات.
              مع توضيح أجناس الأسماء بالألوان وتفكيك الأفعال المنفصلة حركةً.
            </p>

            {/* Membership Status Badge */}
            <div className="pt-2 flex justify-center">
              {isEntitled ? (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-900/10 text-emerald-900 border border-emerald-800/30 text-xs font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>عضوية النادي مفعلة بالكامل</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-950/10 text-amber-950 border border-amber-800/30 text-xs font-semibold">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>وضع المعاينة المجانية (1–2 عناصر مفتوحة لكل رف)</span>
                </div>
              )}
            </div>
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
                  onClick={() => navigate(`/german-club/shelf/${shelf.slug}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default GermanClubHome;
