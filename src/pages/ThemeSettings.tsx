import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Sun, Moon, ChevronLeft, Contrast } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const COLOR_PRESETS = [
  { name: 'Blue', hue: 220, sat: 70 },
  { name: 'Teal', hue: 174, sat: 65 },
  { name: 'Violet', hue: 262, sat: 65 },
  { name: 'Rose', hue: 350, sat: 65 },
  { name: 'Amber', hue: 38, sat: 80 },
  { name: 'Green', hue: 152, sat: 55 },
];

type PaletteKey = 'rainbow' | 'expressive' | 'vibrant' | 'neutral' | 'tonal';

const PALETTE_STYLES: { key: PaletteKey; name: { ar: string; de: string }; shades: (hue: number) => string[] }[] = [
  {
    key: 'rainbow',
    name: { ar: 'قوس قزح', de: 'Rainbow' },
    shades: (hue) => [
      `hsl(${(hue + 40) % 360}, 55%, 80%)`,
      `hsl(${(hue + 120) % 360}, 50%, 65%)`,
      `hsl(${(hue + 200) % 360}, 45%, 55%)`,
      `hsl(${(hue + 280) % 360}, 50%, 45%)`,
    ],
  },
  {
    key: 'expressive',
    name: { ar: 'معبّر', de: 'Expressiv' },
    shades: (hue) => [
      `hsl(${(hue + 30) % 360}, 50%, 78%)`,
      `hsl(${hue}, 55%, 65%)`,
      `hsl(${(hue - 30 + 360) % 360}, 45%, 48%)`,
      `hsl(${(hue + 60) % 360}, 40%, 38%)`,
    ],
  },
  {
    key: 'vibrant',
    name: { ar: 'نابض', de: 'Vibrant' },
    shades: (hue) => [
      `hsl(${hue}, 65%, 78%)`,
      `hsl(${hue}, 58%, 62%)`,
      `hsl(${hue}, 55%, 48%)`,
      `hsl(${hue}, 60%, 35%)`,
    ],
  },
  {
    key: 'neutral',
    name: { ar: 'هادئ', de: 'Neutral' },
    shades: (hue) => [
      `hsl(${hue}, 15%, 85%)`,
      `hsl(${hue}, 12%, 72%)`,
      `hsl(${hue}, 10%, 58%)`,
      `hsl(${hue}, 14%, 42%)`,
    ],
  },
  {
    key: 'tonal',
    name: { ar: 'درجات', de: 'Tonal Spot' },
    shades: (hue) => [
      `hsl(${hue}, 45%, 82%)`,
      `hsl(${hue}, 40%, 68%)`,
      `hsl(${hue}, 50%, 52%)`,
      `hsl(${hue}, 55%, 38%)`,
    ],
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function ThemeSettingsPage() {
  const { t, theme, setTheme, language, accentHue, setAccentHue, paletteStyle, setPaletteStyle, blackMode, setBlackMode } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-6">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-lg mx-auto">
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <h1 className="text-[24px] font-bold tracking-tight text-foreground">
            {t('settings.theme')}
          </h1>
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center hover:bg-muted transition-colors active:scale-90"
          >
            <ChevronLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
          </button>
        </motion.div>

        {/* Appearance */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <h2 className="font-semibold text-[14px] text-muted-foreground text-center mb-4">
            {t('settings.theme')}
          </h2>
          <div className="flex justify-center gap-8">
            {([
              { mode: 'dark' as const, icon: Moon, label: t('settings.dark') },
              { mode: 'light' as const, icon: Sun, label: t('settings.light') },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                className="flex flex-col items-center gap-2.5"
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className={`w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all duration-300 ${
                    theme === mode
                      ? mode === 'dark'
                        ? 'bg-foreground shadow-lg shadow-foreground/10'
                        : 'bg-background shadow-lg ring-2 ring-primary/40'
                      : 'bg-secondary'
                  }`}
                >
                  <Icon className={`w-7 h-7 transition-colors ${
                    theme === mode
                      ? mode === 'dark' ? 'text-background' : 'text-foreground'
                      : 'text-muted-foreground'
                  }`} />
                </motion.div>
                <span className={`text-[13px] font-medium transition-colors ${
                  theme === mode ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Palette Style */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <h2 className="font-semibold text-[14px] text-muted-foreground text-center mb-4">
            {language === 'ar' ? 'نمط الألوان' : 'Palette style'}
          </h2>
          <div className="grid grid-cols-5 gap-2.5">
            {PALETTE_STYLES.map((palette) => {
              const isActive = paletteStyle === palette.key;
              return (
                <motion.button
                  key={palette.key}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setPaletteStyle(palette.key)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`w-full aspect-[3/5] rounded-xl overflow-hidden flex flex-col transition-all duration-300 ${
                    isActive
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                      : 'border border-border/30'
                  }`}>
                    {palette.shades(accentHue).map((shade, si) => (
                      <div key={si} className="flex-1" style={{ backgroundColor: shade }} />
                    ))}
                  </div>
                  <span className={`text-[10px] font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {palette.name[language]}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Accent Colors */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <h2 className="font-semibold text-[14px] text-muted-foreground text-center mb-4">
            {t('settings.colors')}
          </h2>
          <div className="flex justify-center gap-4 flex-wrap">
            {COLOR_PRESETS.map(preset => (
              <motion.button
                key={preset.name}
                whileTap={{ scale: 0.85 }}
                onClick={() => setAccentHue(preset.hue)}
                className={`w-12 h-12 rounded-full transition-all duration-300 ${
                  accentHue === preset.hue
                    ? 'ring-[3px] ring-offset-[3px] ring-offset-background ring-foreground/20 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: `hsl(${preset.hue}, ${preset.sat}%, ${theme === 'dark' ? '58' : '50'}%)` }}
              />
            ))}
          </div>
        </motion.div>

        {/* Black theme toggle */}
        <motion.div variants={item} className="premium-card-elevated px-5 py-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-between w-full active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
                <Contrast className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-start">
                <h2 className="font-semibold text-[14px] text-foreground">
                  {language === 'ar' ? 'الوضع الأسود' : 'Black Theme'}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {language === 'ar' ? 'اجعل الوضع الداكن أكثر عمقاً' : 'Dunkles Theme noch dunkler'}
                </p>
              </div>
            </div>
            <div className={`relative w-[46px] h-[26px] rounded-full transition-colors duration-300 shrink-0 ${theme === 'dark' ? 'bg-primary' : 'bg-muted'}`} dir="ltr">
              <motion.div
                className="absolute top-[3px] w-[20px] h-[20px] rounded-full bg-primary-foreground shadow-sm"
                animate={{ left: theme === 'dark' ? 23 : 3 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
