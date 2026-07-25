import { useEffect, useRef, useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import {
  Circle,
  Contrast,
  Download,
  Eye,
  Layers,
  Maximize2,
  RefreshCcw,
  Rows3,
  Save,
  SlidersHorizontal,
  Trash2,
  Upload,
} from '@/lib/icons';
import {
  createSavedInterfaceProfile,
  INTERFACE_PROFILES_STORAGE_KEY,
  INTERFACE_PROFILES_VERSION,
  MAX_INTERFACE_PROFILE_IMPORT_BYTES,
  MAX_INTERFACE_PROFILES,
  parseInterfaceProfilesImport,
  readInterfaceProfiles,
  type SavedInterfaceProfile,
  writeInterfaceProfiles,
} from '@/lib/interfaceProfiles';
import {
  BORDER_OPTIONS,
  CORNER_PRESETS,
  DENSITY_LEVELS,
  INTERACTION_STYLE_OPTIONS,
  INTERFACE_PRESETS,
  matchInterfacePreset,
  MAX_CORNER_SOFTNESS,
  MIN_CORNER_SOFTNESS,
  resolveBorder,
  resolveDensity,
  resolveWidth,
  SURFACE_MATERIAL_OPTIONS,
  UI_SCALE_OPTIONS,
  WIDTH_OPTIONS,
} from '@/lib/interfaceScale';
import type { SurfaceLift } from '@/utils/themeEngine';

import {
  SegmentedControl,
  type SegmentedOption,
  SettingsSection,
  SliderRow,
} from './AppearancePrimitives';

const LIFT_OPTIONS: { id: SurfaceLift; label: string }[] = [
  { id: 'flat', label: 'مسطح' },
  { id: 'subtle', label: 'متوازن' },
  { id: 'lifted', label: 'بارز' },
];

const toOptions = (levels: readonly { id: string; label: string }[]): SegmentedOption[] =>
  levels.map((level) => ({ id: level.id, label: level.label }));

interface ToggleRowProps {
  id: string;
  label: string;
  note: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function ToggleRow({ id, label, note, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex min-h-[var(--ui-touch-min)] items-center justify-between gap-4 py-1">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-start">
        <span className="block text-body font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-mini text-muted-foreground">{note}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

interface InterfacePreviewProps {
  uiScale: number;
  adaptiveLayout: boolean;
  surfaceMaterial: string;
  interactionStyle: string;
  accessibilityCount: number;
}

/** A live miniature that consumes the same root tokens as the full product. */
function InterfacePreview({
  uiScale,
  adaptiveLayout,
  surfaceMaterial,
  interactionStyle,
  accessibilityCount,
}: InterfacePreviewProps) {
  const materialLabel = SURFACE_MATERIAL_OPTIONS.find((item) => item.id === surfaceMaterial)?.label;
  const interactionLabel = INTERACTION_STYLE_OPTIONS.find(
    (item) => item.id === interactionStyle,
  )?.label;

  return (
    <AppCard flat className="space-y-3 bg-background" aria-label="معاينة حية للواجهة">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-start">
          <div className="text-body font-semibold text-foreground">مساحة العمل</div>
          <div className="text-mini text-muted-foreground">معاينة مباشرة لكل تغيير</div>
        </div>
        <span className="rounded-sm bg-primary px-2.5 py-1 text-mini font-medium text-primary-foreground">
          {Math.round(uiScale * 100)}٪
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="app-card app-card-compact">
          <div className="text-micro text-muted-foreground">التخطيط</div>
          <div className="mt-1 text-mini font-semibold text-foreground">
            {adaptiveLayout ? 'تكيفي' : 'ثابت'}
          </div>
        </div>
        <div className="app-card app-card-compact">
          <div className="text-micro text-muted-foreground">الخامة</div>
          <div className="mt-1 text-mini font-semibold text-foreground">{materialLabel}</div>
        </div>
        <div className="app-card app-card-compact">
          <div className="text-micro text-muted-foreground">التفاعل</div>
          <div className="mt-1 text-mini font-semibold text-foreground">{interactionLabel}</div>
        </div>
      </div>

      <div className="app-card app-card-compact flex items-center gap-3">
        <span className="row-icon">
          <Layers className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <div className="text-body font-semibold text-foreground">بطاقة نموذجية</div>
          <div className="mt-0.5 text-mini text-muted-foreground">
            توضح الحواف والكثافة والحدود والخامة
          </div>
        </div>
        <span className="text-mini text-muted-foreground">{accessibilityCount} تحسينات</span>
      </div>

      <input
        className="app-control"
        placeholder="حقل إدخال"
        aria-label="حقل إدخال للمعاينة"
        readOnly
      />

      <div className="flex gap-2">
        <span className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-primary px-3 py-2 text-meta font-semibold text-primary-foreground">
          إجراء أساسي
        </span>
        <span className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-secondary px-3 py-2 text-meta font-semibold text-secondary-foreground">
          ثانوي
        </span>
      </div>
    </AppCard>
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
    applyAdvancedInterfacePreferences,
    resetInterfacePreferences,
  } = useApp();
  const [profiles, setProfiles] = useState<SavedInterfaceProfile[]>(readInterfaceProfiles);
  const [profileName, setProfileName] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncProfiles = (event: StorageEvent) => {
      if (event.key === INTERFACE_PROFILES_STORAGE_KEY || event.key === null) {
        setProfiles(readInterfaceProfiles());
      }
    };
    window.addEventListener('storage', syncProfiles);
    return () => window.removeEventListener('storage', syncProfiles);
  }, []);

  const activeDensity = resolveDensity(uiDensity);
  const activeWidth = resolveWidth(contentWidth);
  const activeBorder = resolveBorder(borderStrength);
  const advancedPreferences = {
    uiScale,
    adaptiveLayout,
    surfaceMaterial,
    interactionStyle,
    reducedTransparency,
    strongerContrast,
    largeTouchTargets,
    clearerFocus,
  };
  const activePreset = matchInterfacePreset({
    cornerSoftness,
    density: uiDensity,
    width: contentWidth,
    border: borderStrength,
    surfaceLift,
    ...advancedPreferences,
  });

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

  const applyCompleteSettings = (settings: SavedInterfaceProfile['settings']) => {
    setCornerSoftness(settings.cornerSoftness);
    setUiDensity(settings.density);
    setContentWidth(settings.width);
    setBorderStrength(settings.border);
    setSurfaceLift(settings.surfaceLift);
    applyAdvancedInterfacePreferences(settings);
  };

  const applyPreset = (id: string) => {
    const preset = INTERFACE_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    applyCompleteSettings(preset);
  };

  const applyLift = (id: string) => {
    const option = LIFT_OPTIONS.find((item) => item.id === id);
    if (option) setSurfaceLift(option.id);
  };

  const captureCurrentSettings = (): SavedInterfaceProfile['settings'] => ({
    cornerSoftness,
    density: activeDensity,
    width: activeWidth,
    border: activeBorder,
    surfaceLift,
    ...advancedPreferences,
  });

  const saveProfile = () => {
    const currentProfiles = readInterfaceProfiles();
    if (currentProfiles.length >= MAX_INTERFACE_PROFILES) {
      setProfiles(currentProfiles);
      setFeedback({ tone: 'error', message: 'وصلت إلى الحد الأقصى: ٨ ملفات واجهة.' });
      return;
    }
    const name = profileName.trim() || `ملف واجهة ${currentProfiles.length + 1}`;
    const next = writeInterfaceProfiles([
      ...currentProfiles,
      createSavedInterfaceProfile(name, captureCurrentSettings()),
    ]);
    setProfiles(next);
    setProfileName('');
    setFeedback({ tone: 'success', message: `حُفظ «${name}» بإعدادات الواجهة الحالية.` });
  };

  const applyProfile = (profile: SavedInterfaceProfile) => {
    applyCompleteSettings(profile.settings);
    setFeedback({ tone: 'success', message: `طُبّق «${profile.name}» بالكامل.` });
  };

  const deleteProfile = (id: string) => {
    const currentProfiles = readInterfaceProfiles();
    const profile = currentProfiles.find((item) => item.id === id);
    const next = writeInterfaceProfiles(currentProfiles.filter((item) => item.id !== id));
    setProfiles(next);
    setFeedback({
      tone: 'success',
      message: profile ? `حُذف «${profile.name}».` : 'حُذف ملف الواجهة.',
    });
  };

  const exportProfiles = () => {
    const currentProfiles = readInterfaceProfiles();
    setProfiles(currentProfiles);
    if (currentProfiles.length === 0) {
      setFeedback({ tone: 'error', message: 'احفظ ملف واجهة واحداً على الأقل قبل التصدير.' });
      return;
    }
    const blob = new Blob(
      [JSON.stringify({ version: INTERFACE_PROFILES_VERSION, profiles: currentProfiles }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'interface-profiles.json';
    document.body.appendChild(anchor);
    try {
      anchor.click();
      setFeedback({ tone: 'success', message: 'صُدّرت ملفات الواجهة بصيغة JSON.' });
    } finally {
      anchor.remove();
      URL.revokeObjectURL(url);
    }
  };

  const importProfiles = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_INTERFACE_PROFILE_IMPORT_BYTES) {
      setFeedback({
        tone: 'error',
        message: 'حجم ملف الواجهة أكبر من الحد المسموح (٢٥٦ كيلوبايت).',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    try {
      const imported = parseInterfaceProfilesImport(await file.text());
      if (!imported) {
        setFeedback({ tone: 'error', message: 'تعذر قراءة الملف. اختر ملف واجهة JSON صالحاً.' });
        return;
      }
      const currentProfiles = readInterfaceProfiles();
      const room = MAX_INTERFACE_PROFILES - currentProfiles.length;
      if (room <= 0) {
        setProfiles(currentProfiles);
        setFeedback({ tone: 'error', message: 'احذف ملفاً محفوظاً قبل الاستيراد.' });
        return;
      }
      const stamp = Date.now();
      const additions = imported.slice(0, room).map((profile, index) => ({
        ...profile,
        id: `imported-${stamp}-${index}`,
      }));
      const skipped = imported.length - additions.length;
      const next = writeInterfaceProfiles([...currentProfiles, ...additions]);
      setProfiles(next);
      setFeedback({
        tone: 'success',
        message:
          skipped > 0
            ? `استُورد ${additions.length} وتُرك ${skipped} لبلوغ حد الملفات الثمانية.`
            : `استُورد ${additions.length} من ملفات الواجهة بنجاح.`,
      });
    } catch {
      setFeedback({ tone: 'error', message: 'حدث خطأ أثناء قراءة ملف الاستيراد.' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resetInterface = () => {
    resetInterfacePreferences();
    setFeedback({ tone: 'success', message: 'عادت إعدادات الواجهة فقط إلى قيمها الافتراضية.' });
  };

  return (
    <>
      <SettingsSection
        title="منصة الواجهة"
        subtitle="ثمانية طوابع كاملة، ومعاينة حية لكل تفصيل"
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
          uiScale={uiScale}
          adaptiveLayout={adaptiveLayout}
          surfaceMaterial={surfaceMaterial}
          interactionStyle={interactionStyle}
          accessibilityCount={accessibilityCount}
        />
      </SettingsSection>

      <SettingsSection
        title="المقياس والتكيف"
        subtitle="حجم كروم الواجهة واستجابته للمساحة المتاحة"
        icon={<Maximize2 className="h-4 w-4" aria-hidden />}
      >
        <SliderRow
          label="مقياس الواجهة"
          valueLabel={`${Math.round(uiScale * 100)}٪`}
          value={uiScale}
          min={UI_SCALE_OPTIONS[0].value}
          max={UI_SCALE_OPTIONS[UI_SCALE_OPTIONS.length - 1].value}
          step={0.01}
          onChange={setUiScale}
          presets={UI_SCALE_OPTIONS}
        />
        <ToggleRow
          id="adaptive-layout"
          label="تخطيط تكيفي"
          note="يضبط الهوامش والقياس وفق مساحة الشاشة"
          checked={adaptiveLayout}
          onCheckedChange={setAdaptiveLayout}
        />
      </SettingsSection>

      <SettingsSection
        title="خامة السطح"
        subtitle="درجة حضور الأسطح مع الحفاظ على العقد المسطح"
        icon={<Layers className="h-4 w-4" aria-hidden />}
      >
        <SegmentedControl
          options={toOptions(SURFACE_MATERIAL_OPTIONS)}
          value={surfaceMaterial}
          onChange={(value) => setSurfaceMaterial(value as typeof surfaceMaterial)}
          layoutId="surfaceMaterialIndicator"
          aria-label="خامة السطح"
        />
      </SettingsSection>

      <SettingsSection
        title="طابع التفاعل"
        subtitle="استجابة الضغط وحضور الأيقونات ومؤشر التركيز"
        icon={<Eye className="h-4 w-4" aria-hidden />}
      >
        <SegmentedControl
          options={toOptions(INTERACTION_STYLE_OPTIONS)}
          value={interactionStyle}
          onChange={(value) => setInteractionStyle(value as typeof interactionStyle)}
          layoutId="interactionStyleIndicator"
          aria-label="طابع التفاعل"
        />
      </SettingsSection>

      <SettingsSection
        title="إتاحة ووضوح"
        subtitle="تحسينات مستقلة للشفافية والتباين واللمس والتركيز"
        icon={<Contrast className="h-4 w-4" aria-hidden />}
      >
        <div className="divide-y divide-border">
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
            note="يوسع الحد الأدنى للعناصر التفاعلية"
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
          التطبيق مسطح بالتصميم؛ فرق إضاءة السطح والحد الرفيع هما دليلا العمق
        </p>
      </SettingsSection>

      <SettingsSection
        title="ملفات الواجهة"
        subtitle="احفظ إعدادات الواجهة وحدها أو انقلها بصيغة JSON"
        icon={<Save className="h-4 w-4" aria-hidden />}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            maxLength={48}
            placeholder={`ملف واجهة ${profiles.length + 1}`}
            aria-label="اسم ملف الواجهة"
          />
          <Button
            type="button"
            onClick={saveProfile}
            disabled={profiles.length >= MAX_INTERFACE_PROFILES}
          >
            <Save aria-hidden />
            حفظ الحالي
          </Button>
        </div>

        {profiles.length > 0 ? (
          <div className="space-y-2" aria-label="ملفات الواجهة المحفوظة">
            {profiles.map((profile) => (
              <AppCard key={profile.id} compact flat className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyProfile(profile)}
                  className="min-h-[var(--ui-touch-min)] min-w-0 flex-1 text-start"
                >
                  <span className="block truncate text-body font-medium text-foreground">
                    {profile.name}
                  </span>
                  <span className="block text-mini text-muted-foreground">
                    {Math.round(profile.settings.uiScale * 100)}٪ ·{' '}
                    {DENSITY_LEVELS.find((item) => item.id === profile.settings.density)?.label} ·{' '}
                    {
                      SURFACE_MATERIAL_OPTIONS.find(
                        (item) => item.id === profile.settings.surfaceMaterial,
                      )?.label
                    }
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteProfile(profile.id)}
                  aria-label={`حذف ${profile.name}`}
                >
                  <Trash2 aria-hidden />
                </Button>
              </AppCard>
            ))}
          </div>
        ) : (
          <p className="text-mini text-muted-foreground">لا توجد ملفات محفوظة بعد.</p>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button type="button" variant="secondary" onClick={exportProfiles}>
            <Download aria-hidden />
            تصدير
          </Button>
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload aria-hidden />
            استيراد
          </Button>
          <Button type="button" variant="outline" onClick={resetInterface}>
            <RefreshCcw aria-hidden />
            إعادة الضبط
          </Button>
        </div>
        <Input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="اختيار ملف واجهة JSON للاستيراد"
          onChange={(event) => void importProfiles(event.target.files?.[0])}
        />

        {feedback ? (
          <p
            role={feedback.tone === 'error' ? 'alert' : 'status'}
            className={`text-meta ${
              feedback.tone === 'error' ? 'text-destructive' : 'text-foreground'
            }`}
          >
            {feedback.message}
          </p>
        ) : null}
        <p className="text-micro text-muted-foreground">
          الحد الأقصى ٨ ملفات. لا تتضمن الملفات بيانات الحساب أو إعدادات الميزات الأخرى.
        </p>
      </SettingsSection>
    </>
  );
}
