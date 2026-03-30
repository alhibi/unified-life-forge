import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Leaf } from 'lucide-react';
import { sunnahDetailData } from '@/data/sunnahDetailData';
import type { SunnahDetailItem } from '@/data/sunnahDetailData';

function getCurrentPrayerKey(): { key: string; label: string } {
  const now = new Date();
  const h = now.getHours();
  const m = h * 60 + now.getMinutes();

  // Approximate prayer time windows
  if (m >= 0 && m < 270) return { key: 'before-fajr', label: 'قبل الفجر' };       // 00:00 - 04:30
  if (m >= 270 && m < 360) return { key: 'fajr', label: 'الفجر' };                 // 04:30 - 06:00
  if (m >= 360 && m < 720) return { key: 'duha', label: 'الضحى' };                 // 06:00 - 12:00
  if (m >= 720 && m < 900) return { key: 'dhuhr', label: 'الظهر' };                // 12:00 - 15:00
  if (m >= 900 && m < 1050) return { key: 'asr', label: 'العصر' };                 // 15:00 - 17:30
  if (m >= 1050 && m < 1140) return { key: 'maghrib', label: 'المغرب' };           // 17:30 - 19:00
  return { key: 'isha', label: 'العشاء' };                                          // 19:00 - 00:00
}

export default function CurrentTimeSunnah() {
  const navigate = useNavigate();
  const { dir } = useApp();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(getCurrentPrayerKey);

  useEffect(() => {
    const interval = setInterval(() => setCurrent(getCurrentPrayerKey()), 60000);
    return () => clearInterval(interval);
  }, []);

  const category = sunnahDetailData[current.key];
  if (!category) return null;

  const items = category.items as SunnahDetailItem[];

  return (
    <div className="rounded-2xl bg-card/80 border border-border/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <div className="text-start">
            <h3 className="text-[14px] font-bold text-foreground leading-tight">سنن الوقت الحالي</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">وقت {current.label}</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground/60" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-0">
              {items.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5">
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${i % 2 === 0 ? 'bg-primary' : 'bg-amber-500/80'}`} />
                  <p className="text-[13px] text-foreground leading-relaxed font-medium">{item.title}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
