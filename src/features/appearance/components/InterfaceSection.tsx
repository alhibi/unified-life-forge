import { useApp } from '@/contexts/AppContext';
import { Circle, Contrast, Layers, Maximize2, Rows3, SlidersHorizontal } from '@/lib/icons';
import {
  BORDER_OPTIONS,
  CORNER_PRESETS,
  DENSITY_LEVELS,
  INTERFACE_PRESETS,
  matchInterfacePreset,
  MAX_CORNER_SOFTNESS,
  MIN_CORNER_SOFTNESS,
  resolveBorder,
  resolveDensity,
  resolveWidth,
  WIDTH_OPTIONS,
} from '@/lib/interfaceScale';
import type { SurfaceLift } from '@/utils/themeEngine';

import {
  SegmentedControl,
  type SegmentedOption,
  SettingsSection,
  SliderRow,
} from './AppearancePrimitives';

/**
 * Interface geometry — the shape of the UI, with colour and type held still.
 *
 * The app is flat by contract: no shadows, no blur, no gradients. That leaves
 * corners, density, measure, hairlines and surface lift as the whole toolkit
 * for building hierarchy, so all five are exposed here and every one of them
 * writes straight through to the document root.
 */

const LIFT_OPTIONS: { id: SurfaceLift; label: string }[] = [
  { id: 'flat', label: 'مسطح' },
  { id: 'subtle', label: 'متوازن' },
  { id: 'lifted', label: 'بارز' },
];

const toOptions = (levels: readonly { id: string; label: string }[]): SegmentedOption[] =>
  levels.map((l) => ({ id: l.id, label: l.label }));

/** A miniature of the real app chrome, built only from shared utilities. */
function InterfacePreview() {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="app-stack-sm">
        <div className="app-card">
          <div className="flex items-center gap-3">
            <span className="row-icon">
              <Layers className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 text-start">
              <div className="text-body font-semibold text-foreground">بطاقة نموذجية</div>
              <div className="mt-0.5 text-mini text-muted-foreground">
                سطر ثانوي يوضح الكثافة والحواف
              </div>
            </div>
          </div>
        </div>

        <input
          className="app-control"
          placeholder="حقل إدخال"
          aria-label="حقل إدخال للمعاينة"
          readOnly
        />

        <div className="flex gap-2">
          <span className="flex flex-1 items-center justify-center rounded-md bg-primary px-3 py-2 text-meta font-semibold text-primary-foreground">
            إجراء أساسي
          </span>
          <span className="flex flex-1 items-center justify-center rounded-md bg-secondary px-3 py-2 text-meta font-semibold text-secondary-foreground">
            ثانوي
          </span>
        </div>

        <div className="app-card app-card-compact flex items-center justify-between gap-3">
          <span className="text-meta text-foreground">صف في قائمة</span>
          <span className="text-mini text-muted-foreground">قيمة</span>
        </div>
        <div className="app-card app-card-compact flex items-center justify-between gap-3">
          <span className="text-meta text-foreground">صف آخر</span>
          <span className="text-mini text-muted-foreground">قيمة</span>
        </div>
      </div>
    </div>
  );
}

export default function InterfaceSection() {
  const {
    cornerSoftness,
    setCornerSoftness,
    uiDensity,
    setUiDensity,
    contentWidth,
    setContentWidth,
    borderStrength,
    setBorderStrength,
    surfaceLift,
    setSurfaceLift,
  } = useApp();

  const activeDensity = resolveDensity(uiDensity);
  const activeWidth = resolveWidth(contentWidth);
  const activeBorder = resolveBorder(borderStrength);
  const activePreset = matchInterfacePreset({
    cornerSoftness,
    density: uiDensity,
    width: contentWidth,
    border: borderStrength,
    surfaceLift,
  });

  const densityNote = DENSITY_LEVELS.find((d) => d.id === activeDensity)?.note ?? '';
  const widthNote = WIDTH_OPTIONS.find((w) => w.id === activeWidth)?.note ?? '';
  const borderNote = BORDER_OPTIONS.find((b) => b.id === activeBorder)?.note ?? '';
  const cornerPreset = CORNER_PRESETS.find((p) => Math.abs(p.value - cornerSoftness) < 0.025);

  const applyPreset = (id: string) => {
    const preset = INTERFACE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setCornerSoftness(preset.cornerSoftness);
    setUiDensity(preset.density);
    setContentWidth(preset.width);
    setBorderStrength(preset.border);
    setSurfaceLift(preset.surfaceLift);
  };

  const applyLift = (id: string) => {
    const option = LIFT_OPTIONS.find((o) => o.id === id);
    if (!option) return;
    setSurfaceLift(option.id);
  };

  return (
    <>
      <SettingsSection
        title="طابع الواجهة"
        subtitle="خمس قيم بضغطة واحدة، ثم اضبط ما تشاء تحتها"
        icon={<SlidersHorizontal className="h-4 w-4" aria-hidden />}
      >
        <div className="flex flex-wrap gap-1.5">
          {INTERFACE_PRESETS.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                aria-pressed={isActive}
                className={`rounded-sm px-3 py-1.5 text-mini font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          {activePreset === null && (
            <span className="rounded-sm bg-primary px-3 py-1.5 text-mini font-medium text-primary-foreground">
              مخصص
            </span>
          )}
        </div>
        <p className="text-micro text-muted-foreground">
          {activePreset
            ? (INTERFACE_PRESETS.find((p) => p.id === activePreset)?.note ?? '')
            : 'إعدادات مضبوطة يدوياً — لا تطابق أي طابع جاهز'}
        </p>
        <InterfacePreview />
      </SettingsSection>

      <SettingsSection
        title="الحواف"
        subtitle="مضاعف واحد يحرّك سلّم الأنصاف كله معاً"
        icon={<Circle className="h-4 w-4" aria-hidden />}
      >
        <SliderRow
          label="نعومة الحواف"
          valueLabel={cornerPreset ? cornerPreset.label : cornerSoftness.toFixed(2)}
          value={cornerSoftness}
          min={MIN_CORNER_SOFTNESS}
          max={MAX_CORNER_SOFTNESS}
          step={0.05}
          onChange={setCornerSoftness}
          presets={CORNER_PRESETS}
        />
        {cornerPreset ? (
          <p className="text-micro text-muted-foreground">{cornerPreset.note}</p>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="الكثافة"
        subtitle="حشو البطاقات وارتفاع العناصر والمسافات"
        icon={<Rows3 className="h-4 w-4" aria-hidden />}
      >
        <SegmentedControl
          options={toOptions(DENSITY_LEVELS)}
          value={activeDensity}
          onChange={setUiDensity}
          layoutId="uiDensityIndicator"
          aria-label="الكثافة"
        />
        <p className="text-micro text-muted-foreground">{densityNote}</p>
      </SettingsSection>

      <SettingsSection
        title="عرض المحتوى"
        subtitle="مقاس عمود المحتوى الوحيد في التطبيق"
        icon={<Maximize2 className="h-4 w-4" aria-hidden />}
      >
        <SegmentedControl
          options={toOptions(WIDTH_OPTIONS)}
          value={activeWidth}
          onChange={setContentWidth}
          layoutId="contentWidthIndicator"
          aria-label="عرض المحتوى"
        />
        <p className="text-micro text-muted-foreground">{widthNote}</p>
      </SettingsSection>

      <SettingsSection
        title="قوة الحدود"
        subtitle="بلا ظلال، الحدّ هو حافة السطح"
        icon={<Contrast className="h-4 w-4" aria-hidden />}
      >
        <SegmentedControl
          options={toOptions(BORDER_OPTIONS)}
          value={activeBorder}
          onChange={setBorderStrength}
          layoutId="borderStrengthIndicator"
          aria-label="قوة الحدود"
        />
        <p className="text-micro text-muted-foreground">{borderNote}</p>
      </SettingsSection>

      <SettingsSection
        title="بروز الأسطح"
        subtitle="كم تنفصل البطاقة عن الصفحة"
        icon={<Layers className="h-4 w-4" aria-hidden />}
      >
        <SegmentedControl
          options={LIFT_OPTIONS}
          value={surfaceLift}
          onChange={applyLift}
          layoutId="surfaceLiftIndicator"
          aria-label="بروز الأسطح"
        />
        <p className="text-micro text-muted-foreground">
          التطبيق مسطح بالتصميم، فلا ظل ولا ضباب — فرق إضاءة السطح هو الدليل الوحيد على العمق
        </p>
      </SettingsSection>
    </>
  );
}
