import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { ArrowRight, BookOpen, Eye, EyeOff, Lock, Shield, UserCircle, X } from '@/lib/icons';

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
  return error.message || 'حدث خطأ غير متوقع';
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
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  // Preserve the OAuth consent `next` URL so users who arrive from an
  // external MCP client return to `/.lovable/oauth/consent?...` after
  // sign-in / sign-up instead of landing on `/settings`.
  const rawNext = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : '',
  ).get('next');
  const nextTarget = (() => {
    if (!rawNext) return null;
    // Only accept same-origin relative paths.
    if (!rawNext.startsWith('/') || rawNext.startsWith('//')) return null;
    return rawNext;
  })();
  const successTarget = nextTarget ?? '/settings';
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
    // Auto-focus is a desktop courtesy, not a mobile one: on a coarse pointer
    // it pops the on-screen keyboard over the form before the person has even
    // chosen a field, hiding the password input and the submit button. Gate it
    // on a real hover/fine-pointer capability and let touch users tap.
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine) return;
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
      toast.error('كلمة المرور ضعيفة. أضف أحرفاً كبيرة أو أرقاماً أو رموزاً.');
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

  const strengthLabels: Record<number, { ar: string }> = {
    0: { ar: 'قصيرة جداً' },
    1: { ar: 'ضعيفة' },
    2: { ar: 'مقبولة' },
    3: { ar: 'قوية' },
    4: { ar: 'ممتازة' },
  };
  const strengthColors = [
    'hsl(var(--muted-foreground))',
    'hsl(var(--destructive))',
    'hsl(var(--warning))',
    'hsl(var(--primary))',
    'hsl(var(--success))',
  ];

  const canSubmit =
    !loading &&
    !success &&
    username.trim().length >= 3 &&
    password.length >= 6 &&
    (isLogin || strength >= 2);

  return (
    <div
      dir="rtl"
      className="min-h-dvh w-full bg-background text-foreground"
    >
      <SEO
        title="تسجيل الدخول — amv.life"
        description="سجّل الدخول أو أنشئ حساباً لحفظ صلواتك وقراءتك وإعداداتك على كل أجهزتك."
        path="/auth"
      />

      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--ui-workspace-max)] flex-col px-[var(--ui-gutter)] py-5">
        {/* Page identity row: the auth screen is a page, not a card in a void. */}
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              aria-hidden
            >
              <span className="h-2.5 w-2.5 rounded-full bg-primary-foreground" />
            </span>
            <span className="font-display text-title font-bold leading-none text-foreground">
              amv<span className="text-primary">.</span>life
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="إغلاق والعودة إلى البوابة"
            onClick={() => navigate('/')}
          >
            <X className="h-5 w-5 text-muted-foreground" aria-hidden />
          </Button>
        </div>

        <div className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
          {/* What the account is for. Real product truth, no fake statistics. */}
          <section aria-labelledby="auth-why" className="hidden min-w-0 lg:block">
            <h2 id="auth-why" className="type-display max-w-[22ch] text-balance text-foreground">
              يوم واحد، حساب واحد، على كل أجهزتك
            </h2>
            <p className="mt-3 max-w-[48ch] text-body leading-relaxed text-muted-foreground">
              حساب amv.life يحفظ صلواتك وتقدّم قراءتك وتفضيلاتك، ثم يعيدها لك على
              أي جهاز — بينما يبقى كل ما هو محلي على هذا الجهاز نفسه.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                {
                  icon: Lock,
                  title: 'يُحفظ تقدّمك في حسابك',
                  body: 'صلواتك وقراءتك ووردك وتفضيلات المظهر تصل معك إلى أي جهاز.',
                },
                {
                  icon: Shield,
                  title: 'خصوصية أولاً',
                  body: 'لا تُشارك بياناتك مع أحد، ويمكنك تصديرها أو حذفها من الإعدادات متى شئت.',
                },
                {
                  icon: BookOpen,
                  title: 'يعمل بلا حساب أيضاً',
                  body: 'يمكنك متابعة البوابة وكل الأدوات محلياً، ثم تسجيل الدخول عند الحاجة للمزامنة.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="row-icon shrink-0" aria-hidden>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-meta font-semibold text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-mini leading-relaxed text-muted-foreground">
                        {item.body}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Credential surface. */}
          <div className="mx-auto w-full max-w-[26rem] lg:mx-0">
            <div data-ui-surface="card" className="app-card relative overflow-hidden p-6 md:p-8">
              <div className="mb-6">
                <h1 className="text-display font-bold text-foreground">
                  {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
                </h1>
                <p className="mt-1.5 text-meta text-muted-foreground">
                  {isLogin ? 'مرحباً بعودتك — أكمل من حيث توقفت.' : 'ابدأ حساباً يحفظ يومك على كل أجهزتك.'}
                </p>
              </div>

              {!isSupabaseConfigured && (
                <div className="mb-5 rounded-md border border-warning/30 bg-warning/10 p-3 text-mini leading-relaxed text-warning">
                  {
                    'وضع محلي: الخادم غير مُهيأ، فتُحفظ حساباتك على هذا الجهاز فقط (مشفّرة) ولن تتم المزامنة.'
                  }
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Username */}
                <div>
                  <label htmlFor="auth-username" className="mb-2 block text-body font-semibold text-primary">
                    اسم المستخدم
                  </label>
                  <div className="relative">
                    <UserCircle
                      className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <input
                      ref={usernameRef}
                      id="auth-username"
                      type="text"
                      value={username}
                      onChange={(e) =>
                        setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32))
                      }
                      placeholder="أدخل اسم المستخدم"
                      className="app-control ps-9 pe-4 text-body"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="text"
                      dir="ltr"
                      disabled={loading || success}
                    />
                  </div>
                  <p className="mt-1.5 text-micro text-muted-foreground">
                    أحرف إنجليزية وأرقام فقط
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="auth-password" className="mb-2 block text-body font-semibold text-primary">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value.slice(0, 128))}
                      onKeyDown={handleKey}
                      onKeyUp={handleKey}
                      placeholder="••••••••"
                      className="app-control ps-9 pe-11 text-body"
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      dir="ltr"
                      disabled={loading || success}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute end-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {capsLock && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mt-1.5 text-micro text-warning"
                      >
                        Caps Lock مفعّل
                      </motion.p>
                    )}
                  </AnimatePresence>

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
                              className="h-1 flex-1 rounded-full transition-colors duration-normal"
                              style={{
                                backgroundColor:
                                  strength > i ? strengthColors[strength] : 'hsl(var(--muted))',
                              }}
                            />
                          ))}
                          <span
                            className="min-w-[54px] text-end text-micro font-medium"
                            style={{ color: strengthColors[strength] }}
                          >
                            {strengthLabels[strength]['ar']}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={!canSubmit}
                  isLoading={loading}
                  loadingText={isLogin ? 'جارٍ الدخول…' : 'جارٍ إنشاء الحساب…'}
                >
                  {!loading && (
                    <>
                      {isLogin ? 'دخول' : 'إنشاء الحساب'}
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 border-t border-border/60 pt-4">
                <Button
                  type="button"
                  variant="link"
                  className="min-h-11 w-full"
                  disabled={loading || success}
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setPassword('');
                  }}
                >
                  {isLogin ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب؟ تسجيل الدخول'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-1 min-h-11 w-full"
                  disabled={loading || success}
                  onClick={() => navigate('/')}
                >
                  متابعة كزائر — البوابة تعمل بدون حساب
                </Button>
              </div>

              <p className="mt-4 flex items-center justify-center gap-2 text-micro text-muted-foreground">
                <Shield className="h-3.5 w-3.5" aria-hidden />
                جميع البيانات مشفّرة ومحمية
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success flash — keeps the A→C transition visible before the route changes. */}
      <AnimatePresence>
        {success && (
          <motion.div
            className="fixed inset-0 z-overlay flex items-center justify-center bg-background/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 220 }}
              className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10"
            >
              <Shield className="h-7 w-7 text-primary" aria-hidden />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
