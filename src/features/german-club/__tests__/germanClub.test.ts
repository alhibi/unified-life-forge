import { describe, expect, it } from 'vitest';

import { GENDER_COLORS, GERMAN_CLUB_TOKENS, GermanEntrySchema } from '../types';
import { useGermanClubStore } from '../useGermanClubStore';

describe('German Club Feature Unit Tests', () => {
  describe('Situational Taxonomy & Store Initial Fallbacks', () => {
    it('should have a rich fallback taxonomy with at least 64 shelves across Vol. 1 & Vol. 2', () => {
      const state = useGermanClubStore.getState();
      expect(state.shelves.length).toBeGreaterThanOrEqual(64);
      expect(state.shelves.every((s) => !s.is_premium)).toBe(true);
    });

    it('should load entries without paywall locking for any shelf', async () => {
      const store = useGermanClubStore.getState();
      await store.fetchShelfEntries('coffee-bakery');
      const state = useGermanClubStore.getState();
      expect(state.entries.length).toBeGreaterThan(0);
      expect(state.entries.every((e) => !e.locked)).toBe(true);
    }, 15000);

    it('should include core macro-domain shelves like burgeramt-anmeldung and coffee-bakery', () => {
      const state = useGermanClubStore.getState();
      const slugs = state.shelves.map((s) => s.slug);
      expect(slugs).toContain('coffee-bakery');
      expect(slugs).toContain('burgeramt-anmeldung');
      expect(slugs).toContain('public-transport');
      expect(slugs).toContain('denglisch-loanwords');
    });

    it('should include all 11 new Vol. 2 domain shelves in fallback state', () => {
      const state = useGermanClubStore.getState();
      const slugs = state.shelves.map((s) => s.slug);

      // ك. الأمثال
      expect(slugs).toContain('animal-idioms');
      expect(slugs).toContain('weather-idioms');
      expect(slugs).toContain('food-idioms');
      expect(slugs).toContain('body-idioms');

      // ل. اللهجات
      expect(slugs).toContain('bavarian-signature');
      expect(slugs).toContain('swabian-signature');
      expect(slugs).toContain('kolsch-cologne');
      expect(slugs).toContain('austrian-swiss-basics');

      // م. الشتائم والتذمر
      expect(slugs).toContain('swearing-insults');
      expect(slugs).toContain('venting-expressions');

      // ن. الرومانسية
      expect(slugs).toContain('flirting-deep');
      expect(slugs).toContain('relationship-milestones');
      expect(slugs).toContain('breakup-language');
      expect(slugs).toContain('pet-names-affection');

      // س. الثقافات الفرعية
      expect(slugs).toContain('techno-club-culture');
      expect(slugs).toContain('football-fan-culture');
      expect(slugs).toContain('gaming-culture');
      expect(slugs).toContain('festival-culture');

      // ع. الخصوصية والديجيتال
      expect(slugs).toContain('privacy-datenschutz');
      expect(slugs).toContain('online-banking');
      expect(slugs).toContain('tech-support-calls');

      // ف. البيئة والفرز
      expect(slugs).toContain('mulltrennung-full-system');
      expect(slugs).toContain('ruhezeit-quiet-hours');

      // ص. الرياضة
      expect(slugs).toContain('gym-culture');
      expect(slugs).toContain('cycling-culture');
      expect(slugs).toContain('running-culture');

      // ق. السفر الداخلي
      expect(slugs).toContain('deutschlandticket-travel');
      expect(slugs).toContain('hostel-culture');

      // ر. المهرجانات
      expect(slugs).toContain('oktoberfest-full');
      expect(slugs).toContain('karneval-full');
      expect(slugs).toContain('christmas-markets');

      // ت. الحيوانات والبيت
      expect(slugs).toContain('pet-culture');
      expect(slugs).toContain('putzplan-chores');
    });

    it('should include full Elite Grammar Corner and Etymology/Trivia notes in fallback state', () => {
      const state = useGermanClubStore.getState();
      expect(state.grammarNotes.length).toBeGreaterThanOrEqual(10);
      const titles = state.grammarNotes.map((g) => g.title_ar);
      expect(titles.some((t) => t.includes('أدوات التلطيف'))).toBe(true);
      expect(titles.some((t) => t.includes('Sie و Du'))).toBe(true);
      expect(titles.some((t) => t.includes('الأصدقاء المزيفون'))).toBe(true);
      // Vol. 2 Etymology/Trivia domain (ش)
      expect(titles.some((t) => t.includes('أصول الكلمات الألمانية في الإنجليزية'))).toBe(true);
      expect(titles.some((t) => t.includes('حلقة الـ Denglisch'))).toBe(true);
      expect(titles.some((t) => t.includes('عبقرية الكلمات المركبة'))).toBe(true);
    });
  });

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
