/**
 * Periodisation & autoregulation engine.
 *
 * Two responsibilities:
 *
 *  1. Decide *when* to deload — based on accumulated fatigue (ACWR),
 *     consecutive missed PR sessions, and explicit user-set frequency.
 *
 *  2. Decide *how heavy* the next session should be — Helms / Tuchscherer
 *     style: when actual RPE drifts above the prescribed band, drop a
 *     percentage; when below, add a percentage.
 *
 * Pure functions. No persistence.
 */

import type { WorkoutSession } from '../wellnessDb';
import { rollingLoad, sessionLoadSrpe } from './progressionEngine';

export type DeloadReason =
  | 'acwr_high'
  | 'no_pr_streak'
  | 'rpe_drift_up'
  | 'scheduled'
  | 'soreness';

export type DeloadSeverity = 'soft' | 'standard' | 'reset';

export interface DeloadAdvice {
  shouldDeload: boolean;
  reasons: DeloadReason[];
  severity: DeloadSeverity;
  /** Volume reduction multiplier (0.4 = 40% of previous volume). */
  volumeMultiplier: number;
  /** Intensity multiplier on top set (0.85 = 85% of previous top weight). */
  intensityMultiplier: number;
  /** Plain-language summary in both languages. */
  summary: { ar: string; };
  metrics: {
    acwr: number | null;
    weeklyLoad: number;
    consecutiveDays: number;
  };
}

/* ────────────────── ACWR ────────────────── */

export interface AcwrResult {
  acute: number;
  chronic: number;
  ratio: number;
  zone: 'undertraining' | 'sweet_spot' | 'caution' | 'danger';
}

const FALLBACK_LOAD = 420;

export function acwr(workouts: WorkoutSession[]): AcwrResult | null {
  if (workouts.length === 0) return null;
  const now = Date.now();
  const dayMs = 86_400_000;
  let acute7 = 0;
  let chronic28 = 0;
  let counted = 0;
  for (const w of workouts) {
    const ageDays = (now - w.startedAt) / dayMs;
    if (ageDays > 28) continue;
    const explicit = sessionLoadSrpe(w);
    const load = explicit ?? FALLBACK_LOAD;
    if (ageDays <= 7) acute7 += load;
    chronic28 += load;
    counted++;
  }
  if (counted === 0) return null;
  const acute = acute7 / 7;
  const chronic = chronic28 / 28;
  if (chronic <= 0.001) return null;
  const ratio = acute / chronic;
  let zone: AcwrResult['zone'] = 'sweet_spot';
  if (ratio < 0.8) zone = 'undertraining';
  else if (ratio > 1.5) zone = 'danger';
  else if (ratio > 1.3) zone = 'caution';
  return {
    acute: Math.round(acute * 10) / 10,
    chronic: Math.round(chronic * 10) / 10,
    ratio: Math.round(ratio * 100) / 100,
    zone,
  };
}

/* ────────────────── Streak helpers ────────────────── */

/** Count days in a row the user trained, ending today. */
export function consecutiveTrainingDays(workouts: WorkoutSession[]): number {
  if (workouts.length === 0) return 0;
  const days = new Set<string>();
  for (const w of workouts) days.add(w.date);
  const today = new Date();
  let count = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (days.has(iso)) count++;
    else if (i > 0) break;
  }
  return count;
}

/** Sessions since the last PR (any e1RM PR — uses simple rolling check). */
export function sessionsSinceLastPr(
  workouts: WorkoutSession[],
  e1rmTimeline: { sourceId: string; e1rm: number }[],
): number {
  if (workouts.length === 0) return 0;
  if (e1rmTimeline.length === 0) return workouts.length;
  // Compute the running max — the index where it last increased is the last PR.
  let max = 0;
  let lastPrIdx = -1;
  for (let i = 0; i < e1rmTimeline.length; i++) {
    if (e1rmTimeline[i].e1rm > max) { max = e1rmTimeline[i].e1rm; lastPrIdx = i; }
  }
  return Math.max(0, e1rmTimeline.length - 1 - lastPrIdx);
}

/* ────────────────── Deload decision ────────────────── */

/**
 * Aggregate the signals into a deload recommendation. The thresholds are
 * conservative — most lifters who follow them will avoid the classic
 * "stalled for 3 weeks before realizing I needed a deload" trap.
 */
export function shouldDeload(p: {
  workouts: WorkoutSession[];
  /** Self-reported soreness 1-5. */
  recentSoreness?: number[];
  /** Optional scheduled cycle: "every Nth week is a deload". */
  scheduledEveryWeeks?: number;
  /** Current week index in the cycle (1-based). */
  currentWeek?: number;
  /** Sessions since last PR — supplied if the caller has the e1RM timeline. */
  noPrStreak?: number;
}): DeloadAdvice {
  const reasons: DeloadReason[] = [];
  let severity: DeloadSeverity = 'soft';

  const a = acwr(p.workouts);
  if (a && a.zone === 'danger') {
    reasons.push('acwr_high');
    severity = 'reset';
  } else if (a && a.zone === 'caution') {
    reasons.push('acwr_high');
    severity = 'standard';
  }

  if (p.recentSoreness && p.recentSoreness.length >= 3) {
    const avg = p.recentSoreness.reduce((s, x) => s + x, 0) / p.recentSoreness.length;
    if (avg >= 4) {
      reasons.push('soreness');
      if (severity === 'soft') severity = 'standard';
    }
  }

  if (p.noPrStreak != null && p.noPrStreak >= 6) {
    reasons.push('no_pr_streak');
    if (severity === 'soft') severity = 'standard';
  }

  if (
    p.scheduledEveryWeeks &&
    p.currentWeek &&
    p.currentWeek % p.scheduledEveryWeeks === 0
  ) {
    reasons.push('scheduled');
  }

  const consecutiveDays = consecutiveTrainingDays(p.workouts);
  if (consecutiveDays >= 12) {
    reasons.push('acwr_high');
    if (severity !== 'reset') severity = 'standard';
  }

  const shouldDo = reasons.length > 0;

  // Volume / intensity reduction profile by severity:
  const profile = {
    soft: { vol: 0.7, int: 0.92 },
    standard: { vol: 0.5, int: 0.85 },
    reset: { vol: 0.4, int: 0.75 },
  }[severity];

  const summary = buildSummary(reasons, severity);

  return {
    shouldDeload: shouldDo,
    reasons,
    severity,
    volumeMultiplier: profile.vol,
    intensityMultiplier: profile.int,
    summary,
    metrics: {
      acwr: a?.ratio ?? null,
      weeklyLoad: rollingLoad(p.workouts, 7),
      consecutiveDays,
    },
  };
}

function buildSummary(reasons: DeloadReason[], severity: DeloadSeverity): { ar: string; } {
  if (reasons.length === 0) {
    return {
      ar: 'الحمل التدريبي ضمن المنطقة المثالية. تابع برنامجك.',
    };
  }
  const arParts: string[] = [];
  const deParts: string[] = [];
  if (reasons.includes('acwr_high')) {
    arParts.push('تراكم حمل عالٍ');
    deParts.push('hohe Belastung');
  }
  if (reasons.includes('soreness')) {
    arParts.push('وجع متراكم');
    deParts.push('viel Muskelkater');
  }
  if (reasons.includes('no_pr_streak')) {
    arParts.push('ركود في الأرقام القياسية');
    deParts.push('Stagnation der Rekorde');
  }
  if (reasons.includes('scheduled')) {
    arParts.push('أسبوع ديلود مقرر');
    deParts.push('geplante Deload-Woche');
  }
  const sevAr = severity === 'reset' ? 'ديلود قوي' : severity === 'standard' ? 'ديلود معتاد' : 'ديلود خفيف';
  const sevDe = severity === 'reset' ? 'starker Deload' : severity === 'standard' ? 'klassischer Deload' : 'sanfter Deload';
  return {
    ar: `موصى به ${sevAr} — ${arParts.join('، ')}.`,
  };
}

/* ────────────────── Autoregulation lookahead ────────────────── */

/**
 * Convert raw workout history into the "daily readiness" hint shown next to
 * the Workouts tab title. Rough mapping:
 *
 *   ACWR 0.8-1.3 → "ready"
 *   ACWR 1.3-1.5 → "manageable"
 *   ACWR > 1.5   → "deload"
 *   ACWR < 0.8   → "ramp up"
 *
 * Returns null when there's not enough data.
 */
export type ReadinessLabel = 'ramp_up' | 'ready' | 'manageable' | 'deload';

export function readinessLabel(workouts: WorkoutSession[]): ReadinessLabel | null {
  const a = acwr(workouts);
  if (!a) return null;
  if (a.zone === 'undertraining') return 'ramp_up';
  if (a.zone === 'sweet_spot') return 'ready';
  if (a.zone === 'caution') return 'manageable';
  return 'deload';
}

export const READINESS_LABEL_TEXT: Record<ReadinessLabel, { ar: string; }> = {
  ramp_up: { ar: 'جاهز لرفع الحجم', },
  ready: { ar: 'جاهز تماماً', },
  manageable: { ar: 'تعب طفيف', },
  deload: { ar: 'يحتاج تخفيف', },
};

export const READINESS_LABEL_COLOR: Record<ReadinessLabel, string> = {
  ramp_up: '#06b6d4',
  ready: '#10b981',
  manageable: '#f59e0b',
  deload: '#ef4444',
};
