/**
 * Message encryption / decryption.
 *
 * Two functions matter to the rest of the app:
 *
 *   encryptText(key, plaintext, aad) → envelope string
 *   decryptText(key, envelope, aad)  → plaintext | null
 *
 * `decryptText` returns null rather than throwing on failure. That is
 * deliberate: a chat history can legitimately contain messages this device
 * cannot read (sent to a different device identity, or encrypted under a key
 * that has since been rotated), and a throw at that point would break the whole
 * message list instead of one bubble. The caller renders a clear "cannot
 * decrypt" state for null.
 */
import {
  decodeEnvelope,
  encodeEnvelope,
  fromUtf8,
  isEncrypted,
  IV_LENGTH,
  utf8,
} from './envelope';

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error('e2ee: WebCrypto unavailable');
  return c.subtle;
}

function randomIv(): Uint8Array {
  const iv = new Uint8Array(IV_LENGTH);
  globalThis.crypto.getRandomValues(iv);
  return iv;
}

export async function encryptText(
  key: CryptoKey,
  plaintext: string,
  aad: Uint8Array,
): Promise<string> {
  // A fresh random IV per message. Reusing an IV under the same AES-GCM key is
  // catastrophic (it leaks the XOR of the plaintexts), so this is never derived
  // from a counter that could restart after a reload.
  const iv = randomIv();
  const ciphertext = await subtle().encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad as BufferSource, tagLength: 128 },
    key,
    utf8(plaintext) as BufferSource,
  );
  return encodeEnvelope({ iv, ciphertext: new Uint8Array(ciphertext) });
}

export async function decryptText(
  key: CryptoKey,
  content: string,
  aad: Uint8Array,
): Promise<string | null> {
  const envelope = decodeEnvelope(content);
  if (!envelope) return null;
  try {
    const plaintext = await subtle().decrypt(
      { name: 'AES-GCM', iv: envelope.iv as BufferSource, additionalData: aad as BufferSource, tagLength: 128 },
      key,
      envelope.ciphertext as BufferSource,
    );
    return fromUtf8(new Uint8Array(plaintext));
  } catch {
    // Wrong key, tampered ciphertext, or mismatched AAD — all indistinguishable
    // by design, and all mean "not readable here".
    return null;
  }
}

export { isEncrypted };
