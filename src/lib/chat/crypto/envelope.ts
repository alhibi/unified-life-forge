/**
 * Ciphertext envelope — the on-the-wire format for end-to-end encrypted
 * messages.
 *
 * Constraint that shapes everything here: encrypted bodies have to travel in the
 * EXISTING `messages.content` TEXT column. Adding a binary column would have
 * meant migrating every read path, every RPC and the realtime payload shape at
 * once; a self-describing text envelope lets encrypted and plaintext messages
 * coexist in the same table during rollout, which is the only safe way to ship
 * encryption into a live conversation history.
 *
 * Format (ASCII only, no padding, URL-safe base64):
 *
 *     e2ee.v1.<iv>.<ciphertext>
 *
 * `iv` is the 12-byte AES-GCM nonce; `ciphertext` includes the 16-byte GCM tag.
 * The literal `e2ee.v1.` prefix is the version marker: a future scheme bumps it
 * and old clients will refuse to decode rather than mis-decode.
 *
 * This module is pure and synchronous so it can be unit-tested without any
 * crypto or storage dependency.
 */

/** Marker that identifies an encrypted body. Also the version gate. */
export const ENVELOPE_PREFIX = 'e2ee.v1.';

/** AES-GCM nonce length in bytes. 96 bits is the value GCM is defined for. */
export const IV_LENGTH = 12;

export interface Envelope {
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

/* ── base64url ─────────────────────────────────────────────────────────
   Hand-rolled rather than pulled from a dependency: this must work
   identically in the browser, in jsdom under vitest, and in the service
   worker, and it must never emit `+`, `/` or `=` (all three are legal in a
   TEXT column but make the envelope ambiguous to split on `.`).            */

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;

    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    if (b1 === undefined) break;
    out += B64_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    if (b2 === undefined) break;
    out += B64_ALPHABET[b2 & 0x3f];
  }
  return out;
}

const B64_LOOKUP: Record<string, number> = {};
for (let i = 0; i < B64_ALPHABET.length; i += 1) B64_LOOKUP[B64_ALPHABET[i]] = i;

export function fromBase64Url(text: string): Uint8Array {
  const clean = text.trim();
  const bits: number[] = [];
  for (const char of clean) {
    const value = B64_LOOKUP[char];
    // Reject anything outside the alphabet instead of silently skipping it: a
    // truncated or tampered envelope must fail loudly, not decode to garbage.
    if (value === undefined) throw new Error('envelope: invalid base64url');
    bits.push(value);
  }

  const byteLength = Math.floor((bits.length * 6) / 8);
  const out = new Uint8Array(byteLength);
  let buffer = 0;
  let bufferBits = 0;
  let index = 0;
  for (const value of bits) {
    buffer = (buffer << 6) | value;
    bufferBits += 6;
    if (bufferBits >= 8) {
      bufferBits -= 8;
      out[index] = (buffer >> bufferBits) & 0xff;
      index += 1;
    }
  }
  return out;
}

/* ── envelope ──────────────────────────────────────────────────────────── */

export function isEncrypted(content: string | null | undefined): boolean {
  return typeof content === 'string' && content.startsWith(ENVELOPE_PREFIX);
}

export function encodeEnvelope(envelope: Envelope): string {
  if (envelope.iv.length !== IV_LENGTH) {
    throw new Error(`envelope: iv must be ${IV_LENGTH} bytes`);
  }
  if (envelope.ciphertext.length === 0) throw new Error('envelope: empty ciphertext');
  return `${ENVELOPE_PREFIX}${toBase64Url(envelope.iv)}.${toBase64Url(envelope.ciphertext)}`;
}

/**
 * Parse an envelope. Returns null for anything that is not a well-formed
 * envelope of a version we understand — callers treat null as "this is
 * plaintext, render it as-is", which is what keeps mixed histories working.
 */
export function decodeEnvelope(content: string): Envelope | null {
  if (!isEncrypted(content)) return null;
  const body = content.slice(ENVELOPE_PREFIX.length);
  const parts = body.split('.');
  if (parts.length !== 2) return null;
  try {
    const iv = fromBase64Url(parts[0]);
    const ciphertext = fromBase64Url(parts[1]);
    if (iv.length !== IV_LENGTH || ciphertext.length === 0) return null;
    return { iv, ciphertext };
  } catch {
    return null;
  }
}

/* ── text codec ────────────────────────────────────────────────────────── */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function utf8(text: string): Uint8Array {
  return encoder.encode(text);
}

export function fromUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

/**
 * Additional authenticated data for a message.
 *
 * Binding the ciphertext to (chat, sender) means a captured envelope cannot be
 * replayed into a different conversation or attributed to a different sender:
 * GCM verification fails because the AAD no longer matches. Without this, a
 * malicious server could move a message between chats while keeping it
 * decryptable.
 */
export function messageAad(chatId: string, senderId: string): Uint8Array {
  return utf8(`amv.life/e2ee/v1|chat:${chatId}|from:${senderId}`);
}
