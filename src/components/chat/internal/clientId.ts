// Stable client UUID generator. `crypto.randomUUID` is available in modern
// browsers (Safari 15.4+, all evergreens) but fall back gracefully so the
// hook still works on the rare older engine. The id only needs to be
// reasonably unique per user — the DB unique index is on
// (sender_id, client_id), so even if two users happened to mint the same
// uuid it wouldn't collide.
export function newClientId(): string {
  const c = (typeof globalThis !== 'undefined' ? globalThis.crypto : undefined) as
    | (Crypto & { randomUUID?: () => string })
    | undefined;
  if (c?.randomUUID) {
    try { return c.randomUUID(); } catch { /* fall through */ }
  }
  // RFC4122 v4-ish fallback. Good enough for client-only idempotency.
  const r = () => Math.random().toString(16).slice(2, 10);
  return `${r()}-${r().slice(0, 4)}-${r().slice(0, 4)}-${r().slice(0, 4)}-${r()}${r().slice(0, 4)}`;
}