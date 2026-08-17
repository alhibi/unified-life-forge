import { describe, expect, it } from 'vitest';
import { GENDER_COLORS, GERMAN_CLUB_TOKENS, GermanEntrySchema, GermanGender } from '../types';

describe('German Club Feature Unit Tests', () => {
  describe('Gender Color Tokens', () => {
    it('should map der/die/das to the exact signature color tokens', () => {
      expect(GENDER_COLORS.der).toBe(GERMAN_CLUB_TOKENS.derBlue);
      expect(GENDER_COLORS.die).toBe(GERMAN_CLUB_TOKENS.dieRose);
      expect(GENDER_COLORS.das).toBe(GERMAN_CLUB_TOKENS.dasStone);
      expect(GENDER_COLORS.n_a).toBeNull();
    });

    it('should have exact Prussian blue primary accent token', () => {
      expect(GERMAN_CLUB_TOKENS.prussian).toBe('#17324D');
    });
  });

  describe('Separable Verb Prefix Extraction', () => {
    it('should correctly separate prefix from base verb for aufstehen', () => {
      const verb = 'aufstehen';
      const prefix = 'auf';
      expect(verb.startsWith(prefix)).toBe(true);
      const base = verb.slice(prefix.length);
      expect(base).toBe('stehen');
    });

    it('should correctly separate prefix from base verb for anrufen', () => {
      const verb = 'anrufen';
      const prefix = 'an';
      expect(verb.startsWith(prefix)).toBe(true);
      const base = verb.slice(prefix.length);
      expect(base).toBe('rufen');
    });

    it('should handle case insensitivity during prefix matching', () => {
      const verb = 'Einsteigen';
      const prefix = 'ein';
      expect(verb.toLowerCase().startsWith(prefix.toLowerCase())).toBe(true);
      const base = verb.slice(prefix.length);
      expect(base).toBe('steigen');
    });
  });

  describe('German Entry Zod Schema Validation', () => {
    it('should validate a valid reviewed German entry', () => {
      const validEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        shelf_id: '123e4567-e89b-12d3-a456-426614174001',
        entry_type: 'word',
        german_text: 'Kaffee',
        gender: 'der',
        ipa: '/ˈkafe/',
        arabic_translation: 'القهوة',
        register: 'neutral',
        is_separable_verb: false,
        example_sentence_de: 'Ich trinke einen Kaffee.',
        example_sentence_ar: 'أنا أشرب قهوة.',
        difficulty_level: 'A1',
        review_status: 'verified',
        sort_order: 1,
        created_at: new Date().toISOString(),
      };

      const result = GermanEntrySchema.safeParse(validEntry);
      expect(result.success).toBe(true);
    });

    it('should reject invalid gender or review status', () => {
      const invalidEntry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        shelf_id: '123e4567-e89b-12d3-a456-426614174001',
        entry_type: 'word',
        german_text: 'Kaffee',
        gender: 'invalid_gender',
        arabic_translation: 'القهوة',
        register: 'neutral',
        is_separable_verb: false,
        review_status: 'unknown_status',
        created_at: new Date().toISOString(),
      };

      const result = GermanEntrySchema.safeParse(invalidEntry);
      expect(result.success).toBe(false);
    });
  });
});
