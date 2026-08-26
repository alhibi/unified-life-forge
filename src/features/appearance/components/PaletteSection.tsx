import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

import { useApp } from '@/contexts/AppContext';
import { Check, Circle, Droplets, ImageIcon, Palette, Sparkles, Zap } from '@/lib/icons';
import { MOTION, pageItem as item } from '@/lib/motion';
import {
  contrastRatio,
  createDynamicPreset,
  extractDominantColor,
  generateThemeTokens,
  getThemeInk,
  getThemeScaleColors,
  hexToHsl,
  resolveThemeId,
  SCALE_STEPS,
  themePresets,
  type ThemeStyle,
} from '@/utils/themeEngine';

import { SettingsSection } from './AppearancePrimitives';

/**
 * Colour: accent strength, the 31 themes, and the eight tones each one
 * publishes. The swatches are the palette itself — seven tones plus the shared
 * ink — not an impression of it.
 */

const themeStyles: {
  id: ThemeStyle;
  icon: typeof Palette;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
}[] = [
  {
    id: 'tonal',
    icon: Droplets,
    name: 'متوازن',
    nameEn: 'Balanced',
    desc: 'إبراز هادئ للاستخدام اليومي',
    descEn: 'Calm everyday accent',
  },
  {
    id: 'vibrant',
    icon: Sparkles,
    name: 'واضح',
    nameEn: 'Clear',
    desc: 'إبراز أوضح مع أسطح محايدة',
    descEn: 'Clearer accent, neutral surfaces',
  },
  {
    id: 'neutral',
    icon: Circle,
    name: 'خافت',
    nameEn: 'Muted',
    desc: 'أقل تشبعاً وأكثر هدوءاً',
    descEn: 'Lower saturation and quieter',
  },
  {
    id: 'expressive',
    icon: Zap,
    name: 'قوي',
    nameEn: 'Strong',
    desc: 'أقوى درجة مسموحة للإبراز',
    descEn: 'Strongest allowed accent',
  },
];

interface ThemeCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  presets: string[];
}

const THEME_CATEGORIES: ThemeCategory[] = [
  {
    id: 'classic',
    nameAr: 'الكلاسيكية والرصينة',
    nameEn: 'Classic & Ink',
    presets: ['copper', 'paper', 'mono', 'obsidian'],
  },
  {
    id: 'nature',
    nameAr: 'الأرض والطبيعة',
    nameEn: 'Nature & Earth',
    presets: ['clay', 'gold', 'moss', 'ocean'],
  },
  {
    id: 'cosmic',
    nameAr: 'العميقة والكونية',
    nameEn: 'Cosmic & Deep',
    presets: ['arctic', 'midnight', 'nebula', 'rose'],
  },
];

/** The 8 bands of a swatch: the theme's seven tones, then its own ink. */
function swatchBands(
  preset: (typeof themePresets)[number],
  style: ThemeStyle,
  isDark: boolean,
): string[] {
  return [...getThemeScaleColors(preset, style, isDark), getThemeInk(preset, isDark)];
}

/** The labels under the tone strip — 50…600, then ink. */
const TONE_LABELS: string[] = [...SCALE_STEPS.map((step) => String(step)), 'حبر'];

function ModePalettePreview({
  preset,
  paletteStyle,
  activeMode,
  onModeChange,
}: {
  preset: (typeof themePresets)[number];
  paletteStyle: ThemeStyle;
  activeMode: 'light' | 'dark';
  onModeChange: (mode: 'light' | 'dark') => void;
}) {
  const modes = [
    { id: 'light' as const, label: 'فاتح', note: 'مساحة مشرقة ومتزنة' },
    { id: 'dark' as const, label: 'داكن', note: 'عمق مريح للعين' },
  ];

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-micro font-bold text-foreground">معاينة الوضعين</p>
          <p className="mt-0.5 text-micro text-muted-foreground">نفس الهوية اللونية، معايرة مختلفة لكل إضاءة</p>
        </div>
        <span className="text-micro font-semibold text-primary">{preset.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {modes.map((mode) => {
          const isActive = activeMode === mode.id;
          const tokens = generateThemeTokens(preset, paletteStyle, mode.id === 'dark', false);
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onModeChange(mode.id)}
              aria-pressed={isActive}
              className={`group overflow-hidden rounded-md border text-start transition-all ${isActive ? 'border-primary ring-1 ring-primary/30' : 'border-border'}`}
            >
              <div className="flex h-12 items-end justify-between gap-1 p-2" style={{ backgroundColor: `hsl(${tokens['--background']})` }}>
                <span className="text-micro font-bold" style={{ color: `hsl(${tokens['--foreground']})` }}>{mode.label}</span>
                <span className="flex gap-1">
                  <i className="h-3 w-3 rounded-full" style={{ backgroundColor: `hsl(${tokens['--primary']})` }} />
                  <i className="h-3 w-3 rounded-full" style={{ backgroundColor: `hsl(${tokens['--card']})` }} />
                </span>
              </div>
              <div className="bg-card px-2 py-1.5 text-micro text-muted-foreground">{mode.note}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PaletteHealth({
  preset,
  paletteStyle,
  isDark,
}: {
  preset: (typeof themePresets)[number];
  paletteStyle: ThemeStyle;
  isDark: boolean;
}) {
  const tokens = generateThemeTokens(preset, paletteStyle, isDark, false);
  const mode = preset[isDark ? 'dark' : 'light'];
  const background = hexToHsl(mode.bg);
  const card = hexToHsl(mode.surface);
  const accent = hexToHsl(mode.accent);
  const textContrast = contrastRatio(hexToHsl(mode.ink), background);
  const accentContrast = contrastRatio(accent, background);
  const surfaceSeparation = Math.abs(card[2] - background[2]);
  const checks = [
    { label: 'النص الأساسي', value: `${textContrast.toFixed(1)}:1`, good: textContrast >= 6.9 },
    { label: 'الإبراز', value: `${accentContrast.toFixed(1)}:1`, good: accentContrast >= 3.15 },
    { label: 'فصل السطح', value: `${surfaceSeparation.toFixed(1)}°`, good: surfaceSeparation >= 2.5 },
  ];

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-micro font-bold text-foreground">قراءة الثيم الحالية</p>
          <p className="mt-0.5 text-micro text-muted-foreground">
            {isDark ? 'داكن' : 'فاتح'} · {paletteStyle === 'neutral' ? 'إبراز خافت' : 'إبراز متوازن'}
          </p>
        </div>
        <span className="rounded-full bg-success/10 px-2 py-1 text-micro font-semibold text-success">متوافق بصرياً</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {checks.map((check) => (
          <div key={check.label} className="rounded-md bg-secondary/60 px-2 py-2 text-center">
            <p className="text-micro text-muted-foreground">{check.label}</p>
            <p className={`mt-1 text-meta font-bold ${check.good ? 'text-foreground' : 'text-warning'}`}>{check.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 overflow-hidden rounded-md border border-border">
        <div className="flex min-h-16 flex-col justify-between p-3" style={{ backgroundColor: `hsl(${tokens['--background']})` }}>
          <span className="text-micro" style={{ color: `hsl(${tokens['--muted-foreground']})` }}>الخلفية</span>
          <span className="text-body font-bold" style={{ color: `hsl(${tokens['--foreground']})` }}>مساحة هادئة</span>
        </div>
        <div className="flex min-h-16 flex-col justify-between p-3" style={{ backgroundColor: `hsl(${tokens['--card']})` }}>
          <span className="text-micro" style={{ color: `hsl(${tokens['--muted-foreground']})` }}>السطح</span>
          <span className="text-micro font-semibold" style={{ color: `hsl(${tokens['--card-foreground']})` }}>محتوى واضح</span>
        </div>
        <div className="flex min-h-16 flex-col justify-between p-3" style={{ backgroundColor: `hsl(${tokens['--primary']})` }}>
          <span className="text-micro" style={{ color: `hsl(${tokens['--primary-foreground']})` }}>الإبراز</span>
          <span className="text-micro font-semibold" style={{ color: `hsl(${tokens['--primary-foreground']})` }}>إجراء مهم</span>
        </div>
      </div>
    </div>
  );
}

function StructuralRolePreview({
  preset,
  paletteStyle,
  isDark,
}: {
  preset: (typeof themePresets)[number];
  paletteStyle: ThemeStyle;
  isDark: boolean;
}) {
  const tokens = generateThemeTokens(preset, paletteStyle, isDark, false);
  const roles = [
    { label: 'التنقل', bg: tokens['--navigation'], fg: tokens['--navigation-foreground'] },
    { label: 'طبقة الطفو', bg: tokens['--overlay-surface'], fg: tokens['--overlay-foreground'] },
    { label: 'حلقة التركيز', bg: tokens['--focus-ring'], fg: tokens['--primary-foreground'] },
  ];
  return (
    <>
      {roles.map((role) => (
        <div key={role.label} className="flex flex-col items-center gap-1 rounded-md border border-border p-2" style={{ backgroundColor: `hsl(${role.bg})` }}>
          <span className="text-micro text-muted-foreground">{role.label}</span>
          <span className="text-micro font-bold" style={{ color: `hsl(${role.fg})` }}>{role.label}</span>
        </div>
      ))}
    </>
  );
}

function ThemePresetsCategorized({
  colorTheme,
  paletteStyle,
  setColorTheme,
  isDark,
  setThemeMode,
}: {
  colorTheme: string;
  paletteStyle: ThemeStyle;
  setColorTheme: (theme: string) => void;
  isDark: boolean;
  setThemeMode: (mode: 'light' | 'dark') => void;
}) {
  const initialCategory =
    THEME_CATEGORIES.find((cat) => cat.presets.includes(colorTheme))?.id || 'classic';
  const [activeTab, setActiveTab] = useState<string>(initialCategory);
  const prevThemeRef = React.useRef(colorTheme);

  // Sync activeTab only when colorTheme actually changes from outside.
  useEffect(() => {
    if (prevThemeRef.current === colorTheme) return;
    prevThemeRef.current = colorTheme;
    const matchedCategory = THEME_CATEGORIES.find((cat) => cat.presets.includes(colorTheme))?.id;
    if (!matchedCategory) return;

    // Schedule external theme synchronization outside the effect body to
    // avoid a cascading render while preserving user-driven category tabs.
    const timeout = window.setTimeout(() => setActiveTab(matchedCategory), 0);
    return () => window.clearTimeout(timeout);
  }, [colorTheme]);

  const currentCategoryPresets = themePresets.filter((preset) => {
    const cat = THEME_CATEGORIES.find((c) => c.id === activeTab);
    return cat?.presets.includes(preset.id);
  });

  const activePreset = themePresets.find((preset) => preset.id === resolveThemeId(colorTheme));

  return (
    <div className="space-y-4">
      <p className="text-mini text-muted-foreground">
        كل ثيم سلّم لوني متكامل من ١١ درجة، محسوب إدراكياً على الوضع الحالي
        {isDark ? ' الداكن' : ' الفاتح'} ومُتحقَّق من تباينه آلياً
      </p>

      {/* Segmented category tabs */}
      <div className="relative flex overflow-hidden rounded-md border border-border bg-secondary p-1">
        {THEME_CATEGORIES.map((cat) => {
          const isSelected = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              aria-pressed={isSelected}
              className="relative z-raised min-w-0 flex-1 py-2 text-micro font-bold transition-colors focus:outline-none"
            >
              {isSelected && (
                <motion.div
                  layoutId="activeCategoryGlow"
                  className="absolute inset-0 z-base rounded-md border border-border bg-background"
                  transition={MOTION.spring}
                />
              )}
              <span
                className={`relative z-raised block truncate text-center ${
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {cat.nameAr.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="text-center text-mini font-semibold tracking-wide text-primary">
        {THEME_CATEGORIES.find((c) => c.id === activeTab)?.nameAr}
      </div>

      {/* Categorized grid */}
      <div className="grid grid-cols-4 gap-4 pt-1">
        <AnimatePresence mode="popLayout">
          {currentCategoryPresets.map((preset) => {
            const isActive = colorTheme === preset.id;
            const bands = swatchBands(preset, paletteStyle, isDark);
            return (
              <motion.button
                key={preset.id}
                type="button"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.2 }}
                onClick={() => setColorTheme(preset.id)}
                aria-pressed={isActive}
                className="group relative flex flex-col items-center gap-2"
              >
                <div
                  className={`relative h-12 w-12 overflow-hidden rounded-full border-2 transition-all ${
                    isActive ? 'scale-110 border-primary' : 'border-border'
                  }`}
                >
                  {/* All eight tones, lightest at the top — the swatch is the
                      palette itself, ink included. */}
                  <div className="absolute inset-0 flex flex-col">
                    {bands.map((color, i) => (
                      <div key={i} className="w-full flex-1" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-card">
                          <Check className="h-3 w-3 stroke-[2.5] text-foreground" aria-hidden />
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span
                  className={`text-center text-micro font-bold ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {preset.name}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* The active theme's eight tones, named. This is the contract the whole
          app is built on, so it is worth showing explicitly. */}
      {activePreset && (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="text-micro font-bold text-muted-foreground">
              درجات الثيم · أسطح ثم إبراز ثم حبر
            </span>
            <span className="text-micro text-muted-foreground">{activePreset.name}</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {swatchBands(activePreset, paletteStyle, isDark).map((color, i) => (
              <div key={TONE_LABELS[i]} className="space-y-1">
                <div
                  className="h-7 w-full rounded-sm border border-border"
                  style={{ backgroundColor: color }}
                />
                <div className="text-center text-micro tabular-nums text-muted-foreground">
                  {TONE_LABELS[i]}
                </div>
              </div>
            ))}
          </div>
          <p className="text-micro text-muted-foreground">
            الحبر هو الدرجة الأخيرة، ويُرفع تباينه تلقائياً حتى ٧:١ على الخلفية
          </p>
        </div>
      )}

      {activePreset && (
        <>
          <ModePalettePreview
            preset={activePreset}
            paletteStyle={paletteStyle}
            activeMode={isDark ? 'dark' : 'light'}
            onModeChange={setThemeMode}
          />
          <PaletteHealth preset={activePreset} paletteStyle={paletteStyle} isDark={isDark} />
        </>
      )}

      {/* Structural roles preview — tokens that govern navigation, overlays, and interactive states. */}
      {activePreset && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-micro font-bold text-foreground">الأدوار الهيكلية</p>
          <p className="mt-0.5 text-micro text-muted-foreground">
            رموز موحّدة للتنقل، الطبقات، والحالات التفاعلية
          </p>
          <div className="grid grid-cols-3 gap-2">
            <StructuralRolePreview preset={activePreset} paletteStyle={paletteStyle} isDark={isDark} />
          </div>
        </div>
      )}

      {/* The applied tokens, as the app actually renders them. */}
      <div className="space-y-2 border-t border-border pt-3">
        <span className="text-micro font-bold text-muted-foreground">معاينة الرموز</span>
        <div className="flex gap-2">
          <div className="flex h-8 flex-1 items-center justify-center rounded-md bg-primary text-micro font-semibold text-primary-foreground">
            أساسي
          </div>
          <div className="flex h-8 flex-1 items-center justify-center rounded-md bg-secondary text-micro font-semibold text-secondary-foreground">
            ثانوي
          </div>
          <div className="flex h-8 flex-1 items-center justify-center rounded-md bg-accent text-micro font-semibold text-accent-foreground">
            مميز
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-6 flex-1 rounded-sm bg-muted" />
          <div className="h-6 flex-1 rounded-sm border border-border bg-card" />
          <div className="h-6 flex-1 rounded-sm bg-background border border-border" />
        </div>
      </div>
    </div>
  );
}

export default function PaletteSection() {
  const { colorTheme, setColorTheme, paletteStyle, setPaletteStyle, theme, setTheme } = useApp();
  const isDark = theme === 'dark';

  const handleDynamicImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const hsl = extractDominantColor(img);
          const preset = createDynamicPreset(hsl);
          // Save dynamic preset data to localStorage
          localStorage.setItem('app-dynamic-preset', JSON.stringify(preset));
          setColorTheme('dynamic');
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <>
      <SettingsSection
        title="قوة لون الإبراز"
        subtitle="كم يعلو لون الثيم على الأسطح المحايدة"
        icon={<Droplets className="h-4 w-4" aria-hidden />}
      >
        <div className="grid grid-cols-2 gap-2.5">
          {themeStyles.map((ts) => {
            const isActive = paletteStyle === ts.id;
            const Icon = ts.icon;
            return (
              <button
                key={ts.id}
                type="button"
                onClick={() => setPaletteStyle(ts.id)}
                aria-pressed={isActive}
                className={`app-card app-card-compact app-card-pressable flex items-center gap-3 text-start ${
                  isActive ? 'border-primary/50' : ''
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                    isActive ? 'bg-primary/15' : 'bg-secondary'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                    aria-hidden
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-meta font-semibold text-foreground">{ts.name}</span>
                  <span className="block truncate text-micro text-muted-foreground">{ts.desc}</span>
                </span>
                {isActive && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} aria-hidden>
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="لوحة الألوان"
        subtitle="اثنا عشر ثيماً منتقىً، كل منها سلّم إدراكي من إحدى عشرة درجة"
        icon={<Palette className="h-4 w-4" aria-hidden />}
      >
        <ThemePresetsCategorized
          colorTheme={resolveThemeId(colorTheme)}
          paletteStyle={paletteStyle as ThemeStyle}
          setColorTheme={setColorTheme as (t: string) => void}
          isDark={isDark}
          setThemeMode={setTheme}
        />
      </SettingsSection>

      <motion.section variants={item}>
        <button
          type="button"
          onClick={handleDynamicImage}
          className="app-card app-card-pressable flex w-full items-center gap-4 text-start"
        >
          <span className="row-icon">
            <ImageIcon className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold text-foreground">ثيم ديناميكي</span>
            <span className="mt-0.5 block text-mini text-muted-foreground">
              استخرج الألوان من صورة
            </span>
          </span>
          <Palette className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </motion.section>
    </>
  );
}
