import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Sun, Moon, Contrast, Check, Palette, Sparkles, Droplets, Zap, Circle, ImageIcon, Clock, ChevronDown } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { themePresets, type ThemeStyle, createDynamicPreset, extractDominantColor } from '@/utils/themeEngine';
import {
  getAutoPrayerThemeEnabled,
  setAutoPrayerThemeEnabled,
  getPrayerThemeMap,
  setPrayerThemeFor,
  type PrayerSlot,
} from '@/hooks/useAutoPrayerTheme';

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
  const { language, theme, setTheme, blackMode, setBlackMode, md3Mode, setMd3Mode, colorTheme, setColorTheme, paletteStyle, setPaletteStyle } = useApp();
  const navigate = useNavigate();
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

        {/* ─── Material Design 3 — Indigo Night ─── */}
        <motion.div variants={item}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setMd3Mode(!md3Mode)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMd3Mode(!md3Mode);
              }
            }}
            aria-pressed={md3Mode}
            aria-label={isAr ? 'تفعيل ثيم مادي يو نيلي الليل' : 'Toggle Material You Indigo Night'}
            className={`w-full text-start premium-card-elevated p-5 active:scale-[0.99] transition-all relative overflow-hidden cursor-pointer ${
              md3Mode ? 'ring-2 ring-offset-2 ring-offset-background' : ''
            }`}
            style={md3Mode ? { '--tw-ring-color': 'hsl(256 34% 48%)' } as React.CSSProperties : undefined}
          >
            {/* Decorative gradient corner badge — exactly the gradient on the Indigo Night reference */}
            <div
              className="absolute top-3 end-3 w-12 h-12 rounded-2xl shadow-lg pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, hsl(256 34% 48%) 0%, hsl(341 21% 41%) 100%)',
              }}
              aria-hidden
            />

            <div className="flex items-start gap-3 mb-4 pe-14">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'hsl(263 100% 93%)',
                  color: 'hsl(261 100% 18%)',
                }}
              >
                <Sparkles className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[15px] text-foreground leading-tight">
                    {isAr ? 'مادي يو — نيلي الليل' : 'Material You — Indigo Night'}
                  </h3>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wider"
                    style={{
                      background: 'hsl(263 100% 93%)',
                      color: 'hsl(261 100% 18%)',
                    }}
                  >
                    MD3
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {isAr
                    ? 'هوية بصرية كاملة من Material Design 3 — راقٍ وهادئ'
                    : 'Full Material Design 3 identity — calm & elegant'}
                </p>
              </div>
              {/* Visual-only toggle (parent div handles the click) */}
              <div
                className={`relative w-[50px] h-[28px] rounded-full transition-colors duration-300 shrink-0 pointer-events-none ${md3Mode ? 'bg-primary' : 'bg-muted'}`}
                dir="ltr"
                aria-hidden
              >
                <motion.div
                  className="absolute top-[4px] w-[20px] h-[20px] rounded-full bg-primary-foreground"
                  animate={{ left: md3Mode ? 26 : 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </div>
            </div>

            {/* Exact palette swatch row — taken pixel-by-pixel from the Indigo Night reference */}
            <div className="grid grid-cols-6 gap-1.5">
              {[
                { hex: '#6750A4', label: 'Primary' },
                { hex: '#EADDFF', label: 'P. Container' },
                { hex: '#625B71', label: 'Secondary' },
                { hex: '#7D5260', label: 'Tertiary' },
                { hex: '#FFD8E4', label: 'T. Container' },
                { hex: '#21005D', label: 'On P. Cont.' },
              ].map((c) => (
                <div key={c.hex} className="flex flex-col items-center gap-1">
                  <div
                    className="w-full aspect-square rounded-lg border border-black/5 shadow-sm"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-[8px] text-muted-foreground/70 font-mono leading-none">
                    {c.hex}
                  </span>
                </div>
              ))}
            </div>

            {md3Mode && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 text-[11px] font-medium"
                style={{ color: 'hsl(256 34% 48%)' }}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                <span>
                  {isAr
                    ? 'مفعّل — يطبّق على التطبيق بالكامل'
                    : 'Active — applied to the entire app'}
                </span>
              </motion.div>
            )}
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
                    const preset = themePresets.find(p => p.id === cur?.colorTheme) || themePresets[0];
                    const [pH, pS, pL] = preset.primary;
                    const isExpanded = expandedSlot === slot.id;
                    const Icon = slot.icon;
                    return (
                      <div key={slot.id} className="rounded-xl bg-card/50 border border-border/40 overflow-hidden">
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
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
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
                                      {m === 'light' ? (isAr ? 'فاتح' : 'Light') : (isAr ? 'داكن' : 'Dark')}
                                    </button>
                                  ))}
                                </div>
                                <div className="grid grid-cols-6 gap-2">
                                  {themePresets.filter(p => p.id !== 'dynamic').slice(0, 18).map((p) => {
                                    const [h, s, l] = p.primary;
                                    const isSel = cur?.colorTheme === p.id;
                                    return (
                                      <button
                                        key={p.id}
                                        onClick={() => updateSlot(slot.id, p.id, cur?.mode || 'light')}
                                        className={`relative w-full aspect-square rounded-full border-2 transition-all ${
                                          isSel ? 'border-primary scale-110' : 'border-border/50'
                                        }`}
                                        style={{ backgroundColor: `hsl(${h}, ${s}%, ${l}%)` }}
                                      >
                                        {isSel && (
                                          <Check className="absolute inset-0 m-auto w-3 h-3 text-white" strokeWidth={3} />
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
        <motion.div variants={item} className={`premium-card-elevated p-5 transition-opacity ${md3Mode ? 'opacity-40 pointer-events-none' : ''}`}>
          <h2 className="font-semibold text-[13px] text-muted-foreground text-center mb-4 uppercase tracking-wider">
            {isAr ? 'نمط الثيم' : 'Theme Style'}
            {md3Mode && (
              <span className="block text-[10px] normal-case tracking-normal text-muted-foreground/60 mt-1 font-normal">
                {isAr ? 'معطّل — MD3 يتحكّم بالنمط' : 'Disabled — MD3 controls style'}
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
        <motion.div variants={item} className={`premium-card-elevated p-5 transition-opacity ${md3Mode ? 'opacity-40 pointer-events-none' : ''}`}>
          <h2 className="font-semibold text-[13px] text-muted-foreground text-center mb-4 uppercase tracking-wider">
            {isAr ? 'لوحة الألوان' : 'Color Palette'}
            {md3Mode && (
              <span className="block text-[10px] normal-case tracking-normal text-muted-foreground/60 mt-1 font-normal">
                {isAr ? 'معطّل — MD3 مفعّل' : 'Disabled — MD3 active'}
              </span>
            )}
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {themePresets.map((preset) => {
              const isActive = colorTheme === preset.id;
              const colors = getPreviewColors(preset);
              return (
                <motion.button
                  key={preset.id}
                  
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
        <motion.div variants={item} className={md3Mode ? 'opacity-40 pointer-events-none' : ''}>
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
