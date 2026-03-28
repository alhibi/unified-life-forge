import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { ChevronLeft, Check, Type, ALargeSmall } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const FONTS = [
  { id: 'default', nameAr: 'الافتراضي', nameDe: 'Standard', family: "'Inter', 'Noto Sans Arabic', system-ui, sans-serif", sample: 'أهلاً بالعالم' },
  { id: 'cairo', nameAr: 'القاهرة', nameDe: 'Cairo', family: "'Cairo', 'Inter', system-ui, sans-serif", sample: 'أهلاً بالعالم' },
  { id: 'tajawal', nameAr: 'تجوال', nameDe: 'Tajawal', family: "'Tajawal', 'Inter', system-ui, sans-serif", sample: 'أهلاً بالعالم' },
  { id: 'ibm-plex', nameAr: 'آي بي إم بلكس', nameDe: 'IBM Plex', family: "'IBM Plex Sans Arabic', 'Inter', system-ui, sans-serif", sample: 'أهلاً بالعالم' },
  { id: 'readex', nameAr: 'ريدكس برو', nameDe: 'Readex Pro', family: "'Readex Pro', 'Inter', system-ui, sans-serif", sample: 'أهلاً بالعالم' },
];

const SIZES = [
  { id: 'small', label: { ar: 'صغير', de: 'Klein' }, scale: 0.88 },
  { id: 'medium', label: { ar: 'متوسط', de: 'Mittel' }, scale: 1 },
  { id: 'large', label: { ar: 'كبير', de: 'Groß' }, scale: 1.12 },
];

export default function FontSettingsPage() {
  const { language, fontFamily, setFontFamily, fontSize, setFontSize } = useApp();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-lg mx-auto">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-2xl bg-secondary/60 flex items-center justify-center active:scale-95 transition-transform">
            <ChevronLeft className="w-5 h-5 text-foreground ltr:rotate-0 rtl:rotate-180" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/12 dark:bg-amber-400/15 flex items-center justify-center">
              <Type className="w-5 h-5 text-amber-600 dark:text-amber-400 stroke-[1.8]" />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">
              {isAr ? 'الخط' : 'Schriftart'}
            </h1>
          </div>
        </motion.div>

        {/* Font Family */}
        <motion.div variants={item}>
          <p className="text-[13px] font-medium text-muted-foreground mb-2.5 px-1">
            {isAr ? 'نوع الخط' : 'Schriftart'}
          </p>
          <div className="space-y-2">
            {FONTS.map((f) => {
              const isActive = fontFamily === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFontFamily(f.id)}
                  className={`w-full premium-card-elevated p-4 flex items-center justify-between active:scale-[0.99] transition-all ${isActive ? 'ring-2 ring-primary/30' : ''}`}
                >
                  <div className="text-start">
                    <p className="font-semibold text-[15px] text-foreground">{isAr ? f.nameAr : f.nameDe}</p>
                    <p className="text-[13px] text-muted-foreground mt-1" style={{ fontFamily: f.family }}>
                      {isAr ? f.sample : 'Hallo Welt – 0123'}
                    </p>
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0"
                    >
                      <Check className="w-4 h-4 text-primary-foreground stroke-[2.5]" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Font Size */}
        <motion.div variants={item}>
          <p className="text-[13px] font-medium text-muted-foreground mb-2.5 px-1 flex items-center gap-1.5">
            <ALargeSmall className="w-4 h-4" />
            {isAr ? 'حجم الخط' : 'Schriftgröße'}
          </p>
          <div className="premium-card-elevated p-2 flex gap-1.5">
            {SIZES.map((s) => {
              const isActive = fontSize === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setFontSize(s.id)}
                  className={`flex-1 py-3 rounded-xl text-[14px] font-medium transition-all relative ${
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="fontSize"
                      className="absolute inset-0 bg-primary rounded-xl"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{s.label[language]}</span>
                </button>
              );
            })}
          </div>
          {/* Preview */}
          <div className="premium-card-elevated p-4 mt-3">
            <p className="text-[13px] text-muted-foreground mb-1">{isAr ? 'معاينة' : 'Vorschau'}</p>
            <p className="text-foreground" style={{ fontSize: `${SIZES.find(s => s.id === fontSize)?.scale ?? 1}rem` }}>
              {isAr ? 'هذا نص تجريبي لمعاينة حجم الخط المختار.' : 'Dies ist ein Beispieltext zur Vorschau der Schriftgröße.'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
