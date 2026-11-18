import { lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import ErrorBoundary from '@/components/ErrorBoundary';
import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { useAuth } from '@/hooks/useAuth';
import { useSmartBack } from '@/hooks/useSmartBack';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { MessageCircle } from '@/lib/icons';

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
  const navigate = useNavigate();
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
    // Signed-out is a page, not a floating card: give it the same page
    // identity (h1) and content column every other route has, then let the
    // shared StateView grammar explain why and what to do next. The frame is
    // PageShell because this state owns no fixed composer — the signed-in
    // surface above still keeps its own full-height G5 frame.
    // The header's BackButton is the one secondary escape; it is the same
    // smart-back (fallback '/') the signed-in chat list already uses.
    return (
      <PageShell header={<PageHeader title="الدردشة" backFallback="/" />}>
        <SEO
          title="الدردشة — SmartHub"
          description={'الدردشة تتطلب حساباً لحفظ محادثاتك وإخطاراتك عبر الأجهزة.'}
          path="/chat"
        />
        <AppCard>
          <StateView
            bare
            kind="empty"
            icon={<MessageCircle className="h-5 w-5" aria-hidden />}
            title={'سجّل الدخول للوصول إلى الدردشة'}
            body={'الدردشة تتطلب حساباً لحفظ محادثاتك وإخطاراتك عبر الأجهزة.'}
            actions={
              <Button className="w-full sm:w-auto" onClick={() => navigate('/auth')}>
                {'تسجيل الدخول'}
              </Button>
            }
          />
        </AppCard>
      </PageShell>
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
