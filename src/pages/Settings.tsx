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
  const [showGuide, setShowGuide] = useState(false);

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

        {/* Guide Section */}
        <motion.div variants={item} className="bg-card border border-border/40 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowGuide(g => !g)}
            className="flex items-center justify-between w-full p-4 active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/12 dark:bg-sky-400/15 flex items-center justify-center">
                <Compass className="w-5 h-5 text-sky-600 dark:text-sky-400 stroke-[1.8]" />
              </div>
              <div className="text-start">
                <h2 className="font-semibold text-[15px] text-foreground">{isAr ? 'دليل التطبيق' : 'App-Anleitung'}</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">{isAr ? 'تعرّف على جميع المزايا' : 'Alle Funktionen entdecken'}</p>
              </div>
            </div>
            <motion.div animate={{ rotate: showGuide ? 180 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronDown className="w-4.5 h-4.5 text-muted-foreground/50" />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {showGuide && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  <div className="h-px bg-border/50" />
                  {[
                    { icon: Home, color: 'text-amber-500', bg: 'bg-amber-500/10', title: isAr ? 'الصفحة الرئيسية' : 'Startseite', desc: isAr ? 'تحية ذكية تتغير حسب الوقت، مع نظرة شاملة على يومك' : 'Intelligente Begrüßung je nach Tageszeit' },
                    { icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10', title: isAr ? 'التقويم المزدوج' : 'Doppelkalender', desc: isAr ? 'تقويم ميلادي وهجري معاً مع عد تنازلي لأي تاريخ وقابل للطي' : 'Gregorianischer & Hijri-Kalender mit Countdown' },
                    { icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-500/10', title: isAr ? 'مواقيت الصلاة' : 'Gebetszeiten', desc: isAr ? 'أوقات صلاة دقيقة بحسب موقعك مع عداد تنازلي للصلاة القادمة' : 'Genaue Gebetszeiten basierend auf deinem Standort' },
                    { icon: BookOpenText, color: 'text-emerald-500', bg: 'bg-emerald-500/10', title: isAr ? 'الأدعية والأحاديث' : 'Duas & Hadithe', desc: isAr ? 'مجموعة شاملة من الأدعية المأثورة والأحاديث الصحيحة مع الأربعين النووية' : 'Umfassende Sammlung von Duas und authentischen Hadithen' },
                    { icon: Music, color: 'text-rose-500', bg: 'bg-rose-500/10', title: isAr ? 'المشغل الصوتي' : 'Audioplayer', desc: isAr ? 'استمع إلى تلاوات القرآن الكريم والأذكار المسموعة' : 'Höre Quran-Rezitationen und Adhkar' },
                    { icon: MapPin, color: 'text-orange-500', bg: 'bg-orange-500/10', title: isAr ? 'حفظ المواقع' : 'Standorte speichern', desc: isAr ? 'احفظ مواقعك المفضلة وارجع إليها بسهولة في أي وقت' : 'Speichere Lieblingsorte und greife jederzeit darauf zu' },
                    { icon: Gamepad2, color: 'text-purple-500', bg: 'bg-purple-500/10', title: isAr ? 'الألعاب' : 'Spiele', desc: isAr ? 'مجموعة ألعاب ذكاء متنوعة: سودوكو، شطرنج، ألغاز وأكثر' : 'Puzzle-Spiele: Sudoku, Schach, und mehr' },
                    { icon: Palette, color: 'text-violet-500', bg: 'bg-violet-500/10', title: isAr ? 'التخصيص' : 'Anpassung', desc: isAr ? 'غيّر المظهر والخط واللغة والمذهب الفقهي حسب تفضيلاتك' : 'Passe Aussehen, Schrift, Sprache und mehr an' },
                  ].map((feature, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                      className="flex items-start gap-3"
                    >
                      <div className={`w-9 h-9 rounded-xl ${feature.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <feature.icon className={`w-4 h-4 ${feature.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[13px] font-semibold text-foreground">{feature.title}</h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{feature.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
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
