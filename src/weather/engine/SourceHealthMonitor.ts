// Tracks per-source reliability and dynamically adjusts ensemble weights.
// Reliability = (100 − error_rate%) × (1 − response_time/5000ms).

import { breaker } from './CircuitBreaker';
import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';

export interface SourceHealth {
  id: SourceId;
  label: string;
  baseWeight: number;
  effectiveWeight: number;
  reliability: number;     // 0..100
  errorRate24h: number;
  avgResponseMs: number;
  state: 'closed' | 'open' | 'half_open';
  cooldownRemainingMs: number;
}

export function snapshotAllSources(): SourceHealth[] {
  return (Object.keys(SOURCE_REGISTRY) as SourceId[]).map(id => {
    const meta = SOURCE_REGISTRY[id];
    const b = breaker.snapshot(id);
    const errorComponent = Math.max(0, 1 - b.errorRate24h / 100);
    const speedComponent = Math.max(0, 1 - b.avgResponseMs / 5000);
    const reliability = Math.round(errorComponent * speedComponent * 100);
    const cooldownRemaining = b.cooldownUntilUnix ? Math.max(0, b.cooldownUntilUnix - Date.now()) : 0;
    return {
      id,
      label: meta.label,
      baseWeight: meta.weight,
      effectiveWeight: meta.weight * (reliability / 100),
      reliability,
      errorRate24h: b.errorRate24h,
      avgResponseMs: b.avgResponseMs,
      state: b.state,
      cooldownRemainingMs: cooldownRemaining,
    };
  });
}
