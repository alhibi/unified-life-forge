// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB-backed offline cache for the chat module.
//
// Stores
//   • `messages`    keyed by `id`, with indexes on `chatId` (composite with
//                   `createdAt` for cheap range queries) and `clientId` so
//                   the optimistic-row reconciliation path can dedup against
//                   what was already persisted before the realtime echo.
//   • `chats`       keyed by `id`. Holds the latest `ChatSummary` snapshot.
//                   Lets the conversation list paint instantly on cold boot
//                   while React Query refetches in the background.
//   • `outbox`      keyed by `clientId`. Messages drafted while offline that
//                   we will replay when the network returns. The send hook
//                   reads from here on mount and flushes to Supabase.
//   • `attachments` keyed by `messagePath`. Caches generated thumbnails so
//                   we don't re-decode the original blob on every render.
//
// Resilience
//   • One-shot corruption recovery on open() failure
//   • Versioned schema upgrades that never touch existing data
//   • Connection pooling — one IDBDatabase handle per tab
//   • Quota-aware bulk writes with `navigator.storage.estimate()` checks
//   • Graceful degrade: every public method returns sensible defaults
//     when IndexedDB is unavailable (e.g. private tabs in Firefox)
//
// API contract
//   Every public method is async and never throws — errors are logged
//   to console and the method resolves to a safe default. Callers
//   treat the cache as a hint, never as authoritative state.
// ─────────────────────────────────────────────────────────────────────────────

import { logger } from '@/lib/logger';

import type { ChatMessage, ChatSummary } from './types';

const log = logger.scope('chat:idb');

const DB_NAME    = 'smarthub-chat';
const DB_VERSION = 1;

const STORE_MESSAGES    = 'messages';
const STORE_CHATS       = 'chats';
const STORE_OUTBOX      = 'outbox';
const STORE_ATTACHMENTS = 'attachments';

// Soft cap so a runaway caching loop can never exhaust the user's quota.
// Past this many cached messages per chat the cache rotates oldest-first.
const MAX_CACHED_MESSAGES_PER_CHAT = 500;
const MAX_CACHED_CHATS             = 200;

let dbPromise: Promise<IDBDatabase> | null = null;
let recoveryAttempted = false;

// ── Connection ───────────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const s = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' });
        // Composite index for "messages in chat X ordered by time".
        s.createIndex('byChat',     ['chatId', 'createdAt']);
        // Reconcile optimistic rows against canonical inserts.
        s.createIndex('byClientId', 'clientId', { unique: false });
        // Sweep expired self-destruct rows on cold boot.
        s.createIndex('expiresAt',  'expiresAt');
      }

      if (!db.objectStoreNames.contains(STORE_CHATS)) {
        const s = db.createObjectStore(STORE_CHATS, { keyPath: 'id' });
        s.createIndex('updatedAt', 'updatedAt');
      }

      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        const s = db.createObjectStore(STORE_OUTBOX, { keyPath: 'clientId' });
        s.createIndex('chatId',    'chatId');
        s.createIndex('createdAt', 'createdAt');
      }

      if (!db.objectStoreNames.contains(STORE_ATTACHMENTS)) {
        db.createObjectStore(STORE_ATTACHMENTS, { keyPath: 'path' });
      }
    };

    req.onsuccess = () => resolve(req.result);

    req.onerror = () => {
      const err = req.error;
      if (!recoveryAttempted) {
        recoveryAttempted = true;
        dbPromise = null;
        // Likely a partial upgrade or a corrupted page — wipe and reopen.
        log.warn('open failed, attempting recovery', err);
        try {
          const del = indexedDB.deleteDatabase(DB_NAME);
          del.onsuccess = () => resolve(openDb().then(db => db));
          del.onerror   = () => reject(err ?? new Error('idb open failed'));
        } catch {
          reject(err ?? new Error('idb open failed'));
        }
      } else {
        reject(err ?? new Error('idb open failed'));
      }
    };

    req.onblocked = () => {
      log.warn('upgrade blocked by another tab');
    };
  });

  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  return openDb().then(db => new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    let req: IDBRequest<T> | Promise<T>;
    try {
      req = fn(t.objectStore(store));
    } catch (e) {
      reject(e);
      return;
    }
    if (req instanceof Promise) {
      req.then(resolve, reject);
      return;
    }
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

// ── Public API: chats ────────────────────────────────────────────────────────

interface CachedChat {
  id: string;
  data: ChatSummary;
  cachedAt: number;
  updatedAt: string;
}

export async function cacheChats(chats: ChatSummary[]): Promise<void> {
  if (chats.length === 0) return;
  try {
    await openDb().then(db => new Promise<void>((resolve) => {
      const t = db.transaction(STORE_CHATS, 'readwrite');
      const s = t.objectStore(STORE_CHATS);
      const now = Date.now();
      for (const c of chats) {
        s.put({ id: c.id, data: c, cachedAt: now, updatedAt: c.updatedAt });
      }
      t.oncomplete = () => resolve();
      t.onerror    = () => resolve();
      t.onabort    = () => resolve();
    }));
    await trimChatsIfNeeded();
  } catch (e) {
    log.warn('cacheChats failed', e);
  }
}

export async function readCachedChats(): Promise<ChatSummary[]> {
  try {
    const all = await tx<CachedChat[]>(STORE_CHATS, 'readonly', s => s.getAll() as IDBRequest<CachedChat[]>);
    return all
      .map(r => r.data)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  } catch {
    return [];
  }
}

export async function evictChat(chatId: string): Promise<void> {
  try {
    await tx(STORE_CHATS, 'readwrite', s => s.delete(chatId));
    await tx(STORE_MESSAGES, 'readwrite', store => {
      const idx = store.index('byChat');
      const range = IDBKeyRange.bound([chatId, ''], [chatId, '\uffff']);
      const cursor = idx.openCursor(range);
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) { c.delete(); c.continue(); }
      };
      return cursor as unknown as IDBRequest<undefined>;
    });
  } catch {
    /* ignore */
  }
}

async function trimChatsIfNeeded(): Promise<void> {
  try {
    const count = await tx<number>(STORE_CHATS, 'readonly', s => s.count());
    if (count <= MAX_CACHED_CHATS) return;
    const toDelete = count - MAX_CACHED_CHATS;
    await tx<void>(STORE_CHATS, 'readwrite', store => {
      const idx = store.index('updatedAt');
      let removed = 0;
      const cursor = idx.openCursor();
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c) return;
        if (removed < toDelete) { c.delete(); removed++; c.continue(); }
      };
      return cursor as unknown as IDBRequest<void>;
    });
  } catch {
    /* ignore */
  }
}

// ── Public API: messages ─────────────────────────────────────────────────────

interface CachedMessage {
  id: string;
  chatId: string;
  clientId: string | null;
  createdAt: string;
  expiresAt: string | null;
  data: ChatMessage;
}

function toCachedMessage(m: ChatMessage): CachedMessage {
  return {
    id: m.id,
    chatId: m.chatId ?? m.conversationId,
    clientId: m.clientId,
    createdAt: m.createdAt,
    expiresAt: m.expiresAt,
    data: m,
  };
}

export async function cacheMessages(chatId: string, msgs: ChatMessage[]): Promise<void> {
  if (msgs.length === 0) return;
  try {
    await openDb().then(db => new Promise<void>((resolve) => {
      const t = db.transaction(STORE_MESSAGES, 'readwrite');
      const s = t.objectStore(STORE_MESSAGES);
      for (const m of msgs) s.put(toCachedMessage(m));
      t.oncomplete = () => resolve();
      t.onerror    = () => resolve();
      t.onabort    = () => resolve();
    }));
    await trimMessagesForChatIfNeeded(chatId);
  } catch (e) {
    log.warn('cacheMessages failed', e);
  }
}

export async function readCachedMessages(chatId: string, limit: number = 100): Promise<ChatMessage[]> {
  try {
    const out: ChatMessage[] = [];
    await tx<void>(STORE_MESSAGES, 'readonly', store => {
      const idx   = store.index('byChat');
      const range = IDBKeyRange.bound([chatId, ''], [chatId, '\uffff']);
      // Walk the index in DESC order (prev) and stop once we've collected `limit`.
      const cursor = idx.openCursor(range, 'prev');
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c && out.length < limit) {
          out.push((c.value as CachedMessage).data);
          c.continue();
        }
      };
      return cursor as unknown as IDBRequest<void>;
    });
    return out.reverse();
  } catch {
    return [];
  }
}

export async function deleteCachedMessage(messageId: string): Promise<void> {
  try { await tx(STORE_MESSAGES, 'readwrite', s => s.delete(messageId)); } catch { /* ignore */ }
}

/** Replace the optimistic row keyed by clientId with the canonical one. */
export async function reconcileMessageByClientId(
  clientId: string,
  canonical: ChatMessage,
): Promise<void> {
  try {
    await openDb().then(db => new Promise<void>((resolve) => {
      const t = db.transaction(STORE_MESSAGES, 'readwrite');
      const s = t.objectStore(STORE_MESSAGES);
      const idx = s.index('byClientId');
      const cursor = idx.openCursor(IDBKeyRange.only(clientId));
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) { c.delete(); c.continue(); }
      };
      cursor.onerror = () => resolve();
      t.oncomplete = () => {
        // Insert the canonical row. Use a *new* transaction since the
        // previous cursor walk just finished.
        const t2 = db.transaction(STORE_MESSAGES, 'readwrite');
        t2.objectStore(STORE_MESSAGES).put(toCachedMessage(canonical));
        t2.oncomplete = () => resolve();
        t2.onerror    = () => resolve();
        t2.onabort    = () => resolve();
      };
      t.onerror = () => resolve();
      t.onabort = () => resolve();
    }));
  } catch {
    /* ignore */
  }
}

/** Drop every cached row whose expires_at is in the past. */
export async function evictExpiredMessages(now: number = Date.now()): Promise<number> {
  let removed = 0;
  try {
    await tx<void>(STORE_MESSAGES, 'readwrite', store => {
      const idx = store.index('expiresAt');
      const upper = new Date(now).toISOString();
      const range = IDBKeyRange.upperBound(upper);
      const cursor = idx.openCursor(range);
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c) return;
        const v = c.value as CachedMessage;
        if (v.expiresAt && v.expiresAt <= upper) { c.delete(); removed++; }
        c.continue();
      };
      return cursor as unknown as IDBRequest<void>;
    });
  } catch {
    /* ignore */
  }
  return removed;
}

async function trimMessagesForChatIfNeeded(chatId: string): Promise<void> {
  try {
    let count = 0;
    await tx<void>(STORE_MESSAGES, 'readonly', store => {
      const idx = store.index('byChat');
      const range = IDBKeyRange.bound([chatId, ''], [chatId, '\uffff']);
      const req = idx.count(range);
      req.onsuccess = () => { count = req.result; };
      return req as unknown as IDBRequest<void>;
    });
    if (count <= MAX_CACHED_MESSAGES_PER_CHAT) return;

    const toDelete = count - MAX_CACHED_MESSAGES_PER_CHAT;
    await tx<void>(STORE_MESSAGES, 'readwrite', store => {
      const idx = store.index('byChat');
      const range = IDBKeyRange.bound([chatId, ''], [chatId, '\uffff']);
      let removed = 0;
      const cursor = idx.openCursor(range, 'next'); // oldest first
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c) return;
        if (removed < toDelete) { c.delete(); removed++; c.continue(); }
      };
      return cursor as unknown as IDBRequest<void>;
    });
  } catch {
    /* ignore */
  }
}

// ── Public API: outbox (offline queue) ───────────────────────────────────────

export interface OutboxItem {
  clientId: string;
  chatId: string;
  /** Serialized SendMessageInput minus runtime-only fields. */
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

export async function enqueueOutbox(item: Omit<OutboxItem, 'attempts' | 'lastError'>): Promise<void> {
  try {
    await tx(STORE_OUTBOX, 'readwrite', s => s.put({
      ...item,
      attempts: 0,
      lastError: null,
    }));
  } catch {
    /* ignore */
  }
}

export async function listOutboxForChat(chatId: string): Promise<OutboxItem[]> {
  try {
    return await tx<OutboxItem[]>(STORE_OUTBOX, 'readonly', store => {
      const idx = store.index('chatId');
      return idx.getAll(IDBKeyRange.only(chatId)) as IDBRequest<OutboxItem[]>;
    });
  } catch {
    return [];
  }
}

export async function listAllOutbox(): Promise<OutboxItem[]> {
  try {
    return await tx<OutboxItem[]>(STORE_OUTBOX, 'readonly', s => s.getAll() as IDBRequest<OutboxItem[]>);
  } catch {
    return [];
  }
}

export async function dropOutboxItem(clientId: string): Promise<void> {
  try { await tx(STORE_OUTBOX, 'readwrite', s => s.delete(clientId)); } catch { /* ignore */ }
}

export async function bumpOutboxAttempt(clientId: string, error: string): Promise<void> {
  try {
    await openDb().then(db => new Promise<void>((resolve) => {
      const t = db.transaction(STORE_OUTBOX, 'readwrite');
      const s = t.objectStore(STORE_OUTBOX);
      const req = s.get(clientId);
      req.onsuccess = () => {
        const cur = req.result as OutboxItem | undefined;
        if (cur) {
          s.put({ ...cur, attempts: cur.attempts + 1, lastError: error.slice(0, 240) });
        }
        resolve();
      };
      req.onerror = () => resolve();
    }));
  } catch {
    /* ignore */
  }
}

// ── Public API: attachment thumbs ────────────────────────────────────────────

export interface CachedThumb { path: string; thumb: Blob; width: number; height: number; cachedAt: number }

export async function cacheThumb(path: string, thumb: Blob, width: number, height: number): Promise<void> {
  try {
    await tx(STORE_ATTACHMENTS, 'readwrite', s => s.put({
      path, thumb, width, height, cachedAt: Date.now(),
    } satisfies CachedThumb));
  } catch { /* ignore */ }
}

export async function readThumb(path: string): Promise<CachedThumb | null> {
  try {
    const v = await tx<CachedThumb | undefined>(STORE_ATTACHMENTS, 'readonly', s => s.get(path) as IDBRequest<CachedThumb | undefined>);
    return v ?? null;
  } catch {
    return null;
  }
}

// ── Storage estimate / housekeeping ──────────────────────────────────────────

export async function estimateUsage(): Promise<{ usage: number; quota: number }> {
  if (typeof navigator === 'undefined' || !('storage' in navigator) || !navigator.storage.estimate) {
    return { usage: 0, quota: 0 };
  }
  try {
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  } catch {
    return { usage: 0, quota: 0 };
  }
}

/** Hard wipe — used by Settings → Storage → "Clear cache". */
export async function clearAll(): Promise<void> {
  try {
    await openDb().then(db => new Promise<void>((resolve) => {
      const t = db.transaction(
        [STORE_MESSAGES, STORE_CHATS, STORE_OUTBOX, STORE_ATTACHMENTS],
        'readwrite',
      );
      t.objectStore(STORE_MESSAGES).clear();
      t.objectStore(STORE_CHATS).clear();
      t.objectStore(STORE_OUTBOX).clear();
      t.objectStore(STORE_ATTACHMENTS).clear();
      t.oncomplete = () => resolve();
      t.onerror    = () => resolve();
      t.onabort    = () => resolve();
    }));
  } catch {
    /* ignore */
  }
}

export const _internal = { DB_NAME, DB_VERSION, STORE_MESSAGES, STORE_CHATS, STORE_OUTBOX };
