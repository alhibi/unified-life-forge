// ─────────────────────────────────────────────────────────────────────────────
// Centralized React Query keys for the chat module.
//
// Why a single factory:
//
//   1. Strongly-typed keys — TS will catch a typo like
//      `queryClient.invalidateQueries(['chat', 'mesages'])` immediately.
//   2. Predictable invalidation — every consumer derives its key from the
//      same source so `invalidateQueries(chatKeys.messages.list(chatId))`
//      always matches the corresponding `useQuery({ queryKey })`.
//   3. Hierarchical — calling `invalidateQueries(chatKeys.all)` nukes the
//      entire chat cache; `invalidateQueries(chatKeys.chat(id))` nukes
//      just that chat's subtree. React Query's "key prefix" semantics
//      do the right thing as long as the keys are arrays.
//
// Convention: every helper returns a `readonly` tuple so accidental
// mutation by a consumer is a compile error.
// ─────────────────────────────────────────────────────────────────────────────

export const chatKeys = {
  // ── Top-level scope ────────────────────────────────────────────────────────
  /** Matches every chat-related query in the cache. */
  all: ['chat'] as const,

  // ── Chats list ─────────────────────────────────────────────────────────────
  list: () => [...chatKeys.all, 'list'] as const,

  // ── Per-chat subtree ───────────────────────────────────────────────────────
  chat:    (chatId: string)               => [...chatKeys.all, 'chat', chatId] as const,
  members: (chatId: string)               => [...chatKeys.chat(chatId), 'members'] as const,

  // ── Messages ──────────────────────────────────────────────────────────────
  messages: (chatId: string)              => [...chatKeys.chat(chatId), 'messages'] as const,
  /** Used by `useInfiniteQuery`. Stable for a given chat regardless of cursor. */
  messagesInfinite: (chatId: string)      => [...chatKeys.messages(chatId), 'infinite'] as const,
  /** Single message lookup (rare; used by message-info sheet). */
  message: (messageId: string)            => [...chatKeys.all, 'message', messageId] as const,

  // ── Reactions ─────────────────────────────────────────────────────────────
  reactions: (chatId: string)             => [...chatKeys.chat(chatId), 'reactions'] as const,
  reactionsForMessage: (messageId: string) => [...chatKeys.all, 'reactions', messageId] as const,

  // ── Attachments / media gallery ───────────────────────────────────────────
  attachments: (chatId: string, kind?: string) =>
    kind
      ? ([...chatKeys.chat(chatId), 'attachments', kind] as const)
      : ([...chatKeys.chat(chatId), 'attachments'] as const),

  // ── Search ────────────────────────────────────────────────────────────────
  search: (chatId: string, query: string) =>
    [...chatKeys.chat(chatId), 'search', query] as const,
  searchGlobal: (query: string)           => [...chatKeys.all, 'search', query] as const,

  // ── User-search and other social flows ────────────────────────────────────
  /** Profile lookup by user_id (used by member sheets, forwarded headers). */
  profile: (userId: string)               => [...chatKeys.all, 'profile', userId] as const,
  /** Username search (new-chat flow). */
  searchUsers: (query: string)            => [...chatKeys.all, 'searchUsers', query] as const,
  /** The caller's block list. */
  blockedUsers:                           () => [...chatKeys.all, 'blocked'] as const,

  // ── Caller's own settings (synced from user_settings.settings.chat) ───────
  settings:                                () => [...chatKeys.all, 'settings'] as const,
} as const;

/**
 * Helper for typed exhaustive narrowing in switch/match expressions.
 * Use it in default branches so adding a new key shape forces a compile error.
 */
export type ChatQueryKey =
  | typeof chatKeys.all
  | ReturnType<typeof chatKeys.list>
  | ReturnType<typeof chatKeys.chat>
  | ReturnType<typeof chatKeys.members>
  | ReturnType<typeof chatKeys.messages>
  | ReturnType<typeof chatKeys.messagesInfinite>
  | ReturnType<typeof chatKeys.message>
  | ReturnType<typeof chatKeys.reactions>
  | ReturnType<typeof chatKeys.reactionsForMessage>
  | ReturnType<typeof chatKeys.attachments>
  | ReturnType<typeof chatKeys.search>
  | ReturnType<typeof chatKeys.searchGlobal>
  | ReturnType<typeof chatKeys.profile>
  | ReturnType<typeof chatKeys.searchUsers>
  | ReturnType<typeof chatKeys.blockedUsers>
  | ReturnType<typeof chatKeys.settings>;
