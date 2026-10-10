import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { PORTAL_APPS } from '@/components/portal/apps';
import { AppTile } from '@/components/portal/AppTile';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { Check, Droplets, ImageIcon, Palette } from '@/lib/icons';
import { pageItem as item } from '@/lib/motion';
import { themeArtDirection } from '@/utils/themeArtDirections';
import {
  contrastRatio,
  createDynamicPreset,
  extractDominantColor,
  generateThemeTokens,
  type Hsl,
  resolveThemeId,
  themePresets,
  type ThemeStyle,
} from '@/utils/themeEngine';

import { SettingsSection } from './AppearancePrimitives';

const CATEGORIES = [
  { label: 'الكلاسيكية', ids: ['expressive', 'editorial', 'copper', 'paper', 'mono', 'obsidian'] },
  { label: 'الأرضية', ids: ['clay', 'gold', 'moss', 'ocean'] },
  { label: 'العميقة', ids: ['arctic', 'midnight', 'nebula', 'rose'] },
];
const STRENGTHS: readonly { id: ThemeStyle; label: string }[] = [
  { id: 'neutral', label: 'خافت' },
  { id: 'tonal', label: 'متوازن' },
  { id: 'vibrant', label: 'واضح' },
  { id: 'expressive', label: 'قوي' },
];
const parse = (token: string): Hsl => {
  const [h, s, l] = token.split(' ').map(parseFloat);
  return [h, s, l];
};

export default function PaletteSection() {
  const {
    colorTheme,
    setColorTheme,
    paletteStyle,
    setPaletteStyle,
    theme,
    blackMode,
    surfaceLift,
  } = useApp();
  const resolved = resolveThemeId(colorTheme);
  const categoryOf = (id: string) =>
    Math.max(
      0,
      CATEGORIES.findIndex((category) => category.ids.includes(id)),
    );
  const [category, setCategory] = useState(() => categoryOf(resolved));
  useEffect(() => {
    const timer = window.setTimeout(() => setCategory(categoryOf(resolved)), 0);
    return () => window.clearTimeout(timer);
  }, [resolved]);
  const preset = themePresets.find((candidate) => candidate.id === resolved);
  const tokens = preset
    ? generateThemeTokens(
        preset,
        paletteStyle as ThemeStyle,
        theme === 'dark',
        blackMode,
        surfaceLift,
      )
    : null;
  const pairs = [
    {
      label: 'النص',
      ink: '--foreground',
      surfaces: ['--background', '--card', '--surface-3'],
      target: 4.5,
    },
    { label: 'نص الأزرار', ink: '--primary-foreground', surfaces: ['--primary'], target: 4.5 },
    {
      label: 'التحديد',
      ink: '--selected-indicator',
      surfaces: ['--background', '--card'],
      target: 3,
    },
  ];
  const measurements = tokens
    ? pairs.map((pair) => ({
        ...pair,
        ratio: Math.min(
          ...pair.surfaces.map((surface) =>
            contrastRatio(parse(tokens[pair.ink]), parse(tokens[surface])),
          ),
        ),
      }))
    : [];

  const handleDynamicImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        const img = new Image();
        img.onload = () => {
          try {
            localStorage.setItem(
              'app-dynamic-preset',
              JSON.stringify(createDynamicPreset(extractDominantColor(img))),
            );
            setColorTheme('dynamic');
          } catch {
            /* Restricted storage leaves the current selection intact. */
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <>
      <SettingsSection title="قوة لون الإبراز" icon={<Droplets className="h-4 w-4" aria-hidden />}>
        <div className="grid grid-cols-4 gap-2">
          {STRENGTHS.map((strength) => (
            <Button
              key={strength.id}
              activation="click"
              variant={paletteStyle === strength.id ? 'tonal' : 'ghost'}
              aria-pressed={paletteStyle === strength.id}
              onClick={() => setPaletteStyle(strength.id)}
              className="min-w-0 px-1 text-meta"
            >
              {strength.label}
            </Button>
          ))}
        </div>
      </SettingsSection>
      <SettingsSection title="الثيمات" icon={<Palette className="h-4 w-4" aria-hidden />}>
        <div className="flex gap-1 border-b border-border pb-3">
          {CATEGORIES.map((entry, index) => (
            <Button
              key={entry.label}
              activation="click"
              variant={category === index ? 'tonal' : 'ghost'}
              aria-pressed={category === index}
              onClick={() => setCategory(index)}
              className="min-w-0 flex-1 px-1 text-meta"
            >
              {entry.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4">
          {themePresets
            .filter((entry) => CATEGORIES[category]?.ids.includes(entry.id))
            .map((entry) => {
              const candidate = generateThemeTokens(
                entry,
                paletteStyle as ThemeStyle,
                theme === 'dark',
                blackMode,
                surfaceLift,
              );
              const active = resolved === entry.id;
              return (
                <Button
                  key={entry.id}
                  activation="click"
                  variant="ghost"
                  onClick={() => setColorTheme(entry.id as Parameters<typeof setColorTheme>[0])}
                  aria-pressed={active}
                  className={`h-auto min-w-0 flex-col items-stretch gap-2 rounded-card p-2 text-start ${active ? 'ring-2 ring-primary' : ''}`}
                >
                  <span
                    className="flex h-16 items-center gap-2 rounded-card p-3"
                    style={{
                      backgroundColor: `hsl(${candidate['--background']})`,
                      borderRadius: `calc(var(--r-lg) * ${themeArtDirection(entry.id).corner})`,
                    }}
                  >
                    <span
                      className="flex h-10 flex-1 items-center justify-center rounded-button text-meta font-bold"
                      style={{
                        backgroundColor: `hsl(${candidate['--card']})`,
                        color: `hsl(${candidate['--foreground']})`,
                        boxShadow: candidate['--shadow-1'],
                      }}
                    >
                      أب
                    </span>
                    <span
                      className="h-7 w-7 rounded-button"
                      style={{ backgroundColor: `hsl(${candidate['--primary']})` }}
                    />
                  </span>
                  <span className="flex items-center justify-between gap-1 whitespace-normal text-meta text-foreground">
                    {entry.name}
                    {active && <Check className="h-4 w-4 text-primary" aria-hidden />}
                  </span>
                </Button>
              );
            })}
        </div>
      </SettingsSection>
      <SettingsSection
        title="معاينة"
        subtitle={preset?.name ?? 'ديناميكي'}
        icon={<Palette className="h-4 w-4" aria-hidden />}
      >
        <div className="grid grid-cols-2 gap-3">
          {PORTAL_APPS.slice(0, 2).map((app, index) => (
            <AppTile
              key={app.key}
              app={app}
              index={index}
              list={false}
              active={false}
              pinned={false}
              onOpen={() => window.location.assign(app.path)}
              onInspect={() => window.location.assign(app.path)}
              onFocusApp={() => undefined}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button activation="click" onClick={() => window.location.assign('/quran')}>
            القرآن الكريم
          </Button>
          <Button
            activation="click"
            variant="secondary"
            onClick={() => window.location.assign('/dhikr')}
          >
            أذكار اليوم
          </Button>
        </div>
        {measurements.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
            {measurements.map((measurement) => (
              <div key={measurement.label} className="text-center">
                <p className="text-micro text-muted-foreground">{measurement.label}</p>
                <p
                  className={`text-meta font-semibold tabular-nums ${measurement.ratio >= measurement.target ? 'text-foreground' : 'text-destructive'}`}
                  dir="ltr"
                >
                  {measurement.ratio.toFixed(2)}:1
                </p>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>
      <motion.section variants={item}>
        <Button
          variant="secondary"
          activation="click"
          onClick={handleDynamicImage}
          className="h-auto w-full justify-start gap-3 p-4 text-start"
        >
          <ImageIcon className="h-5 w-5" aria-hidden />
          <span>ثيم من صورة</span>
        </Button>
      </motion.section>
    </>
  );
}
