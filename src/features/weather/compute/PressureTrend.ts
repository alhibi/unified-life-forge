// Barometric tendency — turn a Δp/3hr into a categorical bucket plus a
// human label. Categories follow the WMO operational definitions.
//
// Labels are Arabic because they are rendered directly in the UI and this app
// ships one locale (see .kiro/steering/design-system.md §1). They used to be
// English strings, which meant the pressure card was the only English text on
// an otherwise Arabic screen.

import type { PressureTendency } from '../types/WeatherSnapshot';

export function classifyPressureTendency(delta_hpa_3h: number): {
  direction: PressureTendency;
  label: string;
} {
  if (delta_hpa_3h > 2) return { direction: 'rapidly_rising', label: 'ارتفاع حاد — تحسّن متوقع' };
  if (delta_hpa_3h > 0.5) return { direction: 'rising', label: 'ارتفاع — الجو يتحسّن' };
  if (delta_hpa_3h > -0.5) return { direction: 'steady', label: 'مستقر' };
  if (delta_hpa_3h > -2) return { direction: 'falling', label: 'انخفاض — الجو يتقلّب' };
  return { direction: 'rapidly_falling', label: 'انخفاض حاد — اضطراب قادم' };
}

/** Label used before enough barometric history exists to claim a direction. */
export const PRESSURE_TENDENCY_UNKNOWN_LABEL = 'يُقاس الاتجاه…';
