// ─────────────────────────────────────────────────────────────────────────────
// useComposer — local UI state for the composer of the active chat.
//
//   • text          — current input. Persisted to a draft via useDraft.
//   • replyTo       — message we're replying to (null when not).
//   • editing       — message we're editing (null when not).
//   • emojiOpen     — whether the picker is shown.
//   • mentionState  — tracks "@" → "@user" autocomplete (groups/channels).
//
// The hook exposes typed setters and small helpers used by the bubble's
// long-press menu (replyTo, beginEdit, cancelEdit) so the composer stays
// in sync without prop-drilling.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ChatMessage } from '../types';

export interface UseComposerResult {
  text: string;
  setText: (v: string) => void;
  replyTo: ChatMessage | null;
  setReplyTo: (m: ChatMessage | null) => void;
  editing: ChatMessage | null;
  beginEdit: (m: ChatMessage) => void;
  cancelEdit: () => void;
  emojiOpen: boolean;
  setEmojiOpen: (v: boolean) => void;
  /** Mention autocomplete state (active when input contains "@..." at caret). */
  mention: { active: boolean; query: string; range: [number, number] | null };
  evaluateMention: (input: HTMLTextAreaElement | null) => void;
  closeMention: () => void;
  resetAll: () => void;
  /** Insert a string at the current selection of the supplied textarea, or
   *  append to text if no element is provided. Returns the new text. */
  insertAtCaret: (input: HTMLTextAreaElement | null, fragment: string) => string;
}

interface UseComposerOptions {
  /** Whenever this changes (chat switch) the composer state is reset. */
  resetKey: string | null | undefined;
  /** Initial draft text supplied by useDraft. */
  initialText?: string;
  /** Called whenever the text changes. Use to forward to useDraft. */
  onTextChange?: (next: string) => void;
}

export function useComposer({ resetKey, initialText = '', onTextChange }: UseComposerOptions): UseComposerResult {
  const [text, setTextState] = useState(initialText);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [mention, setMention] = useState({ active: false, query: '', range: null as [number, number] | null });

  const lastResetKeyRef = useRef(resetKey);
  const onTextChangeRef = useRef(onTextChange);
  onTextChangeRef.current = onTextChange;

  // Reset on chat switch.
  useEffect(() => {
    if (lastResetKeyRef.current !== resetKey) {
      lastResetKeyRef.current = resetKey;
      setTextState(initialText);
      setReplyTo(null);
      setEditing(null);
      setEmojiOpen(false);
      setMention({ active: false, query: '', range: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Keep text in sync with initial draft when it changes (e.g. server arrives
  // late on a chat where local was empty).
  useEffect(() => {
    setTextState(prev => (prev.length === 0 ? initialText : prev));
  }, [initialText]);

  const setText = useCallback((next: string) => {
    setTextState(next);
    onTextChangeRef.current?.(next);
  }, []);

  const beginEdit = useCallback((m: ChatMessage) => {
    setEditing(m);
    setReplyTo(null);
    setTextState(m.content ?? '');
    setEmojiOpen(false);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setTextState('');
  }, []);

  const evaluateMention = useCallback((input: HTMLTextAreaElement | null) => {
    if (!input) { setMention({ active: false, query: '', range: null }); return; }
    const value = input.value;
    const caret = input.selectionStart ?? value.length;
    // Walk back from caret looking for "@" preceded by a word boundary.
    let i = caret - 1;
    while (i >= 0) {
      const ch = value[i];
      if (ch === '@') {
        const before = i === 0 ? '' : value[i - 1];
        const isWordBoundary = !before || /\s/.test(before);
        if (!isWordBoundary) { setMention({ active: false, query: '', range: null }); return; }
        const query = value.slice(i + 1, caret);
        if (/\s/.test(query)) { setMention({ active: false, query: '', range: null }); return; }
        setMention({ active: true, query, range: [i, caret] });
        return;
      }
      if (/\s/.test(ch)) break;
      i--;
    }
    setMention({ active: false, query: '', range: null });
  }, []);

  const closeMention = useCallback(() => {
    setMention({ active: false, query: '', range: null });
  }, []);

  const resetAll = useCallback(() => {
    setTextState('');
    setReplyTo(null);
    setEditing(null);
    setEmojiOpen(false);
    setMention({ active: false, query: '', range: null });
  }, []);

  const insertAtCaret = useCallback((input: HTMLTextAreaElement | null, fragment: string): string => {
    if (!input) {
      const next = text + fragment;
      setText(next);
      return next;
    }
    const start = input.selectionStart ?? text.length;
    const end   = input.selectionEnd   ?? text.length;
    const next  = text.slice(0, start) + fragment + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      try {
        const pos = start + fragment.length;
        input.focus();
        input.setSelectionRange(pos, pos);
      } catch { /* no-op */ }
    });
    return next;
  }, [text, setText]);

  return useMemo(() => ({
    text, setText,
    replyTo, setReplyTo,
    editing, beginEdit, cancelEdit,
    emojiOpen, setEmojiOpen,
    mention, evaluateMention, closeMention,
    resetAll, insertAtCaret,
  }), [
    text, setText, replyTo, editing, emojiOpen, mention,
    beginEdit, cancelEdit, evaluateMention, closeMention,
    resetAll, insertAtCaret,
  ]);
}
