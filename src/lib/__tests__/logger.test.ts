/**
 * The logger's two jobs are the two things worth testing: it must not leak
 * secrets into the console, and `error` must reach the telemetry drain rather
 * than stopping at the console the way 84 bare `console.error` calls used to.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getLogLevel, logger, setLogLevel } from '../logger';
import { clearTelemetryBuffer, getTelemetryBuffer } from '../telemetry';

const A_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikpv.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';

describe('logger', () => {
  const originalLevel = getLogLevel();
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearTelemetryBuffer();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setLogLevel(originalLevel);
  });

  it('tags output with the scope path', () => {
    logger.scope('fitness').warn('gps fix stale');
    expect(warnSpy).toHaveBeenCalledWith('[app:fitness]', 'gps fix stale');
  });

  it('nests scopes', () => {
    logger.scope('chat').scope('typing').warn('channel dropped');
    expect(warnSpy).toHaveBeenCalledWith('[app:chat:typing]', 'channel dropped');
  });

  it('scrubs secrets out of the message', () => {
    logger.scope('auth').warn(`token=${A_JWT} rejected`);
    const [, message] = warnSpy.mock.calls[0] as [string, string];
    expect(message).not.toContain(A_JWT);
    expect(message).toContain('[MASKED_API_KEY]');
  });

  it('scrubs secrets out of string arguments too', () => {
    logger.scope('auth').warn('failed', `apikey=${A_JWT}`);
    const args = warnSpy.mock.calls[0] as string[];
    expect(args.join(' ')).not.toContain(A_JWT);
  });

  it('scrubs an Error message but keeps the object out of the console', () => {
    logger.scope('db').error('write failed', new Error(`host https://abcdefg.supabase.co down`));
    const args = errorSpy.mock.calls[0] as string[];
    expect(args.join(' ')).toContain('[REDACTED_DB_HOST]');
    expect(args.join(' ')).not.toContain('abcdefg');
  });

  it('forwards error() to the telemetry drain with the cause attached', () => {
    const cause = new Error('upsert rejected');
    logger.scope('fitness').error('could not save activity', cause);

    const events = getTelemetryBuffer();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('Manual');
    expect(events[0].message).toBe('upsert rejected');
    expect(events[0].context?.scope).toBe('app:fitness');
    expect(events[0].context?.message).toBe('could not save activity');
  });

  it('still reports an error() with no Error argument', () => {
    logger.scope('network').error('queue flush gave up');

    const events = getTelemetryBuffer();
    expect(events).toHaveLength(1);
    expect(events[0].message).toContain('queue flush gave up');
  });

  it('does not report warn() — a warning is not an error', () => {
    logger.scope('cache').warn('miss');
    expect(getTelemetryBuffer()).toHaveLength(0);
  });

  it('suppresses output below the active level', () => {
    setLogLevel('error');
    const log = logger.scope('noisy');
    log.debug('tick');
    log.info('detail');
    log.warn('degraded');
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    log.error('broken');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('reports error() to telemetry even when the console is silenced', () => {
    // Verbosity controls what a developer sees; it must not control what
    // operations sees. Tying the two together is how a raised threshold would
    // quietly blind the drain.
    setLogLevel('error');
    logger.scope('db').error('still reported', new Error('boom'));
    expect(getTelemetryBuffer()).toHaveLength(1);
  });
});
