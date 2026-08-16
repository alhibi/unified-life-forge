import { describe, expect, test } from 'vitest';
import {
  GERMAN_GENZ_SHELVES,
  GERMAN_GRAMMAR_SPOTS,
  GERMAN_PHONETIC_SPOTS,
} from '../data/genzGermanData';

describe('Gen Z German Learning Module - Data Integrity & Formatting', () => {
  test('contains 6 rich situational shelves', () => {
    expect(GERMAN_GENZ_SHELVES).toHaveLength(6);
  });

  test('every item in situational shelves has valid bold German and small Arabic translations', () => {
    GERMAN_GENZ_SHELVES.forEach((shelf) => {
      expect(shelf.id).toBeTruthy();
      expect(shelf.title_ar).toBeTruthy();
      expect(shelf.title_de).toBeTruthy();
      expect(shelf.subtitle_ar).toBeTruthy();
      expect(shelf.items.length).toBeGreaterThan(0);

      shelf.items.forEach((item) => {
        expect(item.id).toBeTruthy();
        expect(item.german_text).toBeTruthy();
        expect(item.arabic_translation).toBeTruthy();
        expect(item.cultural_note_ar).toBeTruthy();
        expect(item.badge_label).toBeTruthy();
        expect(item.audio_id).toBeTruthy();
      });
    });
  });

  test('contains important grammar spots with contrastive Arabic bridges', () => {
    expect(GERMAN_GRAMMAR_SPOTS.length).toBeGreaterThan(0);
    GERMAN_GRAMMAR_SPOTS.forEach((spot) => {
      expect(spot.id).toBeTruthy();
      expect(spot.title_ar).toBeTruthy();
      expect(spot.title_de).toBeTruthy();
      expect(spot.contrastive_arabic_bridge).toBeTruthy();
      expect(spot.examples.length).toBeGreaterThan(0);
    });
  });

  test('contains phonetic spots with articulation guides', () => {
    expect(GERMAN_PHONETIC_SPOTS.length).toBeGreaterThan(0);
    GERMAN_PHONETIC_SPOTS.forEach((ph) => {
      expect(ph.sound_de).toBeTruthy();
      expect(ph.arabic_equivalent_ar).toBeTruthy();
      expect(ph.guide_ar).toBeTruthy();
    });
  });
});
