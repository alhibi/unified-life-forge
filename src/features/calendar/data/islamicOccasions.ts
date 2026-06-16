/**
 * Islamic occasions — driven by the Hijri calendar (month/day) so that every
 * event recurs each Hijri year. Backed by the comprehensive khushu catalog.
 *
 * The legacy `IslamicOccasion` shape (id, name, description, hijriDay,
 * hijriMonth, gregorianDate, color) is preserved for backwards compatibility
 * with `ReligiousOccasions` and `HijriCalendarStrip` components — but the
 * underlying data is now generated from the Hijri-keyed catalog so it stays
 * accurate regardless of which Hijri year the user is in.
 */

import {
  ISLAMIC_EVENTS_CATALOG,
  type RawIslamicEvent,
  type RawIslamicMonth,
  type EventPerspective,
  type EventType,
} from './islamicEventsCatalog';

export type { EventPerspective, EventType };

// ───────────────────────────────────────────────────────────────────────────
// Hijri month names (Arabic) — preserved for legacy callers.
// ───────────────────────────────────────────────────────────────────────────
export const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
] as const;

export const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', 'Dhu al-Qidah', 'Dhu al-Hijjah',
] as const;

// ───────────────────────────────────────────────────────────────────────────
// Hijri ↔ Gregorian conversion (tabular Kuwaiti algorithm).
// Same algorithm used in the previous version, kept verbatim for stability.
// ───────────────────────────────────────────────────────────────────────────

export interface HijriDate {
  day: number;
  month: number; // 1..12
  monthName: string;
  year: number;
}

/** Convert a Gregorian Date to Hijri using the tabular (Kuwaiti) algorithm. */
export function toHijri(date: Date): HijriDate {
  const Y = date.getFullYear();
  const M = date.getMonth() + 1;
  const D = date.getDate();

  const jd =
    Math.floor((1461 * (Y + 4800 + Math.floor((M - 14) / 12))) / 4) +
    Math.floor((367 * (M - 2 - 12 * Math.floor((M - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((Y + 4900 + Math.floor((M - 14) / 12)) / 100)) / 4) +
    D - 32075;

  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { day, month, monthName: HIJRI_MONTHS[month - 1], year };
}

/**
 * Convert a Hijri (year, month, day) to a Gregorian Date using the inverse
 * of the tabular Kuwaiti algorithm.
 */
export function fromHijri(year: number, month: number, day: number): Date {
  // Hijri → JDN
  const jd =
    Math.floor((11 * year + 3) / 30) +
    354 * year +
    30 * month -
    Math.floor((month - 1) / 2) +
    day +
    1948440 -
    385;

  // JDN → Gregorian
  let l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const D = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const M = j + 2 - 12 * l;
  const Y = 100 * (n - 49) + i + l;

  return new Date(Y, M - 1, D);
}

export function getTodayHijri(): HijriDate {
  return toHijri(applyHijriOffset(new Date()));
}

export function formatHijriDate(h: HijriDate): string {
  return `${h.day} ${h.monthName} ${h.year}`;
}

// ───────────────────────────────────────────────────────────────────────────
// Hijri day offset — allows aligning with the official Umm al-Qura (Saudi)
// calendar at runtime. The tabular Kuwaiti algorithm can differ from the
// Saudi official date by ±1-2 days. `setHijriDayOffset(n)` lets a runtime
// hook (see `useLiveHijriDate`) shift every Hijri computation by `n` days so
// today's display and resolved Gregorian dates align with Umm al-Qura.
// ───────────────────────────────────────────────────────────────────────────
let HIJRI_DAY_OFFSET = 0;

export function setHijriDayOffset(n: number) {
  HIJRI_DAY_OFFSET = Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function getHijriDayOffset(): number {
  return HIJRI_DAY_OFFSET;
}

/** Returns a new Date shifted by the configured Hijri offset (in days). */
export function applyHijriOffset(d: Date): Date {
  if (!HIJRI_DAY_OFFSET) return d;
  const out = new Date(d);
  out.setDate(out.getDate() + HIJRI_DAY_OFFSET);
  return out;
}

/** Inverse of {@link applyHijriOffset}: shift Gregorian back by the offset. */
export function unapplyHijriOffset(d: Date): Date {
  if (!HIJRI_DAY_OFFSET) return d;
  const out = new Date(d);
  out.setDate(out.getDate() - HIJRI_DAY_OFFSET);
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Resolved event = a raw catalog event with absolute (Hijri year + Gregorian)
// coordinates resolved relative to a reference date.
// ───────────────────────────────────────────────────────────────────────────

export interface ResolvedIslamicEvent {
  id: string;
  month: number;       // Hijri month (1-12)
  monthName: string;   // English
  monthNameAr: string; // Arabic
  day: number;         // Hijri day start
  endDay: number;      // Hijri day end (=day for single-day events; spans merged)
  hijriYear: number;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  notes?: string;
  notesAr?: string;
  type: EventType;
  perspective: EventPerspective;
  yearAh?: number;
  isMajorHoliday: boolean;
  /** Gregorian date of the start day, resolved for the resolved Hijri year. */
  gregorianDate: Date;
  /** ISO yyyy-mm-dd of `gregorianDate` for legacy callers. */
  gregorianDateISO: string;
  /** Tailwind border-l-* class for legacy `OccasionCard` styling. */
  color: string;
  /** True if today's Hijri date falls inside [day, endDay] of this month. */
  isToday: boolean;
  /** True if today's Hijri date is strictly past the end of this event. */
  isPast: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// Tailwind colour palette by event type (used for the left-border accent
// on legacy occasion cards). Matches the existing project conventions.
// ───────────────────────────────────────────────────────────────────────────
const COLOR_BY_MONTH: Record<number, string> = {
  1: 'border-l-emerald-500',  // Muharram (sacred)
  2: 'border-l-slate-500',    // Safar
  3: 'border-l-emerald-500',  // Rabi' al-Awwal
  4: 'border-l-slate-500',    // Rabi' al-Thani
  5: 'border-l-rose-500',     // Jumada al-Awwal
  6: 'border-l-rose-500',     // Jumada al-Thani
  7: 'border-l-sky-500',      // Rajab (sacred)
  8: 'border-l-violet-500',   // Sha'ban
  9: 'border-l-amber-500',    // Ramadan
  10: 'border-l-yellow-500',  // Shawwal
  11: 'border-l-emerald-600', // Dhu al-Qidah (sacred)
  12: 'border-l-yellow-600',  // Dhu al-Hijjah (sacred)
};

function colorFor(month: RawIslamicMonth, ev: RawIslamicEvent): string {
  if (ev.isMajorHoliday) {
    if (month.monthId === 9) return 'border-l-amber-500';
    if (month.monthId === 10) return 'border-l-yellow-500';
    if (month.monthId === 12) return 'border-l-yellow-600';
  }
  return COLOR_BY_MONTH[month.monthId] ?? 'border-l-emerald-500';
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function eventId(month: RawIslamicMonth, ev: RawIslamicEvent): string {
  return `m${month.monthId}-d${ev.day}-${slugify(ev.title).slice(0, 32)}`;
}

// ───────────────────────────────────────────────────────────────────────────
// Merge consecutive day spans of identical events (e.g. Ayyam al-Bid 13-14-15
// becomes a single span 13–15). Mirrors khushu's `mergeConsecutiveSpans`.
// Operates on already-resolved events sorted by (month, day).
// ───────────────────────────────────────────────────────────────────────────
function mergeConsecutiveSpans(events: ResolvedIslamicEvent[]): ResolvedIslamicEvent[] {
  if (events.length === 0) return events;
  const out: ResolvedIslamicEvent[] = [];
  for (const ev of events) {
    const last = out[out.length - 1];
    if (
      last &&
      last.month === ev.month &&
      last.title === ev.title &&
      last.description === ev.description &&
      last.type === ev.type &&
      last.notes === ev.notes &&
      last.perspective === ev.perspective &&
      ev.day === last.endDay + 1
    ) {
      last.endDay = ev.day;
    } else {
      out.push({ ...ev });
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Resolve raw catalog → list of events anchored to a specific Hijri year.
// For events whose Hijri (month, day) has already passed in `referenceYear`,
// we anchor them to `referenceYear + 1` so they appear as upcoming.
// ───────────────────────────────────────────────────────────────────────────

interface ResolveOptions {
  /** Date used to compute Hijri 'today' and "in N days" labels. Default: now. */
  referenceDate?: Date;
}

/**
 * Resolve every event in the catalog, anchoring each to either the current or
 * next Hijri year so the soonest occurrence is returned.
 */
export function getAllEvents(opts: ResolveOptions = {}): ResolvedIslamicEvent[] {
  const { referenceDate = new Date() } = opts;
  const todayHijri = toHijri(applyHijriOffset(referenceDate));

  const resolved: ResolvedIslamicEvent[] = [];
  for (const month of ISLAMIC_EVENTS_CATALOG) {
    for (const ev of month.events) {

      // Determine the Hijri year to anchor this event to. If its (month, day)
      // is strictly before today within the current Hijri year, push it to
      // next year so it's "upcoming".
      const isPastWithinYear =
        month.monthId < todayHijri.month ||
        (month.monthId === todayHijri.month && ev.day < todayHijri.day);
      const hijriYear = isPastWithinYear ? todayHijri.year + 1 : todayHijri.year;

      const gregorian = unapplyHijriOffset(fromHijri(hijriYear, month.monthId, ev.day));
      const gregorianISO = gregorian.toISOString().slice(0, 10);

      const isTodayEvent =
        month.monthId === todayHijri.month && todayHijri.day === ev.day;

      resolved.push({
        id: eventId(month, ev),
        month: month.monthId,
        monthName: month.monthName,
        monthNameAr: month.monthNameAr,
        day: ev.day,
        endDay: ev.day,
        hijriYear,
        title: ev.title,
        titleAr: ev.titleAr,
        description: ev.description,
        descriptionAr: ev.descriptionAr,
        notes: ev.notes,
        notesAr: ev.notesAr,
        type: ev.type,
        perspective: ev.perspective,
        yearAh: ev.yearAh,
        isMajorHoliday: ev.isMajorHoliday ?? false,
        gregorianDate: gregorian,
        gregorianDateISO: gregorianISO,
        color: colorFor(month, ev),
        isToday: isTodayEvent,
        isPast: false,
      });
    }
  }

  // Sort by (month, day) within each Hijri year, then merge runs of identical
  // events on consecutive days (e.g. White Days 13-14-15).
  resolved.sort((a, b) => {
    if (a.hijriYear !== b.hijriYear) return a.hijriYear - b.hijriYear;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  });
  const merged = mergeConsecutiveSpans(resolved);

  // Re-evaluate isToday on the merged spans (today may fall within [day..endDay]).
  for (const ev of merged) {
    ev.isToday =
      ev.month === todayHijri.month &&
      todayHijri.day >= ev.day &&
      todayHijri.day <= ev.endDay &&
      ev.hijriYear === todayHijri.year;
    ev.isPast =
      ev.hijriYear < todayHijri.year ||
      (ev.hijriYear === todayHijri.year &&
        (ev.month < todayHijri.month ||
          (ev.month === todayHijri.month && ev.endDay < todayHijri.day)));
  }

  return merged;
}

/** Events for a single Hijri month (1..12), sorted by day, spans merged. */
export function getEventsForMonth(
  month: number,
  opts: ResolveOptions = {},
): ResolvedIslamicEvent[] {
  return getAllEvents(opts)
    .filter((e) => e.month === month)
    .sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.title.localeCompare(b.title);
    });
}

// ───────────────────────────────────────────────────────────────────────────
// Legacy-compatible API (kept so existing components keep compiling).
// ───────────────────────────────────────────────────────────────────────────

/**
 * Legacy occasion shape used by `ReligiousOccasions` and `HijriCalendarStrip`.
 * Built dynamically from the catalog. `id`, `name`, `description` always
 * resolve to the Arabic strings (the previous data was Arabic-only).
 */
export interface IslamicOccasion {
  id: string;
  name: string;
  description: string;
  hijriDay: number;
  hijriMonth: string;     // Arabic month name
  gregorianDate: string;  // ISO yyyy-mm-dd
  color: string;
  /** New: full resolved event (for callers that want bilingual fields). */
  resolved: ResolvedIslamicEvent;
}

function toLegacy(ev: ResolvedIslamicEvent): IslamicOccasion {
  return {
    id: ev.id,
    name: ev.titleAr,
    description: ev.descriptionAr,
    hijriDay: ev.day,
    hijriMonth: HIJRI_MONTHS[ev.month - 1],
    gregorianDate: ev.gregorianDateISO,
    color: ev.color,
    resolved: ev,
  };
}

/**
 * Snapshot of the catalog as legacy occasions, anchored to the current/next
 * Hijri year.
 *
 * Note: this is a getter rather than a constant because the resolved Hijri
 * year shifts as time passes. Treat it as `islamicOccasions` was treated
 * before.
 */
/**
 * Snapshot computed at module load. Prefer the live helpers
 * (`getUpcomingOccasions`, `getPastOccasions`) which recompute on every call so
 * they reflect the current day and any runtime Hijri offset.
 */
export const islamicOccasions: IslamicOccasion[] =
  getAllEvents().map(toLegacy);

/** Live recompute — always reflects today + current Hijri day offset. */
function liveLegacy(): IslamicOccasion[] {
  return getAllEvents().map(toLegacy);
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers preserved verbatim from the old API.
// ───────────────────────────────────────────────────────────────────────────

export function getUpcomingOccasions(limit?: number): IslamicOccasion[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = liveLegacy()
    .filter((o) => new Date(o.gregorianDate) >= today)
    .sort(
      (a, b) =>
        new Date(a.gregorianDate).getTime() - new Date(b.gregorianDate).getTime(),
    );
  return limit ? upcoming.slice(0, limit) : upcoming;
}

export function getPastOccasions(): IslamicOccasion[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return liveLegacy()
    .filter((o) => new Date(o.gregorianDate) < today)
    .sort(
      (a, b) =>
        new Date(b.gregorianDate).getTime() - new Date(a.gregorianDate).getTime(),
    );
}

export function getDaysUntil(dateStr: string | Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = typeof dateStr === 'string' ? new Date(dateStr) : new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatGregorianDate(
  dateStr: string | Date,
  language: 'ar' | 'en' = 'ar',
): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const locale = language === 'ar' ? 'ar' : 'en-GB';
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}
