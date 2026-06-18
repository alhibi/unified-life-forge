import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Check, Type, ALargeSmall, Bold, Eye } from '@/lib/icons';
import BackButton from '@/components/BackButton';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Slider } from '@/components/ui/slider';
import { pageStagger as stagger, pageItem as item } from '@/lib/motion';

const FONTS = [
  { id: 'default', nameAr: 'الافتراضي', nameDe: 'Standard', family: "'Inter', 'Noto Sans Arabic', system-ui, sans-serif", sampleAr: 'بسم الله الرحمن الرحيم', sampleDe: 'Hallo Welt – 0123' },
  { id: 'cairo', nameAr: 'القاهرة', nameDe: 'Cairo', family: "'Cairo', 'Inter', system-ui, sans-serif", sampleAr: 'بسم الله الرحمن الرحيم', sampleDe: 'Hallo Welt – 0123' },
  { id: 'tajawal', nameAr: 'تجوال', nameDe: 'Tajawal', family: "'Tajawal', 'Inter', system-ui, sans-serif", sampleAr: 'بسم الله الرحمن الرحيم', sampleDe: 'Hallo Welt – 0123' },
  { id: 'ibm-plex', nameAr: 'آي بي إم بلكس عربي', nameDe: 'IBM Plex Arabic', family: "'IBM Plex Sans Arabic', 'Inter', system-ui, sans-serif", sampleAr: 'بسم الله الرحمن الرحيم', sampleDe: 'Hallo Welt – 0123' },
  { id: 'readex', nameAr: 'ريدكس برو', nameDe: 'Readex Pro', family: "'Readex Pro', 'Inter', system-ui, sans-serif", sampleAr: 'بسم الله الرحمن الرحيم', sampleDe: 'Hallo Welt – 0123' },
];

const SIZES = [
  { id: 'small', label: { ar: 'صغير', de: 'Klein' }, scale: 0.88 },
  { id: 'medium', label: { ar: 'متوسط', de: 'Mittel' }, scale: 1 },
  { id: 'large', label: { ar: 'كبير', de: 'Groß' }, scale: 1.12 },
];

const WEIGHTS = [
  { value: 300, label: { ar: 'خفيف', de: 'Leicht' } },
  { value: 400, label: { ar: 'عادي', de: 'Normal' } },
  { value: 500, label: { ar: 'متوسط', de: 'Mittel' } },
  { value: 600, label: { ar: 'نصف سميك', de: 'Halbfett' } },
  { value: 700, label: { ar: 'سميك', de: 'Fett' } },
];

export default function FontSettingsPage() {
  const { language, fontFamily, setFontFamily, fontSize, setFontSize, fontWeight, setFontWeight, fontOpacity, setFontOpacity } = useApp();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  const currentFont = FONTS.find(f => f.id === fontFamily) || FONTS[0];
  const currentSize = SIZES.find(s => s.id === fontSize) || SIZES[1];
  const currentWeightLabel = WEIGHTS.find(w => w.value === fontWeight)?.label[language] || String(fontWeight);

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-lg mx-auto">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3 mb-1">
          <BackButton to="/settings" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Type className="w-5 h-5 text-primary stroke-[1.8]" />
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
                  className={`w-full premium-card p-4 flex items-center justify-between active:scale-[0.99] transition-all ${isActive ? 'ring-2 ring-primary/30' : ''}`}
                >
                  <div className="text-start">
                    <p className="font-semibold text-[15px] text-foreground">{isAr ? f.nameAr : f.nameDe}</p>
                    <p className="text-[13px] text-muted-foreground mt-1" style={{ fontFamily: f.family }}>
                      {isAr ? f.sampleAr : f.sampleDe}
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
          <div className="premium-card p-2 flex gap-1.5">
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
        </motion.div>

        {/* Font Weight */}
        <motion.div variants={item}>
          <p className="text-[13px] font-medium text-muted-foreground mb-2.5 px-1 flex items-center gap-1.5">
            <Bold className="w-4 h-4" />
            {isAr ? 'سماكة الخط' : 'Schriftstärke'}
          </p>
          <div className="premium-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">{isAr ? 'خفيف' : 'Leicht'}</span>
              <span className="text-[13px] font-semibold text-foreground">{currentWeightLabel}</span>
              <span className="text-[12px] text-muted-foreground">{isAr ? 'سميك' : 'Fett'}</span>
            </div>
            <Slider
              value={[fontWeight]}
              onValueChange={([v]) => setFontWeight(v)}
              min={300}
              max={700}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between px-1">
              {WEIGHTS.map(w => (
                <button
                  key={w.value}
                  onClick={() => setFontWeight(w.value)}
                  className={`w-2 h-2 rounded-full transition-colors ${fontWeight === w.value ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Font Opacity */}
        <motion.div variants={item}>
          <p className="text-[13px] font-medium text-muted-foreground mb-2.5 px-1 flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            {isAr ? 'شفافية النص' : 'Textdeckkraft'}
          </p>
          <div className="premium-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">30%</span>
              <span className="text-[13px] font-semibold text-foreground">{Math.round(fontOpacity * 100)}%</span>
              <span className="text-[12px] text-muted-foreground">100%</span>
            </div>
            <Slider
              value={[fontOpacity * 100]}
              onValueChange={([v]) => setFontOpacity(v / 100)}
              min={30}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </motion.div>

        {/* Preview */}
        <motion.div variants={item}>
          <p className="text-[13px] font-medium text-muted-foreground mb-2.5 px-1">
            {isAr ? 'معاينة' : 'Vorschau'}
          </p>
          <div className="premium-card p-5 space-y-3">
            <p
              className="text-foreground leading-relaxed"
              style={{
                fontFamily: currentFont.family,
                fontSize: `${currentSize.scale * 1}rem`,
                fontWeight: fontWeight,
                opacity: fontOpacity,
              }}
            >
              {isAr
                ? 'بسم الله الرحمن الرحيم. هذا نص تجريبي لمعاينة إعدادات الخط المختارة مع جميع التعديلات.'
                : 'Im Namen Gottes, des Barmherzigen. Dies ist ein Beispieltext zur Vorschau der Schrifteinstellungen.'}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] text-muted-foreground bg-secondary/60 px-2 py-1 rounded-lg">
                {isAr ? currentFont.nameAr : currentFont.nameDe}
              </span>
              <span className="text-[11px] text-muted-foreground bg-secondary/60 px-2 py-1 rounded-lg">
                {currentSize.label[language]}
              </span>
              <span className="text-[11px] text-muted-foreground bg-secondary/60 px-2 py-1 rounded-lg">
                {currentWeightLabel}
              </span>
              <span className="text-[11px] text-muted-foreground bg-secondary/60 px-2 py-1 rounded-lg">
                {Math.round(fontOpacity * 100)}%
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
