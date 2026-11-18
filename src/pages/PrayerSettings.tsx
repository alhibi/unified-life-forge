import { motion } from 'framer-motion';
import React from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import { usePrayerNotifications } from '@/hooks/usePrayerNotifications';
import { BookOpen, Check, Info, RotateCcw } from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';
import { PRAYER_NAMES, PRAYER_TITLES_AR } from '@/lib/prayerNotifications';

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
      className={`flex min-h-[var(--ui-touch-min)] w-full items-center justify-between gap-3 px-4 py-3.5 text-start transition-colors active:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isLast ? '' : 'border-b border-border/50'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-meta font-semibold leading-tight text-foreground">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-mini leading-snug text-muted-foreground">{hint}</span>
        )}
      </span>
      <span
        className={`relative h-[22px] w-[22px] shrink-0 rounded-full border-2 transition-colors ${
          selected ? 'border-primary' : 'border-muted-foreground/40'
        }`}
        aria-hidden
      >
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="absolute inset-1 flex items-center justify-center rounded-full bg-primary"
          >
            <Check className="h-3 w-3 stroke-[3] text-primary-foreground" />
          </motion.span>
        )}
      </span>
    </button>
  );
}

/**
 * One settings group. The active value lives in the header, so a person can
 * read the whole page's current configuration without opening a single card —
 * the five flat radio lists used to force a 5,000px scroll-hunt for that.
 */
function Group({
  title,
  value,
  children,
}: {
  title: string;
  value?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-meta font-semibold text-muted-foreground">{title}</h2>
        {value != null && (
          <span className="shrink-0 text-mini font-medium tabular-nums text-foreground">{value}</span>
        )}
      </div>
      {children}
    </section>
  );
}

export default function PrayerSettings() {
  const {
    prayerMadhab, setPrayerMadhab,
    latitudeAdjMethod, setLatitudeAdjMethod,
    dstEnabled, setDstEnabled,
    calcMethod, setCalcMethod,
  } = useApp();
  const notifications = usePrayerNotifications();

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

  const activeMadhab = madhabs.find((m) => m.id === prayerMadhab)?.labelAr ?? '—';
  const activeLat = latMethods.find((m) => m.id === latitudeAdjMethod)?.labelAr ?? '—';
  const activeCalc = calcOptions.find((m) => m.id === calcMethod) ?? calcOptions[0];

  return (
    <PageShell
      header={
        <PageHeader
          title="إعدادات الصلاة"
          subtitle="المواقيت والمذهب والتنبيهات"
          backTo="/settings"
          sticky
          icon={<span className="row-icon"><BookOpen className="h-4 w-4" aria-hidden /></span>}
        />
      }
    >
      <SEO
        title={'إعدادات الصلاة — amv.life'}
        description={'اختر المذهب وطريقة الحساب وضبط خطوط العرض العالية وتنبيهات الصلاة في amv.life.'}
        path="/settings/prayer"
      />
      <motion.div variants={stagger} initial="hidden" animate="show" className="app-stack">
        {/* Madhab */}
        <motion.div variants={item}>
          <Group title="المذهب الفقهي" value={activeMadhab}>
            <AppCard
              className="divide-y divide-border/30 overflow-hidden p-0"
              role="radiogroup"
              aria-label="المذهب الفقهي"
            >
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
            <p className="px-1 text-micro leading-relaxed text-muted-foreground">
              يختلف مذهب الأحناف عن غيره في وقت صلاتي العصر والعشاء؛ فيتأخر عن غيره نحو ٣٠ دقيقة في
              العصر، ونحو ١٢ دقيقة في العشاء، بحسب اختلاف البلدان والفصول.
            </p>
          </Group>
        </motion.div>

        {/* Calculation method — 22 options, one control. */}
        <motion.div variants={item}>
          <Group title="طريقة حساب التواقيت" value={activeCalc.labelAr}>
            <AppCard className="space-y-3">
              <Select
                value={String(calcMethod)}
                onValueChange={(value) =>
                  setCalcMethod(value === 'auto' ? 'auto' : Number(value))
                }
              >
                <SelectTrigger
                  aria-label="طريقة حساب التواقيت"
                  className="w-full justify-between"
                >
                  <span className="truncate text-start text-body font-semibold text-foreground">
                    {activeCalc.labelAr}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {calcOptions.map((option) => (
                    <SelectItem key={String(option.id)} value={String(option.id)}>
                      {option.labelAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-mini leading-relaxed text-muted-foreground">
                {activeCalc.hintAr}
              </p>
              <p className="border-t border-border/50 pt-3 text-micro leading-relaxed text-muted-foreground">
                يستخدم التطبيق نظاماً هجيناً: حساب رسمي عبر الإنترنت مع توقيت محلي احتياطي عبر
                معادلات فلكية، ليعمل بدقة في جميع دول العالم وحتى دون اتصال.
              </p>
            </AppCard>
          </Group>
        </motion.div>

        {/* High-latitude adjustment */}
        <motion.div variants={item}>
          <Group title="ضبط خطوط العرض العالية" value={activeLat}>
            <AppCard
              className="divide-y divide-border/30 overflow-hidden p-0"
              role="radiogroup"
              aria-label="ضبط خطوط العرض"
            >
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
            <p className="px-1 text-micro leading-relaxed text-muted-foreground">
              تُستخدم هذه الطرق عندما تغيب الشمس أو يختفي الشفق لأيام في خطوط العرض العالية.
            </p>
          </Group>
        </motion.div>

        {/* Reminders — OS-scheduled, so they fire offline. */}
        {notifications.supported && (
          <motion.div variants={item}>
            <Group
              title="تنبيهات الصلاة"
              value={notifications.prefs.enabled ? 'مفعّلة' : 'متوقفة'}
            >
              <AppCard className="divide-y divide-border/30 overflow-hidden p-0">
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-meta font-semibold leading-tight text-foreground">
                      تنبيه عند دخول الوقت
                    </p>
                    <p className="mt-0.5 text-mini leading-snug text-muted-foreground">
                      يعمل بدون إنترنت، ويصل حتى مع إغلاق التطبيق
                    </p>
                  </div>
                  <div dir="ltr" className="shrink-0">
                    <Switch
                      checked={notifications.prefs.enabled}
                      onCheckedChange={notifications.setEnabled}
                      aria-label="تنبيهات الصلاة"
                    />
                  </div>
                </div>

                {notifications.prefs.enabled &&
                  PRAYER_NAMES.map((prayer) => (
                    <div
                      key={prayer}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <p className="text-meta font-medium text-foreground">
                        {PRAYER_TITLES_AR[prayer]}
                      </p>
                      <div dir="ltr" className="shrink-0">
                        <Switch
                          checked={notifications.prefs.prayers[prayer]}
                          onCheckedChange={(value) => notifications.setPrayer(prayer, value)}
                          aria-label={`تنبيه ${PRAYER_TITLES_AR[prayer]}`}
                        />
                      </div>
                    </div>
                  ))}

                {notifications.prefs.enabled && (
                  <div className="px-4 py-3.5" role="radiogroup" aria-label="التنبيه المسبق">
                    <p className="mb-2.5 text-meta font-semibold text-foreground">التنبيه المسبق</p>
                    <div dir="ltr" className="flex gap-2">
                      {[0, 5, 10, 15, 20].map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          role="radio"
                          aria-checked={notifications.prefs.leadMinutes === minutes}
                          onClick={() => notifications.setLeadMinutes(minutes)}
                          className={`min-h-[var(--ui-touch-min)] flex-1 rounded-md text-mini font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            notifications.prefs.leadMinutes === minutes
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          {minutes === 0 ? 'عند الأذان' : `${minutes}د`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </AppCard>

              {/* Honest status: silence here would be indistinguishable from a
                  working schedule until a prayer is actually missed. */}
              {notifications.problem === 'no-permission' && (
                <p className="px-1 text-mini leading-relaxed text-destructive">
                  لم يُسمح للتطبيق بإرسال التنبيهات. افتح إعدادات النظام وامنح الإذن لتصل تنبيهات
                  الصلاة.
                </p>
              )}
              {notifications.problem === 'error' && (
                <p className="px-1 text-mini leading-relaxed text-destructive">
                  تعذّر جدولة التنبيهات على هذا الجهاز. جرّب إيقاف التنبيهات وتشغيلها من جديد.
                </p>
              )}
              {!notifications.problem && notifications.scheduled ? (
                <p className="px-1 text-mini leading-relaxed text-muted-foreground">
                  { `تم جدولة ${notifications.scheduled} تنبيهاً لأسبوع قادم على الجهاز.` }
                </p>
              ) : null}
            </Group>
          </motion.div>
        )}

        {/* Extra */}
        <motion.div variants={item}>
          <Group title="إعدادات إضافية" value={dstEnabled ? 'التوقيت الصيفي: مفعّل' : 'التوقيت الصيفي: متوقف'}>
            <AppCard className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-meta font-semibold leading-tight text-foreground">
                    التوقيت الصيفي
                  </p>
                  <p className="mt-0.5 text-mini leading-snug text-muted-foreground">
                    تطبيق التوقيت الصيفي على مواقيت الصلاة
                  </p>
                </div>
                <div dir="ltr" className="shrink-0">
                  <Switch checked={dstEnabled} onCheckedChange={setDstEnabled} />
                </div>
              </div>
            </AppCard>
          </Group>
        </motion.div>

        {/* Reset */}
        <motion.div variants={item} className="pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={resetDefaults}
          >
            <RotateCcw className="h-4 w-4 text-destructive" aria-hidden />
            العودة للإعدادات الافتراضية
          </Button>
          <p className="mt-2 flex items-start gap-2 px-1 text-micro leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            يعيد المذهب وطريقة الحساب وضبط خطوط العرض والتوقيت الصيفي إلى قيمها الأصلية. لا يمسّ
            تنبيهات الصلاة.
          </p>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
