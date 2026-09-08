import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFileDropZone } from './useFileDropZone';

describe('useFileDropZone', () => {
  it('prevents a dropped file from navigating the app even without an active conversation', () => {
    const { unmount } = renderHook(() => useFileDropZone({ enabled: false, onFiles: vi.fn() }));
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: { types: ['Files'], files: [] },
    });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    unmount();
  });
});