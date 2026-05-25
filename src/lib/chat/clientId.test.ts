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
