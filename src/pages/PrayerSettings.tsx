import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { BookOpen, RotateCcw, Info, Check } from '@/lib/icons';
import { motion } from 'framer-motion';
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

type PrayerMadhab = 'shafii' | 'hanafi' | 'hanbali' | 'maliki';
type LatMethod = 'middle' | 'seventh' | 'angle';

/**
 * Single radio-style row inside a grouped card. Clean accessible alternative
 * to the previous "Switch used for mutually-exclusive options" anti-pattern.
 */
function RadioRow({
  selected,
  onSelect,
  label,
  hint,
  isLast = false,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  hint?: string;
  isLast?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 active:bg-muted/30 transition-colors text-start ${
        isLast ? '' : 'border-b border-border/50'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[15px] text-foreground leading-tight">{label}</p>
        {hint && <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>}
      </div>
      <div
        className={`relative w-[22px] h-[22px] rounded-full border-2 shrink-0 transition-colors ${
          selected ? 'border-primary' : 'border-muted-foreground/40'
        }`}
        aria-hidden
      >
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="absolute inset-1 rounded-full bg-primary flex items-center justify-center"
          >
            <Check className="w-3 h-3 text-primary-foreground stroke-[3]" />
          </motion.div>
        )}
      </div>
    </button>
  );
}

export default function PrayerSettings() {
  const {
    language, prayerMadhab, setPrayerMadhab,
    latitudeAdjMethod, setLatitudeAdjMethod,
    dstEnabled, setDstEnabled,
  } = useApp();
  const isAr = language === 'ar';

  const resetDefaults = () => {
    setPrayerMadhab('shafii');
    setLatitudeAdjMethod('angle');
    setDstEnabled(true);
  };

  const madhabs: { id: PrayerMadhab; labelAr: string; labelDe: string; hintAr: string; hintDe: string }[] = [
    {
      id: 'shafii',
      labelAr: 'الشافعي',
      labelDe: "Schafi'i",
      hintAr: 'الأكثر شيوعاً في جنوب شرق آسيا واليمن',
      hintDe: 'Verbreitet in Südostasien und Jemen',
    },
    {
      id: 'hanafi',
      labelAr: 'الحنفي',
      labelDe: 'Hanafi',
      hintAr: 'يتأخر عن غيره في العصر بنحو 30 دقيقة',
      hintDe: 'Asr ca. 30 Min. später als bei anderen',
    },
    {
      id: 'hanbali',
      labelAr: 'الحنبلي',
      labelDe: 'Hanbali',
      hintAr: 'الأكثر شيوعاً في الجزيرة العربية',
      hintDe: 'Verbreitet auf der Arabischen Halbinsel',
    },
    {
      id: 'maliki',
      labelAr: 'المالكي',
      labelDe: 'Maliki',
      hintAr: 'الأكثر شيوعاً في شمال وغرب أفريقيا',
      hintDe: 'Verbreitet in Nord- und Westafrika',
    },
  ];

  const latMethods: { id: LatMethod; labelAr: string; labelDe: string; hintAr: string; hintDe: string }[] = [
    {
      id: 'middle',
      labelAr: 'منتصف الليل',
      labelDe: 'Mitternacht',
      hintAr: 'مناسب لخطوط العرض المعتدلة',
      hintDe: 'Geeignet für gemäßigte Breiten',
    },
    {
      id: 'seventh',
      labelAr: 'سُبع الليل',
      labelDe: 'Ein Siebtel der Nacht',
      hintAr: 'الطريقة الأكثر اعتدالاً',
      hintDe: 'Die ausgeglichenste Methode',
    },
    {
      id: 'angle',
      labelAr: 'باستخدام الزاوية',
      labelDe: 'Winkelbasiert',
      hintAr: 'الأدق علمياً للمناطق ذات خط العرض العالي',
      hintDe: 'Wissenschaftlich am genauesten für hohe Breiten',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-lg mx-auto">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3 mb-1">
          <BackButton to="/settings" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary stroke-[1.8]" />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">
              {isAr ? 'إعدادات الصلاة' : 'Gebetseinstellungen'}
            </h1>
          </div>
        </motion.div>

        {/* Madhab Section */}
        <motion.div variants={item}>
          <p className="text-[13px] font-medium text-muted-foreground mb-2.5 px-1">
            {isAr ? 'المذهب الفقهي' : 'Rechtsschule'}
          </p>
          <div role="radiogroup" aria-label={isAr ? 'المذهب الفقهي' : 'Rechtsschule'} className="premium-card-elevated overflow-hidden">
            {madhabs.map((m, idx) => (
              <RadioRow
                key={m.id}
                selected={prayerMadhab === m.id}
                onSelect={() => setPrayerMadhab(m.id)}
                label={isAr ? m.labelAr : m.labelDe}
                hint={isAr ? m.hintAr : m.hintDe}
                isLast={idx === madhabs.length - 1}
              />
            ))}
          </div>
        </motion.div>

        {/* Info note */}
        <motion.div variants={item} className="flex gap-3 rounded-2xl bg-primary/5 border border-primary/15 p-4">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {isAr
              ? 'يختلف مذهب الأحناف عن غيره في وقت صلاتي العصر والعشاء؛ فيتأخر عن غيره نحو 30 دقيقة في العصر، ونحو 12 دقيقة في العشاء، بحسب اختلاف البلدان والفصول.'
              : 'Die hanafitische Schule unterscheidet sich bei Asr und Isha. Asr ist ca. 30 Min. später, Isha ca. 12 Min., je nach Land und Jahreszeit.'}
          </p>
        </motion.div>

        {/* High Latitude Adjustment Methods */}
        <motion.div variants={item}>
          <p className="text-[13px] font-medium text-muted-foreground mb-2.5 px-1">
            {isAr ? 'ضبط خطوط العرض العالية' : 'Anpassung für hohe Breiten'}
          </p>
          <div role="radiogroup" aria-label={isAr ? 'ضبط خطوط العرض' : 'Breitenanpassung'} className="premium-card-elevated overflow-hidden">
            {latMethods.map((m, idx) => (
              <RadioRow
                key={m.id}
                selected={latitudeAdjMethod === m.id}
                onSelect={() => setLatitudeAdjMethod(m.id)}
                label={isAr ? m.labelAr : m.labelDe}
                hint={isAr ? m.hintAr : m.hintDe}
                isLast={idx === latMethods.length - 1}
              />
            ))}
          </div>
        </motion.div>

        {/* DST Toggle (boolean — Switch is correct here) */}
        <motion.div variants={item}>
          <p className="text-[13px] font-medium text-muted-foreground mb-2.5 px-1">
            {isAr ? 'إعدادات إضافية' : 'Weitere Einstellungen'}
          </p>
          <div className="premium-card-elevated overflow-hidden">
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] text-foreground leading-tight">
                  {isAr ? 'التوقيت الصيفي' : 'Sommerzeit'}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                  {isAr ? 'تطبيق التوقيت الصيفي على مواقيت الصلاة' : 'Sommerzeit auf Gebetszeiten anwenden'}
                </p>
              </div>
              <div dir="ltr" className="shrink-0">
                <Switch checked={dstEnabled} onCheckedChange={setDstEnabled} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Reset Button */}
        <motion.div variants={item} className="pt-2">
          <button
            onClick={resetDefaults}
            className="w-full py-3.5 rounded-2xl bg-destructive/10 text-destructive font-semibold text-[15px] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 hover:bg-destructive/15"
          >
            <RotateCcw className="w-4 h-4" />
            {isAr ? 'العودة للإعدادات الافتراضية' : 'Standardeinstellungen wiederherstellen'}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
