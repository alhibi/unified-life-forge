import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { KeyboardErrorBoundary } from './components/KeyboardErrorBoundary';
import SoftKeyboard from './components/SoftKeyboard';
import {
  backspace,
  backspaceWord,
  type EditableField,
  insertText,
  isSensitiveField,
  getAdaptiveEnterLabel,
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
 * Every text field in the product gets it for free: we listen at the document
 * level, suppress the OS keyboard on the focused field with `inputmode="none"`,
 * and drive the field through native value setters so React state stays the
 * single source of truth. Fields opt out with `data-soft-keyboard="off"`
 * (individually, or on any ancestor).
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
  const [available] = useState(() => supportsSoftKeyboard());

  useEffect(() => {
    const onChange = (event: Event) => {
      setPreference((event as CustomEvent<SoftKeyboardPreference>).detail);
    };
    window.addEventListener('soft-keyboard-preference', onChange);
    return () => window.removeEventListener('soft-keyboard-preference', onChange);
  }, []);

  const release = useCallback(() => {
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
    restoreRef.current = el.getAttribute('inputmode');
    // The OS keyboard must never appear alongside ours.
    el.setAttribute('inputmode', 'none');
    targetRef.current = el;
    setTarget(el);
    document.documentElement.setAttribute('data-soft-keyboard-open', 'true');
  }, []);

  const active = available && preference === 'app';

  const physicalKeyboardRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    // Check if the document already has an active editable target upon mounting
    if (typeof document !== 'undefined' && document.activeElement && isSoftKeyboardTarget(document.activeElement)) {
      capture(document.activeElement);
    }

    const onPointerDown = (event: PointerEvent) => {
      physicalKeyboardRef.current = false;
      const node = event.target;
      if (isSoftKeyboardTarget(node)) capture(node);
    };
    const onMouseDown = (event: MouseEvent) => {
      physicalKeyboardRef.current = false;
      const node = event.target;
      if (isSoftKeyboardTarget(node)) capture(node);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (physicalKeyboardRef.current) return;
      const node = event.target;
      if (isSoftKeyboardTarget(node)) capture(node);
      else if (!(node as HTMLElement | null)?.closest?.('[data-soft-keyboard-panel]')) release();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.target === targetRef.current) {
        // Give the panel a frame: tapping a key never really moves focus.
        window.setTimeout(() => {
          if (document.activeElement !== targetRef.current) release();
        }, 80);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && targetRef.current) {
        targetRef.current.blur();
        return;
      }
      // If keydown event is trusted, character-producing, and does not originate from within the soft keyboard panel,
      // it means input is coming from an external physical / Bluetooth keyboard.
      const targetNode = event.target as HTMLElement | null;
      const isFromSoftKbPanel = targetNode?.closest?.('[data-soft-keyboard-panel]');
      if (event.isTrusted && !isFromSoftKbPanel && targetRef.current && event.key.length === 1) {
        physicalKeyboardRef.current = true;
        // Suppress soft keyboard so physical keyboard and soft keyboard don't overlap
        release();
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [active, capture, release]);

  // Keep the caret visible above the panel.
  const onHeightChange = useCallback((height: number) => {
    document.documentElement.style.setProperty('--soft-keyboard-height', `${String(Math.round(height))}px`);
    const el = targetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const limit = window.innerHeight - height - 12;
    if (rect.bottom > limit) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (target) onHeightChange(Number.parseFloat(
      document.documentElement.style.getPropertyValue('--soft-keyboard-height') || '0',
    ));
  }, [target, onHeightChange]);

  /** Run a mutation against whichever field currently holds the caret. */
  const run = useCallback((fn: (el: EditableField) => void) => {
    const el = targetRef.current;
    if (!el) return;
    fn(el);
    setInputTick((t) => t + 1);
  }, []);

  if (typeof document === 'undefined') return null;

  const handleUseSystemKeyboard = useCallback(() => {
    const el = targetRef.current;
    writeSoftKeyboardPreference('system');
    release();
    window.setTimeout(() => el?.focus(), 0);
  }, [release]);

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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[95]"
      aria-hidden={!(active && target)}
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