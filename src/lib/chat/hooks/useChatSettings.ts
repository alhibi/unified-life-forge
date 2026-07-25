// useChatSettings — synced chat settings from user_settings.settings.chat.
// Loads once per user, persists with debounce, and exposes patch helpers
// for each settings sub-tree.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';

import {
  CHAT_SETTINGS_DEFAULTS,   type ChatSettings,
  type ChatSettingsAppearance, type ChatSettingsBehavior,
  type ChatSettingsNotifications, type ChatSettingsPrivacy,
  type ChatSettingsStorage,
loadChatSettings, saveChatSettings,
} from '../settings';

const SAVE_DEBOUNCE_MS = 500;

export interface UseChatSettingsResult {
  settings: ChatSettings;
  isLoaded: boolean;
  patchPrivacy:       (p: Partial<ChatSettingsPrivacy>) => void;
  patchNotifications: (p: Partial<ChatSettingsNotifications>) => void;
  patchAppearance:    (p: Partial<ChatSettingsAppearance>) => void;
  patchBehavior:      (p: Partial<ChatSettingsBehavior>) => void;
  patchStorage:       (p: Partial<ChatSettingsStorage>) => void;
  resetToDefaults:    () => void;
  /** Force-flush any pending save immediately (e.g. on tab hide). */
  flush:              () => Promise<void>;
}

export function useChatSettings(): UseChatSettingsResult {
  const { user } = useAuth();
  const userId = user?.id;
  const [settings, setSettings] = useState<ChatSettings>(CHAT_SETTINGS_DEFAULTS);
  const [isLoaded, setIsLoaded] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<ChatSettings | null>(null);

  // Load on auth change.
  useEffect(() => {
    if (!userId) { setSettings(CHAT_SETTINGS_DEFAULTS); setIsLoaded(false); return; }
    let cancelled = false;
    void loadChatSettings(userId).then(loaded => {
      if (!cancelled) {
        setSettings(loaded);
        setIsLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [userId]);

  const flush = useCallback(async () => {
    const pending = pendingRef.current;
    if (!userId || !pending) return;
    pendingRef.current = null;
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    await saveChatSettings(userId, pending);
  }, [userId]);

  const scheduleSave = useCallback((next: ChatSettings) => {
    pendingRef.current = next;
    if (!userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const p = pendingRef.current;
      if (!p) return;
      pendingRef.current = null;
      void saveChatSettings(userId, p);
    }, SAVE_DEBOUNCE_MS);
  }, [userId]);

  const updateRoot = useCallback((updater: (prev: ChatSettings) => ChatSettings) => {
    setSettings(prev => {
      const next = updater(prev);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // Tab-hide flush
  useEffect(() => {
    const onHide = () => { void flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [flush]);

  const patchPrivacy = useCallback((p: Partial<ChatSettingsPrivacy>) => {
    updateRoot(s => ({ ...s, privacy: { ...s.privacy, ...p } }));
  }, [updateRoot]);
  const patchNotifications = useCallback((p: Partial<ChatSettingsNotifications>) => {
    updateRoot(s => ({ ...s, notifications: { ...s.notifications, ...p } }));
  }, [updateRoot]);
  const patchAppearance = useCallback((p: Partial<ChatSettingsAppearance>) => {
    updateRoot(s => ({ ...s, appearance: { ...s.appearance, ...p } }));
  }, [updateRoot]);
  const patchBehavior = useCallback((p: Partial<ChatSettingsBehavior>) => {
    updateRoot(s => ({ ...s, behavior: { ...s.behavior, ...p } }));
  }, [updateRoot]);
  const patchStorage = useCallback((p: Partial<ChatSettingsStorage>) => {
    updateRoot(s => ({ ...s, storage: { ...s.storage, ...p } }));
  }, [updateRoot]);

  const resetToDefaults = useCallback(() => {
    setSettings(CHAT_SETTINGS_DEFAULTS);
    if (userId) {
      pendingRef.current = CHAT_SETTINGS_DEFAULTS;
      void saveChatSettings(userId, CHAT_SETTINGS_DEFAULTS);
    }
  }, [userId]);

  return useMemo(() => ({
    settings, isLoaded,
    patchPrivacy, patchNotifications, patchAppearance, patchBehavior, patchStorage,
    resetToDefaults, flush,
  }), [settings, isLoaded, patchPrivacy, patchNotifications, patchAppearance, patchBehavior, patchStorage, resetToDefaults, flush]);
}
