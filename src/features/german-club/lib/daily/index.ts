/**
 * Public surface of the daily-content feature.
 *
 * Consumers (pages, components, tests) should import from this file only —
 * never from the internal seed files directly. That keeps the daily
 * architecture swappable.
 */

export type { DailyWort, DailySprichwort, DailySatz, DailyKulturperle, DailyBundle } from './types';
export { getDailyBundle, getWortDesTages, daysSinceEpoch, dayKey } from './selector';
export { DAILY_WORTER, DAILY_WORTER_COUNT } from './woerter';
export { DAILY_SPRICHWOERTER, DAILY_SPRICHWOERTER_COUNT } from './sprichwoerter';
export { DAILY_SAETZE, DAILY_SAETZE_COUNT } from './saetze';
export { DAILY_KULTURPERLEN, DAILY_KULTURPERLEN_COUNT } from './kulturperlen';