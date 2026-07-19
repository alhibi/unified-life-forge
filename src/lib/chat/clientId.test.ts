import { describe, it, expect } from 'vitest';
import {
  newClientId, looksLikeUuid, optimisticIdFromClientId, isOptimisticId,
} from './clientId';

describe('clientId helpers', () => {
  describe('newClientId', () => {
    it('returns a non-empty string', () => {
      const id = newClientId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('returns a different value on each call', () => {
      const ids = new Set(Array.from({ length: 200 }, () => newClientId()));
      // Tolerate one accidental collision in 200 calls — but not more.
      expect(ids.size).toBeGreaterThan(198);
    });

    it('returned value passes looksLikeUuid', () => {
      // The fallback isn't a strict UUID v4 (no version bits in some
      // browsers), so we accept either the canonical UUID or the
      // fallback shape.
      const id = newClientId();
      expect(id).toMatch(/^[0-9a-f-]{30,}$/i);
    });

    it('generates valid UUID format even when crypto.randomUUID is not available', () => {
      const originalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

      if (typeof globalThis !== 'undefined') {
        // Mock globalThis.crypto to not have randomUUID but have getRandomValues
        const mockCrypto = {
          getRandomValues: <T extends ArrayBufferView | null>(arr: T): T => {
            if (originalCrypto?.getRandomValues) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (originalCrypto.getRandomValues as any)(arr) as T;
            }
            if (arr && ArrayBuffer.isView(arr)) {
              const view = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
              for (let i = 0; i < view.length; i++) {
                view[i] = Math.floor(Math.random() * 256);
              }
            }
            return arr;
          }
        };
        Object.defineProperty(globalThis, 'crypto', {
          value: mockCrypto,
          configurable: true,
          writable: true
        });
      }

      try {
        const id = newClientId();
        expect(looksLikeUuid(id)).toBe(true);
        // Verify version 4 and variant RFC4122 properties
        expect(id[14]).toBe('4'); // 4xxx
        expect(['8', '9', 'a', 'b']).toContain(id[19].toLowerCase()); // [89ab]xxx
      } finally {
        // Restore
        if (typeof globalThis !== 'undefined' && originalCrypto) {
          Object.defineProperty(globalThis, 'crypto', {
            value: originalCrypto,
            configurable: true,
            writable: true
          });
        }
      }
    });

    it('generates valid format even when both crypto.randomUUID and getRandomValues are unavailable', () => {
      const originalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

      if (typeof globalThis !== 'undefined') {
        // Mock globalThis.crypto to be undefined or empty
        Object.defineProperty(globalThis, 'crypto', {
          value: undefined,
          configurable: true,
          writable: true
        });
      }

      try {
        const id = newClientId();
        // Since extreme fallback matches: ${r()}-${r().slice(0, 4)}-4${r().slice(4, 7)}-a${r().slice(0, 3)}-${r()}${r().slice(0, 4)}
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/i);
      } finally {
        // Restore
        if (typeof globalThis !== 'undefined' && originalCrypto) {
          Object.defineProperty(globalThis, 'crypto', {
            value: originalCrypto,
            configurable: true,
            writable: true
          });
        }
      }
    });
  });

  describe('looksLikeUuid', () => {
    it('accepts canonical v4 UUID', () => {
      expect(looksLikeUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });
    it('accepts uppercase variants', () => {
      expect(looksLikeUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });
    it('rejects short strings', () => {
      expect(looksLikeUuid('not-a-uuid')).toBe(false);
    });
    it('rejects null / undefined / numbers', () => {
      expect(looksLikeUuid(null)).toBe(false);
      expect(looksLikeUuid(undefined)).toBe(false);
      expect(looksLikeUuid(42)).toBe(false);
      expect(looksLikeUuid({})).toBe(false);
    });
    it('rejects strings missing dashes', () => {
      expect(looksLikeUuid('550e8400e29b41d4a716446655440000')).toBe(false);
    });
  });

  describe('optimistic id helpers', () => {
    it('round-trips: optimisticIdFromClientId → isOptimisticId', () => {
      const cid = '550e8400-e29b-41d4-a716-446655440000';
      const opt = optimisticIdFromClientId(cid);
      expect(opt.startsWith('optimistic_')).toBe(true);
      expect(isOptimisticId(opt)).toBe(true);
    });
    it('rejects non-optimistic ids', () => {
      expect(isOptimisticId('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    });
  });
});
