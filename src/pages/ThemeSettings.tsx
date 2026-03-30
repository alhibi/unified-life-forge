import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Sun, Moon, Monitor, ChevronLeft, Contrast, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
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

const colorThemes = [
  { id: 'default' as const, name: 'كلاسيك', colors: ['hsl(240 5% 26%)', 'hsl(0 0% 100%)', 'hsl(240 5% 93%)', 'hsl(240 5% 91%)'] },
  { id: 'midnight' as const, name: 'منتصف الليل', colors: ['hsl(222 60% 50%)', 'hsl(222 80% 65%)', 'hsl(222 15% 92%)', 'hsl(222 25% 12%)'] },
  { id: 'rose' as const, name: 'روز جولد', colors: ['hsl(350 55% 55%)', 'hsl(350 70% 70%)', 'hsl(350 15% 93%)', 'hsl(350 18% 8%)'] },
  { id: 'emerald' as const, name: 'زمرد', colors: ['hsl(152 55% 40%)', 'hsl(152 60% 55%)', 'hsl(152 12% 93%)', 'hsl(152 20% 7%)'] },
  { id: 'lavender' as const, name: 'لافندر', colors: ['hsl(270 50% 55%)', 'hsl(270 60% 70%)', 'hsl(270 14% 93%)', 'hsl(270 18% 8%)'] },
  { id: 'sunset' as const, name: 'غروب', colors: ['hsl(25 80% 52%)', 'hsl(35 90% 60%)', 'hsl(25 15% 93%)', 'hsl(25 20% 7%)'] },
  { id: 'ocean' as const, name: 'محيط', colors: ['hsl(195 70% 42%)', 'hsl(195 80% 58%)', 'hsl(195 14% 93%)', 'hsl(195 22% 7%)'] },
  { id: 'neon' as const, name: 'نيون', colors: ['hsl(160 80% 38%)', 'hsl(160 90% 50%)', 'hsl(160 10% 93%)', 'hsl(160 18% 6%)'] },
  { id: 'coffee' as const, name: 'قهوة', colors: ['hsl(30 40% 38%)', 'hsl(30 50% 52%)', 'hsl(30 12% 92%)', 'hsl(30 16% 7%)'] },
  { id: 'mono' as const, name: 'مونوكروم', colors: ['hsl(0 0% 15%)', 'hsl(0 0% 40%)', 'hsl(0 0% 93%)', 'hsl(0 0% 6%)'] },
];

export default function ThemeSettingsPage() {
  const { t, theme, setTheme, language, blackMode, setBlackMode, colorTheme, setColorTheme } = useApp();
  const navigate = useNavigate();

  const themeOptions = [
    { mode: 'dark' as const, icon: Moon, label: language === 'ar' ? 'داكن' : 'Dark' },
    { mode: 'light' as const, icon: Sun, label: language === 'ar' ? 'فاتح' : 'Light' },
    { mode: 'system' as const, icon: Monitor, label: language === 'ar' ? 'النظام' : 'System' },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-6">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 max-w-lg mx-auto">
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between mb-2">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            {t('settings.theme')}
          </h1>
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center hover:bg-muted transition-colors active:scale-90"
          >
            <ChevronLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
          </button>
        </motion.div>

        {/* Appearance Card */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <h2 className="font-semibold text-[14px] text-foreground text-center mb-5">
            {language === 'ar' ? 'المظهر' : 'Appearance'}
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
                    className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? mode === 'dark'
                          ? 'bg-foreground'
                          : mode === 'light'
                            ? 'bg-card ring-2 ring-primary/30'
                            : 'bg-secondary ring-2 ring-foreground/30'
                        : 'bg-secondary'
                    }`}
                  >
                    <Icon className={`w-6 h-6 transition-colors ${
                      isActive
                        ? mode === 'dark' ? 'text-background' : 'text-foreground'
                        : 'text-muted-foreground'
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

        {/* Color Themes */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <h2 className="font-semibold text-[14px] text-foreground text-center mb-5">
            {language === 'ar' ? 'لوحة الألوان' : 'Color Palette'}
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {colorThemes.map((ct) => {
              const isActive = colorTheme === ct.id;
              return (
                <motion.button
                  key={ct.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setColorTheme(ct.id)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all duration-300 ${
                    isActive ? 'border-primary scale-110 shadow-lg' : 'border-border/50'
                  }`}>
                    {/* 3 color segments */}
                    <div className="absolute inset-0">
                      <div className="absolute top-0 left-0 w-full h-1/4" style={{ backgroundColor: ct.colors[0] }} />
                      <div className="absolute top-[25%] left-0 w-full h-1/4" style={{ backgroundColor: ct.colors[1] }} />
                      <div className="absolute top-[50%] left-0 w-full h-1/4" style={{ backgroundColor: ct.colors[2] }} />
                      <div className="absolute top-[75%] left-0 w-full h-1/4" style={{ backgroundColor: ct.colors[3] }} />
                    </div>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/30"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium leading-tight text-center transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {ct.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Toggle: Black Theme */}
        <motion.div variants={item}>
          <button
            onClick={() => setBlackMode(!blackMode)}
            className="flex items-center w-full px-2 py-3 active:scale-[0.99] transition-transform gap-4"
          >
            <ToggleSwitch value={blackMode} onChange={() => {}} />
            <div className="flex-1 text-start">
              <h3 className="font-semibold text-[14px] text-foreground">
                {language === 'ar' ? 'الوضع الأسود' : 'Black theme'}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {language === 'ar' ? 'اجعل الوضع الداكن أكثر عمقاً' : 'Make dark theme truly dark'}
              </p>
            </div>
            <Contrast className="w-5 h-5 text-muted-foreground shrink-0" />
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
