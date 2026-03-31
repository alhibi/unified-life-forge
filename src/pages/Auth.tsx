import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCircle, Lock, ArrowRight } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { lovable } from '@/integrations/lovable/index';

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
          toast.error(isAr ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'Falscher Benutzername oder Passwort');
        } else {
          toast.success(isAr ? 'تم تسجيل الدخول بنجاح' : 'Erfolgreich angemeldet');
          navigate('/settings');
        }
      } else {
        const { error } = await signUp(username, password);
        if (error) {
          if (error.message.includes('already')) {
            toast.error(isAr ? 'اسم المستخدم مستخدم بالفعل' : 'Benutzername bereits vergeben');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success(isAr ? 'تم إنشاء الحساب بنجاح' : 'Konto erfolgreich erstellt');
          navigate('/settings');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
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

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">{isAr ? 'أو' : 'oder'}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-3"
            onClick={async () => {
              const { error } = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (error) {
                toast.error(isAr ? 'فشل تسجيل الدخول بـ Google' : 'Google-Anmeldung fehlgeschlagen');
              }
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isAr ? 'الدخول بحساب Google' : 'Mit Google anmelden'}
          </Button>

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
