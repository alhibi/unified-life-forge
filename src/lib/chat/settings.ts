// ─────────────────────────────────────────────────────────────────────────────
// Chat-specific user settings that sync via `user_settings.settings.chat`.
//
// The legacy localStorage-only model in `useChatPrefs` covers transient UI
// preferences (drafts, scroll positions, per-conversation wallpapers).
// Anything we want to follow the user across devices belongs HERE: privacy
// toggles, notification preferences, accessibility knobs, theme overrides.
//
// API surface
//   • CHAT_SETTINGS_DEFAULTS — single source of truth for every default
//   • mergeChatSettings()    — safe rehydrate from possibly-stale JSON
//   • loadChatSettings()     — fetch + merge in one call
//   • saveChatSettings()     — debounced upsert into user_settings.settings.chat
//
// `useChatSettings` (in hooks/useChatSettings.ts) wraps these for React.
// ─────────────────────────────────────────────────────────────────────────────

import type { Json } from '@/integrations/supabase/types';

import { isSupabaseConfigured,supabase } from '@/integrations/supabase/client';

// ── Shape ────────────────────────────────────────────────────────────────────

export interface ChatSettingsPrivacy {
  /** 'everyone' | 'contacts' | 'nobody' */
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  /** Who can read your bio (full text). 'everyone' | 'contacts' | 'nobody' */
  bioVisibility: 'everyone' | 'contacts' | 'nobody';
  /** Who can read receipts? Disabling stops sending read receipts AND
   * prevents you from seeing other people's. WhatsApp parity. */
  readReceipts: boolean;
  /** Auto-block messages from non-contacts. */
  blockUnknownUsers: boolean;
  /** Show typing indicator to others. */
  showTyping: boolean;
}

export interface ChatSettingsNotifications {
  /** Master switch. */
  enabled: boolean;
  /** Sounds play in-app even when notifications are disabled (the synthesizer). */
  inAppSounds: boolean;
  /** Vibrate via navigator.vibrate. */
  vibrate: boolean;
  /** Show a desktop notification while the tab is unfocused. */
  desktop: boolean;
  /** Hide message body text in notifications (for shoulder surfing). */
  hidePreview: boolean;
  /** Don't notify between these hours (24h, local time). null = disabled. */
  quietHoursStart: number | null;   // 0..23
  quietHoursEnd:   number | null;   // 0..23
}

export interface ChatSettingsAppearance {
  /** Per-app font scale for chat surfaces only (independent of FontSettings). */
  fontScale: 'small' | 'normal' | 'large' | 'xlarge';
  /** 'compact' | 'comfortable' | 'cozy' */
  density: 'compact' | 'comfortable' | 'cozy';
  /** Override conversation wallpaper at the global level. */
  defaultWallpaperId: string;
  /** Show avatars next to every message in groups. */
  showAvatars: boolean;
  /** Group consecutive messages from the same sender (Telegram-style). */
  groupBubbles: boolean;
  /** Show send time on every bubble (vs. only on hover). */
  alwaysShowTime: boolean;
}

export interface ChatSettingsBehavior {
  /** Send on Enter (Shift+Enter for newline). */
  enterToSend: boolean;
  /** Suggest emoji from text shortcodes (`:smile:` → 😄). */
  emojiAutoComplete: boolean;
  /** Auto-download incoming media. */
  autoDownloadImages: boolean;
  autoDownloadVoice: boolean;
  autoDownloadFiles: boolean;
  /** Use 24-hour clock in timestamps (overrides locale default). null = follow locale. */
  use24h: boolean | null;
}

export interface ChatSettingsStorage {
  /** Hard cap on local IDB cache size (MB). 0 = disable cap. */
  cacheCapMb: number;
  /** Auto-evict messages older than this many days from local cache. 0 = never. */
  cacheRetentionDays: number;
  /** Compress images above this size (MB) before sending. 0 = disable. */
  compressThresholdMb: number;
  /** Compression target quality (0..1). */
  compressionQuality: number;
}

export interface ChatSettings {
  privacy:       ChatSettingsPrivacy;
  notifications: ChatSettingsNotifications;
  appearance:    ChatSettingsAppearance;
  behavior:      ChatSettingsBehavior;
  storage:       ChatSettingsStorage;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

export const CHAT_SETTINGS_DEFAULTS: ChatSettings = {
  privacy: {
    lastSeenVisibility: 'everyone',
    bioVisibility:      'everyone',
    readReceipts:       true,
    blockUnknownUsers:  false,
    showTyping:         true,
  },
  notifications: {
    enabled:         true,
    inAppSounds:     true,
    vibrate:         true,
    desktop:         true,
    hidePreview:     false,
    quietHoursStart: null,
    quietHoursEnd:   null,
  },
  appearance: {
    fontScale:          'normal',
    density:            'comfortable',
    defaultWallpaperId: 'default',
    showAvatars:        true,
    groupBubbles:       true,
    alwaysShowTime:     true,
  },
  behavior: {
    enterToSend:        true,
    emojiAutoComplete:  true,
    autoDownloadImages: true,
    autoDownloadVoice:  true,
    autoDownloadFiles:  false,
    use24h:             null,
  },
  storage: {
    cacheCapMb:          200,
    cacheRetentionDays:  30,
    compressThresholdMb: 1.5,
    compressionQuality:  0.82,
  },
};

// ── Merge ────────────────────────────────────────────────────────────────────

/** Safely merge a possibly-partial / stale settings blob with defaults. */
export function mergeChatSettings(raw: unknown): ChatSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, Record<string, unknown>>;
  const merge = <T extends Record<string, unknown>>(defaults: T, partial: Record<string, unknown> | undefined): T => {
    if (!partial || typeof partial !== 'object') return { ...defaults };
    const out: Record<string, unknown> = { ...defaults };
    for (const k of Object.keys(defaults)) {
      const v = partial[k];
      if (v === undefined) continue;
      const def = defaults[k];
      // Accept when types match, OR when the default is null and the
      // incoming value is a primitive (fields like quietHoursStart that
      // are `number | null` need this — typeof null === 'object', so
      // strict type-equality misses the legitimate "set a number"
      // transition).
      if (def === null && (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean')) {
        out[k] = v;
        continue;
      }
      if (v === null && def === null) {
        out[k] = null;
        continue;
      }
      if (typeof v === typeof def && v !== null) {
        out[k] = v;
      }
    }
    return out as T;
  };
  return {
    privacy:       merge(CHAT_SETTINGS_DEFAULTS.privacy as unknown as Record<string, unknown>,       r.privacy)       as unknown as ChatSettingsPrivacy,
    notifications: merge(CHAT_SETTINGS_DEFAULTS.notifications as unknown as Record<string, unknown>, r.notifications) as unknown as ChatSettingsNotifications,
    appearance:    merge(CHAT_SETTINGS_DEFAULTS.appearance as unknown as Record<string, unknown>,    r.appearance)    as unknown as ChatSettingsAppearance,
    behavior:      merge(CHAT_SETTINGS_DEFAULTS.behavior as unknown as Record<string, unknown>,      r.behavior)      as unknown as ChatSettingsBehavior,
    storage:       merge(CHAT_SETTINGS_DEFAULTS.storage as unknown as Record<string, unknown>,       r.storage)       as unknown as ChatSettingsStorage,
  };
}

// ── Network ──────────────────────────────────────────────────────────────────

/** Fetch the caller's chat settings, merged with defaults. Never throws. */
export async function loadChatSettings(userId: string): Promise<ChatSettings> {
  if (!isSupabaseConfigured) return { ...CHAT_SETTINGS_DEFAULTS };
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data?.settings) return { ...CHAT_SETTINGS_DEFAULTS };
    const root = data.settings as Record<string, unknown>;
    return mergeChatSettings(root.chat);
  } catch {
    return { ...CHAT_SETTINGS_DEFAULTS };
  }
}

/**
 * Persist chat settings into `user_settings.settings.chat`. We do a
 * non-destructive merge with the existing root so we don't clobber the
 * theme/language/font/etc. settings that AppContext stores in the same
 * row.
 */
export async function saveChatSettings(userId: string, settings: ChatSettings): Promise<void> {
  if (!isSupabaseConfigured) return;
  // Read-modify-write — coalesce into a single upsert.
  const { data: row } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .maybeSingle();
  const root = (row?.settings && typeof row.settings === 'object'
    ? row.settings
    : {}) as Record<string, unknown>;
  root.chat = settings as unknown as Record<string, unknown>;
  await supabase
    .from('user_settings')
    .upsert({ user_id: userId, settings: root as unknown as Json }, { onConflict: 'user_id' });
}

// ── Imperative storage cap utility ───────────────────────────────────────────

/**
 * Snapshot used by the Settings page Storage section.
 * Returns approximate counts so the page can render a meaningful "Used: 12 MB
 * of 200 MB" gauge.
 */
export async function getStorageReport(): Promise<{
  usageMb: number;
  quotaMb: number;
  capMb: number;
  capUsageRatio: number;
}> {
  const { estimateUsage } = await import('./idbCache');
  const settings = CHAT_SETTINGS_DEFAULTS.storage; // capacity is informational; the live cap is wired by the hook.
  const e = await estimateUsage();
  const usageMb = Math.round((e.usage / (1024 * 1024)) * 10) / 10;
  const quotaMb = Math.round((e.quota / (1024 * 1024)) * 10) / 10;
  const cap = settings.cacheCapMb;
  return {
    usageMb,
    quotaMb,
    capMb: cap,
    capUsageRatio: cap > 0 ? Math.min(1, usageMb / cap) : 0,
  };
}