import React, { useState } from 'react';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { localHasAnyAccount } from '@/lib/auth/localAuthStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCircle, Lock, ArrowRight, Info } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Translate an auth error into a localized, actionable message.
 *
 * Covers the failure modes that all *used* to surface as a misleading
 * generic "wrong username/password": missing env vars, unconfirmed
 * emails, rate limits, network issues, and — critically for local-only
 * mode — the difference between "this username doesn't exist on this
 * device" (you need to Sign Up) and "you typed the wrong password".
 */
function describeAuthError(error: Error, isAr: boolean, mode: 'signIn' | 'signUp'): string {
  const msg = (error.message || '').toLowerCase();

  if (msg.includes('supabase_not_configured') || msg.includes('not configured')) {
    return isAr
      ? 'الخادم غير مُهيأ. يرجى تعيين متغيرات Supabase في ملف .env'
      : 'Server nicht konfiguriert. Bitte Supabase-Variablen in .env setzen.';
  }
  if (msg.includes('email_not_confirmed') || msg.includes('not confirmed')) {
    return isAr
      ? 'تأكيد البريد الإلكتروني مفعّل في إعدادات الخادم. يرجى تعطيله من إعدادات Supabase.'
      : 'E-Mail-Bestätigung ist aktiviert. Bitte in den Supabase-Einstellungen deaktivieren.';
  }
  if (msg.includes('rate') || msg.includes('too many')) {
    return isAr
      ? 'محاولات كثيرة. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.'
      : 'Zu viele Versuche. Bitte kurz warten und erneut versuchen.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return isAr
      ? 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت.'
      : 'Verbindung zum Server fehlgeschlagen. Internetverbindung prüfen.';
  }
  if (mode === 'signUp' && (msg.includes('already') || msg.includes('registered'))) {
    return isAr ? 'اسم المستخدم مستخدم بالفعل' : 'Benutzername bereits vergeben';
  }
  // Local-only "this account doesn't exist on this device" — the message
  // explicitly tells the user to switch to Sign Up because guessing
  // "wrong credentials" was the entire bug we're fixing.
  if (msg.includes('user not found')) {
    return isAr
      ? 'لا يوجد حساب بهذا الاسم على هذا الجهاز. أنشئ حساباً جديداً أولاً.'
      : 'Kein Konto mit diesem Namen auf diesem Gerät. Bitte zuerst ein Konto erstellen.';
  }
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return isAr
      ? 'كلمة المرور غير صحيحة'
      : 'Falsches Passwort';
  }
  return error.message || (isAr ? 'حدث خطأ غير متوقع' : 'Ein unerwarteter Fehler ist aufgetreten');
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function AuthPage() {
  const { language } = useApp();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Default to *Sign Up* when in local-only mode and there are no
  // accounts on this device yet. This single line fixes the headline
  // bug: previously, first-time users on a non-configured backend were
  // stuck on the Sign In form and every attempt produced "wrong
  // credentials" because they had never created an account.
  const [isLogin, setIsLogin] = useState<boolean>(() => {
    if (!isSupabaseConfigured && !localHasAnyAccount()) return false;
    return true;
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isAr = language === 'ar';
  const showLocalModeHint = !isSupabaseConfigured;
  const showFirstTimeHint = !isSupabaseConfigured && !localHasAnyAccount();

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
          // If the username doesn't exist on this device, the *only*
          // useful next step is signing up. Flip the form for them so
          // they don't have to figure that out from the error text.
          if ((error.message || '').toLowerCase().includes('user not found')) {
            setIsLogin(false);
          }
          return;
        }
        toast.success(isAr ? 'تم تسجيل الدخول بنجاح' : 'Erfolgreich angemeldet', { duration: 2000 });
        navigate('/settings');
      } else {
        const { error } = await signUp(username, password);
        if (error) {
          toast.error(describeAuthError(error, isAr, 'signUp'), { duration: 5000 });
          return;
        }
        toast.success(isAr ? 'تم إنشاء الحساب بنجاح' : 'Konto erfolgreich erstellt');
        navigate('/settings');
      }
    } finally {
      setLoading(false);
    }
  };

  // Title reflects the current mode, not just the page name.
  const headingText = isLogin
    ? (isAr ? 'تسجيل الدخول' : 'Anmelden')
    : (isAr ? 'إنشاء حساب' : 'Konto erstellen');

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
            {headingText}
          </h1>
        </motion.div>

        <motion.div variants={item} className="premium-card-elevated p-5">
          {showFirstTimeHint && (
            <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-[13px] leading-relaxed text-primary-foreground/90 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <span>
                {isAr
                  ? 'مرحباً 👋 لا يوجد حساب على هذا الجهاز بعد. أنشئ حساباً أولاً ثم سجّل الدخول.'
                  : 'Willkommen 👋 Auf diesem Gerät existiert noch kein Konto. Erstelle zuerst eines und melde dich dann an.'}
              </span>
            </div>
          )}
          {showLocalModeHint && (
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
