import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { Clock, Timer, CalendarDays, Sparkles, Trophy, Leaf, ChevronLeft, ChevronRight } from 'lucide-react';

const sections = [
  { key: 'timed-sunnah', labelKey: 'sections.timedSunnah', icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'untimed-sunnah', labelKey: 'sections.untimedSunnah', icon: Timer, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'prophetic-day', labelKey: 'sections.propheticDay', icon: CalendarDays, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'quran-virtues', labelKey: 'sections.quranVirtues', icon: Sparkles, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'selections', labelKey: 'sections.selections', icon: Leaf, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'prophetic-badges', labelKey: 'sections.propheticBadges', icon: Trophy, color: 'text-primary', bg: 'bg-primary/10' },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

const comingSoonKeys = new Set(['selections', 'prophetic-badges']);

function SectionButton({ section, Arrow }: { section: typeof sections[0]; Arrow: any }) {
  const navigate = useNavigate();
  const { t, language } = useApp();
  const [showSoon, setShowSoon] = useState(false);
  const isComingSoon = comingSoonKeys.has(section.key);

  const handleClick = () => {
    if (isComingSoon) {
      setShowSoon(true);
      setTimeout(() => setShowSoon(false), 1200);
    } else {
      navigate(`/section/${section.key}`);
    }
  };

  return (
    <motion.button
      variants={item}
      
      onClick={handleClick}
      className="flex items-center justify-between gap-1.5 px-2.5 py-4 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm transition-colors hover:bg-accent/40 group"
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-full ${section.bg} flex items-center justify-center`}>
          <section.icon className={`w-[18px] h-[18px] ${section.color}`} />
        </div>
        <span className="text-[13px] font-semibold text-foreground leading-tight whitespace-nowrap transition-all duration-300">
          {showSoon ? (language === 'ar' ? 'قريباً' : 'Soon') : t(section.labelKey)}
        </span>
      </div>
      <Arrow className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
    </motion.button>
  );
}

export default function IslamicSections() {
  const { t, dir } = useApp();
  const Arrow = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-2">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-primary text-[6px]">●</span>
        <h2 className="text-sm font-bold text-foreground whitespace-nowrap">{t('sections.more')}</h2>
        <span className="text-primary text-[6px]">●</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-2 px-2"
      >
        {sections.map((section) => (
          <SectionButton key={section.key} section={section} Arrow={Arrow} />
        ))}
      </motion.div>
    </div>
  );
}
