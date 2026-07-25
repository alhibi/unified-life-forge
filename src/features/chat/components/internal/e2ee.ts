/**
 * Bridge between the direct-message stack and the encryption layer.
 *
 * The DM stack stores message bodies in `messages.content`, so encryption is
 * applied at exactly two boundaries: just before the row is inserted, and just
 * after a row is read (initial fetch, realtime insert, and the conversation-list
 * preview). Keeping the boundary this thin is what makes the feature auditable —
 * there is no third place where a body could slip out unencrypted.
 *
 * The AAD is bound to the CONVERSATION id in this stack (the legacy DM
 * identifier), which both participants share, so encrypt and decrypt agree.
 */
import {
  decryptIncoming,
  encryptOutgoing,
  isEncrypted,
} from '@/lib/chat/crypto';

/** Shown while an envelope is still being opened. */
export const ENCRYPTED_PENDING_TEXT = 'رسالة مشفّرة…';
/** Shown when this device cannot open an envelope at all. */
export const ENCRYPTED_UNREADABLE_TEXT = 'رسالة مشفّرة — لا يمكن فتحها على هذا الجهاز';

export interface DmCryptoContext {
  myUserId: string;
  peerUserId: string;
  conversationId: string;
}

/** Message shape this bridge needs. Deliberately structural, not the full type. */
export interface EncryptableMessage {
  id: string;
  sender_id: string;
  content: string;
  message_type?: string | null;
}

export { isEncrypted };

/**
 * Encrypt an outgoing text body. Returns the plaintext untouched when
 * encryption is not possible — a message is never dropped for want of a key.
 * Only text is encrypted: attachments still travel through storage in the clear,
 * and the UI must not claim otherwise.
 */
export async function encryptOutgoingText(
  ctx: DmCryptoContext,
  kind: string,
  plaintext: string,
): Promise<{ content: string; encrypted: boolean }> {
  if (kind !== 'text' || !plaintext) return { content: plaintext, encrypted: false };
  return encryptOutgoing({
    myUserId: ctx.myUserId,
    peerUserId: ctx.peerUserId,
    chatId: ctx.conversationId,
    plaintext,
  });
}

/**
 * Decrypt one body. Non-envelopes pass through unchanged, so a history that
 * mixes plaintext and encrypted messages renders correctly.
 */
export async function decryptBody(
  ctx: DmCryptoContext,
  senderId: string,
  content: string,
): Promise<string> {
  if (!isEncrypted(content)) return content;
  const result = await decryptIncoming({
    myUserId: ctx.myUserId,
    peerUserId: ctx.peerUserId,
    chatId: ctx.conversationId,
    senderId,
    content,
  });
  return result.text ?? ENCRYPTED_UNREADABLE_TEXT;
}

/**
 * Decrypt a page of messages.
 *
 * Sessions are derived once and cached by the crypto layer, so this is a single
 * key agreement plus one AES-GCM open per encrypted message — cheap enough to run
 * on every page load, and it keeps the render path completely synchronous.
 */
export async function decryptMessageList<T extends EncryptableMessage>(
  ctx: DmCryptoContext,
  messages: T[],
): Promise<T[]> {
  if (!messages.some((m) => isEncrypted(m.content))) return messages;
  return Promise.all(
    messages.map(async (message) =>
      isEncrypted(message.content)
        ? { ...message, content: await decryptBody(ctx, message.sender_id, message.content) }
        : message,
    ),
  );
}
