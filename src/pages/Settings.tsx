import React, { useState } from 'react';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { useAuth } from '@/hooks/useAuth';
import { Languages, Palette, ChevronLeft, UserCircle, LogOut, Type, BookOpen, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import packageJson from '../../package.json';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function SettingsPage() {
  const { t, theme, language, setLanguage, prayerMadhab } = useApp();
  const { user, username, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const isAr = language === 'ar';
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    toast.success(isAr ? 'تم تسجيل الخروج' : 'Abgemeldet');
  };

  const themeLabel = theme === 'dark' ? t('settings.dark') : t('settings.light');
  const madhabLabel = isAr
    ? ({ shafii: 'الشافعي', hanafi: 'الحنفي', hanbali: 'الحنبلي', maliki: 'المالكي' }[prayerMadhab])
    : ({ shafii: "Schafi'i", hanafi: 'Hanafi', hanbali: 'Hanbali', maliki: 'Maliki' }[prayerMadhab]);

  // Grouped settings
  const appearanceItems = [
    {
      key: 'theme',
      icon: Palette,
      title: t('settings.theme'),
      value: themeLabel,
      onClick: () => navigate('/settings/theme'),
    },
    {
      key: 'font',
      icon: Type,
      title: isAr ? 'الخط' : 'Schriftart',
      value: isAr ? 'نوع وحجم' : 'Art & Größe',
      onClick: () => navigate('/settings/font'),
    },
  ];

  const prayerItems = [
    {
      key: 'prayer',
      icon: BookOpen,
      title: isAr ? 'المذهب الفقهي' : 'Gebetsschule',
      value: madhabLabel,
      onClick: () => navigate('/settings/prayer'),
    },
  ];

  const generalItems: Array<{ key: string; icon: any; title: string; value: string; onClick: () => void; isToggle?: boolean }> = [
    {
      key: 'language',
      icon: Languages,
      title: t('settings.language'),
      value: language === 'ar' ? 'العربية' : 'Deutsch',
      onClick: () => setLanguage(language === 'ar' ? 'de' : 'ar'),
      isToggle: true,
    },
  ];

  const renderGroup = (title: string, items: typeof generalItems) => (
    <motion.div variants={item} className="space-y-1">
      <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1 mb-2">
        {title}
      </p>
      <div className="bg-card border border-border/40 rounded-2xl overflow-hidden divide-y divide-border/30">
        {items.map((si) => (
          <button
            key={si.key}
            onClick={si.onClick}
            className="flex items-center justify-between w-full px-4 py-3.5 active:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <si.icon className="w-[18px] h-[18px] text-primary stroke-[1.8]" />
              <span className="text-[14px] font-medium text-foreground">{si.title}</span>
            </div>
            <div className="flex items-center gap-2">
              {si.isToggle ? (
                <div className={`relative w-[44px] h-[24px] rounded-full transition-colors duration-300 shrink-0 ${language === 'ar' ? 'bg-primary' : 'bg-muted'}`} dir="ltr">
                  <motion.div
                    className="absolute top-[2px] w-[20px] h-[20px] rounded-full bg-primary-foreground"
                    animate={{ left: language === 'ar' ? 22 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              ) : (
                <>
                  <span className="text-[12px] text-muted-foreground">{si.value}</span>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground/40 ltr:rotate-180" />
                </>
              )}
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-10">
      <SEO title="الإعدادات — SmartHub" description="تخصيص اللغة، السمة، الخط، حساب الصلاة والملف الشخصي في SmartHub." path="/settings" />
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-lg mx-auto">

        {/* Profile / Account Card */}
        <motion.div variants={item}>
          {loading ? (
            <div className="bg-card border border-border/40 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-36 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
          ) : user ? (
            <div className="bg-card border border-border/40 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <button onClick={() => navigate('/settings/profile')} className="relative active:scale-95 transition-transform">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center ring-2 ring-primary/20 overflow-hidden">
                    {profile?.avatar_url && profile.avatar_url.startsWith('http') ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover object-top" />
                    ) : profile?.avatar_url && isEmojiAvatarValue(profile.avatar_url) ? (
                      <img src={getAppleEmojiUrl(profile.avatar_url) || ''} alt="" className="w-9 h-9" />
                    ) : (
                      <img src={getDefaultAvatarForUser(username || 'U')} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary border-2 border-card" />
                </button>

                {/* Info */}
                <button onClick={() => navigate('/settings/profile')} className="flex-1 text-start active:opacity-70 transition-opacity min-w-0">
                  <h2 className="text-[17px] font-bold text-foreground truncate">{profile?.display_name || username || (isAr ? 'المستخدم' : 'Benutzer')}</h2>
                  {user.email ? (
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{user.email}</p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">@{username} · {isAr ? 'تعديل الملف الشخصي' : 'Profil bearbeiten'}</p>
                </button>

                {/* Logout */}
                <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-1.5 text-destructive/80 active:scale-90 transition-transform p-2">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="w-full active:scale-[0.99] transition-transform"
            >
              <div className="bg-card border border-border/40 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                    <UserCircle className="w-7 h-7 text-primary stroke-[1.5]" />
                  </div>
                  <div className="flex-1 text-start">
                    <h2 className="text-[17px] font-bold text-foreground">{isAr ? 'تسجيل الدخول' : 'Anmelden'}</h2>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{isAr ? 'احفظ إعداداتك على جميع الأجهزة' : 'Einstellungen auf allen Geräten speichern'}</p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground/40 ltr:rotate-180" />
                </div>
              </div>
            </button>
          )}
        </motion.div>

        {/* Appearance Group */}
        {renderGroup(isAr ? 'المظهر' : 'Darstellung', appearanceItems)}

        {/* Prayer Group */}
        {renderGroup(isAr ? 'الصلاة' : 'Gebet', prayerItems)}

        {/* General Group */}
        {renderGroup(isAr ? 'عام' : 'Allgemein', generalItems)}

        {/* Version */}
        <motion.div variants={item} className="text-center pt-2 pb-4">
          <p className="text-[11px] text-muted-foreground/50">{isAr ? 'الإصدار' : 'Version'} {packageJson.version}</p>
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
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4"
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
                  ? 'سيتم مسح جميع البيانات المحلية من هذا الجهاز. يمكنك استعادتها عند تسجيل الدخول مرة أخرى.'
                  : 'Alle lokalen Daten werden von diesem Gerät gelöscht. Du kannst sie beim erneuten Anmelden wiederherstellen.'}
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
