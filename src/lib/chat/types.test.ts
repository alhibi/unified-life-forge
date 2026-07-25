// @ts-nocheck — schema mismatch: code references tables/RPCs not in current generated types
import { describe, expect,it } from 'vitest';

import {
  asChatKind, asChatRole, asMessageKind,
chatAvatar,
  chatDisplayName,   type ChatSummary, type DbMessage,
  effectiveStatus, isAdmin, isChannel, isChatArchived,   isChatMuted, isChatPinned,
  isDM, isGroup, isOwner,
messageFromDb, messageToInsert,
} from './types';

const baseDbMessage: DbMessage = {
  id: 'msg-1',
  chat_id: 'chat-1',
  client_id: 'cid-1',
  content: 'hello',
  conversation_id: 'conv-1',
  created_at: '2026-05-25T10:00:00Z',
  deleted: false,
  delivered_at: null,
  edited_at: null,
  expires_at: null,
  file_name: null,
  file_url: null,
  forwarded_from_message_id: null,
  forwarded_from_sender_id: null,
  hidden_for: [],
  message_type: 'text',
  read: false,
  reply_to_id: null,
  sender_id: 'user-A',
};

const baseSummary = (overrides: Partial<ChatSummary> = {}): ChatSummary => ({
  id: 'chat-1', kind: 'group', title: 'Demo',
  description: null, avatarUrl: null, isPublic: false,
  whoCanSend: 'all', legacyConversationId: null,
  pinnedMessageId: null, selfDestructSeconds: null,
  updatedAt: '2026-05-25T10:00:00Z', createdAt: '2026-05-20T10:00:00Z',
  myRole: 'member',
  myPinnedAt: null, myArchivedAt: null, myMutedUntil: null,
  myLastReadAt: null, myDraftText: null,
  unreadCount: 0, memberCount: 3,
  lastMessage: null, other: null,
  ...overrides,
});

describe('asChatKind / asChatRole / asMessageKind', () => {
  it('asChatKind narrows valid values, falls back on invalid', () => {
    expect(asChatKind('dm')).toBe('dm');
    expect(asChatKind('group')).toBe('group');
    expect(asChatKind('channel')).toBe('channel');
    expect(asChatKind('weird')).toBe('dm');
    expect(asChatKind(undefined)).toBe('dm');
  });

  it('asChatRole defaults to member for unknown', () => {
    expect(asChatRole('owner')).toBe('owner');
    expect(asChatRole('admin')).toBe('admin');
    expect(asChatRole('superuser')).toBe('member');
    expect(asChatRole(null)).toBe('member');
  });

  it('asMessageKind accepts the full enum and falls back on text', () => {
    const valid = ['text','image','voice','file','video','sticker','gif','location','contact','poll','system'];
    for (const v of valid) {
      expect(asMessageKind(v)).toBe(v);
    }
    expect(asMessageKind('audio')).toBe('text'); // not in our enum
    expect(asMessageKind(undefined)).toBe('text');
  });
});

describe('messageFromDb / messageToInsert', () => {
  it('hydrates a DB row into ChatMessage with default sent status', () => {
    const m = messageFromDb(baseDbMessage);
    expect(m.id).toBe('msg-1');
    expect(m.kind).toBe('text');
    expect(m.status).toBe('sent');
    expect(m.hiddenFor).toEqual([]);
  });

  it('preserves the provided status override', () => {
    const m = messageFromDb(baseDbMessage, 'pending');
    expect(m.status).toBe('pending');
  });

  it('coerces null hidden_for to empty array', () => {
    const row: DbMessage = { ...baseDbMessage, hidden_for: null };
    const m = messageFromDb(row);
    expect(m.hiddenFor).toEqual([]);
  });

  it('messageToInsert drops client-only fields', () => {
    const m = messageFromDb(baseDbMessage, 'failed');
    const ins = messageToInsert(m);
    // 'status' and other client-only fields shouldn't leak.
    expect(ins).not.toHaveProperty('status');
    expect(ins.client_id).toBe('cid-1');
    expect(ins.conversation_id).toBe('conv-1');
  });
});

describe('effectiveStatus', () => {
  it('returns "read" if read=true and message is mine', () => {
    expect(effectiveStatus(
      { sender_id: 'me', read: true, delivered_at: '2026-01-01T00:00:00Z' },
      'me',
    )).toBe('read');
  });
  it('returns "delivered" when delivered_at is set, read=false, mine', () => {
    expect(effectiveStatus(
      { sender_id: 'me', read: false, delivered_at: '2026-01-01T00:00:00Z' },
      'me',
    )).toBe('delivered');
  });
  it('returns "sent" when neither delivered nor read for own messages', () => {
    expect(effectiveStatus(
      { sender_id: 'me', read: false, delivered_at: null },
      'me',
    )).toBe('sent');
  });
  it('treats received messages as "read" when read=true and "delivered" otherwise', () => {
    expect(effectiveStatus({ sender_id: 'other', read: true, delivered_at: null }, 'me')).toBe('read');
    expect(effectiveStatus({ sender_id: 'other', read: false, delivered_at: null }, 'me')).toBe('delivered');
  });
  it('explicit override wins', () => {
    expect(effectiveStatus(
      { sender_id: 'me', read: true, delivered_at: '...' },
      'me',
      'failed',
    )).toBe('failed');
  });
});

describe('predicates', () => {
  it('isDM/isGroup/isChannel are mutually exclusive', () => {
    expect(isDM({ kind: 'dm' })).toBe(true);
    expect(isGroup({ kind: 'group' })).toBe(true);
    expect(isChannel({ kind: 'channel' })).toBe(true);
    expect(isDM({ kind: 'group' })).toBe(false);
    expect(isGroup({ kind: 'channel' })).toBe(false);
    expect(isChannel({ kind: 'dm' })).toBe(false);
  });
  it('isAdmin returns true for owner and admin', () => {
    expect(isAdmin({ role: 'owner' })).toBe(true);
    expect(isAdmin({ role: 'admin' })).toBe(true);
    expect(isAdmin({ role: 'member' })).toBe(false);
  });
  it('isOwner only returns true for owner', () => {
    expect(isOwner({ role: 'owner' })).toBe(true);
    expect(isOwner({ role: 'admin' })).toBe(false);
  });
});

describe('per-chat predicates', () => {
  it('isChatMuted returns true while muted_until is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isChatMuted({ myMutedUntil: future })).toBe(true);
  });
  it('isChatMuted returns false when muted_until is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isChatMuted({ myMutedUntil: past })).toBe(false);
  });
  it('isChatMuted returns false on null', () => {
    expect(isChatMuted({ myMutedUntil: null })).toBe(false);
  });
  it('isChatArchived / isChatPinned check for null', () => {
    expect(isChatArchived({ myArchivedAt: null })).toBe(false);
    expect(isChatArchived({ myArchivedAt: '2026-05-25T00:00:00Z' })).toBe(true);
    expect(isChatPinned({ myPinnedAt: null })).toBe(false);
    expect(isChatPinned({ myPinnedAt: '2026-05-25T00:00:00Z' })).toBe(true);
  });
});

describe('chatDisplayName / chatAvatar', () => {
  it('uses the title for groups', () => {
    expect(chatDisplayName(baseSummary({ title: 'Friends' }))).toBe('Friends');
  });
  it('falls back to the DM partner display name', () => {
    expect(chatDisplayName(baseSummary({
      kind: 'dm',
      title: null,
      other: { userId: 'u', username: 'fatima', displayName: 'Fatima', avatarUrl: null, lastSeen: null },
    }))).toBe('Fatima');
  });
  it('falls back to username if no display name is set', () => {
    expect(chatDisplayName(baseSummary({
      kind: 'dm',
      title: null,
      other: { userId: 'u', username: 'noor', displayName: null, avatarUrl: null, lastSeen: null },
    }))).toBe('noor');
  });
  it('chatAvatar prefers explicit avatarUrl over partner avatar', () => {
    expect(chatAvatar(baseSummary({
      avatarUrl: 'https://x/y.png',
      other: { userId: 'u', username: 'a', displayName: null, avatarUrl: 'https://x/z.png', lastSeen: null },
    }))).toBe('https://x/y.png');
  });
});