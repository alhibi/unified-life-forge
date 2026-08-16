/**
 * Real & Unlimited Clipboard History Manager for the Soft Keyboard.
 * Supports system clipboard sync, pinned items, retention policies, manual items, and search.
 */

import { readKeyboardSettings, type ClipboardRetention } from './preference';

export interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
  pinned?: boolean;
}

const STORAGE_KEY = 'smarthub:soft-keyboard-clipboard';

let memoryClipboard: ClipboardItem[] = [];

function getRetentionMs(retention: ClipboardRetention): number | null {
  switch (retention) {
    case '1day':
      return 24 * 60 * 60 * 1000;
    case '7days':
      return 7 * 24 * 60 * 60 * 1000;
    case '30days':
      return 30 * 24 * 60 * 60 * 1000;
    case 'session':
      return 0; // Session only, not kept in localStorage across reloads
    case 'unlimited':
    default:
      return null; // Infinite retention
  }
}

export function getClipboardHistory(): ClipboardItem[] {
  const settings = readKeyboardSettings();
  if (!settings.clipboardEnabled) return [];

  let items: ClipboardItem[] = [];
  if (typeof localStorage !== 'undefined' && settings.clipboardRetention !== 'session') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) items = JSON.parse(raw);
    } catch {
      items = memoryClipboard;
    }
  } else {
    items = memoryClipboard;
  }

  // Filter based on retention policy unless item is pinned
  const maxAge = getRetentionMs(settings.clipboardRetention);
  if (maxAge !== null && maxAge > 0) {
    const now = Date.now();
    items = items.filter((item) => item.pinned || now - item.timestamp <= maxAge);
  }

  return items;
}

function notify(items: ClipboardItem[]) {
  memoryClipboard = items;
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('soft-keyboard-clipboard-updated', { detail: items }));
  }
}

export function saveToClipboardHistory(text: string): ClipboardItem[] {
  if (!text || text.trim() === '') return getClipboardHistory();
  const settings = readKeyboardSettings();
  if (!settings.clipboardEnabled) return [];

  const current = getClipboardHistory();
  const existingIdx = current.findIndex((item) => item.text.trim() === text.trim());
  let updated = [...current];

  if (existingIdx >= 0) {
    const item = updated[existingIdx];
    updated.splice(existingIdx, 1);
    updated.unshift({ ...item, timestamp: Date.now() });
  } else {
    updated.unshift({
      id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      text,
      timestamp: Date.now(),
      pinned: false,
    });
  }

  // If retention is not unlimited, keep pinned + unpinned without strict count limit (unlimited entries supported)
  const pinned = updated.filter((i) => i.pinned);
  const unpinned = updated.filter((i) => !i.pinned);
  const finalHistory = [...pinned, ...unpinned];

  if (typeof localStorage !== 'undefined' && settings.clipboardRetention !== 'session') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalHistory));
    } catch {
      /* fallback */
    }
  }

  notify(finalHistory);
  return finalHistory;
}

export function togglePinClipboardItem(id: string): ClipboardItem[] {
  const current = getClipboardHistory();
  const updated = current.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item));
  const settings = readKeyboardSettings();
  if (typeof localStorage !== 'undefined' && settings.clipboardRetention !== 'session') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* fallback */
    }
  }
  notify(updated);
  return updated;
}

export function deleteClipboardItem(id: string): ClipboardItem[] {
  const current = getClipboardHistory();
  const updated = current.filter((item) => item.id !== id);
  const settings = readKeyboardSettings();
  if (typeof localStorage !== 'undefined' && settings.clipboardRetention !== 'session') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* fallback */
    }
  }
  notify(updated);
  return updated;
}

export function clearUnpinnedClipboard(): ClipboardItem[] {
  const current = getClipboardHistory();
  const updated = current.filter((item) => item.pinned);
  const settings = readKeyboardSettings();
  if (typeof localStorage !== 'undefined' && settings.clipboardRetention !== 'session') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* fallback */
    }
  }
  notify(updated);
  return updated;
}

/**
 * Copies text to native system clipboard and records it into history.
 */
export async function copyToSystemClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    /* fallback if browser blocks async clipboard write */
  }
  saveToClipboardHistory(text);
  return true;
}

/**
 * Syncs current system clipboard content into keyboard history if permission granted.
 */
export async function syncSystemClipboard(): Promise<ClipboardItem[]> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        return saveToClipboardHistory(text);
      }
    }
  } catch {
    /* User denied clipboard read permission or not supported */
  }
  return getClipboardHistory();
}

/**
 * Attach automatic listener to capture browser copy/cut events.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('copy', () => {
    setTimeout(async () => {
      try {
        const text = await navigator.clipboard?.readText();
        if (text) saveToClipboardHistory(text);
      } catch {
        /* silent */
      }
    }, 100);
  });
}
