import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Sun, Moon, Monitor, Contrast, Check, Palette, Sparkles, Droplets, Zap, Circle, ImageIcon } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { themePresets, type ThemeStyle, createDynamicPreset, extractDominantColor } from '@/utils/themeEngine';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

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

const themeStyles: { id: ThemeStyle; icon: typeof Palette; name: string; nameEn: string; desc: string; descEn: string }[] = [
  { id: 'tonal', icon: Droplets, name: 'ناعم', nameEn: 'Tonal Spot', desc: 'ألوان هادئة ومريحة', descEn: 'Soft & calm colors' },
  { id: 'vibrant', icon: Sparkles, name: 'حيوي', nameEn: 'Vibrant', desc: 'ألوان غنية ومشبعة', descEn: 'Rich & saturated' },
  { id: 'neutral', icon: Circle, name: 'محايد', nameEn: 'Neutral', desc: 'تدرجات رمادية خفيفة', descEn: 'Subtle grayscale' },
  { id: 'expressive', icon: Zap, name: 'معبّر', nameEn: 'Expressive', desc: 'تباين عالي وجريء', descEn: 'High contrast & bold' },
];

export default function ThemeSettingsPage() {
  const { language, theme, setTheme, blackMode, setBlackMode, colorTheme, setColorTheme, paletteStyle, setPaletteStyle } = useApp();
  const navigate = useNavigate();
  const isAr = language === 'ar';

  const themeOptions = [
    { mode: 'dark' as const, icon: Moon, label: isAr ? 'داكن' : 'Dark' },
    { mode: 'light' as const, icon: Sun, label: isAr ? 'فاتح' : 'Light' },
    { mode: 'system' as const, icon: Monitor, label: isAr ? 'النظام' : 'System' },
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
  const getPreviewColors = (preset: typeof themePresets[0]) => {
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
    <div className="min-h-screen bg-background pb-28 px-5 pt-6">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 max-w-lg mx-auto">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3 mb-2">
          <BackButton to="/settings" />
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            {isAr ? 'المظهر والألوان' : 'Appearance'}
          </h1>
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
                    whileTap={{ scale: 0.92 }}
                    className={`w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? 'bg-primary'
                        : 'bg-secondary'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`} />
                  </motion.div>
                  <span className={`text-[12px] font-medium transition-colors ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Theme Style */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <h2 className="font-semibold text-[13px] text-muted-foreground text-center mb-4 uppercase tracking-wider">
            {isAr ? 'نمط الثيم' : 'Theme Style'}
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {themeStyles.map((ts) => {
              const isActive = paletteStyle === ts.id;
              const Icon = ts.icon;
              return (
                <motion.button
                  key={ts.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setPaletteStyle(ts.id)}
                  className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 ${
                    isActive
                      ? 'border-primary/40 bg-primary/8'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isActive ? 'bg-primary/15' : 'bg-secondary'
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="text-start flex-1 min-w-0">
                    <p className={`text-[13px] font-semibold ${isActive ? 'text-foreground' : 'text-foreground'}`}>
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

        {/* Color Palettes */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <h2 className="font-semibold text-[13px] text-muted-foreground text-center mb-4 uppercase tracking-wider">
            {isAr ? 'لوحة الألوان' : 'Color Palette'}
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {themePresets.map((preset) => {
              const isActive = colorTheme === preset.id;
              const colors = getPreviewColors(preset);
              return (
                <motion.button
                  key={preset.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setColorTheme(preset.id as any)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all duration-300 ${
                    isActive ? 'border-primary scale-110' : 'border-border/50'
                  }`}>
                    <div className="absolute inset-0">
                      <div className="absolute top-0 left-0 w-full h-1/4" style={{ backgroundColor: colors[0] }} />
                      <div className="absolute top-[25%] left-0 w-full h-1/4" style={{ backgroundColor: colors[1] }} />
                      <div className="absolute top-[50%] left-0 w-full h-1/4" style={{ backgroundColor: colors[2] }} />
                      <div className="absolute top-[75%] left-0 w-full h-1/4" style={{ backgroundColor: colors[3] }} />
                    </div>
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute inset-0 flex items-center justify-center bg-black/30"
                        >
                          <Check className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span className={`text-[10px] font-medium leading-tight text-center transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {isAr ? preset.name : preset.nameEn}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

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
