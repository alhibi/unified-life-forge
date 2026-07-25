/**
 * Identity keys for end-to-end encryption.
 *
 * Design decisions and their reasons:
 *
 *  • **ECDH on P-256**, not X25519. X25519 is the better curve, but WebCrypto
 *    support for it is still uneven (Safari only shipped it recently). P-256 ECDH
 *    is available everywhere this app runs, and is what lets encryption be ON by
 *    default instead of a capability-gated extra.
 *
 *  • **The private key is non-extractable.** It is generated with
 *    `extractable: false` and stored as a live `CryptoKey` in IndexedDB via
 *    structured clone. Consequence: no code path — including a successful XSS —
 *    can read the private key material out of the browser. The trade-off is that
 *    the key cannot be exported to another device, so each device has its own
 *    identity. That is the correct trade for a web client: an exportable key that
 *    syncs through a server is not end-to-end anything.
 *
 *  • **HKDF-SHA256** turns the raw ECDH output into an AES key. Using the shared
 *    secret directly as a key is a classic mistake — the x-coordinate is not
 *    uniformly distributed. The salt is the pair of user ids in sorted order so
 *    both sides derive the same key without exchanging a nonce, and the info
 *    string pins the derivation to this protocol version.
 *
 *  • **AES-256-GCM** for the message itself: authenticated encryption, so a
 *    tampered ciphertext fails to decrypt rather than decrypting to junk.
 *
 * KNOWN LIMITATIONS, stated plainly because pretending otherwise would be worse
 * than not encrypting at all:
 *   – Static-static ECDH gives NO forward secrecy. Compromising a device's
 *     private key exposes past messages from that device. A Double-Ratchet
 *     (Signal) design would fix this and is the natural next step.
 *   – Public keys are distributed by the same server that relays messages, so a
 *     malicious server could substitute a key. That is exactly why the
 *     fingerprint (`safetyNumber`) exists: two people comparing it out of band
 *     detect substitution.
 *   – Attachments (images, voice) are not encrypted yet; only text bodies are.
 *     The UI must not claim otherwise.
 */

const DB_NAME = 'amv-chat-e2ee';
const DB_VERSION = 1;
const STORE = 'identity';
const IDENTITY_KEY = 'self';

export const CURVE = 'P-256';
export const PROTOCOL_INFO = 'amv.life/e2ee/v1';

export interface IdentityKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface StoredIdentity {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  /** base64url of the raw public point — what gets published to the server. */
  publicKeyRaw: string;
  createdAt: number;
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error('e2ee: WebCrypto unavailable');
  return c.subtle;
}

export function isCryptoAvailable(): boolean {
  return Boolean(globalThis.crypto?.subtle && typeof indexedDB !== 'undefined');
}

/* ── IndexedDB ─────────────────────────────────────────────────────────── */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('e2ee: idb open failed'));
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error ?? new Error('e2ee: idb read failed'));
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('e2ee: idb write failed'));
  });
}

/* ── identity ──────────────────────────────────────────────────────────── */

let cachedIdentity: StoredIdentity | null = null;
let identityPromise: Promise<StoredIdentity> | null = null;

async function generateIdentity(): Promise<StoredIdentity> {
  const pair = (await subtle().generateKey({ name: 'ECDH', namedCurve: CURVE }, false, [
    'deriveBits',
  ])) as CryptoKeyPair;
  // The public half must be extractable — it is meant to be published.
  const rawPublic = await subtle().exportKey('raw', pair.publicKey);
  const { toBase64Url } = await import('./envelope');
  return {
    publicKey: pair.publicKey,
    privateKey: pair.privateKey,
    publicKeyRaw: toBase64Url(new Uint8Array(rawPublic)),
    createdAt: Date.now(),
  };
}

/**
 * Load this device's identity, generating and persisting one on first use.
 * Concurrent callers share a single promise so two components mounting at once
 * cannot generate two competing identities.
 */
export async function getIdentity(): Promise<StoredIdentity> {
  if (cachedIdentity) return cachedIdentity;
  if (identityPromise) return identityPromise;

  identityPromise = (async () => {
    const db = await openDb();
    const existing = await idbGet<StoredIdentity>(db, IDENTITY_KEY);
    if (existing?.privateKey && existing?.publicKey && existing.publicKeyRaw) {
      cachedIdentity = existing;
      return existing;
    }
    const fresh = await generateIdentity();
    await idbPut(db, IDENTITY_KEY, fresh);
    cachedIdentity = fresh;
    return fresh;
  })().finally(() => {
    identityPromise = null;
  });

  return identityPromise;
}

/** Import a peer's published public key. */
export async function importPublicKey(raw: string): Promise<CryptoKey> {
  const { fromBase64Url } = await import('./envelope');
  const bytes = fromBase64Url(raw);
  return subtle().importKey(
    'raw',
    // A fresh ArrayBuffer copy: some engines reject a view with a byteOffset.
    bytes.slice().buffer,
    { name: 'ECDH', namedCurve: CURVE },
    true,
    [],
  );
}

/* ── key agreement ─────────────────────────────────────────────────────── */

/**
 * Derive the AES-GCM conversation key.
 *
 * The salt is `min(idA,idB) | max(idA,idB)` so both participants compute an
 * identical key with no extra round trip, and the key is bound to the specific
 * pair of accounts (the same two devices in a different pairing derive a
 * different key).
 */
export async function deriveConversationKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey,
  myUserId: string,
  peerUserId: string,
): Promise<CryptoKey> {
  const shared = await subtle().deriveBits(
    { name: 'ECDH', public: peerPublicKey },
    privateKey,
    256,
  );

  const { utf8 } = await import('./envelope');
  const [a, b] = [myUserId, peerUserId].sort();
  const hkdfKey = await subtle().importKey('raw', shared, 'HKDF', false, ['deriveKey']);

  return subtle().deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: utf8(`${a}|${b}`),
      info: utf8(PROTOCOL_INFO),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/* ── fingerprint ───────────────────────────────────────────────────────── */

/**
 * A human-comparable safety number for a pair of public keys.
 *
 * Both sides see the same digits because the inputs are sorted before hashing.
 * Formatted as five-digit groups: long enough to be infeasible to forge, short
 * enough that two people will actually read it to each other.
 */
export async function safetyNumber(myPublicRaw: string, peerPublicRaw: string): Promise<string> {
  const { utf8 } = await import('./envelope');
  const [a, b] = [myPublicRaw, peerPublicRaw].sort();
  const digest = await subtle().digest('SHA-256', utf8(`${PROTOCOL_INFO}|${a}|${b}`));
  const bytes = new Uint8Array(digest);

  const groups: string[] = [];
  // 8 groups × 5 digits, each group from 3 bytes of the digest.
  for (let i = 0; i < 8; i += 1) {
    const value = (bytes[i * 3] << 16) | (bytes[i * 3 + 1] << 8) | bytes[i * 3 + 2];
    groups.push(String(value % 100000).padStart(5, '0'));
  }
  return groups.join(' ');
}

/** Test seam: drop the in-memory identity cache. */
export function resetIdentityCache(): void {
  cachedIdentity = null;
  identityPromise = null;
}
