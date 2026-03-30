import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { Clock, Timer, CalendarDays, Sparkles, Trophy, Leaf, ChevronLeft, ChevronRight } from 'lucide-react';

const sections = [
  { key: 'timed-sunnah', labelKey: 'sections.timedSunnah', icon: Clock, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-400/15' },
  { key: 'untimed-sunnah', labelKey: 'sections.untimedSunnah', icon: Timer, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-400/15' },
  { key: 'prophetic-day', labelKey: 'sections.propheticDay', icon: CalendarDays, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-400/15' },
  { key: 'quran-virtues', labelKey: 'sections.quranVirtues', icon: Sparkles, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-400/15' },
  { key: 'selections', labelKey: 'sections.selections', icon: Leaf, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-400/15' },
  { key: 'prophetic-badges', labelKey: 'sections.propheticBadges', icon: Trophy, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-400/15' },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function IslamicSections() {
  const navigate = useNavigate();
  const { t, dir } = useApp();
  const Arrow = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-2">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-primary text-[6px]">●</span>
        <h2 className="text-sm font-bold text-foreground whitespace-nowrap">{t('sections.more')}</h2>
        <span className="text-primary text-[6px]">●</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-2 px-2"
      >
        {sections.map((section) => (
          <motion.button
            key={section.key}
            variants={item}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(section.key === 'timed-sunnah' ? '/section/timed-sunnah' : `/section/${section.key}`)}
            className="flex items-center justify-between gap-1.5 px-2.5 py-4 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm transition-colors hover:bg-accent/40 group"
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-full ${section.bg} flex items-center justify-center`}>
                <section.icon className={`w-[18px] h-[18px] ${section.color}`} />
              </div>
              <span className="text-[13px] font-semibold text-foreground leading-tight whitespace-nowrap">
                {t(section.labelKey)}
              </span>
            </div>
            <Arrow className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
