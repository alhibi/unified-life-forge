import { describe, it, expect } from 'vitest';
import { ChatError, toChatError, describeChatError } from './errors';

describe('ChatError', () => {
  it('default retriable depends on the code', () => {
    expect(new ChatError('NETWORK', 'down').retriable).toBe(true);
    expect(new ChatError('RATE_LIMITED', 'slow down').retriable).toBe(true);
    expect(new ChatError('FORBIDDEN', 'no').retriable).toBe(false);
  });
  it('explicit retriable wins over the default', () => {
    expect(new ChatError('NETWORK', 'down', { retriable: false }).retriable).toBe(false);
  });
});

describe('toChatError', () => {
  it('passes ChatError through unchanged', () => {
    const original = new ChatError('NOT_FOUND', 'gone');
    expect(toChatError(original)).toBe(original);
  });
  it('classifies "supabase_not_configured"', () => {
    expect(toChatError({ message: 'supabase_not_configured' }).code).toBe('NOT_CONFIGURED');
    expect(toChatError({ code: 'supabase_not_configured' }).code).toBe('NOT_CONFIGURED');
  });
  it('detects network errors via message text', () => {
    expect(toChatError({ message: 'Failed to fetch' }).code).toBe('NETWORK');
    expect(toChatError({ message: 'NetworkError when attempting' }).code).toBe('NETWORK');
    expect(toChatError({ name: 'TypeError', message: '' }).code).toBe('NETWORK');
  });
  it('detects 401 / 403 / 404 by status', () => {
    expect(toChatError({ status: 401, message: 'jwt expired' }).code).toBe('UNAUTHENTICATED');
    expect(toChatError({ status: 403, message: 'denied' }).code).toBe('FORBIDDEN');
    expect(toChatError({ status: 404, message: 'not found' }).code).toBe('NOT_FOUND');
  });
  it('detects 23505 unique violation as CONFLICT', () => {
    expect(toChatError({ code: '23505', message: 'duplicate key' }).code).toBe('CONFLICT');
  });
  it('detects 429 rate limit', () => {
    expect(toChatError({ status: 429, message: 'rate limit' }).code).toBe('RATE_LIMITED');
  });
  it('detects 413 payload too large', () => {
    expect(toChatError({ status: 413, message: 'too large' }).code).toBe('PAYLOAD_TOO_LARGE');
  });
  it('detects validation hints', () => {
    expect(toChatError({ message: 'Title required' }).code).toBe('INVALID_INPUT');
    expect(toChatError({ message: 'must be at most 120 chars' }).code).toBe('INVALID_INPUT');
  });
  it('falls back to UNKNOWN', () => {
    expect(toChatError(null).code).toBe('UNKNOWN');
    expect(toChatError({ message: 'some opaque error' }).code).toBe('UNKNOWN');
  });
});

describe('describeChatError', () => {
  it('returns a localised string for every code', () => {
    const codes: Array<ChatError['code']> = [
      'NETWORK', 'NOT_CONFIGURED', 'UNAUTHENTICATED', 'FORBIDDEN',
      'NOT_FOUND', 'CONFLICT', 'RATE_LIMITED', 'PAYLOAD_TOO_LARGE',
      'INVALID_INPUT', 'STORAGE_QUOTA', 'UNKNOWN',
    ];
    for (const c of codes) {
      const e = new ChatError(c, '');
      expect(describeChatError(e, true).length).toBeGreaterThan(0);
      expect(describeChatError(e, false).length).toBeGreaterThan(0);
    }
  });
  it('Arabic and German strings differ', () => {
    const e = new ChatError('NETWORK', '');
    expect(describeChatError(e, true)).not.toBe(describeChatError(e, false));
  });
});
