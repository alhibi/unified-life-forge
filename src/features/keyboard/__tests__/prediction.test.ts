import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearLearnedDictionary,
  clearPredictionRuntimeCache,
  forgetLearnedWord,
  getAutoCorrection,
  getDictionaryStats,
  getLearnedWords,
  getNextWordSuggestions,
  getWordSuggestions,
  learnPhrase,
  learnWord,
  normalizeToken,
} from '../lib/prediction';
import { expandSnippet, resetSnippets, saveSnippet } from '../lib/snippets';

describe('keyboard prediction engine', () => {
  beforeEach(() => {
    localStorage.clear();
    clearPredictionRuntimeCache();
    clearLearnedDictionary();
  });

  it('normalises Arabic orthography so variants match one entry', () => {
    expect(normalizeToken('إحسان')).toBe(normalizeToken('احسان'));
    expect(normalizeToken('مُحَمَّد')).toBe(normalizeToken('محمد'));
    expect(normalizeToken('مكـــة')).toBe(normalizeToken('مكة'));
  });

  it('offers completions for a typed prefix', () => {
    const suggestions = getWordSuggestions('شكر');
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('learns a typed word and surfaces it again', () => {
    learnWord('برمجةسمارتهب');
    expect(getLearnedWords()).toContain('برمجةسمارتهب');
    expect(getWordSuggestions('برمجةسمارت')).toContain('برمجةسمارتهب');
  });

  it('learns word pairs and predicts the next word', () => {
    learnWord('العالمين', 'رب');
    learnWord('العالمين', 'رب');
    expect(getNextWordSuggestions('رب')).toContain('العالمين');
  });

  it('learns every word of a phrase together with its chain', () => {
    learnPhrase('تقرير الأداء الأسبوعي');
    expect(getLearnedWords()).toContain('الأسبوعي');
    expect(getNextWordSuggestions('الأداء')).toContain('الأسبوعي');
  });

  it('forgets a single word without wiping the dictionary', () => {
    learnWord('كلمةأولى');
    learnWord('كلمةثانية');
    forgetLearnedWord('كلمةأولى');
    expect(getLearnedWords()).not.toContain('كلمةأولى');
    expect(getLearnedWords()).toContain('كلمةثانية');
  });

  it('reports dictionary size', () => {
    learnWord('إحصاء', 'اختبار');
    const stats = getDictionaryStats();
    expect(stats.words).toBeGreaterThan(0);
    expect(stats.pairs).toBeGreaterThan(0);
  });

  it('keeps mild auto-correction working', () => {
    expect(getAutoCorrection('شكرا')).toBe('شكراً');
    expect(getAutoCorrection('teh')).toBe('the');
    expect(getAutoCorrection('كلمةغيرمعروفة')).toBeNull();
  });
});

describe('keyboard snippets', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSnippets();
  });

  it('expands a default Arabic shortcut', () => {
    expect(expandSnippet('سلام')).toBe('السلام عليكم ورحمة الله وبركاته');
  });

  it('stores a custom shortcut and matches Latin case-insensitively', () => {
    saveSnippet(';Mail', 'amer@example.com');
    expect(expandSnippet(';mail')).toBe('amer@example.com');
  });

  it('returns null for an unknown token', () => {
    expect(expandSnippet('لاشيء')).toBeNull();
  });
});
