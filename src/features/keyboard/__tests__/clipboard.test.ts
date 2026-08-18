import { describe, expect, it } from 'vitest';

import {
  clearUnpinnedClipboard,
  deleteClipboardItem,
  saveToClipboardHistory,
  togglePinClipboardItem,
} from '../lib/clipboard';

describe('Soft Keyboard Clipboard Manager', () => {
  it('saves copied text snippets', () => {
    const text = 'السلام عليكم ورحمة الله';
    const history = saveToClipboardHistory(text);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].text).toBe(text);
  });

  it('pins and unpins clipboard items', () => {
    const text = 'نص للتثبيت';
    const history = saveToClipboardHistory(text);
    const item = history[0];

    const pinnedHistory = togglePinClipboardItem(item.id);
    const pinnedItem = pinnedHistory.find((i) => i.id === item.id);
    expect(pinnedItem?.pinned).toBe(true);
  });

  it('deletes clipboard items', () => {
    const text = 'نص للحذف';
    const history = saveToClipboardHistory(text);
    const item = history[0];

    const updated = deleteClipboardItem(item.id);
    expect(updated.some((i) => i.id === item.id)).toBe(false);
  });

  it('clears unpinned items correctly', () => {
    saveToClipboardHistory('نص مؤقت 1');
    saveToClipboardHistory('نص مؤقت 2');
    const remaining = clearUnpinnedClipboard();
    expect(remaining.every((i) => i.pinned)).toBe(true);
  });
});
