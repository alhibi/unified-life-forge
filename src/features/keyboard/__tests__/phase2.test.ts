import { describe, expect, it } from 'vitest';

import { getAdaptiveEnterLabel, shouldAutoCapitalizeSentence } from '../lib/edit';
import { getAutoCorrection } from '../lib/prediction';

describe('Soft Keyboard Phase 2 Feature Tests', () => {
  it('correctly identifies auto-corrections for common Arabic and English typos', () => {
    expect(getAutoCorrection('شكرا')).toBe('شكراً');
    expect(getAutoCorrection('اهلاً')).toBe('أهلاً');
    expect(getAutoCorrection('teh')).toBe('the');
    expect(getAutoCorrection('dont')).toBe("don't");
    expect(getAutoCorrection('normalWord')).toBeNull();
  });

  it('determines adaptive enter button label based on field hints and types', () => {
    const fakeSearch = {
      type: 'search',
      getAttribute: () => null,
    } as unknown as HTMLInputElement;
    expect(getAdaptiveEnterLabel(fakeSearch)).toBe('بحث');

    const fakeSend = {
      type: 'text',
      getAttribute: (attr: string) => (attr === 'enterkeyhint' ? 'send' : null),
    } as unknown as HTMLInputElement;
    expect(getAdaptiveEnterLabel(fakeSend)).toBe('إرسال');

    const fakeNext = {
      type: 'text',
      getAttribute: (attr: string) => (attr === 'enterkeyhint' ? 'next' : null),
    } as unknown as HTMLInputElement;
    expect(getAdaptiveEnterLabel(fakeNext)).toBe('التالي');
  });

  it('evaluates whether English sentence should auto-capitalize based on preceding punctuation', () => {
    const fakeInputEmpty = {
      value: '',
      selectionStart: 0,
      selectionEnd: 0,
    } as unknown as HTMLInputElement;
    expect(shouldAutoCapitalizeSentence(fakeInputEmpty)).toBe(true);

    const fakeInputPeriod = {
      value: 'Hello world. ',
      selectionStart: 13,
      selectionEnd: 13,
    } as unknown as HTMLInputElement;
    expect(shouldAutoCapitalizeSentence(fakeInputPeriod)).toBe(true);

    const fakeInputQuestion = {
      value: 'Hello world? ',
      selectionStart: 13,
      selectionEnd: 13,
    } as unknown as HTMLInputElement;
    expect(shouldAutoCapitalizeSentence(fakeInputQuestion)).toBe(true);

    const fakeInputNoPunctuation = {
      value: 'Hello world ',
      selectionStart: 12,
      selectionEnd: 12,
    } as unknown as HTMLInputElement;
    expect(shouldAutoCapitalizeSentence(fakeInputNoPunctuation)).toBe(false);
  });
});
