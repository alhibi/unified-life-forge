/**
 * Public surface of the daily-content feature.
 *
 * Consumers (pages, components, tests) should import from this file only —
 * never from the internal seed files directly. That keeps the daily
 * architecture swappable.
 */

export { DAILY_KULTURPERLEN, DAILY_KULTURPERLEN_COUNT } from './kulturperlen';
export { DAILY_SAETZE, DAILY_SAETZE_COUNT } from './saetze';
export { dayKey,daysSinceEpoch, getDailyBundle, getWortDesTages } from './selector';
export { DAILY_SPRICHWOERTER, DAILY_SPRICHWOERTER_COUNT } from './sprichwoerter';
export type { DailyBundle,DailyKulturperle, DailySatz, DailySprichwort, DailyWort } from './types';
export { DAILY_WORTER, DAILY_WORTER_COUNT } from './woerter';