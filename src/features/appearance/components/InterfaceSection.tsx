import { useMemo } from 'react';

import { useApp } from '@/contexts/AppContext';
import {
  MAX_CONTENT_MEASURE,
  MAX_FOCUS_OFFSET,
  MAX_HEADER_SCALE,
  MAX_ICON_WEIGHT_SCALE,
  MAX_PRESS_DEPTH,
  MAX_ROW_ICON_SCALE,
  MAX_SAFE_AREA_EXTRA,
  MAX_SPACING_SCALE,
  MAX_TAP_TARGET,
  MAX_UI_SCALE,
  MIN_CONTENT_MEASURE,
  MIN_FOCUS_OFFSET,
  MIN_HEADER_SCALE,
  MIN_ICON_WEIGHT_SCALE,
  MIN_PRESS_DEPTH,
  MIN_ROW_ICON_SCALE,
  MIN_SAFE_AREA_EXTRA,
  MIN_SPACING_SCALE,
  MIN_TAP_TARGET,
  MIN_UI_SCALE,
} from '@/lib/appearancePreferences';
import {
  Circle,
  Contrast,
  Crosshair,
  Eye,
  Layers,
  Maximize2,
  Rows3,
  Save,
  SlidersHorizontal,
  Target,
  Type,
} from '@/lib/icons';
import type { InterfaceProfileSettings } from '@/lib/interfaceProfiles';
import {
  BORDER_OPTIONS,
  BORDER_WIDTH_PRESETS,
  CORNER_PRESETS,
  DENSITY_LEVELS,
  DIVIDER_STYLE_OPTIONS,
  INTERACTION_STYLE_OPTIONS,
  INTERFACE_PRESETS,
  matchInterfacePreset,
  MAX_CORNER_SOFTNESS,
  MIN_CORNER_SOFTNESS,
  RADIUS_PROFILE_OPTIONS,
  resolveBorder,
  resolveDensity,
  resolveInterfaceGeometry,
  resolveWidth,
  SCROLLBAR_STYLE_OPTIONS,
  SPACING_SCALE_PRESETS,
  SURFACE_MATERIAL_OPTIONS,
  UI_SCALE_OPTIONS,
  WIDTH_OPTIONS,
} from '@/lib/interfaceScale';
import type { SurfaceLift } from '@/utils/themeEngine';

import {
  type ChoiceOption,
  ChoiceRow,
  type InspectorEntry,
  SegmentedControl,
  type SegmentedOption,
  SettingsSection,
  SliderRow,
  ToggleRow,
  TokenInspector,
} from './AppearancePrimitives';
import InterfacePreview from './interface/InterfacePreview';
import InterfaceProfiles from './interface/InterfaceProfiles';

const LIFT_OPTIONS: { id: SurfaceLift; label: string }[] = [
  { id: 'flat', label: 'مسطح' },
  { id: 'subtle', label: 'متوازن' },
  { id: 'lifted', label: 'بارز' },
];

const toOptions = (levels: readonly { id: string; label: string }[]): SegmentedOption[] =>
  levels.map((level) => ({ id: level.id, label: level.label }));

const toChoices = (
  levels: readonly { id: string; label: string; note?: string }[],
): ChoiceOption[] =>
  levels.map((level) => ({ id: level.id, label: level.label, note: level.note }));

const percent = (value: number) => `${Math.round(value * 100)}٪`;

/**
 * "الواجهة والأبعاد" — the interface platform.
 *
 * Twenty-six independent, composable instruments. Three principles keep that
 * many controls usable rather than overwhelming:
 *
 *   1. Every control shows its RESOLVED value, not just its position. A slider
 *      that reads "110٪ · 18px" tells the user what they are actually getting;
 *      one that reads "110٪" does not.
 *   2. Nothing is decorative. Each setting compiles into a CSS custom property
 *      that shared utilities already read, so it reaches every screen in the
 *      app at once. The token inspector at the bottom proves it by printing the
 *      literal values written onto `<html>`.
 *   3. Ten complete presets cover the real configurations; the individual
 *      instruments exist for the user who wants to go past them, and the
 *      "مخصص" badge makes it obvious when they have.
 */
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
    uiScale,
    setUiScale,
    adaptiveLayout,
    setAdaptiveLayout,
    surfaceMaterial,
    setSurfaceMaterial,
    interactionStyle,
    setInteractionStyle,
    reducedTransparency,
    setReducedTransparency,
    strongerContrast,
    setStrongerContrast,
    largeTouchTargets,
    setLargeTouchTargets,
    clearerFocus,
    setClearerFocus,
    spacingScale,
    setSpacingScale,
    radiusProfile,
    setRadiusProfile,
    borderWidth,
    setBorderWidth,
    dividerStyle,
    setDividerStyle,
    iconWeightScale,
    setIconWeightScale,
    rowIconScale,
    setRowIconScale,
    focusOffset,
    setFocusOffset,
    pressDepth,
    setPressDepth,
    tapTargetMin,
    setTapTargetMin,
    contentWidthCustom,
    setContentWidthCustom,
    headerScale,
    setHeaderScale,
    scrollbarStyle,
    setScrollbarStyle,
    safeAreaExtra,
    setSafeAreaExtra,
    applyAdvancedInterfacePreferences,
    resetInterfacePreferences,
  } = useApp();

  const activeDensity = resolveDensity(uiDensity);
  const activeWidth = resolveWidth(contentWidth);
  const activeBorder = resolveBorder(borderStrength);

  const advancedPreferences = useMemo(
    () => ({
      uiScale,
      adaptiveLayout,
      surfaceMaterial,
      interactionStyle,
      reducedTransparency,
      strongerContrast,
      largeTouchTargets,
      clearerFocus,
      spacingScale,
      radiusProfile,
      borderWidth,
      dividerStyle,
      iconWeightScale,
      rowIconScale,
      focusOffset,
      pressDepth,
      tapTargetMin,
      contentWidthCustom,
      headerScale,
      scrollbarStyle,
      safeAreaExtra,
    }),
    [
      uiScale,
      adaptiveLayout,
      surfaceMaterial,
      interactionStyle,
      reducedTransparency,
      strongerContrast,
      largeTouchTargets,
      clearerFocus,
      spacingScale,
      radiusProfile,
      borderWidth,
      dividerStyle,
      iconWeightScale,
      rowIconScale,
      focusOffset,
      pressDepth,
      tapTargetMin,
      contentWidthCustom,
      headerScale,
      scrollbarStyle,
      safeAreaExtra,
    ],
  );

  const settings = useMemo(
    () => ({
      cornerSoftness,
      density: activeDensity,
      width: activeWidth,
      border: activeBorder,
      surfaceLift,
      ...advancedPreferences,
    }),
    [cornerSoftness, activeDensity, activeWidth, activeBorder, surfaceLift, advancedPreferences],
  );

  /** The exact numbers the tokens carry — the source for every readout below. */
  const geometry = useMemo(() => resolveInterfaceGeometry(settings), [settings]);
  const activePreset = matchInterfacePreset(settings);

  const densityNote = DENSITY_LEVELS.find((item) => item.id === activeDensity)?.note ?? '';
  const widthNote = WIDTH_OPTIONS.find((item) => item.id === activeWidth)?.note ?? '';
  const borderNote = BORDER_OPTIONS.find((item) => item.id === activeBorder)?.note ?? '';
  const cornerPreset = CORNER_PRESETS.find(
    (preset) => Math.abs(preset.value - cornerSoftness) < 0.025,
  );
  const accessibilityCount = [
    reducedTransparency,
    strongerContrast,
    largeTouchTargets,
    clearerFocus,
  ].filter(Boolean).length;

  const applyCompleteSettings = (next: InterfaceProfileSettings) => {
    setCornerSoftness(next.cornerSoftness);
    setUiDensity(next.density);
    setContentWidth(next.width);
    setBorderStrength(next.border);
    setSurfaceLift(next.surfaceLift);
    applyAdvancedInterfacePreferences(next);
  };

  const applyPreset = (id: string) => {
    const preset = INTERFACE_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    applyCompleteSettings(preset as unknown as InterfaceProfileSettings);
  };

  const applyLift = (id: string) => {
    const option = LIFT_OPTIONS.find((item) => item.id === id);
    if (option) setSurfaceLift(option.id);
  };

  const inspectorEntries: readonly InspectorEntry[] = useMemo(
    () => [
      { token: '--ui-scale', label: 'مقياس الواجهة', value: String(geometry.uiScale) },
      {
        token: '--ui-spacing-scale',
        label: 'مضاعف المساحات',
        value: String(geometry.spacingScale),
      },
      {
        token: '--r-sm / --r-xl',
        label: 'سلّم الأنصاف',
        value: `${geometry.radius.sm}px … ${geometry.radius.xl}px`,
      },
      { token: '--ui-pad-card', label: 'حشو البطاقة', value: `${geometry.cardPadding}px` },
      { token: '--ui-stack-gap', label: 'مسافة المكدّس', value: `${geometry.stackGap}px` },
      { token: '--ui-gutter', label: 'هامش الصفحة', value: `${geometry.gutter}px` },
      { token: '--ui-control-h', label: 'ارتفاع العنصر', value: `${geometry.controlHeight}px` },
      { token: '--ui-touch-min', label: 'أصغر هدف لمس', value: `${geometry.tapSize}px` },
      { token: '--ui-row-icon', label: 'أيقونة الصفّ', value: `${geometry.rowIcon}px` },
      { token: '--ui-header-h', label: 'ارتفاع الرأس', value: `${geometry.headerHeight}px` },
      {
        token: '--ui-content-max',
        label: 'عرض المحتوى',
        value: geometry.contentMax === null ? '100%' : `${geometry.contentMax}px`,
      },
      { token: '--ui-border-width', label: 'سماكة الحدّ', value: `${geometry.borderWidth}px` },
      { token: '--ui-border-alpha', label: 'شفافية الحدّ', value: String(geometry.borderAlpha) },
      { token: '--ui-divider-alpha', label: 'شفافية الفاصل', value: String(geometry.dividerAlpha) },
      {
        token: '--ui-material-alpha',
        label: 'شفافية السطح',
        value: String(geometry.materialAlpha),
      },
      {
        token: '--ui-interaction-scale',
        label: 'مقياس الضغط',
        value: String(geometry.pressScale),
      },
      {
        token: '--ui-interaction-offset',
        label: 'إزاحة الضغط',
        value: `${geometry.pressOffset}px`,
      },
      { token: '--ui-icon-stroke', label: 'ثقل الأيقونة', value: String(geometry.iconStroke) },
      {
        token: '--ui-focus-width',
        label: 'حلقة التركيز',
        value: `${geometry.focusWidth}px / ${geometry.focusOffset}px`,
      },
      {
        token: '--ui-scrollbar-size',
        label: 'شريط التمرير',
        value: `${geometry.scrollbarSize}px`,
      },
      { token: '--ui-safe-extra', label: 'هامش سفلي إضافي', value: `${geometry.safeAreaExtra}px` },
    ],
    [geometry],
  );

  return (
    <>
      {/* ── 1. Complete characters ─────────────────────────────────── */}
      <SettingsSection
        title="طوابع الواجهة"
        subtitle="عشرة طوابع كاملة، ومعاينة حية لكل تفصيل"
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
            ? (INTERFACE_PRESETS.find((preset) => preset.id === activePreset)?.note ?? '')
            : 'إعدادات مضبوطة يدوياً — لا تطابق أي طابع جاهز'}
        </p>
        <InterfacePreview
          geometry={geometry}
          materialLabel={
            SURFACE_MATERIAL_OPTIONS.find((item) => item.id === surfaceMaterial)?.label
          }
          interactionLabel={
            INTERACTION_STYLE_OPTIONS.find((item) => item.id === interactionStyle)?.label
          }
          accessibilityCount={accessibilityCount}
        />
      </SettingsSection>

      {/* ── 2. Scale and breathing room ────────────────────────────── */}
      <SettingsSection
        title="المقياس والمساحات"
        subtitle="حجم كروم الواجهة، ومقدار الهواء بين عناصره"
        icon={<Maximize2 className="h-4 w-4" aria-hidden />}
      >
        <SliderRow
          label="مقياس الواجهة"
          valueLabel={percent(uiScale)}
          resolved={`${geometry.controlHeight}px عنصر`}
          value={uiScale}
          min={MIN_UI_SCALE}
          max={MAX_UI_SCALE}
          step={0.01}
          onChange={setUiScale}
          presets={UI_SCALE_OPTIONS}
          note="يكبّر كل الهندسة معاً — الأنصاف والحشو والارتفاعات وأهداف اللمس. لا يمسّ حجم الخط."
        />
        <SliderRow
          label="مضاعف المساحات"
          valueLabel={percent(spacingScale)}
          resolved={`${geometry.cardPadding}px حشو · ${geometry.stackGap}px مسافة`}
          value={spacingScale}
          min={MIN_SPACING_SCALE}
          max={MAX_SPACING_SCALE}
          step={0.05}
          onChange={setSpacingScale}
          presets={SPACING_SCALE_PRESETS}
          note="يوسّع أو يضيّق الهواء وحده: الحشو والمسافات والهوامش، دون تغيير ارتفاع أي عنصر."
        />
        <ToggleRow
          id="adaptive-layout"
          label="تخطيط تكيفي"
          note="يجعل هامش الصفحة يتنفّس مع عرض الشاشة بدل قيمة ثابتة"
          checked={adaptiveLayout}
          onCheckedChange={setAdaptiveLayout}
        />
      </SettingsSection>

      {/* ── 3. Corners ─────────────────────────────────────────────── */}
      <SettingsSection
        title="الحواف"
        subtitle="مضاعف واحد وطابع واحد يحرّكان سلّم الأنصاف كله"
        icon={<Circle className="h-4 w-4" aria-hidden />}
      >
        <SliderRow
          label="نعومة الحواف"
          valueLabel={cornerPreset ? cornerPreset.label : cornerSoftness.toFixed(2)}
          resolved={`${geometry.radius.sm} · ${geometry.radius.md} · ${geometry.radius.lg} · ${geometry.radius.xl}px`}
          value={cornerSoftness}
          min={MIN_CORNER_SOFTNESS}
          max={MAX_CORNER_SOFTNESS}
          step={0.05}
          onChange={setCornerSoftness}
          presets={CORNER_PRESETS}
          note={cornerPreset?.note}
        />
        <ChoiceRow
          label="طابع السلّم"
          options={toChoices(RADIUS_PROFILE_OPTIONS)}
          value={radiusProfile}
          onChange={(value) => setRadiusProfile(value as typeof radiusProfile)}
          layoutId="radiusProfileIndicator"
        />
      </SettingsSection>

      {/* ── 4. Density ─────────────────────────────────────────────── */}
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

      {/* ── 5. Content measure ─────────────────────────────────────── */}
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
        {activeWidth === 'custom' ? (
          <SliderRow
            label="المقاس المخصص"
            valueLabel={`${contentWidthCustom}px`}
            resolved={
              geometry.contentMax === null ? '100%' : `${geometry.contentMax}px بعد المقياس`
            }
            value={contentWidthCustom}
            min={MIN_CONTENT_MEASURE}
            max={MAX_CONTENT_MEASURE}
            step={8}
            onChange={setContentWidthCustom}
            note="يُضرب في مقياس الواجهة، فيتبع العمود المقاس العام تلقائياً."
          />
        ) : null}
      </SettingsSection>

      {/* ── 6. Edges and dividers ──────────────────────────────────── */}
      <SettingsSection
        title="الحدود والفواصل"
        subtitle="بلا ظلال، الحدّ هو حافة السطح"
        icon={<Contrast className="h-4 w-4" aria-hidden />}
      >
        <div className="space-y-2">
          <span className="block text-meta text-muted-foreground">قوة الحدود</span>
          <SegmentedControl
            options={toOptions(BORDER_OPTIONS)}
            value={activeBorder}
            onChange={setBorderStrength}
            layoutId="borderStrengthIndicator"
            aria-label="قوة الحدود"
          />
          <p className="text-micro text-muted-foreground">{borderNote}</p>
        </div>
        <SliderRow
          label="سماكة الحدّ"
          valueLabel={`${borderWidth}px`}
          resolved={`شفافية ${geometry.borderAlpha}`}
          value={borderWidth}
          min={1}
          max={2}
          step={0.25}
          onChange={setBorderWidth}
          presets={BORDER_WIDTH_PRESETS}
          note="تطال كل سطح محكوم: البطاقات والحقول والرؤوس والطبقات العائمة."
        />
        <ChoiceRow
          label="فواصل الصفوف"
          options={toChoices(DIVIDER_STYLE_OPTIONS)}
          value={dividerStyle}
          onChange={(value) => setDividerStyle(value as typeof dividerStyle)}
          layoutId="dividerStyleIndicator"
        />
      </SettingsSection>

      {/* ── 7. Surface ─────────────────────────────────────────────── */}
      <SettingsSection
        title="السطح وبروزه"
        subtitle="درجة حضور الأسطح، وكم تنفصل البطاقة عن الصفحة"
        icon={<Layers className="h-4 w-4" aria-hidden />}
      >
        <div className="space-y-2">
          <span className="block text-meta text-muted-foreground">خامة السطح</span>
          <SegmentedControl
            options={toOptions(SURFACE_MATERIAL_OPTIONS)}
            value={surfaceMaterial}
            onChange={(value) => setSurfaceMaterial(value as typeof surfaceMaterial)}
            layoutId="surfaceMaterialIndicator"
            aria-label="خامة السطح"
          />
        </div>
        <div className="space-y-2">
          <span className="block text-meta text-muted-foreground">بروز الأسطح</span>
          <SegmentedControl
            options={LIFT_OPTIONS}
            value={surfaceLift}
            onChange={applyLift}
            layoutId="surfaceLiftIndicator"
            aria-label="بروز الأسطح"
          />
          <p className="text-micro text-muted-foreground">
            التطبيق مسطح بالتصميم؛ فرق إضاءة السطح والحدّ الرفيع هما دليلا العمق
          </p>
        </div>
      </SettingsSection>

      {/* ── 8. Interaction and touch ───────────────────────────────── */}
      <SettingsSection
        title="التفاعل واللمس"
        subtitle="استجابة الضغط ومساحة الأصابع"
        icon={<Target className="h-4 w-4" aria-hidden />}
      >
        <div className="space-y-2">
          <span className="block text-meta text-muted-foreground">طابع التفاعل</span>
          <SegmentedControl
            options={toOptions(INTERACTION_STYLE_OPTIONS)}
            value={interactionStyle}
            onChange={(value) => setInteractionStyle(value as typeof interactionStyle)}
            layoutId="interactionStyleIndicator"
            aria-label="طابع التفاعل"
          />
        </div>
        <SliderRow
          label="عمق الضغط"
          valueLabel={percent(pressDepth)}
          resolved={`${geometry.pressScale} · ${geometry.pressOffset}px`}
          value={pressDepth}
          min={MIN_PRESS_DEPTH}
          max={MAX_PRESS_DEPTH}
          step={0.05}
          onChange={setPressDepth}
          note="يضبط شكل الضغط. أمّا مقدار الحركة المعروض منه فيُضبط من «الحركة والأداء»."
        />
        <SliderRow
          label="أصغر هدف لمس"
          valueLabel={`${tapTargetMin}px`}
          resolved={`${geometry.tapSize}px بعد المقياس`}
          value={tapTargetMin}
          min={MIN_TAP_TARGET}
          max={MAX_TAP_TARGET}
          step={2}
          onChange={setTapTargetMin}
          note="حدّ أدنى مطلق لكل عنصر تفاعلي. يفوز الأكبر بينه وبين الكثافة وخيار الإتاحة."
        />
      </SettingsSection>

      {/* ── 9. Icons and headers ───────────────────────────────────── */}
      <SettingsSection
        title="الأيقونات والرؤوس"
        subtitle="ثقل الخطوط وحجم الرقائق وارتفاع الرأس"
        icon={<Type className="h-4 w-4" aria-hidden />}
      >
        <SliderRow
          label="ثقل الأيقونات"
          valueLabel={percent(iconWeightScale)}
          resolved={`سماكة ${geometry.iconStroke}`}
          value={iconWeightScale}
          min={MIN_ICON_WEIGHT_SCALE}
          max={MAX_ICON_WEIGHT_SCALE}
          step={0.05}
          onChange={setIconWeightScale}
          note="يُضرب في السماكة القادمة من طابع التفاعل، فيطال كل أيقونة في التطبيق."
        />
        <SliderRow
          label="حجم رقاقة الأيقونة"
          valueLabel={percent(rowIconScale)}
          resolved={`${geometry.rowIcon}px`}
          value={rowIconScale}
          min={MIN_ROW_ICON_SCALE}
          max={MAX_ROW_ICON_SCALE}
          step={0.05}
          onChange={setRowIconScale}
          note="المربّع الملوّن الذي يحمل الأيقونة في صفوف القوائم والإعدادات."
        />
        <SliderRow
          label="ارتفاع الرأس"
          valueLabel={percent(headerScale)}
          resolved={`${geometry.headerHeight}px`}
          value={headerScale}
          min={MIN_HEADER_SCALE}
          max={MAX_HEADER_SCALE}
          step={0.05}
          onChange={setHeaderScale}
          note="يطال رؤوس الصفحات واللواصق، ومسافة توقّف التمرير تحتها."
        />
      </SettingsSection>

      {/* ── 10. Focus and accessibility ────────────────────────────── */}
      <SettingsSection
        title="التركيز والإتاحة"
        subtitle="تحسينات مستقلة للشفافية والتباين واللمس والتركيز"
        icon={<Crosshair className="h-4 w-4" aria-hidden />}
      >
        <SliderRow
          label="إزاحة حلقة التركيز"
          valueLabel={`${focusOffset}px`}
          resolved={`سماكة ${geometry.focusWidth}px`}
          value={focusOffset}
          min={MIN_FOCUS_OFFSET}
          max={MAX_FOCUS_OFFSET}
          step={0.5}
          onChange={setFocusOffset}
          note="المسافة بين العنصر وحلقة لوحة المفاتيح حوله."
        />
        <div className="divide-y">
          <ToggleRow
            id="reduced-transparency"
            label="شفافية أقل"
            note="يجعل الأسطح والطبقات معتمة تماماً"
            checked={reducedTransparency}
            onCheckedChange={setReducedTransparency}
          />
          <ToggleRow
            id="stronger-contrast"
            label="تباين أقوى"
            note="يرفع وضوح الحدود والفواصل"
            checked={strongerContrast}
            onCheckedChange={setStrongerContrast}
          />
          <ToggleRow
            id="large-touch-targets"
            label="أهداف لمس أكبر"
            note="يرفع الحد الأدنى للعناصر التفاعلية إلى ٥٢ بكسل على الأقل"
            checked={largeTouchTargets}
            onCheckedChange={setLargeTouchTargets}
          />
          <ToggleRow
            id="clearer-focus"
            label="تركيز أوضح"
            note="يقوي مؤشر لوحة المفاتيح حول العناصر"
            checked={clearerFocus}
            onCheckedChange={setClearerFocus}
          />
        </div>
      </SettingsSection>

      {/* ── 11. Scrolling chrome and bottom clearance ──────────────── */}
      <SettingsSection
        title="شريط التمرير والحافة"
        subtitle="أثر التمرير على الشاشة، والمساحة أسفل كل صفحة"
        icon={<Eye className="h-4 w-4" aria-hidden />}
      >
        <ChoiceRow
          label="شريط التمرير"
          options={toChoices(SCROLLBAR_STYLE_OPTIONS)}
          value={scrollbarStyle}
          onChange={(value) => setScrollbarStyle(value as typeof scrollbarStyle)}
          layoutId="scrollbarStyleIndicator"
        />
        <SliderRow
          label="هامش سفلي إضافي"
          valueLabel={`${safeAreaExtra}px`}
          resolved="يُضاف فوق هامش الجهاز"
          value={safeAreaExtra}
          min={MIN_SAFE_AREA_EXTRA}
          max={MAX_SAFE_AREA_EXTRA}
          step={2}
          onChange={setSafeAreaExtra}
          note="لأجهزة تخفي آخر سطر خلف شريط النظام أو الإيماءات."
        />
      </SettingsSection>

      {/* ── 12. What it all compiles to ────────────────────────────── */}
      <SettingsSection
        title="مفتّش الرموز"
        subtitle="القيم الحقيقية المكتوبة على جذر المستند الآن"
        icon={<SlidersHorizontal className="h-4 w-4" aria-hidden />}
      >
        <TokenInspector entries={inspectorEntries} />
        <p className="text-micro text-muted-foreground">
          كل قيمة أعلاه خاصية CSS مخصّصة تقرأها أدوات التطبيق المشتركة، ولذلك يصل الإعداد الواحد إلى
          كل الشاشات في اللحظة نفسها.
        </p>
      </SettingsSection>

      {/* ── 13. Portable profiles ──────────────────────────────────── */}
      <InterfaceProfiles
        capture={() => settings as unknown as InterfaceProfileSettings}
        apply={applyCompleteSettings}
        reset={resetInterfacePreferences}
        icon={<Save className="h-4 w-4" aria-hidden />}
      />
    </>
  );
}
