/** Public surface of the chat end-to-end encryption layer. */
export { decryptText, encryptText, isEncrypted } from './cipher';
export {
  decodeEnvelope,
  encodeEnvelope,
  type Envelope,
  ENVELOPE_PREFIX,
  fromBase64Url,
  fromUtf8,
  IV_LENGTH,
  messageAad,
  toBase64Url,
  utf8,
} from './envelope';
export {
  CURVE,
  deriveConversationKey,
  getIdentity,
  importPublicKey,
  isCryptoAvailable,
  PROTOCOL_INFO,
  resetIdentityCache,
  safetyNumber,
  type StoredIdentity,
} from './keys';
export {
  type DirectoryEntry,
  fetchPublicKey,
  isDirectoryAvailable,
  publishPublicKey,
  resetDirectoryCache,
} from './registry';
export {
  acknowledgePeerKey,
  decryptIncoming,
  type DecryptResult,
  encryptOutgoing,
  ensureIdentityPublished,
  resetSessions,
  type SessionState,
  sessionState,
  type SessionStatus,
} from './session';
