import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Sun, Moon, Languages, Palette } from 'lucide-react';
import { motion } from 'framer-motion';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const COLOR_PRESETS = [
  { name: 'Blue', hue: 220, sat: 70 },
  { name: 'Teal', hue: 174, sat: 65 },
  { name: 'Violet', hue: 262, sat: 65 },
  { name: 'Rose', hue: 350, sat: 65 },
  { name: 'Amber', hue: 38, sat: 80 },
  { name: 'Green', hue: 152, sat: 55 },
];

export default function SettingsPage() {
  const { t, theme, setTheme, language, setLanguage, accentHue, setAccentHue } = useApp();

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 max-w-lg mx-auto">
        <motion.div variants={item}>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">{t('settings.title')}</h1>
        </motion.div>

        {/* Theme */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-between w-full active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              </div>
              <div className="text-start">
                <h2 className="font-semibold text-[15px] text-foreground">
                  {theme === 'dark' ? t('settings.dark') : t('settings.light')}
                </h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {t('settings.theme')}
                </p>
              </div>
            </div>
            {/* Toggle switch */}
            <div className={`relative w-[46px] h-[26px] rounded-full transition-colors duration-300 shrink-0 ${theme === 'dark' ? 'bg-primary' : 'bg-muted'}`} dir="ltr">
              <motion.div
                className="absolute top-[3px] w-[20px] h-[20px] rounded-full bg-primary-foreground shadow-sm"
                animate={{ left: theme === 'dark' ? 23 : 3 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </button>
        </motion.div>

        {/* Language */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <button
            onClick={() => setLanguage(language === 'ar' ? 'de' : 'ar')}
            className="flex items-center justify-between w-full active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Languages className="w-5 h-5 text-accent" />
              </div>
              <div className="text-start">
                <h2 className="font-semibold text-[15px] text-foreground">
                  {language === 'ar' ? '🇸🇦 العربية' : '🇩🇪 Deutsch'}
                </h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {t('settings.language')}
                </p>
              </div>
            </div>
            <div className={`relative w-[46px] h-[26px] rounded-full transition-colors duration-300 shrink-0 ${language === 'ar' ? 'bg-primary' : 'bg-muted'}`} dir="ltr">
              <motion.div
                className="absolute top-[3px] w-[20px] h-[20px] rounded-full bg-primary-foreground shadow-sm"
                animate={{ left: language === 'ar' ? 23 : 3 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </button>
        </motion.div>

        {/* Color */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-semibold text-[15px] text-foreground">{t('settings.colors')}</h2>
          </div>
          <div className="flex gap-3 flex-wrap">
            {COLOR_PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => setAccentHue(preset.hue)}
                className={`w-10 h-10 rounded-full transition-all active:scale-90 ${
                  accentHue === preset.hue ? 'ring-2 ring-offset-2 ring-offset-card ring-foreground/20 scale-110' : ''
                }`}
                style={{ backgroundColor: `hsl(${preset.hue}, ${preset.sat}%, ${theme === 'dark' ? '58' : '50'}%)` }}
                title={preset.name}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
