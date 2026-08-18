/**
 * Text mutations for the soft keyboard.
 *
 * React owns the value of every controlled field, so writing `el.value = x`
 * directly is silently reverted on the next render. We go through the native
 * prototype setter and then dispatch a bubbling `input` event, which is exactly
 * what React's synthetic onChange listens for — the field's own state, Zod
 * validation and draft persistence all run untouched.
 */

export type EditableField = HTMLInputElement | HTMLTextAreaElement;

function nativeSetValue(el: EditableField, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

function commit(el: EditableField, value: string, caret: number): void {
  nativeSetValue(el, value);
  try {
    el.setSelectionRange(caret, caret);
  } catch {
    /* input types without selection support (email on some engines) */
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function selection(el: EditableField): [number, number] {
  const len = el.value.length;
  const start = el.selectionStart ?? len;
  const end = el.selectionEnd ?? len;
  return start <= end ? [start, end] : [end, start];
}

/** Respect maxlength the way the OS keyboard does. */
function fits(el: EditableField, next: string): boolean {
  const max = el.maxLength;
  return !(max > 0 && next.length > max);
}

export interface SelectionState {
  hasSelection: boolean;
  selectedText: string;
  start: number;
  end: number;
}

export function getSelectionState(el: EditableField | null): SelectionState {
  if (!el) return { hasSelection: false, selectedText: '', start: 0, end: 0 };
  const [start, end] = selection(el);
  const selectedText = el.value.slice(start, end);
  return {
    hasSelection: start !== end && selectedText.length > 0,
    selectedText,
    start,
    end,
  };
}

export function selectAll(el: EditableField): void {
  try {
    el.setSelectionRange(0, el.value.length);
  } catch {
    /* input types without selection support */
  }
  el.focus();
}

export interface UndoSnapshot {
  value: string;
  start: number;
  end: number;
}

const undoMap = new WeakMap<EditableField, UndoSnapshot>();

export function saveUndoSnapshot(el: EditableField): void {
  const [start, end] = selection(el);
  undoMap.set(el, { value: el.value, start, end });
}

export function canUndo(el: EditableField | null): boolean {
  if (!el) return false;
  return undoMap.has(el);
}

export function performUndo(el: EditableField): boolean {
  const snapshot = undoMap.get(el);
  if (!snapshot) return false;

  undoMap.delete(el);
  nativeSetValue(el, snapshot.value);
  try {
    el.setSelectionRange(snapshot.start, snapshot.end);
  } catch {
    /* ignore */
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.focus();
  return true;
}

export function insertText(el: EditableField, text: string): void {
  saveUndoSnapshot(el);
  const [start, end] = selection(el);
  const next = el.value.slice(0, start) + text + el.value.slice(end);
  if (!fits(el, next)) return;
  commit(el, next, start + text.length);
}

/**
 * Replaces the last word before caret with a corrected version.
 */
export function replaceLastWord(el: EditableField, originalWord: string, correctedWord: string): boolean {
  const [start] = selection(el);
  const before = el.value.slice(0, start);
  if (!before.endsWith(originalWord)) return false;

  saveUndoSnapshot(el);
  const newBefore = before.slice(0, before.length - originalWord.length) + correctedWord;
  const next = newBefore + el.value.slice(start);
  commit(el, next, newBefore.length);
  return true;
}

/**
 * Inspects field text prior to current caret position to determine if the next typed
 * English letter should be auto-capitalized (at field start or after sentence punctuation [.!?] followed by whitespace).
 */
export function shouldAutoCapitalizeSentence(el: EditableField | null): boolean {
  if (!el) return true;
  const [start] = selection(el);
  if (start === 0) return true;
  const before = el.value.slice(0, start);
  if (/^\s*$/.test(before)) return true;
  // Check if preceded by punctuation [.!?] and space
  return /[.!?]\s+$/.test(before);
}

export function backspace(el: EditableField): void {
  const [start, end] = selection(el);
  if (start !== end) {
    saveUndoSnapshot(el);
    commit(el, el.value.slice(0, start) + el.value.slice(end), start);
    return;
  }
  if (start === 0) return;
  saveUndoSnapshot(el);
  // Delete a whole grapheme: an Arabic letter plus its diacritics, or a
  // surrogate pair, must never be cut in half.
  let from = start - 1;
  while (from > 0 && /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\uFE00-\uFE0F]/.test(el.value[from])) from -= 1;
  if (from > 0 && /[\uDC00-\uDFFF]/.test(el.value[from])) from -= 1;
  commit(el, el.value.slice(0, from) + el.value.slice(start), from);
}

/** Hold-to-delete escalates to whole words, like the system keyboard. */
export function backspaceWord(el: EditableField): void {
  const [start, end] = selection(el);
  if (start !== end) {
    backspace(el);
    return;
  }
  if (start === 0) return;
  saveUndoSnapshot(el);
  let from = start;
  while (from > 0 && /\s/.test(el.value[from - 1])) from -= 1;
  while (from > 0 && !/\s/.test(el.value[from - 1])) from -= 1;
  commit(el, el.value.slice(0, from) + el.value.slice(start), from);
}

export function moveCaret(el: EditableField, delta: number): void {
  const [start, end] = selection(el);
  const base = delta < 0 ? start : end;
  const caret = Math.max(0, Math.min(el.value.length, base + delta));
  try {
    el.setSelectionRange(caret, caret);
  } catch {
    /* ignore */
  }
  el.focus();
}

/**
 * Enter: a newline inside a textarea, otherwise a real Enter keydown so search
 * fields, message composers and forms behave exactly as they do with the OS
 * keyboard.
 */
export function pressEnter(el: EditableField): void {
  if (el instanceof HTMLTextAreaElement && !el.dataset.softKeyboardEnterSends) {
    insertText(el, '\n');
    return;
  }
  for (const type of ['keydown', 'keypress', 'keyup'] as const) {
    el.dispatchEvent(
      new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }),
    );
  }
  const form = el.closest('form');
  if (form && !(el instanceof HTMLTextAreaElement)) {
    // Native single-line semantics: Enter submits.
    form.requestSubmit?.();
  }
}

/** True when the field should get the app keyboard rather than the OS one. */
/** True when the field contains sensitive data like passwords, PINs, or private notes where prediction/learning should be disabled. */
export function isSensitiveField(node: EventTarget | null): boolean {
  if (!(node instanceof HTMLInputElement) && !(node instanceof HTMLTextAreaElement)) return false;
  if (node.type === 'password') return true;
  if (node.dataset.sensitive === 'true') return true;
  if (node.getAttribute('autocomplete')?.includes('password')) return true;
  if (node.getAttribute('autocomplete')?.includes('one-time-code')) return true;
  if (node.closest('[data-sensitive="true"]')) return true;
  return false;
}

export function isSoftKeyboardTarget(node: EventTarget | null): node is EditableField {
  if (!(node instanceof HTMLInputElement) && !(node instanceof HTMLTextAreaElement)) return false;
  if (node.readOnly || node.disabled) return false;
  if (node.closest('[data-soft-keyboard="off"]')) return false;
  if (node.dataset.softKeyboard === 'off') return false;
  if (node instanceof HTMLTextAreaElement) return true;
  return ['text', 'search', 'url', 'email', ''].includes(node.type);
}

/**
 * Returns the preferred initial layout based on element dataset attributes or current route.
 * Input fields inside German Club (/german-club) automatically default to German ('de').
 */
export function getPreferredInitialLayout(node: EventTarget | null): 'ar' | 'en' | 'de' {
  if (node instanceof HTMLElement) {
    const customLayout = node.dataset.keyboardLayout || node.closest('[data-keyboard-layout]')?.getAttribute('data-keyboard-layout');
    if (customLayout === 'de' || customLayout === 'en' || customLayout === 'ar') {
      return customLayout;
    }
  }
  if (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/german-club')) {
    return 'de';
  }
  return 'ar';
}

/**
 * Resolves the adaptive Enter button label based on field type, enterkeyhint attribute, or dataset.
 */
export function getAdaptiveEnterLabel(node: EditableField | null): string {
  if (!node) return 'تم';
  if (typeof HTMLTextAreaElement !== 'undefined' && node instanceof HTMLTextAreaElement) {
    if (node.dataset.softKeyboardEnterSends === 'true') {
      return 'إرسال';
    }
    return 'سطر';
  }
  if (node.tagName?.toLowerCase() === 'textarea') {
    if (node.dataset?.softKeyboardEnterSends === 'true') {
      return 'إرسال';
    }
    return 'سطر';
  }

  const hint = node.getAttribute?.('enterkeyhint')?.toLowerCase();
  if (hint === 'search') return 'بحث';
  if (hint === 'send') return 'إرسال';
  if (hint === 'go') return 'انتقال';
  if (hint === 'next') return 'التالي';
  if (hint === 'done') return 'تم';

  if (node.type === 'search') return 'بحث';
  if (node.type === 'email' || node.type === 'url') return 'انتقال';

  return 'تم';
}