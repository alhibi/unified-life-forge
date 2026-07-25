// ─────────────────────────────────────────────────────────────────────────────
// useChatMutations — bundles every chat-mutating action behind one hook.
//
// Each mutation is defined with React Query's useMutation so we get:
//   • Pending state for UI ("Sending…", spinner on a button)
//   • Centralized error mapping via toChatError + describeChatError
//   • Cache patching that doesn't require the caller to know which
//     queryKey to invalidate (we do it here once)
//
// The send flow is split into two paths:
//   1. `sendMessage`       — the happy network path
//   2. `retryFailedMessage` — re-runs the same insert with the same client_id
//      so the (sender_id, client_id) UNIQUE INDEX absorbs duplicates
// ─────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';

import * as api from '../api';
import { newClientId, optimisticIdFromClientId } from '../clientId';
import { describeChatError, toChatError } from '../errors';
import { chatKeys } from '../queryKeys';
import {
  type ChatMessage, type ChatSummary,
  type CreateGroupInput, type MessageKind, type SendMessageInput,
} from '../types';
import { useChatMessages } from './useChatMessages';

interface SendArgs {
  chatId: string;
  conversationId?: string;
  kind: MessageKind;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  replyToId?: string | null;
  expiresAt?: string | null;
  forwardedFromMessageId?: string | null;
  forwardedFromSenderId?: string | null;
  /** Override clientId — used by the retry path to keep idempotency. */
  clientId?: string;
}

export interface UseChatMutationsResult {
  /** Send a new message into the active chat. */
  sendMessage:        (args: SendArgs) => Promise<ChatMessage | null>;
  retryFailedMessage: (failed: ChatMessage) => Promise<void>;
  editMessage:        (id: string, content: string) => Promise<void>;
  deleteForEveryone:  (id: string) => Promise<void>;
  hideForSelf:        (id: string) => Promise<void>;
  toggleReaction:     (messageId: string, emoji: string, mineUserId: string) => Promise<void>;
  setPinned:          (chatId: string, pinned: boolean) => Promise<void>;
  setMuted:           (chatId: string, seconds: number) => Promise<void>;
  setArchived:        (chatId: string, archived: boolean) => Promise<void>;
  markRead:           (chatId: string, messageId?: string | null) => Promise<void>;
  setDraft:           (chatId: string, text: string) => Promise<void>;
  setSelfDestruct:    (chatId: string, seconds: number | null) => Promise<void>;
  setPinnedMessage:   (chatId: string, messageId: string | null) => Promise<void>;
  createGroup:        (input: CreateGroupInput) => Promise<ChatSummary>;
  createOrGetDM:      (otherUserId: string) => Promise<ChatSummary>;
  updateMetadata:     (input: Parameters<typeof api.updateChatMetadata>[0]) => Promise<void>;
  updatePermissions:  (input: Parameters<typeof api.updateChatPermissions>[0]) => Promise<void>;
  addMember:          (chatId: string, userId: string) => Promise<void>;
  removeMember:       (chatId: string, userId: string) => Promise<void>;
  leaveChat:          (chatId: string) => Promise<void>;
  changeMemberRole:   (chatId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
  blockUser:          (userId: string, reason?: string) => Promise<void>;
  unblockUser:        (userId: string) => Promise<void>;
  /** Currently in-flight mutations for skeleton/spinner UI. */
  isPending: {
    send: boolean;
    edit: boolean;
    delete: boolean;
    member: boolean;
  };
}

export function useChatMutations(activeChatId: string | null): UseChatMutationsResult {
  const { user } = useAuth();
  const { } = useApp();
  const viewerId = user?.id;
  const qc = useQueryClient();

  const messages = useChatMessages(activeChatId);

  const showError = useCallback((err: unknown) => {
    const ce = toChatError(err);
    toast.error(describeChatError(ce));
  }, []);

  // ── Send ────────────────────────────────────────────────────────────────
  const sendMutation = useMutation<ChatMessage, Error, { input: SendMessageInput; viewerId: string }>({
    mutationFn: async ({ input, viewerId }) => api.sendMessage(input, viewerId),
  });

  const sendMessage = useCallback(async (args: SendArgs): Promise<ChatMessage | null> => {
    if (!viewerId) return null;
    const clientId = args.clientId ?? newClientId();
    const optimistic: ChatMessage = {
      id: optimisticIdFromClientId(clientId),
      chatId: args.chatId,
      conversationId: args.conversationId ?? args.chatId,
      senderId: viewerId,
      content: args.content,
      kind: args.kind,
      read: false,
      createdAt: new Date().toISOString(),
      replyToId: args.replyToId ?? null,
      fileUrl: args.fileUrl ?? null,
      fileName: args.fileName ?? null,
      deleted: false,
      editedAt: null,
      deliveredAt: null,
      expiresAt: args.expiresAt ?? null,
      hiddenFor: [],
      clientId,
      forwardedFromMessageId: args.forwardedFromMessageId ?? null,
      forwardedFromSenderId: args.forwardedFromSenderId ?? null,
      status: 'pending',
    };

    messages.pushOptimistic(optimistic);

    try {
      const real = await sendMutation.mutateAsync({
        viewerId,
        input: {
          chatId: args.chatId,
          conversationId: args.conversationId,
          kind: args.kind,
          content: args.content,
          fileUrl: args.fileUrl,
          fileName: args.fileName,
          replyToId: args.replyToId,
          expiresAt: args.expiresAt,
          forwardedFromMessageId: args.forwardedFromMessageId,
          forwardedFromSenderId: args.forwardedFromSenderId,
          clientId,
        },
      });
      messages.replaceByClientId(clientId, real);
      return real;
    } catch (err) {
      messages.patchById(optimistic.id, { status: 'failed' });
      showError(err);
      return null;
    }
  }, [viewerId, messages, sendMutation, showError]);

  const retryFailedMessage = useCallback(async (failed: ChatMessage) => {
    if (!viewerId || !failed.clientId) return;
    messages.patchById(failed.id, { status: 'pending' });
    try {
      const real = await api.sendMessage({
        chatId: failed.chatId ?? failed.conversationId,
        conversationId: failed.conversationId,
        kind: failed.kind,
        content: failed.content,
        fileUrl: failed.fileUrl,
        fileName: failed.fileName,
        replyToId: failed.replyToId,
        expiresAt: failed.expiresAt,
        forwardedFromMessageId: failed.forwardedFromMessageId,
        forwardedFromSenderId: failed.forwardedFromSenderId,
        clientId: failed.clientId,
      }, viewerId);
      messages.replaceByClientId(failed.clientId, real);
    } catch (err) {
      messages.patchById(failed.id, { status: 'failed' });
      showError(err);
    }
  }, [viewerId, messages, showError]);

  // ── Edit ────────────────────────────────────────────────────────────────
  const editMutation = useMutation<void, Error, { id: string; content: string }>({
    mutationFn: ({ id, content }) => api.editMessage(id, content),
  });
  const editMessage = useCallback(async (id: string, content: string) => {
    const at = new Date().toISOString();
    messages.patchById(id, { content, editedAt: at });
    try { await editMutation.mutateAsync({ id, content }); }
    catch (err) { showError(err); }
  }, [messages, editMutation, showError]);

  // ── Delete / hide ───────────────────────────────────────────────────────
  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id) => api.deleteMessageForEveryone(id),
  });
  const deleteForEveryone = useCallback(async (id: string) => {
    messages.patchById(id, { deleted: true, content: '', fileUrl: null, fileName: null });
    try { await deleteMutation.mutateAsync(id); }
    catch (err) { showError(err); }
  }, [messages, deleteMutation, showError]);

  const hideMutation = useMutation<void, Error, string>({
    mutationFn: (id) => api.hideMessageForSelf(id),
  });
  const hideForSelf = useCallback(async (id: string) => {
    messages.removeById(id);
    try { await hideMutation.mutateAsync(id); }
    catch (err) { showError(err); }
  }, [messages, hideMutation, showError]);

  // ── Reactions ───────────────────────────────────────────────────────────
  const toggleReaction = useCallback(async (
    messageId: string, emoji: string, mineUserId: string,
  ) => {
    if (!activeChatId) return;
    const key = chatKeys.reactionsForMessage(messageId);
    type RxRow = { id: string; messageId: string; userId: string; emoji: string; createdAt: string };
    const existing = (qc.getQueryData<RxRow[]>(key) ?? []);
    const have = existing.find(r => r.userId === mineUserId && r.emoji === emoji);
    if (have) {
      qc.setQueryData<RxRow[]>(key, existing.filter(r => r !== have));
      try { await api.removeReaction(messageId, emoji, mineUserId); }
      catch (err) { showError(err); }
    } else {
      const optimistic: RxRow = {
        id: `opt-${Math.random().toString(16).slice(2)}`,
        messageId, userId: mineUserId, emoji, createdAt: new Date().toISOString(),
      };
      qc.setQueryData<RxRow[]>(key, [...existing, optimistic]);
      try { await api.addReaction(messageId, emoji, mineUserId); }
      catch (err) { showError(err); }
    }
    void qc.invalidateQueries({ queryKey: chatKeys.reactionsForMessage(messageId) });
    void qc.invalidateQueries({ queryKey: chatKeys.reactions(activeChatId) });
  }, [activeChatId, qc, showError]);

  // ── Per-member preference setters (server-synced) ───────────────────────
  const patchSummary = useCallback((chatId: string, patch: Partial<ChatSummary>) => {
    qc.setQueryData<ChatSummary[]>(chatKeys.list(), prev => {
      if (!prev) return prev;
      return prev.map(c => (c.id === chatId ? { ...c, ...patch } : c));
    });
  }, [qc]);

  const setPinned = useCallback(async (chatId: string, pinned: boolean) => {
    patchSummary(chatId, { myPinnedAt: pinned ? new Date().toISOString() : null });
    try { await api.setChatPinned(chatId, pinned); }
    catch (err) { showError(err); patchSummary(chatId, { myPinnedAt: pinned ? null : new Date().toISOString() }); }
  }, [patchSummary, showError]);

  const setMuted = useCallback(async (chatId: string, seconds: number) => {
    const muted = seconds !== 0;
    const until = seconds < 0 ? '9999-12-31T23:59:59Z'
                : seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString()
                : null;
    patchSummary(chatId, { myMutedUntil: muted ? until : null });
    try { await api.setChatMuted(chatId, seconds); }
    catch (err) { showError(err); }
  }, [patchSummary, showError]);

  const setArchived = useCallback(async (chatId: string, archived: boolean) => {
    patchSummary(chatId, { myArchivedAt: archived ? new Date().toISOString() : null });
    try { await api.setChatArchived(chatId, archived); }
    catch (err) { showError(err); }
  }, [patchSummary, showError]);

  const markRead = useCallback(async (chatId: string, messageId?: string | null) => {
    patchSummary(chatId, { unreadCount: 0, myLastReadAt: new Date().toISOString() });
    try { await api.markChatRead(chatId, messageId ?? null); }
    catch (err) { showError(err); }
  }, [patchSummary, showError]);

  const setDraft = useCallback(async (chatId: string, text: string) => {
    patchSummary(chatId, { myDraftText: text || null });
    try { await api.setChatDraft(chatId, text); }
    catch { /* drafts are best-effort, no toast */ }
  }, [patchSummary]);

  const setSelfDestruct = useCallback(async (chatId: string, seconds: number | null) => {
    patchSummary(chatId, { selfDestructSeconds: seconds });
    try { await api.setChatSelfDestruct(chatId, seconds); }
    catch (err) { showError(err); }
  }, [patchSummary, showError]);

  const setPinnedMessage = useCallback(async (chatId: string, messageId: string | null) => {
    patchSummary(chatId, { pinnedMessageId: messageId });
    try { await api.setChatPinnedMessage(chatId, messageId); }
    catch (err) { showError(err); }
  }, [patchSummary, showError]);

  // ── Chat lifecycle ──────────────────────────────────────────────────────
  const createGroupMutation = useMutation<ChatSummary, Error, CreateGroupInput>({
    mutationFn: api.createGroupChat,
    onSuccess: (chat) => {
      qc.setQueryData<ChatSummary[]>(chatKeys.list(), prev => prev ? [chat, ...prev.filter(c => c.id !== chat.id)] : [chat]);
    },
  });
  const createGroup = useCallback(async (input: CreateGroupInput) => {
    try { return await createGroupMutation.mutateAsync(input); }
    catch (err) { showError(err); throw err; }
  }, [createGroupMutation, showError]);

  const createOrGetDmMutation = useMutation<ChatSummary, Error, string>({
    mutationFn: (otherId) => api.createOrGetDM(otherId),
    onSuccess: (chat) => {
      qc.setQueryData<ChatSummary[]>(chatKeys.list(), prev => prev ? [chat, ...prev.filter(c => c.id !== chat.id)] : [chat]);
    },
  });
  const createOrGetDM = useCallback(async (otherUserId: string) => {
    try { return await createOrGetDmMutation.mutateAsync(otherUserId); }
    catch (err) { showError(err); throw err; }
  }, [createOrGetDmMutation, showError]);

  const updateMetadata = useCallback(async (input: Parameters<typeof api.updateChatMetadata>[0]) => {
    patchSummary(input.chatId, {
      title: input.title ?? undefined,
      description: input.description ?? undefined,
      avatarUrl: input.avatarUrl ?? undefined,
    });
    try { await api.updateChatMetadata(input); }
    catch (err) { showError(err); void qc.invalidateQueries({ queryKey: chatKeys.list() }); }
  }, [patchSummary, qc, showError]);

  const updatePermissions = useCallback(async (input: Parameters<typeof api.updateChatPermissions>[0]) => {
    if (input.whoCanSend) patchSummary(input.chatId, { whoCanSend: input.whoCanSend });
    try { await api.updateChatPermissions(input); }
    catch (err) { showError(err); void qc.invalidateQueries({ queryKey: chatKeys.list() }); }
  }, [patchSummary, qc, showError]);

  // ── Members ─────────────────────────────────────────────────────────────
  const addMemberMutation = useMutation<void, Error, { chatId: string; userId: string }>({
    mutationFn: ({ chatId, userId }) => api.addChatMember(chatId, userId),
    onSuccess: (_void, vars) => { void qc.invalidateQueries({ queryKey: chatKeys.members(vars.chatId) }); },
  });
  const addMember = useCallback(async (chatId: string, userId: string) => {
    try { await addMemberMutation.mutateAsync({ chatId, userId }); }
    catch (err) { showError(err); }
  }, [addMemberMutation, showError]);

  const removeMemberMutation = useMutation<void, Error, { chatId: string; userId: string }>({
    mutationFn: ({ chatId, userId }) => api.removeChatMember(chatId, userId),
    onSuccess: (_void, vars) => { void qc.invalidateQueries({ queryKey: chatKeys.members(vars.chatId) }); },
  });
  const removeMember = useCallback(async (chatId: string, userId: string) => {
    try { await removeMemberMutation.mutateAsync({ chatId, userId }); }
    catch (err) { showError(err); }
  }, [removeMemberMutation, showError]);

  const leaveChatMutation = useMutation<void, Error, string>({
    mutationFn: (id) => api.leaveChat(id),
    onSuccess: (_v, id) => {
      qc.setQueryData<ChatSummary[]>(chatKeys.list(), prev => prev?.filter(c => c.id !== id) ?? prev);
      void qc.invalidateQueries({ queryKey: chatKeys.list() });
    },
  });
  const leaveChat = useCallback(async (chatId: string) => {
    try { await leaveChatMutation.mutateAsync(chatId); }
    catch (err) { showError(err); }
  }, [leaveChatMutation, showError]);

  const changeRoleMutation = useMutation<void, Error, { chatId: string; userId: string; role: 'admin' | 'member' }>({
    mutationFn: ({ chatId, userId, role }) => api.updateChatMemberRole(chatId, userId, role),
    onSuccess: (_v, v) => { void qc.invalidateQueries({ queryKey: chatKeys.members(v.chatId) }); },
  });
  const changeMemberRole = useCallback(async (chatId: string, userId: string, role: 'admin' | 'member') => {
    try { await changeRoleMutation.mutateAsync({ chatId, userId, role }); }
    catch (err) { showError(err); }
  }, [changeRoleMutation, showError]);

  // ── Block / unblock ─────────────────────────────────────────────────────
  const blockMutation = useMutation<void, Error, { userId: string; reason?: string }>({
    mutationFn: ({ userId, reason }) => api.blockUser(userId, reason),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: chatKeys.blockedUsers() }); },
  });
  const blockUser = useCallback(async (userId: string, reason?: string) => {
    try { await blockMutation.mutateAsync({ userId, reason }); }
    catch (err) { showError(err); }
  }, [blockMutation, showError]);

  const unblockMutation = useMutation<void, Error, string>({
    mutationFn: (id) => api.unblockUser(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: chatKeys.blockedUsers() }); },
  });
  const unblockUser = useCallback(async (userId: string) => {
    try { await unblockMutation.mutateAsync(userId); }
    catch (err) { showError(err); }
  }, [unblockMutation, showError]);

  return useMemo<UseChatMutationsResult>(() => ({
    sendMessage, retryFailedMessage,
    editMessage, deleteForEveryone, hideForSelf,
    toggleReaction,
    setPinned, setMuted, setArchived,
    markRead, setDraft, setSelfDestruct, setPinnedMessage,
    createGroup, createOrGetDM, updateMetadata, updatePermissions,
    addMember, removeMember, leaveChat, changeMemberRole,
    blockUser, unblockUser,
    isPending: {
      send:   sendMutation.isPending,
      edit:   editMutation.isPending,
      delete: deleteMutation.isPending || hideMutation.isPending,
      member: addMemberMutation.isPending || removeMemberMutation.isPending || leaveChatMutation.isPending,
    },
  }), [
    sendMessage, retryFailedMessage, editMessage, deleteForEveryone, hideForSelf,
    toggleReaction, setPinned, setMuted, setArchived, markRead, setDraft,
    setSelfDestruct, setPinnedMessage,
    createGroup, createOrGetDM, updateMetadata, updatePermissions,
    addMember, removeMember, leaveChat, changeMemberRole,
    blockUser, unblockUser,
    sendMutation.isPending, editMutation.isPending, deleteMutation.isPending,
    hideMutation.isPending, addMemberMutation.isPending, removeMemberMutation.isPending,
    leaveChatMutation.isPending,
  ]);
}
