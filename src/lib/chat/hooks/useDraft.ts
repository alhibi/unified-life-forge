// useDraft — manages the active chat's draft text.
//
// Two-tier strategy:
//
//   1. localStorage gives us instantaneous read-on-mount with zero network
//      latency, so the composer never blanks out when the user re-opens
//      the chat. Keyed by `(userId, chatId)` so two accounts on the same
//      browser stay isolated.
//
//   2. The server-synced draft (chat_members.draft_text) is updated on a
//      debounce so opening the chat on a different device shows the same
//      half-typed message. Since the server view of the draft is the
//      same row that drives unread + last-read, we use the existing
//      set_chat_draft RPC instead of an upsert.
//
// On chat-switch the latest non-empty value (server > local) wins.

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';

import * as api from '../api';

const PERSIST_DEBOUNCE_MS = 500;

const localKey = (userId: string, chatId: string) => `ulf.chat.draft.${userId}.${chatId}`;

export interface UseDraftResult {
  draft: string;
  setDraft: (next: string) => void;
  clearDraft: () => void;
  /** Force-flush any pending server save. */
  flush: () => Promise<void>;
}

export function useDraft(chatId: string | null | undefined, serverInitial?: string | null): UseDraftResult {
  const { user } = useAuth();
  const userId = user?.id;
  const [draft, setDraftState] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);
  const lastFlushedRef = useRef<string>('');

  // Hydrate on chat / user change — server initial wins when populated;
  // otherwise we read localStorage so we don't lose half-typed text.
  useEffect(() => {
    if (!userId || !chatId) { setDraftState(''); return; }
    const fromServer = (serverInitial ?? '').trim();
    if (fromServer) {
      setDraftState(serverInitial!);
      lastFlushedRef.current = serverInitial!;
      return;
    }
    try {
      const local = localStorage.getItem(localKey(userId, chatId)) ?? '';
      setDraftState(local);
      lastFlushedRef.current = local;
    } catch { setDraftState(''); }
  }, [userId, chatId, serverInitial]);

  const flush = useCallback(async () => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const v = pendingRef.current;
    pendingRef.current = null;
    if (!chatId || v === null) return;
    if (v === lastFlushedRef.current) return;
    try {
      await api.setChatDraft(chatId, v);
      lastFlushedRef.current = v;
    } catch { /* drafts are best-effort */ }
  }, [chatId]);

  const scheduleSave = useCallback((v: string) => {
    pendingRef.current = v;
    if (!chatId || !userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void flush(); }, PERSIST_DEBOUNCE_MS);
  }, [chatId, userId, flush]);

  const setDraft = useCallback((next: string) => {
    setDraftState(next);
    if (userId && chatId) {
      try { localStorage.setItem(localKey(userId, chatId), next); } catch { /* quota */ }
    }
    scheduleSave(next);
  }, [userId, chatId, scheduleSave]);

  const clearDraft = useCallback(() => {
    setDraftState('');
    if (userId && chatId) {
      try { localStorage.removeItem(localKey(userId, chatId)); } catch { /* ignore */ }
    }
    scheduleSave('');
  }, [userId, chatId, scheduleSave]);

  // Tab-hide flush.
  useEffect(() => {
    const onHide = () => { void flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [flush]);

  return { draft, setDraft, clearDraft, flush };
}
