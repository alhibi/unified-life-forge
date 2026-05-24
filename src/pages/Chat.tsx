import { lazy, Suspense, useCallback } from 'react';
import SEO from '@/components/SEO';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/ErrorBoundary';

const ChatDrawer = lazy(() => import('@/components/ChatDrawer'));

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
  const { language, t } = useApp();
  const isAr = language === 'ar';
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  // Singleton hook — same value (and same network cost) as BottomNav and Index.
  const { unreadCount, refresh: refreshUnread } = useUnreadMessages();

  // The drawer asks to "close" via onOpenChange(false). On the dedicated
  // page that is a router-level back-navigation — fall back to the home
  // route when there is no history (deep-linked entry).
  const handleClose = useCallback((open: boolean) => {
    if (open) return;
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  }, [navigate]);

  if (authLoading) {
    return <ChatSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4" style={{ paddingBottom: '120px' }}>
        <h1 className="text-xl font-bold text-foreground">
          {isAr ? 'سجّل الدخول للوصول إلى الدردشة' : 'Melde dich an, um zu chatten'}
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isAr
            ? 'الدردشة تتطلب حساباً لحفظ محادثاتك وإخطاراتك عبر الأجهزة.'
            : 'Für Chat brauchst du ein Konto, damit deine Nachrichten und Benachrichtigungen geräteübergreifend gesichert werden.'}
        </p>
        <Button onClick={() => navigate('/auth')} className="rounded-xl">
          {isAr ? 'تسجيل الدخول' : t('auth.signIn')}
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackTitle={isAr ? 'حدث خطأ في الدردشة' : 'Fehler im Chat'}>
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
          onUnreadChange={() => refreshUnread()}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
