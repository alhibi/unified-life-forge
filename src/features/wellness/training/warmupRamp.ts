/**
 * Warm-up ramp generator.
 *
 * Standard pyramid for compound lifts at a working weight W:
 *
 *   • Empty bar  × 8-10   (mobilise + groove the pattern)
 *   • 50% W      × 5
 *   • 70% W      × 3
 *   • 85% W      × 1-2   (last priming single)
 *   • Working    × prescribed
 *
 * Light accessory work (RPE 6-7, < 60% 1RM) typically needs only one
 * priming set or none. The generator below adapts based on intent.
 */

import type { LocalizedString, WarmupSet } from './types';
import { roundToGymWeight, snapToInventory, type PlateInventory } from './plateMath';

export type WarmupIntent =
  /** Big compound, top set ≥ 80% 1RM — full ramp. */
  | 'heavy_compound'
  /** Compound but moderate (5x5/3x10 territory). */
  | 'moderate_compound'
  /** Accessory or isolation. */
  | 'accessory'
  /** Bodyweight or banded — no warm-up sets but cues remain. */
  | 'bodyweight';

const HEAVY_PCTS = [0, 0.5, 0.7, 0.85];
const HEAVY_REPS = [10, 5, 3, 1];
const MODERATE_PCTS = [0, 0.5, 0.75];
const MODERATE_REPS = [8, 5, 3];
const ACCESSORY_PCTS = [0.6];
const ACCESSORY_REPS = [8];

const CUES: Record<number, LocalizedString> = {
  0: { ar: 'البار فقط — حركة سلسة', },
  50: { ar: 'تحرّك بسرعة معتدلة', },
  70: { ar: 'احصل على شعور الوزن', },
  85: { ar: 'تكرارة تجهيز نهائية', },
};

/* ────────────────── Generator ────────────────── */

export function generateWarmup(
  workingKg: number,
  intent: WarmupIntent,
  opts: { barKg?: number; inventory?: PlateInventory } = {},
): WarmupSet[] {
  if (intent === 'bodyweight') return [];
  if (!Number.isFinite(workingKg) || workingKg <= 0) return [];
  const bar = opts.barKg ?? 20;
  const pcts = intent === 'heavy_compound' ? HEAVY_PCTS
    : intent === 'moderate_compound' ? MODERATE_PCTS : ACCESSORY_PCTS;
  const reps = intent === 'heavy_compound' ? HEAVY_REPS
    : intent === 'moderate_compound' ? MODERATE_REPS : ACCESSORY_REPS;
  const out: WarmupSet[] = [];
  for (let i = 0; i < pcts.length; i++) {
    const pct = pcts[i];
    let target = pct === 0 ? bar : workingKg * pct;
    target = roundToGymWeight(target);
    if (opts.inventory) target = snapToInventory(target, opts.inventory);
    if (out.length > 0 && Math.abs(out[out.length - 1].weightKg - target) < 0.5) continue;
    if (target < bar) target = bar;
    if (target >= workingKg) break;
    out.push({
      pct: pct * 100,
      reps: reps[i],
      weightKg: target,
      restSec: i === pcts.length - 1 ? 90 : 60,
      cue: CUES[Math.round(pct * 100)],
    });
  }
  return out;
}

/* ────────────────── General mobility primer (no weight) ────────────────── */

export interface MobilityCue {
  name: LocalizedString;
  durationSec: number;
  /** Body region tag. */
  region: 'shoulders' | 'hips' | 'thoracic' | 'ankles' | 'wrists' | 'fullbody';
  cue: LocalizedString;
}

export const PRE_PUSH_MOBILITY: MobilityCue[] = [
  {
    name: { ar: 'قط-بقرة', },
    durationSec: 30,
    region: 'thoracic',
    cue: { ar: '8-10 تكرارات بطيئة مع التنفس.', },
  },
  {
    name: { ar: 'دوران كتف بالشريط', },
    durationSec: 60,
    region: 'shoulders',
    cue: { ar: 'مدّ الذراعين فوق الرأس وللخلف ثم عُد.', },
  },
  {
    name: { ar: 'سحب الذقن للخلف', },
    durationSec: 30,
    region: 'shoulders',
    cue: { ar: '10 تكرار — تنشيط العنق العميق.', },
  },
];

export const PRE_PULL_MOBILITY: MobilityCue[] = [
  {
    name: { ar: 'تعليق نشط', },
    durationSec: 30,
    region: 'shoulders',
    cue: { ar: 'انكماش/استرخاء لوحَي الكتف.', },
  },
  {
    name: { ar: 'تمدد دودي', },
    durationSec: 45,
    region: 'thoracic',
    cue: { ar: 'افتح الصدر بطيئاً.', },
  },
];

export const PRE_SQUAT_MOBILITY: MobilityCue[] = [
  {
    name: { ar: 'كوسّاك سكوات', },
    durationSec: 60,
    region: 'hips',
    cue: { ar: '4 لكل جانب — افتح الفخذ.', },
  },
  {
    name: { ar: 'تمدد الكاحل بالدفع', },
    durationSec: 45,
    region: 'ankles',
    cue: { ar: 'الركبة تلامس الجدار، القدم ثابتة.', },
  },
  {
    name: { ar: '90/90 ورك', },
    durationSec: 60,
    region: 'hips',
    cue: { ar: 'تبديل الجوانب بسلاسة.', },
  },
];

export const PRE_DEADLIFT_MOBILITY: MobilityCue[] = [
  ...PRE_SQUAT_MOBILITY,
  {
    name: { ar: 'هانغ ديدليفت بالبار', },
    durationSec: 30,
    region: 'hips',
    cue: { ar: 'ركّز على الفخذ الخلفي والظهر.', },
  },
];

export const PRE_OVERHEAD_MOBILITY: MobilityCue[] = [
  {
    name: { ar: 'تمدد العقدة العظمية', },
    durationSec: 60,
    region: 'thoracic',
    cue: { ar: 'دوّر الجذع لكل جانب على ركبة واحدة.', },
  },
  {
    name: { ar: 'دوران كتف بالشريط', },
    durationSec: 60,
    region: 'shoulders',
    cue: { ar: '10-15 ببطء — من الأمام للخلف.', },
  },
];

/* ────────────────── Mobility selector ────────────────── */

export function mobilityFor(exerciseKey: string): MobilityCue[] {
  const k = exerciseKey.toLowerCase();
  if (/squat|leg|lunge|pistol/.test(k)) return PRE_SQUAT_MOBILITY;
  if (/deadlift|hinge|good.?morning/.test(k)) return PRE_DEADLIFT_MOBILITY;
  if (/ohp|press.*overhead|push.?press|jerk|handstand|hspu/.test(k)) return PRE_OVERHEAD_MOBILITY;
  if (/bench|push.?up|dip|chest/.test(k)) return PRE_PUSH_MOBILITY;
  if (/pull.?up|chin|row|lever|muscle.?up|pull/.test(k)) return PRE_PULL_MOBILITY;
  return PRE_PUSH_MOBILITY;
}
