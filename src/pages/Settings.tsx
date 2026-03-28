import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Sun, Moon, Languages } from 'lucide-react';

export default function SettingsPage() {
  const { t, theme, setTheme, language, setLanguage } = useApp();

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6">
      <h1 className="text-2xl font-display font-bold text-foreground mb-6 animate-fade-in">
        {t('settings.title')}
      </h1>

      <div className="space-y-4 max-w-lg mx-auto">
        {/* Theme */}
        <div className="glass-card-elevated p-5 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              {theme === 'light' ? <Sun className="w-5 h-5 text-primary-foreground" /> : <Moon className="w-5 h-5 text-primary-foreground" />}
            </div>
            <h2 className="font-display font-semibold text-foreground">{t('settings.theme')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`py-3 rounded-xl font-medium text-sm transition-all ${
                theme === 'light'
                  ? 'gradient-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Sun className="w-4 h-4 inline-block me-2" />{t('settings.light')}
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`py-3 rounded-xl font-medium text-sm transition-all ${
                theme === 'dark'
                  ? 'gradient-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Moon className="w-4 h-4 inline-block me-2" />{t('settings.dark')}
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="glass-card-elevated p-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
              <Languages className="w-5 h-5 text-accent-foreground" />
            </div>
            <h2 className="font-display font-semibold text-foreground">{t('settings.language')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLanguage('ar')}
              className={`py-3 rounded-xl font-medium text-sm transition-all ${
                language === 'ar'
                  ? 'gradient-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              🇸🇦 {t('settings.arabic')}
            </button>
            <button
              onClick={() => setLanguage('de')}
              className={`py-3 rounded-xl font-medium text-sm transition-all ${
                language === 'de'
                  ? 'gradient-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              🇩🇪 {t('settings.german')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
