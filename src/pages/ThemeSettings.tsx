import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Sun, Moon, Monitor, ChevronLeft, Contrast } from 'lucide-react';
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
        className="absolute top-[4px] w-[20px] h-[20px] rounded-full bg-primary-foreground shadow-sm"
        animate={{ left: value ? 26 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

export default function ThemeSettingsPage() {
  const { t, theme, setTheme, language, blackMode, setBlackMode } = useApp();
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
                          ? 'bg-foreground shadow-lg'
                          : mode === 'light'
                            ? 'bg-card shadow-lg ring-2 ring-primary/30'
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