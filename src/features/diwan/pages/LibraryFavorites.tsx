import React from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppList, IconChip, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import PoemCard from '@/features/diwan/components/library/PoemCard';
import { isSupabaseReady } from '@/features/diwan/lib/env';
import { useDiwanFavoritePoems } from '@/features/diwan/lib/hooks';
import { useAuth } from '@/hooks/useAuth';
import { Heart, Loader2, LogIn } from '@/lib/icons';

/**
 * صفحة المفضّلة — ترويسة <PageHeader> قياسية مع شارة القلب، والحالات
 * كلها من النظام: قائمة <AppList>، وحالة فارغة <StateView>، ونداء
 * تسجيل الدخول ببدائية الزر/الشريحة الموحّدة.
 */
export default function LibraryFavoritesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sbReady = isSupabaseReady();
  const fav = useDiwanFavoritePoems();

  const list = fav.data ?? [];
  const showAuthCallout = !sbReady || !user;

  return (
    <PageShell>
      <SEO
        title="مفضّلتي — المكتبة الكبرى"
        description="القصائد التي حفظتَها في مفضّلتك."
        path="/diwan/library/favorites"
      />

      <PageHeader
        title="مفضّلتي الخاصة"
        subtitle={list.length > 0 ? `${list.length} قصيدة محفوظة` : undefined}
        icon={<Heart className="h-5 w-5 text-primary" fill="currentColor" aria-hidden />}
        right={<FallbackBadge />}
        backFallback="/mihrab"
      />

      {showAuthCallout ? (
        <AuthCallout sbReady={sbReady} onSignIn={() => navigate('/auth')} />
      ) : fav.isLoading ? (
        <div className="space-y-2 pt-1">
          <div className="skeleton h-16 rounded-lg" />
          <div className="skeleton h-16 rounded-lg" />
          <div className="skeleton h-16 rounded-lg" />
        </div>
      ) : list.length === 0 ? (
        <EmptyFavorites />
      ) : (
        <>
          <AppList>
            {list.map((p) => (
              <PoemCard key={p.slug} poem={p} showPoet />
            ))}
          </AppList>
          {fav.isFetching && (
            <div className="flex items-center justify-center gap-2 text-mini text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
              <span>جاري تحديث الرقوق المفضلة…</span>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}

function AuthCallout({ sbReady, onSignIn }: { sbReady: boolean; onSignIn: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <IconChip size="xl" aria-hidden>
        <Heart className="h-6 w-6" fill="currentColor" />
      </IconChip>
      <p className="mt-4 font-tajawal text-meta font-bold text-foreground">
        المفضّلة للمستخدمين المسجَّلين
      </p>
      <p className="mx-auto mt-2 max-w-xs font-tajawal text-mini leading-relaxed text-muted-foreground">
        {sbReady
          ? 'سجّل الدخول لتحفظ عيون الشعر وقصائدك المفضّلة وتعود إليها من أيّ جهاز.'
          : 'الاتصال بالخادم غير مُهيّأ في هذه النسخة، فلا تتوفّر المفضّلة الشخصية حالياً.'}
      </p>
      {sbReady && (
        <Button className="mt-6" onClick={onSignIn}>
          <LogIn className="h-4 w-4" aria-hidden />
          تسجيل الدخول للمكتبة
        </Button>
      )}
    </div>
  );
}

function EmptyFavorites() {
  return (
    <StateView
      kind="empty"
      title="مفضّلتك فارغة بعد"
      body="افتح أيّ قصيدة عظيمة ثم انقر على رمز القلب في رأس الصفحة لحفظها هنا والعودة لرقوقها متى شئت."
    />
  );
}
