import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
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
  Smartphone,
  LayoutGrid,
} from '@/lib/icons';
import { type DesignMode } from '@/contexts/AppContext';

const designModesList = [
  {
    id: 'classic' as const,
    nameAr: 'الكلاسيكي الفاخر',
    nameDe: 'Obsidian Classic',
    descAr: 'نمط هاب الكلاسيكي بلمسة فخامة الأوبسيديان والذهب الأخاذة',
    descDe: 'Klassische Eleganz mit Obsidian- und Goldakzenten',
    icon: Sparkles,
  },
  {
    id: 'md3' as const,
    nameAr: 'ماتيريال ٣ الذكي',
    nameDe: 'Material Design 3',
    descAr: 'تصميم غوغل المبتكر بحواف مستديرة وبطاقات ناعمة الملمس',
    descDe: 'Googles modernes Interface mit abgerundeten Karten',
    icon: LayoutGrid,
  },
  {
    id: 'ios' as const,
    nameAr: 'نظام آبل ٢٠٢٤',
    nameDe: 'iOS Native 2024',
    descAr: 'البساطة السلسة مع قوائم منسقة تفيض بالدقة والجمال الطبيعي',
    descDe: 'Klares Apple-Design mit strukturierten Listen',
    icon: Smartphone,
  },
  {
    id: 'aura' as const,
    nameAr: 'الهالة الساحرة',
    nameDe: 'Pure Aura',
    descAr: 'نمط نقي يجمع بين السكون المطلق والثراء البصري كالحرير المتلألئ',
    descDe: 'Reiner Minimalismus mit sanften Lichteffekten',
    icon: Droplets,
  },
];
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';
import {
  createDynamicPreset,
  extractDominantColor,
  themePresets,
  type ThemeStyle,
} from '@/utils/themeEngine';

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-[50px] h-[28px] rounded-full transition-colors duration-300 shrink-0 ${value ? 'bg-primary' : 'bg-muted'}`}
      dir="ltr"
    >
      <motion.div
        className="absolute top-[4px] w-[20px] h-[20px] rounded-full bg-primary-foreground"
        animate={{ left: value ? 26 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
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
    name: 'ناعم',
    nameEn: 'Tonal Spot',
    desc: 'ألوان هادئة ومريحة',
    descEn: 'Soft & calm colors',
  },
  {
    id: 'vibrant',
    icon: Sparkles,
    name: 'حيوي',
    nameEn: 'Vibrant',
    desc: 'ألوان غنية ومشبعة',
    descEn: 'Rich & saturated',
  },
  {
    id: 'neutral',
    icon: Circle,
    name: 'محايد',
    nameEn: 'Neutral',
    desc: 'تدرجات رمادية خفيفة',
    descEn: 'Subtle grayscale',
  },
  {
    id: 'expressive',
    icon: Zap,
    name: 'معبّر',
    nameEn: 'Expressive',
    desc: 'تباين عالي وجريء',
    descEn: 'High contrast & bold',
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
    presets: ['paper', 'default', 'mono', 'coffee', 'fog', 'obsidian'],
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
  isAr,
  colorTheme,
  getPreviewColors,
  setColorTheme,
}: {
  isAr: boolean;
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
    if (prevThemeRef.current !== colorTheme) {
      prevThemeRef.current = colorTheme;
      const matchedCategory = THEME_CATEGORIES.find((cat) => cat.presets.includes(colorTheme))?.id;
      if (matchedCategory) {
        setActiveTab(matchedCategory);
      }
    }
  }, [colorTheme]);

  const currentCategoryPresets = themePresets.filter((preset) => {
    const cat = THEME_CATEGORIES.find((c) => c.id === activeTab);
    return cat?.presets.includes(preset.id);
  });

  return (
    <motion.div variants={item} className="premium-card-elevated p-5 space-y-5">
      <div className="text-center">
        <h2 className="font-semibold text-[13px] text-muted-foreground uppercase tracking-wider">
          {isAr ? 'لوحة الألوان' : 'Color Palette'}
        </h2>
        <p className="text-[10px] text-muted-foreground/80 mt-0.5">
          {isAr
            ? 'اختر التناغم اللوني المفضل لديك عبر التصنيفات الراقية'
            : 'Choose your preferred color harmony from curated categories'}
        </p>
      </div>

      {/* Segmented Tab Controls (iOS-inspired luxury style) */}
      <div className="relative flex p-1 bg-secondary/60 rounded-xl overflow-hidden backdrop-blur-sm border border-border/30">
        {THEME_CATEGORIES.map((cat) => {
          const isSelected = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className="relative flex-1 py-2 text-[10.5px] font-bold transition-colors duration-300 z-10 focus:outline-none"
            >
              {isSelected && (
                <motion.div
                  layoutId="activeCategoryGlow"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/10 z-0"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span
                className={`relative z-10 block text-center truncate ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {isAr ? cat.nameAr.split(' ')[0] : cat.nameEn.split(' ')[0]}{' '}
                {/* shortened for mobile spacing */}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-label showing current full category name */}
      <div className="text-center text-[11px] font-semibold text-primary/80 tracking-wide">
        {isAr
          ? THEME_CATEGORIES.find((c) => c.id === activeTab)?.nameAr
          : THEME_CATEGORIES.find((c) => c.id === activeTab)?.nameEn}
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
                      ? 'border-primary scale-110 shadow-[0_0_12px_rgba(var(--live),0.2)]'
                      : 'border-border/50 group-hover:border-border'
                  }`}
                >
                  <div className="absolute inset-0">
                    <div
                      className="absolute top-0 left-0 w-full h-1/4"
                      style={{ backgroundColor: colors[0] }}
                    />
                    <div
                      className="absolute top-[25%] left-0 w-full h-1/4"
                      style={{ backgroundColor: colors[1] }}
                    />
                    <div
                      className="absolute top-[50%] left-0 w-full h-1/4"
                      style={{ backgroundColor: colors[2] }}
                    />
                    <div
                      className="absolute top-[75%] left-0 w-full h-1/4"
                      style={{ backgroundColor: colors[3] }}
                    />
                  </div>
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]"
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
                  {isAr ? preset.name : preset.nameEn}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function ThemeSettingsPage() {
  const {
    language,
    theme,
    setTheme,
    blackMode,
    setBlackMode,
    colorTheme,
    setColorTheme,
    paletteStyle,
    setPaletteStyle,
    designMode,
    setDesignMode,
  } = useApp();
  const isAr = language === 'ar';

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

  const prayerSlots: { id: PrayerSlot; ar: string; de: string; icon: typeof Sun }[] = [
    { id: 'fajr', ar: 'الفجر', de: 'Fajr', icon: Moon },
    { id: 'sunrise', ar: 'الشروق', de: 'Sunrise', icon: Sun },
    { id: 'dhuhr', ar: 'الظهر', de: 'Dhuhr', icon: Sun },
    { id: 'asr', ar: 'العصر', de: 'Asr', icon: Sun },
    { id: 'maghrib', ar: 'المغرب', de: 'Maghrib', icon: Sun },
    { id: 'isha', ar: 'العشاء', de: 'Isha', icon: Moon },
  ];

  const themeOptions = [
    { mode: 'dark' as const, icon: Moon, label: isAr ? 'داكن' : 'Dark' },
    { mode: 'light' as const, icon: Sun, label: isAr ? 'فاتح' : 'Light' },
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

  // Get preview colors for each preset
  const getPreviewColors = (preset: (typeof themePresets)[0]) => {
    const [pH, pS, pL] = preset.primary;
    const [sH, sS, sL] = preset.secondary;
    const [aH, aS, aL] = preset.accent;
    const [nH, nS] = preset.neutral;
    return [
      `hsl(${pH}, ${pS}%, ${pL}%)`,
      `hsl(${sH}, ${sS}%, ${sL}%)`,
      `hsl(${aH}, ${aS}%, ${aL}%)`,
      `hsl(${nH}, ${nS}%, 85%)`,
    ];
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO
        title={isAr ? 'المظهر والألوان — SmartHub' : 'Erscheinungsbild & Farben — SmartHub'}
        description={
          isAr
            ? 'اختر السمة والألوان ونمط اللوحة لتجربتك في SmartHub.'
            : 'Wähle Theme, Farben und Paletten für dein SmartHub-Erlebnis.'
        }
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
              {isAr ? 'المظهر والألوان' : 'Appearance'}
            </h1>
          </div>
        </motion.div>

        {/* Premium Entire-App Design Modes Selection */}
        <motion.div variants={item} className="premium-card-elevated p-5 space-y-4">
          <div className="text-center">
            <h2 className="font-semibold text-[13px] text-muted-foreground uppercase tracking-wider">
              {isAr ? 'أنماط التصميم المتكاملة' : 'Application Design Modes'}
            </h2>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">
              {isAr
                ? 'غيّر هيكل الواجهة، زوايا البطاقات ونظام الحركة بشكل كامل وفوري'
                : 'Instantly morph layout borders, radius, and physics app-wide'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {designModesList.map((dm) => {
              const isActive = designMode === dm.id;
              const Icon = dm.icon;
              return (
                <button
                  key={dm.id}
                  onClick={() => setDesignMode(dm.id)}
                  className={`relative flex flex-col items-start p-4 rounded-2xl border text-start transition-all duration-300 overflow-hidden group ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--live),0.05)]'
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  {/* Subtle active glow light behind icon */}
                  {isActive && (
                    <motion.div
                      layoutId="activeGlowLight"
                      className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl pointer-events-none"
                    />
                  )}

                  <div className="flex items-center justify-between w-full mb-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    {isActive && (
                      <div className="w-4.5 h-4.5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <h3 className={`text-[12px] font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {isAr ? dm.nameAr : dm.nameDe}
                  </h3>
                  <p className="text-[9.5px] text-muted-foreground/90 mt-1 leading-normal line-clamp-2">
                    {isAr ? dm.descAr : dm.descDe}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Appearance Mode */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <h2 className="font-semibold text-[13px] text-muted-foreground text-center mb-4 uppercase tracking-wider">
            {isAr ? 'الوضع' : 'Mode'}
          </h2>
          <div className="flex justify-center gap-6">
            {themeOptions.map(({ mode, icon: Icon, label }) => {
              const isActive = theme === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  className="flex flex-col items-center gap-2.5"
                >
                  <motion.div
                    className={`w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive ? 'bg-primary' : 'bg-secondary'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    />
                  </motion.div>
                  <span
                    className={`text-[12px] font-medium transition-colors ${
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
                  {isAr ? 'ثيم تلقائي حسب وقت الصلاة' : 'Auto theme by prayer time'}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isAr ? 'يتغير الثيم تلقائياً مع كل صلاة' : 'Theme changes with each prayer'}
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
                    {isAr ? 'اضغط على أي صلاة لتخصيص ثيمها' : 'Tap a prayer to customize its theme'}
                  </p>
                  {prayerSlots.map((slot) => {
                    const cur = prayerMap[slot.id];
                    const preset =
                      themePresets.find((p) => p.id === cur?.colorTheme) || themePresets[0];
                    const [pH, pS, pL] = preset.primary;
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
                            {isAr ? slot.ar : slot.de}
                          </span>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded-full border border-border"
                              style={{ backgroundColor: `hsl(${pH}, ${pS}%, ${pL}%)` }}
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
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              transition={{ duration: 0.2 }}
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
                                      {m === 'light'
                                        ? isAr
                                          ? 'فاتح'
                                          : 'Light'
                                        : isAr
                                          ? 'داكن'
                                          : 'Dark'}
                                    </button>
                                  ))}
                                </div>
                                <div className="grid grid-cols-6 gap-2">
                                  {themePresets
                                    .filter((p) => p.id !== 'dynamic')
                                    .slice(0, 18)
                                    .map((p) => {
                                      const [h, s, l] = p.primary;
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
                                          style={{ backgroundColor: `hsl(${h}, ${s}%, ${l}%)` }}
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
        <motion.div
          variants={item}
          className={`premium-card-elevated p-5 transition-opacity ${designMode !== 'classic' ? 'opacity-40 pointer-events-none' : ''}`}
        >
          <h2 className="font-semibold text-[13px] text-muted-foreground text-center mb-4 uppercase tracking-wider">
            {isAr ? 'توزيع الألوان (للنمط الكلاسيكي)' : 'Color Distribution (Classic Mode)'}
            {designMode !== 'classic' && (
              <span className="block text-[10px] normal-case tracking-normal text-muted-foreground/60 mt-1 font-normal animate-pulse">
                {isAr ? 'معطّل — النمط الحالي يتحكّم بتوزيع الألوان' : 'Disabled — managed by current style'}
              </span>
            )}
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
                      {isAr ? ts.name : ts.nameEn}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {isAr ? ts.desc : ts.descEn}
                    </p>
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
          isAr={isAr}
          colorTheme={colorTheme}
          getPreviewColors={getPreviewColors}
          setColorTheme={setColorTheme}
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
              <h3 className="font-semibold text-[14px] text-foreground">
                {isAr ? 'ثيم ديناميكي' : 'Dynamic Theme'}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isAr ? 'استخرج الألوان من صورة' : 'Extract colors from an image'}
              </p>
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
              <h3 className="font-semibold text-[14px] text-foreground">
                {isAr ? 'الوضع الأسود' : 'Black Mode'}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isAr ? 'أسود حقيقي لشاشات OLED' : 'True black for OLED screens'}
              </p>
            </div>
            <Contrast className="w-5 h-5 text-muted-foreground shrink-0" />
          </button>
        </motion.div>

        {/* Preview */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <h2 className="font-semibold text-[13px] text-muted-foreground text-center mb-4 uppercase tracking-wider">
            {isAr ? 'معاينة' : 'Preview'}
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
                    {isAr ? 'أساسي' : 'Primary'}
                  </span>
                </div>
                <div className="flex-1 h-8 rounded-xl bg-secondary flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-secondary-foreground">
                    {isAr ? 'ثانوي' : 'Secondary'}
                  </span>
                </div>
                <div className="flex-1 h-8 rounded-xl bg-accent flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-accent-foreground">
                    {isAr ? 'مميز' : 'Accent'}
                  </span>
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
