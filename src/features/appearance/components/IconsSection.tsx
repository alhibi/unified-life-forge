import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import {
  Bell,
  BookOpen,
  Camera,
  Check,
  Compass,
  Feather,
  Heart,
  Home,
  type IconComponent,
  type IconSet,
  IconSetOverride,
  loadIconSet,
  MapPin,
  MessageCircle,
  readIconSet,
  Search,
  setIconSet,
  Settings,
  Sparkles,
  Star,
  Sun,
} from '@/lib/icons';

import { SettingsSection } from './AppearancePrimitives';

/**
 * ‎مكتبات الأيقونات — three fully swappable icon families. Each one changes
 * the *shape* of every glyph across the whole app, without touching size or
 * stroke, so the product can feel refined, technical, or expressive depending
 * on the user's taste.
 */

type Preset = {
  id: IconSet;
  name: string;
  subtitle: string;
  personality: string;
};

const PRESETS: readonly Preset[] = [
  {
    id: 'phosphor',
    name: 'فُسفور',
    subtitle: 'الافتراضي',
    personality: 'منحنيات ناعمة وحضور مزدوج الطبقة',
  },
  {
    id: 'lucide',
    name: 'لوسيد',
    subtitle: 'هندسي',
    personality: 'خطوط مستقيمة دقيقة وواضحة',
  },
  {
    id: 'tabler',
    name: 'تابلر',
    subtitle: 'خفيف',
    personality: 'خطوط رقيقة ومساحات متنفّسة',
  },
];

/** Small gallery of representative glyphs so the difference is immediate. */
const SAMPLE: IconComponent[] = [Home, Search, Heart, Bell, Compass, MapPin, Star, Sun];

// Extra glyphs we tuck into the expanded preview.
const EXTRA: IconComponent[] = [Camera, BookOpen, Feather, MessageCircle, Sparkles, Settings];

export default function IconsSection() {
  const [active, setActive] = useState<IconSet>(() => readIconSet());

  useEffect(() => {
    setActive(readIconSet());
  }, []);

  // The previews render every library at once, so make sure each one is
  // fetched (they are lazily loaded to keep the app's first paint light).
  useEffect(() => {
    PRESETS.forEach((preset) => loadIconSet(preset.id));
  }, []);

  const handlePick = (id: IconSet) => {
    setActive(id);
    setIconSet(id);
  };

  return (
    <SettingsSection
      title="مكتبة الأيقونات"
      subtitle="غيِّر شخصية كل الأيقونات في التطبيق"
      icon={<Sparkles className="h-4 w-4" aria-hidden />}
    >
      <div className="space-y-3">
        <p className="text-mini text-muted-foreground">
          كل مكتبة تُبدِّل شكل الأيقونات في كل الشاشات فوراً، مع الحفاظ على الحجم والسماكة
        </p>

        <div className="grid grid-cols-1 gap-2.5">
          {PRESETS.map((preset) => {
            const isActive = preset.id === active;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePick(preset.id)}
                aria-pressed={isActive}
                className={`app-card app-card-compact app-card-pressable flex flex-col gap-3 text-start transition-all ${
                  isActive ? 'border-primary/60 ring-1 ring-primary/40' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                      isActive ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    <Feather className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-meta font-semibold text-foreground">{preset.name}</span>
                      <span className="text-micro text-muted-foreground">{preset.subtitle}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-micro text-muted-foreground">
                      {preset.personality}
                    </span>
                  </span>
                  {isActive && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} aria-hidden>
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    </motion.span>
                  )}
                </div>

                {/* Each row previews its OWN library — so all three rows
                    render side-by-side in three different personalities and
                    the difference is impossible to miss. */}
                <IconSetOverride value={preset.id}>
                  <PreviewStrip highlighted={isActive} />
                </IconSetOverride>
              </button>
            );
          })}
        </div>

        <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
          <span className="block text-micro font-bold text-muted-foreground">
            معاينة موسّعة
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-foreground/80">
            {[...SAMPLE, ...EXTRA].map((Icon, i) => (
              <Icon key={i} className="h-5 w-5" aria-hidden />
            ))}
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}

function PreviewStrip({ highlighted }: { highlighted: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 ${
        highlighted ? 'border-primary/30 bg-primary/5' : 'border-border bg-background/60'
      }`}
    >
      {SAMPLE.map((Icon, i) => (
        <Icon
          key={i}
          className={`h-5 w-5 ${highlighted ? 'text-foreground' : 'text-muted-foreground'}`}
          aria-hidden
        />
      ))}
    </div>
  );
}