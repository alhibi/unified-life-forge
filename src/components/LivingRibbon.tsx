/**
 * LivingRibbon — Just-In-Time UI for the Home page.
 *
 * A single, context-aware card that surfaces ONLY when it's useful right
 * now. It reads time, day-of-week, weather (temp + next-hour precip), and
 * the next prayer time, then picks the highest-priority card to show.
 *
 * Rules:
 *  • Only one card visible at a time. Priority wins.
 *  • Re-evaluates every 30s + on prayer-times / weather load.
 *  • Dismissed cards are remembered per (cardId + yyyy-mm-dd) in
 *    localStorage, so the same card doesn't nag the user the same day.
 *  • If no card qualifies, the ribbon renders nothing (zero footprint).
 *
 * Styling: Obsidian Depth skeuomorphic — inset  + subtle gradient,
 * organic stagger entry, bouncy spring close on dismiss.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { useWeatherData } from '@/features/weather/hooks/useWeatherData';
import { fetchPrayerTimings } from '@/hooks/usePrayerTimesCache';
import {
  Sunrise, Sun, Moon, CloudRain, CloudSnow, Flame, BookOpen, X,
} from '@/lib/icons';

type IconCmp = typeof Sun;

interface RibbonCard {
  id: string;
  priority: number;          // higher wins
  icon: IconCmp;
  title: string;
  subtitle?: string;
  cta: string;
  to: string;
}


const DISMISS_KEY = 'livingRibbon.dismissed';
function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function loadDismissed(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
    if (raw.date === todayStamp() && Array.isArray(raw.ids)) return new Set(raw.ids);
  } catch { /* ignore */ }
  return new Set();
}
function saveDismissed(set: Set<string>) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ date: todayStamp(), ids: [...set] }));
  } catch { /* ignore */ }
}

/** Parse "HH:MM" → today epoch ms. */
function todayAt(hhmm: string): number | null {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

const PRAYER_AR: Record<string, string> = {
  Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء',
};
const PRAYER_DE: Record<string, string> = {
  Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha',
};

export default function LivingRibbon() {
  const navigate = useNavigate();
  const { language } = useApp();
  const ar = language === 'ar';
  const { location } = useDeviceLocation();
  const { data: weather } = useWeatherData(ar ? 'ar' : 'de');

  // Tick every 30s so cards appear/disappear without a manual refresh.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Lazy-fetch prayer times (cached). Re-fetch when location flips.
  const [prayerTimings, setPrayerTimings] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    fetchPrayerTimings(location.lat, location.lng, 0, 1).then(r => {
      if (!cancelled) setPrayerTimings(r);
    });
    return () => { cancelled = true; };
  }, [location?.lat, location?.lng]);

  // Dismissed set (kept across re-renders, persisted per day).
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const dismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set(prev); next.add(id); saveDismissed(next); return next;
    });
  }, []);

  // ── Compute candidate cards, sort by priority, drop dismissed. ──
  const card: RibbonCard | null = useMemo(() => {
    const d = new Date(now);
    const hour = d.getHours();
    const dow = d.getDay(); // 0 Sun … 5 Fri … 6 Sat
    const cands: RibbonCard[] = [];

    // 1. Prayer imminent (≤ 25 min) — highest priority.
    if (prayerTimings) {
      for (const name of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
        const raw = prayerTimings[name];
        if (!raw) continue;
        const t = todayAt(raw.slice(0, 5));
        if (t == null) continue;
        const mins = Math.round((t - now) / 60_000);
        if (mins > 0 && mins <= 25) {
          const arName = PRAYER_AR[name]; const deName = PRAYER_DE[name];
          cands.push({
            id: `prayer-${name}-${Math.ceil(mins / 5) * 5}`,
            priority: 100,
            icon: name === 'Fajr' ? Sunrise : name === 'Isha' ? Moon : Sun,
            title: ar ? `${arName} بعد ${mins} دقيقة` : `${deName} in ${mins} Min.`,
            subtitle: ar ? 'استعد للوضوء' : 'Bereite dich vor',
            cta: ar ? 'افتح' : 'Öffnen',
            to: '/settings/prayer',
          });
          break; // only the soonest prayer matters
        }
      }
    }

    // 2. Friday Kahf — Friday 05:00..18:00.
    if (dow === 5 && hour >= 5 && hour < 18) {
      cands.push({
        id: 'kahf-friday',
        priority: 80,
        icon: BookOpen,
        title: ar ? 'اليوم جمعة • سورة الكهف' : 'Freitag • Sure Al-Kahf',
        subtitle: ar ? 'نور بين الجمعتين' : 'Licht zwischen den Freitagen',
        cta: ar ? 'اقرأ' : 'Lesen',
        to: '/mihrab',
      });
    }

    // 3. Rain incoming — weather precip prob next hour > 60%.
    if (weather?.hourly?.length) {
      const next = weather.hourly.find(h => h.time > now && h.time <= now + 90 * 60_000);
      if (next && next.precipitationProbability >= 60) {
        cands.push({
          id: `rain-${Math.floor(now / (60 * 60_000))}`,
          priority: 70,
          icon: CloudRain,
          title: ar ? 'مطر متوقع خلال ساعة' : 'Regen in einer Stunde erwartet',
          subtitle: ar
            ? `احتمال ${next.precipitationProbability}٪`
            : `Wahrscheinlichkeit ${next.precipitationProbability}%`,
          cta: ar ? 'الطقس' : 'Wetter',
          to: '/weather',
        });
      }
    }

    // 4. Cold morning — temp < 5°C and hour 5..11.
    if (weather?.current && weather.current.temperature < 5 && hour >= 5 && hour < 12) {
      cands.push({
        id: 'cold-morning',
        priority: 50,
        icon: CloudSnow,
        title: ar ? 'صباح بارد' : 'Kalter Morgen',
        subtitle: ar
          ? `${Math.round(weather.current.temperature)}° • أذكار الصباح`
          : `${Math.round(weather.current.temperature)}° • Morgengebete`,
        cta: ar ? 'الأذكار' : 'Gebete',
        to: '/duas',
      });
    }

    // 5. Hot — temp > 35°C.
    if (weather?.current && weather.current.temperature > 35) {
      cands.push({
        id: 'hot-day',
        priority: 50,
        icon: Flame,
        title: ar ? 'حرارة شديدة • اشرب الماء' : 'Sehr heiß • Trink Wasser',
        subtitle: ar
          ? `${Math.round(weather.current.temperature)}° الآن`
          : `${Math.round(weather.current.temperature)}° jetzt`,
        cta: ar ? 'الطقس' : 'Wetter',
        to: '/weather',
      });
    }

    // 6. Time-of-day azkar.
    if (hour >= 5 && hour < 9) {
      cands.push({
        id: 'azkar-morning',
        priority: 30,
        icon: Sunrise,
        title: ar ? 'أذكار الصباح' : 'Morgengebete',
        subtitle: ar ? 'ابدأ يومك بنور' : 'Beginne deinen Tag mit Licht',
        cta: ar ? 'الأذكار' : 'Öffnen',
        to: '/duas',
      });
    } else if (hour >= 16 && hour < 19) {
      cands.push({
        id: 'azkar-evening',
        priority: 30,
        icon: Sun,
        title: ar ? 'أذكار المساء' : 'Abendgebete',
        subtitle: ar ? 'حصّن نفسك حتى الفجر' : 'Schütze dich bis zum Fajr',
        cta: ar ? 'الأذكار' : 'Öffnen',
        to: '/duas',
      });
    } else if (hour >= 21 || hour < 1) {
      cands.push({
        id: 'azkar-night',
        priority: 30,
        icon: Moon,
        title: ar ? 'أذكار النوم' : 'Schlafgebete',
        subtitle: ar ? 'نم على ذكر الله' : 'Schlafe mit Gottes Gedenken',
        cta: ar ? 'الأذكار' : 'Öffnen',
        to: '/duas',
      });
    }

    const winner = cands
      .filter(c => !dismissed.has(c.id))
      .sort((a, b) => b.priority - a.priority)[0];
    return winner ?? null;
  }, [now, prayerTimings, weather, dismissed, ar]);

  return (
    <AnimatePresence mode="wait">
      {card && (
        <motion.button
          key={card.id}
          type="button"
          onClick={() => navigate(card.to)}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.18 } }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="group relative w-full text-start overflow-hidden rounded-2xl
            surface-depth surface-depth-pressable
            px-3.5 py-3"
          style={{
            +
              'inset 0 -1px 0 0 hsl(0 0% 0% / 0.25),' +
              '0 1px 2px 0 hsl(0 0% 0% / 0.18),' +
              '0 0 28px -8px hsl(var(--live-glow) / 0.28)',
          }}
        >
          {/* Single copper accent bar — the only chromatic note. */}
          <span
            className="pointer-events-none absolute inset-y-2 w-[2px] rounded-full live-dot"
            style={{ insetInlineStart: 8, }}
            aria-hidden
          />
          <div className="flex items-center gap-3 ps-3">
            <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
              bg-background/60 border border-border/40 live-text">
              <card.icon className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-foreground leading-tight truncate">
                {card.title}
              </p>
              {card.subtitle && (
                <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
                  {card.subtitle}
                </p>
              )}
            </div>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0"
              style={{
                color: 'hsl(var(--live))',
                backgroundColor: 'hsl(var(--live) / 0.10)',
                border: '1px solid hsl(var(--live) / 0.20)',
              }}
            >
              {card.cta}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); dismiss(card.id); }}
              className="shrink-0 w-7 h-7 -me-1 rounded-lg flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-accent/40 transition-colors"
              aria-label={ar ? 'إخفاء' : 'Ausblenden'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}