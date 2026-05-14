// ─────────────────────────────────────────────────────────────────────────────
// Haptics — single source of truth for the Vibration API across the app.
//
// Re-exports the chat haptic vocabulary so non-chat features (games, settings,
// nav, gestures) can use the same intent-based palette. Calls to
// navigator.vibrate are silently dropped on unsupported devices.
// ─────────────────────────────────────────────────────────────────────────────

export { haptic } from '@/components/chat/sounds';
export type { HapticKind } from '@/components/chat/sounds';
