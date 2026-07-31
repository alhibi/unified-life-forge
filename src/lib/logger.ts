/**
 * The application logger.
 *
 * Before this existed, 160 bare `console.*` calls were spread across 65 files.
 * That had four concrete consequences:
 *
 *   1. **84 `console.error` calls went nowhere.** `lib/telemetry.ts` only ever
 *      saw uncaught errors, unhandled rejections and React render failures.
 *      Every error a `catch` block handled — a failed Supabase write, a rejected
 *      geolocation permission, a corrupt cache entry — was logged to a console
 *      nobody was reading and never reached the drain. The most useful errors are
 *      precisely the ones code bothered to catch.
 *   2. **Nothing was scrubbed.** `scrubVerboseDetails` guards the error UI and the
 *      telemetry transport, but a raw `console.error(err)` prints the unmasked
 *      JWT, `apikey=` query param or Supabase hostname straight into the console —
 *      which users paste into bug reports.
 *   3. **Debug noise shipped to production.** There is no way to turn 13
 *      `console.log` calls off, because there is no switch to turn.
 *   4. **No provenance.** `console.warn('failed')` gives no clue which subsystem
 *      it came from.
 *
 * Usage — take a scoped logger once per module:
 *
 * ```ts
 * const log = logger.scope('fitness');
 * log.debug('tick', { speed });     // development only
 * log.warn('gps fix stale');        // always shown
 * log.error('upsert failed', err);  // shown AND sent to telemetry
 * ```
 *
 * `error` and `warn` survive into production because they describe things the
 * user may be experiencing. `debug` and `info` are compiled around in production
 * builds via `import.meta.env.DEV`, so their arguments are never even evaluated.
 *
 * This is the only module in `src/` allowed to touch `console` — enforced by the
 * `no-console` rule in eslint.config.js, which exempts this file alone.
 */

import { scrubVerboseDetails } from '@/lib/scrub';
import { captureError, captureTelemetry } from '@/lib/telemetry';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Ordering used to compare against the active threshold. */
const SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * The active threshold.
 *
 * Defaults to `debug` in development and `warn` in production. Overridable at
 * runtime so support can ask a user to raise verbosity without a new build:
 * `localStorage.setItem('app-log-level', 'debug')` then reload.
 */
function initialLevel(): LogLevel {
  try {
    const stored = localStorage.getItem('app-log-level');
    if (stored && stored in SEVERITY) return stored as LogLevel;
  } catch {
    /* storage can be blocked in private browsing */
  }
  return import.meta.env.DEV ? 'debug' : 'warn';
}

let threshold: LogLevel = initialLevel();

export function setLogLevel(level: LogLevel): void {
  threshold = level;
}

export function getLogLevel(): LogLevel {
  return threshold;
}

function enabled(level: LogLevel): boolean {
  return SEVERITY[level] >= SEVERITY[threshold];
}

/**
 * Renders one argument for the console.
 *
 * Strings are scrubbed. Errors contribute their message (also scrubbed) — the
 * stack goes to telemetry rather than the console, where it is noise. Anything
 * else is passed through untouched so devtools can still expand it, since it is
 * a live object rather than a string that could carry a secret.
 */
function present(arg: unknown): unknown {
  if (typeof arg === 'string') return scrubVerboseDetails(arg);
  if (arg instanceof Error) return scrubVerboseDetails(arg.message);
  return arg;
}

/** The first Error among the arguments, if any — the thing worth reporting. */
function firstError(args: readonly unknown[]): Error | undefined {
  return args.find((a): a is Error => a instanceof Error);
}

export interface ScopedLogger {
  /** Development only. Arguments are not evaluated in production builds. */
  debug(message: string, ...args: unknown[]): void;
  /** Development only. */
  info(message: string, ...args: unknown[]): void;
  /** Always shown. Use for degraded-but-working situations. */
  warn(message: string, ...args: unknown[]): void;
  /**
   * Always shown, and forwarded to telemetry.
   *
   * Pass the caught value as an argument (`log.error('save failed', err)`) so the
   * stack reaches the drain; a message alone is reported without one.
   */
  error(message: string, ...args: unknown[]): void;
  /** Derives a narrower scope, e.g. `logger.scope('chat').scope('typing')`. */
  scope(name: string): ScopedLogger;
}

function createLogger(scopePath: string): ScopedLogger {
  const tag = `[${scopePath}]`;

  const emit = (level: LogLevel, message: string, args: readonly unknown[]): void => {
    if (!enabled(level)) return;
    // `console[level]` would be neat, but `console.debug` is hidden by default in
    // some browsers' filter presets, which is how debug logs "disappear" and get
    // replaced by console.log. Map explicitly instead.
    const sink =
      level === 'error'
        ? console.error
        : level === 'warn'
          ? console.warn
          : console.log;
    sink(tag, scrubVerboseDetails(message), ...args.map(present));
  };

  return {
    debug(message, ...args) {
      if (!import.meta.env.DEV) return;
      emit('debug', message, args);
    },
    info(message, ...args) {
      if (!import.meta.env.DEV) return;
      emit('info', message, args);
    },
    warn(message, ...args) {
      emit('warn', message, args);
    },
    error(message, ...args) {
      emit('error', message, args);

      // The point of the abstraction: a handled error is still an error, so it
      // reaches the drain rather than stopping at the console.
      const cause = firstError(args);
      if (cause) {
        captureError(cause, 'Manual', { scope: scopePath, message });
      } else {
        captureTelemetry('Manual', `${tag} ${message}`, undefined, { scope: scopePath });
      }
    },
    scope(name) {
      return createLogger(`${scopePath}:${name}`);
    },
  };
}

/**
 * The root logger. Prefer a scope: `const log = logger.scope('travel-atlas')`.
 */
export const logger: ScopedLogger = createLogger('app');
