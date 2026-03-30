import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Moon, Sun, CloudSun, Cloud, Calendar } from 'lucide-react';

export default function TimedSunnah() {
  const navigate = useNavigate();
  const { t, dir } = useApp();
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;

  const categories = [
    { id: 'fajr', labelKey: 'timed.fajr', count: 10, icon: CloudSun, accent: '#D4A843' },
    { id: 'before-fajr', labelKey: 'timed.beforeFajr', count: 18, icon: Moon, accent: '#D4A843' },
    { id: 'dhuhr', labelKey: 'timed.dhuhr', count: 3, icon: Sun, accent: '#4CAF50' },
    { id: 'duha', labelKey: 'timed.duha', count: 4, icon: Sun, accent: '#D4A843' },
    { id: 'maghrib', labelKey: 'timed.maghrib', count: 4, icon: Cloud, accent: '#4CAF50' },
    { id: 'asr', labelKey: 'timed.asr', count: 3, icon: CloudSun, accent: '#4CAF50' },
    { id: 'isha', labelKey: 'timed.isha', count: 6, icon: Moon, accent: '#D4A843' },
    { id: 'friday', labelKey: 'timed.friday', count: 4, icon: Calendar, accent: '#D4A843' },
  ];

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } } };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center"
          >
            <BackIcon className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t('timed.title')}</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Grid */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 p-4">
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            variants={item}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(`/section/timed-sunnah/${cat.id}`)}
            className="relative flex flex-col items-center gap-2 py-6 px-3 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm overflow-hidden group"
          >
            <div className="absolute top-0 left-2 right-2 h-[2px] rounded-full" style={{ backgroundColor: cat.accent }} />
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat.accent}18` }}>
              <cat.icon className="w-6 h-6" style={{ color: cat.accent }} />
            </div>
            <span className="text-sm font-bold text-foreground">{t(cat.labelKey)}</span>
            <span className="text-xs text-muted-foreground">{cat.count} {t('timed.sunnah')}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
