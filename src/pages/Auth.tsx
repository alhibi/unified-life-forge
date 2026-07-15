import React, { useState } from 'react';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCircle, Lock, ArrowRight } from '@/lib/icons';
import BackButton from '@/components/BackButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Translate a Supabase auth error into a localized, actionable message.
 * Covers the specific failure modes that all *used* to surface as a
 * misleading "wrong username/password": missing env vars, unconfirmed
 * emails, rate limits, and network issues.
 */
function describeAuthError(error: Error, isAr: boolean, mode: 'signIn' | 'signUp'): string {
  const msg = (error.message || '').toLowerCase();

  // 1. Supabase not configured → noopFetch returns this exact code.
  if (msg.includes('supabase_not_configured') || msg.includes('not configured')) {
    return isAr
      ? 'الخادم غير مُهيأ. يرجى تعيين متغيرات Supabase في ملف .env'
      : 'Server nicht konfiguriert. Bitte Supabase-Variablen in .env setzen.';
  }

  // 2. Email confirmation required (the @smartapp.local domain can never receive mail).
  if (msg.includes('email_not_confirmed') || msg.includes('not confirmed')) {
    return isAr
      ? 'تأكيد البريد الإلكتروني مفعّل في إعدادات الخادم. يرجى تعطيله من إعدادات Supabase.'
      : 'E-Mail-Bestätigung ist aktiviert. Bitte in den Supabase-Einstellungen deaktivieren.';
  }

  // 3. Rate limiting.
  if (msg.includes('rate') || msg.includes('too many')) {
    return isAr
      ? 'محاولات كثيرة. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.'
      : 'Zu viele Versuche. Bitte kurz warten und erneut versuchen.';
  }

  // 4. Network / fetch failure.
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return isAr
      ? 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت.'
      : 'Verbindung zum Server fehlgeschlagen. Internetverbindung prüfen.';
  }

  // 5. Username already taken (signup only).
  if (mode === 'signUp' && (msg.includes('already') || msg.includes('registered'))) {
    return isAr ? 'اسم المستخدم مستخدم بالفعل' : 'Benutzername bereits vergeben';
  }

  // 6. Genuine bad credentials.
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return isAr
      ? 'اسم المستخدم أو كلمة المرور غير صحيحة'
      : 'Falscher Benutzername oder Passwort';
  }

  // 7. Fallback: surface the raw message so we never silently mislead the user again.
  return error.message || (isAr ? 'حدث خطأ غير متوقع' : 'Ein unerwarteter Fehler ist aufgetreten');
}


import { pageStagger as stagger, pageItem as item } from '@/lib/motion';

export default function AuthPage() {
  const { language } = useApp();
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
  const [loading, setLoading] = useState(false);

  const isAr = language === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error(isAr ? 'يرجى ملء جميع الحقول' : 'Bitte alle Felder ausfüllen');
      return;
    }
    if (username.trim().length < 3) {
      toast.error(isAr ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : 'Benutzername muss mindestens 3 Zeichen lang sein');
      return;
    }
    if (password.length < 6) {
      toast.error(isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(username, password);
        if (error) {
          toast.error(describeAuthError(error, isAr, 'signIn'), { duration: 5000 });
        } else {
          toast.success(isAr ? 'تم تسجيل الدخول بنجاح' : 'Erfolgreich angemeldet', { duration: 2000 });
          navigate(successTarget);
        }
      } else {
        const { error } = await signUp(username, password);
        if (error) {
          toast.error(describeAuthError(error, isAr, 'signUp'), { duration: 5000 });
        } else {
          toast.success(isAr ? 'تم إنشاء الحساب بنجاح' : 'Konto erfolgreich erstellt');
          navigate(successTarget);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO title="تسجيل الدخول — SmartHub" description="تسجيل الدخول أو إنشاء حساب للوصول إلى المزامنة السحابية والإعدادات الشخصية." path="/auth" />
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-lg mx-auto">
        <motion.div variants={item} className="flex items-center gap-3 mb-2">
          <BackButton to="/settings" />
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-primary stroke-[1.8]" />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            {isLogin ? (isAr ? 'تسجيل الدخول' : 'Anmelden') : (isAr ? 'إنشاء حساب' : 'Konto erstellen')}
          </h1>
        </motion.div>

        <motion.div variants={item} className="premium-card-elevated p-5">
          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] leading-relaxed text-amber-200">
              {isAr
                ? 'وضع محلي: الخادم غير مُهيأ، فتُحفظ حساباتك على هذا الجهاز فقط (مشفّرة) ولن تتم المزامنة. لتفعيل المزامنة عبر الأجهزة، عيّن متغيرات Supabase في ملف .env.'
                : 'Lokaler Modus: Der Server ist nicht konfiguriert, deine Konten werden nur auf diesem Gerät verschlüsselt gespeichert (keine Synchronisierung). Setze Supabase-Variablen in .env, um die Geräte-Synchronisierung zu aktivieren.'}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {isAr ? 'اسم المستخدم' : 'Benutzername'}
              </label>
              <div className="relative">
                <UserCircle className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder={isAr ? 'أدخل اسم المستخدم' : 'Benutzername eingeben'}
                  className="ps-9"
                  autoComplete="username"
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isAr ? 'أحرف إنجليزية وأرقام فقط' : 'Nur englische Buchstaben und Zahlen'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {isAr ? 'كلمة المرور' : 'Passwort'}
              </label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isAr ? 'أدخل كلمة المرور' : 'Passwort eingeben'}
                  className="ps-9"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  dir="ltr"
                />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
              ) : (
                <>
                  {isLogin ? (isAr ? 'دخول' : 'Anmelden') : (isAr ? 'إنشاء' : 'Erstellen')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary font-medium"
            >
              {isLogin
                ? (isAr ? 'ليس لديك حساب؟ أنشئ واحداً' : 'Kein Konto? Jetzt erstellen')
                : (isAr ? 'لديك حساب؟ سجل دخولك' : 'Schon ein Konto? Anmelden')}
            </button>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <p className="text-[11px] text-muted-foreground/60 text-center">
            {isAr ? 'جميع البيانات مشفرة ومحمية' : 'Alle Daten sind verschlüsselt und geschützt'} 🔒
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
