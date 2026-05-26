// ─────────────────────────────────────────────────────────────────────────────
// inChatConversation
// ─────────────────────────────────────────────────────────────────────────────
// A minimal cross-component signal: "is the user currently inside an active
// 1:1 chat conversation?". Used to hide the global BottomNav (TideBar) so the
// chat composer can sit flush at the bottom — matching the chrome conventions
// of WhatsApp / Telegram / Signal. The legacy 1:1 surface lives at the same
// `/chat` URL whether you're on the conversation list or inside a thread, so
// a router-based gate isn't enough; we need a piece of cross-cutting state.
//
// Implemented as a tiny external store on top of `useSyncExternalStore` so:
//   • there is no extra Provider to wire into <App/>;
//   • subscribers re-render only when the value flips (no Context churn);
//   • setting the flag from inside an effect is cheap and tear-down safe.
//
// Group / channel conversations live at their own route (`/chat/g/:id`) and
// are already hidden by the BottomNav path-allowlist — they don't need to
// touch this signal.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';

let inChatConversation = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => inChatConversation;

/**
 * Imperatively flip the signal. Idempotent — if the new value matches the
 * current one, no listeners are notified, so it is safe to call from inside
 * effects on every render.
 */
export function setInChatConversation(next: boolean): void {
  if (inChatConversation === next) return;
  inChatConversation = next;
  listeners.forEach(l => l());
}

/**
 * Hook flavour for components (BottomNav). Returns the current boolean and
 * subscribes the caller to future flips.
 */
export function useInChatConversation(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
