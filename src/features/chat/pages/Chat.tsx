import { lazy, Suspense, useCallback } from 'react';

import ErrorBoundary from '@/components/ErrorBoundary';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { useSmartBack } from '@/hooks/useSmartBack';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Bell, Mic, ShieldCheck, Users } from '@/lib/icons';

import ChatSignedOutSurface from '../components/ChatSignedOut';

const ChatDrawer = lazy(() => import('@/features/chat/components/ChatDrawer'));

// Skeleton matches the chat layout while the lazy chunk loads, so the
// transition from the bottom-nav tap to the chat surface stays smooth.
function ChatSkeleton() {
  return (
    <div className="flex flex-col bg-background w-full" style={{ height: '100dvh', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }}>
      <div className="h-14 border-b border-border/20 px-4 flex items-center gap-3">
        <div className="skeleton h-9 w-9 rounded-full" />
        <div className="skeleton h-5 w-32 rounded-md" />
      </div>
      <div className="flex-1 px-3 py-3 space-y-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <div className="skeleton h-12 w-12 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3 rounded-md" />
              <div className="skeleton h-3 w-1/2 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  // Singleton hook — same value (and same network cost) as BottomNav and Index.
  const { unreadCount, refresh: refreshUnread } = useUnreadMessages();
  const handleUnreadChange = useCallback(() => {
    refreshUnread();
  }, [refreshUnread]);

  // The drawer asks to "close" via onOpenChange(false). On the dedicated
  // page that is a router-level back-navigation — `useSmartBack` handles
  // the deep-link case (no in-app history) by replacing into '/'.
  const goBack = useSmartBack('/');
  const handleClose = useCallback((open: boolean) => {
    if (open) return;
    goBack();
  }, [goBack]);

  if (authLoading) {
    return <ChatSkeleton />;
  }

  if (!user) {
    // Signed-out is the first screen of this domain, so it is composed as a
    // product surface (identity, value, actions) instead of one card floating
    // in an empty page. The guest action leads back to the portal because the
    // rest of the app remains usable without an account.
    return (
      <>
        <SEO
          title="الدردشة — SmartHub"
          description={'الدردشة تتطلب حساباً لحفظ محادثاتك وإخطاراتك عبر الأجهزة.'}
          path="/chat"
        />
        <ChatSignedOutSurface
          title="الدردشة"
          subtitle="محادثاتك داخل التطبيق — من حساب واحد"
          backFallback="/"
          heroTitle="رسائلك تبقى بينك وبين من تكتب له"
          heroBody="هذه هي مساحة التواصل في SmartHub: محادثات فردية ومجموعات وقنوات، بصور وملاحظات صوتية وبحث داخل المحادثة. يلزم حساب لحفظها ومزامنتها."
          points={[
            {
              icon: <Users aria-hidden />,
              title: 'محادثات فردية ومجموعات وقنوات',
              body: 'نقاش شخصي أو جماعي مع أدوار للمشرفين، وقنوات للبثّ لمتابعيك.',
            },
            {
              icon: <Mic aria-hidden />,
              title: 'صور وملاحظات صوتية وملفات',
              body: 'أرسل ما تحتاجه، مع بحث داخل المحادثة وتثبيت وأرشفة.',
            },
            {
              icon: <ShieldCheck aria-hidden />,
              title: 'خصوصية تحت سيطرتك',
              body: 'آخر ظهور وإيصالات القراءة وحظر المستخدمين، ورسائل يمكن أن تختفي بعد قراءتها.',
            },
            {
              icon: <Bell aria-hidden />,
              title: 'يبقى معك على أجهزتك',
              body: 'محادثاتك وإعداداتك تُحفظ في حسابك، فلا تبدأ من الصفر على جهاز جديد.',
            },
          ]}
          signInLabel="تسجيل الدخول"
          guestLabel="استكشف دون حساب"
          guestTo="/"
          footnote="يمكنك تصفّح البوابة والألعاب والقراءة دون حساب — الدردشة وحدها تحتاج دخولاً. لا تُرسل رسالة من جهاز لا تملكه."
        />
      </>
    );
  }

  return (
    <ErrorBoundary fallbackTitle={'حدث خطأ في الدردشة'}>
      <SEO title="المحادثات — SmartHub" description="دردشة آمنة بين الأصدقاء داخل SmartHub مع صور وملاحظات صوتية وتشفير للجلسة." path="/chat" />
      <Suspense fallback={<ChatSkeleton />}>
        <ChatDrawer
          inline
          open
          onOpenChange={handleClose}
          unreadCount={unreadCount}
          // The drawer fires onUnreadChange when it marks messages read;
          // realtime UPDATE will already pick that up, but we also poke
          // the singleton for an instant refresh so the badge updates
          // without waiting for the 800ms debounce.
          onUnreadChange={handleUnreadChange}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
