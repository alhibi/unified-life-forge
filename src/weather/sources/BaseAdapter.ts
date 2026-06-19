// Abstract base for every data source.
// Concrete adapters implement `fetchPartial()` and `fetchForecast()` where
// applicable. The engine never instantiates adapters directly — it calls
// `runAdapter()` which wraps the call with timeout + circuit-breaker check.

import type { PartialSnapshot } from '../types/WeatherSnapshot';
import type { ForecastLayers } from '../types/ForecastLayer';
import type { AdapterResponse, SourceId, SourceMeta } from '../types/SourceRegistry';

export interface AdapterContext {
  lat: number;
  lng: number;
  language: 'ar' | 'de' | 'en';
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

const DEFAULT_TIMEOUT_MS = 5000;

/** Wrap an adapter call with a hard timeout and structured error capture. */
export async function runAdapter(
  adapter: BaseAdapter,
  ctx: AdapterContext,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<AdapterResponse> {
  const started = performance.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(new Error('adapter timeout')), timeoutMs);
  try {
    const [snapshot, forecast] = await Promise.all([
      adapter.fetchPartial({ ...ctx, signal: ac.signal }),
      adapter.fetchForecast({ ...ctx, signal: ac.signal }),
    ]);
    return {
      sourceId: adapter.id,
      ok: true,
      durationMs: Math.round(performance.now() - started),
      snapshot,
      forecast,
    };
  } catch (e) {
    return {
      sourceId: adapter.id,
      ok: false,
      durationMs: Math.round(performance.now() - started),
      error: (e as Error).message ?? 'unknown error',
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Safe wrapper around `fetch` honoring an AbortSignal and JSON parsing. */
export async function safeJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
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
