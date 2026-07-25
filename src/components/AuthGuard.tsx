import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { ShieldAlert, ArrowRight } from '@/lib/icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '@/components/SEO';

interface AuthGuardProps {
  children: React.ReactNode;
  fallbackTitleAr?: string;
  fallbackDescAr?: string;
}

export default function AuthGuard({
  children,
  fallbackTitleAr = 'تسجيل الدخول مطلوب',
  fallbackDescAr = 'يرجى تسجيل الدخول للوصول إلى هذا القسم ومزامنة بياناتك بأمان.',
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const { } = useApp();
  const navigate = useNavigate();

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
        <p className="text-xs text-muted-foreground/60 animate-pulse font-mono uppercase tracking-widest">
          {'تحقق من الأمان…'}
        </p>
      </div>
    );
  }

  if (!user) {
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
          className="max-w-md w-full bg-card/60 border border-border/10 rounded-2xl p-8 text-center flex flex-col items-center gap-5 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle copper accent line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-[#c78a4e] opacity-40" />

          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/15">
            <ShieldAlert className="w-6 h-6 text-primary" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-foreground">
              {fallbackTitleAr}
            </h1>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              {fallbackDescAr}
            </p>
          </div>

          <button
            onClick={() => navigate(`/auth?next=${encodeURIComponent(window.location.pathname)}`)}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-primary/15"
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
