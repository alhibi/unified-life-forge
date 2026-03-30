import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Moon, Sun, CloudSun, Cloud, CloudMoon, Calendar } from 'lucide-react';

const categories = [
  { id: 'fajr', label: 'الفجر', count: 10, icon: CloudSun, accent: '#D4A843' },
  { id: 'before-fajr', label: 'قبل الفجر', count: 18, icon: Moon, accent: '#D4A843' },
  { id: 'dhuhr', label: 'الظهر', count: 3, icon: Sun, accent: '#4CAF50' },
  { id: 'duha', label: 'الضحى', count: 4, icon: Sun, accent: '#D4A843' },
  { id: 'maghrib', label: 'المغرب', count: 4, icon: Cloud, accent: '#4CAF50' },
  { id: 'asr', label: 'العصر', count: 3, icon: CloudSun, accent: '#4CAF50' },
  { id: 'isha', label: 'العشاء', count: 6, icon: Moon, accent: '#D4A843' },
  { id: 'friday', label: 'يوم الجمعة', count: 4, icon: Calendar, accent: '#D4A843' },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function TimedSunnah() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">السنن الموقوتة</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 p-4"
      >
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            variants={item}
            whileTap={{ scale: 0.96 }}
            className="relative flex flex-col items-center gap-2 py-6 px-3 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm overflow-hidden group"
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-2 right-2 h-[2px] rounded-full"
              style={{ backgroundColor: cat.accent }}
            />

            {/* Icon */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${cat.accent}18` }}
            >
              <cat.icon
                className="w-6 h-6"
                style={{ color: cat.accent }}
              />
            </div>

            {/* Label */}
            <span className="text-sm font-bold text-foreground">{cat.label}</span>

            {/* Count */}
            <span className="text-xs text-muted-foreground">{cat.count} سنة</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
