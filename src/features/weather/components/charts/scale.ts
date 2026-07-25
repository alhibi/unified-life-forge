/**
 * Chart scale helpers.
 *
 * Kept out of CanvasChart.tsx so the component module exports a component only
 * (react-refresh cannot hot-reload a module that mixes the two) and so the
 * axis maths is unit-testable without mounting anything.
 */

/**
 * Pick a y-domain whose grid lines land on round numbers.
 *
 * The naive version (pad the data range, then round the ends outward) produced
 * axis labels like 5 / 13 / 20 / 28 / 35: the *ends* were round but the
 * intermediate lines were the range divided by four and then rounded for
 * display, so the axis looked mis-calibrated. Here the STEP is chosen from the
 * 1/2/2.5/5/10 family first, and the domain is built as `min + step × (ticks−1)`
 * — every printed tick is exact.
 */
export function niceDomain(values: number[], ticks: number): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.08;
  min -= pad;
  max += pad;

  const intervals = Math.max(1, ticks - 1);
  const niceStep = (raw: number): number => {
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const normalized = raw / magnitude;
    const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
    return factor * magnitude;
  };

  let step = niceStep(Math.max(1e-6, (max - min) / intervals));
  let domainMin = Math.floor(min / step) * step;
  // Widening the step can still leave the top tick below the data (e.g. when
  // flooring the minimum eats a whole step), so grow until it covers.
  let guard = 0;
  while (domainMin + step * intervals < max && guard < 12) {
    step = niceStep(step * 1.5);
    domainMin = Math.floor(min / step) * step;
    guard += 1;
  }
  return { min: domainMin, max: domainMin + step * intervals };
}
