import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import {
  getAutoPrayerThemeEnabled,
  getPrayerThemeMap,
  type PrayerSlot,
  setAutoPrayerThemeEnabled,
  setPrayerThemeFor,
} from '@/hooks/useAutoPrayerTheme';
import { Check, ChevronDown, Clock, Moon, Sun } from '@/lib/icons';
import { MOTION } from '@/lib/motion';
import {
  generateThemeTokens,
  resolveThemeId,
  themePresets,
  type ThemeStyle,
} from '@/utils/themeEngine';

import { SettingsSection } from './AppearancePrimitives';

/**
 * The theme follows the prayer clock.
 *
 * Ported from the old ThemeSettings screen unchanged: the enabled flag and the
 * six per-slot assignments live in localStorage (see useAutoPrayerTheme), not
 * in AppContext, because the runtime applies them without a render.
 */

const prayerSlots: { id: PrayerSlot; ar: string; icon: typeof Sun }[] = [
  { id: 'fajr', ar: 'الفجر', icon: Moon },
  { id: 'sunrise', ar: 'الشروق', icon: Sun },
  { id: 'dhuhr', ar: 'الظهر', icon: Sun },
  { id: 'asr', ar: 'العصر', icon: Sun },
  { id: 'maghrib', ar: 'المغرب', icon: Sun },
  { id: 'isha', ar: 'العشاء', icon: Moon },
];

export default function AutoPrayerThemeSection() {
  const { theme, blackMode, paletteStyle } = useApp();

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

  // Preview the exact tokens applied by the runtime theme engine.
  const getPreviewColor = (
    preset: (typeof themePresets)[number],
    mode: 'light' | 'dark' = theme,
  ) => {
    const tokens = generateThemeTokens(
      preset,
      paletteStyle as ThemeStyle,
      mode === 'dark',
      mode === 'dark' && blackMode,
    );
    return `hsl(${tokens['--primary']})`;
  };

  return (
    <SettingsSection
      title="ثيم تلقائي حسب وقت الصلاة"
      subtitle="يتغير الثيم تلقائياً مع كل صلاة"
      icon={<Clock className="h-4 w-4" aria-hidden />}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-meta text-muted-foreground">تفعيل التبديل التلقائي</span>
        <Switch
          checked={autoEnabled}
          onCheckedChange={toggleAuto}
          aria-label={autoEnabled ? 'إيقاف الثيم التلقائي' : 'تفعيل الثيم التلقائي'}
        />
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
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-center text-mini text-muted-foreground">
                اضغط على أي صلاة لتخصيص ثيمها
              </p>
              {prayerSlots.map((slot) => {
                const cur = prayerMap[slot.id];
                const preset =
                  themePresets.find((p) => p.id === resolveThemeId(cur?.colorTheme)) ||
                  themePresets[0];
                const previewColor = getPreviewColor(preset, cur?.mode ?? 'light');
                const isExpanded = expandedSlot === slot.id;
                const Icon = slot.icon;
                return (
                  <div
                    key={slot.id}
                    className="overflow-hidden rounded-md border border-border bg-card"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center gap-3 p-3 transition-colors active:bg-muted"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="flex-1 text-start text-meta font-medium text-foreground">
                        {slot.ar}
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-5 w-5 rounded-full border border-border"
                          style={{ backgroundColor: previewColor }}
                          aria-hidden
                        />
                        {cur?.mode === 'dark' ? (
                          <Moon className="h-3 w-3 text-muted-foreground" aria-hidden />
                        ) : (
                          <Sun className="h-3 w-3 text-muted-foreground" aria-hidden />
                        )}
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          aria-hidden
                        />
                      </span>
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          // A tween, never a spring: this animates a HEIGHT, and
                          // an overshooting height makes every row below the
                          // panel visibly bounce as it settles.
                          transition={MOTION.collapseOpen}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 p-3 pt-0">
                            <div className="flex gap-2">
                              {(['light', 'dark'] as const).map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => updateSlot(slot.id, cur.colorTheme, m)}
                                  aria-pressed={cur?.mode === m}
                                  className={`flex-1 rounded-md py-1.5 text-mini font-medium transition-colors ${
                                    cur?.mode === m
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-secondary text-muted-foreground'
                                  }`}
                                >
                                  {m === 'light' ? 'فاتح' : 'داكن'}
                                </button>
                              ))}
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                              {themePresets.map((p) => {
                                const swatch = getPreviewColor(p, cur?.mode || 'light');
                                const isSel = resolveThemeId(cur?.colorTheme) === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => updateSlot(slot.id, p.id, cur?.mode || 'light')}
                                    aria-label={p.name}
                                    aria-pressed={isSel}
                                    className={`relative aspect-square w-full rounded-full border-2 transition-all ${
                                      isSel ? 'scale-110 border-primary' : 'border-border'
                                    }`}
                                    style={{ backgroundColor: swatch }}
                                  >
                                    {isSel && (
                                      <span className="absolute inset-0 m-auto flex h-4 w-4 items-center justify-center rounded-full bg-card">
                                        <Check
                                          className="h-3 w-3 stroke-[2.5] text-foreground"
                                          aria-hidden
                                        />
                                      </span>
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
    </SettingsSection>
  );
}
