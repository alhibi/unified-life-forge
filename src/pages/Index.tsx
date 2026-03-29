import React, { useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import DualCalendar from '@/components/DualCalendar';
import AudioPlayer from '@/components/AudioPlayer';
import LocationSaver from '@/components/LocationSaver';
import PrayerTimes from '@/components/PrayerTimes';
import { motion } from 'framer-motion';
import { Sunrise, Sun, Moon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const highlight = searchParams.get('highlight');

  const greetingRef = useRef<HTMLDivElement>(null);
  const prayerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  const refMap: Record<string, React.RefObject<HTMLDivElement>> = {
    greeting: greetingRef,
    prayer: prayerRef,
    calendar: calendarRef,
    audio: audioRef,
    location: locationRef,
  };

  useEffect(() => {
    if (!highlight) return;
    const ref = refMap[highlight];
    if (!ref?.current) return;

    // Small delay to let the page render
    const timer = setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add highlight class
      ref.current?.classList.add('guide-highlight');
      // Remove highlight and param after animation
      const removeTimer = setTimeout(() => {
        ref.current?.classList.remove('guide-highlight');
        setSearchParams({}, { replace: true });
      }, 2000);
      return () => clearTimeout(removeTimer);
    }, 300);

    return () => clearTimeout(timer);
  }, [highlight]);

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

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-5 max-w-lg mx-auto"
      >
        <motion.div ref={greetingRef} variants={item} className="flex items-center gap-3 transition-all duration-500 rounded-2xl">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${greetingIconStyle}`}>
            <GreetingIcon className="w-5.5 h-5.5 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-foreground leading-tight">
              {greeting}
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </motion.div>

        <motion.div ref={prayerRef} variants={item} className="transition-all duration-500 rounded-2xl"><PrayerTimes /></motion.div>
        <motion.div ref={calendarRef} variants={item} className="transition-all duration-500 rounded-2xl"><DualCalendar /></motion.div>
        <motion.div ref={audioRef} variants={item} className="transition-all duration-500 rounded-2xl"><AudioPlayer /></motion.div>
        <motion.div ref={locationRef} variants={item} className="transition-all duration-500 rounded-2xl"><LocationSaver /></motion.div>

        {/* Made by Amer */}
        <motion.div variants={item} className="flex items-center justify-center gap-2 py-6 mt-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          <span className="text-[11px] text-muted-foreground/60 font-medium tracking-wide">
            صنع بواسطة <span className="text-primary/70 font-semibold">عامر</span> و <span className="text-primary/70 font-semibold">امولة</span> ✦
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        </motion.div>
      </motion.div>
    </div>
  );
}
