import React from 'react';
import { useNavigate } from 'react-router-dom';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import PoemCard from '@/features/diwan/components/library/PoemCard';
import { isSupabaseReady } from '@/features/diwan/lib/env';
import { useDiwanFavoritePoems } from '@/features/diwan/lib/hooks';
import { useAuth } from '@/hooks/useAuth';
import { Heart, Loader2, LogIn } from '@/lib/icons';

/**
 * صفحة المفضّلة — مصممة بالكامل بنمط "المخطوطة" (Manuscript).
 * تعرض القصائد التي اختارها وحفظها المستخدم من دواوين العرب.
 */
export default function LibraryFavoritesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sbReady = isSupabaseReady();
  const fav = useDiwanFavoritePoems();

  const list = fav.data ?? [];
  const showAuthCallout = !sbReady || !user;

  return (
    <div className="min-h-screen bg-[#16130F] text-[#F2E9D8] pb-page px-5 pt-14 font-tajawal selection:bg-[var(--wax-soft2)] selection:text-[#F2E9D8]">
      <SEO
        title="مفضّلتي — المكتبة الكبرى"
        description="القصائد التي حفظتَها في مفضّلتك."
        path="/diwan/library/favorites"
      />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="mt-1 shrink-0">
            <BackButton
              fallback="/mihrab"
              className="w-10 h-10 rounded-full border border-[var(--hairline-strong)] bg-[#1D1811] flex items-center justify-center text-[#B8AA8E] hover:text-[#F2E9D8] hover:border-[#B8AA8E] active:scale-95 transition-all"
            />
          </div>
          <div className="flex-1 min-w-0">
            {/* عنوان علوي صغير بلون wax */}
            <p className="text-[11px] font-bold tracking-[0.1em] text-[var(--wax)] uppercase mb-1">
              محراب · الأدب
            </p>
            <h1 className="text-[24px] font-bold tracking-tight text-[#F2E9D8] leading-tight font-amiri flex items-center gap-2">
              <Heart className="w-6 h-6 text-[var(--wax)] shrink-0" fill="currentColor" />
              مفضّلتي الخاصة
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <p className="text-[12px] text-[#B8AA8E]">
                {list.length > 0 && `${list.length} قصيدة محفوظة`}
              </p>
              <FallbackBadge />
            </div>
          </div>
        </div>

        {showAuthCallout ? (
          <AuthCallout sbReady={sbReady} onSignIn={() => navigate('/auth')} />
        ) : fav.isLoading ? (
          <div className="space-y-4 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="py-4 border-b border-[var(--hairline)]">
                <div className="h-4 bg-[rgba(242,233,216,0.08)] rounded w-1/4 animate-pulse mb-2" />
                <div className="h-3 bg-[rgba(242,233,216,0.05)] rounded w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyFavorites />
        ) : (
          <div className="flex flex-col">
            {list.map((p, i) => (
              <PoemCard key={p.slug} poem={p} showPoet index={i} />
            ))}
            {fav.isFetching && (
              <div className="flex items-center justify-center gap-2 py-4 text-[#7E7259] text-[12px]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--wax)]" />
                <span>جاري تحديث الرقوق المفضلة…</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AuthCallout({ sbReady, onSignIn }: { sbReady: boolean; onSignIn: () => void }) {
  return (
    <div className="text-center py-16 px-6 flex flex-col items-center justify-center">
      <div
        className="w-[64px] h-[64px] rounded-full flex items-center justify-center mb-4"
        style={{ background: 'hsl(var(--primary))' }}
      >
        <span className="font-amiri font-bold text-[24px] text-[#F5DFC9] leading-none select-none">
          ♥
        </span>
      </div>
      <p className="text-[15px] font-bold text-[#F2E9D8] font-tajawal">
        المفضّلة للمستخدمين المسجَّلين
      </p>
      <p className="text-[12px] text-[#B8AA8E] mt-2 max-w-xs mx-auto leading-relaxed font-tajawal">
        {sbReady
          ? 'سجّل الدخول لتحفظ عيون الشعر وقصائدك المفضّلة وتعود إليها من أيّ جهاز.'
          : 'الاتصال بالخادم غير مُهيّأ في هذه النسخة، فلا تتوفّر المفضّلة الشخصية حالياً.'}
      </p>
      {sbReady && (
        <button
          onClick={onSignIn}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#1D1811] border border-[var(--hairline-strong)] hover:border-[#B8AA8E] text-[#B8AA8E] hover:text-[#F2E9D8] text-[13px] font-bold active:scale-[0.98] transition-all"
        >
          <LogIn className="w-4 h-4 text-[var(--wax)]" />
          تسجيل الدخول للمكتبة
        </button>
      )}
    </div>
  );
}

function EmptyFavorites() {
  return (
    <div className="text-center py-16 px-6 flex flex-col items-center justify-center">
      <span className="font-amiri text-[28px] text-[var(--wax)] mb-3 animate-pulse select-none">
        ✦
      </span>
      <p className="text-[15px] font-bold text-[#F2E9D8] font-tajawal">مفضّلتك فارغة بعد</p>
      <p className="text-[12px] text-[#B8AA8E] mt-2 max-w-xs mx-auto leading-relaxed font-tajawal">
        افتح أيّ قصيدة عظيمة ثم انقر على رمز القلب في رأس الصفحة لحفظها هنا والعودة لرقوقها متى شئت.
      </p>
    </div>
  );
}
