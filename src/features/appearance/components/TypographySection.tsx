import { motion } from 'framer-motion';

import { Slider } from '@/components/ui/slider';
import { useApp } from '@/contexts/AppContext';
import {
  computeTypeScale,
  FONT_OPTIONS,
  FONT_PAIRINGS,
  FONT_SIZE_STEPS,
  FONT_WEIGHTS,
  fontOptionFor,
  matchPairing,
  MAX_FONT_WEIGHT,
  MIN_FONT_WEIGHT,
  resolveFontSize,
  resolveTypeLeading,
  resolveTypeRatio,
  TYPE_LEADINGS,
  TYPE_RATIOS,
} from '@/lib/fonts';
import { Bold, Check, Eye, Type } from '@/lib/icons';

import { SegmentedControl, type SegmentedOption, SettingsSection } from './AppearancePrimitives';

/**
 * Typography — four independent dimensions, all of which reach the pixels.
 *
 * A pairing (display + body face), a base size, the ratio the scale grows by,
 * and the leading. The live preview shows all four at once, because the only
 * honest way to choose a ratio is to see what it does to a heading next to a
 * caption.
 */

const SAMPLE_HEADING = 'الحكمة ضالة المؤمن';
const SAMPLE_SUBHEADING = 'مجلس القراءة الليلي';
const SAMPLE_BODY =
  'العلم يرفع بيتاً لا عماد له، والجهل يهدم بيت العز والكرم. هذا نص تجريبي طويل بما يكفي ' +
  'لتظهر فيه المسافات بين الأسطر وسماكة الحروف كما ستراها في التطبيق فعلاً.';
const SAMPLE_CAPTION = 'قبل ثلاث دقائق · ست دقائق قراءة';

export default function TypographySection() {
  const {
    fontFamily,
    setFontFamily,
    fontDisplayFamily,
    setFontDisplayFamily,
    fontSize,
    setFontSize,
    typeRatio,
    setTypeRatio,
    typeLeading,
    setTypeLeading,
    fontWeight,
    setFontWeight,
    fontOpacity,
    setFontOpacity,
  } = useApp();

  const bodyFont = fontOptionFor(fontFamily);
  const displayFont = fontOptionFor(fontDisplayFamily);
  const activePairing = matchPairing(fontDisplayFamily, fontFamily);
  const activeSizeId = resolveFontSize(fontSize);
  const activeRatioId = resolveTypeRatio(typeRatio);
  const activeLeadingId = resolveTypeLeading(typeLeading);
  const activeRatio = TYPE_RATIOS.find((r) => r.id === activeRatioId) ?? TYPE_RATIOS[1];
  const activeLeading = TYPE_LEADINGS.find((l) => l.id === activeLeadingId) ?? TYPE_LEADINGS[1];
  const currentWeightLabel =
    FONT_WEIGHTS.find((w) => w.value === fontWeight)?.label ?? String(fontWeight);
  const scale = computeTypeScale(activeRatioId, activeSizeId);

  const sizeOptions: SegmentedOption[] = FONT_SIZE_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    sublabel: `${step.base}px`,
  }));
  const ratioOptions: SegmentedOption[] = TYPE_RATIOS.map((r) => ({
    id: r.id,
    label: r.label,
    sublabel: r.ratio.toFixed(2),
  }));
  const leadingOptions: SegmentedOption[] = TYPE_LEADINGS.map((l) => ({
    id: l.id,
    label: l.label,
    sublabel: l.leading.toFixed(2),
  }));

  const applyPairing = (id: string) => {
    const pairing = FONT_PAIRINGS.find((p) => p.id === id);
    if (!pairing) return;
    setFontDisplayFamily(pairing.display);
    setFontFamily(pairing.body);
  };

  const renderFontPicker = (
    heading: string,
    options: typeof FONT_OPTIONS,
    activeId: string,
    onSelect: (id: string) => void,
  ) => (
    <div className="space-y-2">
      <p className="text-mini font-semibold text-muted-foreground">{heading}</p>
      <div className="space-y-2">
        {options.map((f) => {
          const isActive = activeId === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelect(f.id)}
              aria-pressed={isActive}
              className={`app-card app-card-compact app-card-pressable flex w-full items-center justify-between gap-3 text-start ${
                isActive ? 'border-primary/50' : ''
              }`}
            >
              <span className="min-w-0">
                <span className="block text-meta font-semibold text-foreground">{f.label}</span>
                <span
                  className="mt-1 block truncate text-lead text-foreground"
                  style={{ fontFamily: f.family }}
                >
                  بسم الله الرحمن الرحيم
                </span>
                <span className="mt-1 block text-micro text-muted-foreground">{f.note}</span>
              </span>
              {isActive && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary"
                  aria-hidden
                >
                  <Check className="h-4 w-4 stroke-[2.5] text-primary-foreground" />
                </motion.span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <SettingsSection
        title="أزواج الخطوط"
        subtitle="خط للعناوين وآخر للنصوص — اختر زوجاً جاهزاً أو خصّص"
        icon={<Type className="h-4 w-4" aria-hidden />}
      >
        <div className="flex flex-wrap gap-1.5">
          {FONT_PAIRINGS.map((pairing) => {
            const isActive = activePairing === pairing.id;
            return (
              <button
                key={pairing.id}
                type="button"
                onClick={() => applyPairing(pairing.id)}
                aria-pressed={isActive}
                className={`rounded-sm px-3 py-1.5 text-mini font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {pairing.label}
              </button>
            );
          })}
          {activePairing === null && (
            <span className="rounded-sm bg-primary px-3 py-1.5 text-mini font-medium text-primary-foreground">
              مخصص
            </span>
          )}
        </div>
        <p className="text-micro text-muted-foreground">
          {activePairing
            ? (FONT_PAIRINGS.find((p) => p.id === activePairing)?.note ?? '')
            : 'زوج من اختيارك — العناوين والنصوص مضبوطة يدوياً'}
        </p>

        {renderFontPicker(
          'خط العناوين',
          FONT_OPTIONS.filter((f) => f.display),
          displayFont.id,
          setFontDisplayFamily,
        )}
        {renderFontPicker(
          'خط النصوص',
          FONT_OPTIONS.filter((f) => f.body),
          bodyFont.id,
          setFontFamily,
        )}
      </SettingsSection>

      <SettingsSection
        title="المقياس"
        subtitle="الحجم الأساس، وسرعة نمو المقياس، والمسافة بين الأسطر"
        icon={<Type className="h-4 w-4" aria-hidden />}
      >
        <div className="space-y-2">
          <p className="text-mini font-semibold text-muted-foreground">الحجم الأساس</p>
          <SegmentedControl
            options={sizeOptions}
            value={activeSizeId}
            onChange={setFontSize}
            layoutId="typeSizeIndicator"
            aria-label="الحجم الأساس"
          />
          <p className="text-micro text-muted-foreground">
            يكبّر النص وحده، بينما يبقى حجم البطاقات والمسافات تحت تحكم مقياس الواجهة
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-mini font-semibold text-muted-foreground">تفاوت المقياس</p>
          <SegmentedControl
            options={ratioOptions}
            value={activeRatioId}
            onChange={setTypeRatio}
            layoutId="typeRatioIndicator"
            aria-label="تفاوت المقياس"
          />
          <p className="text-micro text-muted-foreground">{activeRatio.note}</p>
        </div>

        <div className="space-y-2">
          <p className="text-mini font-semibold text-muted-foreground">المسافة بين الأسطر</p>
          <SegmentedControl
            options={leadingOptions}
            value={activeLeadingId}
            onChange={setTypeLeading}
            layoutId="typeLeadingIndicator"
            aria-label="المسافة بين الأسطر"
          />
          <p className="text-micro text-muted-foreground">{activeLeading.note}</p>
        </div>

        {/* What the ratio actually produced, step by step. */}
        <div className="space-y-2 border-t border-border pt-3">
          <span className="text-micro font-bold text-muted-foreground">الدرجات المحسوبة</span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(scale).map(([name, value]) => (
              <div key={name} className="flex items-center justify-between gap-2">
                <span className="text-micro text-muted-foreground">{name}</span>
                <span className="text-micro tabular-nums text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="السماكة والوضوح"
        subtitle="سماكة الحروف ودرجة تباين النص"
        icon={<Bold className="h-4 w-4" aria-hidden />}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-mini text-muted-foreground">عادي</span>
            <span className="text-meta font-semibold text-foreground">{currentWeightLabel}</span>
            <span className="text-mini text-muted-foreground">سميك</span>
          </div>
          <Slider
            value={[fontWeight]}
            onValueChange={([v]) => setFontWeight(v)}
            min={MIN_FONT_WEIGHT}
            max={MAX_FONT_WEIGHT}
            step={100}
            aria-label="سماكة الخط"
          />
          <div className="flex justify-between px-1">
            {FONT_WEIGHTS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => setFontWeight(w.value)}
                aria-label={`سماكة ${w.label}`}
                className={`h-2 w-2 rounded-full ${
                  fontWeight === w.value ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-mini text-muted-foreground">
              <Eye className="h-4 w-4" aria-hidden />
              تباين النص
            </span>
            <span className="text-meta font-semibold tabular-nums text-foreground">
              {Math.round(fontOpacity * 100)}%
            </span>
          </div>
          {/* Floor raised from 30% to 60%: below that the body text fell
              under the WCAG AA contrast threshold on every theme. */}
          <Slider
            value={[fontOpacity * 100]}
            onValueChange={([v]) => setFontOpacity(v / 100)}
            min={60}
            max={100}
            step={5}
            aria-label="تباين النص"
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="معاينة حيّة"
        subtitle="العناوين والمتون والتفاصيل بالإعدادات الحالية"
        icon={<Eye className="h-4 w-4" aria-hidden />}
      >
        <div
          className="space-y-3 rounded-md border border-border bg-background p-4"
          style={{ opacity: fontOpacity }}
        >
          <h3
            className="text-display font-bold text-foreground"
            style={{ fontFamily: displayFont.family, fontWeight }}
          >
            {SAMPLE_HEADING}
          </h3>
          <h4
            className="text-title font-semibold text-foreground"
            style={{ fontFamily: displayFont.family }}
          >
            {SAMPLE_SUBHEADING}
          </h4>
          <p className="text-body text-foreground" style={{ fontFamily: bodyFont.family }}>
            {SAMPLE_BODY}
          </p>
          <p className="text-micro text-muted-foreground" style={{ fontFamily: bodyFont.family }}>
            {SAMPLE_CAPTION}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            displayFont.label,
            bodyFont.label,
            `${FONT_SIZE_STEPS.find((s) => s.id === activeSizeId)?.base ?? 16}px`,
            activeRatio.label,
            activeLeading.label,
            currentWeightLabel,
            `${Math.round(fontOpacity * 100)}%`,
          ]
            .filter((chip) => chip.length > 0)
            .map((chip, i) => (
              <span
                key={`${i}-${chip}`}
                className="rounded-sm bg-secondary px-2 py-1 text-micro text-muted-foreground"
              >
                {chip}
              </span>
            ))}
        </div>
      </SettingsSection>
    </>
  );
}
