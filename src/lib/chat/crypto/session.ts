/**
 * Conversation sessions — the façade the chat stack actually calls.
 *
 * Everything the rest of the app needs is here, and every function is written to
 * DEGRADE rather than fail:
 *
 *   • `encryptOutgoing` returns the plaintext unchanged when encryption is not
 *     possible (no peer key, no WebCrypto, directory unavailable). A message must
 *     never be lost because encryption could not be arranged.
 *   • `decryptIncoming` returns the original string for plaintext bodies and a
 *     null plaintext for envelopes it cannot open, so one unreadable message
 *     cannot break a message list.
 *   • `sessionState` tells the UI exactly which of those situations it is in, so
 *     the lock badge never claims protection that is not there.
 */
import { decryptText, encryptText, isEncrypted } from './cipher';
import { messageAad } from './envelope';
import {
  deriveConversationKey,
  getIdentity,
  importPublicKey,
  isCryptoAvailable,
  safetyNumber,
} from './keys';
import { fetchPublicKey, publishPublicKey } from './registry';

export type SessionStatus =
  /** Encrypted end-to-end: both sides have a published key. */
  | 'secure'
  /** This device can encrypt, but the peer has published no key yet. */
  | 'peer-missing-key'
  /** The key directory is unreachable (table missing / offline). */
  | 'directory-unavailable'
  /** The browser cannot do WebCrypto or IndexedDB. */
  | 'unsupported';

export interface SessionState {
  status: SessionStatus;
  /** Human-comparable fingerprint, present only when `status === 'secure'`. */
  safetyNumber: string | null;
  /** True when the peer's published key differs from the one last seen. */
  peerKeyChanged: boolean;
}

interface Session {
  key: CryptoKey;
  peerPublicRaw: string;
  safetyNumber: string;
}

const sessions = new Map<string, Session>();
/** Last peer key we successfully used, so a substitution is visible. */
const lastSeenPeerKey = new Map<string, string>();
const SEEN_STORAGE_KEY = 'chat:e2ee:seen-keys:v1';

function loadSeen(): void {
  if (lastSeenPeerKey.size > 0) return;
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [userId, key] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof key === 'string') lastSeenPeerKey.set(userId, key);
      }
    }
  } catch {
    /* corrupted — treat every key as new, which only over-warns */
  }
}

function persistSeen(): void {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Object.fromEntries(lastSeenPeerKey)));
  } catch {
    /* storage blocked — the warning just won't persist across reloads */
  }
}

/** Ensure this device has an identity and that the directory knows about it. */
export async function ensureIdentityPublished(myUserId: string): Promise<boolean> {
  if (!isCryptoAvailable()) return false;
  try {
    const identity = await getIdentity();
    return await publishPublicKey(myUserId, identity.publicKeyRaw);
  } catch {
    return false;
  }
}

async function openSession(myUserId: string, peerUserId: string): Promise<Session | null> {
  if (!isCryptoAvailable()) return null;
  const cached = sessions.get(peerUserId);

  const entry = await fetchPublicKey(peerUserId);
  if (!entry) return null;

  // A rotated peer key invalidates the cached session — continuing to use the
  // old derived key would silently produce messages the peer cannot read.
  if (cached && cached.peerPublicRaw === entry.publicKeyRaw) return cached;

  try {
    const identity = await getIdentity();
    const peerPublic = await importPublicKey(entry.publicKeyRaw);
    const key = await deriveConversationKey(
      identity.privateKey,
      peerPublic,
      myUserId,
      peerUserId,
    );
    const fingerprint = await safetyNumber(identity.publicKeyRaw, entry.publicKeyRaw);
    const session: Session = { key, peerPublicRaw: entry.publicKeyRaw, safetyNumber: fingerprint };
    sessions.set(peerUserId, session);

    loadSeen();
    lastSeenPeerKey.set(peerUserId, entry.publicKeyRaw);
    persistSeen();

    return session;
  } catch {
    return null;
  }
}

export async function sessionState(myUserId: string, peerUserId: string): Promise<SessionState> {
  if (!isCryptoAvailable()) {
    return { status: 'unsupported', safetyNumber: null, peerKeyChanged: false };
  }

  loadSeen();
  const previous = lastSeenPeerKey.get(peerUserId);

  const entry = await fetchPublicKey(peerUserId);
  if (!entry) {
    return { status: 'peer-missing-key', safetyNumber: null, peerKeyChanged: false };
  }

  const changed = previous !== undefined && previous !== entry.publicKeyRaw;
  const session = await openSession(myUserId, peerUserId);
  if (!session) {
    return { status: 'directory-unavailable', safetyNumber: null, peerKeyChanged: changed };
  }

  return { status: 'secure', safetyNumber: session.safetyNumber, peerKeyChanged: changed };
}

/**
 * Encrypt a text body for a DM. Returns `{ content, encrypted }`; `content` is
 * the plaintext untouched when encryption was not possible.
 */
export async function encryptOutgoing(params: {
  myUserId: string;
  peerUserId: string;
  chatId: string;
  plaintext: string;
}): Promise<{ content: string; encrypted: boolean }> {
  const { myUserId, peerUserId, chatId, plaintext } = params;
  if (!plaintext) return { content: plaintext, encrypted: false };
  try {
    const session = await openSession(myUserId, peerUserId);
    if (!session) return { content: plaintext, encrypted: false };
    const content = await encryptText(session.key, plaintext, messageAad(chatId, myUserId));
    return { content, encrypted: true };
  } catch {
    return { content: plaintext, encrypted: false };
  }
}

export interface DecryptResult {
  /** Readable text, or null when the envelope could not be opened. */
  text: string | null;
  /** True when the stored body was an envelope. */
  wasEncrypted: boolean;
}

/**
 * Decrypt one stored body.
 *
 * `senderId` matters: the AAD binds the ciphertext to its sender, so decrypting
 * a message YOU sent uses your own id, not the peer's.
 */
export async function decryptIncoming(params: {
  myUserId: string;
  peerUserId: string;
  chatId: string;
  senderId: string;
  content: string;
}): Promise<DecryptResult> {
  const { myUserId, peerUserId, chatId, senderId, content } = params;
  if (!isEncrypted(content)) return { text: content, wasEncrypted: false };
  try {
    const session = await openSession(myUserId, peerUserId);
    if (!session) return { text: null, wasEncrypted: true };
    const text = await decryptText(session.key, content, messageAad(chatId, senderId));
    return { text, wasEncrypted: true };
  } catch {
    return { text: null, wasEncrypted: true };
  }
}

/** Mark the peer's current key as acknowledged, clearing the change warning. */
export async function acknowledgePeerKey(peerUserId: string): Promise<void> {
  const entry = await fetchPublicKey(peerUserId, { bypassCache: true });
  if (!entry) return;
  loadSeen();
  lastSeenPeerKey.set(peerUserId, entry.publicKeyRaw);
  persistSeen();
}

/** Drop derived sessions — call on sign-out. */
export function resetSessions(): void {
  sessions.clear();
}
