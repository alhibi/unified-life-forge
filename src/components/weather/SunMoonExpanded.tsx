/**
 * SunMoonExpanded — replaces the legacy single-day Sun & Moon block
 * with the reference design's two long lists:
 *
 *   • Sunrise & Sunset: one row per forecast day with sunrise / sunset
 *     icon-pills and a footer pill comparing next week's day-length
 *     against today's.
 *
 *   • Moon Phases: one row per forecast day with a SVG moon glyph,
 *     localized phase name and illumination percentage on a chip,
 *     plus a chevron suggesting deep-link (kept passive here).
 *
 * Both lists use the moonPhase calculator (no API) so they stay
 * accurate for every day, even when the weather provider returned
 * only today's sun timings.
 */
import { ChevronRight } from '@/lib/icons';
import { getMoonPhase } from '@/lib/weather/moonPhase';
import type { DailyEntry } from '@/lib/weather/types';

// ── Formatters ───────────────────────────────────────────────────────────

const localeFor = (isAr: boolean) => (isAr ? 'ar' : 'en-US');

/** "Today / Monday, 15th Jun" style label per row. */
function dayLabel(ms: number, isAr: boolean, idx: number): string {
  if (idx === 0) return isAr ? 'اليوم' : 'Today';
  const d = new Date(ms);
  const weekday = new Intl.DateTimeFormat(localeFor(isAr), { weekday: 'long', timeZone: 'UTC' }).format(d);
  const dom = new Intl.DateTimeFormat('en', { day: 'numeric', timeZone: 'UTC' }).format(d);
  const month = new Intl.DateTimeFormat(localeFor(isAr), { month: 'short', timeZone: 'UTC' }).format(d);
  // English-style ordinal suffix is only used on the LTR side.
  const ord = (n: number) => {
    const s = ['th','st','nd','rd'], v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };
  if (isAr) return `${weekday}، ${dom} ${month}`;
  return `${weekday}, ${dom}${ord(parseInt(dom, 10))} ${month}`;
}

function timeFromIso(iso?: string): string {
  if (!iso) return '—';
  const [, t] = iso.split('T');
  if (!t) return '—';
  const [h, m] = t.split(':');
  return `${h}:${m}`;
}

/** Day length in minutes from sunrise/sunset ISO strings (HH:MM only). */
function dayLengthMin(sunrise?: string, sunset?: string): number | null {
  if (!sunrise || !sunset) return null;
  const [, sr] = sunrise.split('T'); const [, ss] = sunset.split('T');
  if (!sr || !ss) return null;
  const [srH, srM] = sr.split(':').map(Number);
  const [ssH, ssM] = ss.split(':').map(Number);
  return (ssH * 60 + ssM) - (srH * 60 + srM);
}

// ── Inline SVG icons (decorative — no Phosphor equivalents exist) ────────

function SunriseGlyph({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 18h16" /><path d="M12 9V3" /><path d="M5.5 10.5l2-2" /><path d="M18.5 10.5l-2-2" />
      <path d="M2 18a10 10 0 0 1 20 0" /><path d="M9 22l3-3 3 3" />
    </svg>
  );
}
function SunsetGlyph({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 18h16" /><path d="M12 3v6" /><path d="M5.5 10.5l2-2" /><path d="M18.5 10.5l-2-2" />
      <path d="M2 18a10 10 0 0 1 20 0" /><path d="M9 19l3 3 3-3" />
    </svg>
  );
}

/** Stylised moon glyph — illumination is shown by sliding a dark
 *  disk across an amber disk (same trick used in MoonBody). */
function MoonGlyph({ phase, size = 28 }: { phase: number; size?: number }) {
  const k = Math.cos(2 * Math.PI * phase);
  const offset = k * (size * 0.45);
  return (
    <span
      className="relative inline-block rounded-full overflow-hidden bg-slate-900 border border-border/40 shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="absolute inset-0 rounded-full bg-amber-100" />
      <span
        className="absolute inset-0 rounded-full bg-slate-900"
        style={{ transform: `translateX(${offset}px)` }}
      />
    </span>
  );
}

// ── Sunrise & Sunset body ────────────────────────────────────────────────

export function SunriseSunsetList({ daily, isAr }: { daily: DailyEntry[]; isAr: boolean }) {
  // Day-duration delta between the LAST day in the list and today.
  const todayLen = dayLengthMin(daily[0]?.sunrise, daily[0]?.sunset);
  const lastLen  = dayLengthMin(daily[daily.length - 1]?.sunrise, daily[daily.length - 1]?.sunset);
  const delta = todayLen != null && lastLen != null ? lastLen - todayLen : null;
  const deltaLabel = delta == null
    ? null
    : `${delta >= 0 ? '+' : '−'} ${Math.abs(delta)} min`;

  return (
    <div className="pt-2">
      <ul className="space-y-2">
        {daily.map((d, i) => (
          <li
            key={d.date}
            className="flex items-center justify-between gap-2 rounded-2xl border border-border/30 bg-foreground/[0.03] px-3.5 py-3"
          >
            <span className="text-[13.5px] text-foreground/90 font-medium truncate">
              {dayLabel(d.date, isAr, i)}
            </span>
            <div className="flex items-center gap-2 shrink-0" dir="ltr">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-300">
                <SunriseGlyph className="w-3.5 h-3.5" />
                <span className="text-[12px] font-semibold tabular-nums">{timeFromIso(d.sunrise)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-400/15 text-indigo-200">
                <SunsetGlyph className="w-3.5 h-3.5" />
                <span className="text-[12px] font-semibold tabular-nums">{timeFromIso(d.sunset)}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      {deltaLabel && (
        <div className="pt-5 pb-1 text-center">
          <p className="text-[12px] text-muted-foreground mb-2">
            {isAr ? 'مدة النهار آخر الأسبوع مقارنة باليوم:' : 'Day duration next week compared to today:'}
          </p>
          <span className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full bg-blue-500/90 text-white text-[12.5px] font-semibold tabular-nums" dir="ltr">
            {deltaLabel}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Moon Phases body ─────────────────────────────────────────────────────

export function MoonPhasesList({ daily, isAr }: { daily: DailyEntry[]; isAr: boolean }) {
  return (
    <ul className="space-y-2 pt-2">
      {daily.map((d, i) => {
        const m = getMoonPhase(new Date(d.date));
        const pct = Math.round(m.illumination * 100);
        return (
          <li
            key={d.date}
            className="flex items-center gap-3 rounded-2xl border border-border/30 bg-foreground/[0.03] px-3.5 py-3"
          >
            <MoonGlyph phase={m.phase} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-muted-foreground leading-tight">
                {dayLabel(d.date, isAr, i)}
              </p>
              <p className="text-[13.5px] font-semibold text-foreground leading-tight mt-0.5 truncate">
                {m.name[isAr ? 'ar' : 'de']}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-foreground/[0.06] text-foreground/85 text-[11.5px] font-semibold tabular-nums" dir="ltr">
              {pct}%
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/70 shrink-0 rtl:rotate-180" />
          </li>
        );
      })}
    </ul>
  );
}