import { motion } from 'framer-motion';

import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import { Contrast, Moon, Sun } from '@/lib/icons';
import { INK_CSS } from '@/utils/themeEngine';

import { SettingsSection } from './AppearancePrimitives';

/**
 * Light / dark, and the OLED surface.
 *
 * Black mode is no longer pure black: it is the app's shared ink tone, the one
 * colour every theme owns in common. #000 against a lit panel reads as *screen*
 * rather than surface, so the OLED canvas uses the same soft matte black as the
 * scrim and the full-bleed media chrome.
 */

const themeOptions = [
  { mode: 'dark' as const, icon: Moon, label: 'داكن' },
  { mode: 'light' as const, icon: Sun, label: 'فاتح' },
];

export default function ModeSection() {
  const { theme, setTheme, blackMode, setBlackMode } = useApp();

  return (
    <SettingsSection
      title="الوضع"
      subtitle="فاتح أو داكن، وسطح الشاشات المضيئة"
      icon={<Contrast className="h-4 w-4" aria-hidden />}
    >
      <div className="flex justify-center gap-6">
        {themeOptions.map(({ mode, icon: Icon, label }) => {
          const isActive = theme === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setTheme(mode)}
              aria-pressed={isActive}
              className="flex select-none flex-col items-center gap-2.5 focus:outline-none"
            >
              <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-secondary">
                {isActive && (
                  <motion.div
                    layoutId="activeThemeMode"
                    className="absolute inset-0 z-base rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}
                <Icon
                  className={`relative z-raised h-5 w-5 transition-colors ${
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                  aria-hidden
                />
              </div>
              <span
                className={`text-meta font-medium transition-colors ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <span
          className="h-9 w-9 shrink-0 rounded-md border border-border"
          style={{ backgroundColor: INK_CSS }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 text-start">
          <h3 className="text-body font-semibold text-foreground">الوضع الأسود</h3>
          <p className="mt-0.5 text-mini text-muted-foreground">
            أسود مطفي موحّد لشاشات OLED — ليس أسود قاتماً
          </p>
        </div>
        <Switch
          checked={blackMode}
          onCheckedChange={setBlackMode}
          aria-label={blackMode ? 'إيقاف الوضع الأسود' : 'تفعيل الوضع الأسود'}
        />
      </div>
    </SettingsSection>
  );
}
