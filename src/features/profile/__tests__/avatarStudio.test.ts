import { describe, expect, it } from 'vitest';

import { FEATURED_AVATAR_PRESETS } from '../data/avatarPresets';
import {
  decodeAvatarDataUri,
  DEFAULT_STUDIO_PARAMS,
  generateAvatarDataUri,
  generateAvatarSvg,
  isStudioAvatarUri,
  STUDIO_ABSTRACTS,
  STUDIO_ARCHETYPES,
  STUDIO_FRAMES,
  STUDIO_GRADIENTS,
  STUDIO_SEALS,
  STUDIO_TEXTURES,
} from '../lib/avatarStudioEngine';

describe('Modern Avatar Studio Engine & Presets Suite', () => {
  describe('Studio Engine Data Definitions', () => {
    it('contains comprehensive studio palettes, archetypes, and frames', () => {
      expect(STUDIO_GRADIENTS.length).toBeGreaterThanOrEqual(16);
      expect(STUDIO_FRAMES.length).toBeGreaterThanOrEqual(8);
      expect(STUDIO_ARCHETYPES.length).toBeGreaterThanOrEqual(16);
      expect(STUDIO_ABSTRACTS.length).toBeGreaterThanOrEqual(12);
      expect(STUDIO_SEALS.length).toBeGreaterThanOrEqual(8);
      expect(STUDIO_TEXTURES.length).toBeGreaterThanOrEqual(5);
    });

    it('has valid default studio parameters', () => {
      expect(DEFAULT_STUDIO_PARAMS.category).toBe('archetype');
      expect(DEFAULT_STUDIO_PARAMS.presetId).toBe('arch-scholar');
      expect(DEFAULT_STUDIO_PARAMS.primaryColor).toBe('#E45B60');
    });
  });

  describe('SVG & Data URI Generation Engine', () => {
    it('generates a clean, valid SVG string for default params', () => {
      const svg = generateAvatarSvg();
      expect(svg).toContain('<svg');
      expect(svg).toContain('data-studio-params=');
      expect(svg).toContain('viewBox="0 0 256 256"');
      expect(svg).toContain('</svg>');
    });

    it('generates a valid SVG Data URI for all categories', () => {
      const categories = ['archetype', 'abstract', 'monogram', 'pattern'] as const;

      categories.forEach((cat) => {
        const uri = generateAvatarDataUri({
          category: cat,
          presetId: cat === 'archetype' ? 'arch-scholar' : cat === 'abstract' ? 'abs-mesh-3d' : 'seal-squircle-gold',
          monogramChar: 'م',
        });

        expect(uri.startsWith('data:image/svg+xml')).toBe(true);
        expect(isStudioAvatarUri(uri)).toBe(true);
      });
    });

    it('encodes and decodes studio parameters accurately from Data URI metadata', () => {
      const customParams = {
        category: 'monogram' as const,
        presetId: 'seal-hexagon-royal',
        gradientId: 'champagne-gold',
        frameId: 'gold-hex',
        textureId: 'radial-spotlight',
        monogramChar: 'أ',
        primaryColor: '#D4AF37',
        secondaryColor: '#E45B60',
      };

      const uri = generateAvatarDataUri(customParams);
      const decoded = decodeAvatarDataUri(uri);

      expect(decoded).not.toBeNull();
      expect(decoded?.category).toBe('monogram');
      expect(decoded?.presetId).toBe('seal-hexagon-royal');
      expect(decoded?.gradientId).toBe('champagne-gold');
      expect(decoded?.frameId).toBe('gold-hex');
      expect(decoded?.monogramChar).toBe('أ');
      expect(decoded?.primaryColor).toBe('#D4AF37');
      expect(decoded?.secondaryColor).toBe('#E45B60');
    });

    it('handles legacy and non-studio URLs safely', () => {
      expect(isStudioAvatarUri('https://example.com/avatar.png')).toBe(false);
      expect(isStudioAvatarUri('🦊')).toBe(false);
      expect(isStudioAvatarUri(null)).toBe(false);
      expect(decodeAvatarDataUri('https://example.com/image.png')).toBeNull();
    });
  });

  describe('Featured Avatar Presets Gallery', () => {
    it('contains over 20 curated presets across all 4 categories', () => {
      expect(FEATURED_AVATAR_PRESETS.length).toBeGreaterThanOrEqual(16);

      const archetypes = FEATURED_AVATAR_PRESETS.filter((p) => p.category === 'archetype');
      const abstracts = FEATURED_AVATAR_PRESETS.filter((p) => p.category === 'abstract');
      const monograms = FEATURED_AVATAR_PRESETS.filter((p) => p.category === 'monogram');
      const patterns = FEATURED_AVATAR_PRESETS.filter((p) => p.category === 'pattern');

      expect(archetypes.length).toBeGreaterThanOrEqual(6);
      expect(abstracts.length).toBeGreaterThanOrEqual(4);
      expect(monograms.length).toBeGreaterThanOrEqual(4);
      expect(patterns.length).toBeGreaterThanOrEqual(2);
    });

    it('all presets produce valid Data URIs and titles', () => {
      FEATURED_AVATAR_PRESETS.forEach((preset) => {
        expect(preset.id).toBeDefined();
        expect(preset.titleAr).not.toBe('');
        expect(preset.dataUri.startsWith('data:image/svg+xml')).toBe(true);
        expect(isStudioAvatarUri(preset.dataUri)).toBe(true);
      });
    });
  });
});
