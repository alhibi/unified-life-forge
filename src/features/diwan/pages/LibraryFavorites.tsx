import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Loader2, LogIn, ScrollText } from '@/lib/icons';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import PoemCard from '@/features/diwan/components/library/PoemCard';
import { useDiwanFavoritePoems } from '@/features/diwan/lib/hooks';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseReady } from '@/features/diwan/lib/env';

/**
 * صفحة المفضّلة. تعتمد فعلياً على Supabase + auth — لا fallback محلّي
 * لأنّ المفضّلة شخصية للمستخدم بطبعها.
 *
 * ثلاث حالات:
 *   1. لا Supabase أو لا تسجيل دخول → دعوة لتسجيل الدخول
 *   2. تحميل / لا قصائد → رسالة فارغة
 *   3. قصائد → قائمة PoemCards مع بادج زمن الإضافة
 */
export default function LibraryFavoritesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sbReady = isSupabaseReady();
  const fav = useDiwanFavoritePoems();

  const list = fav.data ?? [];

  const showAuthCallout = !sbReady || !user;

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO
        title="مفضّلتي — المكتبة الكبرى"
        description="القصائد التي حفظتَها في مفضّلتك."
        path="/diwan/library/favorites"
      />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <BackButton fallback="/mihrab" />
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-bold tracking-tight text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" fill="currentColor" />
              مفضّلتي
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-[11px] text-muted-foreground">
                {list.length > 0 && `${list.length} قصيدة`}
              </p>
              <FallbackBadge />
            </div>
          </div>
        </div>

        {showAuthCallout ? (
          <AuthCallout
            sbReady={sbReady}
            onSignIn={() => navigate('/auth')}
          />
        ) : fav.isLoading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyFavorites />
        ) : (
          <div className="space-y-2.5">
            {list.map((p, i) => (
              <PoemCard key={p.slug} poem={p} showPoet index={i} />
            ))}
            {fav.isFetching && (
              <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground text-[11px]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جارِ التحديث…</span>
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
    <div className="text-center py-12 px-6">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
        <Heart className="w-6 h-6 text-rose-500" />
      </div>
      <p className="text-[14px] font-semibold text-foreground">
        المفضّلة للمستخدمين المسجَّلين
      </p>
      <p className="text-[11px] text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
        {sbReady
          ? 'سجّل الدخول لتحفظ قصائدك المفضّلة وتعود إليها من أيّ جهاز.'
          : 'الاتصال بالخادم غير مُهيّأ في هذه النسخة، فلا تتوفّر المفضّلة الشخصية.'}
      </p>
      {sbReady && (
        <button
          onClick={onSignIn}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-background text-[13px] font-semibold active:scale-[0.98] transition"
        >
          <LogIn className="w-4 h-4" />
          تسجيل الدخول
        </button>
      )}
    </div>
  );
}

function EmptyFavorites() {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
        <ScrollText className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-[14px] font-semibold text-foreground">
        مفضّلتك فارغة بعد
      </p>
      <p className="text-[11px] text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
        افتح أيّ قصيدة ثم اضغط أيقونة القلب في رأس الصفحة لإضافتها هنا.
      </p>
    </div>
  );
}
