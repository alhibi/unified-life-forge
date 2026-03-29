import React from 'react';
import { useApp } from '@/contexts/AppContext';
import DualCalendar from '@/components/DualCalendar';
import AudioPlayer from '@/components/AudioPlayer';
import LocationSaver from '@/components/LocationSaver';
import PrayerTimes from '@/components/PrayerTimes';
import { motion } from 'framer-motion';
import WeatherWidget from '@/components/WeatherWidget';
import ReligiousOccasions from '@/components/ReligiousOccasions';
import { Sunrise, Sun, Moon } from 'lucide-react'; // kept for potential future use

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
        <motion.div variants={item}>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground leading-tight">
              {greeting}
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
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
    </div>
  );
}
