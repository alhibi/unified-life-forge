/**
 * Cross-tab data resolution for the wellness section.
 *
 * The wellness data model has three places where values overlap, and
 * before this module the dashboards picked different sources, which
 * meant the same metric could read differently across tabs:
 *
 *   • weightKg     — profile.weightKg  +  vitals[*].weightKg
 *   • sleepHours   — vitals.sleepHours +  skinHair.sleepHours
 *   • hydration    — vitals.hydrationLiters (legacy)  +  hydration_events
 *   • mood/energy  — vitals.mood/energy  +  skinHair.muscleEnergy
 *
 * Every consumer that wants a "current view" of these values should
 * use this resolver instead of reading raw stores directly. The order
 * of precedence is documented inline.
 *
 * The resolver also exposes "latest known" lookups so the Today tab,
 * the Profile preview, and the Hub calculator all see the same number.
 */

import type {
  AthleteProfile, HydrationEvent, SkinHairLog, VitalLog, WorkoutSession, DietLog,
} from './wellnessDb';
import { todayIso, isoFromTs } from './wellnessDb';

/* ─────────────────── Helpers ─────────────────── */

/** Latest non-null value of `field` from a date-sorted (newest first) list. */
function latest<T, K extends keyof T>(arr: T[], field: K): T[K] | null {
  for (const x of arr) {
    const v = x[field];
    if (v != null && v !== '' && (typeof v !== 'number' || (Number.isFinite(v) && v > 0))) {
      return v;
    }
  }
  return null;
}

/** Latest non-null value with the date it came from. */
function latestWithDate<T extends { date?: string; loggedAt?: number }, K extends keyof T>(
  arr: T[], field: K,
): { value: T[K]; date: string } | null {
  for (const x of arr) {
    const v = x[field];
    if (v != null && v !== '' && (typeof v !== 'number' || (Number.isFinite(v) && v > 0))) {
      const date = (x.date as string) ?? (x.loggedAt ? isoFromTs(x.loggedAt) : '');
      return { value: v, date };
    }
  }
  return null;
}

/* ─────────────────── Sources ─────────────────── */

export interface WellnessSources {
  profile: AthleteProfile | null;
  vitals: VitalLog[];          // newest first
  skinHair: SkinHairLog[];     // newest first
  hydration: HydrationEvent[]; // newest first
  workouts: WorkoutSession[];  // newest first
  dietLogs: DietLog[];
}

/* ─────────────────── Resolvers ─────────────────── */

/**
 * Body weight. Priority:
 *   1. Latest non-null vitals.weightKg
 *   2. profile.weightKg (if set)
 *
 * Returns the value and where it came from so the UI can display
 * "from your profile" / "from yesterday's log" hints.
 */
export function resolveWeight(s: WellnessSources): {
  value: number | null;
  source: 'vitals' | 'profile' | null;
  date?: string;
} {
  const v = latestWithDate(s.vitals, 'weightKg');
  if (v && typeof v.value === 'number') {
    return { value: v.value, source: 'vitals', date: v.date };
  }
  if (s.profile?.weightKg) {
    return { value: s.profile.weightKg, source: 'profile' };
  }
  return { value: null, source: null };
}

/**
 * Effective profile — if `profile.weightKg` is missing but the user
 * has logged weight in vitals, fall back to the latest vital so all
 * downstream calculators still work.
 */
export function effectiveProfile(s: WellnessSources): AthleteProfile | null {
  if (!s.profile) return null;
  if (s.profile.weightKg) return s.profile;
  const w = resolveWeight(s);
  if (w.value == null) return s.profile;
  return { ...s.profile, weightKg: w.value };
}

/** Latest sleep hours from either vitals or skinHair (vitals wins). */
export function resolveSleepHours(s: WellnessSources, isoDate?: string): number | null {
  const date = isoDate ?? todayIso();
  const v = s.vitals.find((x) => x.date === date);
  if (v?.sleepHours) return v.sleepHours;
  const sh = s.skinHair.find((x) => x.date === date);
  if (sh?.sleepHours) return sh.sleepHours;
  return null;
}

/**
 * Today's hydration in millilitres. Priority:
 *   1. Sum of `hydration_events` for today (precise, per-event)
 *   2. vitals[today].hydrationLiters * 1000 (legacy single-value)
 */
export function resolveHydrationToday(s: WellnessSources): number {
  const today = todayIso();
  const events = s.hydration.filter((h) => h.date === today);
  if (events.length > 0) {
    return events.reduce((acc, e) => acc + (e.amountMl || 0), 0);
  }
  const v = s.vitals.find((x) => x.date === today);
  if (v?.hydrationLiters) return Math.round(v.hydrationLiters * 1000);
  return 0;
}

/** Resting HR (latest non-null). */
export function resolveRestingHR(s: WellnessSources): number | null {
  return (latest(s.vitals, 'restingHR') as number | null) ?? null;
}

/** HRV (latest non-null). */
export function resolveHRV(s: WellnessSources): number | null {
  return (latest(s.vitals, 'hrv') as number | null) ?? null;
}

/** Steps for today, falling back to latest known steps. */
export function resolveSteps(s: WellnessSources, isoDate?: string): number | null {
  const date = isoDate ?? todayIso();
  const v = s.vitals.find((x) => x.date === date);
  if (v?.steps) return v.steps;
  return null;
}

/** Energy 1-5 — vitals wins, falls back to skinHair.muscleEnergy. */
export function resolveEnergy(s: WellnessSources, isoDate?: string): number | null {
  const date = isoDate ?? todayIso();
  const v = s.vitals.find((x) => x.date === date);
  if (v?.energy) return v.energy;
  const sh = s.skinHair.find((x) => x.date === date);
  if (sh?.muscleEnergy) return sh.muscleEnergy;
  return null;
}

/** Mood 1-5 — vitals only (skinHair has no mood field). */
export function resolveMood(s: WellnessSources, isoDate?: string): number | null {
  const date = isoDate ?? todayIso();
  const v = s.vitals.find((x) => x.date === date);
  return v?.mood ?? null;
}

/* ─────────────────── Daily snapshot ─────────────────── */

export interface DailySnapshot {
  date: string;
  weightKg: number | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  restingHR: number | null;
  hrv: number | null;
  steps: number | null;
  hydrationMl: number;
  energy: number | null;
  mood: number | null;
  workoutCount: number;
}

/** A single object that consolidates the day's view across stores. */
export function dailySnapshot(s: WellnessSources, iso?: string): DailySnapshot {
  const date = iso ?? todayIso();
  const v = s.vitals.find((x) => x.date === date);
  const sh = s.skinHair.find((x) => x.date === date);
  const hydMl = date === todayIso()
    ? resolveHydrationToday(s)
    : s.hydration.filter((h) => h.date === date).reduce((acc, e) => acc + e.amountMl, 0);
  const workoutCount = s.workouts.filter((w) => w.date === date).length;
  return {
    date,
    weightKg: v?.weightKg ?? (date === todayIso() ? resolveWeight(s).value : null),
    sleepHours: v?.sleepHours ?? sh?.sleepHours ?? null,
    sleepQuality: v?.sleepQuality ?? null,
    restingHR: v?.restingHR ?? null,
    hrv: v?.hrv ?? null,
    steps: v?.steps ?? null,
    hydrationMl: hydMl,
    energy: v?.energy ?? sh?.muscleEnergy ?? null,
    mood: v?.mood ?? null,
    workoutCount,
  };
}

/* ─────────────────── Daily series ─────────────────── */

/**
 * Build a [count]-day series of DailySnapshot for charts.
 * Newest is the last element so `recharts` can render LTR.
 */
export function dailySeries(s: WellnessSources, count = 14): DailySnapshot[] {
  const out: DailySnapshot[] = [];
  const today = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = isoFromTs(d.getTime());
    out.push(dailySnapshot(s, iso));
  }
  return out;
}

/* ─────────────────── Freshness ─────────────────── */

/**
 * How fresh is the latest log we have? Used by recovery / readiness
 * engines to refuse to score from stale data — otherwise the dashboard
 * keeps boasting "85, looking great" based on values logged a week ago.
 *
 *   stale = no log within `maxAgeDays` of today.
 */
export interface Freshness {
  /** Latest date we have any vital/skin-hair/hydration data for. */
  latestDate: string | null;
  /** Days between today and latestDate (0 = today). null when no data. */
  ageDays: number | null;
  /** True when ageDays <= maxAgeDays. */
  fresh: boolean;
}

/** Diff in days between two YYYY-MM-DD strings (local). */
function daysBetweenIso(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86_400_000);
}

/**
 * Inspect a few stores and report the most recent date the user
 * actually logged anything. By default we accept up to 2 days old.
 */
export function freshness(s: WellnessSources, maxAgeDays = 2): Freshness {
  const candidates: string[] = [];
  if (s.vitals[0]?.date) candidates.push(s.vitals[0].date);
  if (s.skinHair[0]?.date) candidates.push(s.skinHair[0].date);
  if (s.hydration[0]?.date) candidates.push(s.hydration[0].date);
  if (s.workouts[0]?.date) candidates.push(s.workouts[0].date);
  if (candidates.length === 0) {
    return { latestDate: null, ageDays: null, fresh: false };
  }
  const latest = candidates.sort().pop()!; // ISO sort = chrono order
  const today = todayIso();
  const age = Math.max(0, daysBetweenIso(latest, today));
  return { latestDate: latest, ageDays: age, fresh: age <= maxAgeDays };
}

/* ─────────────────── Training-hours helper ─────────────────── */

/**
 * Sum of workout duration (hours) for a given date — used by hydration
 * target calculation so 90 min lifting ≠ 20 min walk.
 *
 * Falls back to a 1-hour estimate when a workout exists but has no
 * start/end timestamps (legacy / manually-entered sessions).
 */
export function trainingHoursFor(s: WellnessSources, isoDate?: string): number {
  const date = isoDate ?? todayIso();
  let hours = 0;
  for (const w of s.workouts) {
    if (w.date !== date) continue;
    if (w.startedAt && w.endedAt && w.endedAt > w.startedAt) {
      hours += (w.endedAt - w.startedAt) / 3_600_000;
    } else {
      hours += 1; // legacy fallback
    }
  }
  return hours;
}
