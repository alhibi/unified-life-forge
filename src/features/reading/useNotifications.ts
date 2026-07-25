import { useCallback, useEffect, useState } from 'react';

import {
  getNotificationPrefs,
  type NotificationPrefs,
  notificationsActive,
  storeNotificationPrefs,
} from './storage';

/**
 * useNotifications — small reusable hook around the Web Notification
 * API + our locally-stored prefs (quiet hours, mute snooze, digest
 * frequency, sound on/off).
 *
 * Returns:
 *  - prefs: the current NotificationPrefs object.
 *  - setPrefs: persisting setter (writes to localStorage immediately).
 *  - permission: 'default' | 'granted' | 'denied' | 'unsupported'.
 *  - request: requests the browser permission. Resolves to the new
 *    permission string. Also flips prefs.enabled → true on grant so
 *    the call site doesn't have to.
 *  - notify: fires a browser notification iff (a) permission is
 *    granted, (b) prefs.enabled, (c) we're not muted, (d) we're not
 *    inside the quiet-hours window. Returns the reason when blocked
 *    so the caller can fall back to an in-app toast.
 *  - mute: snooze for N minutes; null clears the snooze.
 */

type Permission = 'default' | 'granted' | 'denied' | 'unsupported';

function readPermission(): Permission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as Permission;
}

export interface NotifyOptions {
  title: string;
  body?: string;
  /** Used as the Notification's tag so duplicate alerts collapse. */
  tag?: string;
  /** Click target — defaults to the current page URL. */
  url?: string;
  /** Bypass quiet-hours / mute checks. Used by the "test" button. */
  force?: boolean;
}

export interface NotifyResult {
  ok: boolean;
  reason?: 'unsupported' | 'denied' | 'disabled' | 'muted' | 'quiet-hours';
}

export function useNotifications() {
  const [prefs, setPrefsState] = useState<NotificationPrefs>(getNotificationPrefs);
  const [permission, setPermission] = useState<Permission>(readPermission);

  // Re-read permission whenever the page becomes visible (the user
  // may have flipped it in browser settings while we were hidden).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVis = () => setPermission(readPermission());
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const setPrefs = useCallback((next: NotificationPrefs) => {
    setPrefsState(next);
    storeNotificationPrefs(next);
  }, []);

  const request = useCallback(async (): Promise<Permission> => {
    if (typeof Notification === 'undefined') {
      setPermission('unsupported');
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      // Already granted — also flip the in-app toggle on so the
      // user gets immediate feedback.
      const next: NotificationPrefs = { ...prefs, enabled: true };
      setPrefs(next);
      setPermission('granted');
      return 'granted';
    }
    if (Notification.permission === 'denied') {
      setPermission('denied');
      return 'denied';
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result as Permission);
      if (result === 'granted') {
        setPrefs({ ...prefs, enabled: true });
      }
      return result as Permission;
    } catch {
      return readPermission();
    }
  }, [prefs, setPrefs]);

  const notify = useCallback(
    (opts: NotifyOptions): NotifyResult => {
      if (typeof Notification === 'undefined') {
        return { ok: false, reason: 'unsupported' };
      }
      if (Notification.permission !== 'granted') {
        return { ok: false, reason: 'denied' };
      }
      if (!opts.force) {
        const active = notificationsActive(prefs);
        if (!active.ok) return { ok: false, reason: active.reason };
      }
      try {
        const n = new Notification(opts.title, {
          body: opts.body,
          tag: opts.tag,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/favicon-32x32.png',
          silent: !prefs.sound,
        });
        if (opts.url) {
          n.onclick = () => {
            try {
              window.focus();
              if (opts.url) window.location.href = opts.url;
            } catch { /* ignore */ }
            n.close();
          };
        }
        return { ok: true };
      } catch {
        return { ok: false, reason: 'denied' };
      }
    },
    [prefs],
  );

  const mute = useCallback(
    (minutes: number | null) => {
      if (minutes === null) {
        setPrefs({ ...prefs, mutedUntil: null });
        return;
      }
      const until = new Date(Date.now() + minutes * 60_000).toISOString();
      setPrefs({ ...prefs, mutedUntil: until });
    },
    [prefs, setPrefs],
  );

  return { prefs, setPrefs, permission, request, notify, mute };
}
