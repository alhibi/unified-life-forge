/**
 * Single-source-of-truth OpenTelemetry bootstrap. Wired up lazily because
 * Sentry's transport is already doing most of the heavy lifting on production
 * and we never want two exporters fighting over the same trace.
 *
 * Enable with `?otel=1` in the URL or by setting `window.__SMARTHUB_OTEL__=true`
 * before bundle evaluation.
 */

import { trace, type Tracer } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, type ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { APP_NAME, APP_VERSION, BUILD_ID, COMMIT_SHA } from '../version';

let provider: WebTracerProvider | null = null;
let batchProcessor: BatchSpanProcessor | null = null;
let installed = false;

function endpoint(): string | null {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="smarthub-otel-endpoint"]');
  return meta?.content ?? null;
}

export function installObservability(): void {
  if (installed) return;
  installed = true;
  const url = endpoint();
  if (!url) return;
  provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: APP_NAME,
      [ATTR_SERVICE_VERSION]: APP_VERSION,
      'smarthub.build_id': BUILD_ID,
      'smarthub.commit_sha': COMMIT_SHA,
    }),
    spanProcessors: [],
  });
  batchProcessor = new BatchSpanProcessor(new OTLPTraceExporter({ url }), {
    maxExportBatchSize: 64,
    scheduledDelayMillis: 5_000,
  });
  provider.addSpanProcessor(batchProcessor);
  provider.register();
}

export function shutdownObservability(): Promise<void> {
  return batchProcessor ? batchProcessor.forceFlush() : Promise.resolve();
}

export function getTracer(): Tracer {
  return trace.getTracer(APP_NAME, APP_VERSION);
}

export function recordSpan(name: string, fn: () => Promise<void> | void): Promise<void> {
  const tracer = getTracer();
  const span = tracer.startSpan(name);
  return Promise.resolve()
    .then(fn)
    .then(
      () => span.end(),
      (err: unknown) => {
        span.recordException(err instanceof Error ? err : new Error(String(err)));
        span.end();
        throw err;
      },
    );
}

export function drainQueue(): Promise<ReadableSpan[]> {
  return batchProcessor ? batchProcessor.forceFlush() : Promise.resolve();
}