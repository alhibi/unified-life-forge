import { beforeEach,describe, expect, it } from 'vitest';

import {
  readKeyboardSettings,
  writeKeyboardSettings,
} from '../lib/preference';

describe('Soft Keyboard Preferences Store', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('returns default settings when storage is empty', () => {
    const settings = readKeyboardSettings();
    expect(settings).toBeDefined();
    expect(settings.clipboardRetention).toBe('unlimited');
  });

  it('updates and persists settings correctly', () => {
    const next = writeKeyboardSettings({
      theme: 'emerald',
      keyHeight: 'tall',
      clipboardRetention: 'unlimited',
      digitType: 'eastern',
    });

    expect(next.theme).toBe('emerald');
    expect(next.keyHeight).toBe('tall');
    expect(next.digitType).toBe('eastern');

    const loaded = readKeyboardSettings();
    expect(loaded.theme).toBe('emerald');
    expect(loaded.keyHeight).toBe('tall');
    expect(loaded.digitType).toBe('eastern');
  });

  it('preserves other settings when doing partial updates', () => {
    writeKeyboardSettings({ showNumberRow: true });
    const updated = writeKeyboardSettings({ vibrateOnKeyPress: false });

    expect(updated.showNumberRow).toBe(true);
    expect(updated.vibrateOnKeyPress).toBe(false);
  });

  it('gracefully handles corrupted JSON in localStorage', () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('smarthub:soft-keyboard-settings-v2', 'invalid json {{{');
    }
    const settings = readKeyboardSettings();
    expect(settings.preference).toBe('app');
    expect(settings.theme).toBe('gboard-dark');
  });

  it('gracefully handles non-object JSON primitives in localStorage', () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('smarthub:soft-keyboard-settings-v2', '"string-value"');
    }
    const settings = readKeyboardSettings();
    expect(settings.preference).toBe('app');
  });
});
