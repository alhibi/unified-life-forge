import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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

/**
 * A miniature of the real interface, drawn only from the family's own generated
 * tokens — background, card, ink, accent, data colour and its authored corner
 * radius. It is deliberately not a swatch pair: a family is recognisable by how
 * its surfaces, ink and geometry behave together (D2), so the preview shows a
 * top bar, a card row and a primary action inside the family's material.
 */
function ThemePreview({
  tokens,
  corner,
}: {
  tokens: Record<string, string>;
  corner: number;
}) {
  return (
    <span
      aria-hidden
      className="flex h-[74px] w-full flex-col justify-between overflow-hidden p-2"
      style={{
        backgroundColor: `hsl(${tokens['--background']})`,
        borderRadius: `calc(var(--r-md) * ${corner})`,
      }}
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className="h-1.5 w-9 rounded-full"
          style={{ backgroundColor: `hsl(${tokens['--foreground']})`, opacity: 0.45 }}
        />
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: `hsl(${tokens['--primary']})` }}
        />
      </span>
      <span
        className="flex items-center gap-1.5 px-1.5 py-1"
        style={{
          backgroundColor: `hsl(${tokens['--card']})`,
          borderRadius: `calc(var(--r-sm) * ${corner})`,
          boxShadow: tokens['--shadow-1'],
        }}
      >
        <span
          className="h-1.5 w-8 rounded-full"
          style={{ backgroundColor: `hsl(${tokens['--foreground']})`, opacity: 0.8 }}
        />
        <span
          className="ms-auto h-1.5 w-4 rounded-full"
          style={{ backgroundColor: `hsl(${tokens['--muted-foreground']})`, opacity: 0.7 }}
        />
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="h-4 flex-1"
          style={{
            backgroundColor: `hsl(${tokens['--primary']})`,
            borderRadius: `calc(var(--r-xs) * ${corner})`,
          }}
        />
        <span
          className="h-4 w-4"
          style={{
            backgroundColor: `hsl(${tokens['--data-3']})`,
            borderRadius: `calc(var(--r-xs) * ${corner})`,
          }}
        />
      </span>
    </span>
  );
}

export default function PaletteSection() {
  const navigate = useNavigate();
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
      <SettingsSection
        title="الثيمات"
        subtitle="أربع عشرة عائلة — كل معاينة مرسومة من رموز العائلة نفسها التي ستحصل عليها"
        icon={<Palette className="h-4 w-4" aria-hidden />}
      >
        <div className="space-y-5">
          {CATEGORIES.map((group) => (
            <div key={group.label} className="space-y-2">
              <h3 className="text-mini font-semibold text-muted-foreground-subtle">
                {group.label}
              </h3>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {themePresets
                  .filter((entry) => group.ids.includes(entry.id))
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
                        onClick={() =>
                          setColorTheme(entry.id as Parameters<typeof setColorTheme>[0])
                        }
                        aria-label={entry.name}
                        aria-pressed={active}
                        className={`h-auto min-w-0 flex-col items-stretch gap-2 rounded-card p-1.5 text-start ${
                          active ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <ThemePreview tokens={candidate} corner={themeArtDirection(entry.id).corner} />
                        <span className="flex items-center justify-between gap-1 pe-1 ps-1 pb-0.5">
                          <span className="min-w-0 truncate text-mini font-medium text-foreground">
                            {entry.name}
                          </span>
                          {active ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                          ) : null}
                        </span>
                      </Button>
                    );
                  })}
              </div>
            </div>
          ))}
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
              onOpen={() => navigate(app.path)}
              onInspect={() => navigate(app.path)}
              onFocusApp={() => undefined}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button activation="click" onClick={() => navigate('/quran')}>
            القرآن الكريم
          </Button>
          <Button activation="click" variant="secondary" onClick={() => navigate('/dhikr')}>
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