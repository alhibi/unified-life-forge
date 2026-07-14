import { useEffect } from 'react';

export type HotkeyHandler = (e: KeyboardEvent) => void;
export interface HotkeyBinding {
  combo: string;               // e.g. "mod+k", "mod+shift+j"
  handler: HotkeyHandler;
  allowInInputs?: boolean;
}

const isMac = typeof navigator !== 'undefined'
  && /mac/i.test(navigator.platform || navigator.userAgent);

function matches(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts.at(-1) ?? '';
  const mod = isMac ? e.metaKey : e.ctrlKey;
  const needsMod = parts.includes('mod') || parts.includes('cmd') || parts.includes('ctrl');
  const needsShift = parts.includes('shift');
  const needsAlt = parts.includes('alt') || parts.includes('option');
  if (needsMod !== mod) return false;
  if (needsShift !== e.shiftKey) return false;
  if (needsAlt !== e.altKey) return false;
  return e.key.toLowerCase() === key;
}

export function useHotkeys(bindings: HotkeyBinding[]) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = !!target && (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      );
      for (const b of bindings) {
        if (inField && !b.allowInInputs) continue;
        if (matches(e, b.combo)) {
          e.preventDefault();
          b.handler(e);
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bindings]);
}