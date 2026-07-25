import React, { useEffect, useMemo, useRef, useState } from 'react';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { UserCircle, Lock, ArrowRight, Eye, EyeOff, Shield, X } from '@/lib/icons';
import { toast } from 'sonner';

/**
 * Translate a Supabase auth error into a localized, actionable message.
 * Covers the specific failure modes that all *used* to surface as a
 * misleading "wrong username/password": missing env vars, unconfirmed
 * emails, rate limits, and network issues.
 */
function describeAuthError(error: Error, mode: 'signIn' | 'signUp'): string {
  const msg = (error.message || '').toLowerCase();

  // 1. Supabase not configured → noopFetch returns this exact code.
  if (msg.includes('supabase_not_configured') || msg.includes('not configured')) {
    return 'الخادم غير مُهيأ. يرجى تعيين متغيرات Supabase في ملف .env';
  }

  // 2. Email confirmation required (the @smartapp.local domain can never receive mail).
  if (msg.includes('email_not_confirmed') || msg.includes('not confirmed')) {
    return 'تأكيد البريد الإلكتروني مفعّل في إعدادات الخادم. يرجى تعطيله من إعدادات Supabase.';
  }

  // 3. Rate limiting.
  if (msg.includes('rate') || msg.includes('too many')) {
    return 'محاولات كثيرة. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
  }

  // 4. Network / fetch failure.
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت.';
  }

  // 5. Username already taken (signup only).
  if (mode === 'signUp' && (msg.includes('already') || msg.includes('registered'))) {
    return 'اسم المستخدم مستخدم بالفعل';
  }

  // 6. Genuine bad credentials.
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return 'اسم المستخدم أو كلمة المرور غير صحيحة';
  }

  // 7. Fallback: surface the raw message so we never silently mislead the user again.
  return error.message || ('حدث خطأ غير متوقع');
}


/**
 * Password strength scoring (0..4).
 *   0  empty / trivially short
 *   1  weak       - one class only
 *   2  fair       - two classes
 *   3  strong     - three classes + length >= 10
 *   4  excellent  - all classes + length >= 12
 */
function scorePassword(pw: string): number {
  if (!pw) return 0;
  const len = pw.length;
  if (len < 6) return 0;
  let classes = 0;
  if (/[a-z]/.test(pw)) classes++;
  if (/[A-Z]/.test(pw)) classes++;
  if (/\d/.test(pw)) classes++;
  if (/[^A-Za-z0-9]/.test(pw)) classes++;
  if (classes <= 1) return 1;
  if (classes === 2) return 2;
  if (classes >= 3 && len >= 12) return 4;
  if (classes >= 3 && len >= 10) return 3;
  return 2;
}

export default function AuthPage() {
  const { } = useApp();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  // Preserve the OAuth consent `next` URL so users who arrive from an
  // external MCP client return to `/.lovable/oauth/consent?...` after
  // sign-in / sign-up instead of landing on `/settings`.
  const rawNext = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  ).get("next");
  const nextTarget = (() => {
    if (!rawNext) return null;
    // Only accept same-origin relative paths.
    if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
    return rawNext;
  })();
  const successTarget = nextTarget ?? "/settings";
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const submittingRef = useRef(false);
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const strength = useMemo(() => scorePassword(password), [password]);

  useEffect(() => {
    // Auto-focus on mount and when switching between login/signup for a
    // smoother first interaction.
    const t = window.setTimeout(() => usernameRef.current?.focus(), 250);
    return () => window.clearTimeout(t);
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Hard-guard against duplicate submissions (double-tap, Enter spam).
    if (submittingRef.current || loading || success) return;
    if (!username.trim() || !password.trim()) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    if (username.trim().length < 3) {
      toast.error('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    if (password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    // Extra strength requirement on signup only — HIBP is enforced by the
    // backend, so we only block obviously weak choices client-side to avoid
    // an unhelpful round-trip.
    if (!isLogin && strength < 2) {
      toast.error(
        'كلمة المرور ضعيفة. أضف أحرفاً كبيرة أو أرقاماً أو رموزاً.',
      );
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(username, password);
        if (error) {
          toast.error(describeAuthError(error, 'signIn'), { duration: 5000 });
        } else {
          setSuccess(true);
          toast.success('تم تسجيل الدخول بنجاح', { duration: 1500 });
          // Small delay so the cinematic success flash is visible before
          // the route change tears the screen down.
          window.setTimeout(() => navigate(successTarget), 550);
        }
      } else {
        const { error } = await signUp(username, password);
        if (error) {
          toast.error(describeAuthError(error, 'signUp'), { duration: 5000 });
        } else {
          setSuccess(true);
          toast.success('تم إنشاء الحساب بنجاح', { duration: 1500 });
          window.setTimeout(() => navigate(successTarget), 550);
        }
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Best-effort Caps Lock hint for password field.
    const s = (e as any).getModifierState?.('CapsLock');
    if (typeof s === 'boolean') setCapsLock(s);
  };

  const strengthLabels: Record<number, { ar: string; }> = {
    0: { ar: 'قصيرة جداً', },
    1: { ar: 'ضعيفة', },
    2: { ar: 'مقبولة', },
    3: { ar: 'قوية', },
    4: { ar: 'ممتازة', },
  };
  const strengthColors = ['#3f3f46', '#ef4444', '#f59e0b', '#c78a4e', '#22c55e'];

  const canSubmit =
    !loading && !success &&
    username.trim().length >= 3 &&
    password.length >= 6 &&
    (isLogin || strength >= 2);

  return (
    <div
      dir={'rtl'}
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: '#0f0f11' }}
    >
      <SEO
        title="تسجيل الدخول — SmartHub"
        description="تسجيل الدخول أو إنشاء حساب للوصول إلى المزامنة السحابية والإعدادات الشخصية."
        path="/auth"
      />

      {/* Close / back-to-home affordance - 44x44px target size */}
      <button
        type="button"
        aria-label={'إغلاق'}
        onClick={() => navigate('/')}
        className="absolute top-6 start-6 w-11 h-11 rounded-full flex items-center justify-center border border-white/5 hover:border-[#c78a4e]/40 transition-colors z-20"
        style={{ backgroundColor: '#1a1a1e' }}
      >
        <X className="w-4 h-4" style={{ color: '#9ca3af' }} />
      </button>

      {/* Ambient cinematic backdrop — breathing copper halos */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full blur-[120px]"
        style={{ backgroundColor: 'rgba(199, 138, 78, 0.18)' }}
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full blur-[120px]"
        style={{ backgroundColor: 'rgba(199, 138, 78, 0.10)' }}
        animate={{ opacity: [0.4, 0.75, 0.4], scale: [1, 1.08, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
      />

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Soft outer glow */}
        <div
          aria-hidden
          className="absolute -inset-1 rounded-3xl blur-2xl opacity-30"
          style={{ backgroundColor: '#c78a4e' }}
        />

        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl border"
          style={{ backgroundColor: '#1a1a1e', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {/* Top accent bar */}
          <div
            className="h-1.5 w-full"
            style={{
              backgroundColor: '#c78a4e',
              boxShadow: '0 0 15px rgba(199,138,78,0.35)',
            }}
          />

          {/* Success flash overlay */}
          <AnimatePresence>
            {success && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center z-10"
                style={{ backgroundColor: 'rgba(15,15,17,0.85)', backdropFilter: 'blur(4px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 220 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(199,138,78,0.15)', border: '1px solid #c78a4e' }}
                >
                  <Shield className="w-7 h-7" style={{ color: '#c78a4e' }} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-8 md:p-10">
            {/* Header */}
            <div className="mb-8 text-center">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={isLogin ? 'in' : 'up'}
                  className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {isLogin
                    ? ('تسجيل الدخول')
                    : ('إنشاء حساب')}
                </motion.h1>
              </AnimatePresence>
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                {isLogin
                  ? ('مرحباً بك مجدداً')
                  : ('ابدأ رحلتك في SmartHub')}
              </p>
            </div>

            {!isSupabaseConfigured && (
              <div
                className="mb-5 rounded-xl border p-3 text-[12px] leading-relaxed"
                style={{
                  borderColor: 'rgba(245, 158, 11, 0.30)',
                  backgroundColor: 'rgba(245, 158, 11, 0.10)',
                  color: '#fde68a',
                }}
              >
                {'وضع محلي: الخادم غير مُهيأ، فتُحفظ حساباتك على هذا الجهاز فقط (مشفّرة) ولن تتم المزامنة.'}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Username */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: '#c78a4e' }}
                >
                  {'اسم المستخدم'}
                </label>
                <div className="relative group">
                  <UserCircle
                    className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: '#6b7280' }}
                  />
                  <input
                    ref={usernameRef}
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32))
                    }
                    placeholder={'أدخل اسم المستخدم'}
                    className="w-full text-white border border-transparent focus:outline-none py-3.5 ps-9 pe-4 rounded-xl transition-all duration-300 placeholder:text-gray-600"
                    style={{ backgroundColor: '#2a2a2e', fontSize: 16 }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(199,138,78,0.5)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'transparent')}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="text"
                    dir="ltr"
                    disabled={loading || success}
                    aria-label={'اسم المستخدم'}
                  />
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: '#6b7280' }}>
                  {'أحرف إنجليزية وأرقام فقط'}
                </p>
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: '#c78a4e' }}
                >
                  {'كلمة المرور'}
                </label>
                <div className="relative group">
                  <Lock
                    className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: '#6b7280' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.slice(0, 128))}
                    onKeyDown={handleKey}
                    onKeyUp={handleKey}
                    placeholder={'••••••••'}
                    className="w-full text-white border border-transparent focus:outline-none py-3.5 ps-9 pe-11 rounded-xl transition-all duration-300 placeholder:text-gray-600"
                    style={{ backgroundColor: '#2a2a2e', fontSize: 16 }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(199,138,78,0.5)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'transparent')}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    dir="ltr"
                    disabled={loading || success}
                    aria-label={'كلمة المرور'}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute end-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                    aria-label={
                      showPassword
                        ? ('إخفاء كلمة المرور')
                        : ('إظهار كلمة المرور')
                    }
                  >
                    {showPassword
                      ? <EyeOff className="w-4 h-4" style={{ color: '#9ca3af' }} />
                      : <Eye className="w-4 h-4" style={{ color: '#9ca3af' }} />}
                  </button>
                </div>

                {/* Caps Lock indicator */}
                <AnimatePresence>
                  {capsLock && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-[11px] mt-1.5"
                      style={{ color: '#f59e0b' }}
                    >
                      {'Caps Lock مفعّل'}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Strength meter — signup only */}
                <AnimatePresence>
                  {!isLogin && password.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 flex items-center gap-1.5">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-colors duration-300"
                            style={{
                              backgroundColor:
                                strength > i ? strengthColors[strength] : '#2a2a2e',
                            }}
                          />
                        ))}
                        <span
                          className="text-[10px] font-medium min-w-[54px] text-end"
                          style={{ color: strengthColors[strength] }}
                        >
                          {strengthLabels[strength]['ar']}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="relative w-full font-bold py-4 rounded-xl overflow-hidden transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] mt-2"
                style={{
                  backgroundColor: '#c78a4e',
                  color: '#0f0f11',
                  boxShadow: '0 10px 30px -12px rgba(199,138,78,0.5)',
                }}
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  {loading ? (
                    <span
                      className="animate-spin w-4 h-4 border-2 rounded-full"
                      style={{
                        borderColor: 'rgba(15,15,17,0.35)',
                        borderTopColor: '#0f0f11',
                      }}
                    />
                  ) : (
                    <>
                      {isLogin
                        ? ('دخول')
                        : ('إنشاء الحساب')}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Toggle mode */}
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => {
                  if (loading || success) return;
                  setIsLogin(!isLogin);
                  setPassword('');
                }}
                className="text-sm transition-colors"
                style={{ color: '#9ca3af' }}
              >
                {isLogin
                  ? ('ليس لديك حساب؟ ')
                  : ('لديك حساب؟ ')}
                <span
                  className="font-semibold"
                  style={{ color: '#c78a4e', textDecoration: 'underline', textUnderlineOffset: 4 }}
                >
                  {isLogin
                    ? ('إنشاء حساب جديد')
                    : ('تسجيل الدخول')}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Privacy caption */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px]" style={{ color: '#6b7280' }}>
          <Shield className="w-3 h-3" />
          <span>
            {'جميع البيانات مشفرة ومحمية'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
