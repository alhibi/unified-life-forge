/**
 * Error telemetry with a real drain.
 *
 * What this replaces: `main.tsx` used to install the global `error` and
 * `unhandledrejection` listeners itself, push each event into a
 * 100-entry array, and `console.warn` it. A comment admitted the gap —
 * "In production this would write directly to Sentry, Datadog or a custom
 * telemetry drain" — so nothing ever left the browser. No error any user hit
 * was observable, and `ErrorBoundary.componentDidCatch` only reached
 * `console.error`, meaning React render failures were invisible even in
 * principle.
 *
 * Design notes:
 *
 * • Sentry is loaded through a dynamic import, and only when
 *   `VITE_SENTRY_DSN` is set. Deployments without a DSN never fetch the SDK
 *   chunk, so the observability path costs unconfigured users nothing.
 *
 * • The in-memory ring buffer is kept. It is genuinely useful for local
 *   debugging and for support ("open the console and run
 *   `__telemetry()`"), and it also holds events captured before the async
 *   SDK import resolves so none are dropped during startup.
 *
 * • Every message and stack passes through `scrubVerboseDetails` before it
 *   leaves this module. That is the same masking the error UI uses (JWTs,
 *   apikey query params, Supabase hostnames) and it must happen before the
 *   transport, not after.
 */

import { scrubVerboseDetails } from '@/lib/scrub';

export type TelemetryKind =
  | 'UncaughtError'
  | 'UnhandledRejection'
  | 'ReactRenderError'
  | 'Manual';

export interface TelemetryEvent {
  timestamp: string;
  kind: TelemetryKind;
  message: string;
  stack?: string;
  /** Extra structured detail, e.g. a React component stack. */
  context?: Record<string, string>;
  route: string;
}

/** Matches Sentry's `captureException`-shaped surface we actually use. */
interface Drain {
  send(event: TelemetryEvent): void;
}

const BUFFER_LIMIT = 100;
const buffer: TelemetryEvent[] = [];

let drain: Drain | null = null;
let installed = false;

function currentRoute(): string {
  try {
    return window.location.pathname;
  } catch {
    return 'unknown';
  }
}

/** Recent events, newest last. Exposed for debugging and for tests. */
export function getTelemetryBuffer(): readonly TelemetryEvent[] {
  return buffer;
}

export function clearTelemetryBuffer(): void {
  buffer.length = 0;
}

/**
 * Records an event: scrubs it, buffers it, and forwards it to the drain when
 * one is attached. Never throws — a failure inside telemetry must not become
 * the error the user sees.
 */
export function captureTelemetry(
  kind: TelemetryKind,
  message: string,
  stack?: string,
  context?: Record<string, string>,
): void {
  try {
    const event: TelemetryEvent = {
      timestamp: new Date().toISOString(),
      kind,
      message: scrubVerboseDetails(message ?? ''),
      stack: stack ? scrubVerboseDetails(stack) : undefined,
      context: context
        ? Object.fromEntries(
            Object.entries(context).map(([k, v]) => [k, scrubVerboseDetails(v)]),
          )
        : undefined,
      route: currentRoute(),
    };

    buffer.push(event);
    if (buffer.length > BUFFER_LIMIT) buffer.shift();

    if (drain) {
      drain.send(event);
    } else if (import.meta.env.DEV) {
      // Only noisy in development. In production with no DSN the buffer is
      // the record; a console warning there just pollutes the user's console.
      console.warn(`[telemetry:${kind}]`, event.message);
    }
  } catch {
    /* telemetry must never escalate */
  }
}

/** Convenience wrapper for the common "I caught an Error object" case. */
export function captureError(
  error: unknown,
  kind: TelemetryKind = 'Manual',
  context?: Record<string, string>,
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  captureTelemetry(kind, message, stack, context);
}

/**
 * Attaches Sentry when a DSN is configured. Returns once the SDK is ready (or
 * immediately if there is nothing to do), and replays anything buffered while
 * the import was in flight.
 */
async function attachSentry(dsn: string): Promise<void> {
  try {
    const Sentry = await import('@sentry/react');

    Sentry.init({
      dsn,
      release: import.meta.env.VITE_APP_VERSION || 'dev',
      environment: import.meta.env.MODE,
      // The app already installs its own global handlers below and scrubs
      // before sending. Letting Sentry also auto-capture would report the
      // same error twice, the second time unscrubbed.
      integrations: (defaults) =>
        defaults.filter(
          (integration) =>
            integration.name !== 'GlobalHandlers' &&
            integration.name !== 'BrowserApiErrors',
        ),
      // No session replay, no profiling, no PII: this is an error drain, not
      // an analytics product, and the app holds journals and private messages.
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });

    drain = {
      send(event) {
        Sentry.withScope((scope) => {
          scope.setTag('kind', event.kind);
          scope.setTag('route', event.route);
          if (event.context) scope.setContext('details', event.context);
          const error = new Error(event.message);
          if (event.stack) error.stack = event.stack;
          Sentry.captureException(error);
        });
      },
    };

    // Replay startup events the drain missed.
    for (const event of buffer) drain.send(event);
  } catch (err) {
    // A blocked or failed SDK load leaves the buffer as the only record,
    // which is the same place we started — degraded, not broken.
    console.warn('[telemetry] Sentry could not be initialised:', (err as Error).message);
  }
}

/**
 * Installs the global error listeners once. Safe to call more than once.
 *
 * Call this as early as possible in the entry module so failures during boot
 * are captured too.
 */
export function initTelemetry(): void {
  if (installed) return;
  installed = true;

  window.addEventListener('error', (event) => {
    captureTelemetry('UncaughtError', event.message, event.error?.stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, 'UnhandledRejection');
  });

  // Expose the buffer for support and local debugging. Read-only accessor so
  // nothing can be injected into the record.
  try {
    Object.defineProperty(window, '__telemetry', {
      value: () => [...buffer],
      configurable: true,
    });
  } catch {
    /* non-fatal */
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) void attachSentry(dsn);
}
