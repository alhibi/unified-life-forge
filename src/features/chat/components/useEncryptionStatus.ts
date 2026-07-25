/**
 * Encryption status for the open conversation.
 *
 * Kept as a hook (not state inside useChat) because the status is derived from
 * the key directory, not from the message stream: it is re-checked when the peer
 * changes and when the tab regains focus, and nothing else needs to re-render
 * when it settles.
 */
import { useCallback, useEffect, useState } from 'react';

import { acknowledgePeerKey, type SessionState, sessionState } from '@/lib/chat/crypto';

const UNKNOWN: SessionState = { status: 'peer-missing-key', safetyNumber: null, peerKeyChanged: false };

export interface EncryptionStatus extends SessionState {
  loading: boolean;
  /** Clear the "peer key changed" warning after the user has verified. */
  acknowledge: () => void;
}

export function useEncryptionStatus(
  myUserId: string | undefined,
  peerUserId: string | undefined,
): EncryptionStatus {
  // Keyed by conversation participant pair so a stale result from a previous
  // peer can never be shown for the current one. Storing the key alongside the
  // value lets the hook DERIVE "loading" instead of writing state synchronously
  // inside the effect (which triggers a cascading render).
  const [resolved, setResolved] = useState<{ key: string; state: SessionState } | null>(null);
  const [nonce, setNonce] = useState(0);

  const key = myUserId && peerUserId ? `${myUserId}|${peerUserId}` : null;

  useEffect(() => {
    if (!myUserId || !peerUserId || !key) return;
    let alive = true;
    void sessionState(myUserId, peerUserId).then((next) => {
      if (alive) setResolved({ key, state: next });
    });
    return () => {
      alive = false;
    };
  }, [myUserId, peerUserId, key, nonce]);

  const state = resolved?.key === key ? resolved.state : UNKNOWN;
  const loading = key !== null && resolved?.key !== key;

  // A peer publishing a key while the chat is open should flip the badge to
  // "secure" without a reload.
  useEffect(() => {
    const onWake = () => setNonce((n) => n + 1);
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, []);

  const acknowledge = useCallback(() => {
    if (!peerUserId) return;
    void acknowledgePeerKey(peerUserId).then(() => setNonce((n) => n + 1));
  }, [peerUserId]);

  return { ...state, loading, acknowledge };
}
