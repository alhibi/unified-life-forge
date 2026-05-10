import { useCallback, useEffect, useState } from 'react';
import { CHAT_PREFS_KEY } from './constants';
import type { ChatPrefs } from './types';
import { setChatSoundsMuted } from './sounds';

const DEFAULT_PREFS: ChatPrefs = {
  pinned: {},
  muted: {},
  archived: {},
  drafts: {},
  wallpapers: {},
  globalWallpaper: 'default',
  soundEnabled: true,
  enterToSend: true,
};

/**
 * Per-user, client-side chat preferences stored in localStorage.
 * Handles: pin / mute / archive, drafts, wallpapers, sound toggle, enter-to-send.
 * All mutations are synchronous (no network) and reflected to Web Audio mute flag.
 */
export function useChatPrefs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<ChatPrefs>(DEFAULT_PREFS);

  // Hydrate from localStorage on user change
  useEffect(() => {
    if (!userId) { setPrefs(DEFAULT_PREFS); return; }
    try {
      const raw = localStorage.getItem(CHAT_PREFS_KEY(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ChatPrefs>;
        const merged: ChatPrefs = { ...DEFAULT_PREFS, ...parsed };
        setPrefs(merged);
        setChatSoundsMuted(!merged.soundEnabled);
        return;
      }
    } catch { /* corrupt entry — reset */ }
    setPrefs(DEFAULT_PREFS);
    setChatSoundsMuted(false);
  }, [userId]);

  const persist = useCallback((next: ChatPrefs) => {
    setPrefs(next);
    setChatSoundsMuted(!next.soundEnabled);
    if (!userId) return;
    try { localStorage.setItem(CHAT_PREFS_KEY(userId), JSON.stringify(next)); } catch { /* quota */ }
  }, [userId]);

  const update = useCallback((updater: (p: ChatPrefs) => ChatPrefs) => {
    setPrefs(prev => {
      const next = updater(prev);
      if (userId) {
        try { localStorage.setItem(CHAT_PREFS_KEY(userId), JSON.stringify(next)); } catch { /* quota */ }
      }
      setChatSoundsMuted(!next.soundEnabled);
      return next;
    });
  }, [userId]);

  // ── Toggles ────────────────────────────────────────────────────────────────
  const togglePinned = useCallback((convId: string) => {
    update(p => ({ ...p, pinned: { ...p.pinned, [convId]: !p.pinned[convId] } }));
  }, [update]);

  const toggleMuted = useCallback((convId: string) => {
    update(p => ({ ...p, muted: { ...p.muted, [convId]: !p.muted[convId] } }));
  }, [update]);

  const toggleArchived = useCallback((convId: string) => {
    update(p => ({ ...p, archived: { ...p.archived, [convId]: !p.archived[convId] } }));
  }, [update]);

  // ── Drafts ────────────────────────────────────────────────────────────────
  const getDraft = useCallback((convId: string): string => {
    return prefs.drafts[convId] || '';
  }, [prefs.drafts]);

  const setDraft = useCallback((convId: string, text: string) => {
    update(p => {
      const drafts = { ...p.drafts };
      if (text.trim()) drafts[convId] = text;
      else delete drafts[convId];
      return { ...p, drafts };
    });
  }, [update]);

  const clearDraft = useCallback((convId: string) => {
    update(p => {
      if (!p.drafts[convId]) return p;
      const drafts = { ...p.drafts };
      delete drafts[convId];
      return { ...p, drafts };
    });
  }, [update]);

  // ── Wallpapers ────────────────────────────────────────────────────────────
  const setWallpaper = useCallback((convId: string | null, wallpaperId: string) => {
    update(p => convId
      ? { ...p, wallpapers: { ...p.wallpapers, [convId]: wallpaperId } }
      : { ...p, globalWallpaper: wallpaperId }
    );
  }, [update]);

  const resetWallpaper = useCallback((convId: string) => {
    update(p => {
      const wallpapers = { ...p.wallpapers };
      delete wallpapers[convId];
      return { ...p, wallpapers };
    });
  }, [update]);

  // ── Settings ──────────────────────────────────────────────────────────────
  const setSoundEnabled = useCallback((enabled: boolean) => update(p => ({ ...p, soundEnabled: enabled })), [update]);
  const setEnterToSend  = useCallback((v: boolean)       => update(p => ({ ...p, enterToSend: v })), [update]);

  return {
    prefs,
    setPrefs: persist,
    // Toggles
    togglePinned, toggleMuted, toggleArchived,
    isPinned:   (id: string) => !!prefs.pinned[id],
    isMuted:    (id: string) => !!prefs.muted[id],
    isArchived: (id: string) => !!prefs.archived[id],
    // Drafts
    getDraft, setDraft, clearDraft,
    // Wallpapers
    setWallpaper, resetWallpaper,
    getWallpaper: (convId: string | null | undefined) => {
      if (convId && prefs.wallpapers[convId]) return prefs.wallpapers[convId];
      return prefs.globalWallpaper;
    },
    // Settings
    setSoundEnabled, setEnterToSend,
  };
}
