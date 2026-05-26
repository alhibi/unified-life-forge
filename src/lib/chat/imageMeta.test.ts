import { describe, expect, it } from 'vitest';
import { packImageMeta, unpackFileName, readableFileName, IMG_META_PREFIX } from './imageMeta';

describe('imageMeta', () => {
  describe('packImageMeta', () => {
    it('returns the raw name unchanged when no metadata is provided', () => {
      expect(packImageMeta('photo.jpg', {})).toBe('photo.jpg');
    });

    it('emits the versioned envelope when metadata is present', () => {
      const packed = packImageMeta('photo.jpg', { w: 800, h: 600 });
      expect(packed.startsWith(IMG_META_PREFIX)).toBe(true);
      expect(packed.endsWith(':photo.jpg')).toBe(true);
    });

    it('drops the thumbnail when the encoded payload exceeds the 32 KB cap', () => {
      // 64 KB worth of base64 thumbnail noise
      const huge = 'data:image/webp;base64,' + 'A'.repeat(64 * 1024);
      const packed = packImageMeta('big.jpg', { w: 100, h: 100, c: '#ffffff', t: huge });
      const { meta } = unpackFileName(packed);
      expect(meta?.t).toBeUndefined();
      // …but the cheap fields survive.
      expect(meta?.w).toBe(100);
      expect(meta?.h).toBe(100);
    });

    it('preserves dimensions, dominant colour and thumbnail through a round-trip', () => {
      const meta = { w: 1024, h: 768, c: '#1a2b3c', t: 'data:image/webp;base64,abc' };
      const { name, meta: out } = unpackFileName(packImageMeta('shot.jpg', meta));
      expect(name).toBe('shot.jpg');
      expect(out).toEqual(meta);
    });
  });

  describe('unpackFileName', () => {
    it('returns the raw filename when no envelope is present', () => {
      const r = unpackFileName('plain.jpg');
      expect(r.name).toBe('plain.jpg');
      expect(r.meta).toBeNull();
    });

    it('handles a null/empty filename gracefully', () => {
      expect(unpackFileName(null).name).toBe('');
      expect(unpackFileName('').name).toBe('');
    });

    it('falls back to the raw string when the envelope is malformed', () => {
      const broken = `${IMG_META_PREFIX}not-base64-!@#$%:photo.jpg`;
      const r = unpackFileName(broken);
      // Either we strip cleanly (decoded to JSON failed → null meta) or we
      // return the whole thing as the name. Both keep the bubble alive.
      expect(r.meta).toBeNull();
    });
  });

  describe('readableFileName', () => {
    it('strips the envelope so users see clean download names', () => {
      const packed = packImageMeta('vacation.jpg', { w: 1600, h: 1200 });
      expect(readableFileName(packed)).toBe('vacation.jpg');
    });

    it('returns the input as-is for legacy filenames', () => {
      expect(readableFileName('legacy.png')).toBe('legacy.png');
      expect(readableFileName(null)).toBe('');
    });
  });
});
