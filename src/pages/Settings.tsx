import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Sun, Moon, Languages, Palette, ChevronRight } from 'lucide-react';
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

export default function SettingsPage() {
  const { t, theme, language, setLanguage, accentHue } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 max-w-lg mx-auto">
        <motion.div variants={item}>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">{t('settings.title')}</h1>
        </motion.div>

        {/* Theme — navigates to dedicated page */}
        <motion.div variants={item} className="premium-card-elevated p-5">
          <button
            onClick={() => navigate('/settings/theme')}
            className="flex items-center justify-between w-full active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div className="text-start">
                <h2 className="font-semibold text-[15px] text-foreground">
                  {t('settings.theme')} · {t('settings.colors')}
                </h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {theme === 'dark' ? t('settings.dark') : t('settings.light')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full border-2 border-border/40"
                style={{ backgroundColor: `hsl(${accentHue}, 65%, ${theme === 'dark' ? '58' : '50'}%)` }}
              />
              <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
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
      </motion.div>
    </div>
  );
}
