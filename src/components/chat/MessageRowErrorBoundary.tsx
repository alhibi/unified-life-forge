import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface Props {
  /** The bubble subtree we wrap. */
  children: ReactNode;
  /** Right-aligned (mine) bubbles render their fallback differently. */
  isMine?: boolean;
  /** Locale for the user-facing fallback string. */
  isAr?: boolean;
  /**
   * Optional callback fired the first time a child throws. Use it to
   * report telemetry or escalate the error to a global handler — the
   * boundary itself only logs to console.
   */
  onError?: (err: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Per-message error boundary.
 *
 * Why this exists
 * ───────────────
 * The chat message renderer touches a lot of moving parts: signed-URL
 * resolution, voice player wiring, virtualized list slots, framer-motion
 * gestures, rich-text tokenization. Any one of those throwing during
 * render of a single message used to take the entire conversation down
 * — the user sees the global ErrorBoundary's "something went wrong"
 * page and loses their place in the chat.
 *
 * That's a terrible UX for a chat app: a single corrupted row (e.g.
 * malformed forwarded provenance, or a freshly-broken signed URL on a
 * voice note) shouldn't make the rest of the conversation unreadable.
 *
 * This boundary contains the blast radius to the offending message.
 * Other rows continue rendering, the composer keeps working, and the
 * user sees a small inline tile in place of the broken bubble that
 * tells them what happened.
 *
 * Behaviour
 * ─────────
 * • Catches any synchronous render error in a child.
 * • Renders a compact, locale-aware fallback in the bubble's place so
 *   the surrounding layout still feels like a conversation.
 * • Logs to console with a stable tag for grep-friendly debugging.
 * • Does NOT auto-recover — if the error was transient, scrolling the
 *   row out of and back into view will remount the boundary because
 *   the virtualizer destroys off-screen rows.
 */
export class MessageRowErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Tag log lines so they're easy to grep in production console
    // exports without polluting the global error stream.
    console.error('[chat/message-row] render failed', error, info);
    this.props.onError?.(error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const { isMine, isAr } = this.props;
    return (
      <div className={cn('flex w-full mt-1', isMine ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-2xl border text-[12.5px]',
            'bg-destructive/8 border-destructive/30 text-destructive max-w-[80%]',
          )}
          role="alert"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span dir="auto">
            {isAr ? 'تعذّر عرض هذه الرسالة' : 'Diese Nachricht konnte nicht angezeigt werden'}
          </span>
        </div>
      </div>
    );
  }
}

export default MessageRowErrorBoundary;
