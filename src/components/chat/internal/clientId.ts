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
  if (c?.getRandomValues) {
    try {
      const arr = new Uint8Array(16);
      c.getRandomValues(arr);
      arr[6] = (arr[6] & 0x0f) | 0x40; // v4
      arr[8] = (arr[8] & 0x3f) | 0x80; // variant RFC4122
      const hex = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    } catch { /* fall through */ }
  }

  // Extreme fallback path for ancient/unsupported runtimes.
  const r = () => {
    const bytes = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  };
  return `${r()}-${r().slice(0, 4)}-4${r().slice(4, 7)}-a${r().slice(0, 3)}-${r()}${r().slice(0, 4)}`;
}