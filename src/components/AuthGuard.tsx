import { motion } from 'framer-motion';
import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight,ShieldAlert } from '@/lib/icons';

/** Canonical sign-in action: signs in, then returns to the current path. */
export type AuthSignIn = () => void;

type AuthGuardFallback = React.ReactNode | ((signIn: AuthSignIn) => React.ReactNode);

interface AuthGuardProps {
  children: React.ReactNode;
  fallbackTitleAr?: string;
  fallbackDescAr?: string;
  /**
   * Replace the built-in centred signed-out card. Use it when the gated route
   * should keep its own page identity (PageShell + PageHeader + a bounded
   * card with `<StateView kind="auth" />`) instead of a full-viewport card:
   *
   *   <AuthGuard fallback={(signIn) => (
   *     <PageShell header={<PageHeader title="…" />}>
   *       <AppCard><StateView kind="auth" … action={{ label: 'تسجيل الدخول', onClick: signIn }} /></AppCard>
   *     </PageShell>
   *   )}>
   *
   * A plain node is accepted for simple overrides. The session-expiry handling
   * and the loading gate stay owned by this component either way.
   */
  fallback?: AuthGuardFallback;
}

export default function AuthGuard({
  children,
  fallbackTitleAr = 'تسجيل الدخول مطلوب',
  fallbackDescAr = 'يرجى تسجيل الدخول للوصول إلى هذا القسم ومزامنة بياناتك بأمان.',
  fallback,
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Canonical sign-in destination, including the return path. Exposed to the
  // `fallback` render prop so gated pages never hand-roll the query string.
  const signIn = useCallback<AuthSignIn>(() => {
    navigate(`/auth?next=${encodeURIComponent(window.location.pathname)}`);
  }, [navigate]);

  // Handle session expiration toast notification centrally
  useEffect(() => {
    const handleExpired = () => {
      import('sonner').then(({ toast }) => {
        toast.error(
          'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.',
          {
            id: 'auth-session-expired-toast',
            duration: 5000,
          }
        );
      });
      navigate('/auth');
    };

    window.addEventListener('auth-session-expired', handleExpired);
    return () => {
      window.removeEventListener('auth-session-expired', handleExpired);
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <p className="text-mini text-muted-foreground-subtle animate-pulse font-mono uppercase tracking-widest">
          {'تحقق من الأمان…'}
        </p>
      </div>
    );
  }

  if (!user) {
    // Page-owned gated surface: the page keeps its own identity and SEO. The
    // render prop receives the one canonical sign-in action.
    if (fallback !== undefined) {
      return <>{typeof fallback === 'function' ? fallback(signIn) : fallback}</>;
    }

    return (
      <div dir={'rtl'} className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
        <SEO
          title={'الدخول مطلوب — SmartHub'}
          description={fallbackDescAr}
          path={window.location.pathname}
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md w-full bg-card border border-border/20 rounded-2xl p-8 text-center flex flex-col items-center gap-5 relative overflow-hidden"
        >
          {/* Subtle copper accent line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-primary opacity-40" />

          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/15">
            <ShieldAlert className="w-6 h-6 text-primary" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lead font-bold text-foreground">
              {fallbackTitleAr}
            </h1>
            <p className="text-mini text-muted-foreground leading-relaxed">
              {fallbackDescAr}
            </p>
          </div>

          <button
            onClick={signIn}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-meta flex items-center justify-center gap-2"
          >
            {'تسجيل الدخول'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
