// useForward — drives the "forward to another chat" sheet flow.
//
//   1. `start(messages)` opens the forward picker with the chosen messages.
//   2. The picker (UI) calls `forwardTo(chatId)` which fans out one
//      sendMessage per source message to the target chat. The sends share
//      the same forward-provenance so the receiver sees a single
//      "Forwarded from <originalSender>" header per bubble — Telegram-style.
//   3. `cancel()` closes the picker without sending anything.

import { useCallback, useState } from 'react';

import { newClientId } from '../clientId';
import type { ChatMessage } from '../types';
import { useChatMutations } from './useChatMutations';

export interface UseForwardResult {
  pending: ChatMessage[] | null;
  isActive: boolean;
  start: (msgs: ChatMessage[]) => void;
  cancel: () => void;
  /**
   * Forward the currently-pending messages into `targetChatId`.
   * Resolves once the last send promise resolves (regardless of success
   * — individual failures show their own toast).
   */
  forwardTo: (targetChatId: string) => Promise<void>;
}

export function useForward(): UseForwardResult {
  const [pending, setPending] = useState<ChatMessage[] | null>(null);
  // We don't need an active-chat target for the mutations hook because we
  // only use its sendMessage path — pass null so it doesn't subscribe to
  // any chat realtime.
  const muts = useChatMutations(null);

  const start = useCallback((msgs: ChatMessage[]) => {
    setPending(msgs.length === 0 ? null : msgs);
  }, []);

  const cancel = useCallback(() => setPending(null), []);

  const forwardTo = useCallback(async (targetChatId: string) => {
    const list = pending;
    if (!list || list.length === 0) { setPending(null); return; }

    // Send sequentially so we preserve the original order in the target.
    // For >5 messages we could batch into Promise.all but the UX cost is
    // tiny and the order is more important.
    for (const msg of list) {
      // Re-derive forward provenance: chained forwards keep the FIRST
      // author so the recipient never sees "forwarded from someone who
      // also forwarded it".
      const origMsgId    = msg.forwardedFromMessageId ?? msg.id;
      const origSenderId = msg.forwardedFromSenderId  ?? msg.senderId;

      await muts.sendMessage({
        chatId:                  targetChatId,
        kind:                    msg.kind,
        content:                 msg.content,
        fileUrl:                 msg.fileUrl,
        fileName:                msg.fileName,
        forwardedFromMessageId:  origMsgId,
        forwardedFromSenderId:   origSenderId,
        clientId:                newClientId(),
      });
    }
    setPending(null);
  }, [pending, muts]);

  return {
    pending,
    isActive: pending !== null,
    start, cancel, forwardTo,
  };
}
