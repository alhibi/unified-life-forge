import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { BookOpen, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import BackButton from '@/components/BackButton';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function PrayerSettings() {
  const {
    language, prayerMadhab, setPrayerMadhab,
    latitudeAdjMethod, setLatitudeAdjMethod,
    dstEnabled, setDstEnabled,
  } = useApp();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  const isHanafi = prayerMadhab === 'hanafi';

  const resetDefaults = () => {
    setPrayerMadhab('shafii');
    setLatitudeAdjMethod('angle');
    setDstEnabled(true);
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 max-w-lg mx-auto">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-primary stroke-[1.8] ltr:rotate-180" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary stroke-[1.8]" />
            </div>
            <h1 className="text-[26px] font-bold tracking-tight text-foreground">
              {isAr ? 'إعدادات الصلاة' : 'Gebetseinstellungen'}
            </h1>
          </div>
        </motion.div>

        {/* Madhab Section */}
        <motion.div variants={item} className="premium-card-elevated overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border/50">
            <span className="font-semibold text-[15px] text-foreground">
              {isAr ? 'شافعي | حنبلي | مالكي' : 'Schafi\'i | Hanbali | Maliki'}
            </span>
            <div dir="ltr">
              <Switch
                checked={!isHanafi}
                onCheckedChange={() => setPrayerMadhab('shafii')}
              />
            </div>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="font-semibold text-[15px] text-foreground">
              {isAr ? 'حنفي' : 'Hanafi'}
            </span>
            <div dir="ltr">
              <Switch
                checked={isHanafi}
                onCheckedChange={() => setPrayerMadhab('hanafi')}
              />
            </div>
          </div>
        </motion.div>

        {/* Info */}
        <motion.div variants={item} className="premium-card-elevated p-4">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {isAr
              ? 'يختلف مذهب الأحناف عن غيره في وقت صلاتي العصر والعشاء؛ فيتأخر عن غيره نحو 30 دقيقة في العصر، ونحو 12 دقيقة في العشاء، بحسب اختلاف البلدان والفصول.'
              : 'Die hanafitische Schule unterscheidet sich bei Asr und Isha. Asr ist ca. 30 Min. später, Isha ca. 12 Min., je nach Land und Jahreszeit.'}
          </p>
        </motion.div>

        {/* High Latitude Adjustment Methods - mutually exclusive */}
        <motion.div variants={item} className="premium-card-elevated overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border/50">
            <span className="font-semibold text-[15px] text-foreground">
              {isAr ? 'منتصف الليل' : 'Mitternacht'}
            </span>
            <div dir="ltr">
              <Switch
                checked={latitudeAdjMethod === 'middle'}
                onCheckedChange={() => setLatitudeAdjMethod('middle')}
              />
            </div>
          </div>
          <div className="p-4 flex items-center justify-between border-b border-border/50">
            <span className="font-semibold text-[15px] text-foreground">
              {isAr ? 'سُبع الليل' : 'Ein Siebtel der Nacht'}
            </span>
            <div dir="ltr">
              <Switch
                checked={latitudeAdjMethod === 'seventh'}
                onCheckedChange={() => setLatitudeAdjMethod('seventh')}
              />
            </div>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="font-semibold text-[15px] text-foreground">
              {isAr ? 'باستخدام الزاوية' : 'Winkelbasiert'}
            </span>
            <div dir="ltr">
              <Switch
                checked={latitudeAdjMethod === 'angle'}
                onCheckedChange={() => setLatitudeAdjMethod('angle')}
              />
            </div>
          </div>
        </motion.div>

        {/* DST */}
        <motion.div variants={item} className="premium-card-elevated overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <span className="font-semibold text-[15px] text-foreground">
              {isAr ? 'التوقيت الصيفي' : 'Sommerzeit'}
            </span>
            <div dir="ltr">
              <Switch
                checked={dstEnabled}
                onCheckedChange={setDstEnabled}
              />
            </div>
          </div>
        </motion.div>

        {/* Reset Button */}
        <motion.div variants={item}>
          <button
            onClick={resetDefaults}
            className="w-full py-3.5 rounded-2xl bg-destructive text-destructive-foreground font-semibold text-[15px] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {isAr ? 'العودة للإعدادات الافتراضية' : 'Standardeinstellungen wiederherstellen'}
          </button>
        </motion.div>

        {/* Close Button */}
        <motion.div variants={item}>
          <button
            onClick={() => navigate('/settings')}
            className="w-full py-3.5 rounded-2xl border-2 border-border text-foreground font-semibold text-[15px] active:scale-[0.98] transition-transform"
          >
            {isAr ? 'إغلاق' : 'Schließen'}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
