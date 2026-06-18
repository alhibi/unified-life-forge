import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { BookOpen, RotateCcw, Info, Check } from '@/lib/icons';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import BackButton from '@/components/BackButton';

const stagger = {
  hidden: {},

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
    calcMethod, setCalcMethod,
  } = useApp();
  const isAr = language === 'ar';

  const resetDefaults = () => {
    setPrayerMadhab('shafii');
    setLatitudeAdjMethod('angle');
    setDstEnabled(true);
    setCalcMethod('auto');
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

  // Sunni-only calculation methods (Aladhan IDs). Shia methods (0, 7) excluded.
  type CalcOption = { id: 'auto' | number; labelAr: string; labelDe: string; hintAr: string; hintDe: string };
  const calcOptions: CalcOption[] = [
    { id: 'auto', labelAr: 'تلقائي (موصى به)', labelDe: 'Automatisch (empfohlen)',
      hintAr: 'يختار الطريقة الأنسب لبلدك حسب الموقع', hintDe: 'Wählt die passende Methode je nach Land' },
    { id: 4,  labelAr: 'أم القرى (السعودية)', labelDe: 'Umm al-Qura (Saudi-Arabien)',
      hintAr: 'الطريقة الرسمية في المملكة العربية السعودية', hintDe: 'Offizielle Methode Saudi-Arabiens' },
    { id: 5,  labelAr: 'الهيئة المصرية العامة للمساحة', labelDe: 'Ägyptische Generalbehörde',
      hintAr: 'مصر، السودان، وكثير من إفريقيا', hintDe: 'Ägypten, Sudan, Teile Afrikas' },
    { id: 3,  labelAr: 'رابطة العالم الإسلامي', labelDe: 'Muslim World League',
      hintAr: 'الأكثر استخداماً عالمياً', hintDe: 'Weltweit am häufigsten verwendet' },
    { id: 2,  labelAr: 'ISNA (أمريكا الشمالية)', labelDe: 'ISNA (Nordamerika)',
      hintAr: 'الجمعية الإسلامية لأمريكا الشمالية', hintDe: 'Islamic Society of North America' },
    { id: 1,  labelAr: 'جامعة كراتشي', labelDe: 'Universität Karatschi',
      hintAr: 'باكستان، الهند، بنغلاديش، أفغانستان', hintDe: 'Pakistan, Indien, Bangladesch' },
    { id: 13, labelAr: 'دياناتا (تركيا)', labelDe: 'Diyanet (Türkei)',
      hintAr: 'الرئاسة التركية للشؤون الدينية', hintDe: 'Türkische Religionsbehörde' },
    { id: 16, labelAr: 'الإمارات (دبي)', labelDe: 'VAE (Dubai)',
      hintAr: 'الإمارات العربية المتحدة', hintDe: 'Vereinigte Arabische Emirate' },
    { id: 8,  labelAr: 'منطقة الخليج', labelDe: 'Golfregion',
      hintAr: 'البحرين، عُمان وما حولها', hintDe: 'Bahrain, Oman, Golfstaaten' },
    { id: 9,  labelAr: 'الكويت', labelDe: 'Kuwait', hintAr: 'وزارة الأوقاف الكويتية', hintDe: 'Kuwaitisches Awqaf-Ministerium' },
    { id: 10, labelAr: 'قطر', labelDe: 'Katar', hintAr: 'دولة قطر', hintDe: 'Staat Katar' },
    { id: 23, labelAr: 'الأردن', labelDe: 'Jordanien', hintAr: 'وزارة الأوقاف الأردنية', hintDe: 'Jordanisches Awqaf-Ministerium' },
    { id: 17, labelAr: 'جاكيم (ماليزيا)', labelDe: 'JAKIM (Malaysia)',
      hintAr: 'ماليزيا، بروناي، الفلبين', hintDe: 'Malaysia, Brunei, Philippinen' },
    { id: 20, labelAr: 'كيمناڠ (إندونيسيا)', labelDe: 'KEMENAG (Indonesien)',
      hintAr: 'وزارة الشؤون الدينية الإندونيسية', hintDe: 'Indonesisches Religionsministerium' },
    { id: 11, labelAr: 'مويس (سنغافورة)', labelDe: 'MUIS (Singapur)',
      hintAr: 'مجلس علماء سنغافورة', hintDe: 'Islamischer Rat von Singapur' },
    { id: 18, labelAr: 'تونس', labelDe: 'Tunesien', hintAr: 'الجمهورية التونسية', hintDe: 'Tunesische Republik' },
    { id: 19, labelAr: 'الجزائر', labelDe: 'Algerien', hintAr: 'الجمهورية الجزائرية', hintDe: 'Algerische Republik' },
    { id: 21, labelAr: 'المغرب', labelDe: 'Marokko', hintAr: 'المملكة المغربية', hintDe: 'Königreich Marokko' },
    { id: 22, labelAr: 'لشبونة (البرتغال)', labelDe: 'Lissabon (Portugal)',
      hintAr: 'الجالية الإسلامية بلشبونة', hintDe: 'Islamische Gemeinschaft Lissabon' },
    { id: 12, labelAr: 'فرنسا (UOIF)', labelDe: 'Frankreich (UOIF)',
      hintAr: 'اتحاد المنظمات الإسلامية بفرنسا', hintDe: 'Französischer Muslim-Dachverband' },
    { id: 14, labelAr: 'روسيا', labelDe: 'Russland', hintAr: 'الإدارة الروحية لمسلمي روسيا', hintDe: 'Geistliche Verwaltung Russlands' },
    { id: 15, labelAr: 'لجنة رؤية الهلال العالمية', labelDe: 'Moonsighting Committee',
      hintAr: 'موصى بها لخطوط العرض العالية', hintDe: 'Empfohlen für hohe Breiten' },
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

        {/* Calculation Method (Sunni only) */}
        <motion.div variants={item}>
          <p className="text-[13px] font-medium text-muted-foreground mb-2.5 px-1">
            {isAr ? 'طريقة حساب التواقيت' : 'Berechnungsmethode'}
          </p>
          <div role="radiogroup" aria-label={isAr ? 'طريقة الحساب' : 'Berechnungsmethode'} className="premium-card-elevated overflow-hidden">
            {calcOptions.map((m, idx) => (
              <RadioRow
                key={String(m.id)}
                selected={calcMethod === m.id}
                onSelect={() => setCalcMethod(m.id)}
                label={isAr ? m.labelAr : m.labelDe}
                hint={isAr ? m.hintAr : m.hintDe}
                isLast={idx === calcOptions.length - 1}
              />
            ))}
          </div>
        </motion.div>

        {/* Hybrid note */}
        <motion.div variants={item} className="flex gap-3 rounded-2xl bg-primary/5 border border-primary/15 p-4">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {isAr
              ? 'يستخدم التطبيق نظاماً هجيناً: حساب رسمي عبر الإنترنت مع توقيت محلي احتياطي عبر معادلات فلكية، ليعمل بدقة في جميع دول العالم وحتى دون اتصال.'
              : 'Die App nutzt einen Hybrid-Ansatz: offizielle Online-Berechnung mit lokalem astronomischem Fallback — präzise weltweit, auch offline.'}
          </p>
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
