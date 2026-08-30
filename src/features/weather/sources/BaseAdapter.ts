// Abstract base for every data source.
// Concrete adapters implement `fetchPartial()` and `fetchForecast()` where
// applicable. The engine never instantiates adapters directly — it calls
// `runAdapter()` which wraps the call with retry + circuit-breaker.

import { executeWithResilience } from '../engine/ResilienceStrategy';
import { DEFAULT_RETRY_POLICY } from '../engine/RetryPolicy';
import type { ForecastLayers } from '../types/ForecastLayer';
import type { AdapterResponse, SourceId, SourceMeta } from '../types/SourceRegistry';
import { SOURCE_REGISTRY } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';

export interface AdapterContext {
  lat: number;
  lng: number;
  language: 'ar' | 'en';
  apiKey?: string;
  signal?: AbortSignal;
}

export abstract class BaseAdapter {
  abstract readonly id: SourceId;
  abstract readonly meta: SourceMeta;

  /** Atmospheric / instant snapshot data. Return empty object if N/A. */
  async fetchPartial(_ctx: AdapterContext): Promise<PartialSnapshot> { return {}; }

  /** Forecast layers. Default: nothing. */
  async fetchForecast(_ctx: AdapterContext): Promise<Partial<ForecastLayers>> { return {}; }

  /** Quick health probe — override for sources that have a /ping endpoint. */
  async ping(): Promise<boolean> { return true; }
}

/**
 * Run an adapter through the resilience layer. The resilience layer applies:
 *   • per-source timeout (from SOURCE_REGISTRY.timeoutMs, default 5000 ms)
 *   • exponential-backoff retry (from SOURCE_REGISTRY.retryMax, default 2)
 *   • circuit-breaker gating (state persisted to localStorage)
 *
 * The caller always gets back a single AdapterResponse whose `ok`/`error`
 * reflect the final outcome after all retries. The engine no longer needs
 * to know about retry counts.
 */
export async function runAdapter(
  adapter: BaseAdapter,
  ctx: AdapterContext,
): Promise<AdapterResponse> {
  const meta = SOURCE_REGISTRY[adapter.id];
  const timeoutMs = meta.timeoutMs ?? 5000;
  const retryMax = meta.retryMax ?? DEFAULT_RETRY_POLICY.maxAttempts;
  const policy = { ...DEFAULT_RETRY_POLICY, maxAttempts: retryMax };

  const { response } = await executeWithResilience(
    (signal) => Promise.all([
      adapter.fetchPartial({ ...ctx, signal }),
      adapter.fetchForecast({ ...ctx, signal }),
    ]).then(([snapshot, forecast]) => ({ snapshot, forecast })),
    { sourceId: adapter.id, timeoutMs, retry: policy },
  );
  return response;
}

/** Safe wrapper around `fetch` honoring an AbortSignal and JSON parsing. */
export async function safeJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

/** Read a Vite env var safely. */
export function readEnv(key: string | undefined): string | undefined {
  if (!key) return undefined;
  try {
    const env = (import.meta as ImportMeta & { env: Record<string, string> }).env;
    const v = env?.[key];
    return v ? String(v) : undefined;
  } catch { return undefined; }
}