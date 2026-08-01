import { motion } from 'framer-motion';
import React from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard,PageShell, Section } from '@/components/ui/app-shell';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import { BookOpen, Check,Info, RotateCcw } from '@/lib/icons';
import { pageItem as item,pageStagger as stagger } from '@/lib/motion';

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
        <p className="font-semibold text-[0.9375rem] text-foreground leading-tight">{label}</p>
        {hint && <p className="text-[0.75rem] text-muted-foreground mt-0.5 leading-snug">{hint}</p>}
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
    prayerMadhab, setPrayerMadhab,
    latitudeAdjMethod, setLatitudeAdjMethod,
    dstEnabled, setDstEnabled,
    calcMethod, setCalcMethod,
  } = useApp();

  const resetDefaults = () => {
    setPrayerMadhab('shafii');
    setLatitudeAdjMethod('angle');
    setDstEnabled(true);
    setCalcMethod('auto');
  };

  const madhabs: { id: PrayerMadhab; labelAr: string; hintAr: string; }[] = [
    {
      id: 'shafii',
      labelAr: 'الشافعي',
      hintAr: 'الأكثر شيوعاً في جنوب شرق آسيا واليمن',
    },
    {
      id: 'hanafi',
      labelAr: 'الحنفي',
      hintAr: 'يتأخر عن غيره في العصر بنحو 30 دقيقة',
    },
    {
      id: 'hanbali',
      labelAr: 'الحنبلي',
      hintAr: 'الأكثر شيوعاً في الجزيرة العربية',
    },
    {
      id: 'maliki',
      labelAr: 'المالكي',
      hintAr: 'الأكثر شيوعاً في شمال وغرب أفريقيا',
    },
  ];

  const latMethods: { id: LatMethod; labelAr: string; hintAr: string; }[] = [
    {
      id: 'middle',
      labelAr: 'منتصف الليل',
      hintAr: 'مناسب لخطوط العرض المعتدلة',
    },
    {
      id: 'seventh',
      labelAr: 'سُبع الليل',
      hintAr: 'الطريقة الأكثر اعتدالاً',
    },
    {
      id: 'angle',
      labelAr: 'باستخدام الزاوية',
      hintAr: 'الأدق علمياً للمناطق ذات خط العرض العالي',
    },
  ];

  // Sunni-only calculation methods (Aladhan IDs). Shia methods (0, 7) excluded.
  type CalcOption = { id: 'auto' | number; labelAr: string; hintAr: string; };
  const calcOptions: CalcOption[] = [
    { id: 'auto', labelAr: 'تلقائي (موصى به)',
      hintAr: 'يختار الطريقة الأنسب لبلدك حسب الموقع', },
    { id: 4,  labelAr: 'أم القرى (السعودية)',
      hintAr: 'الطريقة الرسمية في المملكة العربية السعودية', },
    { id: 5,  labelAr: 'الهيئة المصرية العامة للمساحة',
      hintAr: 'مصر، السودان، وكثير من إفريقيا', },
    { id: 3,  labelAr: 'رابطة العالم الإسلامي',
      hintAr: 'الأكثر استخداماً عالمياً', },
    { id: 2,  labelAr: 'ISNA (أمريكا الشمالية)',
      hintAr: 'الجمعية الإسلامية لأمريكا الشمالية', },
    { id: 1,  labelAr: 'جامعة كراتشي',
      hintAr: 'باكستان، الهند، بنغلاديش، أفغانستان', },
    { id: 13, labelAr: 'دياناتا (تركيا)',
      hintAr: 'الرئاسة التركية للشؤون الدينية', },
    { id: 16, labelAr: 'الإمارات (دبي)',
      hintAr: 'الإمارات العربية المتحدة', },
    { id: 8,  labelAr: 'منطقة الخليج',
      hintAr: 'البحرين، عُمان وما حولها', },
    { id: 9,  labelAr: 'الكويت', hintAr: 'وزارة الأوقاف الكويتية', },
    { id: 10, labelAr: 'قطر', hintAr: 'دولة قطر', },
    { id: 23, labelAr: 'الأردن', hintAr: 'وزارة الأوقاف الأردنية', },
    { id: 17, labelAr: 'جاكيم (ماليزيا)',
      hintAr: 'ماليزيا، بروناي، الفلبين', },
    { id: 20, labelAr: 'كيمناڠ (إندونيسيا)',
      hintAr: 'وزارة الشؤون الدينية الإندونيسية', },
    { id: 11, labelAr: 'مويس (سنغافورة)',
      hintAr: 'مجلس علماء سنغافورة', },
    { id: 18, labelAr: 'تونس', hintAr: 'الجمهورية التونسية', },
    { id: 19, labelAr: 'الجزائر', hintAr: 'الجمهورية الجزائرية', },
    { id: 21, labelAr: 'المغرب', hintAr: 'المملكة المغربية', },
    { id: 22, labelAr: 'لشبونة (البرتغال)',
      hintAr: 'الجالية الإسلامية بلشبونة', },
    { id: 12, labelAr: 'فرنسا (UOIF)',
      hintAr: 'اتحاد المنظمات الإسلامية بفرنسا', },
    { id: 14, labelAr: 'روسيا', hintAr: 'الإدارة الروحية لمسلمي روسيا', },
    { id: 15, labelAr: 'لجنة رؤية الهلال العالمية',
      hintAr: 'موصى بها لخطوط العرض العالية', },
  ];

  return (
    <PageShell className="pt-14">
      <SEO
        title={'إعدادات الصلاة — SmartHub'}
        description={'اختر المذهب وطريقة الحساب لأوقات الصلاة في SmartHub.'}
        path="/settings/prayer"
      />
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-lg mx-auto">
        {/* Header */}
        <motion.div variants={item}>
          <PageHeader
            title="إعدادات الصلاة"
            backTo="/settings"
            icon={<span className="row-icon"><BookOpen className="w-4 h-4" aria-hidden /></span>}
          />
        </motion.div>

        {/* Madhab Section */}
        <motion.div variants={item}>
          <Section label="المذهب الفقهي">
          <AppCard className="p-0 overflow-hidden divide-y divide-border/30" role="radiogroup" aria-label="المذهب الفقهي">
            {madhabs.map((m, idx) => (
              <RadioRow
                key={m.id}
                selected={prayerMadhab === m.id}
                onSelect={() => setPrayerMadhab(m.id)}
                label={m.labelAr}
                hint={m.hintAr}
                isLast={idx === madhabs.length - 1}
              />
            ))}
          </AppCard>
          </Section>
        </motion.div>

        {/* Calculation Method (Sunni only) */}
        <motion.div variants={item}>
          <Section label="طريقة حساب التواقيت">
          <AppCard className="p-0 overflow-hidden divide-y divide-border/30" role="radiogroup" aria-label="طريقة الحساب">
            {calcOptions.map((m, idx) => (
              <RadioRow
                key={String(m.id)}
                selected={calcMethod === m.id}
                onSelect={() => setCalcMethod(m.id)}
                label={m.labelAr}
                hint={m.hintAr}
                isLast={idx === calcOptions.length - 1}
              />
            ))}
          </AppCard>
          </Section>
        </motion.div>

        {/* Hybrid note */}
        <motion.div variants={item} className="flex gap-3 rounded-2xl bg-primary/5 border border-primary/15 p-4">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[0.75rem] text-muted-foreground leading-relaxed">
            {'يستخدم التطبيق نظاماً هجيناً: حساب رسمي عبر الإنترنت مع توقيت محلي احتياطي عبر معادلات فلكية، ليعمل بدقة في جميع دول العالم وحتى دون اتصال.'}
          </p>
        </motion.div>

        {/* Info note */}
        <motion.div variants={item} className="flex gap-3 rounded-2xl bg-primary/5 border border-primary/15 p-4">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[0.75rem] text-muted-foreground leading-relaxed">
            {'يختلف مذهب الأحناف عن غيره في وقت صلاتي العصر والعشاء؛ فيتأخر عن غيره نحو 30 دقيقة في العصر، ونحو 12 دقيقة في العشاء، بحسب اختلاف البلدان والفصول.'}
          </p>
        </motion.div>

        {/* High Latitude Adjustment Methods */}
        <motion.div variants={item}>
          <Section label="ضبط خطوط العرض العالية">
          <AppCard className="p-0 overflow-hidden divide-y divide-border/30" role="radiogroup" aria-label="ضبط خطوط العرض">
            {latMethods.map((m, idx) => (
              <RadioRow
                key={m.id}
                selected={latitudeAdjMethod === m.id}
                onSelect={() => setLatitudeAdjMethod(m.id)}
                label={m.labelAr}
                hint={m.hintAr}
                isLast={idx === latMethods.length - 1}
              />
            ))}
          </AppCard>
          </Section>
        </motion.div>

        {/* DST Toggle (boolean — Switch is correct here) */}
        <motion.div variants={item}>
          <Section label="إعدادات إضافية">
          <AppCard className="p-0 overflow-hidden divide-y divide-border/30">
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[0.9375rem] text-foreground leading-tight">
                  {'التوقيت الصيفي'}
                </p>
                <p className="text-[0.75rem] text-muted-foreground mt-0.5 leading-snug">
                  {'تطبيق التوقيت الصيفي على مواقيت الصلاة'}
                </p>
              </div>
              <div dir="ltr" className="shrink-0">
                <Switch checked={dstEnabled} onCheckedChange={setDstEnabled} />
              </div>
            </div>
          </AppCard>
          </Section>
        </motion.div>

        {/* Reset Button */}
        <motion.div variants={item} className="pt-2">
          <button
            onClick={resetDefaults}
            className="w-full py-3.5 rounded-2xl bg-destructive/10 text-destructive font-semibold text-[0.9375rem] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 hover:bg-destructive/15"
          >
            <RotateCcw className="w-4 h-4" />
            {'العودة للإعدادات الافتراضية'}
          </button>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
