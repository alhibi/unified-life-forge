import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { Languages, Palette, ChevronLeft, Settings as SettingsIcon, UserCircle, LogOut, Type, BookOpen, AlertTriangle, Compass, Home, BookOpenText, Gamepad2, MapPin, Music, Calendar, Moon, Sun, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function SettingsPage() {
  const { t, theme, language, setLanguage, prayerMadhab } = useApp();
  const { user, username, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const isAr = language === 'ar';
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    toast.success(isAr ? 'تم تسجيل الخروج' : 'Abgemeldet');
  };

  const settingsItems = [
    // Account
    ...(user ? [{
      key: 'account',
      icon: UserCircle,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/12 dark:bg-blue-400/15',
      title: username || (isAr ? 'حسابي' : 'Mein Konto'),
      subtitle: isAr ? 'مسجل الدخول' : 'Angemeldet',
      onClick: () => setShowLogoutConfirm(true),
      trailing: (
        <div className="flex items-center gap-1.5 text-destructive">
          <LogOut className="w-4 h-4" />
          <span className="text-[12px] font-medium">{isAr ? 'خروج' : 'Abmelden'}</span>
        </div>
      ),
    }] : [{
      key: 'account',
      icon: UserCircle,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/12 dark:bg-blue-400/15',
      title: isAr ? 'تسجيل الدخول' : 'Anmelden',
      subtitle: isAr ? 'احفظ إعداداتك على جميع الأجهزة' : 'Einstellungen auf allen Geräten speichern',
      onClick: () => navigate('/auth'),
      trailing: (
        <ChevronLeft className="w-4.5 h-4.5 text-muted-foreground/50 ltr:rotate-180" />
      ),
    }]),
    {
      key: 'theme',
      icon: Palette,
      iconColor: 'text-violet-600 dark:text-violet-400',
      iconBg: 'bg-violet-500/12 dark:bg-violet-400/15',
      title: t('settings.theme'),
      subtitle: theme === 'dark' ? t('settings.dark') : theme === 'system' ? (isAr ? 'النظام' : 'System') : t('settings.light'),
      onClick: () => navigate('/settings/theme'),
      trailing: (
        <ChevronLeft className="w-4.5 h-4.5 text-muted-foreground/50 ltr:rotate-180" />
      ),
    },
    {
      key: 'font',
      icon: Type,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/12 dark:bg-amber-400/15',
      title: isAr ? 'الخط' : 'Schriftart',
      subtitle: isAr ? 'نوع وحجم الخط' : 'Schriftart & Größe',
      onClick: () => navigate('/settings/font'),
      trailing: (
        <ChevronLeft className="w-4.5 h-4.5 text-muted-foreground/50 ltr:rotate-180" />
      ),
    },
    {
      key: 'prayer',
      icon: BookOpen,
      iconColor: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-500/12 dark:bg-teal-400/15',
      title: isAr ? 'المذهب الفقهي' : 'Gebetsschule',
      subtitle: isAr
        ? ({ shafii: 'الشافعي', hanafi: 'الحنفي', hanbali: 'الحنبلي', maliki: 'المالكي' }[prayerMadhab])
        : ({ shafii: "Schafi'i", hanafi: 'Hanafi', hanbali: 'Hanbali', maliki: 'Maliki' }[prayerMadhab]),
      onClick: () => navigate('/settings/prayer'),
      trailing: (
        <ChevronLeft className="w-4.5 h-4.5 text-muted-foreground/50 ltr:rotate-180" />
      ),
    },
    {
      key: 'language',
      icon: Languages,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/12 dark:bg-emerald-400/15',
      title: language === 'ar' ? 'العربية' : 'Deutsch',
      subtitle: t('settings.language'),
      onClick: () => setLanguage(language === 'ar' ? 'de' : 'ar'),
      trailing: (
        <div className={`relative w-[46px] h-[26px] rounded-full transition-colors duration-300 shrink-0 ${language === 'ar' ? 'bg-primary' : 'bg-muted'}`} dir="ltr">
          <motion.div
            className="absolute top-[3px] w-[20px] h-[20px] rounded-full bg-primary-foreground shadow-sm"
            animate={{ left: language === 'ar' ? 23 : 3 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3 max-w-lg mx-auto">
        <motion.div variants={item} className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-primary stroke-[1.8]" />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">{t('settings.title')}</h1>
        </motion.div>

        {settingsItems.map((si) => (
          <motion.div key={si.key} variants={item} className="bg-card border border-border/40 rounded-2xl p-4">
            <button
              onClick={si.onClick}
              className="flex items-center justify-between w-full active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl ${si.iconBg} flex items-center justify-center`}>
                  <si.icon className={`w-5 h-5 ${si.iconColor} stroke-[1.8]`} />
                </div>
                <div className="text-start">
                  <h2 className="font-semibold text-[15px] text-foreground">{si.title}</h2>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{si.subtitle}</p>
                </div>
              </div>
              {si.trailing}
            </button>
          </motion.div>
        ))}
      </motion.div>

      {/* Logout confirmation dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  {isAr ? 'تسجيل الخروج' : 'Abmelden'}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAr 
                  ? 'سيتم مسح جميع البيانات المحلية (الإعدادات، المواقع، إحصائيات الألعاب) من هذا الجهاز. يمكنك استعادتها عند تسجيل الدخول مرة أخرى.'
                  : 'Alle lokalen Daten (Einstellungen, Standorte, Spielstatistiken) werden von diesem Gerät gelöscht. Du kannst sie beim erneuten Anmelden wiederherstellen.'}
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium active:scale-[0.98] transition-transform"
                >
                  {isAr ? 'إلغاء' : 'Abbrechen'}
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium active:scale-[0.98] transition-transform"
                >
                  {isAr ? 'تسجيل الخروج' : 'Abmelden'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
