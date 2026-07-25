/**
 * The property worth testing here is not "does it log" but "can a secret ever
 * leave the module unmasked". The app holds journals, private messages and a
 * Supabase session, so anything captured on the way to an external drain has
 * to be scrubbed first — after transport is too late.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  captureError,
  captureTelemetry,
  clearTelemetryBuffer,
  getTelemetryBuffer,
} from './telemetry';

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwYWJjZGVmZ2hpaiJ9.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXkw';

describe('captureTelemetry', () => {
  beforeEach(clearTelemetryBuffer);

  it('records the event with kind, route and timestamp', () => {
    captureTelemetry('UncaughtError', 'boom');
    const [event] = getTelemetryBuffer();
    expect(event.kind).toBe('UncaughtError');
    expect(event.message).toBe('boom');
    expect(event.route).toBe(window.location.pathname);
    expect(Number.isNaN(Date.parse(event.timestamp))).toBe(false);
  });

  it('masks JWTs in the message', () => {
    captureTelemetry('UncaughtError', `request failed with token ${JWT}`);
    const [event] = getTelemetryBuffer();
    expect(event.message).not.toContain(JWT);
    expect(event.message).toContain('[MASKED_API_KEY]');
  });

  it('masks apikey and anon_key query parameters', () => {
    captureTelemetry(
      'UncaughtError',
      'GET /rest/v1/profiles?apikey=abc123secret&anon_key=xyz789secret failed',
    );
    const [event] = getTelemetryBuffer();
    expect(event.message).not.toContain('abc123secret');
    expect(event.message).not.toContain('xyz789secret');
  });

  it('masks the Supabase project hostname', () => {
    captureTelemetry('UncaughtError', 'fetch https://abcdefghijkl.supabase.co/rest/v1 failed');
    const [event] = getTelemetryBuffer();
    expect(event.message).not.toContain('abcdefghijkl.supabase.co');
    expect(event.message).toContain('[REDACTED_DB_HOST]');
  });

  it('masks the stack, not just the message', () => {
    captureTelemetry('UncaughtError', 'boom', `at fetch (https://abcdefghijkl.supabase.co/x)`);
    const [event] = getTelemetryBuffer();
    expect(event.stack).not.toContain('abcdefghijkl.supabase.co');
  });

  it('masks values inside the context map', () => {
    captureTelemetry('ReactRenderError', 'render failed', undefined, {
      componentStack: `at Chat (https://abcdefghijkl.supabase.co/app.js)`,
    });
    const [event] = getTelemetryBuffer();
    expect(event.context?.componentStack).not.toContain('abcdefghijkl.supabase.co');
  });

  it('caps the buffer at 100 entries, keeping the newest', () => {
    for (let i = 0; i < 130; i++) captureTelemetry('Manual', `event-${i}`);
    const events = getTelemetryBuffer();
    expect(events).toHaveLength(100);
    expect(events[0].message).toBe('event-30');
    expect(events[events.length - 1].message).toBe('event-129');
  });

  it('does not throw on a null or undefined message', () => {
    expect(() =>
      captureTelemetry('Manual', undefined as unknown as string),
    ).not.toThrow();
    expect(getTelemetryBuffer()).toHaveLength(1);
  });
});

describe('captureError', () => {
  beforeEach(clearTelemetryBuffer);

  it('unwraps an Error into message and stack', () => {
    const error = new Error('kaboom');
    captureError(error, 'UnhandledRejection');
    const [event] = getTelemetryBuffer();
    expect(event.message).toBe('kaboom');
    expect(event.stack).toContain('kaboom');
    expect(event.kind).toBe('UnhandledRejection');
  });

  it('stringifies a non-Error rejection reason', () => {
    captureError('just a string', 'UnhandledRejection');
    const [event] = getTelemetryBuffer();
    expect(event.message).toBe('just a string');
    expect(event.stack).toBeUndefined();
  });

  it('defaults to the Manual kind', () => {
    captureError(new Error('x'));
    expect(getTelemetryBuffer()[0].kind).toBe('Manual');
  });
});
