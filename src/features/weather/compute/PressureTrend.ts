// Barometric tendency — turn a Δp/3hr into a categorical bucket plus a
// human label. Categories follow the WMO operational definitions.

import type { PressureTendency } from '../types/WeatherSnapshot';

export function classifyPressureTendency(delta_hpa_3h: number): {
  direction: PressureTendency;
  label: string;
} {
  if (delta_hpa_3h > 2)    return { direction: 'rapidly_rising',  label: 'Rising sharply — clearing' };
  if (delta_hpa_3h > 0.5)  return { direction: 'rising',          label: 'Rising — improving' };
  if (delta_hpa_3h > -0.5) return { direction: 'steady',          label: 'Steady' };
  if (delta_hpa_3h > -2)   return { direction: 'falling',         label: 'Falling — deteriorating' };
  return                     { direction: 'rapidly_falling',     label: 'Falling rapidly — storm incoming' };
}
