import { beforeEach, describe, expect, it } from 'vitest';

import {
  isSignatureSoundEnabled,
  playSignatureSound,
  setSignatureSoundEnabled,
  SIGNATURE_SOUND_KEY,
} from '../signatureSound';

/**
 * The contract worth protecting is restraint, not waveforms: sound must stay
 * silent unless the user asked for it, and it must never throw in an
 * environment without Web Audio (jsdom, SSR, an old WebView).
 */
describe('signature sound', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is off until the user opts in', () => {
    expect(isSignatureSoundEnabled()).toBe(false);
  });

  it('persists the opt-in under the documented key', () => {
    setSignatureSoundEnabled(true);
    expect(localStorage.getItem(SIGNATURE_SOUND_KEY)).toBe('true');
    expect(isSignatureSoundEnabled()).toBe(true);

    setSignatureSoundEnabled(false);
    expect(isSignatureSoundEnabled()).toBe(false);
  });

  it('never throws when no audio backend exists', () => {
    expect(() => playSignatureSound('complete')).not.toThrow();
    setSignatureSoundEnabled(true);
    expect(() => playSignatureSound('complete')).not.toThrow();
    expect(() => playSignatureSound('reveal')).not.toThrow();
  });
});
