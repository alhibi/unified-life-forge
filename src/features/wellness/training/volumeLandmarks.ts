/**
 * Volume landmarks per muscle group — Renaissance Periodization framework.
 *
 *   MV  = Maintenance Volume — minimum weekly hard sets to keep current size
 *   MEV = Minimum Effective Volume — least that produces growth
 *   MAV = Maximum Adaptive Volume — sweet-spot upper bound
 *   MRV = Maximum Recoverable Volume — beyond this, fatigue exceeds adaptation
 *
 * Hard sets are RPE ≥ 7 working sets (warm-ups don't count). Numbers below
 * are weekly targets for an intermediate trainee. Ranges are conservative;
 * advanced lifters can push 10-20% higher. Beginners should sit at MEV.
 *
 * Sources: Mike Israetel et al. (2017-2024), cross-checked against Greg
 * Nuckols meta-analyses and Brad Schoenfeld's volume papers.
 */

import type { MuscleGroup } from '../exerciseCatalog';
import type { VolumeLandmarks, LocalizedString } from './types';

export const VOLUME_LANDMARKS: Record<MuscleGroup, VolumeLandmarks> = {
  chest:      { mv: 8,  mev: 10, mav: 16, mrv: 22 },
  back:       { mv: 8,  mev: 10, mav: 18, mrv: 25 },
  shoulders:  { mv: 8,  mev: 10, mav: 20, mrv: 26 },
  biceps:     { mv: 5,  mev: 8,  mav: 14, mrv: 20 },
  triceps:    { mv: 6,  mev: 8,  mav: 14, mrv: 18 },
  forearms:   { mv: 4,  mev: 6,  mav: 12, mrv: 18 },
  quads:      { mv: 6,  mev: 8,  mav: 16, mrv: 22 },
  hamstrings: { mv: 4,  mev: 6,  mav: 12, mrv: 18 },
  glutes:     { mv: 4,  mev: 6,  mav: 12, mrv: 18 },
  calves:     { mv: 6,  mev: 8,  mav: 14, mrv: 20 },
  core:       { mv: 0,  mev: 6,  mav: 16, mrv: 25 },
  traps:      { mv: 4,  mev: 6,  mav: 12, mrv: 18 },
  fullbody:   { mv: 0,  mev: 0,  mav: 0,  mrv: 0  },
  cardio:     { mv: 0,  mev: 0,  mav: 0,  mrv: 0  },
};

export type VolumeZone =
  | 'below_mv'
  | 'mv_to_mev'
  | 'mev_to_mav'
  | 'mav_to_mrv'
  | 'above_mrv';

export const ZONE_LABEL: Record<VolumeZone, LocalizedString> = {
  below_mv:    { ar: 'دون الصيانة',      },
  mv_to_mev:   { ar: 'صيانة',     },
  mev_to_mav:  { ar: 'منطقة النمو', },
  mav_to_mrv:  { ar: 'حد أعلى صحي',    },
  above_mrv:   { ar: 'تجاوز التحمل',      },
};

export const ZONE_COLOR: Record<VolumeZone, string> = {
  below_mv:    '#94a3b8',
  mv_to_mev:   '#60a5fa',
  mev_to_mav:  '#10b981',
  mav_to_mrv:  '#f59e0b',
  above_mrv:   '#ef4444',
};

export const ZONE_ADVICE: Record<VolumeZone, LocalizedString> = {
  below_mv: {
    ar: 'الحجم الحالي غير كافٍ للحفاظ على الحجم. أضف 2-4 مجموعات أسبوعياً.',
  },
  mv_to_mev: {
    ar: 'تحافظ على ما لديك لكن لن تنمو. ارفع نحو 10 مجموعات للنمو.',
  },
  mev_to_mav: {
    ar: 'منطقة مثالية للنمو. حافظ على هذا الحجم وزِد 1-2 مجموعة كل أسبوعين.',
  },
  mav_to_mrv: {
    ar: 'حجم عالٍ. راقب التعافي وقلّل لو ظهر إرهاق متراكم.',
  },
  above_mrv: {
    ar: 'تجاوزت قدرة التعافي — انخفاض في الأداء وارد. خذ ديلود.',
  },
};

/** Classify a weekly hard-set count for a muscle into one of five zones. */
export function classifyVolume(muscle: MuscleGroup, weeklyHardSets: number): VolumeZone {
  const lm = VOLUME_LANDMARKS[muscle];
  if (!lm || lm.mrv === 0) return 'mev_to_mav';
  if (weeklyHardSets < lm.mv) return 'below_mv';
  if (weeklyHardSets < lm.mev) return 'mv_to_mev';
  if (weeklyHardSets <= lm.mav) return 'mev_to_mav';
  if (weeklyHardSets <= lm.mrv) return 'mav_to_mrv';
  return 'above_mrv';
}

/** Returns a 0-100 placement of `count` between MEV and MRV for sliders/bars. */
export function volumePctOfRange(muscle: MuscleGroup, weeklyHardSets: number): number {
  const lm = VOLUME_LANDMARKS[muscle];
  if (!lm || lm.mrv === lm.mev) return 0;
  return Math.max(0, Math.min(100, ((weeklyHardSets - lm.mev) / (lm.mrv - lm.mev)) * 100));
}

/**
 * For tracking on-plan: given current sets and a target zone, returns a
 * *delta* the user should hit next week. Positive = add sets, negative = cut.
 */
export function deltaToTargetZone(
  muscle: MuscleGroup,
  currentSets: number,
  target: VolumeZone = 'mev_to_mav',
): number {
  const lm = VOLUME_LANDMARKS[muscle];
  if (!lm || lm.mrv === 0) return 0;
  const zone = classifyVolume(muscle, currentSets);
  if (zone === target) return 0;
  if (target === 'mev_to_mav') {
    if (zone === 'below_mv' || zone === 'mv_to_mev') return Math.ceil(lm.mev - currentSets);
    if (zone === 'mav_to_mrv' || zone === 'above_mrv') return -Math.ceil(currentSets - lm.mav);
  }
  return 0;
}
