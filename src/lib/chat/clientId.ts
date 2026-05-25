// ─────────────────────────────────────────────────────────────────────────────
// Client-side UUID generator for idempotent message inserts.
//
// `crypto.randomUUID` is available everywhere we care about (Safari 15.4+,
// every other evergreen browser shipped before 2022). The fallback path is
// kept only for the rare older runtime where someone runs a chat tab — it
// uses `Math.random()` which is not cryptographically secure but is plenty
// for the limited purpose of "give the same row a unique key for the
// (sender_id, client_id) UNIQUE INDEX".
//
// We export both `newClientId()` and `looksLikeUuid()` so the IDB cache
// can validate persisted ids on rehydrate without depending on a runtime
// UUID library.
// ─────────────────────────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns a fresh UUID-shaped string. */
export function newClientId(): string {
  const c = (typeof globalThis !== 'undefined' ? globalThis.crypto : undefined) as
    | (Crypto & { randomUUID?: () => string })
    | undefined;
  if (c?.randomUUID) {
    try { return c.randomUUID(); } catch { /* fall through */ }
  }
  // RFC4122 v4-ish fallback. Good enough for client-only idempotency.
  const r = () => Math.random().toString(16).slice(2, 10);
  return `${r()}-${r().slice(0, 4)}-4${r().slice(0, 3)}-a${r().slice(0, 3)}-${r()}${r().slice(0, 4)}`;
}

/** Loose validator — true if `s` *looks like* a UUID. */
export function looksLikeUuid(s: unknown): boolean {
  return typeof s === 'string' && UUID_RE.test(s);
}

/** Optimistic id used for the local row before the canonical insert lands. */
export function optimisticIdFromClientId(clientId: string): string {
  return `optimistic_${clientId}`;
}

/** Test a row id to decide whether the bubble is still optimistic. */
export function isOptimisticId(id: string): boolean {
  return id.startsWith('optimistic_');
}
