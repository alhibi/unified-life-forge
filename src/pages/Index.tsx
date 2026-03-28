import React from 'react';
import { useApp } from '@/contexts/AppContext';
import DualCalendar from '@/components/DualCalendar';
import AudioPlayer from '@/components/AudioPlayer';
import LocationSaver from '@/components/LocationSaver';
import { motion } from 'framer-motion';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export default function Index() {
  const { t } = useApp();
  const now = new Date();

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-5 max-w-lg mx-auto"
      >
        <motion.div variants={item}>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-tight">
            {t('app.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('calendar.today')} · {now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

        <motion.div variants={item}><DualCalendar /></motion.div>
        <motion.div variants={item}><AudioPlayer /></motion.div>
        <motion.div variants={item}><LocationSaver /></motion.div>
      </motion.div>
    </div>
  );
}
