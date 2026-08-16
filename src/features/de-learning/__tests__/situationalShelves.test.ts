import { describe, expect, test } from 'vitest';
import { GERMAN_SITUATIONAL_SHELVES } from '../data/situationalShelves';

describe('German Learning - Situational Shelves Dataset', () => {
  test('contains exactly 6 structured situational shelves', () => {
    expect(GERMAN_SITUATIONAL_SHELVES).toHaveLength(6);
  });

  test('each shelf has valid metadata and non-empty items', () => {
    GERMAN_SITUATIONAL_SHELVES.forEach((shelf) => {
      expect(shelf.id).toBeTruthy();
      expect(shelf.title_ar).toBeTruthy();
      expect(shelf.title_de).toBeTruthy();
      expect(shelf.subtitle_ar).toBeTruthy();
      expect(shelf.icon_emoji).toBeTruthy();
      expect(shelf.items.length).toBeGreaterThan(0);
    });
  });

  test('each shelf item contains bold German text, small Arabic translation, and cultural context', () => {
    GERMAN_SITUATIONAL_SHELVES.forEach((shelf) => {
      shelf.items.forEach((item) => {
        expect(item.id).toBeTruthy();
        expect(item.german_text).toBeTruthy();
        expect(item.arabic_translation).toBeTruthy();
        expect(item.cultural_note_ar).toBeTruthy();
        expect(item.context_tag_ar).toBeTruthy();
        expect(item.audio_id).toBeTruthy();
        expect(['A1', 'A2', 'B1', 'B2', 'C1']).toContain(item.cefr_level);
      });
    });
  });

  test('includes Berlin Street & Gen Z Slang shelf items', () => {
    const berlinShelf = GERMAN_SITUATIONAL_SHELVES.find((s) => s.id === 'berlin-street');
    expect(berlinShelf).toBeDefined();

    const diggaItem = berlinShelf?.items.find((i) => i.german_text.includes('Digga'));
    expect(diggaItem).toBeDefined();
    expect(diggaItem?.arabic_translation).toContain('صاحبي');
  });
});
