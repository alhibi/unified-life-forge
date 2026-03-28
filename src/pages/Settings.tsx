import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Languages, Palette, ChevronRight, ChevronLeft, Settings as SettingsIcon } from 'lucide-react';
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
  const { t, theme, language, setLanguage, dir } = useApp();
  const navigate = useNavigate();

  const settingsItems = [
    {
      key: 'theme',
      icon: Palette,
      iconColor: 'text-violet-600 dark:text-violet-400',
      iconBg: 'bg-violet-500/12 dark:bg-violet-400/15',
      title: t('settings.theme'),
      subtitle: theme === 'dark' ? t('settings.dark') : theme === 'system' ? (language === 'ar' ? 'النظام' : 'System') : t('settings.light'),
      onClick: () => navigate('/settings/theme'),
      trailing: (
        <ChevronLeft className="w-4.5 h-4.5 text-muted-foreground/50 ltr:rotate-180" />
      ),
    },
    {
      key: 'language',
      icon: Languages,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/12 dark:bg-emerald-400/15',
      title: language === 'ar' ? 'العربية' : 'Deutsch',
      subtitle: t('settings.language'),
      onClick: () => setLanguage(language === 'ar' ? 'de' : 'ar'),
      trailing: (
        <div className={`relative w-[46px] h-[26px] rounded-full transition-colors duration-300 shrink-0 ${language === 'ar' ? 'bg-primary' : 'bg-muted'}`} dir="ltr">
          <motion.div
            className="absolute top-[3px] w-[20px] h-[20px] rounded-full bg-primary-foreground shadow-sm"
            animate={{ left: language === 'ar' ? 23 : 3 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3 max-w-lg mx-auto">
        <motion.div variants={item} className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-primary stroke-[1.8]" />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">{t('settings.title')}</h1>
        </motion.div>

        {settingsItems.map((si) => (
          <motion.div key={si.key} variants={item} className="premium-card-elevated p-4">
            <button
              onClick={si.onClick}
              className="flex items-center justify-between w-full active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl ${si.iconBg} flex items-center justify-center`}>
                  <si.icon className={`w-5 h-5 ${si.iconColor} stroke-[1.8]`} />
                </div>
                <div className="text-start">
                  <h2 className="font-semibold text-[15px] text-foreground">{si.title}</h2>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{si.subtitle}</p>
                </div>
              </div>
              {si.trailing}
            </button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
