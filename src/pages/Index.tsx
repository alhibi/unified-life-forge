import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DualCalendar from '@/components/DualCalendar';
import AudioPlayer from '@/components/AudioPlayer';
import LocationSaver from '@/components/LocationSaver';
import PrayerTimes from '@/components/PrayerTimes';
import { motion } from 'framer-motion';
import WeatherWidget from '@/components/WeatherWidget';
import ReligiousOccasions from '@/components/ReligiousOccasions';
const ChatDrawer = lazy(() => import('@/components/ChatDrawer'));
import ReadingDialog from '@/components/ReadingDialog';
import { Sunrise, Sun, Moon, MessageCircle, BookOpen } from 'lucide-react';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function Index() {
  const { t } = useApp();
  const { user } = useAuth();
  const now = new Date();
  const hour = now.getHours();
  const isMorning = hour >= 5 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const greeting = isMorning ? t('greeting.morning') : isAfternoon ? t('greeting.afternoon') : t('greeting.evening');
  const GreetingIcon = isMorning ? Sunrise : isAfternoon ? Sun : Moon;
  const greetingIconStyle = isMorning
    ? 'text-amber-500 dark:text-amber-400 bg-amber-500/12 dark:bg-amber-400/15'
    : isAfternoon
      ? 'text-orange-500 dark:text-orange-400 bg-orange-500/12 dark:bg-orange-400/15'
      : 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/12 dark:bg-indigo-400/15';

  const [chatOpen, setChatOpen] = useState(false);
  const [readingOpen, setReadingOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
    const interval = setInterval(fetchUnread, 15000);
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
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-5 max-w-lg mx-auto"
      >
        <motion.div variants={item}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-foreground leading-tight">
                {greeting}
              </h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={() => setReadingOpen(true)}
                className="p-2.5 rounded-xl bg-accent/50 hover:bg-accent transition-colors"
              >
                <BookOpen className="h-5 w-5 text-foreground" />
              </button>
              {user && (
                <button
                  onClick={() => setChatOpen(true)}
                  className="relative p-2.5 rounded-xl bg-accent/50 hover:bg-accent transition-colors"
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
        <motion.div variants={item}><DualCalendar /></motion.div>
        <motion.div variants={item}><ReligiousOccasions /></motion.div>
        <motion.div variants={item}><AudioPlayer /></motion.div>
        <motion.div variants={item}><LocationSaver /></motion.div>

        {/* Made by Amer */}
        <motion.div variants={item} className="flex items-center justify-center gap-2 py-6 mt-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          <span className="text-[11px] text-muted-foreground/60 font-medium tracking-wide">
            صنع بواسطة <span className="text-primary/70 font-semibold">عامر</span> و <span className="text-primary/70 font-semibold">امولة</span> ✦
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        </motion.div>
      </motion.div>

      <ReadingDialog open={readingOpen} onOpenChange={setReadingOpen} />

      <Suspense fallback={null}>
        <ChatDrawer
          open={chatOpen}
          onOpenChange={setChatOpen}
          unreadCount={unreadCount}
          onUnreadChange={setUnreadCount}
        />
      </Suspense>
    </div>
  );
}
