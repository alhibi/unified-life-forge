import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { FpsCap } from '@/contexts/AppContext';
import { useApp } from '@/contexts/AppContext';
import {
  ChoiceRow,
  type InspectorEntry,
  SegmentedControl,
  SettingsSection,
  SliderRow,
  ToggleRow,
  TokenInspector,
} from '@/features/appearance';
import {
  Activity,
  Compass,
  Gauge,
  Info,
  Layers,
  RefreshCcw,
  Rows3,
  Sparkles,
  Target,
  Timer,
  Zap,
} from '@/lib/icons';
import { NAV_STYLE_META } from '@/lib/motion';
import {
  matchMotionPreset,
  MAX_GESTURE_SENSITIVITY,
  MAX_LIST_STAGGER,
  MAX_NAV_DURATION,
  MAX_PRESS_FEEDBACK,
  MIN_GESTURE_SENSITIVITY,
  MIN_LIST_STAGGER,
  MIN_NAV_DURATION,
  MIN_PRESS_FEEDBACK,
  MOTION_PRESETS,
} from '@/lib/motionPreferences';
import { getNativeHz, measureDisplayHz } from '@/lib/motionRuntime';

import LiveMotionPreview from './LiveMotionPreview';
import PerformancePanel from './PerformancePanel';

const SPEED_PRESETS = [
  { value: 0.5, label: 'هادئ' },
  { value: 0.75, label: 'لطيف' },
  { value: 1, label: 'افتراضي' },
  { value: 1.25, label: 'سريع' },
  // Deliberately not "فوري": that is the name of a complete motion character in
  // the presets above, and two different controls on one screen must not offer
  // the same word for two different things.
  { value: 1.5, label: 'خاطف' },
] as const;

const AMPLITUDE_PRESETS = [
  { value: 0, label: 'بدون' },
  { value: 0.5, label: 'خفيف' },
  { value: 1, label: 'افتراضي' },
  // Same reasoning as the speed chips: "سينمائي" is a preset name.
  { value: 1.5, label: 'واسع' },
] as const;

const BOUNCE_PRESETS = [
  { value: 0, label: 'جاف' },
  { value: 0.35, label: 'خفيف' },
  { value: 0.7, label: 'واضح' },
  { value: 1, label: 'أقصى' },
] as const;

const NAV_DURATION_PRESETS = [
  { value: 0.6, label: 'أسرع' },
  { value: 1, label: 'افتراضي' },
  { value: 1.4, label: 'أهدأ' },
] as const;

const STAGGER_PRESETS = [
  { value: 0, label: 'دفعة واحدة' },
  { value: 1, label: 'افتراضي' },
  { value: 2, label: 'متتابع' },
] as const;

const PRESS_PRESETS = [
  { value: 0, label: 'بلا حركة' },
  { value: 1, label: 'افتراضي' },
  { value: 1.6, label: 'قوي' },
] as const;

const GESTURE_PRESETS = [
  { value: 0.5, label: 'متحفّظ' },
  { value: 1, label: 'افتراضي' },
  { value: 1.8, label: 'حسّاس' },
] as const;

const FPS_OPTIONS: { value: FpsCap; label: string }[] = [
  { value: 'auto', label: 'تلقائي' },
  { value: 60, label: '60' },
  { value: 90, label: '90' },
  { value: 120, label: '120' },
];

const EASING_CHOICES = [
  { id: 'silk', label: 'حرير', note: 'منحنيات تتباطأ وتستقرّ بلا أي تجاوز — لا ارتداد في أي مكان' },
  { id: 'standard', label: 'قياسي', note: 'منحنيات ماتيريال ٣: تسارع للخروج وتباطؤ للدخول' },
  {
    id: 'expressive',
    label: 'مُعبّر',
    note: 'منحنيات أسّية ونابض حقيقي على الضغط — يسمح بالتجاوز',
  },
] as const;

const SCROLL_CHOICES = [
  {
    id: 'silk',
    label: 'حريري',
    note: 'يعلّق عمل التمرير غير المرئي أثناء الاندفاع: الاختبار اللمسي وانتقالات الألوان والحركات الزخرفية',
  },
  { id: 'native', label: 'أصلي', note: 'سلوك المتصفح دون أي تدخّل' },
  { id: 'smooth', label: 'ناعم', note: 'حريري، مع تمرير متحرّك لروابط الإرساء والقفزات البرمجية' },
] as const;

const OVERLAY_CHOICES = [
  { id: 'fade', label: 'تلاشٍ', note: 'شفافية فقط — لا انبثاق ولا تكبير في القوائم والحوارات' },
  { id: 'lift', label: 'ارتفاع', note: 'تلاشٍ مع صعود قصير ٦ بكسل' },
  { id: 'scale', label: 'تكبير', note: 'التلاشي مع تكبير من ٩٥٪ — الطابع الكلاسيكي' },
] as const;

const percent = (value: number) => `${Math.round(value * 100)}٪`;

/**
 * "الحركة والأداء" — the motion platform.
 *
 * The screen is ordered by how far a setting reaches: the complete characters
 * first, then the three choices that define the app's whole motion language
 * (navigation, easing, scrolling), then the surfaces, then the fine numbers,
 * then the frame budget and its live measurement.
 *
 * Every control here is genuinely global. There is no cosmetic setting on this
 * screen: each one either mutates the shared `MOTION` token object that
 * framer-motion reads, or publishes a CSS custom property / data attribute that
 * `index.css` reads — and usually both, so framer-motion, Radix,
 * tailwindcss-animate, vaul and sonner all change together.
 */
export default function MotionSection() {
  const {
    motionSpeed,
    setMotionSpeed,
    motionAmplitude,
    setMotionAmplitude,
    springBounce,
    setSpringBounce,
    fpsCap,
    setFpsCap,
    navStyle,
    setNavStyle,
    easingProfile,
    setEasingProfile,
    scrollProfile,
    setScrollProfile,
    overlayStyle,
    setOverlayStyle,
    navDuration,
    setNavDuration,
    listStagger,
    setListStagger,
    pressFeedback,
    setPressFeedback,
    reduceMotion,
    setReduceMotion,
    gestureBack,
    setGestureBack,
    gestureSensitivity,
    setGestureSensitivity,
    adaptivePerformance,
    setAdaptivePerformance,
    compositorHints,
    setCompositorHints,
    applyMotionPreset,
    resetMotionPreferences,
  } = useApp();

  const [nativeHz, setNativeHz] = useState<number | null>(getNativeHz);

  useEffect(() => {
    if (nativeHz !== null) return;
    let cancelled = false;
    void measureDisplayHz().then((hz) => {
      if (!cancelled) setNativeHz(hz);
    });
    return () => {
      cancelled = true;
    };
  }, [nativeHz]);

  const preferences = useMemo(
    () => ({
      navStyle,
      easingProfile,
      scrollProfile,
      overlayStyle,
      navDuration,
      listStagger,
      pressFeedback,
      reduceMotion,
      gestureBack,
      gestureSensitivity,
      adaptivePerformance,
      compositorHints,
    }),
    [
      navStyle,
      easingProfile,
      scrollProfile,
      overlayStyle,
      navDuration,
      listStagger,
      pressFeedback,
      reduceMotion,
      gestureBack,
      gestureSensitivity,
      adaptivePerformance,
      compositorHints,
    ],
  );

  const activePreset = matchMotionPreset(preferences, {
    speed: motionSpeed,
    amplitude: motionAmplitude,
    bounce: springBounce,
  });

  /**
   * A signature that changes whenever anything motion-related changes. The live
   * preview keys off it, so a slider drag is felt on the very next frame rather
   * than only at the next real navigation.
   */
  const revision = useMemo(
    () =>
      [
        motionSpeed,
        motionAmplitude,
        springBounce,
        navDuration,
        listStagger,
        pressFeedback,
        easingProfile,
        navStyle,
        overlayStyle,
        reduceMotion,
      ].join('|'),
    [
      motionSpeed,
      motionAmplitude,
      springBounce,
      navDuration,
      listStagger,
      pressFeedback,
      easingProfile,
      navStyle,
      overlayStyle,
      reduceMotion,
    ],
  );

  /** What the frame budget resolves to, given the cap and the real panel. */
  const budgetHz = fpsCap === 'auto' ? (nativeHz ?? 60) : fpsCap;
  const capExceedsPanel = typeof fpsCap === 'number' && nativeHz !== null && fpsCap > nativeHz + 5;

  const inspectorEntries: readonly InspectorEntry[] = useMemo(
    () => [
      { token: '--motion-scale', label: 'مضاعف المدد', value: (1 / motionSpeed).toFixed(3) },
      { token: '--motion-nav-scale', label: 'مضاعف الانتقال', value: navDuration.toFixed(2) },
      { token: '--motion-amp', label: 'مضاعف المسافة', value: motionAmplitude.toFixed(2) },
      { token: '--motion-bounce', label: 'نسبة الارتداد', value: springBounce.toFixed(2) },
      { token: '--motion-stagger', label: 'إيقاع القوائم', value: listStagger.toFixed(2) },
      {
        token: '--motion-press-strength',
        label: 'قوة الضغط',
        value: pressFeedback.toFixed(2),
      },
      {
        token: '--motion-push',
        label: 'مدّة الدفع',
        value: `${Math.round(300 * (1 / motionSpeed) * navDuration)}ms`,
      },
      {
        token: '--motion-modal-in',
        label: 'دخول الطبقة',
        value: `${Math.round(320 * (1 / motionSpeed))}ms`,
      },
      { token: 'data-nav-style', label: 'نمط الانتقال', value: navStyle },
      { token: 'data-overlay-style', label: 'نمط الطبقات', value: overlayStyle },
      { token: 'data-scroll-profile', label: 'طابع التمرير', value: scrollProfile },
      {
        token: 'data-reduced-motion',
        label: 'تقليل الحركة',
        value: reduceMotion ? 'true (app)' : 'يتبع النظام',
      },
      {
        token: 'data-compositor-hints',
        label: 'تلميحات المُركّب',
        value: String(compositorHints),
      },
      {
        token: 'requestAnimationFrame',
        label: 'حد الإطارات',
        value: fpsCap === 'auto' ? 'غير مقيّد' : `${fpsCap} Hz`,
      },
    ],
    [
      motionSpeed,
      navDuration,
      motionAmplitude,
      springBounce,
      listStagger,
      pressFeedback,
      navStyle,
      overlayStyle,
      scrollProfile,
      reduceMotion,
      compositorHints,
      fpsCap,
    ],
  );

  return (
    <>
      {/* ── 1. Complete characters + live preview ──────────────────── */}
      <SettingsSection
        title="طوابع الحركة"
        subtitle="ستة طوابع كاملة تضبط كل شيء دفعة واحدة"
        icon={<Sparkles className="h-4 w-4" aria-hidden />}
      >
        <div className="flex flex-wrap gap-1.5">
          {MOTION_PRESETS.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyMotionPreset(preset.id)}
                aria-pressed={isActive}
                className={`min-h-[var(--ui-touch-min)] rounded-sm px-3 py-1.5 text-mini font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          {activePreset === null ? (
            <span className="rounded-sm bg-primary px-3 py-1.5 text-mini font-medium text-primary-foreground">
              مخصص
            </span>
          ) : null}
        </div>
        <p className="text-micro text-muted-foreground">
          {activePreset
            ? (MOTION_PRESETS.find((preset) => preset.id === activePreset)?.note ?? '')
            : 'إعدادات مضبوطة يدوياً — لا تطابق أي طابع جاهز'}
        </p>
        <LiveMotionPreview revision={revision} navStyle={navStyle} />
      </SettingsSection>

      {/* ── 2. Navigation character ────────────────────────────────── */}
      <SettingsSection
        title="انتقال الشاشات"
        subtitle="كيف تدخل الشاشة وكيف تخرج، وبأي سرعة"
        icon={<Compass className="h-4 w-4" aria-hidden />}
      >
        <ChoiceRow
          label="النمط"
          options={NAV_STYLE_META.map((style) => ({
            id: style.id,
            label: style.label,
            note: style.note,
          }))}
          value={navStyle}
          onChange={(value) => setNavStyle(value as typeof navStyle)}
          layoutId="navStyleIndicator"
        />
        <SliderRow
          label="مدّة الانتقال"
          valueLabel={percent(navDuration)}
          resolved={`${Math.round(220 * (1 / motionSpeed) * navDuration)}ms دخول`}
          value={navDuration}
          min={MIN_NAV_DURATION}
          max={MAX_NAV_DURATION}
          step={0.05}
          onChange={setNavDuration}
          presets={NAV_DURATION_PRESETS}
          note="يطال انتقالات الشاشات وحدها، فتبقى الأزرار والقوائم بسرعتها المستقلة."
        />
        <div className="flex items-start gap-2 text-mini leading-relaxed text-muted-foreground/80">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p>
            النمط «الحريري» لا يحرّك أي هندسة ولا يؤجّل الدخول لحظة واحدة، ولذلك هو الأثبت على ١٢٠
            هرتز: لا يوجد ما يُحسب لكل إطار سوى الشفافية، وهي تُنفَّذ على المُركّب مباشرة.
          </p>
        </div>
      </SettingsSection>

      {/* ── 3. Easing family ──────────────────────────────────────── */}
      <SettingsSection
        title="منحنى التسارع"
        subtitle="عائلة المنحنيات التي يتحدّث بها التطبيق كله"
        icon={<Activity className="h-4 w-4" aria-hidden />}
      >
        <ChoiceRow
          label="العائلة"
          options={EASING_CHOICES}
          value={easingProfile}
          onChange={(value) => setEasingProfile(value as typeof easingProfile)}
          layoutId="easingProfileIndicator"
        />
        <p className="text-micro text-muted-foreground">
          تصل هذه العائلة إلى framer-motion و Radix و vaul و sonner وردّ الضغط الأصلي في اللحظة
          نفسها. واختيار «حرير» يمنع أي تجاوز حتى لو كان مؤشّر الارتداد مرفوعاً.
        </p>
      </SettingsSection>

      {/* ── 4. Scrolling ──────────────────────────────────────────── */}
      <SettingsSection
        title="نعومة التمرير"
        subtitle="ما يحدث للإطار أثناء اندفاع الإصبع"
        icon={<Rows3 className="h-4 w-4" aria-hidden />}
      >
        <ChoiceRow
          label="الطابع"
          options={SCROLL_CHOICES}
          value={scrollProfile}
          onChange={(value) => setScrollProfile(value as typeof scrollProfile)}
          layoutId="scrollProfileIndicator"
        />
        <div className="flex items-start gap-2 text-mini leading-relaxed text-muted-foreground/80">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p>
            التمرير نفسه يعمل على المُركّب، فالكلفة الحقيقية هي ما يُطلب من المتصفح أثناءه: تحديد
            العنصر تحت الإصبع، وحساب حالة التحويم، وآلاف انتقالات الألوان في قائمة طويلة. الطابع
            الحريري يعلّقها ويستعيدها فوراً عند أول لمسة، فلا تُفقَد أي نقرة.
          </p>
        </div>
      </SettingsSection>

      {/* ── 5. Transient surfaces ─────────────────────────────────── */}
      <SettingsSection
        title="الطبقات العائمة"
        subtitle="ظهور القوائم والحوارات والتلميحات"
        icon={<Layers className="h-4 w-4" aria-hidden />}
      >
        <ChoiceRow
          label="النمط"
          options={OVERLAY_CHOICES}
          value={overlayStyle}
          onChange={(value) => setOverlayStyle(value as typeof overlayStyle)}
          layoutId="overlayStyleIndicator"
        />
        <p className="text-micro text-muted-foreground">
          تحتفظ الأوراق السفلية والأدراج بانزلاقها من حافتها دائماً — ورقة لا تأتي من حافة تتوقّف عن
          أن تُقرأ كورقة. يطال هذا الإعداد ما ظهوره زخرفي فقط.
        </p>
      </SettingsSection>

      {/* ── 6. The numbers ───────────────────────────────────────── */}
      <SettingsSection
        title="السرعة والمسافة والارتداد"
        subtitle="ثلاثة مضاعفات تطال كل حركة في التطبيق"
        icon={<Gauge className="h-4 w-4" aria-hidden />}
      >
        <SliderRow
          label="مضاعف السرعة"
          valueLabel={`${motionSpeed.toFixed(2)}×`}
          resolved={`مدد ×${(1 / motionSpeed).toFixed(2)}`}
          value={motionSpeed}
          min={0.5}
          max={1.5}
          step={0.05}
          onChange={setMotionSpeed}
          presets={SPEED_PRESETS}
          note="يقصّر أو يطيل كل مدّة: في framer-motion، وفي كل مدّة CSS، وفي النوابض معاً."
        />
        <SliderRow
          label="مسافة الحركة"
          valueLabel={percent(motionAmplitude)}
          resolved={`parallax ${(0.35 * motionAmplitude).toFixed(2)}`}
          value={motionAmplitude}
          min={0}
          max={1.5}
          step={0.05}
          onChange={setMotionAmplitude}
          presets={AMPLITUDE_PRESETS}
          note="عند صفر تصبح كل الحركات تلاشياً خالصاً — الخيار الأفضل على الأجهزة الضعيفة."
        />
        <SliderRow
          label="ارتداد النوابض"
          valueLabel={percent(springBounce)}
          resolved={
            easingProfile === 'expressive'
              ? `ζ ≈ ${(1 - 0.75 * springBounce).toFixed(2)}`
              : 'مُقيَّد'
          }
          value={springBounce}
          min={0}
          max={1}
          step={0.05}
          onChange={setSpringBounce}
          presets={BOUNCE_PRESETS}
          note="نسبة التخميد: صفر يعني استقراراً جافاً بلا تجاوز. لا يعمل إلا مع عائلة «مُعبّر»."
        />
      </SettingsSection>

      {/* ── 7. Rhythm and touch ──────────────────────────────────── */}
      <SettingsSection
        title="الإيقاع والضغط"
        subtitle="تتابع ظهور القوائم، ومقدار حركة الضغط"
        icon={<Timer className="h-4 w-4" aria-hidden />}
      >
        <SliderRow
          label="إيقاع ظهور القوائم"
          valueLabel={percent(listStagger)}
          resolved={`${Math.round(50 * listStagger * (1 / motionSpeed))}ms لكل عنصر`}
          value={listStagger}
          min={MIN_LIST_STAGGER}
          max={MAX_LIST_STAGGER}
          step={0.1}
          onChange={setListStagger}
          presets={STAGGER_PRESETS}
          note="التأخير بين كل عنصر والذي يليه في مداخل الصفحات. صفر يعني ظهوراً واحداً فورياً."
        />
        <SliderRow
          label="قوة ردّ الضغط"
          valueLabel={percent(pressFeedback)}
          resolved="يُضرب في عمق الضغط"
          value={pressFeedback}
          min={MIN_PRESS_FEEDBACK}
          max={MAX_PRESS_FEEDBACK}
          step={0.05}
          onChange={setPressFeedback}
          presets={PRESS_PRESETS}
          note="عند صفر يتوقّف الزرّ عن التحرّك تماماً، ويبقى تغيّر اللون وحده كدليل على الضغط."
        />
      </SettingsSection>

      {/* ── 8. Gesture ───────────────────────────────────────────── */}
      <SettingsSection
        title="إيماءة الرجوع"
        subtitle="السحب من حافة الشاشة للرجوع خطوة"
        icon={<Target className="h-4 w-4" aria-hidden />}
      >
        <ToggleRow
          id="gesture-back"
          label="تمكين السحب من الحافة"
          note="يعمل داخل التطبيق المثبَّت وعلى أندرويد، حيث لا يوفّره المتصفح"
          checked={gestureBack}
          onCheckedChange={setGestureBack}
        />
        {gestureBack ? (
          <SliderRow
            label="الحساسية"
            valueLabel={percent(gestureSensitivity)}
            resolved={`${Math.round(24 * gestureSensitivity)}px حافة · ${Math.round(
              80 / gestureSensitivity,
            )}px التزام`}
            value={gestureSensitivity}
            min={MIN_GESTURE_SENSITIVITY}
            max={MAX_GESTURE_SENSITIVITY}
            step={0.1}
            onChange={setGestureSensitivity}
            presets={GESTURE_PRESETS}
            note="الأعلى يوسّع شريط الحافة ويقلّل المسافة المطلوبة؛ الأدنى يطلب سحبة متعمّدة طويلة."
          />
        ) : null}
      </SettingsSection>

      {/* ── 9. Frame budget ──────────────────────────────────────── */}
      <SettingsSection
        title="الإطارات والأداء"
        subtitle="ميزانية الإطار، والتصرّف الذكي عند تعذّرها"
        icon={<Zap className="h-4 w-4" aria-hidden />}
      >
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-meta text-muted-foreground">حد الإطارات في الثانية</span>
            <span className="font-mono text-mini tabular-nums text-muted-foreground">
              الهدف {budgetHz} Hz
            </span>
          </div>
          <SegmentedControl
            options={FPS_OPTIONS.map((option) => ({
              id: String(option.value),
              label: option.label,
            }))}
            value={String(fpsCap)}
            onChange={(value) => setFpsCap(value === 'auto' ? 'auto' : (Number(value) as FpsCap))}
            layoutId="fpsCapIndicator"
            aria-label="حد الإطارات في الثانية"
          />
          <p className="text-micro text-muted-foreground">
            {nativeHz === null
              ? 'يجري قياس معدّل تحديث شاشتك…'
              : `شاشتك تعمل عند ${nativeHz} هرتز.`}{' '}
            {capExceedsPanel
              ? 'الحد الذي اخترته أعلى من قدرة الشاشة، فلا أثر له.'
              : 'يُطبَّق الحد على كل حركة عبر requestAnimationFrame، ولا يمكن تجاوز معدّل الشاشة الأصلي.'}
          </p>
        </div>

        <div className="divide-y">
          <ToggleRow
            id="adaptive-performance"
            label="أداء تكيفي"
            note="عند فقدان إطارات ثلاث ثوانٍ متصلة يقلّ التطبيق حركته تلقائياً، ويعود بعد ست ثوانٍ سليمة"
            checked={adaptivePerformance}
            onCheckedChange={setAdaptivePerformance}
          />
          <ToggleRow
            id="compositor-hints"
            label="تلميحات المُركّب"
            note="ترقية الأسطح المتحرّكة إلى طبقة GPU. إيقافها قد يكون أنعم فعلاً على أجهزة قليلة الذاكرة"
            checked={compositorHints}
            onCheckedChange={setCompositorHints}
          />
          <ToggleRow
            id="reduce-motion"
            label="تقليل الحركة"
            note="يجمع مع إعداد النظام ولا يلغيه — كل انتقال يصبح تلاشياً شبه فوري"
            checked={reduceMotion}
            onCheckedChange={setReduceMotion}
          />
        </div>
      </SettingsSection>

      {/* ── 10. Measurement ──────────────────────────────────────── */}
      <SettingsSection
        title="مقاييس الأداء الحيّة"
        subtitle="من نفس مُجدوِل الإطارات الذي يستخدمه التطبيق"
        icon={<Activity className="h-4 w-4" aria-hidden />}
      >
        <PerformancePanel nativeHz={nativeHz} />
      </SettingsSection>

      {/* ── 11. What it compiles to ──────────────────────────────── */}
      <SettingsSection
        title="مفتّش الحركة"
        subtitle="القيم والسمات المكتوبة على جذر المستند الآن"
        icon={<Gauge className="h-4 w-4" aria-hidden />}
        action={
          <Button type="button" variant="outline" size="sm" onClick={resetMotionPreferences}>
            <RefreshCcw aria-hidden />
            إعادة الضبط
          </Button>
        }
      >
        <TokenInspector entries={inspectorEntries} />
        <p className="text-micro text-muted-foreground">
          كل مدّة في ملف الأنماط مكتوبة على هيئة ‎calc(base × var(--motion-scale))‎، ولهذا يكفي
          تغيير رقم واحد على الجذر لإعادة توقيت كل حركة في التطبيق على الإطار التالي.
        </p>
      </SettingsSection>
    </>
  );
}
