import { describe, expect,it } from 'vitest';

import { CHAT_SETTINGS_DEFAULTS,mergeChatSettings } from './settings';

describe('mergeChatSettings', () => {
  it('returns defaults for null / non-object inputs', () => {
    expect(mergeChatSettings(null)).toEqual(CHAT_SETTINGS_DEFAULTS);
    expect(mergeChatSettings(undefined)).toEqual(CHAT_SETTINGS_DEFAULTS);
    expect(mergeChatSettings('garbage')).toEqual(CHAT_SETTINGS_DEFAULTS);
    expect(mergeChatSettings(42)).toEqual(CHAT_SETTINGS_DEFAULTS);
  });

  it('preserves valid partial updates and falls back to defaults elsewhere', () => {
    const merged = mergeChatSettings({
      privacy: { readReceipts: false },
      notifications: { enabled: false },
    });
    expect(merged.privacy.readReceipts).toBe(false);
    expect(merged.privacy.lastSeenVisibility)
      .toBe(CHAT_SETTINGS_DEFAULTS.privacy.lastSeenVisibility);
    expect(merged.notifications.enabled).toBe(false);
    expect(merged.appearance).toEqual(CHAT_SETTINGS_DEFAULTS.appearance);
    expect(merged.behavior).toEqual(CHAT_SETTINGS_DEFAULTS.behavior);
    expect(merged.storage).toEqual(CHAT_SETTINGS_DEFAULTS.storage);
  });

  it('drops fields whose type does not match the default', () => {
    const merged = mergeChatSettings({
      privacy: { readReceipts: 'yes' },               // wrong type
      appearance: { fontScale: 42 },                  // wrong type
      storage: { cacheCapMb: 'big' },                 // wrong type
    });
    expect(merged.privacy.readReceipts).toBe(CHAT_SETTINGS_DEFAULTS.privacy.readReceipts);
    expect(merged.appearance.fontScale).toBe(CHAT_SETTINGS_DEFAULTS.appearance.fontScale);
    expect(merged.storage.cacheCapMb).toBe(CHAT_SETTINGS_DEFAULTS.storage.cacheCapMb);
  });

  it('ignores unknown sections', () => {
    const merged = mergeChatSettings({
      privacy: { readReceipts: false },
      whatever: { foo: 'bar' },          // unknown
      __proto__: { polluted: true },     // prototype-pollution attempt
    });
    expect(merged).not.toHaveProperty('whatever');
    expect((merged as unknown as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('survives an empty object', () => {
    expect(mergeChatSettings({})).toEqual(CHAT_SETTINGS_DEFAULTS);
  });

  it('handles nullable values (quietHoursStart/End) correctly', () => {
    const merged = mergeChatSettings({
      notifications: { quietHoursStart: 22, quietHoursEnd: 7 },
    });
    expect(merged.notifications.quietHoursStart).toBe(22);
    expect(merged.notifications.quietHoursEnd).toBe(7);
  });
});
