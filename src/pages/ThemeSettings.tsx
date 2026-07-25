import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import {
  getAutoPrayerThemeEnabled,
  getPrayerThemeMap,
  type PrayerSlot,
  setAutoPrayerThemeEnabled,
  setPrayerThemeFor,
} from '@/hooks/useAutoPrayerTheme';
import {
  Check,
  ChevronDown,
  Circle,
  Clock,
  Contrast,
  Droplets,
  ImageIcon,
  Moon,
  Palette,
  Sparkles,
  Sun,
  Zap,
} from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';
import {
  createDynamicPreset,
  extractDominantColor,
  generateThemeTokens,
  getThemeScaleColors,
  SCALE_STEPS,
  themePresets,
  type ThemeStyle,
} from '@/utils/themeEngine';

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <Switch
      checked={value}
      onCheckedChange={onChange}
      aria-label={value ? 'إيقاف الخيار' : 'تفعيل الخيار'}
    />
  );
}

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

// Category definition for themes
interface ThemeCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  presets: string[]; // preset IDs
}

const THEME_CATEGORIES: ThemeCategory[] = [
  {
    id: 'classic',
    nameAr: 'الكلاسيكية والرصينة',
    nameEn: 'Classic & Ink',
    presets: ['default', 'paper', 'mono', 'coffee', 'fog', 'obsidian'],
  },
  {
    id: 'nature',
    nameAr: 'الأرض والطبيعة',
    nameEn: 'Nature & Earth',
    presets: ['emerald', 'matcha', 'moss', 'clay', 'sandstone', 'mint'],
  },
  {
    id: 'warm',
    nameAr: 'الدافئة والمشرقة',
    nameEn: 'Warm & Bright',
    presets: ['sunset', 'gold', 'cherry', 'volcano', 'copper', 'amber', 'terracotta'],
  },
  {
    id: 'cosmic',
    nameAr: 'العميقة والكونية',
    nameEn: 'Cosmic & Deep',
    presets: [
      'midnight',
      'rose',
      'lavender',
      'ocean',
      'neon',
      'aurora',
      'sakura',
      'arctic',
      'nebula',
      'silk',
      'dusk',
      'storm',
    ],
  },
];

function ThemePresetsCategorized({
  colorTheme,
  getPreviewColors,
  setColorTheme,
}: {
  colorTheme: string;
  getPreviewColors: (preset: (typeof themePresets)[0]) => string[];
  setColorTheme: (theme: string) => void;
}) {
  // Determine initial tab based on selected colorTheme
  const initialCategory =
    THEME_CATEGORIES.find((cat) => cat.presets.includes(colorTheme))?.id || 'classic';
  const [activeTab, setActiveTab] = useState<string>(initialCategory);
  const prevThemeRef = React.useRef(colorTheme);

  // Sync activeTab only when colorTheme actually changes from outside
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

  const activePreset = themePresets.find((preset) => preset.id === colorTheme);

  return (
    <motion.div variants={item} className="premium-card-elevated p-5 space-y-5">
      <div className="text-center">
        <h2 className="font-semibold text-[13px] text-muted-foreground uppercase tracking-wider">
          {'لوحة الألوان'}
        </h2>
        <p className="text-[10px] text-muted-foreground/80 mt-0.5">
          {'كل ثيم سبع درجات متناسقة (50 ← 600) تُوزَّع على التطبيق بالكامل'}
        </p>
      </div>

      {/* Segmented Tab Controls (iOS-inspired luxury style) */}
      <div className="relative flex p-1 bg-secondary rounded-xl overflow-hidden border border-border/30">
        {THEME_CATEGORIES.map((cat) => {
          const isSelected = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className="relative flex-1 py-2 text-[10px] font-bold transition-colors duration-300 z-raised focus:outline-none"
            >
              {isSelected && (
                <motion.div
                  layoutId="activeCategoryGlow"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/10 z-base"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span
                className={`relative z-raised block text-center truncate ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {cat.nameAr.split(' ')[0]} {/* shortened for mobile spacing */}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-label showing current full category name */}
      <div className="text-center text-[11px] font-semibold text-primary/80 tracking-wide">
        {THEME_CATEGORIES.find((c) => c.id === activeTab)?.nameAr}
      </div>

      {/* Categorized Grid */}
      <div className="grid grid-cols-4 gap-4 pt-1 min-h-[140px]">
        <AnimatePresence mode="popLayout">
          {currentCategoryPresets.map((preset) => {
            const isActive = colorTheme === preset.id;
            const colors = getPreviewColors(preset);
            return (
              <motion.button
                key={preset.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.2 }}
                onClick={() => setColorTheme(preset.id)}
                className="flex flex-col items-center gap-2 group relative"
              >
                <div
                  className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all duration-300 ${
                    isActive
                      ? 'border-primary scale-110'
                      : 'border-border/50 group-hover:border-border'
                  }`}
                >
                  {/* All seven tones, lightest at the top — the swatch is the
                      palette itself, not an impression of it. */}
                  <div className="absolute inset-0 flex flex-col">
                    {colors.map((color, i) => (
                      <div key={i} className="w-full flex-1" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/35"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span
                  className={`text-[10px] font-bold leading-tight text-center transition-colors ${
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

      {/* The active theme's seven tones, named. This is the contract the whole
          app is built on, so it is worth showing explicitly. */}
      {activePreset && (
        <div className="space-y-2 pt-1 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground">{'درجات الثيم'}</span>
            <span className="text-[10px] text-muted-foreground/70">{activePreset.name}</span>
          </div>
          <div className="flex gap-1">
            {getPreviewColors(activePreset).map((color, i) => (
              <div key={SCALE_STEPS[i]} className="flex-1 space-y-1">
                <div
                  className="h-7 w-full rounded-md border border-border/40"
                  style={{ backgroundColor: color }}
                />
                <div className="text-micro text-center text-muted-foreground/70 tabular-nums">
                  {SCALE_STEPS[i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function ThemeSettingsPage() {
  const {
    theme,
    setTheme,
    blackMode,
    setBlackMode,
    colorTheme,
    setColorTheme,
    paletteStyle,
    setPaletteStyle,
  } = useApp();

  // Auto-theme by prayer time
  const [autoEnabled, setAutoEnabled] = useState<boolean>(getAutoPrayerThemeEnabled());
  const [prayerMap, setPrayerMap] = useState(getPrayerThemeMap());
  const [expandedSlot, setExpandedSlot] = useState<PrayerSlot | null>(null);

  const toggleAuto = () => {
    const next = !autoEnabled;
    setAutoEnabled(next);
    setAutoPrayerThemeEnabled(next);
  };

  const updateSlot = (slot: PrayerSlot, colorThemeId: string, mode: 'light' | 'dark') => {
    setPrayerThemeFor(slot, colorThemeId, mode);
    setPrayerMap(getPrayerThemeMap());
  };

  const prayerSlots: { id: PrayerSlot; ar: string; icon: typeof Sun }[] = [
    { id: 'fajr', ar: 'الفجر', icon: Moon },
    { id: 'sunrise', ar: 'الشروق', icon: Sun },
    { id: 'dhuhr', ar: 'الظهر', icon: Sun },
    { id: 'asr', ar: 'العصر', icon: Sun },
    { id: 'maghrib', ar: 'المغرب', icon: Sun },
    { id: 'isha', ar: 'العشاء', icon: Moon },
  ];

  const themeOptions = [
    { mode: 'dark' as const, icon: Moon, label: 'داكن' },
    { mode: 'light' as const, icon: Sun, label: 'فاتح' },
  ];

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

  // Preview the exact tokens applied by the runtime theme engine.
  const getPresetPreviewTokens = (
    preset: (typeof themePresets)[0],
    mode: 'light' | 'dark' = theme,
  ) =>
    generateThemeTokens(
      preset,
      paletteStyle as ThemeStyle,
      mode === 'dark',
      mode === 'dark' && blackMode,
    );

  const getPreviewColor = (preset: (typeof themePresets)[0], mode: 'light' | 'dark' = theme) =>
    `hsl(${getPresetPreviewTokens(preset, mode)['--primary']})`;

  // The swatch shows the theme's actual published palette — all seven tones,
  // 50 → 600 — not a sample of four generated tokens.
  const getPreviewColors = (preset: (typeof themePresets)[0]) =>
    getThemeScaleColors(preset, paletteStyle as ThemeStyle);

  return (
    <div className="min-h-screen bg-background pb-page px-5 pt-14">
      <SEO
        title={'المظهر والألوان — SmartHub'}
        description={'اختر السمة والألوان ونمط اللوحة لتجربتك في SmartHub.'}
        path="/settings/theme"
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-4 max-w-lg mx-auto"
      >
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3 mb-2">
          <BackButton to="/settings" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary stroke-[1.8]" />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">
              {'المظهر والألوان'}
            </h1>
          </div>
        </motion.div>

        {/* Appearance Mode */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <h2 className="font-semibold text-[13px] text-muted-foreground text-center mb-4 uppercase tracking-wider">
            {'الوضع'}
          </h2>
          <div className="flex justify-center gap-6">
            {themeOptions.map(({ mode, icon: Icon, label }) => {
              const isActive = theme === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  className="flex flex-col items-center gap-2.5 relative focus:outline-none select-none"
                >
                  <div className="relative w-[56px] h-[56px] rounded-full flex items-center justify-center overflow-hidden bg-secondary">
                    {isActive && (
                      <motion.div
                        layoutId="activeThemeMode"
                        className="absolute inset-0 bg-primary rounded-full z-base"
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    )}
                    <Icon
                      className={`w-5 h-5 relative z-raised transition-colors duration-250 ${
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[12px] font-medium transition-colors duration-250 ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Auto Theme by Prayer Time */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="text-start flex-1 min-w-0">
                <h3 className="font-semibold text-[14px] text-foreground">
                  {'ثيم تلقائي حسب وقت الصلاة'}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {'يتغير الثيم تلقائياً مع كل صلاة'}
                </p>
              </div>
            </div>
            <ToggleSwitch value={autoEnabled} onChange={toggleAuto} />
          </div>

          <AnimatePresence>
            {autoEnabled && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                  <p className="text-[11px] text-muted-foreground text-center mb-2">
                    {'اضغط على أي صلاة لتخصيص ثيمها'}
                  </p>
                  {prayerSlots.map((slot) => {
                    const cur = prayerMap[slot.id];
                    const preset =
                      themePresets.find((p) => p.id === cur?.colorTheme) || themePresets[0];
                    const previewColor = getPreviewColor(preset, cur?.mode ?? 'light');
                    const isExpanded = expandedSlot === slot.id;
                    const Icon = slot.icon;
                    return (
                      <div
                        key={slot.id}
                        className="rounded-xl bg-card/50 border border-border/40 overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                          className="w-full flex items-center gap-3 p-3 active:bg-muted/30 transition-colors"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-[13px] font-medium text-foreground flex-1 text-start">
                            {slot.ar}
                          </span>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded-full border border-border"
                              style={{ backgroundColor: previewColor }}
                            />
                            {cur?.mode === 'dark' ? (
                              <Moon className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <Sun className="w-3 h-3 text-muted-foreground" />
                            )}
                            <ChevronDown
                              className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 pt-0 space-y-3">
                                <div className="flex gap-2">
                                  {(['light', 'dark'] as const).map((m) => (
                                    <button
                                      key={m}
                                      onClick={() => updateSlot(slot.id, cur.colorTheme, m)}
                                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                        cur?.mode === m
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-secondary text-muted-foreground'
                                      }`}
                                    >
                                      {m === 'light' ? 'فاتح' : 'داكن'}
                                    </button>
                                  ))}
                                </div>
                                <div className="grid grid-cols-6 gap-2">
                                  {themePresets
                                    .filter((p) => p.id !== 'dynamic')
                                    .slice(0, 18)
                                    .map((p) => {
                                      const previewColor = getPreviewColor(p, cur?.mode || 'light');
                                      const isSel = cur?.colorTheme === p.id;
                                      return (
                                        <button
                                          key={p.id}
                                          onClick={() =>
                                            updateSlot(slot.id, p.id, cur?.mode || 'light')
                                          }
                                          className={`relative w-full aspect-square rounded-full border-2 transition-all ${
                                            isSel ? 'border-primary scale-110' : 'border-border/50'
                                          }`}
                                          style={{ backgroundColor: previewColor }}
                                        >
                                          {isSel && (
                                            <Check
                                              className="absolute inset-0 m-auto w-3 h-3 text-white"
                                              strokeWidth={3}
                                            />
                                          )}
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Theme Style */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <h2 className="font-semibold text-[13px] text-muted-foreground text-center mb-4 uppercase tracking-wider">
            {'قوة لون الإبراز'}
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {themeStyles.map((ts) => {
              const isActive = paletteStyle === ts.id;
              const Icon = ts.icon;
              return (
                <motion.button
                  key={ts.id}

                  onClick={() => setPaletteStyle(ts.id)}
                  className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 ${
                    isActive ? 'border-primary/40 bg-primary/8' : 'border-border bg-card'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isActive ? 'bg-primary/15' : 'bg-secondary'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                  </div>
                  <div className="text-start flex-1 min-w-0">
                    <p
                      className={`text-[13px] font-semibold ${isActive ? 'text-foreground' : 'text-foreground'}`}
                    >
                      {ts.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{ts.desc}</p>
                  </div>
                  {isActive && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Color Palettes Categorized with Animated Segmented Controls */}
        <ThemePresetsCategorized
          colorTheme={colorTheme}
          getPreviewColors={getPreviewColors}
          setColorTheme={setColorTheme as (t: string) => void}
        />

        {/* Dynamic Theme */}
        <motion.div variants={item}>
          <button
            onClick={handleDynamicImage}
            className="flex items-center w-full p-4 premium-card-elevated gap-4 active:scale-[0.99] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-start">
              <h3 className="font-semibold text-[14px] text-foreground">{'ثيم ديناميكي'}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{'استخرج الألوان من صورة'}</p>
            </div>
            <Palette className="w-5 h-5 text-muted-foreground shrink-0" />
          </button>
        </motion.div>

        {/* Black Mode Toggle */}
        <motion.div variants={item}>
          <button
            onClick={() => setBlackMode(!blackMode)}
            className="flex items-center w-full p-4 premium-card-elevated gap-4 active:scale-[0.99] transition-transform"
          >
            <ToggleSwitch value={blackMode} onChange={() => {}} />
            <div className="flex-1 text-start">
              <h3 className="font-semibold text-[14px] text-foreground">{'الوضع الأسود'}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{'أسود حقيقي لشاشات OLED'}</p>
            </div>
            <Contrast className="w-5 h-5 text-muted-foreground shrink-0" />
          </button>
        </motion.div>

        {/* Preview */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <h2 className="font-semibold text-[13px] text-muted-foreground text-center mb-4 uppercase tracking-wider">
            {'معاينة'}
          </h2>
          <div className="space-y-3">
            {/* Mini preview card */}
            <div className="rounded-2xl bg-background border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="h-3 w-24 rounded bg-foreground/80" />
                  <div className="h-2 w-16 rounded bg-muted-foreground/40 mt-1.5" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-8 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-primary-foreground">
                    {'أساسي'}
                  </span>
                </div>
                <div className="flex-1 h-8 rounded-xl bg-secondary flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-secondary-foreground">
                    {'ثانوي'}
                  </span>
                </div>
                <div className="flex-1 h-8 rounded-xl bg-accent flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-accent-foreground">{'مميز'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-6 rounded-lg bg-muted" />
                <div className="flex-1 h-6 rounded-lg bg-border" />
                <div className="flex-1 h-6 rounded-lg bg-card border border-border" />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
