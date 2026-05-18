import React, { useState, useEffect, useCallback } from 'react';
import SEO from '@/components/SEO';
import { createPortal } from 'react-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LocationSaver from '@/components/LocationSaver';
import PrayerTimes from '@/components/PrayerTimes';
import { motion } from 'framer-motion';
import WeatherWidget from '@/components/WeatherWidget';
import IslamicSections from '@/components/IslamicSections';
import CurrentTimeSunnah from '@/components/CurrentTimeSunnah';
import UmmahPulse from '@/components/UmmahPulse';
import { useNavigate } from 'react-router-dom';
import { Sunrise, Sun, Moon, MessageCircle, Newspaper, ClipboardList, X, Trash2, BookOpen, ArrowRight } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useClipboard } from '@/hooks/useClipboard';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function Index() {
  // Auto-detect location on first load and save for all widgets
  useEffect(() => {
    const saved = localStorage.getItem('lastLocation');
    if (!saved && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          localStorage.setItem('lastLocation', JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
          // Dispatch storage event so widgets re-fetch with new location
          window.dispatchEvent(new Event('locationUpdated'));
        },
        () => { /* user denied or error — keep Makkah default */ },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);
  const { t, language } = useApp();
  const { user } = useAuth();
  const now = new Date();
  const hour = now.getHours();
  const isMorning = hour >= 5 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const greeting = isMorning ? t('greeting.morning') : isAfternoon ? t('greeting.afternoon') : t('greeting.evening');
  const GreetingIcon = isMorning ? Sunrise : isAfternoon ? Sun : Moon;
  const greetingIconStyle = 'text-primary bg-primary/10';

  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showClipboard, setShowClipboard] = useState(false);

  const { items: saved, removeItem } = useClipboard('sunnah');

  // Poll unread count
  const fetchUnread = useCallback(async () => {
    if (!user) { setUnreadCount(0); return; }
    // Get all conversation IDs for this user
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    if (!convs || convs.length === 0) { setUnreadCount(0); return; }
    const ids = convs.map(c => c.id);
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .neq('sender_id', user.id)
      .eq('read', false);
    setUnreadCount(count || 0);
  }, [user]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000); // reduced from 15s to 60s, realtime handles instant updates
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Realtime unread listener
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('unread-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchUnread();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchUnread]);

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO title="SmartHub — أوقات الصلاة والأذكار والقرآن" description="الصفحة الرئيسية لـ SmartHub: أوقات الصلاة، التقويم الهجري، الطقس، الأذكار وروابط سريعة لكل الأقسام." path="/" />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-5 max-w-lg mx-auto"
      >
        <motion.div variants={item}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold tracking-tight text-foreground leading-tight">
                {greeting}
              </h1>
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
              <button
                onClick={() => navigate('/reading')}
                className="p-2.5 rounded-xl bg-accent/50 hover:bg-accent transition-colors" aria-label="الأخبار"
              >
                <Newspaper className="h-5 w-5 text-foreground" />
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
            </div>
          </div>
        </motion.div>

        <motion.div variants={item}><WeatherWidget /></motion.div>
        <motion.div variants={item}><PrayerTimes /></motion.div>
        <motion.div variants={item}><CurrentTimeSunnah /></motion.div>
        <motion.div variants={item}><UmmahPulse /></motion.div>
        {/* Tafsir Feature Card — Gold Shimmer */}
        <motion.div variants={item}>
          <button
            onClick={() => navigate('/tafsir')}
            className="w-full group relative overflow-hidden rounded-xl border border-amber-300/30 dark:border-amber-500/20 bg-gradient-to-bl from-amber-50 via-card to-amber-50/30 dark:from-amber-950/20 dark:via-card dark:to-amber-950/10 px-4 py-3.5 text-right transition-all hover:shadow-[0_4px_24px_rgba(217,167,62,0.12)] hover:border-amber-400/50 active:scale-[0.98]"
          >
            {/* Gold shimmer sweep animation */}
            <div
              className="absolute inset-0 pointer-events-none opacity-60"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(217,167,62,0.15) 50%, transparent 60%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />
            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 dark:from-amber-500/15 dark:to-amber-700/10 flex items-center justify-center shrink-0 border border-amber-300/30 dark:border-amber-500/20">
                <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground">{t('tafsir.title')}</h3>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">{t('tafsir.subtitle')}</p>
              </div>
              <div className="shrink-0 w-6 h-6 rounded-full bg-amber-400/10 dark:bg-amber-500/10 flex items-center justify-center">
                <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 rotate-180" />
              </div>
            </div>
          </button>
        </motion.div>

        <motion.div variants={item}><IslamicSections /></motion.div>
        <motion.div variants={item}><LocationSaver /></motion.div>

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
