import React, { useState, useEffect } from 'react';
import SEO from '@/components/SEO';
import { createPortal } from 'react-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import LocationSaver from '@/components/LocationSaver';
import PrayerTimes from '@/components/PrayerTimes';
import { motion } from 'framer-motion';
import WeatherWidget from '@/components/WeatherWidget';
import CurrentTimeSunnah from '@/components/CurrentTimeSunnah';
import UmmahPulse from '@/components/UmmahPulse';
import LivingRibbon from '@/components/LivingRibbon';
import { useNavigate } from 'react-router-dom';
import { Sunrise, Sun, Moon, MessageCircle, ClipboardList, X, Trash2, BookOpen, UserCircle } from '@/lib/icons';
import { AnimatePresence } from 'framer-motion';
import { useClipboard } from '@/hooks/useClipboard';
import { getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function Index() {
  // Auto-request the device's location on first homepage visit *iff* there
  // is nothing cached yet. Routed through the singleton hook so the prayer-
  // times card and weather widget see the same coordinates on the same
  // tick. Anything beyond `idle` (cached / requesting / granted / denied)
  // means another widget already kicked things off — don't double-prompt.
  const { status: locationStatus, requestLocation } = useDeviceLocation();
  useEffect(() => {
    if (locationStatus === 'idle') void requestLocation();
  }, [locationStatus, requestLocation]);

  const { t, language } = useApp();
  const { user, username, profile } = useAuth();
  const now = new Date();
  const hour = now.getHours();
  const isMorning = hour >= 5 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const greeting = isMorning ? t('greeting.morning') : isAfternoon ? t('greeting.afternoon') : t('greeting.evening');
  const GreetingIcon = isMorning ? Sunrise : isAfternoon ? Sun : Moon;
  const greetingIconStyle = 'text-primary bg-primary/10';

  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const [showClipboard, setShowClipboard] = useState(false);

  const { items: saved, removeItem } = useClipboard('sunnah');

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO title="SmartHub — أوقات الصلاة والأذكار والقرآن" description="الصفحة الرئيسية لـ SmartHub: أوقات الصلاة، التقويم الهجري، الطقس، الأذكار وروابط سريعة لكل الأقسام." path="/" />
      {/* Descriptive H1 for SEO & a11y; visual greeting below acts as a styled subhead */}
      <h1 className="sr-only">
        {language === 'ar'
          ? 'SmartHub — لوحتك اليومية لأوقات الصلاة، القرآن، الأذكار، الطقس والتقويم الهجري'
          : 'SmartHub — Dein tägliches Dashboard für Gebetszeiten, Quran, Adhkar, Wetter und Hidschri-Kalender'}
      </h1>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-5 max-w-lg mx-auto"
      >
        <motion.div variants={item}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[22px] font-bold tracking-tight text-foreground leading-tight">
                {greeting}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {now.toLocaleDateString(language === 'ar' ? 'ar' : 'de', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowClipboard(true)}
                className="relative p-2.5 rounded-xl bg-accent/50 hover:bg-accent transition-colors" aria-label="الحافظة"
              >
                <ClipboardList className="h-5 w-5 text-foreground" />
                {saved.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {saved.length}
                  </span>
                )}
              </button>
              {user && (
                <button
                  onClick={() => navigate('/chat')}
                  className="relative p-2.5 rounded-xl bg-accent/50 hover:bg-accent transition-colors" aria-label="المحادثات"
                >
                  <MessageCircle className="h-5 w-5 text-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}
              {/* Avatar shortcut → /settings.
                  Replaces the previous Newspaper button (which moved
                  into the new /browse hub) and the Settings tab in
                  the bottom nav (which was retired in the IA reorg).
                  Signed-in users see their actual avatar; signed-out
                  users see a generic UserCircle that still navigates
                  to /settings (where the auth flow lives). */}
              <button
                onClick={() => navigate('/settings')}
                className="relative w-10 h-10 rounded-full ring-2 ring-primary/20 overflow-hidden active:scale-95 transition-transform"
                aria-label={language === 'ar' ? 'الإعدادات' : 'Einstellungen'}
              >
                {user ? (
                  profile?.avatar_url && profile.avatar_url.startsWith('http') ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover object-top" />
                  ) : profile?.avatar_url && isEmojiAvatarValue(profile.avatar_url) ? (
                    <span className="w-full h-full flex items-center justify-center bg-accent/40">
                      <img src={getAppleEmojiUrl(profile.avatar_url) || ''} alt="" className="w-6 h-6" />
                    </span>
                  ) : (
                    <img src={getDefaultAvatarForUser(username || 'U')} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <span className="w-full h-full flex items-center justify-center bg-accent/40">
                    <UserCircle className="h-5 w-5 text-foreground" />
                  </span>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}><LivingRibbon /></motion.div>
        <motion.section variants={item} aria-labelledby="home-weather-h">
          <h2 id="home-weather-h" className="sr-only">{language === 'ar' ? 'الطقس' : 'Wetter'}</h2>
          <WeatherWidget />
        </motion.section>
        <motion.section variants={item} aria-labelledby="home-prayer-h">
          <h2 id="home-prayer-h" className="sr-only">{language === 'ar' ? 'أوقات الصلاة' : 'Gebetszeiten'}</h2>
          <PrayerTimes />
        </motion.section>
        <motion.section variants={item} aria-labelledby="home-sunnah-h">
          <h2 id="home-sunnah-h" className="sr-only">{language === 'ar' ? 'سنة الوقت الحالي' : 'Sunnah dieser Zeit'}</h2>
          <CurrentTimeSunnah />
        </motion.section>
        <motion.section variants={item} aria-labelledby="home-ummah-h">
          <h2 id="home-ummah-h" className="sr-only">{language === 'ar' ? 'نبض الأمة' : 'Ummah-Puls'}</h2>
          <UmmahPulse />
        </motion.section>
        {/* Tafsir feature card and the IslamicSections grid that used
            to live here have been retired in the IA reorganisation.
            Their content now lives under /mihrab (Quran/Dhikr/Sunnah/
            Literature) which is one tap away in the bottom nav. The
            home page is back to answering only "what should I do
            right now?" — prayer times, weather, current sunnah,
            ummah pulse, and saved locations. */}
        <motion.section variants={item} aria-labelledby="home-locations-h">
          <h2 id="home-locations-h" className="sr-only">{language === 'ar' ? 'المواقع المحفوظة' : 'Gespeicherte Orte'}</h2>
          <LocationSaver />
        </motion.section>

        {/* Made by Amer */}
        <motion.div variants={item} className="flex items-center justify-center gap-2 py-6 mt-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          <span className="text-[11px] text-muted-foreground font-medium tracking-wide">
            {t('footer.madeBy')} <span className="text-primary font-semibold">عامر</span> {t('footer.and')} <span className="text-primary font-semibold">امولة</span> ✦
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        </motion.div>
      </motion.div>

      {createPortal(
        <>
          {/* Clipboard Drawer */}
          <AnimatePresence>
            {showClipboard && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/50"
                  onClick={() => setShowClipboard(false)}
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] rounded-t-3xl bg-background border-t border-border/40 flex flex-col"
                >
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                    <h2 className="text-base font-bold text-foreground">
                      {language === 'ar' ? 'الحافظة' : 'Clipboard'}
                    </h2>
                    <button onClick={() => setShowClipboard(false)} className="w-8 h-8 rounded-full bg-card/80 flex items-center justify-center">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    {saved.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <ClipboardList className="w-12 h-12 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'لا توجد عناصر محفوظة' : 'No saved items'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 pb-6">
                        {saved.map((s: any) => (
                          <div key={s.id} className="rounded-xl bg-card/80 border border-border/40 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground leading-relaxed mb-1">{s.title}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{s.description}</p>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" />
                                    {s.source}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground/60">
                                    {language === 'ar' ? 'من:' : 'From:'} {s.from}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => removeItem(s.id)}
                                className="shrink-0 w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}
