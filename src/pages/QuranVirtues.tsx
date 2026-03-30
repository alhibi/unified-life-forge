import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, BookOpen, Sparkles } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

// سيتم إضافة المحتوى لاحقاً
const surahVirtues: { name: string; content: string }[] = [];

const quranVirtues: { title: string }[] = [];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const itemAnim = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function QuranVirtues() {
  const navigate = useNavigate();
  const { dir } = useApp();
  const BackIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center">
            <BackIcon className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">فضائل القرآن</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 pt-5 space-y-8">
        {/* Section 1: فضل سور القرآن */}
        <div className="space-y-4">
          <div className="flex items-center justify-end gap-2">
            <h2 className="text-base font-bold text-foreground">فضل سور القرآن</h2>
            <BookOpen className="w-5 h-5 text-primary" />
          </div>

          {surahVirtues.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">سيتم إضافة المحتوى قريباً</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-end">
              {surahVirtues.map((surah, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-xl bg-card/80 border border-border/40 text-sm font-semibold text-foreground hover:bg-accent/40 transition-colors"
                >
                  {surah.name}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/40" />

        {/* Section 2: فضائل القرآن */}
        <div className="space-y-4">
          <div className="flex items-center justify-end gap-2">
            <h2 className="text-base font-bold text-foreground">فضائل القرآن</h2>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>

          {quranVirtues.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">سيتم إضافة المحتوى قريباً</p>
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-2.5">
              {quranVirtues.map((virtue, index) => (
                <motion.div
                  key={index}
                  variants={itemAnim}
                  className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm"
                >
                  <p className="flex-1 text-sm font-medium text-foreground text-right leading-relaxed">{virtue.title}</p>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/15">
                    <span className="text-xs font-bold text-primary">{index + 1}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
