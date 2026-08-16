import { describe, expect, it } from 'vitest';

import {
  getLearnedWords,
  getWordSuggestions,
  learnWord,
} from '../lib/prediction';

describe('Soft Keyboard Prediction Engine', () => {
  it('returns default Arabic greeting suggestions when input is empty', () => {
    const suggestions = getWordSuggestions('');
    expect(suggestions).toContain('السلام');
    expect(suggestions).toContain('شكراً');
  });

  it('predicts next word based on token prefix', () => {
    const suggestions = getWordSuggestions('شكر');
    expect(suggestions.some((w) => w.includes('شكراً'))).toBe(true);
  });

  it('learns new words typed by the user', () => {
    const customWord = 'الاستدامة';
    learnWord(customWord);
    const learned = getLearnedWords();
    expect(learned).toContain(customWord);
  });
});
