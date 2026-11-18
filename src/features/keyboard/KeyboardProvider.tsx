import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { KeyboardErrorBoundary } from './components/KeyboardErrorBoundary';
import SoftKeyboard from './components/SoftKeyboard';
import {
  backspace,
  backspaceWord,
  type EditableField,
  getAdaptiveEnterLabel,
  insertText,
  isSensitiveField,
  isSoftKeyboardTarget,
  moveCaret,
  pressEnter,
  replaceLastWord,
  shouldAutoCapitalizeSentence,
} from './lib/edit';
import {
  readSoftKeyboardPreference,
  type SoftKeyboardPreference,
  supportsSoftKeyboard,
  writeSoftKeyboardPreference,
} from './lib/preference';

/**
 * Mounts the app keyboard globally.
 *
 * Opening policy - explicit opt-in only.
 *
 * The in-app keyboard is an alternative writing surface, not an automatic
 * replacement for the operating-system keyboard. It opens exclusively through
 * an explicit affordance (the SoftKeyboardToggle component or the
 * 'soft-keyboard:request-open' window event). It never opens merely because a
 * text field received focus: on a login sheet that put a full keyboard on top
 * of the password field and the primary action before the user had decided to
 * use it. When the app keyboard is not open the field keeps its native
 * inputmode, so the platform keyboard remains the zero-surprise default.
 *
 * Closing behaviour: Done, Escape, blur, a physical keypress or a preference
 * switch back to 'system' all release the panel and restore the field's
 * original inputmode.
 */
export default function KeyboardProvider() {
  const [preference, setPreference] = useState<SoftKeyboardPreference>(() =>
    readSoftKeyboardPreference(),
  );
  const [target, setTarget] = useState<EditableField | null>(null);
  const [inputTick, setInputTick] = useState(0);
  const targetRef = useRef<EditableField | null>(null);
  /** inputMode we borrowed from the field, restored on release. */
  const restoreRef = useRef<string | null>(null);
  /** Last editable field that held focus - the toggle's default target. */
  const lastFieldRef = useRef<EditableField | null>(null);
  /** Timestamp of the last close, used to drop same-click reopen requests. */
  const lastReleaseRef = useRef(0);
  const [available] = useState(() => supportsSoftKeyboard());

  useEffect(() => {
    const onChange = (event: Event) => {
      setPreference((event as CustomEvent<SoftKeyboardPreference>).detail);
    };
    window.addEventListener('soft-keyboard-preference', onChange);
    return () => window.removeEventListener('soft-keyboard-preference', onChange);
  }, []);

  const release = useCallback(() => {
    // A click that closes the panel can also fire a stray open request in the
    // same interaction (QA-SL-1). Remember the release so an immediately
    // following request is treated as the tail of that click, not a reopen.
    lastReleaseRef.current = typeof performance !== 'undefined' ? performance.now() : 0;
    const el = targetRef.current;
    if (el) {
      if (restoreRef.current === null) el.removeAttribute('inputmode');
      else el.setAttribute('inputmode', restoreRef.current);
    }
    restoreRef.current = null;
    targetRef.current = null;
    setTarget(null);
    document.documentElement.style.setProperty('--soft-keyboard-height', '0px');
    document.documentElement.removeAttribute('data-soft-keyboard-open');
  }, []);

  const capture = useCallback((el: EditableField) => {
    if (targetRef.current === el) return;
    const previous = targetRef.current;
    if (previous) {
      if (restoreRef.current === null) previous.removeAttribute('inputmode');
      else previous.setAttribute('inputmode', restoreRef.current);
    }
    restoreRef.current = el.getAttribute('inputmode');
    // The OS keyboard must never appear alongside ours.
    el.setAttribute('inputmode', 'none');
    targetRef.current = el;
    setTarget(el);
    document.documentElement.setAttribute('data-soft-keyboard-open', 'true');
  }, []);

  const active = available && preference === 'app';

  /** Resolve the field an explicit open request should attach to. */
  const resolveTarget = useCallback((requested?: HTMLElement | null): EditableField | null => {
    if (requested && isSoftKeyboardTarget(requested)) return requested as EditableField;
    const focused = typeof document !== 'undefined' ? document.activeElement : null;
    if (focused && isSoftKeyboardTarget(focused)) return focused as EditableField;
    return lastFieldRef.current;
  }, []);

  const openFor = useCallback(
    (requested?: HTMLElement | null) => {
      if (!available || !active) return;
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      // Swallow an open request that is the tail of the click that just closed
      // the panel (~same task); a deliberate reopen happens later than this.
      if (lastReleaseRef.current > 0 && now - lastReleaseRef.current < 120) return;
      const el = resolveTarget(requested);
      if (!el) return;
      // Focus first: the field must own the caret before we suppress the OS
      // keyboard, otherwise the platform panel and ours can stack.
      el.focus({ preventScroll: false });
      capture(el);
    },
    [active, available, capture, resolveTarget],
  );

  useEffect(() => {
    const frame = !active ? window.requestAnimationFrame(release) : null;
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      release();
    };
  }, [active, release]);

  // Explicit open/close requests from any surface that owns a keyboard toggle.
  useEffect(() => {
    const onRequestOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ element?: HTMLElement | null }>).detail;
      openFor(detail?.element ?? null);
    };
    const onRequestClose = () => release();
    window.addEventListener('soft-keyboard:request-open', onRequestOpen);
    window.addEventListener('soft-keyboard:request-close', onRequestClose);
    return () => {
      window.removeEventListener('soft-keyboard:request-open', onRequestOpen);
      window.removeEventListener('soft-keyboard:request-close', onRequestClose);
    };
  }, [openFor, release]);

  // Publish open state so toggle affordances can render pressed correctly.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('soft-keyboard:state', {
        detail: { open: Boolean(target), available, preference },
      }),
    );
  }, [target, available, preference]);

  useEffect(() => {
    if (!active) return;

    const onFocusIn = (event: FocusEvent) => {
      const node = event.target;
      if (isSoftKeyboardTarget(node)) {
        lastFieldRef.current = node as EditableField;
        return;
      }
      // Keyboard is open and focus moved outside both the field and the
      // panel: release so the next field starts from the native state.
      if (
        targetRef.current
        && !(node as HTMLElement | null)?.closest?.('[data-soft-keyboard-panel]')
      ) {
        release();
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      if (event.target === targetRef.current) {
        // Give the panel a frame: tapping a key never really moves focus.
        window.setTimeout(() => {
          if (document.activeElement !== targetRef.current &&
              !document.activeElement?.closest('[data-soft-keyboard-panel]')) release();
        }, 80);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && targetRef.current) {
        targetRef.current.blur();
        return;
      }
      // A trusted, character-producing key that did not originate in the soft
      // keyboard panel means a physical/Bluetooth keyboard is in use: hand the
      // field back to it instead of keeping our panel open.
      const targetNode = event.target as HTMLElement | null;
      const isFromSoftKbPanel = targetNode?.closest?.('[data-soft-keyboard-panel]');
      if (event.isTrusted && !isFromSoftKbPanel && targetRef.current && event.key.length === 1) {
        release();
      }
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [active, release]);

  // Keep the caret visible above the panel. If the focused field would sit
  // under the panel, scroll it into view instead of letting the panel cover it.
  const onHeightChange = useCallback((height: number) => {
    document.documentElement.style.setProperty(
      '--soft-keyboard-height',
      String(Math.round(height)) + 'px',
    );
    const el = targetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const limit = window.innerHeight - height - 12;
    if (rect.bottom > limit) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (target)
      onHeightChange(
        Number.parseFloat(
          document.documentElement.style.getPropertyValue('--soft-keyboard-height') || '0',
        ),
      );
  }, [target, onHeightChange]);

  /** Run a mutation against whichever field currently holds the caret. */
  const run = useCallback((fn: (el: EditableField) => void) => {
    const el = targetRef.current;
    if (!el) return;
    fn(el);
    setInputTick((t) => t + 1);
  }, []);

  const handleUseSystemKeyboard = useCallback(() => {
    const el = targetRef.current;
    writeSoftKeyboardPreference('system');
    release();
    window.setTimeout(() => el?.focus(), 0);
  }, [release]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-soft-keyboard-panel=""
      data-vaul-no-drag=""
      // Drawers, sheets and popovers dismiss on any pointer event they see at
      // the document level. The keyboard lives in a body portal, so without
      // this every keypress would read as "tapped outside" and close the sheet
      // the user is typing into.
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onFocusCapture={(event) => event.stopPropagation()}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-keyboard"
    >
      <KeyboardErrorBoundary onUseSystemKeyboard={handleUseSystemKeyboard}>
        <AnimatePresence>
          {active && target && (
            <SoftKeyboard
              target={target}
              inputTick={inputTick}
              enterLabel={getAdaptiveEnterLabel(target)}
              isSensitive={isSensitiveField(target)}
              shouldAutoCap={shouldAutoCapitalizeSentence(target)}
              onInsert={(text) => run((el) => insertText(el, text))}
              onBackspace={() => run(backspace)}
              onBackspaceWord={() => run(backspaceWord)}
              onReplaceLastWord={(original, replacement) => {
                let success = false;
                run((el) => {
                  success = replaceLastWord(el, original, replacement);
                });
                return success;
              }}
              onEnter={() => run(pressEnter)}
              onMoveCaret={(delta) => run((el) => moveCaret(el, delta))}
              onDone={() => {
                targetRef.current?.blur();
                release();
              }}
              onUseSystemKeyboard={handleUseSystemKeyboard}
              onHeightChange={onHeightChange}
            />
          )}
        </AnimatePresence>
      </KeyboardErrorBoundary>
    </div>,
    document.body,
  );
}
