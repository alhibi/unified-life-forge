/**
 * Clipboard history manager for the Soft Keyboard.
 * Saves recent copies for instant paste from the keyboard toolbar.
 */

export interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
  pinned?: boolean;
}

const STORAGE_KEY = 'smarthub:soft-keyboard-clipboard';

let memoryClipboard: ClipboardItem[] = [];

export function getClipboardHistory(): ClipboardItem[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* fallback */
    }
  }
  return memoryClipboard;
}

function notify(items: ClipboardItem[]) {
  memoryClipboard = items;
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('soft-keyboard-clipboard-updated', { detail: items }));
  }
}

export function saveToClipboardHistory(text: string): ClipboardItem[] {
  if (!text || text.trim() === '') return getClipboardHistory();
  const current = getClipboardHistory();
  const existingIdx = current.findIndex((item) => item.text === text);
  let updated = [...current];

  if (existingIdx >= 0) {
    const item = updated[existingIdx];
    updated.splice(existingIdx, 1);
    updated.unshift({ ...item, timestamp: Date.now() });
  } else {
    updated.unshift({
      id: Math.random().toString(36).substring(2, 9),
      text,
      timestamp: Date.now(),
      pinned: false,
    });
  }

  const pinned = updated.filter((i) => i.pinned);
  const unpinned = updated.filter((i) => !i.pinned).slice(0, 30);
  const finalHistory = [...pinned, ...unpinned];

  if (typeof localStorage !== 'undefined') {
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
  if (typeof localStorage !== 'undefined') {
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
  if (typeof localStorage !== 'undefined') {
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
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* fallback */
    }
  }
  notify(updated);
  return updated;
}
