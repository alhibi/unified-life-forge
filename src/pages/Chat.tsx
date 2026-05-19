import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import SEO from '@/components/SEO';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/ErrorBoundary';

const ChatDrawer = lazy(() => import('@/components/ChatDrawer'));

// Skeleton matches the chat layout while the lazy chunk loads, so the
// transition from the bottom-nav tap to the chat surface stays smooth.
function ChatSkeleton() {
  return (
    <div className="flex flex-col bg-background w-full" style={{ height: '100dvh', paddingBottom: 'var(--app-bottom-inset)' }}>
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
  const [unreadCount, setUnreadCount] = useState(0);

  // Mirror the unread-badge wiring that used to live on the homepage so
  // the new dedicated page is self-contained.
  const fetchUnread = useCallback(async () => {
    if (!user) { setUnreadCount(0); return; }
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    if (!convs || convs.length === 0) { setUnreadCount(0); return; }
    const ids = convs.map(c => c.id);
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .neq('sender_id', user.id)
      .eq('read', false);
    setUnreadCount(count || 0);
  }, [user]);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 60_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('chat-page-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchUnread]);

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
          onUnreadChange={setUnreadCount}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
