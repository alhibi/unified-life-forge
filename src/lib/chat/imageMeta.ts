// ─────────────────────────────────────────────────────────────────────────────
// Image metadata sidecar — encode/decode helpers.
//
// Why this module exists
// ──────────────────────
// Telegram-style chat bubbles need three things at first paint to feel
// instant and avoid layout shift:
//   • Image dimensions (so the bubble can reserve aspect ratio).
//   • A blurred low-quality preview (LQIP) so the bubble isn't a blank
//     box while the full-size streams in over the network.
//   • A dominant colour as a final-mile placeholder when even the LQIP
//     hasn't loaded yet.
//
// The cleanest place to ship those is a JSON sidecar column on the
// `messages` table. We don't have one yet — and a schema migration here
// would be heavy-handed for what is essentially a UX polish. Instead we
// piggy-back on the existing `file_name` column with a stable URL-safe
// envelope:
//
//     {raw}                                                  ← unchanged
//     ulfimg1:{base64UrlJSON}:{raw}                          ← with metadata
//
// `ulfimg1:` is a versioned prefix so we can evolve the schema later
// without breaking older clients. Older clients that don't recognize
// the prefix will simply see the encoded prefix as part of the
// filename in download flows — slightly ugly but never crashing.
// New clients strip the prefix everywhere user-facing filenames are
// shown (download dialog, copy to clipboard, etc.).
// ─────────────────────────────────────────────────────────────────────────────

export const IMG_META_PREFIX = 'ulfimg1:';

/** Subset of {@link PreparedAsset} fields actually worth embedding. We
 *  intentionally keep this list small — every byte rides along with the
 *  message and JSON-overhead in URLs counts. */
export interface InlineImageMeta {
  /** Natural width in pixels. */
  w?: number;
  /** Natural height in pixels. */
  h?: number;
  /** `#rrggbb` dominant colour for placeholder bg. */
  c?: string;
  /** Inline base64 thumbnail data URL. Capped at THUMB_DATAURL_MAX bytes. */
  t?: string;
}

/**
 * Hard cap on the encoded thumbnail size embedded in `file_name`.
 * `file_name` is `text` in Postgres so the absolute limit is generous,
 * but we want each row to stay below 32 KB to keep realtime payloads
 * snappy and avoid network warnings on slow connections. The compressor
 * already targets ≤ 30 KB; this is a hard guarantee on top.
 */
export const THUMB_DATAURL_MAX = 32 * 1024;

// `btoa` only handles Latin-1, but data URLs are already ASCII-safe.
// JSON we control is also ASCII (no Unicode in keys / values we emit).
const safeBtoa = (s: string) =>
  typeof window === 'undefined' ? Buffer.from(s).toString('base64') : window.btoa(s);
const safeAtob = (s: string) =>
  typeof window === 'undefined' ? Buffer.from(s, 'base64').toString() : window.atob(s);

const toBase64Url = (s: string) =>
  safeBtoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (s: string) => {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (s.length % 4)) % 4);
  return safeAtob(padded);
};

/**
 * Pack an inline metadata blob into the `file_name` column.
 *
 * Returns a string ≤ ~36 KB in the worst case (max thumbnail). Drops the
 * thumbnail field if it would overflow the cap, so we never lose the
 * dimensions / colour just because the thumbnail came in slightly large.
 */
export function packImageMeta(rawName: string, meta: InlineImageMeta): string {
  if (!meta || (!meta.w && !meta.h && !meta.c && !meta.t)) return rawName || '';
  const m: InlineImageMeta = {};
  if (meta.w) m.w = meta.w;
  if (meta.h) m.h = meta.h;
  if (meta.c) m.c = meta.c;
  if (meta.t) m.t = meta.t;
  let json = JSON.stringify(m);
  if (json.length > THUMB_DATAURL_MAX && m.t) {
    delete m.t;
    json = JSON.stringify(m);
  }
  const enc = toBase64Url(json);
  return `${IMG_META_PREFIX}${enc}:${rawName || ''}`;
}

/**
 * Result of unpacking. Callers that don't care about metadata can just
 * read `.name` and ignore the rest.
 */
export interface UnpackedFileName {
  /** Human-readable filename for download / display. Always present. */
  name: string;
  /** Decoded metadata if the envelope was recognized. NULL otherwise. */
  meta: InlineImageMeta | null;
}

/**
 * Extract metadata from a `file_name`. Tolerates malformed envelopes by
 * falling back to the raw string — never throws.
 */
export function unpackFileName(fileName: string | null | undefined): UnpackedFileName {
  if (!fileName) return { name: '', meta: null };
  if (!fileName.startsWith(IMG_META_PREFIX)) {
    return { name: fileName, meta: null };
  }
  const body = fileName.slice(IMG_META_PREFIX.length);
  const sep = body.indexOf(':');
  if (sep < 0) return { name: fileName, meta: null };
  const enc = body.slice(0, sep);
  const rawName = body.slice(sep + 1);
  try {
    const json = fromBase64Url(enc);
    const parsed = JSON.parse(json) as InlineImageMeta;
    return { name: rawName, meta: parsed };
  } catch {
    return { name: fileName, meta: null };
  }
}

/**
 * Convenience getter — returns the human-readable filename only.
 * Used everywhere the user sees the filename (download tooltips,
 * "shared media" tabs, copy- handlers).
 */
export function readableFileName(fileName: string | null | undefined): string {
  return unpackFileName(fileName).name;
}
