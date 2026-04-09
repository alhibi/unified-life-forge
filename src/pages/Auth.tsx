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
