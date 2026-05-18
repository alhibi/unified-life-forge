import { useCallback, useEffect, useState } from 'react';
import { CHAT_PREFS_KEY } from './constants';
import type { ChatPrefs } from './types';
import { setChatSoundsMuted } from './sounds';

const DEFAULT_PREFS: ChatPrefs = {
  pinned: {},
  muted: {},
  archived: {},
  drafts: {},
  scroll: {},
  wallpapers: {},
  globalWallpaper: 'default',
  soundEnabled: true,
  enterToSend: true,
};

// Migrate legacy boolean-shaped muted maps into the new "expiry epoch ms"
// shape so users who upgrade don't lose their existing mute settings.
//
// Legacy value:  muted[id] === true  → muted forever (-1)
// New value:     muted[id] === ts ms (Date.now() future), or -1 for forever
function migratePrefs(raw: unknown): ChatPrefs {
  if (!raw || typeof raw !== 'object') return DEFAULT_PREFS;
  // The intersection trick TS can't narrow because Partial<ChatPrefs>['muted']
  // is already Record<string, number>; we need the legacy "unknown values"
  // shape for migration, so type it explicitly.
  const p = raw as Omit<Partial<ChatPrefs>, 'muted'> & { muted?: Record<string, unknown> };
  const mutedIn = p.muted ?? {};
  const muted: Record<string, number> = {};
  for (const [id, v] of Object.entries(mutedIn)) {
    if (v === true) muted[id] = -1;
    else if (typeof v === 'number') muted[id] = v;
    // false / 0 / undefined → not muted (skip)
  }
  return {
    ...DEFAULT_PREFS,
    ...p,
    muted,
    scroll: p.scroll ?? {},
  };
}

/**
 * Per-user, client-side chat preferences stored in localStorage.
 * Handles: pin / mute (with expiry) / archive, drafts, scroll memory,
 * wallpapers, sound toggle, enter-to-send. All mutations are synchronous
 * (no network) and reflected to Web Audio mute flag.
 */
export function useChatPrefs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<ChatPrefs>(DEFAULT_PREFS);

  // Hydrate from localStorage on user change
  useEffect(() => {
    if (!userId) { setPrefs(DEFAULT_PREFS); return; }
    try {
      const raw = localStorage.getItem(CHAT_PREFS_KEY(userId));
      if (raw) {
        const merged = migratePrefs(JSON.parse(raw));
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

  /** Mute for a specific duration in seconds. -1 = forever. 0 = unmute. */
  const muteFor = useCallback((convId: string, durationSeconds: number) => {
    update(p => {
      const muted = { ...p.muted };
      if (durationSeconds === 0) {
        delete muted[convId];
      } else if (durationSeconds < 0) {
        muted[convId] = -1;
      } else {
        muted[convId] = Date.now() + durationSeconds * 1000;
      }
      return { ...p, muted };
    });
  }, [update]);

  /** Toggle convenience: if currently muted, unmute; otherwise mute forever. */
  const toggleMuted = useCallback((convId: string) => {
    setPrefs(prev => {
      const cur = prev.muted[convId];
      const isCurrentlyMuted = cur === -1 || (typeof cur === 'number' && cur > Date.now());
      const muted = { ...prev.muted };
      if (isCurrentlyMuted) delete muted[convId];
      else muted[convId] = -1;
      const next = { ...prev, muted };
      if (userId) {
        try { localStorage.setItem(CHAT_PREFS_KEY(userId), JSON.stringify(next)); } catch { /* quota */ }
      }
      setChatSoundsMuted(!next.soundEnabled);
      return next;
    });
  }, [userId]);

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

  // ── Scroll memory ─────────────────────────────────────────────────────────
  const getScroll = useCallback((convId: string): number => prefs.scroll[convId] || 0, [prefs.scroll]);

  /**
   * Persist the user's last scroll position so reopening the conversation
   * resumes where they were instead of jumping to the bottom. Skipped when
   * the user is at the bottom (we want fresh messages anchored there).
   */
  const setScroll = useCallback((convId: string, pos: number) => {
    update(p => {
      if ((p.scroll[convId] ?? 0) === pos) return p;
      const scroll = { ...p.scroll, [convId]: pos };
      return { ...p, scroll };
    });
  }, [update]);

  const clearScroll = useCallback((convId: string) => {
    update(p => {
      if (!(convId in p.scroll)) return p;
      const scroll = { ...p.scroll };
      delete scroll[convId];
      return { ...p, scroll };
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

  const isMuted = useCallback((id: string) => {
    const v = prefs.muted[id];
    if (v === -1) return true;
    if (typeof v === 'number' && v > Date.now()) return true;
    return false;
  }, [prefs.muted]);

  /** Returns the mute expiry epoch (ms) or null if unmuted / forever. */
  const muteExpiresAt = useCallback((id: string): number | null => {
    const v = prefs.muted[id];
    if (typeof v === 'number' && v > 0) return v;
    return null;
  }, [prefs.muted]);

  return {
    prefs,
    setPrefs: persist,
    // Toggles
    togglePinned, toggleMuted, muteFor, toggleArchived,
    isPinned:   (id: string) => !!prefs.pinned[id],
    isMuted,
    muteExpiresAt,
    isArchived: (id: string) => !!prefs.archived[id],
    // Drafts
    getDraft, setDraft, clearDraft,
    // Scroll memory
    getScroll, setScroll, clearScroll,
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
