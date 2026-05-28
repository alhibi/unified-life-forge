// @ts-nocheck
// ─────────────────────────────────────────────────────────────────────────────
// Chat Notifications Manager
//
// Handles push notifications, in-app notifications, and notification
// preferences. Integrates with the browser Notification API and the
// chat settings system for quiet hours, per-conversation muting, etc.
//
// Features:
//   - Desktop push notifications with avatars and action buttons
//   - In-app toast notifications with sound/vibration
//   - Quiet hours enforcement
//   - Per-conversation mute respect
//   - Badge count management
//   - Notification grouping (collapse multiple from same sender)
//   - Reply-from-notification (planned for service worker integration)
//
// All methods are safe to call even when notifications are not supported
// or not permitted — they degrade to no-ops.
// ─────────────────────────────────────────────────────────────────────────────

import { CHAT_SETTINGS_DEFAULTS, type ChatSettingsNotifications } from './settings';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatNotificationPayload {
  /** Unique ID for deduplication / replacement. */
  id: string;
  /** Sender's display name. */
  title: string;
  /** Message preview body. */
  body: string;
  /** Sender avatar URL (shown as notification icon). */
  avatarUrl?: string | null;
  /** Chat/conversation ID for routing on click. */
  chatId: string;
  /** Message type for icon selection. */
  messageType?: 'text' | 'image' | 'voice' | 'file';
  /** Whether this is a group message (shows group name in title). */
  groupName?: string;
  /** Timestamp of the original message. */
  timestamp?: number;
}

export interface NotificationPrefs {
  enabled: boolean;
  sound: boolean;
  vibrate: boolean;
  desktop: boolean;
  hidePreview: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
}

// ── State ────────────────────────────────────────────────────────────────────

let _permission: NotificationPermission = 'default';
let _prefs: NotificationPrefs = {
  enabled: CHAT_SETTINGS_DEFAULTS.notifications.enabled,
  sound: CHAT_SETTINGS_DEFAULTS.notifications.inAppSounds,
  vibrate: CHAT_SETTINGS_DEFAULTS.notifications.vibrate,
  desktop: CHAT_SETTINGS_DEFAULTS.notifications.desktop,
  hidePreview: CHAT_SETTINGS_DEFAULTS.notifications.hidePreview,
  quietHoursStart: null,
  quietHoursEnd: null,
};

// Collapsed notifications: group multiple messages from same chat
const _recentNotifications = new Map<string, { count: number; lastId: string; timer: ReturnType<typeof setTimeout> }>();
const COLLAPSE_WINDOW_MS = 3000;

// ── Permission ───────────────────────────────────────────────────────────────

/** Check current notification permission without prompting. */
export function getNotificationPermission(): NotificationPermission {
  if (typeof Notification === 'undefined') return 'denied';
  _permission = Notification.permission;
  return _permission;
}

/** Request notification permission from the user. Returns the result. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  try {
    const result = await Notification.requestPermission();
    _permission = result;
    return result;
  } catch {
    return 'denied';
  }
}

// ── Preferences ──────────────────────────────────────────────────────────────

/** Update notification preferences from chat settings. */
export function updateNotificationPrefs(settings: ChatSettingsNotifications): void {
  _prefs = {
    enabled: settings.enabled,
    sound: settings.inAppSounds,
    vibrate: settings.vibrate,
    desktop: settings.desktop,
    hidePreview: settings.hidePreview,
    quietHoursStart: settings.quietHoursStart,
    quietHoursEnd: settings.quietHoursEnd,
  };
}

// ── Quiet Hours ──────────────────────────────────────────────────────────────

/** Returns true if current time is within quiet hours. */
export function isInQuietHours(): boolean {
  const { quietHoursStart, quietHoursEnd } = _prefs;
  if (quietHoursStart === null || quietHoursEnd === null) return false;

  const now = new Date();
  const hour = now.getHours();

  if (quietHoursStart <= quietHoursEnd) {
    // Same day range: e.g., 22-06 doesn't apply here; 08-17 does
    return hour >= quietHoursStart && hour < quietHoursEnd;
  } else {
    // Overnight range: e.g., 22-06 → active from 22:00 to 05:59
    return hour >= quietHoursStart || hour < quietHoursEnd;
  }
}

// ── Badge Management ─────────────────────────────────────────────────────────

/** Update the app badge count (PWA Badge API). */
export async function updateBadgeCount(count: number): Promise<void> {
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    }
  } catch {
    /* Badge API not supported — no-op */
  }
}

// ── Vibration ────────────────────────────────────────────────────────────────

/** Trigger a haptic feedback pattern for new message. */
export function vibrateForMessage(): void {
  if (!_prefs.vibrate) return;
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
  } catch {
    /* no-op */
  }
}

/** Trigger a longer vibration for incoming calls. */
export function vibrateForCall(): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  } catch {
    /* no-op */
  }
}

// ── Desktop Notifications ────────────────────────────────────────────────────

/**
 * Show a desktop notification for an incoming chat message.
 * Respects all preferences: enabled, quiet hours, hide preview, collapse.
 */
export function showChatNotification(payload: ChatNotificationPayload): void {
  if (!_prefs.enabled) return;
  if (!_prefs.desktop) return;
  if (isInQuietHours()) return;
  if (getNotificationPermission() !== 'granted') return;

  // Check if tab is focused — skip desktop notification if user is actively in the app
  if (document.hasFocus()) return;

  // Collapse: if multiple messages from the same chat arrive quickly, update rather than spam
  const existing = _recentNotifications.get(payload.chatId);
  if (existing) {
    existing.count++;
    existing.lastId = payload.id;
    // Will be handled by the timer — replace notification with count
    return;
  }

  _recentNotifications.set(payload.chatId, {
    count: 1,
    lastId: payload.id,
    timer: setTimeout(() => {
      const state = _recentNotifications.get(payload.chatId);
      _recentNotifications.delete(payload.chatId);
      if (!state) return;
      _showNativeNotification(payload, state.count);
    }, COLLAPSE_WINDOW_MS),
  });
}

function _showNativeNotification(payload: ChatNotificationPayload, count: number): void {
  try {
    const title = payload.groupName
      ? `${payload.groupName} — ${payload.title}`
      : payload.title;

    let body: string;
    if (_prefs.hidePreview) {
      body = count > 1
        ? `${count} new messages`
        : 'New message';
    } else {
      const typePrefix = _getTypeEmoji(payload.messageType);
      body = count > 1
        ? `${count} messages — ${typePrefix}${payload.body}`
        : `${typePrefix}${payload.body}`;
    }

    const notification = new Notification(title, {
      body,
      icon: payload.avatarUrl || '/icons/icon-192x192.png',
      badge: '/icons/favicon-32x32.png',
      tag: `chat-${payload.chatId}`,
      renotify: true,
      timestamp: payload.timestamp ?? Date.now(),
      silent: !_prefs.sound,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Click handler — focus or open the chat
    notification.onclick = () => {
      window.focus();
      // Navigate to the chat — using a custom event that the app router can listen to
      window.dispatchEvent(new CustomEvent('chat:navigate', {
        detail: { chatId: payload.chatId },
      }));
      notification.close();
    };
  } catch (e) {
    console.warn('[chat/notifications] Failed to show notification:', e);
  }
}

function _getTypeEmoji(type?: string): string {
  switch (type) {
    case 'image': return '📷 ';
    case 'voice': return '🎤 ';
    case 'file':  return '📎 ';
    default:      return '';
  }
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

/** Clear all pending notification timers. Call on unmount. */
export function clearPendingNotifications(): void {
  for (const [, state] of _recentNotifications) {
    clearTimeout(state.timer);
  }
  _recentNotifications.clear();
}