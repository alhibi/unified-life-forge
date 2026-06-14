/**
 * SmartInsightsCard — three stacked panels of derived weather insights
 * (best outdoor windows today, what to wear right now, health & prayer
 * tips). The data is computed by `src/lib/weather/insights.ts` so this
 * file only handles localisation, layout and the Obsidian-Depth styling
 * shared across the dashboard.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Sun, Moon, Droplets, Wind, Sunrise, Shirt, Shield, CloudRain,
  type LucideIcon,
} from '@/lib/icons';
import { useApp } from '@/contexts/AppContext';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { fetchPrayerTimings } from '@/hooks/usePrayerTimesCache';
import {
  computeInsights, type BestMoment, type HealthTip, type OutfitItem,
} from '@/lib/weather/insights';
import type { WeatherData } from '@/lib/weather/types';

// ── Icon / tone maps ─────────────────────────────────────────────────────

const TIP_ICON: Record<HealthTip['icon'], LucideIcon> = {
  droplets: Droplets,
  sun: Sun,
  snowflake: Droplets,
  wind: Wind,
  sunrise: Sunrise,
  moon: Moon,
  thermometer: Sun,
  shield: Shield,
};

const TONE_CLASS: Record<HealthTip['tone'], { ic: string; bar: string }> = {
  amber:   { ic: 'text-amber-300',   bar: 'bg-amber-400/70' },
  sky:     { ic: 'text-sky-300',     bar: 'bg-sky-400/70' },
  rose:    { ic: 'text-rose-300',    bar: 'bg-rose-400/70' },
  emerald: { ic: 'text-emerald-300', bar: 'bg-emerald-400/70' },
  violet:  { ic: 'text-violet-300',  bar: 'bg-violet-400/70' },
  neutral: { ic: 'text-foreground/70', bar: 'bg-foreground/30' },
};

const MOMENT_TONE: Record<BestMoment['tone'], { ic: string; label: { ar: string; de: string } }> = {
  'mild':         { ic: 'text-emerald-300', label: { ar: 'لطيف ومعتدل',   de: 'Angenehm mild' } },
  'evening-cool': { ic: 'text-violet-300',  label: { ar: 'مساء منعش',     de: 'Kühler Abend' } },
  'sunny-warm':   { ic: 'text-amber-300',   label: { ar: 'مشمس ودافئ',    de: 'Sonnig & warm' } },
  'crisp':        { ic: 'text-sky-300',     label: { ar: 'منعش وبارد',    de: 'Frisch & kalt' } },
};

const OUTFIT_ICON: Record<OutfitItem, { Icon: LucideIcon; ar: string; de: string }> = {
  coat:         { Icon: Shirt,      ar: 'معطف',       de: 'Mantel' },
  jacket:       { Icon: Shirt,      ar: 'سترة',       de: 'Jacke' },
  'long-sleeves':{ Icon: Shirt,     ar: 'كم طويل',    de: 'Langarm' },
  tshirt:       { Icon: Shirt,      ar: 'قميص خفيف',  de: 'T-Shirt' },
  umbrella:     { Icon: CloudRain,  ar: 'مظلة',       de: 'Regenschirm' },
  sunglasses:   { Icon: Sun,        ar: 'نظارة شمس',  de: 'Sonnenbrille' },
  hat:          { Icon: Shield,     ar: 'قبعة',       de: 'Hut' },
  scarf:        { Icon: Wind,       ar: 'وشاح',       de: 'Schal' },
  windbreaker:  { Icon: Wind,       ar: 'ضد الرياح',  de: 'Windjacke' },
};

// ── Formatters ───────────────────────────────────────────────────────────

const fmtHour = (ms: number, isAr: boolean) =>
  new Intl.DateTimeFormat(isAr ? 'ar' : 'de', {
    hour: '2-digit', minute: '2-digit', hour12: false, numberingSystem: 'latn',
  }).format(new Date(ms));

// ── Sub-panels ───────────────────────────────────────────────────────────

function MomentsPanel({ moments, isAr }: { moments: BestMoment[]; isAr: boolean }) {
  if (!moments.length) {
    return (
      <p className="text-[12.5px] text-muted-foreground leading-relaxed">
        {isAr
          ? 'لا توجد نوافذ مثالية للخروج خلال الـ 24 ساعة القادمة. تابع التحديثات.'
          : 'In den nächsten 24 Stunden keine idealen Outdoor-Fenster. Bleib auf dem Laufenden.'}
      </p>
    );
  }
  return (
    <div className="space-y-2.5">
      {moments.map(m => {
        const tone = MOMENT_TONE[m.tone];
        return (
          <div
            key={m.start}
            className="flex items-center gap-3 rounded-2xl border border-border/30 bg-foreground/[0.03] px-3.5 py-2.5"
          >
            <Sparkles className={`w-4 h-4 shrink-0 ${tone.ic}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-foreground leading-tight tabular-nums" dir="ltr">
                <bdi>{fmtHour(m.start, isAr)}</bdi>
                <span className="mx-1.5 text-muted-foreground/70">–</span>
                <bdi>{fmtHour(m.end, isAr)}</bdi>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {tone.label[isAr ? 'ar' : 'de']} • <span className="tabular-nums">{Math.round(m.temperature)}°</span>
                {m.maxPrecipProb >= 20 && (
                  <>
                    {' • '}
                    <span className="tabular-nums">{Math.round(m.maxPrecipProb)}%</span>
                    {isAr ? ' مطر' : ' Regen'}
                  </>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OutfitPanel({
  outfit, isAr,
}: {
  outfit: ReturnType<typeof computeInsights>['outfit']; isAr: boolean;
}) {
  // De-dupe (e.g. tshirt + hat + sunglasses + umbrella). Preserve order.
  const seen = new Set<string>();
  const items = outfit.items.filter(i => (seen.has(i) ? false : (seen.add(i), true)));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[14px] font-semibold text-foreground leading-tight">
          {outfit.headline[isAr ? 'ar' : 'de']}
        </p>
        <p className="text-[11.5px] text-muted-foreground mt-1 tabular-nums">
          {outfit.detail[isAr ? 'ar' : 'de']}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(key => {
          const def = OUTFIT_ICON[key];
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-foreground/[0.05] border border-border/30 text-[11.5px] text-foreground/85"
            >
              <def.Icon className="w-3.5 h-3.5 text-foreground/70" />
              {def[isAr ? 'ar' : 'de']}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TipsPanel({ tips, isAr }: { tips: HealthTip[]; isAr: boolean }) {
  if (!tips.length) {
    return (
      <p className="text-[12.5px] text-muted-foreground leading-relaxed">
        {isAr
          ? 'الجو مستقر اليوم — لا نصائح إضافية.'
          : 'Wetter ist stabil heute — keine zusätzlichen Hinweise.'}
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {tips.map(t => {
        const Icon = TIP_ICON[t.icon];
        const tone = TONE_CLASS[t.tone];
        return (
          <li
            key={t.id}
            className="relative flex items-start gap-3 rounded-2xl border border-border/30 bg-foreground/[0.03] px-3.5 py-2.5 overflow-hidden"
          >
            <span
              className={`absolute inset-y-2 w-[3px] rounded-full ${tone.bar}`}
              style={{ insetInlineStart: 6 }}
              aria-hidden
            />
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ms-1.5 ${tone.ic}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground leading-tight">
                {t.title[isAr ? 'ar' : 'de']}
              </p>
              <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">
                {t.body[isAr ? 'ar' : 'de']}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Section shell ────────────────────────────────────────────────────────

function SectionShell({
  title, accent, children,
}: { title: string; accent: LucideIcon; children: React.ReactNode }) {
  const AccentIcon = accent;
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-border/40 bg-gradient-to-br from-card via-card to-background/60
                 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04),inset_0_-1px_0_hsl(0_0%_0%/0.4)]
                 px-4 py-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-xl bg-foreground/[0.05] border border-border/40 inline-flex items-center justify-center">
          <AccentIcon className="w-4 h-4 text-foreground/75" />
        </span>
        <h3 className="text-[14.5px] font-semibold text-foreground tracking-tight">{title}</h3>
      </div>
      {children}
    </motion.section>
  );
}

// ── Main card ────────────────────────────────────────────────────────────

export default function SmartInsightsCard({ data }: { data: WeatherData }) {
  const { language } = useApp();
  const isAr = language === 'ar';
  const { location } = useDeviceLocation();

  // Lazy-load prayer times from the shared cache — best-effort, silent
  // failure is fine (the tips list just drops the prayer-aware entries).
  const [prayerTimings, setPrayerTimings] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    fetchPrayerTimings(location.lat, location.lng, 0, 1).then(r => {
      if (!cancelled) setPrayerTimings(r);
    });
    return () => { cancelled = true; };
  }, [location?.lat, location?.lng]);

  const insights = useMemo(
    () => computeInsights(data, prayerTimings),
    [data, prayerTimings],
  );

  return (
    <section className="pt-2 space-y-3">
      <SectionShell
        title={isAr ? 'أفضل أوقات الخروج اليوم' : 'Beste Outdoor-Fenster heute'}
        accent={Sparkles}
      >
        <MomentsPanel moments={insights.moments} isAr={isAr} />
      </SectionShell>

      <SectionShell
        title={isAr ? 'ماذا ترتدي الآن' : 'Was jetzt anziehen'}
        accent={Shirt}
      >
        <OutfitPanel outfit={insights.outfit} isAr={isAr} />
      </SectionShell>

      {insights.tips.length > 0 && (
        <SectionShell
          title={isAr ? 'نصائح صحية وللصلاة' : 'Gesundheit & Gebet'}
          accent={Shield}
        >
          <TipsPanel tips={insights.tips} isAr={isAr} />
        </SectionShell>
      )}
    </section>
  );
}